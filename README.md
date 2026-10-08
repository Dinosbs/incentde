# INCENT – Website (Relaunch)

Neue Startseite für incent.de. Die Inhalte stammen von der bisherigen Seite, Struktur und Design sind komplett neu.
Als Markenfarbe dient nur noch der blaue CI-Verlauf.

## Aufbau

```
index.html              Startseite (alle Inhalte)
mitarbeiterbindung.html Mitarbeiterbindung: Benefitportal, Mitarbeiterrabatte, Mitarbeitergutscheine, Geschenkanlässe
kundenbindung.html      Kundenbindung: Loyalty-Portal, Kundenrabatte, Kundengutscheine
markenplatzierung.html  Markenplatzierung: Anbieter werden, Newsletter-Platzierung
content-creator.html    Content Creator: Community-Shop (Du-Ansprache)
assets/css/main.css     Styles, Design-Tokens in :root
assets/js/main.js       Interaktionen (Vanilla JS, keine Abhängigkeiten)
assets/fonts/           Barlow Semi Condensed, selbst gehostet (SIL OFL, siehe LICENSE.txt)
assets/img/             INCENT-Logo (weiß + dunkel), Favicon
assets/img/portal/      Bilder für den Portal-Nachbau (aus dem Dashboard, komprimiert)
assets/img/about/       Bilder für „Über uns“ (von der bisherigen Über-uns-Seite, komprimiert)
assets/img/partner-logos/  Logos für das Laufband „Partner, die uns vertrauen“ – werden automatisch eingelesen
assets/img/deal-tiles/     Bilder für die Mini-Deal-Kacheln (technik.jpg, wohnen.jpg …) – werden automatisch eingelesen
assets/img/testimonials/   Logos für die Kundenstimmen
assets/img/mitarbeiterbindung/  Fotos, Isometrien und Portal-Screenshots der Mitarbeiterbindung (komprimiert)
assets/img/mitarbeiterbindung/vorschau/  Bilder und Logos für die Portal-Vorschauen „Drei gute Gründe“ (aus den Portalseiten Deal, Gutscheinwelt, Gutscheinansicht)
assets/img/kundenbindung/       Fotos und Isometrien der Kundenbindung (Portal-Screenshots kommen aus mitarbeiterbindung/)
assets/img/markenplatzierung/   Fotos, Isometrien und Screenshots der Markenplatzierung
assets/img/content-creator/     Fotos, Isometrien und Shop-Screenshots für Creator
tools/update-image-manifests.mjs  erzeugt die Bildlisten (manifest.json) für die beiden Ordner oben
tools/sync-layout.mjs   überträgt Navigation, Kontakt, Footer usw. aus index.html in alle Unterseiten
```

Es gibt keinen Build-Schritt. Die Dateien lassen sich so, wie sie sind, auf jeden Webserver legen.

## Lokal ansehen

`index.html` per Doppelklick im Browser öffnen genügt – alle Seiten und Links funktionieren auch ohne Server.
Einzige Ausnahme: Neue Bilder in `assets/img/partner-logos/` und `assets/img/deal-tiles/` erscheinen lokal nur
mit einem kleinen Webserver, weil der Browser die Bildliste (`manifest.json`) sonst nicht lesen darf:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Interaktive Elemente

