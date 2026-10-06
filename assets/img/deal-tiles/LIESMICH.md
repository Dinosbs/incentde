# Bilder für die Mini-Deal-Kacheln („Attraktive Markenangebote“)

Das Bild einer Kachel heißt wie die Kachel, in Kleinbuchstaben:

| Kachel  | Datei         |
| ------- | ------------- |
| Technik | `technik.jpg` |
| Wohnen  | `wohnen.jpg`  |
| Reisen  | `reisen.jpg`  |
| Mode    | `mode.jpg`    |
| Sport   | `sport.jpg`   |

- Erlaubt sind auch `.png`, `.webp` und `.jpeg`. Empfohlen: ca. 600 × 300 px.
- Fehlt ein Bild, zeigt die Kachel weiter ihr Symbol.
- Weitere Bilder (z. B. `garten.jpg`) erscheinen automatisch als zusätzliche Kachel „Garten“.

Nach dem Hochladen in GitHub aktualisiert eine GitHub Action die `manifest.json` automatisch.
Lokal oder bei manuellem Upload: `node tools/update-image-manifests.mjs` ausführen.
Gibt es keine `manifest.json` (z. B. gelöscht), sucht die Seite direkt nach den Standardnamen (`technik.jpg` …).
