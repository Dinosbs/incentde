# INCENT – Website (Relaunch)

Neue Startseite für incent.de. Die Inhalte stammen von der bisherigen Seite, Struktur und Design sind komplett neu.
Als Markenfarbe dient nur noch der blaue CI-Verlauf.

## Aufbau

```
index.html              Startseite (alle Inhalte)
assets/css/main.css     Styles, Design-Tokens in :root
assets/js/main.js       Interaktionen (Vanilla JS, keine Abhängigkeiten)
assets/fonts/           Selbst gehostete Schriften (SIL OFL, siehe LICENSE.txt)
assets/img/favicon.svg  Platzhalter-Favicon
```

Es gibt keinen Build-Schritt. Die Dateien lassen sich so, wie sie sind, auf jeden Webserver legen.

## Lokal ansehen

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Interaktive Elemente

| Bereich | Was passiert |
| --- | --- |
| Navigation | Glas-Leiste beim Scrollen, Mega-Menü „Lösungen“, Vollbild-Menü auf Mobilgeräten, Scrollspy |
| Hero | Animierter Verlauf, Lichtkegel folgt dem Cursor, Schreibmaschinen-Headline, 3D-Produktmockup, das sich beim Scrollen aufrichtet |
| Kennzahlen | Zählen beim Einblenden hoch (4.400+, 1,3 Mio, 3.500+, 100 %) |
| Partner | Endlos-Laufband, pausiert bei Hover |
| Lösungen | Tabs mit Auto-Play und Fortschrittsbalken, Tastatursteuerung mit Pfeiltasten |
| Versprechen | Text leuchtet Wort für Wort beim Scrollen auf |
| Plattform | Netzwerk-Grafik reagiert auf das gewählte Feature im Akkordeon |
| Leistungen | Bento-Karten mit Lichtkante und animierten Mini-Grafiken |
| Vorteile | Live-Vorschau: Firmenname, Markenfarbe und Hell/Dunkel ändern das Portal-Mockup in Echtzeit |
| Kundenstimmen | Karussell mit Auto-Play, Pause-Taste, Wischgeste und Pfeiltasten |

Bei `prefers-reduced-motion` laufen keine Animationen, und alle Inhalte sind sofort sichtbar.
Ohne JavaScript bleiben alle Inhalte lesbar.

## Anpassen

- **CI-Farben**: `--cyan`, `--azure` und `--royal` in `assets/css/main.css` (`:root`). `--grad` ist der CI-Verlauf.
  `--grad-ink` und `--grad-btn` sind dunklere Varianten, damit Schrift ausreichend Kontrast hat.
- **Logo**: Im Header und Footer steht derzeit eine Wortmarke (`.brand`). Die soll durch die offizielle Logo-Datei
  (am besten SVG) ersetzt werden. Das gilt auch für `assets/img/favicon.svg`.
- **Partner- und Kundenlogos** werden direkt von `www.incent.de/wp-content/uploads/…` geladen. Schlägt das Laden fehl,
  zeigt die Seite automatisch den Firmennamen als Text an. Für den Livegang die Dateien nach `assets/img/` kopieren
  und die Pfade anpassen.
- **Unterseiten** (Lösungen, Über uns, Kontakt, Rechtliches …) verlinken auf die bestehenden URLs unter `www.incent.de`.

## Gegenüber der alten Seite geändert

- Durchgehend „Sie“-Ansprache (vorher teilweise „du“).
- Kleine Korrekturen, z. B. „über unser Vorteilsportal“, „ihr Vorteilsprogramm“, „2-in-1-Benefitportal“.
- Firmenname einheitlich „INCENT Corporate Services GmbH“.
- Google Fonts, Google Tag Manager und Cookie-Banner sind entfallen. Die Schriften liegen lokal.
  Falls Tracking wieder eingebaut wird, gehört auch der Link „Privatsphäre-Einstellungen“ zurück in den Footer.
