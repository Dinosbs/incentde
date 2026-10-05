/* ==========================================================================
   INCENT – Interaktionen
   Vanilla JS, keine Abhängigkeiten. Jede Funktion steuert genau ein Modul
   und bricht still ab, wenn ihr Markup fehlt.
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasIO = "IntersectionObserver" in window;

  /* Ein gemeinsamer rAF-Loop für alles, was am Scrollen hängt */
  const scrollTasks = [];
  let scrollQueued = false;
  const runScrollTasks = () => {
    scrollQueued = false;
    scrollTasks.forEach((task) => task());
  };
  const queueScrollTasks = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(runScrollTasks);
  };
  window.addEventListener("scroll", queueScrollTasks, { passive: true });
  window.addEventListener("resize", queueScrollTasks);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Partner-Laufband: Inhalte für nahtlosen Loop verdoppeln ---------- */
  function initMarquee() {
    $$("[data-marquee-track]").forEach((track) => {
      Array.from(track.children).forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.append(clone);
      });
      if (!reducedMotion) track.classList.add("is-ready");
    });
  }

  /* ---------- Logos: bei Ladefehler sauberer Text-Ersatz ---------- */
  function initLogoFallbacks() {
    const swap = (img) => {
      if (!img.isConnected || img.dataset.failed) return;
      img.dataset.failed = "true";
      const label = document.createElement("span");
      label.className = "logo-fallback";
      label.textContent = img.alt;
      img.replaceWith(label);
    };
    $$("img[data-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) swap(img);
      else img.addEventListener("error", () => swap(img), { once: true });
    });
  }

  /* ---------- Navigation, Mega-Menü, Mobile-Menü, Scrollspy ---------- */
  function initNav() {
    const nav = $("[data-nav]");
    if (!nav) return;
    const burger = $("[data-burger]", nav);
    const mega = $("[data-mega]", nav);
    const megaToggle = $("[data-mega-toggle]", nav);
    const desktop = window.matchMedia("(min-width: 1121px)");

    scrollTasks.push(() => nav.classList.toggle("is-scrolled", window.scrollY > 24));

    const setMenu = (open) => {
      nav.classList.toggle("is-menu-open", open);
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    };
    const setMega = (open) => {
      mega.classList.toggle("is-open", open);
      megaToggle.setAttribute("aria-expanded", String(open));
    };

    burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-menu-open")));

    let closeTimer;
    let lastPointer = "";
    megaToggle.addEventListener("pointerdown", (e) => (lastPointer = e.pointerType));
    megaToggle.addEventListener("click", (e) => {
      // Desktop-Maus: Hover steuert das Menü, ein Klick darf es nicht wieder zuklappen.
      // Tastatur (detail === 0) und Touch schalten um.
      const hoverDriven = desktop.matches && lastPointer === "mouse" && e.detail > 0;
      lastPointer = "";
      setMega(hoverDriven ? true : !mega.classList.contains("is-open"));
    });
    mega.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || !desktop.matches) return;
      clearTimeout(closeTimer);
      setMega(true);
    });
    mega.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse" || !desktop.matches) return;
      closeTimer = setTimeout(() => setMega(false), 180);
    });
    mega.addEventListener("focusout", (e) => {
      if (desktop.matches && !mega.contains(e.relatedTarget)) setMega(false);
    });
    document.addEventListener("click", (e) => {
      if (!mega.contains(e.target)) setMega(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (mega.classList.contains("is-open")) {
        setMega(false);
        megaToggle.focus();
      } else if (nav.classList.contains("is-menu-open")) {
        setMenu(false);
        burger.focus();
      }
    });
    $$(".nav__menu a", nav).forEach((link) =>
      link.addEventListener("click", () => {
        setMenu(false);
        setMega(false);
      })
    );
    desktop.addEventListener("change", () => {
      setMenu(false);
      setMega(false);
    });

    // Scrollspy für Anker-Links
    if (!hasIO) return;
    const spyLinks = $$("[data-spy]", nav);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = spyLinks.find((l) => l.dataset.spy === entry.target.id);
          if (link) link.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    spyLinks.forEach((link) => {
      const section = document.getElementById(link.dataset.spy);
      if (section) spy.observe(section);
    });
  }

  /* ---------- Scroll-Fortschritt ---------- */
  function initScrollProgress() {
    const bar = $(".scroll-progress");
    if (!bar) return;
    scrollTasks.push(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--sp", max > 0 ? (window.scrollY / max).toFixed(4) : "0");
    });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!hasIO || reducedMotion) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Hero: Schreibmaschinen-Effekt ---------- */
  function initTyper() {
    const el = $("[data-typer]");
    if (!el || reducedMotion) return;
    const words = JSON.parse(el.dataset.typer);
    const out = $(".typer__text", el);
    let word = 0;
    let chars = words[0].length;
    let deleting = true;

    const tick = () => {
      const current = words[word];
      if (deleting) {
        chars -= 1;
        out.textContent = current.slice(0, chars);
        if (chars === 0) {
          deleting = false;
          word = (word + 1) % words.length;
          setTimeout(tick, 320);
        } else {
          setTimeout(tick, 30);
        }
      } else {
        chars += 1;
        out.textContent = words[word].slice(0, chars);
        if (chars === words[word].length) {
          deleting = true;
          setTimeout(tick, 2400);
        } else {
          setTimeout(tick, 55 + Math.random() * 55);
        }
      }
    };
    setTimeout(tick, 2800);
  }

  /* ---------- Kennzahlen hochzählen ---------- */
  function initCounters() {
    const counters = $$("[data-count]");
    if (!hasIO || reducedMotion) return;
    const format = (value, decimals) =>
      value.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const duration = 1900;
      const start = performance.now();
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = format(target * eased, decimals);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => {
      el.textContent = format(0, parseInt(el.dataset.decimals || "0", 10));
      io.observe(el);
    });
  }

  /* ---------- Hero: Lichtkegel, 3D-Neigung, Aufrichten beim Scrollen ---------- */
  function initHero() {
    const hero = $("[data-hero]");
    const spot = $("[data-spot]");
    const visual = $("[data-tilt]");
    const stage = $("[data-tilt-stage]");
    if (!hero || !visual || !stage) return;

    if (reducedMotion) {
      stage.style.setProperty("--p", "1");
      return;
    }

    if (finePointer) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        spot.style.setProperty("--sx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--sy", `${e.clientY - r.top}px`);
        const v = visual.getBoundingClientRect();
        const nx = clamp((e.clientX - (v.left + v.width / 2)) / v.width, -0.5, 0.5);
        const ny = clamp((e.clientY - (v.top + v.height / 2)) / v.height, -0.5, 0.5);
        stage.style.setProperty("--ry", `${(nx * 7).toFixed(2)}deg`);
        stage.style.setProperty("--rx", `${(-ny * 5).toFixed(2)}deg`);
      });
      hero.addEventListener("pointerleave", () => {
        stage.style.setProperty("--ry", "0deg");
        stage.style.setProperty("--rx", "0deg");
      });
    }

    scrollTasks.push(() => {
      const top = visual.getBoundingClientRect().top;
      const vh = window.innerHeight;
      const p = clamp((vh - top) / (vh * 0.7), 0, 1);
      stage.style.setProperty("--p", p.toFixed(3));
    });
  }

  /* ---------- Lichtkante an Karten (folgt dem Cursor) ---------- */
  function initSpotlight() {
    if (!finePointer) return;
    $$("[data-spotlight], [data-spot-panel]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Magnetische Buttons ---------- */
  function initMagnetic() {
    if (!finePointer || reducedMotion) return;
    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.32;
        btn.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.translate = "";
      });
    });
  }

  /* ---------- Lösungen: Tabs mit Auto-Play ---------- */
  function initTabs() {
    const root = $("[data-tabs]");
    if (!root) return;
    const tabs = $$('[role="tab"]', root);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    const list = $(".tabs__list", root);
    let current = 0;
    let autoplay = !reducedMotion;
    let inView = false;

    const restartProgress = () => {
      root.classList.remove("is-playing");
      if (!autoplay || !inView) return;
      void root.offsetWidth; // Animation neu starten
      root.classList.add("is-playing");
    };

    const select = (index, { focus = false, byUser = false } = {}) => {
      current = (index + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        const active = i === current;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        panels[i].classList.toggle("is-active", active);
      });
      if (focus) tabs[current].focus({ preventScroll: true });
      if (byUser) autoplay = false;
      restartProgress();

      // horizontale Tab-Leiste (mobil) mitscrollen
      if (list.scrollWidth > list.clientWidth) {
        const padding = parseFloat(getComputedStyle(list).paddingLeft) || 0;
        list.scrollTo({ left: tabs[current].offsetLeft - padding, behavior: reducedMotion ? "auto" : "smooth" });
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i, { byUser: true }));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) {
          e.preventDefault();
          select(current + step, { focus: true, byUser: true });
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          select(e.key === "Home" ? 0 : tabs.length - 1, { focus: true, byUser: true });
        }
      });
    });

    root.addEventListener("animationend", (e) => {
      if (autoplay && e.animationName === "progress") select(current + 1);
    });

    if (autoplay && hasIO) {
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          restartProgress();
        },
        { threshold: 0.35 }
      ).observe(root);
    }
  }

  /* ---------- Statement: Wörter leuchten beim Scrollen auf ---------- */
  function initWordReveal() {
    const el = $("[data-words]");
    if (!el || reducedMotion) return;
    const words = [];

    const split = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.append(" ");
              return;
            }
            const span = document.createElement("span");
            span.className = "w";
            span.textContent = part;
            words.push(span);
            frag.append(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          split(child);
        }
      });
    };
    split(el);
    el.classList.add("is-split");

    let lit = -1;
    scrollTasks.push(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.88;
      const end = vh * 0.4;
      const p = clamp((start - r.top) / (start - end + r.height * 0.5), 0, 1);
      const count = Math.round(p * words.length);
      if (count === lit) return;
      lit = count;
      words.forEach((w, i) => w.classList.toggle("is-lit", i < count));
    });
  }

  /* ---------- Plattform: Netzwerk-Grafik + Akkordeon ---------- */
  function initNetwork() {
    const svg = $("[data-network]");
    const features = $$("[data-feature]");
    if (!svg || !features.length) return;
    const links = $$(".link", svg);
    const nodes = $$(".node", svg);
    const packetLayer = $("[data-packets]", svg);
    const packets = [];
    const NS = "http://www.w3.org/2000/svg";

    if (!reducedMotion) {
      links.forEach((link, li) => {
        [false, true].forEach((reverse) => {
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("r", "3.5");
          dot.setAttribute("class", "packet");
          dot.dataset.link = link.dataset.link;
          const motion = document.createElementNS(NS, "animateMotion");
          motion.setAttribute("dur", `${(reverse ? 3.4 : 2.6) + li * 0.37}s`);
          motion.setAttribute("repeatCount", "indefinite");
          if (reverse) {
            motion.setAttribute("keyPoints", "1;0");
            motion.setAttribute("keyTimes", "0;1");
            motion.setAttribute("calcMode", "linear");
          }
          const mpath = document.createElementNS(NS, "mpath");
          mpath.setAttribute("href", `#${link.id}`);
          motion.append(mpath);
          dot.append(motion);
          packetLayer.append(dot);
          packets.push(dot);
        });
      });
    }

    const open = (feature) => {
      features.forEach((f) => {
        const isOpen = f === feature;
        f.classList.toggle("is-open", isOpen);
        $("button", f).setAttribute("aria-expanded", String(isOpen));
        $(".feature__body", f).setAttribute("aria-hidden", String(!isOpen));
      });
      const active = new Set(feature.dataset.nodes.split(/\s+/));
      links.forEach((l) => {
        const on = active.has(l.dataset.link);
        l.classList.toggle("is-on", on);
        l.classList.toggle("is-off", !on);
      });
      nodes.forEach((n) => n.classList.toggle("is-on", active.has(n.dataset.node)));
      packets.forEach((p) => p.classList.toggle("is-off", !active.has(p.dataset.link)));
    };

    features.forEach((f) => $("button", f).addEventListener("click", () => open(f)));
    open(features.find((f) => f.classList.contains("is-open")) || features[0]);
  }

  /* ---------- Live-Vorschau: Corporate Design ---------- */
  function initStudio() {
    const root = $("[data-studio]");
    if (!root) return;
    const preview = $("[data-studio-preview]", root);
    const nameInput = $("[data-studio-name]", root);
    const labels = $$("[data-studio-label]", root);
    const initials = $("[data-studio-initials]", root);
    const swatches = $$(".swatch[data-color]", root);
    const customInput = $("[data-studio-color]", root);
    const customSwatch = customInput.closest(".swatch");
    const themeButtons = $$("[data-studio-theme]", root);

    const luminance = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      const channel = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    };

    const applyColor = (hex) => {
      const L = luminance(hex);
      const contrastWhite = 1.05 / (L + 0.05);
      const contrastInk = (L + 0.05) / 0.056;
      preview.style.setProperty("--brand", hex);
      preview.style.setProperty("--on-brand", contrastWhite >= contrastInk ? "#ffffff" : "#0b1220");
      preview.style.setProperty("--brand-on-dark", L < 0.08 ? `color-mix(in srgb, ${hex} 35%, #ffffff)` : hex);
    };

    const markSelected = (selected) => {
      swatches.forEach((s) => {
        const on = s === selected;
        s.classList.toggle("is-on", on);
        s.setAttribute("aria-checked", String(on));
        s.tabIndex = on || (selected === customSwatch && s === swatches[0]) ? 0 : -1;
      });
      customSwatch.classList.toggle("is-on", selected === customSwatch);
    };

    swatches.forEach((s, i) => {
      s.addEventListener("click", () => {
        markSelected(s);
        applyColor(s.dataset.color);
        customInput.value = s.dataset.color;
      });
      s.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = swatches[(i + step + swatches.length) % swatches.length];
        next.click();
        next.focus();
      });
    });

    customInput.addEventListener("input", () => {
      customSwatch.style.setProperty("--c", customInput.value);
      markSelected(customSwatch);
      applyColor(customInput.value);
    });

    const applyName = () => {
      const name = nameInput.value.trim() || "Ihr Unternehmen";
      labels.forEach((l) => (l.textContent = name));
      const letters = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      initials.textContent = letters || "IU";
    };
    nameInput.addEventListener("input", applyName);

    themeButtons.forEach((btn) =>
      btn.addEventListener("click", () => {
        themeButtons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-checked", String(on));
        });
        preview.dataset.theme = btn.dataset.studioTheme;
      })
    );

    markSelected(swatches[0]);
    applyColor(swatches[0].dataset.color);
    applyName();
  }

  /* ---------- Kundenstimmen: Karussell ---------- */
  function initCarousel() {
    const root = $("[data-carousel]");
    if (!root) return;
    const section = root.closest("section");
    const slides = $$(".quote", root);
    const dots = $$("[data-dots] button", root);
    const viewport = $("[data-viewport]", root);
    const prev = $("[data-prev]", section);
    const next = $("[data-next]", section);
    const toggle = $("[data-autoplay-toggle]", section);
    let index = 0;
    let playing = !reducedMotion;
    let inView = false;

    const restart = () => {
      root.classList.remove("is-playing");
      if (!playing || !inView) return;
      void root.offsetWidth;
      root.classList.add("is-playing");
    };

    const go = (n) => {
      index = (n + slides.length) % slides.length;
      slides.forEach((s, i) => {
        const active = i === index;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-hidden", String(!active));
      });
      dots.forEach((d, i) => d.setAttribute("aria-current", i === index ? "true" : "false"));
      restart();
    };

    const setPlaying = (state) => {
      playing = state;
      toggle.classList.toggle("is-paused", !state);
      toggle.setAttribute(
        "aria-label",
        state ? "Automatisches Weiterblättern pausieren" : "Automatisches Weiterblättern starten"
      );
      restart();
    };

    prev.addEventListener("click", () => go(index - 1));
    next.addEventListener("click", () => go(index + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    toggle.addEventListener("click", () => setPlaying(!playing));
    root.addEventListener("animationend", (e) => {
      if (playing && e.animationName === "progress") go(index + 1);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    });

    // Wischen auf Touch-Geräten
    let startX = null;
    viewport.addEventListener("pointerdown", (e) => (startX = e.clientX));
    viewport.addEventListener("pointercancel", () => (startX = null));
    viewport.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    });

    if (hasIO) {
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          restart();
        },
        { threshold: 0.3 }
      ).observe(root);
    }
    setPlaying(playing);
  }

  /* ---------- Start ---------- */
  initMarquee();
  initLogoFallbacks();
  initNav();
  initScrollProgress();
  initReveal();
  initTyper();
  initCounters();
  initHero();
  initSpotlight();
  initMagnetic();
  initTabs();
  initWordReveal();
  initNetwork();
  initStudio();
  initCarousel();
  runScrollTasks();
})();
