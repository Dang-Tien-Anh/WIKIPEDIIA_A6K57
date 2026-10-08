// Builds articles/index.json from every .md file in /articles.
// Run locally with:  node scripts/build-index.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "articles");
const entries = fs.readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), "utf8");
    const slug = f.replace(/\.md$/, "");
    const meta = {};
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (m) m[1].split(/\r?\n/).forEach((l) => {
      const i = l.indexOf(":");
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
    return { slug, title: meta.title || slug.replace(/-/g, " "), category: meta.category || "", summary: meta.summary || "" };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(entries, null, 2) + "\n");
console.log(`Indexed ${entries.length} article(s).`);
