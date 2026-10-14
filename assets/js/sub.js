/* =========================================================================
   INCENT – Unterseiten (FAQ, Karriere, Impressum, Datenschutz)
   Klein gehalten statt main.js: nur was die Unterseiten brauchen.
   - Bilder mit [data-tilt-card] neigen sich zum Cursor (wie auf der Startseite: ganzes Fenster, weich
     nachgeführt, nur sichtbare Elemente; setzt --rx/--ry/--tx/--ty, siehe .tilt-media in main.css)
   - Animationen mit [data-play] starten erst, wenn sie ins Bild kommen (Klasse is-on), und pausieren
     außerhalb des Fensters (data-anim-off)
   ========================================================================= */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasIO = "IntersectionObserver" in window;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Animationen erst im Bild starten, außerhalb pausieren ---------- */
  const plays = document.querySelectorAll("[data-play]");
  if (hasIO && !reducedMotion) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-on");
          e.target.toggleAttribute("data-anim-off", !e.isIntersecting);
        }),
      { threshold: 0.35 }
    );
    plays.forEach((el) => io.observe(el));
  }

  /* ---------- Cursor-Follow (wie createTilt in main.js) ---------- */
  if (!finePointer || reducedMotion) return;
  let pointer = null;
  const tilts = [...document.querySelectorAll("[data-tilt-card]")].map((stage) => ({
    stage,
    rx: Number(stage.dataset.rx || 6),
    ry: Number(stage.dataset.ry || 9),
    tx: Number(stage.dataset.tx || 10),
    ty: Number(stage.dataset.ty || 6),
    reach: 0.42,
    visible: !hasIO,
    frame: 0,
    target: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  }));
  if (!tilts.length) return;

  const tick = (t) => {
    const c = t.current;
    const g = t.target;
    c.x += (g.x - c.x) * 0.12;
    c.y += (g.y - c.y) * 0.12;
    const st = t.stage.style;
    st.setProperty("--ry", `${(c.x * t.ry).toFixed(2)}deg`);
    st.setProperty("--rx", `${(-c.y * t.rx).toFixed(2)}deg`);
    st.setProperty("--tx", `${(c.x * t.tx).toFixed(1)}px`);
    st.setProperty("--ty", `${(c.y * t.ty).toFixed(1)}px`);
    const moving = Math.abs(g.x - c.x) > 0.002 || Math.abs(g.y - c.y) > 0.002;
    t.frame = moving ? requestAnimationFrame(() => tick(t)) : 0;
  };
  const aim = (t) => {
    const g = t.target;
    if (!pointer) {
      g.x = g.y = 0;
    } else {
      const r = t.stage.getBoundingClientRect();
      // Mitte ohne die eigene Mitbewegung, sonst läuft das Element dem Cursor davon
      const cx = r.left + r.width / 2 - t.current.x * t.tx;
      const cy = r.top + r.height / 2 - t.current.y * t.ty;
      // Fokus im Element (z. B. beim Tippen im Formular): hält weitgehend still
      const damp = t.stage.matches(":focus-within") ? 0.3 : 1;
      g.x = clamp((pointer.x - cx) / (window.innerWidth * t.reach), -1, 1) * damp;
      g.y = clamp((pointer.y - cy) / (window.innerHeight * t.reach), -1, 1) * damp;
    }
    if (!t.frame) t.frame = requestAnimationFrame(() => tick(t));
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer = { x: e.clientX, y: e.clientY };
      tilts.forEach((t) => t.visible && aim(t));
    },
    { passive: true }
  );
  const away = () => {
    pointer = null;
    tilts.forEach(aim);
  };
  document.documentElement.addEventListener("pointerleave", away);
  window.addEventListener("blur", away);
  // beim Scrollen wandern die Elemente unter dem ruhenden Cursor weiter (höchstens einmal pro Bild)
  let queued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (queued || !pointer) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        tilts.forEach((t) => t.visible && aim(t));
      });
    },
    { passive: true }
  );
  if (hasIO)
    tilts.forEach((t) =>
      new IntersectionObserver(
        (entries) => {
          t.visible = entries[entries.length - 1].isIntersecting;
          if (t.visible && pointer) aim(t);
        },
        { rootMargin: "120px 0px" }
      ).observe(t.stage)
    );
})();
