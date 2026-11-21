import { SignJWT } from "jose";
import { firefox } from "/home/ahmad/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
import path from "node:path";
import fs from "node:fs";

const SESSION_SECRET = process.env.SESSION_SECRET || "finflow-secret-session-key-dev-32-chars-minimum";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

const ARTIFACT_DIR = "/home/ahmad/.gemini/antigravity/brain/c405cb7a-804a-4aa0-adfb-2b9b782d19ca";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812, isMobile: true },
  { name: "mobile_390", width: 390, height: 844, isMobile: true },
  { name: "tablet_768", width: 768, height: 1024, isMobile: false },
  { name: "desktop_1440", width: 1440, height: 900, isMobile: false },
];

async function run() {
  const browser = await firefox.launch();
  const baseUrl = "http://localhost:3000";
  const auditReport = [];

  const verifiedOnboardedToken = await createToken({
    userId: "23a6577b-ba0b-4776-a974-e89c58bde249",
    companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
    email: "demo@finflow.app",
    fullName: "Ahmad Aamir",
    role: "OWNER",
    emailVerified: true,
    onboardingCompleted: true,
  });

  const oauthToken = await createToken({
    userId: "455436fc-1342-459e-991b-abdea6a85e1a",
    companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
    email: "notmrsheikho@gmail.com",
    fullName: "NOT MrSheikho",
    role: "OWNER",
    emailVerified: true,
    onboardingCompleted: true,
  });

  const unonboardedToken = await createToken({
    userId: "unonboarded-test-id",
    companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
    email: "onboarding-user@finflow.app",
    fullName: "Onboarding Test",
    role: "OWNER",
    emailVerified: true,
    onboardingCompleted: false,
  });

  const unverifiedToken = await createToken({
    userId: "unverified-test-id",
    companyId: "b85ba470-3027-4fdf-bd70-7ace93c4f175",
    email: "unverified@finflow.app",
    fullName: "Unverified Test",
    role: "OWNER",
    emailVerified: false,
    onboardingCompleted: false,
  });

  console.log("Starting visual audit across viewports...");

  // 1. Audit /register (unauthenticated)
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const shotName = `register_${vp.name}.png`;
    const shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });

    const checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/register", viewport: vp.name, shotName, ...checks });
    await context.close();
  }

  // 2. Audit /verify-email (unverified session)
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    await context.addCookies([{
      name: "finflow_session",
      value: unverifiedToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    }]);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/verify-email`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const shotName = `verify_email_${vp.name}.png`;
    const shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });

    const checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/verify-email", viewport: vp.name, shotName, ...checks });
    await context.close();
  }

  // 3. Audit /onboarding (onboarding incomplete session)
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    await context.addCookies([{
      name: "finflow_session",
      value: unonboardedToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    }]);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const shotName = `onboarding_${vp.name}.png`;
    const shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });

    const checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/onboarding", viewport: vp.name, shotName, ...checks });
    await context.close();
  }

  // 4. Audit /settings across all tabs and viewports
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    await context.addCookies([{
      name: "finflow_session",
      value: verifiedOnboardedToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    }]);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Workspace tab
    let shotName = `settings_workspace_${vp.name}.png`;
    let shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    let checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/settings [workspace]", viewport: vp.name, shotName, ...checks });

    // Profile tab
    await page.click("#tab-profile");
    await page.waitForTimeout(300);
    shotName = `settings_profile_${vp.name}.png`;
    shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/settings [profile]", viewport: vp.name, shotName, ...checks });

    // Security tab (Local user)
    await page.click("#tab-security");
    await page.waitForTimeout(300);
    shotName = `settings_security_local_${vp.name}.png`;
    shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    checks = await evaluatePage(page, vp.width);
    auditReport.push({ page: "/settings [security-local]", viewport: vp.name, shotName, ...checks });

    await context.close();
  }

  // 5. Audit /settings Security tab for OAuth user
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await context.addCookies([{
      name: "finflow_session",
      value: oauthToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    }]);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.click("#tab-security");
    await page.waitForTimeout(300);

    const shotName = "settings_security_oauth_desktop.png";
    const shotPath = path.join(SCREENSHOT_DIR, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    const checks = await evaluatePage(page, 1440);
    auditReport.push({ page: "/settings [security-oauth]", viewport: "desktop_1440", shotName, ...checks });
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(auditReport, null, 2));
}

async function evaluatePage(page, winW) {
  return await page.evaluate((winW) => {
    const docW = document.documentElement.scrollWidth;
    const bodyW = document.body ? document.body.scrollWidth : 0;
    const maxW = Math.max(docW, bodyW);
    const hasBlowout = maxW > winW + 1;

    // Check touch targets under 44px
    const smallTargets = [];
    const interactiveElements = document.querySelectorAll("button, a, input, select");
    for (const el of interactiveElements) {
      const rect = el.getBoundingClientRect();
      // only visible elements
      if (rect.width > 0 && rect.height > 0) {
        if (rect.height < 43.5 || rect.width < 43.5) {
          // Allow inline text links if inside paragraphs
          if (el.tagName === "A" && el.closest("p")) continue;
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").trim().slice(0, 30),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            id: el.id || undefined,
          });
          if (smallTargets.length >= 5) break;
        }
      }
    }

    return {
      hasBlowout,
      scrollWidth: maxW,
      windowWidth: winW,
      smallTargetsCount: smallTargets.length,
      smallTargetsSample: smallTargets,
    };
  }, winW);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
