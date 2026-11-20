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
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Standard desktop" },
];

async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

async function runAudit() {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const outputDir = path.resolve("screenshots/responsive/clients");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await firefox.launch();
  const report = {
    timestamp: new Date().toISOString(),
    viewports: {},
  };

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
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

    const vpResult = {
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      directory: {},
      modal: {},
      detail: {},
      table: null,
      pageErrors,
      consoleErrors,
    };

    // Helper: Audit overflow & text
    const checkOverflowAndText = async () => {
      return await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

        const violatingElements = [];
        for (const el of document.querySelectorAll("*")) {
          // Ignore DevTools / portal toast overlays
          if (el.closest("nextjs-portal") || el.getAttribute("data-nextjs-toast")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.right > winWidth + 1 && rect.width > 0 && rect.height > 0) {
            violatingElements.push({
              tag: el.tagName.toLowerCase(),
              cls: el.className && typeof el.className === "string" ? el.className.slice(0, 80) : "",
              right: Math.round(rect.right),
              winWidth,
              text: (el.innerText || "").slice(0, 40).replace(/\n/g, " "),
            });
            if (violatingElements.length >= 8) break;
          }
        }

        const headingIssues = [];
        const headings = document.querySelectorAll("h1, h2, h3, h4, [data-hero], .font-serif, .tracking-tight");
        for (const h of headings) {
          const rect = h.getBoundingClientRect();
          const computed = window.getComputedStyle(h);
          const scrollW = h.scrollWidth;
          const clientW = h.clientWidth;
          const isClipped = scrollW > clientW + 2 && computed.overflow !== "visible";
          const text = (h.innerText || "").trim().replace(/\s+/g, " ");
          const fontSize = parseFloat(computed.fontSize);
          const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.2;
          const isSquished = rect.height < lineHeight * 0.8 && text.length > 0;
          if (isClipped || isSquished) {
            headingIssues.push({
              tag: h.tagName.toLowerCase(),
              text: text.slice(0, 40),
              fontSize,
              lineHeight,
              clientW,
              scrollW,
              isClipped,
              isSquished,
            });
          }
        }

        return { hasOverflow, docWidth, bodyWidth, winWidth, violatingElements, headingIssues };
      });
    };

    // Helper: Check touch targets for interactive elements
    const checkTouchTargets = async (containerSelector = "body") => {
      if (vp.width >= 1024) return [];
      return await page.evaluate((sel) => {
        const root = document.querySelector(sel) || document.body;
        const violations = [];
        const interactive = root.querySelectorAll("button, a[href], input, select, [role='button'], [tabindex='0']");
        for (const el of interactive) {
          // Ignore dev indicators and internal overlays
          if (el.closest("nextjs-portal") || el.getAttribute("data-nextjs-toast")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.right < 0) continue;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

          // Touch target minimum: width or height < 44px
          // Exclude inline text links that wrap within paragraphs
          const isInlineTextLink = el.tagName.toLowerCase() === "a" && !el.className.includes("button") && !el.className.includes("rounded-full") && el.offsetWidth > 60;
          if ((rect.height < 44 || rect.width < 44) && !isInlineTextLink) {
            violations.push({
              tag: el.tagName.toLowerCase(),
              text: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              cls: el.className && typeof el.className === "string" ? el.className.slice(0, 60) : "",
            });
          }
        }
        return violations;
      }, containerSelector);
    };

    try {
      // 1. Audit /clients Directory
      await page.goto(`${baseUrl}/clients`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(800);

      const dirChecks = await checkOverflowAndText();
      const dirTouch = await checkTouchTargets("main");
      const dirScreenshot = path.join(outputDir, `${vp.name}.png`);
      await page.screenshot({ path: dirScreenshot, fullPage: true });

      vpResult.directory = {
        ...dirChecks,
        touchViolations: dirTouch,
        screenshot: dirScreenshot,
      };

      // 2. Audit Create Client Modal
      const addBtn = await page.$("button:has-text('Add Client')");
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(400);

        const modalTouch = await checkTouchTargets("[role='dialog']");
        const modalScreenshot = path.join(outputDir, `${vp.name}-modal.png`);
        await page.screenshot({ path: modalScreenshot, fullPage: true });

        vpResult.modal = {
          touchViolations: modalTouch,
          screenshot: modalScreenshot,
        };

        const closeBtn = await page.$("[aria-label='Close dialog']");
        if (closeBtn) await closeBtn.click();
        await page.waitForTimeout(300);
      }

      // 3. Desktop Table View mode (if >= 1024px)
      if (vp.width >= 1024) {
        const tableBtn = await page.$("button:has-text('Table')");
        if (tableBtn) {
          await tableBtn.click();
          await page.waitForTimeout(400);

          const tableChecks = await checkOverflowAndText();
          const tableScreenshot = path.join(outputDir, `${vp.name}-table.png`);
          await page.screenshot({ path: tableScreenshot, fullPage: true });

          vpResult.table = {
            ...tableChecks,
            screenshot: tableScreenshot,
          };
        }
      }

      // 4. Audit /clients/client-apex-01 Detail & Statement Ledger
      await page.goto(`${baseUrl}/clients/client-apex-01`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(800);

      const detailChecks = await checkOverflowAndText();
      const detailTouch = await checkTouchTargets("main");
      const detailScreenshot = path.join(outputDir, `${vp.name}-detail.png`);
      await page.screenshot({ path: detailScreenshot, fullPage: true });

      vpResult.detail = {
        ...detailChecks,
        touchViolations: detailTouch,
        screenshot: detailScreenshot,
      };

    } catch (err) {
      vpResult.error = err.message;
    } finally {
      await context.close();
    }

    report.viewports[vp.name] = vpResult;
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

runAudit().catch(console.error);
