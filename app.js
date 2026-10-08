/* ====== Settings: edit these ====== */
const SITE = {
  title: "My Wiki",
  tagline: "Everything I know, in one place.",
  repo: "",        // e.g. "your-username/my-wiki" — turns on "Edit this page" links
  branch: "main"
};
/* ================================== */

const $ = (s) => document.querySelector(s);
const view = $("#view");
let INDEX = [];
const cache = new Map();
let allLoaded = false;

const slugify = (t) => t.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const byTitle = (a, b) => a.title.localeCompare(b.title);

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  let body = raw;
  if (m) {
    body = raw.slice(m[0].length);
    m[1].split(/\r?\n/).forEach((l) => {
      const i = l.indexOf(":");
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
  }
  return { meta, body };
}

function findEntry(target) {
  const s = slugify(target);
  return INDEX.find((e) => e.slug === target || e.slug === s || slugify(e.title) === s);
}

function wikify(body) {
  return body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, label) => {
    const e = findEntry(t.trim());
    const href = e ? e.slug : slugify(t);
    return `<a href="#/${encodeURIComponent(href)}"${e ? "" : ' class="missing" title="This article does not exist yet"'}>${esc(label || t)}</a>`;
  });
}

async function getArticle(slug) {
  if (cache.has(slug)) return cache.get(slug);
  try {
    const r = await fetch(`articles/${encodeURIComponent(slug)}.md`);
    const text = r.ok ? await r.text() : null;
    cache.set(slug, text);
    return text;
  } catch { return null; }
}

async function loadAll() {
  if (allLoaded) return;
  await Promise.all(INDEX.map((e) => getArticle(e.slug)));
  allLoaded = true;
}

