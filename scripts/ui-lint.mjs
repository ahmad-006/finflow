import fs from "node:fs";
import path from "node:path";

const checks = [
  {
    name: "Gradients (Section 1.2 #3)",
    regex: /(bg-gradient|gradient-to|linear-gradient|radial-gradient|conic-gradient|bg-clip-text)/i,
  },
  {
    name: "Blur outside TopNav, MobileMenu, Drawer, and Modal",
    regex: /(backdrop-blur-(?!md\b|\[1px\]\b)|blur-(?!none\b)[a-z0-9-]+)/i,
    filter: (file) =>
      !file.includes("TopNav") &&
      !file.includes("MobileMenu") &&
      !file.includes("Drawer") &&
      !file.includes("Modal"),
  },
  {
    name: "Disallowed box shadows (Section 1.2 #1, Section 4.2)",
    regex: /shadow-(sm|md|lg|xl|2xl)\b/i,
  },
  {
    name: "Oversized radii (Section 1.2 #1, Section 4.1: disallowed xl, 2xl, 3xl)",
    regex: /rounded-(xl|2xl|3xl)\b/i,
  },
  {
    name: "Cards (Section 1.2 #1: no Card soup components)",
    regex: /(<Card\b|\bfrom\s+["'].*card["'])/,
  },
  {
    name: "Dark mode (Section 1.1: strictly light-themed)",
    regex: /(dark:|next-themes)/i,
  },
  {
    name: "Disallowed non-palette saturated colors (Section 2.4)",
    regex: /(bg|text|border|ring)-(purple|indigo|violet|cyan|pink|rose|fuchsia|lime)-[0-9]/i,
  },
  {
    name: "Emoji (Section 1.2 #4: no emojis anywhere)",
    regex: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  },
  {
    name: "Forbidden marketing slop copy",
    regex: /\b(Oops|Welcome back|Lorem ipsum|John Doe|Acme Corp|Seamless|Unleash|Supercharge|Elevate|Powerful)\b/i,
  },
  {
    name: "Bouncy motion (Section 8.1)",
    regex: /(animate-(bounce|ping)|hover:scale|hover:-translate)/i,
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
  console.error(`\x1b[31mUI Lint failed: ${errorsCount} anti-slop violations found.\x1b[0m`);
  process.exit(1);
} else {
  console.log("\x1b[32mUI Lint passed: 0 anti-slop violations found.\x1b[0m");
  process.exit(0);
}
