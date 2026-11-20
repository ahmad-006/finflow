import { SignJWT } from "jose";
import { firefox } from "/home/ahmad/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
import path from "node:path";
import fs from "node:fs";

const SESSION_SECRET = process.env.SESSION_SECRET || "finflow-secret-session-key-dev-32-chars-minimum";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

const USER_PAYLOAD = {
  userId: "23a6577b-ba0b-4776-a974-e89c58bde249",
  companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
  email: "demo@finflow.app",
  role: "OWNER",
};

async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

async function verifyMobileMenu() {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const browser = await firefox.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await context.addCookies([
    {
      name: "finflow_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });

  // Locate hamburger button
  const hamburger = page.locator('button[aria-label="Open navigation menu"]');
  const isHamburgerVisible = await hamburger.isVisible();
  console.log("Hamburger button visible on mobile:", isHamburgerVisible);

  if (isHamburgerVisible) {
    const box = await hamburger.boundingBox();
    console.log("Hamburger dimensions:", box ? `${box.width}x${box.height}` : "none");

    await hamburger.click();
    await page.waitForTimeout(500);

    const shotDir = path.resolve(process.cwd(), "screenshots/mobile/375x812");
    const menuShotPath = path.join(shotDir, "mobile-menu-open.png");
    await page.screenshot({ path: menuShotPath });
    console.log("Captured open mobile menu screenshot to:", menuShotPath);

    // Verify touch targets in menu
    const menuLinks = await page.$$eval('div[role="dialog"] a, div[role="dialog"] button', (nodes) => {
      return nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return {
          text: (n.textContent || "").trim().slice(0, 30),
          height: Math.round(r.height),
          width: Math.round(r.width),
          hasMinTouchTarget: r.height >= 43.5, // accommodate subpixel
        };
      });
    });

    console.log("Mobile menu touch targets:", JSON.stringify(menuLinks, null, 2));
  }

  await context.close();
  await browser.close();
}

verifyMobileMenu().catch((e) => {
  console.error(e);
  process.exit(1);
});
