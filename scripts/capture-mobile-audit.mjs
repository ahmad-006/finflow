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

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812, isMobile: true },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false },
];

const PAGES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "calendar", path: "/calendar" },
  { name: "cash-flow", path: "/cash-flow" },
  { name: "invoices", path: "/invoices" },
  { name: "expenses", path: "/expenses" },
  { name: "clients", path: "/clients" },
];

async function runAudit() {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const browser = await firefox.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: vp.isMobile,
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

    for (const p of PAGES) {
      const url = `${baseUrl}${p.path}`;
      const shotDir = path.resolve(process.cwd(), `screenshots/mobile/${vp.name}`);
      fs.mkdirSync(shotDir, { recursive: true });
      const shotPath = path.join(shotDir, `${p.name}.png`);

      let status = 0;
      let overflowDetected = false;
      let scrollWidth = 0;
      let windowWidth = 0;
      let overflowElements = [];

      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
        status = response ? response.status() : 0;
        await page.waitForTimeout(1000);

        const evalResult = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body ? document.body.scrollWidth : 0;
          const winW = window.innerWidth;
          const maxW = Math.max(docW, bodyW);
          const hasBlowout = maxW > winW + 1; // 1px threshold

          const blown = [];
          if (hasBlowout) {
            for (const el of document.querySelectorAll("*")) {
              const r = el.getBoundingClientRect();
              if (r.right > winW + 1) {
                blown.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || undefined,
                  className: typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(" ") : "",
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                });
                if (blown.length >= 4) break;
              }
            }
          }
          return {
            hasBlowout,
            maxW,
            winW,
            blown,
          };
        });

        overflowDetected = evalResult.hasBlowout;
        scrollWidth = evalResult.maxW;
        windowWidth = evalResult.winW;
        overflowElements = evalResult.blown;

        await page.screenshot({ path: shotPath, fullPage: true });

        results.push({
          viewport: vp.name,
          page: p.name,
          url: p.path,
          status,
          scrollWidth,
          windowWidth,
          overflow: overflowDetected,
          overflowElements,
          screenshotPath: shotPath,
        });
      } catch (err) {
        results.push({
          viewport: vp.name,
          page: p.name,
          url: p.path,
          status: "ERROR",
          error: err.message,
          screenshotPath: null,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

runAudit().catch((err) => {
  console.error("Audit failure:", err);
  process.exit(1);
});
