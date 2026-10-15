/* =========================================================================
   INCENT – Kontaktformular (nur kontakt.html)
   -------------------------------------------------------------------------
   Schritt 1 („Ich bin …“) steht klein auf jeder Seite (index.html, #kontakt) und schickt hierher:
   kontakt.html?ich=Arbeitgeber (auch ohne Skript) – oder ?fuer=arbeitgeber (Kampagnen-Links). Die Auswahl wird
   vorbelegt, die passenden Zusatzfelder erscheinen. &thema=<Bereich> (das kleine Formular hängt den Bereich an, aus dem
   es kommt, z. B. mitarbeiterrabatte) hakt unter „Worum geht es?“ das passende Thema an (data-topic).
   Schritt für Schritt: Abschnitte haben eine Stufe (data-kp-stage). Offen ist zuerst nur „Ich bin …“; die Auswahl öffnet
   den nächsten Abschnitt, danach prüft jeweils „Weiter“ (data-kp-next) den Abschnitt und öffnet den nächsten. Offene
   Abschnitte bleiben bearbeitbar. Oben steht „Schritt 2 von 5 · Worum geht es?“ mit Balken. Ohne Skript ist alles offen.
   Ausgefüllte Felder werden schon beim Verlassen geprüft (leere Pflichtfelder erst bei „Weiter“ bzw. beim Absenden).
   Absenden: ohne data-endpoint öffnet sich das E-Mail-Programm mit der fertigen Anfrage an info@incent.de; mit
   data-endpoint="https://…" am <form> geht sie per fetch (POST, FormData) an diese Adresse.
   „Mein Design mitschicken“ (nur wenn in der Live-Demo gestaltet): siehe designShare.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Klasse neu setzen, damit ihre Animation noch einmal läuft (ohne erzwungenes Layout)
  const restartClass = (el, cls) => {
    el.classList.remove(cls);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add(cls)));
  };
  const FUER = { arbeitgeber: "Arbeitgeber", unternehmen: "Unternehmen", marken: "Markenpartner", creator: "Creator" };
  // Platzhalter der Nachricht passend zur Auswahl
  const HINTS = {
    none: "Was Sie uns noch mitteilen möchten …",
    Arbeitgeber: "z. B. Anzahl der Standorte, gewünschter Start oder Fragen zu steuerfreien Sachbezügen …",
    Unternehmen: "z. B. Ihre Zielgruppe, bestehende Kundenprogramme oder Fragen zu Kundengutscheinen …",
    Markenpartner: "z. B. Ihre Marke, Ihr Angebot und welche Zielgruppe Sie erreichen möchten …",
    Creator: "z. B. Ihre Community, Ihre Themen und was Sie Ihren Followern anbieten möchten …",
  };

  /* ---------- „Mein Design mitschicken“ ----------
     Wer in der Live-Demo gestaltet hat (Marken-Profil „incent-brand“ aus main.js – gespeichert nur mit Einwilligung
     „Funktional“, ohne sie gilt die Gestaltung nur bis zum Seitenwechsel), sieht unter der Nachricht eine Karte mit Häkchen
     und Mini-Portal in den eigenen Farben. Angehakt gehen Name, Farben und Hintergrund als Text mit. Logo und eigenes
     Hintergrundbild: mit data-endpoint als Dateien, sonst (E-Mail-Programm – eine vorbereitete E-Mail kann keine Anhänge
     haben) speichert der Browser beim Absenden ein Bild „portal-design-….png“ mit Logo, Farben und Hintergrund, das man
     der E-Mail anhängt. */
  const BRAND_KEY = "incent-brand";
  const BRAND_DEFAULTS = { btn: "#1c87b8", nav: "#ffffff", bg: "image", solid: "#e8f3f9", g1: "#1c87b8", g2: "#0a2540", name: "", logo: "", bgImg: "" };
  const DEFAULT_BG = "assets/img/portal/bg-highlights.webp";
  const HEX = /^#[0-9a-f]{6}$/i;
  const DATA_IMG = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
  const readDesign = () => {
    if (!(window.incentConsent && window.incentConsent.has("functional"))) return null;
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(BRAND_KEY) || "null");
    } catch (err) {
      return null;
    }
    if (!raw || typeof raw !== "object") return null;
    const d = { ...BRAND_DEFAULTS };
    ["btn", "nav", "solid", "g1", "g2"].forEach((k) => HEX.test(raw[k]) && (d[k] = raw[k].toLowerCase()));
    if (["image", "solid", "gradient"].includes(raw.bg)) d.bg = raw.bg;
    if (typeof raw.name === "string") d.name = raw.name.trim().slice(0, 40);
    ["logo", "bgImg"].forEach((k) => typeof raw[k] === "string" && DATA_IMG.test(raw[k]) && (d[k] = raw[k]));
    if (d.bg !== "image") d.bgImg = ""; // ein gespeichertes, aber nicht gewähltes Bild gehört nicht zum Design
    return Object.keys(BRAND_DEFAULTS).some((k) => d[k] !== BRAND_DEFAULTS[k]) ? d : null;
  };
  const bgText = (d) => (d.bg === "solid" ? `einfarbig ${d.solid}` : d.bg === "gradient" ? `Verlauf ${d.g1} → ${d.g2}` : d.bgImg ? "eigenes Bild" : "Standardbild");
  const inkOn = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const l = 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
    return 1.05 / (l + 0.05) >= 3 ? "#ffffff" : "#111111";
  };
  const slug = (s) =>
    String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const loadImg = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  const dataUrlBlob = (url) => {
    const [head, b64] = url.split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: head.slice(5, head.indexOf(";")) });
  };
  const extOf = (url) => ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" })[url.slice(5, url.indexOf(";"))] || "png";

  // Bild mit allem auf einen Blick: Mini-Portal (Navigation mit Logo, Hintergrund, Button) und die Werte daneben
  async function designSheet(d) {
    const W = 1200;
    const H = 720;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    const font = (w, s) => `${w} ${s}px "Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif`;
    const box = (x, y, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };
    // cover: Fläche füllen (oben bündig); sonst einpassen, left: links bündig statt mittig
    const fit = (img, x, y, w, h, cover, left) => {
      const k = (cover ? Math.max : Math.min)(w / img.naturalWidth, h / img.naturalHeight);
      const iw = img.naturalWidth * k;
      const ih = img.naturalHeight * k;
      ctx.drawImage(img, left ? x : x + (w - iw) / 2, cover ? y : y + (h - ih) / 2, iw, ih);
    };
    const paintBg = async (x, y, w, h) => {
      if (d.bg === "solid") ctx.fillStyle = d.solid;
      else if (d.bg === "gradient") {
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, d.g1);
        g.addColorStop(1, d.g2);
        ctx.fillStyle = g;
      } else ctx.fillStyle = "#e8f3f9";
      ctx.fillRect(x, y, w, h);
      if (d.bg === "image") {
        const img = await loadImg(d.bgImg || DEFAULT_BG);
        if (img) fit(img, x, y, w, h, true);
      }
    };
    const [logo] = await Promise.all([d.logo ? loadImg(d.logo) : null, document.fonts && document.fonts.ready]);

    ctx.fillStyle = "#f4f7fd";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0b1533";
    ctx.font = font(700, 46);
    ctx.fillText("Portal-Design aus der Live-Demo", 60, 96);
    ctx.fillStyle = "#56627e";
    ctx.font = font(500, 24);
    ctx.fillText(`${d.name || "Ohne Namen"} · gestaltet auf incent.de · ${new Date().toLocaleDateString("de-DE")}`, 60, 136);

    // Mini-Portal
    const px = 60, py = 184, pw = 620, ph = 456;
    ctx.save();
    ctx.shadowColor = "rgba(0, 30, 90, .18)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    box(px, py, pw, ph, 26);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
    ctx.save();
    box(px, py, pw, ph, 26);
    ctx.clip();
    await paintBg(px, py + 78, pw, ph - 78);
    ctx.fillStyle = d.nav;
    ctx.fillRect(px, py, pw, 78);
    ctx.fillStyle = "rgba(0, 0, 0, .06)";
    ctx.fillRect(px, py + 78, pw, 1);
    if (logo) fit(logo, px + 28, py + 17, 230, 44, false, true);
    else {
      ctx.fillStyle = inkOn(d.nav);
      ctx.font = font(700, 30);
      ctx.fillText(d.name || "Ihr Logo", px + 28, py + 50);
    }
    box(px + 40, py + ph - 112, 270, 62, 31);
    ctx.fillStyle = d.btn;
    ctx.fill();
    ctx.fillStyle = inkOn(d.btn);
    ctx.font = font(700, 26);
    ctx.fillText("Vorteile entdecken", px + 70, py + ph - 72);
    ctx.restore();

    // Werte
    const vx = 730;
    let vy = 184;
    const label = (t) => {
      ctx.fillStyle = "#56627e";
      ctx.font = font(600, 20);
      ctx.fillText(t.toUpperCase(), vx, vy + 18);
    };
    label("Logo");
    box(vx, vy + 32, 410, 120, 18);
    ctx.fillStyle = "#fff";
    ctx.fill();
    if (logo) fit(logo, vx + 24, vy + 52, 362, 80, false);
    else {
      ctx.fillStyle = "#8a94ad";
      ctx.font = font(500, 24);
      ctx.fillText("kein eigenes Logo", vx + 24, vy + 100);
    }
    vy += 186;
    const swatch = async (name, value, paint) => {
      label(name);
      box(vx, vy + 32, 64, 64, 16);
      ctx.save();
      ctx.clip();
      await paint(vx, vy + 32, 64, 64);
      ctx.restore();
      ctx.strokeStyle = "rgba(0, 30, 90, .14)";
      ctx.lineWidth = 2;
      box(vx, vy + 32, 64, 64, 16);
      ctx.stroke();
      ctx.fillStyle = "#0b1533";
      ctx.font = font(600, 28);
      ctx.fillText(value, vx + 84, vy + 74);
      vy += 104;
    };
    const solid = (hex) => (x, y, w, h) => {
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, w, h);
    };
    await swatch("Buttonfarbe", d.btn, solid(d.btn));
    await swatch("Navigationsfarbe", d.nav, solid(d.nav));
    await swatch("Hintergrund", bgText(d), paintBg);
    return new Promise((resolve) => c.toBlob(resolve, "image/png"));
  }

  function designShare(form) {
    const root = $("[data-design-share]", form);
    const box = root && $("[data-design-toggle]", root);
    const note = root && $("[data-design-note]", root);
    let d = null;
    let sheet = null; // Promise<Blob> – vorab erzeugt, sobald angehakt (Absenden bleibt synchron genug für mailto)
    const fileName = () => `portal-design-${slug(d && d.name) || "incent"}.png`;
    const withImages = () => !!(d && (d.logo || d.bgImg));
    const sync = () => {
      if (!root) return;
      if (note) {
        note.hidden = !box.checked;
        note.textContent = form.dataset.endpoint
          ? "Logo, Farben und Hintergrund werden mit Ihrer Anfrage übertragen."
          : withImages()
            ? `Beim Absenden speichert Ihr Browser Ihr Design als Bild „${fileName()}“ – bitte hängen Sie es in Ihrem E-Mail-Programm an. Name, Farben und Hintergrund stehen zusätzlich im Text.`
            : "Name, Farben und Hintergrund stehen in Ihrer E-Mail.";
      }
      if (box.checked && withImages() && !sheet) sheet = designSheet(d).catch(() => null);
    };
    const refresh = () => {
      if (!root) return;
      d = readDesign();
      sheet = null;
      root.hidden = !d;
      if (!d) {
        box.checked = false;
        return sync();
      }
      const peek = $("[data-design-peek]", root);
      peek.style.setProperty("--d-nav", d.nav);
      peek.style.setProperty("--d-btn", d.btn);
      peek.style.setProperty(
        "--d-stage",
        d.bg === "solid" ? d.solid : d.bg === "gradient" ? `linear-gradient(150deg, ${d.g1}, ${d.g2})` : `url("${d.bgImg || DEFAULT_BG}") center / cover no-repeat`
      );
      const nav = $(".kp-design__nav", peek);
      nav.replaceChildren();
      if (d.logo) {
        const img = new Image();
        img.alt = "";
        img.src = d.logo;
        nav.append(img);
      }
      $("[data-design-sum]", root).textContent = [d.logo ? "eigenes Logo" : "", d.name ? `„${d.name}“` : "", `Button ${d.btn}`, bgText(d)].filter(Boolean).join(" · ");
      sync();
    };
    if (box) box.addEventListener("change", sync);
    document.addEventListener("incent:consent", refresh);
    refresh();

    return {
      sync,
      on: () => !!(d && box.checked),
      // Text für die E-Mail; file: Name des gespeicherten Bilds (nur ohne Endpunkt)
      lines: (file) => [
        "Mein Design (Live-Demo):",
        `– Name im Portal: ${d.name || "–"}`,
        `– Logo: ${d.logo ? (file ? `eigenes Logo (im Bild „${file}“)` : "eigenes Logo (Datei anbei)") : "kein eigenes Logo"}`,
        `– Buttonfarbe: ${d.btn}`,
        `– Navigationsfarbe: ${d.nav}`,
        `– Hintergrund: ${bgText(d)}`,
      ],
      // mit Endpunkt: Werte als Felder, Logo, Hintergrundbild und Übersichtsbild als Dateien
      async append(data) {
        data.append("design_name", d.name);
        data.append("design_buttonfarbe", d.btn);
        data.append("design_navigationsfarbe", d.nav);
        data.append("design_hintergrund", bgText(d));
        if (d.logo) data.append("design_logo", dataUrlBlob(d.logo), `logo.${extOf(d.logo)}`);
        if (d.bgImg) data.append("design_hintergrundbild", dataUrlBlob(d.bgImg), `hintergrund.${extOf(d.bgImg)}`);
        const blob = await (sheet || designSheet(d)).catch(() => null);
        if (blob) data.append("design_vorschau", blob, fileName());
      },
      // ohne Endpunkt: Übersichtsbild speichern (nur wenn es Bilder gibt); liefert den Dateinamen
      async download() {
        if (!withImages()) return "";
        const blob = await (sheet || (sheet = designSheet(d))).catch(() => null);
        if (!blob) return "";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName();
        a.hidden = true;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return a.download;
      },
    };
  }

  function initContactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;
    const share = designShare(form);
    const conditional = $$("[data-show-for]", form);
    const typeError = $('[data-error-for="sender_type"]', form);
    const formError = $("[data-form-error]", form);
    const success = $("[data-form-success]", form);
    const successText = $("[data-form-success-text]", form);
    const submitBtn = $(".form__submit", form);
    const phone = form.elements.phone;
    const message = form.elements.message;
    const senderType = () => (form.querySelector('input[name="sender_type"]:checked') || {}).value || "none";

    // Schritt für Schritt (Stufen 1 … n; ein Abschnitt zählt nur, wenn er zur Auswahl passt)
    const stages = $$("[data-kp-stage]", form);
    const stageOf = (el) => Number(el.dataset.kpStage);
    const lastStage = Math.max(0, ...stages.map(stageOf));
    const fits = (el) => !el.dataset.showFor || el.dataset.showFor.split(" ").includes(senderType());
    const at = (n) => stages.filter((el) => stageOf(el) === n && fits(el));
    const nextAfter = (n) => {
      for (let k = n + 1; k <= lastStage; k++) if (at(k).length) return k;
      return n;
    };
    const finalStage = () => {
      for (let k = lastStage; k > 1; k--) if (at(k).length) return k;
      return 1;
    };
    let open = 1;
    const nowOut = $("[data-kp-now]", form);
    const titleOut = $("[data-kp-title]", form);
    const bar = $("[data-kp-bar]", form);
    const progress = () => {
      if (!stages.length) return;
      const type = senderType();
      const list = [];
      for (let k = 1; k <= lastStage; k++) if (at(k).length) list.push(k);
      const idx = list.indexOf(open) + 1;
      const ready = open === list[list.length - 1] && $$("input[required]:not([type=radio]), select[required]", form).every((el) => el.disabled || el.checkValidity());
      nowOut.textContent = type === "none" ? "Schritt 1" : `Schritt ${idx} von ${list.length}`;
      titleOut.textContent = (at(open).find((el) => el.dataset.kpName) || {}).dataset?.kpName || "";
      bar.style.transform = `scaleX(${type === "none" ? 0 : ready ? 1 : ((idx - 1) / list.length).toFixed(3)})`;
    };
    const applyStages = () => {
      // passt der offene Abschnitt nicht mehr zur Auswahl (z. B. Creator hat keine Themen), weiter zum nächsten passenden
      if (open > 1 && !at(open).length) open = nextAfter(open);
      stages.forEach((el) => {
        el.classList.toggle("is-open", stageOf(el) <= open);
        el.classList.toggle("is-done", stageOf(el) < open);
      });
      progress();
    };
    // nächsten Abschnitt öffnen; optional ins Bild holen und das erste Feld fokussieren
    const reveal = (n, { scroll = false, focus = false } = {}) => {
      if (n <= open) return;
      const before = open;
      open = n;
      applyStages();
      const fresh = stages.filter((el) => stageOf(el) > before && stageOf(el) <= open && fits(el));
      if (!reducedMotion) fresh.forEach((el) => restartClass(el, "is-entering"));
      const first = fresh[0];
      if (!first) return;
      // der neue Abschnitt rückt nach oben (unter die Kopfleiste, scroll-margin-top), die erledigten wandern hinaus
      if (scroll) first.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
      // zuerst ein Textfeld (Vorname statt Anrede), sonst das erste Bedienelement (z. B. ein Thema)
      const field =
        focus &&
        ($("input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not(:disabled), textarea", first) ||
          $("input:not([type=hidden]):not(:disabled), select:not(:disabled)", first));
      if (field) field.focus({ preventScroll: scroll });
    };
    // Auswahl per Zeiger: den neuen Abschnitt sanft ins Bild holen (per Tastatur nicht – Pfeiltasten wechseln die Auswahl)
    let pointerPick = false;
    form.addEventListener("pointerdown", (e) => (pointerPick = !!e.target.closest(".choice__item")));
    form.addEventListener("keydown", () => (pointerPick = false));

    const updateFields = (animate) => {
      const type = senderType();
      conditional.forEach((field) => {
        const show = field.dataset.showFor.split(" ").includes(type);
        const wasHidden = field.hidden;
        field.hidden = !show;
        $$("input, select, textarea", field).forEach((el) => (el.disabled = !show));
        if (show && wasHidden && animate && !reducedMotion) {
          restartClass(field, "is-entering");
        }
      });
      if (message) message.placeholder = HINTS[type] || HINTS.none;
      applyStages();
    };

    const messageFor = (el) => {
      if (el.validity.valueMissing) return el.tagName === "SELECT" ? "Bitte wählen Sie eine Option." : "Bitte füllen Sie dieses Feld aus.";
      if (el.validity.typeMismatch) return el.type === "email" ? "Bitte geben Sie eine gültige E-Mail-Adresse ein." : "Bitte geben Sie eine vollständige Adresse ein (mit https://).";
      if (el.validity.customError) return el.validationMessage;
      return "Bitte prüfen Sie Ihre Eingabe.";
    };
    const setError = (el, text) => {
      const field = el.closest(".form__field");
      const out = field && $(".form__error", field);
      if (!field || !out) return;
      field.classList.toggle("is-invalid", Boolean(text));
      out.textContent = text;
      out.id = out.id || `${el.id}-error`;
      if (text) {
        el.setAttribute("aria-invalid", "true");
        el.setAttribute("aria-describedby", out.id);
      } else {
        el.removeAttribute("aria-invalid");
      }
    };
    // Felder in den Abschnitten prüfen, Fehler zeigen; liefert das erste ungültige Feld
    const validate = (sections) => {
      let first = null;
      sections.forEach((sec) =>
        $$("input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea", sec).forEach((el) => {
          if (el.disabled) return;
          if (el === phone) checkPhone();
          if (el.checkValidity()) {
            setError(el, "");
          } else {
            setError(el, messageFor(el));
            first = first || el;
          }
        })
      );
      return first;
    };
    const checkPhone = () =>
      phone.setCustomValidity(phone.value && !/^[0-9 ()+\/.-]{5,}$/.test(phone.value) ? "Bitte nur Ziffern und Telefonzeichen verwenden." : "");

    form.addEventListener("change", (e) => {
      if (e.target.name !== "sender_type") return;
      typeError.textContent = "";
      updateFields(true);
      reveal(nextAfter(1), { scroll: pointerPick });
    });
    // „Weiter“: Abschnitt prüfen, dann den nächsten öffnen
    const advance = (n) => {
      const bad = validate(at(n));
      if (bad) return bad.focus();
      reveal(nextAfter(n), { scroll: true, focus: true });
    };
    form.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-kp-next]");
      if (btn) advance(stageOf(btn.closest("[data-kp-stage]")));
    });
    form.addEventListener("input", (e) => {
      if (e.target === phone) checkPhone();
      if (e.target.closest(".is-invalid") && e.target.checkValidity()) setError(e.target, "");
      progress();
    });
    // beim Verlassen prüfen – aber nur, was schon ausgefüllt ist (leere Pflichtfelder meldet erst das Absenden)
    form.addEventListener("focusout", (e) => {
      const el = e.target;
      if (!el.matches("input:not([type=radio]):not([type=checkbox]), select, textarea") || el.disabled || !el.value.trim()) return;
      if (el === phone) checkPhone();
      setError(el, el.checkValidity() ? "" : messageFor(el));
    });

    const showSuccess = (text) => {
      successText.textContent = text;
      success.hidden = false;
      $("[data-form-reset]", form).focus();
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      formError.textContent = "";
      // Enter in einem Feld, bevor der letzte Abschnitt offen ist: wirkt wie „Weiter“
      if (stages.length && open < finalStage()) {
        if (senderType() === "none") typeError.textContent = "Bitte wählen Sie aus, wer Sie sind.";
        else advance(open);
        return;
      }
      checkPhone();
      let first = null;
      if (senderType() === "none") {
        typeError.textContent = "Bitte wählen Sie aus, wer Sie sind.";
        first = form.querySelector('input[name="sender_type"]');
      }
      first = first || validate([form]);
      if (first) {
        first.focus();
        return;
      }

      const data = new FormData(form);
      data.delete("design"); // das Häkchen selbst – mit geht das Design (share)
      const sharing = share.on();
      if (form.dataset.endpoint) {
        submitBtn.disabled = true;
        try {
          if (sharing) await share.append(data);
          const res = await fetch(form.dataset.endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(String(res.status));
          showSuccess("Wir haben Ihre Nachricht erhalten und melden uns bei Ihnen.");
        } catch (err) {
          formError.textContent = "Das hat leider nicht geklappt. Bitte schreiben Sie uns an info@incent.de.";
        } finally {
          submitBtn.disabled = false;
        }
        return;
      }

      // Ohne Formular-Backend: Anfrage als vorbereitete E-Mail öffnen
      const labels = {
        sender_type: "Ich bin", salutation: "Anrede", firstname: "Vorname", lastname: "Nachname", email: "E-Mail",
        phone: "Telefon", company_name: "Unternehmen", position: "Position", company_size: "Unternehmensgröße",
        company_url: "Website", platform: "Plattform", profile_url: "Profil-URL", agentur: "Agentur",
        street: "Anschrift", postal_code: "PLZ", message: "Nachricht", interest: "Interesse an",
      };
      const lines = [];
      new Set(data.keys()).forEach((key) => {
        const value = data.getAll(key).map((v) => String(v).trim()).filter(Boolean).join(", ");
        if (value) lines.push(`${labels[key] || key}: ${value}`);
      });
      // Design: Übersichtsbild zuerst speichern (eine vorbereitete E-Mail kann keine Anhänge haben), Werte in den Text
      const file = sharing ? await share.download() : "";
      if (sharing) lines.push("", ...share.lines(file));
      const subject = `Kontaktanfrage über incent.de – ${data.get("firstname")} ${data.get("lastname")}`;
      window.location.href = `mailto:info@incent.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      showSuccess(
        "Ihr E-Mail-Programm öffnet sich mit Ihrer Anfrage – bitte dort noch absenden." +
          (file ? ` Ihr Design haben wir als Bild „${file}“ gespeichert – bitte hängen Sie es der E-Mail an.` : "") +
          " Alternativ erreichen Sie uns unter info@incent.de oder 08341 93450."
      );
    });

    $("[data-form-reset]", form).addEventListener("click", () => {
      form.reset();
      success.hidden = true;
      formError.textContent = "";
      typeError.textContent = "";
      $$(".form__field", form).forEach((field) => field.classList.remove("is-invalid"));
      $$(".form__error", form).forEach((out) => (out.textContent = ""));
      open = 1;
      updateFields(false);
      share.sync();
      form.querySelector('input[name="sender_type"]').focus();
    });

    updateFields(false);
  }

  // Auswahl aus Schritt 1 übernehmen (?ich=Arbeitgeber bzw. ?fuer=arbeitgeber), Thema aus dem Bereich (&thema=…)
  function preselect() {
    const form = $("[data-contact-form]");
    if (!form) return;
    const q = new URLSearchParams(location.search);
    const value = q.get("ich") || FUER[q.get("fuer")] || "";
    const radio = $$('input[name="sender_type"]', form).find((r) => r.value === value);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    const topic = q.get("thema");
    const box = topic && $$('input[name="interest"]', form).find((b) => !b.disabled && b.dataset.topic.split(" ").includes(topic));
    if (box) box.checked = true;
  }

  initContactForm();
  preselect();
})();
