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
  { name: "375x667", width: 375, height: 667, isMobile: true, description: "iPhone SE / compact mobile" },
  { name: "390x844", width: 390, height: 844, isMobile: true, description: "iPhone 14 / modern standard mobile" },
  { name: "768x1024", width: 768, height: 1024, isMobile: false, description: "iPad Mini / Portrait tablet" },
  { name: "1024x768", width: 1024, height: 768, isMobile: false, description: "Small laptop / Landscape tablet" },
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Standard desktop" },
];

export async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Runs deep responsive audit for a given route across all 5 viewports.
 * Returns detailed analysis of overflows, heading ratios, text clippings, and saves screenshots.
 */
export async function auditRoute(route, outputDir) {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await firefox.launch();
  const report = {
    route,
    timestamp: new Date().toISOString(),
    viewports: [],
  };

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

    const vpResult = {
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      horizontalOverflow: false,
      overflowElements: [],
      headingIssues: [],
      clippingIssues: [],
      touchTargetViolations: [],
      pageErrors,
      consoleErrors,
      screenshotPath: path.join(outputDir, `${vp.name}.png`),
    };

    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1000);

      // 1. Audit horizontal overflow
      const overflowData = await page.evaluate((vpWidth) => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

        const violatingElements = [];
        const all = document.querySelectorAll("*");
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > winWidth + 1) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className && typeof el.className === "string" ? el.className.slice(0, 80) : "");
            const text = (el.innerText || "").slice(0, 40).replace(/\n/g, " ");
            violatingElements.push({ tag, cls, right: Math.round(rect.right), winWidth, text });
            if (violatingElements.length >= 10) break;
          }
        }

        return { hasOverflow, docWidth, winWidth, violatingElements };
      }, vp.width);

      vpResult.horizontalOverflow = overflowData.hasOverflow;
      vpResult.overflowElements = overflowData.violatingElements;

      // 2. Audit headings and text ratios (no broken words, clipped letters, or awkward line wraps)
      const textAudit = await page.evaluate(() => {
        const issues = [];
        const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [data-hero], .font-serif, .tracking-tight");
        for (const h of headings) {
          if (h.classList.contains("sr-only") || h.closest(".sr-only")) continue;
          const rect = h.getBoundingClientRect();
          const computed = window.getComputedStyle(h);
          const scrollW = h.scrollWidth;
          const clientW = h.clientWidth;
          const isClipped = scrollW > clientW + 2 && computed.overflow !== "visible";
          const text = (h.innerText || "").trim().replace(/\s+/g, " ");
          const fontSize = parseFloat(computed.fontSize);
          const lineHeight = parseFloat(computed.lineHeight) || fontSize * 1.2;

          // Check if height suggests collapsed lines
          const expectedMinHeight = lineHeight;
          const isSquished = rect.height < expectedMinHeight * 0.8 && text.length > 0;

          if (isClipped || isSquished) {
            issues.push({
              tag: h.tagName.toLowerCase(),
              text: text.slice(0, 50),
              fontSize,
              lineHeight,
              clientW,
              scrollW,
              rectHeight: Math.round(rect.height),
              isClipped,
              isSquished,
            });
          }
        }
        return issues;
      });

      vpResult.headingIssues = textAudit;

      // 3. Audit touch targets (< 1024px)
      if (vp.width < 1024) {
        const touchViolations = await page.evaluate(() => {
          const violations = [];
          const interactive = document.querySelectorAll("button, a, input, select, [role='button'], [tabindex='0']");
          for (const el of interactive) {
            // Ignore hidden elements or zero-dimension elements
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.right < 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

            // In mobile touch guidelines, interactive controls should meet >= 40px (target 44px)
            // or have a parent with sufficient hit area
            if (rect.height < 36 && rect.width < 36) {
              const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30);
              const tag = el.tagName.toLowerCase();
              violations.push({
                tag,
                text,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
              if (violations.length >= 10) break;
            }
          }
          return violations;
        });
        vpResult.touchTargetViolations = touchViolations;
      }

      // 4. Capture screenshot
      await page.screenshot({
        path: vpResult.screenshotPath,
        fullPage: true,
      });
    } catch (e) {
      vpResult.error = e.message;
    } finally {
      await context.close();
    }

    report.viewports.push(vpResult);
  }

  await browser.close();
  return report;
}
