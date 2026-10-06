#!/usr/bin/env node
/**
 * Schreibt für jeden Bildordner eine manifest.json mit allen Bilddateien.
 * Die Website liest diese Liste und befüllt damit automatisch
 *   - das Partner-Laufband   (assets/img/partner-logos/)
 *   - die Mini-Deal-Kacheln   (assets/img/deal-tiles/)
 *
 * Aufruf (ohne Abhängigkeiten): node tools/update-image-manifests.mjs
 * Läuft außerdem automatisch per GitHub Action, sobald sich Bilder ändern.
 */
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FOLDERS = ["assets/img/partner-logos", "assets/img/deal-tiles"];
const IMAGE = /\.(png|jpe?g|webp|svg|gif|avif)$/i;
const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

for (const folder of FOLDERS) {
  const dir = join(root, folder);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir)
    .filter((name) => IMAGE.test(name) && !name.startsWith("."))
    .sort(collator.compare);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ files }, null, 2) + "\n");
  console.log(`${folder}: ${files.length} Bild(er)`);
}
