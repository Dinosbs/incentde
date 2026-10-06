# INCENT – Website (Relaunch)

Neue Startseite für incent.de. Die Inhalte stammen von der bisherigen Seite, Struktur und Design sind komplett neu.
Als Markenfarbe dient nur noch der blaue CI-Verlauf.

## Aufbau

```
index.html              Startseite (alle Inhalte)
corporate-benefits-fuer-arbeitgeber/index.html   Mitarbeiterbindung › 2-in-1-Benefitportal
mitarbeiterrabatte/index.html                    Mitarbeiterbindung › Mitarbeiterrabatte
mitarbeitergutscheine/index.html                 Mitarbeiterbindung › SELECT Mitarbeitergutscheine
steuerfreie-mitarbeitergeschenke/index.html      Mitarbeiterbindung › Geschenkanlässe
assets/css/main.css     Styles, Design-Tokens in :root
assets/js/main.js       Interaktionen (Vanilla JS, keine Abhängigkeiten)
assets/fonts/           Barlow Semi Condensed, selbst gehostet (SIL OFL, siehe LICENSE.txt)
assets/img/             INCENT-Logo (weiß + dunkel), Favicon
assets/img/portal/      Bilder für den Portal-Nachbau (aus dem Dashboard, komprimiert)
assets/img/about/       Bilder für „Über uns“ (von der bisherigen Über-uns-Seite, komprimiert)
assets/img/partner-logos/  Logos für das Laufband „Partner, die uns vertrauen“ – werden automatisch eingelesen
assets/img/deal-tiles/     Bilder für die Mini-Deal-Kacheln (technik.jpg, wohnen.jpg …) – werden automatisch eingelesen
assets/img/testimonials/   Logos für die Kundenstimmen
assets/img/mitarbeiterbindung/  Fotos, Isometrien und Portal-Screenshots der Mitarbeiterbindungs-Seiten (komprimiert)
tools/update-image-manifests.mjs  erzeugt die Bildlisten (manifest.json) für die beiden Ordner oben
tools/sync-layout.mjs   überträgt Navigation, Kontakt, Footer usw. aus index.html in alle Unterseiten
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
| Hero | Animierter Verlauf, Lichtkegel folgt dem Cursor, wechselnde Begriffe in der Headline (alle 800 ms, kippen in 3D ein, mit Lichtblitz), Nachbau des echten Vorteilsportals in 3D, der dem Cursor folgt (Neigung, Verschiebung, Lichtreflex). Der Live-Chip darunter ändert die Buttonfarbe direkt und führt zur Live-Vorschau |
| Kennzahlen | Zählen beim Einblenden hoch (4.400+, 1,3 Mio, 3.500+, 100 %) |
| Partner | Endlos-Laufband aus `assets/img/partner-logos/`, Tempo passt sich der Anzahl an, pausiert bei Hover |
| Lösungen | Tabs mit Auto-Play und Fortschrittsbalken, Tastatursteuerung mit Pfeiltasten |
| Versprechen | Text leuchtet Wort für Wort beim Scrollen auf |
| Plattform | Netzwerk-Grafik reagiert auf das gewählte Feature im Akkordeon |
| Leistungen | Bento-Karten mit Lichtkante und animierten Mini-Grafiken; Kachelbilder aus `assets/img/deal-tiles/` |
| Vorteile | Kacheln mit weichem Hover. Live-Vorschau des Portals (Text oben, darunter Editor und Vorschau nebeneinander; die Vorschau folgt dem Cursor): eigenes Logo (Upload oder Drag & Drop), Unternehmensname, Buttonfarbe, Farbe der Navigationsleiste und Hintergrund (Bild, einfarbig, Verlauf – jeweils mit eigener Farbwahl). Alle Wechsel blenden weich über, und das Portal im Hero übernimmt jede Änderung |
| Kundenstimmen | Karussell mit Auto-Play, Pause-Taste, Wischgeste und Pfeiltasten |
| Über uns | Inhalte der bisherigen Über-uns-Seite: Einleitung, Kennzahlen, drei Kernbereiche, Link zum Vorteilsportal |
| Kontakt | Kontaktformular mit Zielgruppen-Auswahl, passenden Zusatzfeldern je Zielgruppe und Prüfung der Eingaben |

### Unterseiten Mitarbeiterbindung

Jede Unterseite liegt in einem eigenen Ordner mit dem Slug der bisherigen URL (z. B. `/mitarbeiterrabatte/`),
die Adressen bleiben also gleich. Alle Seiten haben denselben Aufbau: Hero mit Brotkrumen und Cluster-Navigation
zu den Schwesterseiten, danach die Inhalte, Kontakt, Partner-Laufband und Footer.

| Seite | Interaktive Elemente |
| --- | --- |
| 2-in-1-Benefitportal | Vorteile mit Umschalter „Für Arbeitgeber / Für Mitarbeitende“ (Desktop: Liste und Detailkarte, mobil: Akkordeon), Tabs „Drei gute Gründe“ mit Screenshot-Wechsler und Anlass-Kacheln, Portal mit Hotspots (Klick auf „Ihr Logo“, „Ihre Farben“ … führt die Anpassung im Portal vor), Gutschein-Konfigurator, Warenkorb-Demo, Ablauf in vier Schritten |
| Mitarbeiterrabatte | Rabatt-Explorer: sechs Lebensbereiche mit echten Angeboten aus dem Vorteilsportal (Auto-Play, Pfeiltasten), Vorteile als Akkordeon, Portal-Hotspots |
| Mitarbeitergutscheine | Vorteile mit Umschalter Arbeitgeber/Mitarbeitende, Gutschein-Konfigurator (Anlass, Wert, Name, Grußtext, Format PDF/Print/CSV, QR-Code), Preisrechner SELECT vs. Prepaid-Kreditkarte mit Schiebereglern, Warenkorb-Demo (Zuzahlung/Restguthaben), Portal-Hotspots |
| Geschenkanlässe | Anlass-Finder: Hover oder Fokus auf eine Kachel ändert die Gutschein-Vorschau, SEO-Text mit Links |

Die Angebote im Rabatt-Explorer sind eine Momentaufnahme (Stand Oktober 2026) und stehen direkt im HTML.
Die Anlass-Unterseiten (Weihnachten, Geburtstag, Jubiläum …) verlinken weiterhin auf `www.incent.de`.

**Gemeinsame Bausteine:** In `index.html` sind Icon-Sprite, Navigation, Partner-Laufband, Kontakt und Footer mit
`<!-- layout:name -->` … `<!-- /layout:name -->` markiert. Nach einer Änderung an der Startseite
`node tools/sync-layout.mjs` ausführen: Das Skript kopiert die Blöcke in alle Unterseiten, passt die Pfade an
(`assets/…` → `../assets/…`) und markiert im Menü die aktuelle Seite (`aria-current="page"`).

**Neue Unterseite anlegen:** Ordner mit `index.html` anlegen (am einfachsten eine bestehende Unterseite kopieren),
Inhalt zwischen Hero und Kontakt ersetzen, die leeren Markierungen für die Bausteine stehen lassen und
`node tools/sync-layout.mjs` ausführen. Im Mega-Menü von `index.html` den Link auf `ordnername/` setzen.

Bei `prefers-reduced-motion` laufen keine Animationen, und alle Inhalte sind sofort sichtbar.
Ohne JavaScript bleiben alle Inhalte lesbar.

## Anpassen

- **CI-Farben**: `--cyan`, `--azure` und `--royal` in `assets/css/main.css` (`:root`). `--grad` ist der CI-Verlauf.
  `--grad-ink` und `--grad-btn` sind dunklere Varianten, damit Schrift ausreichend Kontrast hat.
- **Schrift**: Barlow Semi Condensed in den Schnitten 400, 500, 600, 600 kursiv, 700 und 800.
- **Logo**: `incent-logo-white.png` (Original, für dunkle Flächen) und `incent-logo-dark.png` (daraus abgeleitet,
  für den hellen Portal-Header). Steht eine SVG-Version bereit, einfach die Pfade tauschen. Das Favicon stammt aus dem Portal.
- **Portal-Nachbau** (`.vp` in `main.css`): bildet `incent.vorteile.net/de/dashboard` nach. Alle Maße sind virtuelle
  Pixel einer 1240 px breiten Seite und skalieren über Container-Query-Einheiten, Text bleibt dadurch scharf.
  Standardfarben stehen in `.vp-theme`. Die vier Deal-Karten sind eine Momentaufnahme aus dem Dashboard und lassen sich
  in `index.html` austauschen (Bilder unter `assets/img/portal/`).
- **Partner- und Kundenlogos** werden direkt von `www.incent.de/wp-content/uploads/…` geladen. Schlägt das Laden fehl,
  zeigt die Seite automatisch den Firmennamen als Text an. Für den Livegang die Dateien nach `assets/img/` kopieren
  und die Pfade anpassen.
- **Partner-Logos und Kachelbilder** einfach in den jeweiligen Ordner legen (Anleitung: `LIESMICH.md` im Ordner).
  Die Seite liest die Liste aus `manifest.json`. Nach einem Push aktualisiert die GitHub Action
  `.github/workflows/image-manifests.yml` diese Datei automatisch; lokal `node tools/update-image-manifests.mjs` ausführen.
  Fehlt die Datei, nutzt die Seite die Verzeichnisliste des Servers (falls aktiviert).
- **Unterseiten**: Die vier Mitarbeiterbindungs-Seiten liegen in diesem Repository (siehe oben). Alle übrigen
  (Kundenbindung, Markenplatzierung, Content Creator, FAQ, Karriere, Rechtliches …) verlinken noch auf `www.incent.de`.
  Die Spaltenköpfe im Mega-Menü („Mitarbeiterbindung“ usw.) sind bewusst keine Links.
  „Über uns“ und „Kontakt“ sind Abschnitte dieser Seite (`#ueber-uns`, `#kontakt`).
