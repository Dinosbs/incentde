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
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
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
  // Kennung je Dateiinhalt: Wird eine Datei unter gleichem Namen ersetzt, lädt der Browser die neue Fassung
  const versions = Object.fromEntries(
    files.map((name) => [name, createHash("sha1").update(readFileSync(join(dir, name))).digest("hex").slice(0, 8)])
  );
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ files, versions }, null, 2) + "\n");
  console.log(`${folder}: ${files.length} Bild(er)`);
}
