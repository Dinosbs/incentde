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

  function initContactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;
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
      if (form.dataset.endpoint) {
        submitBtn.disabled = true;
        try {
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
      const subject = `Kontaktanfrage über incent.de – ${data.get("firstname")} ${data.get("lastname")}`;
      window.location.href = `mailto:info@incent.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      showSuccess("Ihr E-Mail-Programm öffnet sich mit Ihrer Anfrage – bitte dort noch absenden. Alternativ erreichen Sie uns unter info@incent.de oder 08341 93450.");
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
