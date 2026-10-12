// Bilder für die Veröffentlichung verkleinern (läuft in der GitHub Action vor dem Hochladen, ändert das Repository nicht).
// Nur zu große Bilder (breiter als MAX_W oder schwerer als MAX_KB, z. B. direkt aus der Kamera oder über GitHub
// hochgeladen) werden auf höchstens MAX_W Pixel Breite gebracht und neu komprimiert; alles andere bleibt unangetastet
// (kein erneutes verlustbehaftetes Komprimieren kleiner Logos). PNG bleibt verlustfrei.
// Übernommen wird das Ergebnis nur, wenn es deutlich kleiner ist (mind. 10 %).
// Aufruf: node tools/optimize-images.mjs [Ordner]   (benötigt das Paket „sharp“)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.argv[2] || "assets/img";
const MAX_W = 1600; // doppelte Anzeigebreite der größten Bildflächen (~800 px)
const MAX_KB = 250;
const PHOTO = /\.(jpe?g|webp)$/i;
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jpe?g|webp|png)$/i.test(e.name)) files.push(p);
  }
};
walk(ROOT);

let before = 0;
let after = 0;
for (const file of files) {
  const input = fs.readFileSync(file);
  before += input.length;
  let out = input;
  try {
    const img = sharp(input, { animated: false });
    const meta = await img.metadata();
    const resize = meta.width > MAX_W ? { width: MAX_W, withoutEnlargement: true } : null;
    if (!resize && input.length <= MAX_KB * 1024) {
      after += input.length;
      continue;
    }
    let pipe = sharp(input).rotate();
    if (resize) pipe = pipe.resize(resize);
    if (/\.webp$/i.test(file)) pipe = pipe.webp({ quality: 78, effort: 6, alphaQuality: 90 });
    else if (/\.jpe?g$/i.test(file)) pipe = pipe.jpeg({ quality: 78, mozjpeg: true });
    else pipe = pipe.png({ compressionLevel: 9, effort: 10 }); // verlustfrei
    const result = await pipe.toBuffer();
    if (result.length < input.length * 0.9 && (PHOTO.test(file) || !resize)) out = result;
    if (out !== input) {
      fs.writeFileSync(file, out);
      console.log(`${file}: ${meta.width}px ${Math.round(input.length / 1024)} KB → ${resize ? MAX_W + "px " : ""}${Math.round(out.length / 1024)} KB`);
    }
  } catch (err) {
    console.log(`${file}: übersprungen (${err.message})`);
  }
  after += out.length;
}
console.log(`Bilder: ${files.length}, ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
