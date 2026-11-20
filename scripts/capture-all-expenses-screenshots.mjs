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

const VIEWPORTS = [
  { name: "375x667", width: 375, height: 667, isMobile: true },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false },
  { name: "1024x768", width: 1024, height: 768, isMobile: false },
  { name: "1440x900", width: 1440, height: 900, isMobile: false },
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

    // 1. Directory Page
    const page = await context.newPage();
    await page.goto(`${baseUrl}/expenses`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outputDir, `${vp.name}.png`), fullPage: true });

    // 2. Open Add Expense Drawer
    const addBtn = page.locator("button:has-text('Add Expense'):visible").first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outputDir, `${vp.name}-drawer.png`) });
    }

    // Reload page to start clean for modal
    await page.goto(`${baseUrl}/expenses`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // 3. Open Mark as Paid Modal
    const payBtn = page.locator("button:has-text('Mark as Paid'):visible").first();
    if (await payBtn.count() > 0) {
      await payBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outputDir, `${vp.name}-modal.png`) });
    }

    console.log(`Captured all screenshots for ${vp.name}`);
    await context.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

run().catch(console.error);