| Bereich | Was passiert |
| --- | --- |
| Navigation | Glas-Leiste beim Scrollen, Mega-Menü „Lösungen“, Vollbild-Menü auf Mobilgeräten, Scrollspy. Logo: `assets/img/incent-logo-nav.png` (zentriertes PNG, Schriftzug mittig; oben 48 px hoch, nach dem Scrollen weich auf 40 px verkleinert; Footer und Portal-Vorschauen nutzen weiter `incent-logo-white.png` / `incent-logo-dark.png`) |
| Hero | Animierter Verlauf, Lichtkegel folgt dem Cursor, wechselnde Begriffe in der Headline (alle 800 ms, kippen in 3D ein, mit Lichtblitz), Nachbau des echten Vorteilsportals in 3D, der dem Cursor folgt (Neigung, Verschiebung, Lichtreflex). Der Live-Chip darunter ändert die Buttonfarbe direkt und führt zur Live-Vorschau |
| Kennzahlen | Zählen beim Einblenden hoch (4.400+, 1,3 Mio, 3.500+, 100 %) |
| Partner | Endlos-Laufband aus `assets/img/partner-logos/` – jede Datei wird automatisch eine Kachel, gelöschte Dateien verschwinden (keine Liste im HTML); Dateien, die nicht laden oder leer sind, bekommen keine Kachel. Tempo passt sich der Anzahl an, pausiert bei Hover. Transparenter oder weißer Rand der Logo-Dateien wird automatisch abgeschnitten, danach bekommen alle Logos etwa dieselbe Fläche (`fitLogo` in `main.js`); pro Partner erscheint nur ein Logo. Markennamen für Kurz-Dateinamen (z. B. „UI“ → „Union Investment“) stehen in `BRAND_NAMES` |
| Lösungen | Tabs mit Auto-Play und Fortschrittsbalken, Tastatursteuerung mit Pfeiltasten |
| Versprechen | Text leuchtet Wort für Wort beim Scrollen auf |
| Plattform | Netzwerk-Grafik reagiert auf das gewählte Feature im Akkordeon |
| Leistungen | Bento-Karten mit Lichtkante und animierten Mini-Grafiken; Kachelbilder aus `assets/img/deal-tiles/` |
| Vorteile | Kacheln mit weichem Hover. Live-Vorschau des Portals (Text oben, darunter Editor und Vorschau nebeneinander; die Vorschau folgt dem Cursor): eigenes Logo (Upload oder Drag & Drop, leerer Rand wird automatisch abgeschnitten), Unternehmensname, Buttonfarbe, Farbe der Navigationsleiste und Hintergrund (eigenes Hintergrundbild hochladen, einfarbig, Verlauf – jeweils mit eigener Farbwahl). Die Gestaltung ist das **Marken-Profil** und gilt seitenübergreifend (siehe unten); „Alles zurücksetzen“ stellt den INCENT-Standard wieder her. Alle Wechsel blenden weich über, und das Portal im Hero übernimmt jede Änderung |
| Kundenstimmen | Karussell mit Auto-Play, Pause-Taste, Wischgeste und Pfeiltasten |
| Über uns | Inhalte der bisherigen Über-uns-Seite: Einleitung, Kennzahlen, drei Kernbereiche, Link zum Vorteilsportal |
| Kontakt | Kontaktformular mit Zielgruppen-Auswahl, passenden Zusatzfeldern je Zielgruppe und Prüfung der Eingaben |
| Cursor-Folgen (alle Seiten) | Alle Kipp-Elemente folgen dem Cursor im ganzen Fenster, nicht nur über ihrer Fläche: Portal im Hero, Live-Vorschauen, Fotos im Seitenkopf, Bilder neben Text, Gutschein-Gestalter, Checkout-Demo „Wertgutscheine einlösen“ und das Kontaktformular. Ein gemeinsamer Listener (`createTilt` in `main.js`) rechnet nur für sichtbare Elemente; der Lichtreflex sitzt unter dem Cursor und wird mit Abstand schwächer. Liegt der Fokus im Element (Tippen im Formular), hält es weitgehend still; verlässt die Maus das Fenster, richtet sich alles auf. Nur bei Maus/Stift, nicht bei „Bewegung reduzieren“. |
| Bilder neben Text (alle Seiten) | Kippen zum Cursor (`.tilt-media` mit `data-tilt-card`), das Bild verschiebt sich im Rahmen gegen die Bewegung, Ebenen davor (z. B. „Seit 2012“) schweben in der Tiefe, Lichtreflex folgt dem Cursor. Beim Scrollen driften die Bilder leicht hinter der Seite her (`data-parallax`, auch Fotos im Seitenkopf und Geräte-Bühne). |
| Schwebende Tags (alle Seiten) | Beim Darüberfahren hebt sich der Tag an, das Icon spielt eine kleine Animation passend zum Motiv (Herz schlägt, Flugzeug fliegt davon, Haken zeichnet sich, Zahnrad dreht sich …). Die Zuordnung Icon → Animation steht in `TAG_ANIMS` in `main.js`, die Animationen als `ico-*` in `main.css`; neue Tags bekommen sie automatisch. Nur bei echter Hover-Maus aktiv. |
| Scroll-Stepper (alle Seiten) | Alles, was man durchklicken kann (Tabs, Akkordeons, Vorteile mit Umschalter, Hotspots, Karussells, Touchpoints, Pakete, Anlass-Finder …), bleibt am Desktop beim Scrollen stehen und schaltet mit dem Scrollen Punkt für Punkt weiter, erst danach geht die Seite weiter (bei „Warum INCENT?“ erst alle Arbeitgeber-Vorteile, dann alle für Mitarbeitende). Rückwärts scrollen läuft die Punkte rückwärts ab. Rechts zeigt eine kleine Punktleiste, wo man steht. Ein Klick auf einen Punkt springt an die passende Scroll-Stelle; Links und Anker auf einen Punkt (z. B. `#sc-panel-3`) öffnen ihn direkt. Das automatische Weiterschalten dieser Elemente ist am Desktop aus, weil das Scrollen es übernimmt. Die Zuordnung steht in `STEPPERS` in `main.js` (`initScrollSteps`). Vorab wird die Höhe aller Punkte gemessen (unsichtbar, ohne Animation), damit ein Bereich nicht mitten im Scrollen abschaltet, wenn ein späterer Punkt mehr Text hat. Angeheftet wird der größte umgebende Block, der ganz ins Fenster passt (unter Navigation und angedockter Bereichsleiste); ist schon das Element selbst etwas zu hoch (kleine Laptop-Fenster), wird es verkleinert, höchstens auf 75 % (`STEP_ZMIN`), sonst bleibt es normal klickbar. `data-sstep-pin` legt den stehenden Block fest (bei „Bindung und Recruiting“ nur die Vorteile, die Grafik läuft daneben mit). Bereiche, die erst beim Wechsel über die Bereichsleiste sichtbar werden, richten sich dabei ein. Bei den Newsletter-Paketen beginnt der Durchlauf mit „Starter“ (ohne Stepper ist „Business“ vorausgewählt). Geprüft von 1280×720 bis 1920×1080 (alle 24 Bereiche). Nicht auf Mobilgeräten (unter 981 px) und nicht bei „Bewegung reduzieren“. |
| Weiches Scrollen (alle Seiten) | Das Mausrad gleitet statt zu springen: Ein Radschritt setzt nur das Ziel, die Seite zieht weich nach (`initSmoothScroll` in `main.js`, ohne Bibliothek; Stärke `LERP`). Beim Browser bleiben Zoomen (Strg/Cmd + Rad), waagerechtes Scrollen, scrollbare Bereiche im Inhalt (bis sie am Ende sind, Opt-out per `data-native-scroll`), Tastatur, Scrollleiste, Touch und Sprünge per Link; ein Klick oder eine Taste beendet das Gleiten sofort. Nicht bei „Bewegung reduzieren“. |

