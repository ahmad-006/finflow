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
  { name: "1024x768", width: 1024, height: 768, isMobile: false, description: "Landscape Tablet / Small Laptop" },
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Desktop" },
];

async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

async function run() {
  const token = await createSessionToken();
  const baseUrl = "http://localhost:3000";
  const outputDir = path.resolve("screenshots/responsive/expenses");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await firefox.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      deviceScaleFactor: 2,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile || vp.width < 1024,
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
    await page.goto(`${baseUrl}/expenses`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Check overflow
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const bodyW = document.body.scrollWidth;
      return {
        docW,
        bodyW,
        winW,
        hasDocOverflow: docW > winW,
        hasBodyOverflow: bodyW > winW,
      };
    });

    // Check touch targets under 1024px
    const touchIssues = await page.evaluate((isTabletOrMobile) => {
      if (!isTabletOrMobile) return [];
      const issues = [];
      const elements = document.querySelectorAll("button, a, input, select, textarea, [role='button']");
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // Skip hidden or invisible elements
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

        if (rect.width < 44 || rect.height < 44) {
          // Check if parent provides larger hit area
          const text = (el.innerText || el.getAttribute("aria-label") || el.title || el.placeholder || "").trim().slice(0, 30);
          issues.push({
            tag: el.tagName.toLowerCase(),
            text,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            cls: el.className.slice(0, 50),
          });
        }
      }
      return issues;
    }, vp.width < 1024);

    // Typography & visible text check
    const typoIssues = await page.evaluate(() => {
      const issues = [];
      const els = document.querySelectorAll("h1, h2, h3, .font-serif, [data-hero]");
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const scrollW = el.scrollWidth;
        const clientW = el.clientWidth;
        if (scrollW > clientW + 1 && style.overflow !== "visible") {
          issues.push({
            tag: el.tagName.toLowerCase(),
            text: el.innerText.slice(0, 40),
            issue: "clipped_text",
            scrollW,
            clientW,
          });
        }
      }
      return issues;
    });

    // Take screenshot
    await page.screenshot({ path: path.join(outputDir, `${vp.name}.png`), fullPage: true });

    console.log(`\n=== Viewport ${vp.name} (${vp.description}) ===`);
    console.log(`Overflow: docW=${overflow.docW}, winW=${overflow.winW}, hasOverflow=${overflow.hasDocOverflow || overflow.hasBodyOverflow}`);
    console.log(`Typography issues: ${typoIssues.length}`);
    if (typoIssues.length > 0) console.log(JSON.stringify(typoIssues, null, 2));
    console.log(`Touch issues (<44px): ${touchIssues.length}`);
    if (touchIssues.length > 0) console.log(JSON.stringify(touchIssues.slice(0, 10), null, 2));

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);
