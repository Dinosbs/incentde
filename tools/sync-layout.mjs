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
 * Jede Unterseite liegt in einem eigenen Ordner (z. B. mitarbeiterrabatte/index.html)
 * und enthält dieselben Markierungen (auch leer). Beim Übertragen werden Pfade angepasst:
 *   assets/…            -> ../assets/…
 *   mitarbeiterrabatte/ -> ../mitarbeiterrabatte/   (aktuelle Seite: ./ + aria-current)
 *   #anker              -> bleibt, wenn es den Anker auf der Unterseite gibt, sonst ../#anker
 *   Logo (data-home)    -> ../
 *
 * Aufruf: node tools/sync-layout.mjs        (ohne Abhängigkeiten)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOCKS = ["icons", "nav", "partners", "contact", "footer"];
const SKIP = new Set(["assets", "tools", "node_modules", ".git", ".github"]);

const blockRe = (name) => new RegExp(`(<!-- layout:${name} -->)([\\s\\S]*?)(<!-- /layout:${name} -->)`);
const source = readFileSync(join(root, "index.html"), "utf8");

const sourceBlocks = {};
for (const name of BLOCKS) {
  const m = source.match(blockRe(name));
  if (!m) throw new Error(`Baustein „${name}“ fehlt in index.html`);
  sourceBlocks[name] = m[2];
}

const pages = readdirSync(root)
  .filter((d) => !SKIP.has(d) && !d.startsWith(".") && statSync(join(root, d)).isDirectory())
  .map((d) => ({ slug: d, file: join(root, d, "index.html") }))
  .filter((p) => existsSync(p.file));

const isExternal = (v) => /^(?:[a-z]+:|\/\/|\/)/i.test(v);

for (const page of pages) {
  let html = readFileSync(page.file, "utf8");
  const used = BLOCKS.filter((name) => blockRe(name).test(html));

  // 1. Bausteine roh einsetzen (Anker werden erst danach geprüft)
  for (const name of used) html = html.replace(blockRe(name), (_, a, __, c) => `${a}${sourceBlocks[name]}${c}`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // 2. Pfade in den eingesetzten Bausteinen anpassen
  const fixPaths = (block) =>
    block
      .replace(/<a ([^>]*?)href="[^"]*"([^>]*?)data-home([^>]*)>/g, '<a $1href="../"$2data-home$3>')
      .replace(/\s(href|src|data-logo-folder|data-tile-folder)="([^"]*)"/g, (all, attr, value) => {
        if (!value || isExternal(value) || value.startsWith("../")) return all;
        if (value.startsWith("#")) return ids.has(value.slice(1)) ? all : ` ${attr}="../${value}"`;
        if (attr === "href" && (value === `${page.slug}/` || value === page.slug)) return ` ${attr}="./" aria-current="page"`;
        return ` ${attr}="../${value}"`;
      });
  for (const name of used) html = html.replace(blockRe(name), (_, a, inner, c) => `${a}${fixPaths(inner)}${c}`);

  writeFileSync(page.file, html);
  console.log(`${page.slug}/index.html: ${used.join(", ") || "keine Bausteine"}`);
}
