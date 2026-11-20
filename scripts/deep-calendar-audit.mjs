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
  { name: "375x667", width: 375, height: 667, isMobile: true, description: "iPhone SE" },
  { name: "390x844", width: 390, height: 844, isMobile: true, description: "iPhone 14" },
  { name: "768x1024", width: 768, height: 1024, isMobile: false, description: "iPad Portrait" },
  { name: "1024x768", width: 1024, height: 768, isMobile: false, description: "Small Laptop / iPad Landscape" },
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Standard Desktop" },
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
  const baseUrl = "http://localhost:3000";
  const outputDir = "/home/ahmad/FinFlow/screenshots/responsive/calendar";
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await firefox.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`Auditing viewport ${vp.name} (${vp.description})...`);
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
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${baseUrl}/calendar`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    // 1. Check Overflow
    const overflowInfo = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      const hasOverflow = docW > winW + 1 || bodyW > winW + 1;

      const violators = [];
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        const r = el.getBoundingClientRect();
        if (r.right > winW + 1) {
          violators.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === "string" ? el.className.slice(0, 80) : ""),
            right: Math.round(r.right),
            winW,
            text: (el.innerText || "").slice(0, 30).replace(/\n/g, " "),
          });
          if (violators.length >= 10) break;
        }
      }
      return { hasOverflow, docW, bodyW, winW, violators };
    });

    // 2. Check Typography & Clipping
    const typoInfo = await page.evaluate(() => {
      const issues = [];
      const headings = document.querySelectorAll("h1, h2, h3, h4, .font-serif, [data-hero]");
      for (const h of headings) {
        const r = h.getBoundingClientRect();
        const style = window.getComputedStyle(h);
        const isClipped = h.scrollWidth > h.clientWidth + 2 && style.overflow !== "visible";
        const text = (h.innerText || "").trim().replace(/\s+/g, " ");
        if (isClipped) {
          issues.push({ tag: h.tagName.toLowerCase(), text: text.slice(0, 40), isClipped });
        }
      }
      return issues;
    });

    // 3. Check Touch Targets for interactive controls (< 1024px)
    let touchViolations = [];
    if (vp.width < 1024) {
      touchViolations = await page.evaluate(() => {
        const violations = [];
        const interactive = document.querySelectorAll("button, a, [role='button']");
        for (const el of interactive) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.right < 0) continue;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

          // Target 44px standard (allowing 40px minimum tolerance)
          if (r.height < 40 || r.width < 40) {
            // Check if element is a link or text button inside a line of text or breadcrumb
            const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30);
            const tag = el.tagName.toLowerCase();
            violations.push({
              tag,
              text,
              width: Math.round(r.width),
              height: Math.round(r.height),
            });
            if (violations.length >= 10) break;
          }
        }
        return violations;
      });
    }

    // Capture main screenshot
    const screenshotPath = path.join(outputDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Test Week view switch & screenshot
    const weekBtn = page.getByRole("button", { name: "Week", exact: true });
    if (await weekBtn.count() > 0) {
      await weekBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outputDir, `${vp.name}-week.png`), fullPage: true });
    }

    // Test Agenda view switch & screenshot
    const agendaBtn = page.getByRole("button", { name: "Agenda", exact: true });
    if (await agendaBtn.count() > 0) {
      await agendaBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outputDir, `${vp.name}-agenda.png`), fullPage: true });
    }

    // Switch back to Month view and test Day Inspector click
    const monthBtn = page.getByRole("button", { name: "Month", exact: true });
    if (await monthBtn.count() > 0) {
      await monthBtn.click();
      await page.waitForTimeout(500);
      // Click a day cell to test inspector drawer
      const dayCell = page.locator("div.cursor-pointer").first();
      if (await dayCell.count() > 0) {
        await dayCell.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outputDir, `${vp.name}-inspector.png`), fullPage: false });
        // Close drawer
        const closeBtn = page.getByRole("button", { name: "Close", exact: true });
        if (await closeBtn.count() > 0) {
          await closeBtn.first().click();
          await page.waitForTimeout(300);
        }
      }
    }

    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      hasOverflow: overflowInfo.hasOverflow,
      docW: overflowInfo.docW,
      winW: overflowInfo.winW,
      violators: overflowInfo.violators,
      typoIssues: typoInfo,
      touchViolations,
      pageErrors,
      screenshot: screenshotPath,
    });

    await context.close();
  }

  await browser.close();
  console.log("AUDIT_REPORT_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("AUDIT_REPORT_END");
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