### Mitarbeiterbindung: eine Seite, vier Bereiche

`mitarbeiterbindung.html` enthält alle vier Bereiche. Die Cluster-Leiste unter dem Seitenkopf schaltet um, ohne die Seite
neu zu laden: Seitenkopf (Titel, Text, Bild) und Inhalt blenden weich über, die Markierung gleitet zum gewählten Bereich.
Jeder Bereich hat eine eigene Adresse, die Zurück-Taste funktioniert, und der Seitentitel wechselt mit:

| Bereich | Adresse | Interaktive Elemente |
| --- | --- | --- |
| 2-in-1-Benefitportal | `#benefitportal` | Kennzahlen, Tabs „Drei gute Gründe“ mit interaktiven Portal-Vorschauen statt Screenshots (Deal-Seite: „Jetzt sichern!“ zeigt den persönlichen Code, ähnliche Deals wechseln den Inhalt; Geschenkeshop: Gutscheinwelt → Gutscheinansicht mit Wertauswahl, Warenkorb und Geschenk-Guthaben; Corporate Design: Portal-Nachbau mit wechselnden Beispiel-Designs und Link zum Portal-Builder auf der Startseite `index.html#live-vorschau`; jede Vorschau spielt beim Einblenden eine kurze Demo, ein Klick in die Vorschau stoppt das automatische Weiterschalten), Vorteile mit Umschalter „Für Arbeitgeber / Für Mitarbeitende“ (Desktop: Liste und Detailkarte, mobil: Akkordeon); die Links „Im Portal in Ihrem Design“ und „So sieht Ihr Geschenkeshop aus“ springen auf die passende Vorschau oben (`#sc-panel-3`, `#sc-panel-2`), Verweis auf den SELECT Einkaufsgutschein, Ablauf |
| Mitarbeiterrabatte | `#mitarbeiterrabatte` | Rabatt-Explorer „Vielfältige Rabatte für alle Lebensbereiche“ mit den Kategorien des Vorteilsportals (Mobilfunk & Internet, Mobilität, Home & Living, Reisen, Sport, Mode & Accessoires, Freizeit & Familie) und je bis zu vier echten Angeboten aus den Kategorieseiten des Shops (Bilder unter `assets/img/portal/`, Stand Oktober 2026), „Bindung und Recruiting“ (`#arbeitgebermarke`) mit eigener Visualisierung „Arbeitgeber-Magnet“ statt Bild (Team auf einer Umlaufbahn, Bewerbungen werden angezogen; die Grafik zeigt den im Akkordeon geöffneten Vorteil und steht vertikal mittig; am Desktop bleiben beim Durchscrollen der Vorteile Akkordeon und Grafik nebeneinander stehen), Verweise auf Portal, Ablauf und Gutscheine |
| Mitarbeitergutscheine | `#mitarbeitergutscheine` | „Ein Gutschein, drei gute Gründe“ (`#gutschein-gruende`) als helles Showcase mit eigenen, interaktiven Illustrationen statt Bildern: 1 Formate – PDF, Print (DIN lang) und Excel gefächert, Format, Design-Farbe und Logo wählbar (Klick auf ein hinteres Format holt es nach vorn); 2 Aufladungen – Karte, Kennzahlen und Monatsleiste, Rhythmus (monatlich, quartalsweise, anlassbezogen) und Betrag wählbar, das Jahr läuft durch, Gebühren immer 0,00 €; 3 Einlösung – der hauseigene Warenkorb im Branding aus dem Marken-Profil (Logo, Name, Adresse, Buttonfarbe, Hintergrund als Banner) als Endlosschleife: ein Zeiger tippt den Gutscheincode ein, löst ein, die Gesamtsumme sinkt von 57,95 € auf 7,95 €, Bezahlen, Danke – und von vorn (`initGiftReasons` / `initGiftCart` in `main.js`; Demos 1 und 2 laufen bis zur ersten eigenen Wahl; bei „Bewegung reduzieren“ steht der Warenkorb eingelöst), Vorteile Arbeitgeber/Mitarbeitende, Gutschein-Konfigurator (`#gestalten`, mit Logo-Upload – das Logo landet im Marken-Profil), Vorteile mit SELECT, Preisrechner (`#preise`), Warenkorb-Demo im Look des Portal-Checkouts (`#einloesen`), Ablauf |
| Geschenkanlässe | `#geschenkanlaesse` | Anlass-Finder mit Gutschein-Vorschau (`#anlaesse`; die Kacheln sind keine Links, Darüberfahren, Antippen oder Tab wechselt das Motiv), Text ohne externe Links |

