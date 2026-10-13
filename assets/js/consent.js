/* =========================================================================
   INCENT – Privatsphäre-Einstellungen (Einwilligung nach § 25 TDDDG und DSGVO)
   -------------------------------------------------------------------------
   Ohne Einwilligung speichert die Website nichts in Ihrem Browser außer dieser Auswahl selbst (technisch
   notwendig, § 25 Abs. 2 Nr. 2 TDDDG). Es gibt keine Cookies, keine Statistik- und keine Werbedienste.
   - Essenziell (immer aktiv): „incent-consent“ – die Auswahl selbst
   - Funktional (nur mit Einwilligung): „incent-audience“ (gewählte Zielgruppe) und „incent-brand“
     (Gestaltung aus der Live-Demo)
   Banner beim ersten Besuch mit „Alle akzeptieren“ und „Nur essenzielle“ (gleich gewichtet) sowie
   „Individuelle Privatsphäre-Einstellungen“ (Dialog mit Schalter und Details je Speicherung).
   Gespeichert wird {v, ts, functional}; nach 12 Monaten oder mit neuer VERSION wird erneut gefragt.
   Widerruf jederzeit über jedes Element mit [data-consent-open] (Footer „Privatsphäre-Einstellungen“):
   Gespeichertes wird sofort gelöscht.
   Schnittstelle für main.js: window.incentConsent.has("functional"), .open(); Ereignis „incent:consent“
   (detail.functional) auf document – auch wenn in einem anderen Tab entschieden wurde.
   Das Kopf-Skript in index.html prüft die Einwilligung vor dem Zeichnen selbst (gleiche Regeln: KEY, VERSION,
   MAX_AGE) – bei Änderungen dort mitändern.
   ========================================================================= */
