import fs from "node:fs";
import path from "node:path";

const checks = [
  {
    name: "Gradients",
    regex: /(bg-gradient|gradient-to|linear-gradient|radial-gradient|conic-gradient|bg-clip-text)/i,
  },
  {
    name: "Blur and glass",
    regex: /(backdrop-blur|backdrop-filter|blur-)/i,
  },
  {
    name: "Heavy shadows",
    regex: /shadow-(md|lg|xl|2xl|inner)/i,
  },
  {
    name: "Oversized radii",
    regex: /rounded-(xl|2xl|3xl)/i,
  },
  {
    name: "Rounded full outside Avatar",
    regex: /rounded-full/i,
    filter: (file) => !file.toLowerCase().includes("avatar") && !file.toLowerCase().includes("user"),
  },
  {
    name: "Motion tells",
    regex: /(animate-(bounce|ping|spin|pulse)|hover:scale|hover:-translate|transition-all)/i,
    filter: (file, match, line) => {
      // allow animate-spin for loader in button or skeleton
      if (line.includes("animate-spin") && (file.includes("button") || file.includes("Loader") || file.includes("Spinner") || file.includes("Skeleton"))) {
        return false;
      }
      return true;
    },
  },
  {
    name: "Dark mode",
    regex: /(dark:|next-themes)/i,
  },
  {
    name: "Default palette",
    regex: /(bg|text|border)-(slate|gray|zinc|neutral|stone|red|green|blue|indigo|violet|purple|emerald|sky)-[0-9]/i,
  },
  {
    name: "Uppercase labels",
    regex: /\b(uppercase|tracking-(wide|wider|widest))\b/i,
    filter: (file, match, line) => {
      // Exclude JavaScript method call .toUpperCase()
      if (line.includes(".toUpperCase(")) return false;
      return true;
    },
  },
  {
    name: "Monospace",
    regex: /font-mono/i,
  },
  {
    name: "Emoji",
    regex: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  },
  {
    name: "Forbidden copy",
    regex: /\b(Oops|Welcome back|Lorem|John Doe|Acme|Seamless|Unleash|Supercharge|Elevate)\b/i,
  },
  {
    name: "Arrow buttons",
    regex: /(→|&rarr;)/i,
  },
  {
    name: "Raw hex in components",
    regex: /#[0-9a-fA-F]{3,8}\b/i,
    filter: (file) => !file.endsWith("globals.css") && !file.includes("chart-theme"),
  },
];

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (/\.(ts|tsx|css)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getFiles(path.resolve("src"));
let errorsCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.regex.test(line)) {
        if (!check.filter || check.filter(file, check.regex.exec(line), line)) {
          console.error(
            `\x1b[31m[UI-LINT ERROR]\x1b[0m ${path.relative(process.cwd(), file)}:${index + 1} - ${check.name}: "${line.trim()}"`
          );
          errorsCount++;
        }
      }
    }
  });
}

if (errorsCount > 0) {
  console.error(`\nFound ${errorsCount} anti-slop violations.`);
  process.exit(1);
} else {
  console.log(`\x1b[32mUI Lint passed: 0 anti-slop violations found.\x1b[0m`);
}
