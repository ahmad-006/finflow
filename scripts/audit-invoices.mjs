import { firefox } from "/home/ahmad/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
import { SignJWT } from "jose";
import fs from "node:fs";
import path from "node:path";

const SESSION_SECRET = process.env.SESSION_SECRET || "finflow-secret-session-key-dev-32-chars-minimum";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

const USER_PAYLOAD = {
  userId: "23a6577b-ba0b-4776-a974-e89c58bde249",
  companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
  email: "demo@finflow.app",
  role: "OWNER",
};

export const VIEWPORTS = [
  { name: "375x667", width: 375, height: 667, isMobile: true, description: "iPhone SE" },
  { name: "390x844", width: 390, height: 844, isMobile: true, description: "iPhone 14" },
  { name: "768x1024", width: 768, height: 1024, isMobile: false, description: "iPad Portrait" },
  { name: "1024x768", width: 1024, height: 768, isMobile: false, description: "Tablet Landscape / Laptop" },
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Desktop" },
];

export async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

const INVOICE_ROUTES = [
  { name: "directory", path: "/invoices" },
  { name: "builder", path: "/invoices/new" },
  { name: "detail", path: "/invoices/inv-apex-12" },
];

async function runInvoiceAudit() {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const outputBase = path.resolve(process.cwd(), "screenshots/responsive/invoices");
  fs.mkdirSync(outputBase, { recursive: true });

  const browser = await firefox.launch();
  const fullReport = [];

  for (const route of INVOICE_ROUTES) {
    const routeDir = path.join(outputBase, `invoices-${route.name}`);
    fs.mkdirSync(routeDir, { recursive: true });

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.isMobile
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        deviceScaleFactor: 2,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });

      await context.addCookies([
        {
          name: "finflow_session",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);

      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];

      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      const shotPathSub = path.join(routeDir, `${vp.name}.png`);
      const shotPathFlat = path.join(outputBase, `${route.name}-${vp.name}.png`);

      const vpResult = {
        route: route.path,
        routeName: route.name,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        status: null,
        horizontalOverflow: false,
        scrollWidth: 0,
        innerWidth: vp.width,
        overflowElements: [],
        headingIssues: [],
        touchTargetViolations: [],
        pageErrors,
        consoleErrors,
        screenshotPath: shotPathFlat,
      };

      try {
        const response = await page.goto(`${baseUrl}${route.path}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        vpResult.status = response ? response.status() : 0;
        await page.waitForTimeout(1000);

        // 1. Audit horizontal overflow
        const overflowData = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body ? document.body.scrollWidth : 0;
          const currentWinW = window.innerWidth;
          const maxW = Math.max(docW, bodyW);
          const hasBlowout = maxW > currentWinW + 1;

          const blown = [];
          if (hasBlowout) {
            const all = document.querySelectorAll("*");
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > currentWinW + 1) {
                const tag = el.tagName.toLowerCase();
                const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 4).join(" ") : "";
                const text = (el.innerText || "").slice(0, 40).replace(/\n/g, " ");
                blown.push({ tag, cls, right: Math.round(r.right), width: Math.round(r.width), text });
                if (blown.length >= 6) break;
              }
            }
          }
          return { hasBlowout, maxW, currentWinW, blown };
        });

        vpResult.horizontalOverflow = overflowData.hasBlowout;
        vpResult.scrollWidth = overflowData.maxW;
        vpResult.innerWidth = overflowData.currentWinW;
        vpResult.overflowElements = overflowData.blown;

        // 2. Audit headings, titles and text clippings
        const textAudit = await page.evaluate(() => {
          const issues = [];
          const headings = document.querySelectorAll("h1, h2, h3, h4, [data-hero], .font-serif");
          for (const h of headings) {
            const r = h.getBoundingClientRect();
            const comp = window.getComputedStyle(h);
            const scrollW = h.scrollWidth;
            const clientW = h.clientWidth;
            const isClipped = scrollW > clientW + 2 && comp.overflow !== "visible";
            const text = (h.innerText || "").trim().replace(/\s+/g, " ");
            const fontSize = parseFloat(comp.fontSize);
            const lineHeight = parseFloat(comp.lineHeight) || fontSize * 1.2;
            const isSquished = r.height < lineHeight * 0.8 && text.length > 0;

            if (isClipped || isSquished) {
              issues.push({
                tag: h.tagName.toLowerCase(),
                text: text.slice(0, 50),
                fontSize,
                lineHeight,
                clientW,
                scrollW,
                rectHeight: Math.round(r.height),
                isClipped,
                isSquished,
              });
            }
          }
          return issues;
        });
        vpResult.headingIssues = textAudit;

        // 3. Audit touch targets (< 1024px) within main content area
        if (vp.width < 1024) {
          const touchViolations = await page.evaluate(() => {
            const violations = [];
            const mainContent = document.querySelector("main") || document.body;
            const interactive = mainContent.querySelectorAll("button, a, input, select, [role='button'], [tabindex='0']");
            for (const el of interactive) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.right < 0) continue;
              const style = window.getComputedStyle(el);
              if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

              // Check if dimensions are under 40px (target >= 44px)
              if (r.height < 40 || r.width < 40) {
                const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30);
                const tag = el.tagName.toLowerCase();
                const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(" ") : "";
                violations.push({
                  tag,
                  cls,
                  text,
                  width: Math.round(r.width),
                  height: Math.round(r.height),
                });
                if (violations.length >= 10) break;
              }
            }
            return violations;
          });
          vpResult.touchTargetViolations = touchViolations;
        }

        // Take fullPage screenshots
        await page.screenshot({ path: shotPathFlat, fullPage: true });
        await page.screenshot({ path: shotPathSub, fullPage: true });

        // If on detail page and Record Payment button is present, open modal and verify modal touch targets
        if (route.name === "detail") {
          const payBtn = await page.$("button:has-text('Record Payment')");
          if (payBtn) {
            await payBtn.click();
            await page.waitForTimeout(400);

            const modalShotFlat = path.join(outputBase, `modal-${vp.name}.png`);
            await page.screenshot({ path: modalShotFlat, fullPage: false });

            if (vp.width < 1024) {
              const modalTouchViolations = await page.evaluate(() => {
                const modal = document.querySelector(".fixed.inset-0");
                if (!modal) return [];
                const violations = [];
                const interactive = modal.querySelectorAll("button, input, select");
                for (const el of interactive) {
                  const r = el.getBoundingClientRect();
                  if (r.width === 0 || r.height === 0) continue;
                  if (r.height < 40 || r.width < 40) {
                    violations.push({
                      tag: el.tagName.toLowerCase(),
                      text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 30),
                      width: Math.round(r.width),
                      height: Math.round(r.height),
                    });
                  }
                }
                return violations;
              });
              if (modalTouchViolations.length) {
                vpResult.modalTouchViolations = modalTouchViolations;
              }
            }
          }
        }
      } catch (err) {
        vpResult.status = "ERROR";
        vpResult.error = err.message;
      } finally {
        await context.close();
      }

      fullReport.push(vpResult);
    }
  }

  await browser.close();
  console.log("=== AUDIT_REPORT_START ===");
  console.log(JSON.stringify(fullReport, null, 2));
  console.log("=== AUDIT_REPORT_END ===");
}

runInvoiceAudit().catch((err) => {
  console.error("Audit run error:", err);
  process.exit(1);
});
