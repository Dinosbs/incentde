# Partner-Logos („Partner, die uns vertrauen“)

Jede Bilddatei in diesem Ordner erscheint automatisch im Logo-Laufband.

- **Formate:** PNG, JPG, WebP, SVG (am besten mit transparentem Hintergrund, ca. 120 px hoch)
- **Dateiname = Firmenname** (wird als Alternativtext genutzt):
  `REWE-Group.webp` → „REWE Group“, `Center-Parcs.png` → „Center Parcs“
- **Reihenfolge:** alphabetisch. Für eine feste Reihenfolge eine Zahl voranstellen: `01-dyson.png`, `02-Sony.png`
- **Entfernen:** Datei löschen.

Nach dem Hochladen in GitHub aktualisiert eine GitHub Action die `manifest.json` automatisch.
Lokal oder bei manuellem Upload: `node tools/update-image-manifests.mjs` ausführen.

Solange ein Partner noch nicht als Datei hier liegt, zeigt die Seite das bisher verlinkte Logo von incent.de
(Liste in `index.html` unter `data-marquee-track`). Liegt eine Datei mit gleichem Firmennamen hier, ersetzt sie
den Platzhalter.