Links auf einen Abschnitt in einem anderen Bereich (z. B. `#gestalten` aus dem Benefitportal) wechseln erst den Bereich und
springen dann zum Abschnitt. Jedes Element steht nur einmal auf der Seite; andere Bereiche verweisen darauf.
Kontakt und Partner-Laufband stehen einmal unter allen Bereichen.

**Angedockte Leiste:** Sobald die Cluster-Leiste beim Scrollen unter der Hauptnavigation verschwindet, klappt unter der
Hauptnavigation eine zweite Zeile in derselben Breite auf (Hauptnavigation bleibt sichtbar). Desktop: alle vier Bereiche
mit gleitender Markierung. Tablet und Handy (bis 1120 px): aktueller Bereich in der Mitte, Pfeile für vorherigen/nächsten
Bereich, Fortschrittsbalken und eine aufklappbare Liste aller Bereiche.

Technik: Der aktive Bereich steht in `<html data-mb="…">`. Ein kleines Skript im `<head>` setzt ihn schon beim Laden
aus der Adresse, die passenden CSS-Regeln stehen ebenfalls im `<head>` – so blitzt beim Aufruf von z. B.
`#mitarbeiterrabatte` nicht erst der erste Bereich auf. Die Logik steckt in `initMb()` in `main.js`.