- **Kontaktformular**: Ohne Backend öffnet „Absenden“ das E-Mail-Programm mit einer vorbereiteten Nachricht an
  info@incent.de. Für den echten Versand am `<form data-contact-form>` das Attribut `data-endpoint="https://…"` setzen,
  dann wird das Formular per `fetch` (POST, FormData) an diese Adresse geschickt. Die Zusatzfelder je Zielgruppe
  (z. B. Unternehmensgröße für Arbeitgeber, Plattform/Profil-URL für Creator) sind nachgebaut, da sie in der
  gespeicherten Seite nicht enthalten waren – bitte mit dem bisherigen Formular abgleichen.
- **Logo-Upload** in der Live-Vorschau bleibt im Browser (Object-URL) und wird nirgendwohin übertragen.

## Gegenüber der alten Seite geändert

- Durchgehend „Sie“-Ansprache (vorher teilweise „du“).
- Kleine Korrekturen, z. B. „über unser Vorteilsportal“, „ihr Vorteilsprogramm“, „2-in-1-Benefitportal“.
- Firmenname einheitlich „INCENT Corporate Services GmbH“.
- Unterseiten: Die Rückseiten der Wendekarten (Anlässe, Rabatt-Kategorien) fehlten in den gespeicherten Seiten und sind
  durch den Rabatt-Explorer und die Anlass-Kacheln ersetzt. Die Preistabelle rechnet mit den Einzelpreisen (9,90 € × 100 = 990 €, nicht 995 €),
  die Ersparnis ergibt sich daraus (7,7 % statt „rund 10 %“).
- Google Fonts, Google Tag Manager und Cookie-Banner sind entfallen. Die Schriften liegen lokal.
  Falls Tracking wieder eingebaut wird, gehört auch der Link „Privatsphäre-Einstellungen“ zurück in den Footer.
