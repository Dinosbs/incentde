# Partner-Logos („Partner, die uns vertrauen“)

Jede Bilddatei in diesem Ordner erscheint automatisch im Logo-Laufband.

- **Formate:** PNG, JPG, WebP, SVG (am besten mit transparentem Hintergrund). Rand ist egal: Transparenter oder
  weißer Rand wird automatisch abgeschnitten, und alle Logos werden auf etwa dieselbe Fläche gebracht.
  Für scharfe Darstellung auf Retina-Bildschirmen: Logo selbst ca. 200 px breit oder SVG.
- **Dateiname = Firmenname** (wird als Alternativtext genutzt):
  `REWE-Group.webp` → „REWE Group“, `Center-Parcs.png` → „Center Parcs“, `Acer 1.png` → „Acer“ (angehängte Nummern
  fallen weg). Kurzformen wie `UI` → „Union Investment“ oder `Tui` → „TUI“ stehen in `BRAND_NAMES` in `assets/js/main.js`.
- **Doppelte Partner:** Pro Firmenname wird nur ein Logo gezeigt (das alphabetisch erste).
- **Reihenfolge:** alphabetisch. Für eine feste Reihenfolge eine Zahl voranstellen: `01-dyson.png`, `02-Sony.png`
- **Entfernen:** Datei löschen.

Nach dem Hochladen in GitHub aktualisiert eine GitHub Action die `manifest.json` automatisch, und die Veröffentlichung
auf GitHub Pages erzeugt die Liste beim Hochladen ebenfalls frisch.
Lokal oder bei manuellem Upload: `node tools/update-image-manifests.mjs` ausführen.

Solange ein Partner noch nicht als Datei hier liegt, zeigt die Seite das bisher verlinkte Logo von incent.de
(Liste in `index.html` unter `data-marquee-track`). Liegt eine Datei mit gleichem Firmennamen hier, ersetzt sie
den Platzhalter.
