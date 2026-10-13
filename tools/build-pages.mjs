// Eigene Seite je Bereich: erzeugt aus index.html für jeden Bereich eine Datei <seite>.html (z. B.
// mitarbeiterrabatte.html) mit eigenem Titel, eigener Beschreibung, eigener H1, eigenem Canonical und
// Brotkrümel-Daten (JSON-LD) – dazu die Unterseiten aus pages/ (FAQ, Karriere, Impressum, Datenschutz) und
// sitemap.xml mit allen Seiten.
// Der Inhalt ist derselbe One-Pager; welcher Bereich gezeigt wird, liest das Kopf-Skript aus dem Dateinamen.
// Die Zuordnung Seite → Bereich steht einmal im Kopf-Skript von index.html (page = {…}).
//
// Läuft in der GitHub Action vor der Veröffentlichung. Lokal (zum Ansehen/Testen): node tools/build-pages.mjs
// Die erzeugten Dateien stehen in .gitignore und werden nicht eingecheckt.
import fs from "node:fs";

const SITE = "https://www.incent.de/";
const src = fs.readFileSync("index.html", "utf8");

const objectIn = (name) => {
  const m = src.match(new RegExp(`\\b${name} = (\\{[^{}]*\\})`));
  if (!m) throw new Error(`Kopf-Skript: ${name} = {…} nicht gefunden`);
  return JSON.parse(m[1]);
};
const pages = objectIn("page"); // Seite → Bereich
const world = objectIn("world"); // Bereich → Welt
const first = objectIn("first"); // Welt → erster Bereich
const slugOf = Object.fromEntries(Object.entries(pages).map(([slug, panel]) => [panel, slug]));

const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1] || "";
const text = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&shy;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const must = (html, re, what) => {
  if (!re.test(html)) throw new Error(`${what} nicht gefunden`);
  return html;
};

// Namen für die Brotkrümel: Welt aus der Region („Für Arbeitgeber: Mitarbeiterbindung“), Bereich aus der Navigation
const worldName = (key) => attr(src.match(new RegExp(`<div class="world"[^>]*data-world-id="${key}"[^>]*>`))[0], "aria-label").split(": ").pop();
const navName = (slug) => {
  const m = src.match(new RegExp(`<a class="nav__link[^"]*" href="${slug}\\.html"[^>]*>([\\s\\S]*?)</a>`));
  return m ? text(m[1]) : slug;
};

const today = new Date().toISOString().slice(0, 10);
const urls = [{ loc: SITE, priority: "1.0" }];

