// Eigene Seite je Bereich: erzeugt aus index.html für jeden Bereich eine Datei <seite>.html (z. B.
// mitarbeiterrabatte.html) mit eigenem Titel, eigener Beschreibung, eigener H1, eigenem Canonical und
// Brotkrümel-Daten (JSON-LD) – dazu sitemap.xml mit allen Seiten.
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

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync("sitemap.xml", sitemap);
console.log(`${Object.keys(pages).length} Seiten erzeugt, sitemap.xml mit ${urls.length} Adressen`);