function setActive(href) {
  document.querySelectorAll(".nav-list a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === href));
}

function articleList(entries) {
  if (!entries.length) return `<p class="empty">No articles yet.</p>`;
  return `<ul class="list">${entries.map((e) => `<li><a href="#/${encodeURIComponent(e.slug)}">${esc(e.title)}</a>${e.summary ? `<span class="sum">${esc(e.summary)}</span>` : ""}</li>`).join("")}</ul>`;
}

function buildToc(root) {
  const heads = [...root.querySelectorAll("h2, h3")];
  if (heads.length < 3) return "";
  heads.forEach((h, i) => (h.id = `s-${i}-${slugify(h.textContent)}`));
  let html = "<ol>", open3 = false;
  heads.forEach((h) => {
    const link = `<a href="#" data-jump="${h.id}">${esc(h.textContent)}</a>`;
    if (h.tagName === "H3") { if (!open3) { html += "<ol>"; open3 = true; } html += `<li>${link}</li>`; }
    else { if (open3) { html += "</ol>"; open3 = false; } html += `<li>${link}</li>`; }
  });
  return `<aside class="toc" aria-label="Contents"><strong>Contents</strong>${html}${open3 ? "</ol>" : ""}</ol></aside>`;
}

async function showArticle(slug) {
  const raw = await getArticle(slug);
  if (raw == null) return showMissing(slug);
  const entry = INDEX.find((e) => e.slug === slug);
  const { meta, body } = parse(raw);
  const title = meta.title || entry?.title || slug;
  const category = meta.category || entry?.category || "";
  document.title = `${title} – ${SITE.title}`;
  setActive("");

  const tmp = document.createElement("div");
  tmp.innerHTML = marked.parse(wikify(body));
  const toc = buildToc(tmp);
  const edit = SITE.repo ? `<a class="edit" href="https://github.com/${SITE.repo}/edit/${SITE.branch}/articles/${encodeURIComponent(slug)}.md">Edit this page</a>` : "";

  view.innerHTML = `
    <h1>${esc(title)}</h1>
    <p class="crumb">${category ? `Category: <a href="#/category/${encodeURIComponent(category)}">${esc(category)}</a>` : ""}</p>
    <div class="prose">${toc}${tmp.innerHTML}</div>
    <div class="footer-links" id="footer">${edit}</div>`;

  // Backlinks and category neighbours (need every article loaded)
  await loadAll();
  if (location.hash !== `#/${encodeURIComponent(slug)}` && !location.hash.endsWith(slug)) return;
  const links = INDEX.filter((e) => {
    if (e.slug === slug) return false;
    const t = cache.get(e.slug) || "";
    return [...t.matchAll(/\[\[([^\]|]+)/g)].some((m) => findEntry(m[1].trim())?.slug === slug);
  });
  const same = category ? INDEX.filter((e) => e.category === category && e.slug !== slug) : [];
  const f = $("#footer");
  if (!f) return;
  f.insertAdjacentHTML("afterbegin",
    (links.length ? `<p><strong>Linked from:</strong> ${links.map((e) => `<a href="#/${encodeURIComponent(e.slug)}">${esc(e.title)}</a>`).join(", ")}</p>` : "") +
    (same.length ? `<p><strong>More in ${esc(category)}:</strong> ${same.map((e) => `<a href="#/${encodeURIComponent(e.slug)}">${esc(e.title)}</a>`).join(", ")}</p>` : ""));
}

function showMissing(slug) {
  document.title = `Not found – ${SITE.title}`;
  const hint = SITE.repo
    ? ` <a href="https://github.com/${SITE.repo}/new/${SITE.branch}/articles?filename=articles/${encodeURIComponent(slug)}.md">Create it</a>.`
    : ` To create it, add <code>articles/${esc(slug)}.md</code> to the project.`;
  view.innerHTML = `<h1>No article called “${esc(slug)}”</h1><p>This page doesn’t exist yet.${hint}</p><p><a href="#/all">Browse all articles</a></p>`;
}

async function showHome() {
  document.title = SITE.title;
  setActive("#/");
  const raw = await getArticle("main-page");
  let intro = `<h1>${esc(SITE.title)}</h1><p>${esc(SITE.tagline)}</p>`;
  if (raw != null) {
    const { meta, body } = parse(raw);
    intro = `<h1>${esc(meta.title || SITE.title)}</h1><div class="prose">${marked.parse(wikify(body))}</div>`;
  }
  const cats = groupByCategory(INDEX.filter((e) => e.slug !== "main-page"));
  view.innerHTML = intro + `<h2 style="font:600 1.4rem var(--serif);margin-top:2rem">Browse by category</h2>` + (cats.length ? `<div class="cols">${cats.map(([c, es]) => `<section><h3>${c ? `<a href="#/category/${encodeURIComponent(c)}">${esc(c)}</a>` : "Uncategorized"}</h3><ul>${es.map((e) => `<li><a href="#/${encodeURIComponent(e.slug)}">${esc(e.title)}</a></li>`).join("")}</ul></section>`).join("")}</div>` : `<p class="empty">Nothing here yet. Add a Markdown file to the <code>articles</code> folder.</p>`);
}

function groupByCategory(entries) {
  const m = new Map();
  entries.forEach((e) => { const c = e.category || ""; if (!m.has(c)) m.set(c, []); m.get(c).push(e); });
  return [...m.entries()].sort((a, b) => (a[0] === "") - (b[0] === "") || a[0].localeCompare(b[0])).map(([c, es]) => [c, es.sort(byTitle)]);
}

function showAll() {
  document.title = `All articles – ${SITE.title}`;
  setActive("#/all");
  view.innerHTML = `<h1>All articles</h1><p class="crumb">${INDEX.length} article${INDEX.length === 1 ? "" : "s"}</p>${articleList([...INDEX].sort(byTitle))}`;
}

function showCategory(name) {
  document.title = `${name} – ${SITE.title}`;
  setActive(`#/category/${encodeURIComponent(name)}`);
  const es = INDEX.filter((e) => e.category === name).sort(byTitle);
  view.innerHTML = `<h1>${esc(name)}</h1><p class="crumb">Category · ${es.length} article${es.length === 1 ? "" : "s"}</p>${articleList(es)}`;
}

async function showSearch(q) {
  document.title = `Search: ${q} – ${SITE.title}`;
  setActive("");
  view.innerHTML = `<h1>Search</h1><p class="crumb">Searching for “${esc(q)}”…</p>`;
  await loadAll();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = INDEX.map((e) => {
    const text = parse(cache.get(e.slug) || "").body;
    const hay = text.toLowerCase();
    const inTitle = terms.filter((t) => e.title.toLowerCase().includes(t)).length;
    const inBody = terms.filter((t) => hay.includes(t)).length;
    if (!inTitle && !inBody) return null;
    const i = hay.indexOf(terms.find((t) => hay.includes(t)) || "");
    const snip = i >= 0 ? text.slice(Math.max(0, i - 60), i + 140).replace(/[#*_`>\[\]]/g, "").replace(/\s+/g, " ") : e.summary || "";
    return { e, score: inTitle * 5 + inBody, snip };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const mark = (s) => terms.reduce((acc, t) => acc.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>"), esc(s));
  view.innerHTML = `<h1>Search</h1><p class="crumb">${hits.length} result${hits.length === 1 ? "" : "s"} for “${esc(q)}”</p>` +
    (hits.length ? `<ul class="list">${hits.map((h) => `<li><a href="#/${encodeURIComponent(h.e.slug)}">${esc(h.e.title)}</a><span class="sum">${mark(h.snip)}</span></li>`).join("")}</ul>` : `<p class="empty">No matches. Try different words.</p>`);
}

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  $("#sidebar").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  const [a, b] = parts;
  if (!a) await showHome();
  else if (a === "all") showAll();
  else if (a === "random") {
    const pool = INDEX.filter((e) => e.slug !== "main-page");
    if (pool.length) location.replace(`#/${encodeURIComponent(pool[Math.floor(Math.random() * pool.length)].slug)}`);
    else showAll();
    return;
  } else if (a === "category" && b) showCategory(b);
  else if (a === "search" && b) await showSearch(b);
  else await showArticle(a);
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}

async function init() {
  $("#siteTitle").textContent = SITE.title;
  $("#tagline").textContent = SITE.tagline;
  try {
    const r = await fetch("articles/index.json");
    INDEX = r.ok ? await r.json() : [];
  } catch {
    view.innerHTML = `<h1>Can’t load articles</h1><p>Open this site through a web server (or GitHub Pages) rather than double-clicking <code>index.html</code>. In a terminal, run <code>python3 -m http.server</code> in this folder and visit <code>http://localhost:8000</code>.</p>`;
    return;
  }
  const cats = groupByCategory(INDEX).filter(([c]) => c);
  $("#catList").innerHTML = cats.map(([c, es]) => `<li><a href="#/category/${encodeURIComponent(c)}">${esc(c)}<span class="count">${es.length}</span></a></li>`).join("") || `<li class="empty" style="padding:.25rem .5rem">None yet</li>`;
  window.addEventListener("hashchange", route);
  route();
}

$("#searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#searchInput").value.trim();
  if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
});
$("#menuBtn").addEventListener("click", () => {
  const open = $("#sidebar").classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});
view.addEventListener("click", (e) => {
  const j = e.target.closest("[data-jump]");
  if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: "smooth" }); }
});

init();