**Warenkorb-Demo** (`#einloesen`): Nachbau der Checkout-Seite des Vorteilsportals mit Schritten, Warenkorb und der Box
„Select-Einkaufsgutschein oder Aktions-Code“ (Maße, Farben und Zahlungslogos aus dem Portal). Beim ersten Sichtkontakt
tippt die Demo den Gutscheincode ein; Produkte lassen sich entfernen und hinzufügen, der Gutscheinwert umstellen,
„Bezahlen“ schließt die Demo-Bestellung ab.

### Kundenbindung: eine Seite, drei Bereiche

`kundenbindung.html` funktioniert genauso wie die Mitarbeiterbindung (Cluster-Leiste, angedockte Leiste, eigene Adressen).

| Bereich | Adresse | Interaktive Elemente |
| --- | --- | --- |
| Loyalty-Portal | `#loyalty-portal` | Kennzahlen, Tabs „Vier gute Gründe“ mit Illustrationen und Screenshots, Leistungsversprechen (freigestellte Geräte, die dem Mauszeiger folgen, mit vier schwebenden Vorteils-Tags; mobil als Raster unter dem Bild) mit Umschalter „Für Unternehmen / Für Kunden“, Portal-Hotspots (`#portal`) mit Link „Ihr Portal in der Live-Demo selbst gestalten“ (Portal-Builder auf der Startseite, `index.html#live-vorschau`), Verweis auf den SELECT Einkaufsgutschein, Ablauf (`#ablauf`) |
| Kundenrabatte | `#kundenrabatte` | Kontaktkalender „Ohne / Mit Kundenrabatten“ (`#anlaesse`, schaltet beim ersten Sichtkontakt selbst um), Branchen-Explorer mit sieben Branchen, Texten und Beispielangeboten (`#branchen`), Verweise auf Portal, Ablauf und Gutscheine |
| Kundengutscheine | `#kundengutscheine` | Drei Einsatzmöglichkeiten mit Link zum passenden Gutscheinmotiv, Vorteile Unternehmen/Kunden, Gutschein-Gestalter mit Kunden-Anlässen (Treue, Willkommen, Gewinnspiel, Kulanz, Geburtstag; `#gestalten`), Warenkorb-Demo (`#einloesen`), Ablauf |

Der Kontaktkalender ist ein Beispiel (welche Anlässe in welchem Monat) und steht direkt im HTML.
Die Branchen-Angebote sind Beispiele aus dem Vorteilsportal; Konkurrenzangebote (z. B. Vodafone bei Telekommunikation,
Wechselpilot bei Energieversorgern) sind bewusst nicht als Beispiel gewählt.

### Markenplatzierung: eine Seite, zwei Bereiche

| Bereich | Adresse | Interaktive Elemente |
| --- | --- | --- |
| Anbieter werden | `#anbieter-werden` | Kennzahlen (1,3 Mio. Nutzer, 4.400 Arbeitgeber, 1.100 Portale), Tabs „Drei gute Gründe“, Live-Vorschau „So erscheint Ihre Marke“ (`#vorschau`: Markenname, Angebot und Kategorie eintippen – Ansicht als Startseiten-Kachel, Kategorie-Banner oder Newsletter), Vorteile, Ablauf, Verweis auf die Newsletter-Platzierung |
| Newsletter-Platzierung | `#newsletter-platzierung` | Newsletter-Kennzahlen (450.000+, 25 %, 12 %), vier Vorteils-Karten, Erfolgsfaktoren, Pakete Starter/Business/Extended mit Kampagnen-Zeitplan (`#pakete`: zeigt je Paket Laufzeit, Newsletter, Startseiten- und Banner-Wochen), Ablauf |

Die Vorschau ist eine reine Demo im Browser (keine Übertragung). Der Zeitplan verteilt die gebuchten Platzierungen gleichmäßig
und ist als „beispielhafte Verteilung“ gekennzeichnet.