for (const [slug, panel] of Object.entries(pages)) {
  const tag = src.match(new RegExp(`<div class="mb-panel[^"]*" id="${panel}"[^>]*>`));
  if (!tag) throw new Error(`Bereich #${panel} nicht gefunden`);
  const title = attr(tag[0], "data-title");
  const desc = attr(tag[0], "data-desc");
  const url = `${SITE}${slug}.html`;
  let html = src;

  // Kopf: Titel, Beschreibung, Canonical, Social-Media-Vorschau
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`);

  // Überschriften: die der Startseite wird h2, die des Bereichs h1 (Darstellung hängt an den Klassen, nicht am Tag)
  html = must(html, /<h1 class="hero__title"/, "H1 der Startseite").replace(
    /<h1 class="hero__title"([^>]*)>([\s\S]*?)<\/h1>/,
    '<h2 class="hero__title"$1>$2</h2>'
  );
  // Bereich mit eigenem Text im Seitenkopf (data-mb-only), sonst die Überschrift im Seitenkopf der Welt (Welten mit
  // nur einem Bereich), bei „Ihr Design“ die Überschrift der Live-Demo
  const design = /mb-panel--design/.test(tag[0]);
  if (design) {
    const re = /<h2 class="pb__title" id="pb-title">([\s\S]*?)<\/h2>/;
    html = must(html, re, "Überschrift der Live-Demo").replace(re, '<h1 class="pb__title" id="pb-title">$1</h1>');
  } else {
    const own = new RegExp(`(<div data-mb-only="${panel}">\\s*)<h2 class="subhero__title"([^>]*)>([\\s\\S]*?)</h2>`);
    if (own.test(html)) html = html.replace(own, '$1<h1 class="subhero__title"$2>$3</h1>');
    else {
      const at = html.indexOf(`id="${world[panel]}-top"`);
      const re = /<h2 class="subhero__title"([^>]*)>([\s\S]*?)<\/h2>/;
      if (at < 0 || !re.test(html.slice(at))) throw new Error(`Überschrift von #${panel} nicht gefunden`);
      html = html.slice(0, at) + html.slice(at).replace(re, '<h1 class="subhero__title"$1>$2</h1>');
    }
  }

  // Brotkrümel: Startseite › Welt › Bereich (die erste Seite einer Welt ist die Welt selbst)
  const home = slugOf[first[world[panel]]];
  const crumbs = [{ name: "Startseite", item: SITE }];
  crumbs.push({ name: worldName(world[panel]), item: `${SITE}${home}.html` });
  if (home !== slug) crumbs.push({ name: navName(slug), item: url });
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };
  html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`);

  fs.writeFileSync(`${slug}.html`, html);
  urls.push({ loc: url, priority: home === slug ? "0.9" : "0.8" });
}

// ---------- Unterseiten (FAQ, Karriere, Impressum, Datenschutz) ----------
// Quelle: pages/<name>.html – oben ein Kommentar mit title, description, robots (index/noindex) und crumb (Name in den
// Brotkrümeln), darunter der Inhalt von <main>. Dazu kommen Kopf, schlichte Kopfleiste, der Footer der Startseite (Sprungziele
// zeigen auf ./#…) und nur die Icons, die die Seite braucht. Erreichbar nur über den Footer, nicht über die Navigation.
// Kein main.js: Die Seiten brauchen nur consent.js (Privatsphäre-Einstellungen).
const between = (from, to) => {
  const i = src.indexOf(from);
  const j = src.indexOf(to, i);
  if (i < 0 || j < 0) throw new Error(`${from} … ${to} nicht gefunden`);
  return src.slice(i + from.length, j);
};
const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const footer = between("<!-- layout:footer -->", "<!-- /layout:footer -->")
  .replace(/ data-home/g, "")
  .replace(/ data-pb-open="[^"]*"/g, "")
  .replace(/href="#top"/g, 'href="./"')
  .replace(/<a ([^>]*?)href="#([^"]+)"/g, '<a $1href="./#$2"')
  .replace('alt="INCENT – nach oben"', 'alt="INCENT – zur Startseite"')
  .trim();
const symbols = Object.fromEntries([...src.matchAll(/<symbol id="(i-[a-z-]+)"[\s\S]*?<\/symbol>/g)].map((m) => [m[1], m[0]]));
const preloads = [...src.matchAll(/<link rel="preload" href="assets\/fonts\/[^>]+>/g)].map((m) => m[0]);
const ogImage = attr(src.match(/<meta property="og:image" content="[^"]*">/)[0], "content");
const ogAlt = attr(src.match(/<meta property="og:image:alt" content="[^"]*">/)[0], "content");
const header = `<header class="nav is-scrolled sub-nav">
    <div class="nav__inner">
      <a class="brand" href="./">
        <img src="assets/img/incent-logo-nav-dark.png" width="446" height="155" alt="INCENT – zur Startseite">
      </a>
      <div class="nav__actions">
        <a class="sub-nav__home" href="./"><svg class="i" aria-hidden="true"><use href="#i-home"/></svg><span>Zur Startseite</span></a>
        <a class="btn btn--primary btn--sm" href="./#kontakt">Demo buchen</a>
      </div>
    </div>
  </header>`;

const subpages = fs.existsSync("pages") ? fs.readdirSync("pages").filter((f) => f.endsWith(".html")).sort() : [];
for (const file of subpages) {
  const name = file.replace(/\.html$/, "");
  const raw = fs.readFileSync(`pages/${file}`, "utf8");
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`pages/${file}: Kopf-Kommentar (title, description, robots) fehlt`);
  const meta = Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => l.match(/^\s*([a-z]+):\s*(.+?)\s*$/))
      .filter(Boolean)
      .map((x) => [x[1], x[2]])
  );
  if (!meta.title || !meta.description) throw new Error(`pages/${file}: title oder description fehlt`);
  const body = raw.slice(m[0].length).trim();
  const index = meta.robots !== "noindex";
  const url = `${SITE}${name}.html`;

  // nur die Icons der Seite (Kopfleiste, Inhalt, Footer)
  const page = header + body + footer;
  const used = [...new Set([...page.matchAll(/href="#(i-[a-z-]+)"/g)].map((x) => x[1]))];
  const missing = used.filter((id) => !symbols[id]);
  if (missing.length) throw new Error(`pages/${file}: Icons fehlen im Sprite von index.html: ${missing.join(", ")}`);
  const sprite = used.map((id) => "      " + symbols[id]).join("\n");

  // strukturierte Daten: Brotkrümel; FAQ-Seite zusätzlich FAQPage aus den aufklappbaren Fragen
  const ld = [];
  if (index) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: SITE },
        { "@type": "ListItem", position: 2, name: meta.crumb || name, item: url },
      ],
    });
  }
  const qa = [...body.matchAll(/<summary class="faq__q">([\s\S]*?)<\/summary>\s*<div class="faq__a">([\s\S]*?)<\/div>/g)];
  if (qa.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: qa.map((x) => ({ "@type": "Question", name: text(x[1]), acceptedAnswer: { "@type": "Answer", text: text(x[2].replace(/&nbsp;/g, " ")) } })),
    });
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
${
  index
    ? `  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="INCENT">
  <meta property="og:title" content="${esc(meta.title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:alt" content="${ogAlt}">`
    : '  <meta name="robots" content="noindex, follow">'
}
  <meta name="theme-color" content="#f1f6ff">
  <link rel="icon" href="assets/img/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  ${preloads.join("\n  ")}
  <link rel="stylesheet" href="assets/css/main.css">
  <script defer src="assets/js/consent.js"></script>
${ld.map((x) => `  <script type="application/ld+json">${JSON.stringify(x)}</script>`).join("\n")}
</head>
<body class="sub">
  <!-- Erzeugt von tools/build-pages.mjs aus pages/${file} – dort bearbeiten -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
${sprite}
  </svg>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  ${header}

  <main id="main" class="sub-main">
${body}
  </main>

  ${footer}
</body>
</html>
`;
  fs.writeFileSync(`${name}.html`, html);
  if (index) urls.push({ loc: url, priority: "0.5" });
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync("sitemap.xml", sitemap);
console.log(`${Object.keys(pages).length} Bereichs-Seiten und ${subpages.length} Unterseiten erzeugt, sitemap.xml mit ${urls.length} Adressen`);