(() => {
  "use strict";

  const KEY = "incent-consent";
  const VERSION = 1;
  const MAX_AGE = 365 * 864e5; // 12 Monate
  const FUNCTIONAL = ["incent-audience", "incent-brand"];

  const valid = (r) => !!r && r.v === VERSION && typeof r.ts === "number" && Math.abs(Date.now() - r.ts) < MAX_AGE;
  const read = () => {
    try {
      const r = JSON.parse(localStorage.getItem(KEY));
      return valid(r) ? r : null;
    } catch (err) {
      return null;
    }
  };
  const drop = (keys) =>
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (err) {
        /* Speicher gesperrt – dann steht dort ohnehin nichts */
      }
    });

  let rec = read();
  // ohne gültige Einwilligung: nichts Funktionales liegen lassen (z. B. abgelaufen oder aus älteren Fassungen)
  if (!rec) drop([KEY]);
  if (!(rec && rec.functional)) drop(FUNCTIONAL);

  const has = (cat) => cat === "essential" || (!!rec && !!rec[cat]);
  const fire = () => {
    document.querySelectorAll("[data-consent-hint]").forEach((el) => (el.hidden = has("functional")));
    document.dispatchEvent(new CustomEvent("incent:consent", { detail: { functional: has("functional") } }));
  };
  const save = (functional) => {
    rec = { v: VERSION, ts: Date.now(), functional: !!functional };
    try {
      localStorage.setItem(KEY, JSON.stringify(rec));
    } catch (err) {
      /* nicht speicherbar (z. B. privates Fenster) – gilt dann für diesen Besuch */
    }
    if (!rec.functional) drop(FUNCTIONAL);
    hideBanner();
    fire();
  };

  /* ---------- Bausteine ---------- */
  const LEGAL = '<a href="datenschutz.html">Datenschutzerklärung</a> · <a href="impressum.html">Impressum</a>';
  const SHIELD =
    '<svg class="cmp__ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const details = (rows) =>
    rows
      .map(
        (r) => `<dl class="cmp-store">
          <div><dt>Name</dt><dd><code>${r.name}</code></dd></div>
          <div><dt>Zweck</dt><dd>${r.purpose}</dd></div>
          <div><dt>Art</dt><dd>Local Storage (Speicher Ihres Browsers), kein Cookie</dd></div>
          <div><dt>Speicherdauer</dt><dd>${r.age}</dd></div>
          <div><dt>Empfänger</dt><dd>Keine – die Angaben bleiben in Ihrem Browser und werden nicht an uns oder Dritte übertragen</dd></div>
          <div><dt>Rechtsgrundlage</dt><dd>${r.law}</dd></div>
        </dl>`
      )
      .join("");

  /* ---------- Banner (erster Besuch) ---------- */
  let banner = null;
  const hideBanner = () => {
    if (!banner) return;
    const b = banner;
    banner = null;
    b.classList.remove("is-in");
    setTimeout(() => b.remove(), 260);
  };
  const showBanner = () => {
    if (banner) return;
    banner = el(`<section class="cmp" aria-labelledby="cmp-title" data-nosnippet>
      <div class="cmp__box">
        <div class="cmp__text">
          <h2 class="cmp__title" id="cmp-title">${SHIELD}Ihre Privatsphäre</h2>
          <p>Wir setzen <strong>keine Tracking- oder Werbe-Cookies</strong> ein. Mit Ihrer Einwilligung merkt sich die Website in
          Ihrem Browser Ihre gewählte Zielgruppe und Ihr Live-Demo-Design – sonst gilt beides nur für diesen Besuch. Freiwillig und
          jederzeit widerrufbar unter „Privatsphäre-Einstellungen“ ganz unten auf jeder Seite.</p>
          <p class="cmp__links">${LEGAL}</p>
        </div>
        <div class="cmp__btns">
          <button type="button" class="btn btn--primary cmp__btn" data-cmp="all">Alle akzeptieren</button>
          <button type="button" class="btn btn--primary cmp__btn" data-cmp="none">Nur essenzielle</button>
          <button type="button" class="cmp__more" data-cmp="settings">Individuelle Privatsphäre-Einstellungen</button>
        </div>
      </div>
    </section>`);
    banner.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cmp]");
      if (!b) return;
      if (b.dataset.cmp === "settings") open();
      else save(b.dataset.cmp === "all");
    });
    // früh in der Tab-Reihenfolge (nach „Zum Inhalt springen“), ohne den Fokus zu verschieben
    const skip = document.querySelector(".skip-link");
    if (skip) skip.after(banner);
    else document.body.prepend(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner && banner.classList.add("is-in")));
  };

  /* ---------- Dialog „Individuelle Privatsphäre-Einstellungen“ ---------- */
  let dlg = null;
  const build = () => {
    dlg = el(`<dialog class="cmp-dlg" aria-labelledby="cmp-dlg-title" data-nosnippet>
      <div class="cmp-dlg__box">
        <div class="cmp-dlg__head">
          <h2 class="cmp-dlg__title" id="cmp-dlg-title">${SHIELD}Individuelle Privatsphäre-Einstellungen</h2>
          <button type="button" class="cmp-dlg__x" data-cmp="close" aria-label="Schließen, ohne zu ändern">${CLOSE}</button>
        </div>
        <p>Hier entscheiden Sie, was diese Website in Ihrem Browser speichern darf. Gespeichert wird nur lokal auf Ihrem
        Gerät – nichts davon wird an uns oder Dritte übertragen. Ihre Einwilligung ist freiwillig; ohne sie können Sie die
        Website vollständig nutzen. Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO).</p>

        <div class="cmp-cat">
          <div class="cmp-cat__head">
            <h3>Essenziell</h3>
            <span class="cmp-cat__state">Immer aktiv</span>
          </div>
          <p>Speichert Ihre Auswahl in diesen Einstellungen, damit wir Sie nicht bei jedem Seitenaufruf erneut fragen.</p>
          <details class="cmp-cat__more"><summary>Details anzeigen</summary>${details([
            {
              name: "incent-consent",
              purpose: "Speichert Ihre Entscheidung in diesen Privatsphäre-Einstellungen (ja/nein je Kategorie, Zeitpunkt)",
              age: "12 Monate, danach fragen wir erneut",
              law: "§ 25 Abs. 2 Nr. 2 TDDDG (technisch notwendig, damit Ihre Entscheidung beachtet wird)",
            },
          ])}</details>
        </div>

        <div class="cmp-cat">
          <div class="cmp-cat__head">
            <h3><label for="cmp-functional">Funktional</label></h3>
            <input class="cmp-switch" type="checkbox" role="switch" id="cmp-functional" aria-describedby="cmp-functional-desc">
          </div>
          <p id="cmp-functional-desc">Merkt sich Ihre gewählte Zielgruppe (Arbeitgeber, Unternehmen, Marken oder Creator) und Ihre Gestaltung
          aus der Live-Demo (Farben, Name, Logo, Hintergrundbild). So öffnet sich die Seite beim nächsten Besuch gleich passend.</p>
          <details class="cmp-cat__more"><summary>Details anzeigen</summary>${details([
            {
              name: "incent-audience",
              purpose: "Merkt sich die gewählte Zielgruppe, damit die Seite beim nächsten Besuch in Ihrer Ansicht startet",
              age: "Bis Sie „Übersicht“ wählen, die Einwilligung widerrufen oder die Daten Ihres Browsers löschen",
              law: "Ihre Einwilligung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO)",
            },
            {
              name: "incent-brand",
              purpose: "Merkt sich Ihre Gestaltung aus der Live-Demo (Farben, Name, Logo, Hintergrundbild); Bilder werden im Browser verkleinert und nicht hochgeladen",
              age: "Bis Sie „Alles zurücksetzen“ wählen, die Einwilligung widerrufen oder die Daten Ihres Browsers löschen",
              law: "Ihre Einwilligung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO)",
            },
          ])}</details>
        </div>

        <div class="cmp-cat cmp-cat--none">
          <div class="cmp-cat__head">
            <h3>Statistik &amp; Marketing</h3>
            <span class="cmp-cat__state">Nicht im Einsatz</span>
          </div>
          <p>Wir setzen keine Analyse-, Tracking- oder Werbedienste ein und laden keine Inhalte von Drittanbietern nach.</p>
        </div>

        <div class="cmp-dlg__btns">
          <button type="button" class="btn btn--primary cmp__btn" data-cmp="all">Alle akzeptieren</button>
          <button type="button" class="btn btn--ghost cmp__btn" data-cmp="save">Auswahl speichern</button>
          <button type="button" class="btn btn--primary cmp__btn" data-cmp="none">Nur essenzielle</button>
        </div>
        <p class="cmp__links">${LEGAL}</p>
      </div>
    </dialog>`);
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) return dlg.close(); // Klick neben das Fenster
      const b = e.target.closest("[data-cmp]");
      if (!b) return;
      const act = b.dataset.cmp;
      if (act !== "close") save(act === "all" ? true : act === "none" ? false : $sw().checked);
      dlg.close();
    });
    dlg.addEventListener("close", () => {
      document.documentElement.classList.remove("cmp-open");
      if (opener && opener.isConnected) opener.focus();
      opener = null;
    });
    document.body.append(dlg);
  };
  const $sw = () => dlg.querySelector("#cmp-functional");
  let opener = null;
  const open = () => {
    if (!dlg) build();
    if (dlg.open) return;
    opener = document.activeElement;
    $sw().checked = has("functional");
    dlg.querySelectorAll("details").forEach((d) => (d.open = false));
    document.documentElement.classList.add("cmp-open");
    dlg.showModal();
    dlg.querySelector(".cmp-dlg__x").focus();
  };

  window.incentConsent = { has, open, decided: () => !!rec };

  // „Privatsphäre-Einstellungen“ (Footer und Hinweise) öffnen den Dialog
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-consent-open]");
    if (!t) return;
    e.preventDefault();
    open();
  });
  // in einem anderen Tab entschieden: übernehmen
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    rec = read();
    if (rec) hideBanner();
    fire();
  });

  const start = () => {
    document.querySelectorAll("[data-consent-hint]").forEach((h) => (h.hidden = has("functional")));
    if (!rec) showBanner();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