### Content Creator

`content-creator.html` ist eine einzelne Seite (es gibt nur ein Angebot) und durchgehend in Du-Ansprache. Inhalte:
Kennzahlen, Tabs „Vier gute Gründe“, Vorteile, „Dein Shop, Dein Look“ mit Portal-Hotspots (Logo, Creator-Farben,
Kategorien passend zum Content – wechselnde Beispiel-Kategorien für Fitness, Reisen, Gaming, Beauty –, Hintergrundbild;
Link „Deinen Shop in der Live-Demo selbst gestalten“ zum Portal-Builder auf der Startseite),
Vergleich „Klassische Brand Deals / Dein Community-Shop“ (`#einnahmen`, schematisch, keine Umsatzprognose) und Ablauf.

**SELECT-Gutschein** (`.selv` in `main.css`): Nachbau der echten Gutscheine. PDF = Hochformat
mit Motiv, Tabelle (Wert, Code, Gültigkeit), Grußtext, QR-Code und Einlöse-Schritten; Print = Karte im DIN-lang-Format (210 × 99 mm, Seitenverhältnis fest); CSV = Tabelle.
Im Seitenkopf liegen PDF und Karte übereinander wie auf den Produktbildern. Die Motive sind gezeichnet (Verlauf, Icons) statt
fotografiert; Texte und Icons je Anlass stehen in `MOTIFS` in `main.js`. SELECT- und SBSCOM-Logo sind als SVG bzw. Schrift
nachgebaut – liegen die Originale als SVG vor, können sie direkt eingesetzt werden. Alle Maße hängen an der Gutscheinbreite
(Container-Einheiten `cqi`), der Gutschein sieht daher in jeder Größe gleich aus.

Die Angebote im Rabatt-Explorer sind eine Momentaufnahme (Stand Oktober 2026) und stehen direkt im HTML.
Die Geschenkanlässe verlinken nicht mehr auf die Anlass-Unterseiten von `www.incent.de` (weder Kacheln noch Text).

**Gemeinsame Bausteine:** In `index.html` sind Icon-Sprite, Navigation, Partner-Laufband, Kontakt und Footer mit
`<!-- layout:name -->` … `<!-- /layout:name -->` markiert. Nach einer Änderung an der Startseite
`node tools/sync-layout.mjs` ausführen: Das Skript kopiert die Blöcke in alle Unterseiten, lenkt Anker, die es nur
auf der Startseite gibt, auf `index.html#…` um und markiert im Menü die aktuelle Seite (`aria-current="page"`).

**Neue Seite anlegen** (z. B. Kundenbindung): `mitarbeiterbindung.html` kopieren (`kundenbindung.html`), Seitenkopf und
Bereiche ersetzen, die Markierungen für die Bausteine stehen lassen und `node tools/sync-layout.mjs` ausführen.
Im Mega-Menü von `index.html` die Links auf `kundenbindung.html#bereich` setzen; das Skript macht daraus auf der Seite
selbst reine Anker, sodass ein Klick nur den Bereich wechselt.

**Livegang – bisherige Adressen weiterleiten:** Bei Google sind die Seiten noch unter den alten Adressen bekannt.
Diese per 301 auf die neue Seite und den passenden Bereich umleiten. Für Apache (`.htaccess`):

```apache
Redirect 301 /corporate-benefits-fuer-arbeitgeber/ /mitarbeiterbindung.html#benefitportal
Redirect 301 /mitarbeiterrabatte/ /mitarbeiterbindung.html#mitarbeiterrabatte
Redirect 301 /mitarbeitergutscheine/ /mitarbeiterbindung.html#mitarbeitergutscheine
Redirect 301 /steuerfreie-mitarbeitergeschenke/ /mitarbeiterbindung.html#geschenkanlaesse

Redirect 301 /kundenbindungsprogramm-fuer-unternehmen/ /kundenbindung.html#loyalty-portal
Redirect 301 /kundenrabatte/ /kundenbindung.html#kundenrabatte
Redirect 301 /gutscheine-kundenbindung/ /kundenbindung.html#kundengutscheine

Redirect 301 /reichweite-steigern-markenpartner/ /markenplatzierung.html#anbieter-werden
Redirect 301 /b2c-e-mail-marketing/ /markenplatzierung.html#newsletter-platzierung
Redirect 301 /community-benefits/ /content-creator.html
```

