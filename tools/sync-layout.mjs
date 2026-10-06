#!/usr/bin/env node
/**
 * Überträgt gemeinsame Bausteine aus index.html in alle Unterseiten.
 *
 * Quelle der Wahrheit ist index.html. Dort sind die Bausteine markiert:
 *   <!-- layout:icons -->    … <!-- /layout:icons -->     Icon-Sprite
 *   <!-- layout:nav -->      … <!-- /layout:nav -->       Navigation (inkl. Mega-Menü)
 *   <!-- layout:partners --> … <!-- /layout:partners -->  Partner-Laufband
 *   <!-- layout:contact -->  … <!-- /layout:contact -->   Kontakt mit Formular
 *   <!-- layout:footer -->   … <!-- /layout:footer -->    Footer
 *
 * Jede Unterseite liegt flach neben index.html (z. B. mitarbeiterrabatte.html) und enthält
 * dieselben Markierungen (auch leer). Beim Übertragen werden Links angepasst:
 *   #anker              -> bleibt, wenn es den Anker auf der Unterseite gibt, sonst index.html#anker
 *   Logo (data-home)    -> index.html
 *   Link auf die Seite selbst -> bekommt aria-current="page"
 *
 * Aufruf: node tools/sync-layout.mjs        (ohne Abhängigkeiten)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOCKS = ["icons", "nav", "partners", "contact", "footer"];

const blockRe = (name) => new RegExp(`(<!-- layout:${name} -->)([\\s\\S]*?)(<!-- /layout:${name} -->)`);
const source = readFileSync(join(root, "index.html"), "utf8");

const sourceBlocks = {};
for (const name of BLOCKS) {
  const m = source.match(blockRe(name));
  if (!m) throw new Error(`Baustein „${name}“ fehlt in index.html`);
  sourceBlocks[name] = m[2];
}

// Unterseiten: alle .html-Dateien im Hauptordner mit mindestens einer Markierung
const pages = readdirSync(root)
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .map((file) => ({ file, path: join(root, file), html: readFileSync(join(root, file), "utf8") }))
  .filter((p) => BLOCKS.some((name) => blockRe(name).test(p.html)));

for (const page of pages) {
  let html = page.html;
  const used = BLOCKS.filter((name) => blockRe(name).test(html));

  // 1. Bausteine roh einsetzen (Anker werden erst danach geprüft)
  for (const name of used) html = html.replace(blockRe(name), (_, a, __, c) => `${a}${sourceBlocks[name]}${c}`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // 2. Links in den eingesetzten Bausteinen anpassen
  const fixLinks = (block) =>
    block
      .replace(/<a ([^>]*?)href="[^"]*"([^>]*?)data-home([^>]*)>/g, '<a $1href="index.html"$2data-home$3>')
      .replace(/\shref="#([^"]*)"/g, (all, id) => (id && ids.has(id) ? all : ` href="index.html#${id}"`))
      .replaceAll(` href="${page.file}"`, ` href="${page.file}" aria-current="page"`);
  for (const name of used) html = html.replace(blockRe(name), (_, a, inner, c) => `${a}${fixLinks(inner)}${c}`);

  writeFileSync(page.path, html);
  console.log(`${page.file}: ${used.join(", ")}`);
}
