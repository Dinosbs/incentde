/* =========================================================================
   INCENT – Kontaktformular (nur kontakt.html)
   -------------------------------------------------------------------------
   Schritt 1 („Ich bin …“) steht klein auf jeder Seite (index.html, #kontakt) und schickt hierher:
   kontakt.html?ich=Arbeitgeber (auch ohne Skript) – oder ?fuer=arbeitgeber (Kampagnen-Links). Die Auswahl wird
   vorbelegt, die passenden Zusatzfelder erscheinen. &thema=<Bereich> (das kleine Formular hängt den Bereich an, aus dem
   es kommt, z. B. mitarbeiterrabatte) hakt unter „Worum geht es?“ das passende Thema an (data-topic).
   Oben zeigt ein Fortschritt, wie viele Pflichtangaben noch fehlen; Felder werden schon beim Verlassen geprüft (nur wenn
   etwas drinsteht – leere Pflichtfelder meldet erst das Absenden).
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

    // Fortschritt: Schritt 1 = Auswahl, Schritt 2 = alle sichtbaren Pflichtfelder gültig
    const steps = $$("[data-kp-step]", form);
    const typeOut = $("[data-kp-type]", form);
    const leftOut = $("[data-kp-left]", form);
    const bar = $("[data-kp-bar]", form);
    const progress = () => {
      if (!steps.length) return;
      const type = senderType();
      const required = $$("input[required]:not([type=radio]), select[required]", form).filter((el) => !el.disabled);
      const open = required.filter((el) => !el.value.trim() || !el.checkValidity()).length + (type === "none" ? 1 : 0);
      const total = required.length + 1;
      steps[0].classList.toggle("is-done", type !== "none");
      steps[0].classList.toggle("is-current", type === "none");
      steps[1].classList.toggle("is-done", open === 0);
      steps[1].classList.toggle("is-current", type !== "none" && open > 0);
      typeOut.textContent = type === "none" ? "Bitte auswählen" : type;
      leftOut.textContent = type === "none" ? "Name, E-Mail, Anliegen" : open === 0 ? "Alles bereit zum Senden" : `Noch ${open} Pflichtangabe${open === 1 ? "" : "n"}`;
      bar.style.transform = `scaleX(${((total - open) / total).toFixed(3)})`;
    };

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
      progress();
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
    const checkPhone = () =>
      phone.setCustomValidity(phone.value && !/^[0-9 ()+\/.-]{5,}$/.test(phone.value) ? "Bitte nur Ziffern und Telefonzeichen verwenden." : "");

    form.addEventListener("change", (e) => {
      if (e.target.name !== "sender_type") return;
      typeError.textContent = "";
      updateFields(true);
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
      checkPhone();
      let first = null;
      if (senderType() === "none") {
        typeError.textContent = "Bitte wählen Sie aus, wer Sie sind.";
        first = form.querySelector('input[name="sender_type"]');
      }
      $$("input:not([type=radio]), select, textarea", form).forEach((el) => {
        if (el.disabled) return;
        if (el.checkValidity()) {
          setError(el, "");
        } else {
          setError(el, messageFor(el));
          first = first || el;
        }
      });
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
