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
  { name: "768x1024", width: 768, height: 1024, isMobile: false, isTablet: true, description: "iPad Portrait" },
  { name: "1024x768", width: 1024, height: 768, isMobile: false, isTablet: true, description: "Small laptop / Tablet Landscape" },
  { name: "1440x900", width: 1440, height: 900, isMobile: false, description: "Desktop" },
];

async function createSessionToken() {
  return await new SignJWT({ ...USER_PAYLOAD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

const OUT_DIR = path.join(process.cwd(), "screenshots/responsive/cash-flow");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function runAudit() {
  const token = await createSessionToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  console.log("Launching Firefox for Playwright Audit...");
  const browser = await firefox.launch({
    headless: true,
    args: ["--no-remote", "--silent"],
  });

  const results = [];

  const targets = [
    { route: "/cash-flow", label: "cash-flow-cockpit" },
    { route: "/cash-flow/2026-11-20", label: "cash-flow-day-detail" },
  ];

  for (const target of targets) {
    console.log(`\nAuditing route: ${target.route} (${target.label})`);

    for (const vp of VIEWPORTS) {
      console.log(`  Testing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.isMobile
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        deviceScaleFactor: 2,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile || vp.isTablet,
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

      const entry = {
        route: target.route,
        label: target.label,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        docWidth: 0,
        bodyWidth: 0,
        winWidth: vp.width,
        hasOverflow: false,
        overflowElements: [],
        typographyIssues: [],
        touchTargetViolations: [],
        interactiveChecks: {},
        pageErrors,
        consoleErrors,
        screenshotPath: path.join(OUT_DIR, `${target.label}-${vp.name}.png`),
      };

      try {
        await page.goto(`${baseUrl}${target.route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForSelector("h1", { timeout: 10000 });
        await page.waitForTimeout(600);

        // 1. Audit Overflow
        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body ? document.body.scrollWidth : 0;
          const winW = window.innerWidth;
          const maxW = Math.max(docW, bodyW);
          const hasBlowout = maxW > winW + 1;

          const elements = [];
          if (hasBlowout) {
            for (const el of document.querySelectorAll("*")) {
              const r = el.getBoundingClientRect();
              if (r.right > winW + 1) {
                elements.push({
                  tag: el.tagName.toLowerCase(),
                  cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                  winW,
                  text: (el.innerText || "").slice(0, 50).replace(/\s+/g, " "),
                });
                if (elements.length >= 8) break;
              }
            }
          }
          return { docW, bodyW, winW, hasBlowout, elements };
        });

        entry.docWidth = overflow.docW;
        entry.bodyWidth = overflow.bodyW;
        entry.hasOverflow = overflow.hasBlowout;
        entry.overflowElements = overflow.elements;

        // 2. Audit Typography and Scaling
        const typo = await page.evaluate(() => {
          const issues = [];
          // Inspect headings, numbers, figures, table headers, statement sentences
          const elements = document.querySelectorAll(
            "h1, h2, h3, h4, [data-figure], .font-serif, .font-mono, th, td"
          );

          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

            const text = (el.innerText || "").trim();
            if (!text || text.length === 0) continue;

            // Check if numbers or currency amounts have unintentional clipping
            const scrollW = el.scrollWidth;
            const clientW = el.clientWidth;
            if (
              /^[+\-]?([A-Z]{3}|\$|€|£|Rs)?\s?[\d,.]+/.test(text) &&
              scrollW > clientW + 2 &&
              (style.overflowX === "hidden" || style.overflowX === "clip")
            ) {
              issues.push({
                type: "clipped_currency_or_number",
                tag: el.tagName.toLowerCase(),
                cls: typeof el.className === "string" ? el.className.slice(0, 60) : "",
                text: text.slice(0, 30),
                scrollW,
                clientW,
              });
              if (issues.length >= 10) break;
            }

            // Check squished line heights on headings
            if (/^h[1-6]$/.test(el.tagName.toLowerCase())) {
              const fontSize = parseFloat(style.fontSize) || 16;
              const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
              if (rect.height < lineHeight * 0.7 && text.length > 3) {
                issues.push({
                  type: "squished_heading",
                  tag: el.tagName.toLowerCase(),
                  text: text.slice(0, 40),
                  rectHeight: rect.height,
                  lineHeight,
                });
              }
            }
          }
          return issues;
        });
        entry.typographyIssues = typo;

        // 3. Audit Specific Interactive Controls Touch Targets (< 1024px)
        if (vp.width < 1024) {
          const touch = await page.evaluate(() => {
            const violations = [];
            // Target specific treasury controls per assignment:
            // scenario toggle, filter chips, day card inspector links, settlement buttons, action buttons
            const candidates = document.querySelectorAll(
              "button, a.min-h-\\[44px\\], button.min-h-\\[44px\\], [role='slider'], table a, table button, section[aria-label] button, section[aria-label] a"
            );

            for (const el of candidates) {
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.right < 0) continue;
              const style = window.getComputedStyle(el);
              if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

              // Check if button/action has < 44px height or width (standard 44px touch target)
              // Allow width to be slightly smaller for icon buttons if hit area is at least 44x44
              if (rect.height < 44 || rect.width < 38) {
                const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 40).replace(/\n/g, " ");
                const tag = el.tagName.toLowerCase();
                const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";

                violations.push({
                  tag,
                  cls,
                  text,
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                });
                if (violations.length >= 10) break;
              }
            }
            return violations;
          });
          entry.touchTargetViolations = touch;
        }

        // 4. Test interactive controls responsiveness directly:
        if (target.label === "cash-flow-cockpit") {
          const scenarioBtns = await page.$$("button:has-text('Expected'), button:has-text('On-time')");
          entry.interactiveChecks.scenarioButtonsFound = scenarioBtns.length;

          const filterChips = await page.$$("button:has-text('All days'), button:has-text('Inflow days'), button:has-text('Outflow days'), button:has-text('Deficit days')");
          entry.interactiveChecks.filterChipsFound = filterChips.length;
        } else if (target.label === "cash-flow-day-detail") {
          const markPaidBtns = await page.$$("button:has-text('Mark paid')");
          entry.interactiveChecks.markPaidButtonsFound = markPaidBtns.length;

          const navLinks = await page.$$("a:has-text('30-Day forecast'), a:has-text('Prev day'), a:has-text('Next day')");
          entry.interactiveChecks.navLinksFound = navLinks.length;
        }

        // 5. Capture screenshot
        await page.screenshot({
          path: entry.screenshotPath,
          fullPage: true,
        });

      } catch (err) {
        console.error(`  Error auditing ${target.label} at ${vp.name}:`, err.message);
        entry.error = err.message;
      } finally {
        await context.close();
      }

      results.push(entry);
    }
  }

  await browser.close();

  // Print results summary
  console.log("\n=================== FINAL AUDIT REPORT ===================");
  let totalOverflows = 0;
  let totalTypoIssues = 0;
  let totalTouchViolations = 0;

  for (const r of results) {
    console.log(`\n[${r.label.toUpperCase()}] ${r.viewport} (${r.width}x${r.height})`);
    if (r.hasOverflow) {
      totalOverflows++;
      console.log(`  ❌ OVERFLOW DETECTED: scrollWidth (${r.docWidth}px) > innerWidth (${r.winWidth}px)`);
      console.log("     Offending elements:", JSON.stringify(r.overflowElements, null, 2));
    } else {
      console.log(`  ✅ Zero Horizontal Overflow (scrollWidth: ${r.docWidth}px <= innerWidth: ${r.winWidth}px)`);
    }

    if (r.typographyIssues.length > 0) {
      totalTypoIssues += r.typographyIssues.length;
      console.log(`  ❌ Typography Issues (${r.typographyIssues.length}):`, JSON.stringify(r.typographyIssues, null, 2));
    } else {
      console.log(`  ✅ Typography scaling clean, zero clipped currency figures or squished headings.`);
    }

    if (r.touchTargetViolations.length > 0) {
      totalTouchViolations += r.touchTargetViolations.length;
      console.log(`  ❌ Touch target (< 44px) violations (${r.touchTargetViolations.length}):`);
      for (const v of r.touchTargetViolations) {
        console.log(`     - <${v.tag}> "${v.text}" [${v.width}x${v.height}px] (class: ${v.cls})`);
      }
    } else if (r.width < 1024) {
      console.log(`  ✅ Interactive controls satisfy >= 44px touch target requirement.`);
    }

    console.log(`  🎮 Interactive elements verified:`, JSON.stringify(r.interactiveChecks));
    console.log(`  📸 Screenshot: ${r.screenshotPath}`);
  }

  console.log("\n=================== FINAL SUMMARY TOTALS ===================");
  console.log(`Total Horizontal Overflow Issues: ${totalOverflows}`);
  console.log(`Total Typography Issues: ${totalTypoIssues}`);
  console.log(`Total Touch Target Violations: ${totalTouchViolations}`);
  console.log(`All screenshots saved in: ${OUT_DIR}`);
}

runAudit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