Für nginx entsprechend `location = /mitarbeiterrabatte/ { return 301 /mitarbeiterbindung.html#mitarbeiterrabatte; }`.
Soll die Seite unter `/mitarbeiterbindung/` erreichbar sein (so steht es im `canonical`-Tag), liefert der Server dort
`mitarbeiterbindung.html` aus. (Die Regeln sind nicht auf einem echten Server getestet.)

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
- **Partner-Logos und Kachelbilder** einfach in den jeweiligen Ordner legen (Anleitung: `LIESMICH.md` im Ordner).
  Das Partner-Laufband besteht nur aus den Dateien in `assets/img/partner-logos/`: jede Datei eine Kachel,
  gelöschte Dateien verschwinden, im HTML steht keine Liste mehr.
  Die Seite liest die Liste aus `manifest.json`. Nach einem Push aktualisiert die GitHub Action
  `.github/workflows/image-manifests.yml` diese Datei automatisch; lokal `node tools/update-image-manifests.mjs` ausführen.
  Die Veröffentlichung (`.github/workflows/static.yml`) erzeugt die Listen vor dem Hochladen zusätzlich selbst, denn der
  Commit der Bildlisten-Action löst keine neue Veröffentlichung aus (Commits mit dem Standard-Token starten keine
  weiteren Workflows) – sonst wären neue Logos online erst nach dem nächsten Push sichtbar.
  Fehlt die Datei, nutzt die Seite die Verzeichnisliste des Servers (falls aktiviert).
- **Unterseiten**: Alle Lösungsseiten (Mitarbeiterbindung, Kundenbindung, Markenplatzierung, Content Creator) liegen in
  diesem Repository (siehe oben). FAQ, Karriere und Rechtliches verlinken noch auf `www.incent.de`.
  Die Spaltenköpfe im Mega-Menü („Mitarbeiterbindung“ usw.) verlinken auf die jeweilige Seite (erster Bereich).
  Auf der eigenen Seite lädt der Klick nicht neu, sondern wechselt weich zum ersten Bereich und scrollt nach oben.
  „Über uns“ und „Kontakt“ sind Abschnitte dieser Seite (`#ueber-uns`, `#kontakt`).
- **Kontaktformular**: Ohne Backend öffnet „Absenden“ das E-Mail-Programm mit einer vorbereiteten Nachricht an
  info@incent.de. Für den echten Versand am `<form data-contact-form>` das Attribut `data-endpoint="https://…"` setzen,
  dann wird das Formular per `fetch` (POST, FormData) an diese Adresse geschickt. Die Zusatzfelder je Zielgruppe
  (z. B. Unternehmensgröße für Arbeitgeber, Plattform/Profil-URL für Creator) sind nachgebaut, da sie in der
  gespeicherten Seite nicht enthalten waren – bitte mit dem bisherigen Formular abgleichen.
- **Marken-Profil** (Live-Demo auf der Startseite, Logo-Feld im Gutschein-Gestalter): Logo, Hintergrundbild,
  Unternehmensname und Farben werden nur im Browser gespeichert (`localStorage`, Schlüssel `incent-brand`) und nirgendwohin
  übertragen. Bilder werden vorher verkleinert (Logo max. 640 px als WebP, ohne leeren Rand; Hintergrund max. 1600 px als JPEG).
  Alle Vorschauen auf allen Seiten übernehmen das Profil – auch in anderen offenen Tabs sofort:
  Portal im Hero und „Ihr Portal, Ihr Design“ (Farben, Hintergrund, Logo, Adresszeile), Corporate-Design-Vorschau
  („Ihr Design“ als erster Punkt), Portal-Köpfe der Vorschauen, SELECT-Gutscheine (Logo statt „Ihr Logo“),
  „Individuell personalisierbar“, der Warenkorb unter „Einlösung im eigenen Shop“ und der Checkout „Wertgutscheine einlösen“.
  Hooks im HTML: `[data-brand-img]` (Logo-Bild), `[data-brand-slot]` / `.selv__logo` (Logo-Fläche), `[data-portal-name]`,
  `[data-portal-host]`, `[data-brand-drop="logo"|"bg"]` (Upload-Feld); CSS-Variablen `--brand-btn`, `--brand-btn-ink`,
  `--brand-nav`, `--brand-stage` am `<html>`. „Alles zurücksetzen“ (Live-Demo) löscht das Profil.

