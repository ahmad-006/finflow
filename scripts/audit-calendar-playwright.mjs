import { auditRoute, VIEWPORTS } from "./playwright-audit-runner.mjs";
import path from "node:path";

async function main() {
  const outputDir = path.resolve("screenshots/responsive/calendar");
  console.log("Starting calendar audit across 5 viewports...");
  const report = await auditRoute("/calendar", outputDir);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
