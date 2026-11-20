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
  const summary = [];

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

    // 1. Page-level horizontal overflow check
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      return {
        docW,
        bodyW,
        winW,
        hasOverflow: docW > winW || bodyW > winW,
      };
    });

    // 2. Touch target audit for Expenses elements (<1024px)
    const touchIssues = await page.evaluate((isTouchViewport) => {
      if (!isTouchViewport) return [];
      const issues = [];
      const interactive = document.querySelectorAll("main button, main a, main select, main input");
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

        if (rect.width < 44 || rect.height < 44) {
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

    // 3. Typographic scaling check
    const typoCheck = await page.evaluate(() => {
      const issues = [];
      const headings = document.querySelectorAll("h1, h2, h3, [data-hero], th, .font-serif");
      for (const el of headings) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const isClipped = el.scrollWidth > el.clientWidth + 1 && style.overflow !== "visible";
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
        const isSquished = rect.height < lineHeight * 0.75 && (el.innerText || "").trim().length > 0;

        if (isClipped || isSquished) {
          issues.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || "").slice(0, 35),
            fontSize,
            lineHeight,
            rectHeight: Math.round(rect.height),
            isClipped,
            isSquished,
          });
        }
      }
      return issues;
    });

    // Capture main page screenshot
    const mainScreenshotPath = path.join(outputDir, `${vp.name}.png`);
    await page.screenshot({ path: mainScreenshotPath, fullPage: true });

    // 4. Test Add Expense drawer
    const addBtn = page.locator("button:has-text('Add Expense'):visible").first();
    let drawerTouchIssues = [];
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(400);

      // Check drawer touch targets
      if (vp.width < 1024) {
        drawerTouchIssues = await page.evaluate(() => {
          const issues = [];
          const drawer = document.querySelector("[role='dialog']");
          if (!drawer) return issues;
          const interactive = drawer.querySelectorAll("button, input, select, textarea");
          for (const el of interactive) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") continue;

            if (rect.width < 44 || rect.height < 44) {
              const text = (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().slice(0, 30);
              issues.push({
                tag: el.tagName.toLowerCase(),
                text,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
          return issues;
        });
      }

      await page.screenshot({ path: path.join(outputDir, `${vp.name}-drawer.png`) });

      // Close drawer
      const closeDrawerBtn = page.locator("button[aria-label='Close drawer']:visible").first();
      if (await closeDrawerBtn.count() > 0) {
        await closeDrawerBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 5. Test Mark as Paid modal
    const payBtn = page.locator("button:has-text('Mark as Paid'):visible").first();
    let modalTouchIssues = [];
    if (await payBtn.count() > 0) {
      await payBtn.click();
      await page.waitForTimeout(400);

      if (vp.width < 1024) {
        modalTouchIssues = await page.evaluate(() => {
          const issues = [];
          const modal = document.querySelector("[role='dialog']");
          if (!modal) return issues;
          const interactive = modal.querySelectorAll("button, input, select");
          for (const el of interactive) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") continue;

            if (rect.width < 44 || rect.height < 44) {
              const text = (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().slice(0, 30);
              issues.push({
                tag: el.tagName.toLowerCase(),
                text,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
          return issues;
        });
      }

      await page.screenshot({ path: path.join(outputDir, `${vp.name}-modal.png`) });

      const closeModalBtn = page.locator("button[aria-label='Close dialog']:visible").first();
      if (await closeModalBtn.count() > 0) {
        await closeModalBtn.click();
        await page.waitForTimeout(300);
      }
    }

    summary.push({
      viewport: vp.name,
      description: vp.description,
      hasOverflow: overflow.hasOverflow,
      docW: overflow.docW,
      winW: overflow.winW,
      touchIssuesCount: touchIssues.length,
      touchIssues,
      drawerTouchIssuesCount: drawerTouchIssues.length,
      drawerTouchIssues,
      modalTouchIssuesCount: modalTouchIssues.length,
      modalTouchIssues,
      typoIssuesCount: typoCheck.length,
      typoCheck,
    });

    console.log(`Viewport ${vp.name} completed successfully.`);
    await context.close();
  }

  await browser.close();

  console.log("\n================ AUDIT SUMMARY ================");
  console.log(JSON.stringify(summary, null, 2));
}

run().catch(console.error);