## Gegenüber der alten Seite geändert

- Durchgehend „Sie“-Ansprache (vorher teilweise „du“).
- Kleine Korrekturen, z. B. „über unser Vorteilsportal“, „ihr Vorteilsprogramm“, „2-in-1-Benefitportal“.
- Firmenname einheitlich „INCENT Corporate Services GmbH“.
- Unterseiten: Die Rückseiten der Wendekarten (Anlässe, Rabatt-Kategorien) fehlten in den gespeicherten Seiten und sind
  durch den Rabatt-Explorer und die Anlass-Kacheln ersetzt. Die Preistabelle rechnet mit den Einzelpreisen (9,90 € × 100 = 990 €, nicht 995 €),
  die Ersparnis ergibt sich daraus (7,7 % statt „rund 10 %“).
- Mitarbeiterbindung: Die vier bisherigen Seiten sind zu einer Seite zusammengefasst. Was sich bisher doppelte, steht nur noch
  einmal: der Abschnitt „Unser SELECT Einkaufsgutschein“, Gutschein-Konfigurator und Warenkorb-Demo stehen bei den
  Mitarbeitergutscheinen, die Portal-Vorschau nur noch einmal in „Drei gute Gründe“ (die frühere Hotspot-Ansicht
  darunter zeigte dasselbe Portal noch einmal), die Anlass-Kacheln bei den Geschenkanlässen
  (dort zusätzlich „Projektbezogene Prämien“), die Kennzahlen in der Benefitportal-Einleitung. Der Ablauf der
  Rabatte war identisch mit dem des Portals und ist durch einen Verweis ersetzt.
- Kundenbindung: Die drei bisherigen Seiten sind zu einer Seite zusammengefasst. Kennzahlen stehen nur im Loyalty-Portal,
  Portal-Hotspots nur im Loyalty-Portal, Gutschein-Gestalter und Warenkorb nur bei den Kundengutscheinen (im
  Loyalty-Portal steht ein Verweis). Der Ablauf der Kundenrabatte war von der Mitarbeitergutschein-Seite kopiert
  („Gutscheine an Ihre Mitarbeitenden“) und ist durch einen Verweis auf den Ablauf des Loyalty-Portals ersetzt.
  Abschlusstexte und Buttons, die auf Mitarbeitende bzw. „Zu allen Anlässen“ (Mitarbeitergeschenke) verwiesen, sind
  auf Kunden umgestellt. Der Kunden-Vorteil „Maximale Flexibilität“ heißt „Doppelter Vorteil“, weil der Titel schon
  bei den Unternehmens-Vorteilen vorkommt. Das Kleingedruckte des Kundengutscheins enthält keine Arbeitgeber-Bezüge.
  Im Seitenkopf steht „Keine Servicekosten“ statt „Kostenfrei“, weil die Unterlagen zur Kundenbindung keine Kostenfreiheit nennen.
- Markenplatzierung: Anbieter- und Newsletter-Seite sind eine Seite mit zwei Bereichen. Der Menüpunkt „Reichweite steigern“
  heißt jetzt „Newsletter-Platzierung“ (beide alten Seiten hießen sinngemäß „Reichweite steigern“). Die Netzwerk-Kennzahlen
  stehen nur bei „Anbieter werden“, die Newsletter-Kennzahlen nur bei der Newsletter-Platzierung; der Newsletter-Abschnitt und
  der Abschlusstext der Anbieter-Seite sind zu einem Verweis zusammengefasst. Seitenkopf ohne „Kostenfrei“, weil Marken Pakete
  buchen. Tippfehler korrigiert („Abgebotslistung“, „Potrale“, „Markenparter“).
- Google Fonts, Google Tag Manager und Cookie-Banner sind entfallen. Die Schriften liegen lokal.
  Falls Tracking wieder eingebaut wird, gehört auch der Link „Privatsphäre-Einstellungen“ zurück in den Footer.
