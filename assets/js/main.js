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

  /* ---------- Hero: wechselnde Begriffe (alle 800 ms, 3D-Einblendung mit Lichtblitz) ---------- */
  function initRotator() {
    const el = $("[data-rotator]");
    if (!el || reducedMotion) return;
    const words = JSON.parse(el.dataset.rotator);
    const INTERVAL = 800;
    let index = 0;
    let current = $(".rotator__word", el);
    let timer = 0;
    let visible = true;

    const next = () => {
      index = (index + 1) % words.length;
      const word = document.createElement("span");
      word.className = "rotator__word is-in";
      word.textContent = words[index];
      const old = current;
      old.classList.remove("is-in");
      old.classList.add("is-out");
      old.addEventListener("animationend", (e) => e.animationName === "rotator-out" && old.remove());
      // Sicherheitsnetz, falls animationend ausbleibt (z. B. Tab im Hintergrund)
      setTimeout(() => old.isConnected && old.remove(), 600);
      el.append(word);
      current = word;
    };
    const stop = () => {
      clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      if (timer || !visible || document.hidden) return;
      timer = setInterval(next, INTERVAL);
    };

    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      }).observe(el);
    }
    // erster Begriff steht nach dem Laden kurz länger
    setTimeout(start, 1400);
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
      // Portal folgt dem Cursor: Neigung, leichte Verschiebung und Lichtreflex,
      // pro Frame weich nachgeführt (lerp) statt starrer CSS-Transition
      const target = { x: 0, y: 0, glare: 0 };
      const current = { x: 0, y: 0, glare: 0 };
      let frame = 0;
      const tick = () => {
        current.x += (target.x - current.x) * 0.09;
        current.y += (target.y - current.y) * 0.09;
        current.glare += (target.glare - current.glare) * 0.08;
        stage.style.setProperty("--ry", `${(current.x * 11).toFixed(2)}deg`);
        stage.style.setProperty("--rx", `${(-current.y * 7).toFixed(2)}deg`);
        stage.style.setProperty("--tx", `${(current.x * 22).toFixed(1)}px`);
        stage.style.setProperty("--ty", `${(current.y * 12).toFixed(1)}px`);
        stage.style.setProperty("--gx", `${(50 + current.x * 55).toFixed(1)}%`);
        stage.style.setProperty("--gy", `${(35 + current.y * 55).toFixed(1)}%`);
        stage.style.setProperty("--glare", current.glare.toFixed(3));
        const moving =
          Math.abs(target.x - current.x) > 0.0005 ||
          Math.abs(target.y - current.y) > 0.0005 ||
          Math.abs(target.glare - current.glare) > 0.002;
        frame = moving ? requestAnimationFrame(tick) : 0;
      };
      const kick = () => {
        if (!frame) frame = requestAnimationFrame(tick);
      };

      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        spot.style.setProperty("--sx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--sy", `${e.clientY - r.top}px`);
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
        target.x = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
        target.y = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
        target.glare = 1;
        kick();
      });
      hero.addEventListener("pointerleave", () => {
        target.x = 0;
        target.y = 0;
        target.glare = 0;
        kick();
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

  /* ---------- Portal-Design: ein gemeinsamer Zustand für Hero-Mockup und Live-Vorschau ---------- */
  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const luminance = (hex) => {
    const channel = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const [r, g, b] = hexToRgb(hex);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const mixHex = (a, b) => {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    const h = (v) => Math.round(v).toString(16).padStart(2, "0");
    return `#${h((r1 + r2) / 2)}${h((g1 + g2) / 2)}${h((b1 + b2) / 2)}`;
  };
  // Weiße Schrift, solange sie mindestens 3:1 Kontrast hat (wie im Portal auf #1c87b8)
  const toneOf = (hex) => (1.05 / (luminance(hex) + 0.05) >= 3 ? "dark" : "light");
  const sameColor = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  function createPortalTheme() {
    const roots = $$(".vp-theme");
    const state = { btn: "#1c87b8", nav: "#ffffff", bg: "image", solid: "#e8f3f9", g1: "#1c87b8", g2: "#0a2540", name: "", logo: "" };
    const listeners = [];

    const apply = () => {
      const stageTone =
        state.bg === "solid" ? toneOf(state.solid) : state.bg === "gradient" ? toneOf(mixHex(state.g1, state.g2)) : "light";
      roots.forEach((root) => {
        root.style.setProperty("--btn", state.btn);
        root.style.setProperty("--nav", state.nav);
        root.style.setProperty("--bg-solid", state.solid);
        root.style.setProperty("--bg-g1", state.g1);
        root.style.setProperty("--bg-g2", state.g2);
        root.dataset.btnTone = toneOf(state.btn);
        root.dataset.navTone = toneOf(state.nav);
        root.dataset.bg = state.bg;
        root.dataset.stageTone = stageTone;
        root.dataset.logo = state.logo ? "custom" : "default";
      });
      $$("[data-portal-name]").forEach((el) => (el.textContent = state.name || el.dataset.defaultName));
      $$(".vp__logo-custom").forEach((img) => {
        img.dataset.empty = img.dataset.empty || img.getAttribute("src");
        const src = state.logo || img.dataset.empty;
        if (img.getAttribute("src") !== src) img.src = src;
      });
    };

    return {
      state,
      set(patch) {
        Object.assign(state, patch);
        apply();
        listeners.forEach((fn) => fn(state));
      },
      onChange(fn) {
        listeners.push(fn);
      },
    };
  }

  // Radiogruppe mit Pfeiltasten (roving tabindex)
  const arrowNav = (items, i, e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = items[(i + step + items.length) % items.length];
    next.click();
    next.focus();
  };
  const markRadio = (items, selected) => {
    items.forEach((item) => {
      const on = item === selected;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-checked", String(on));
      item.tabIndex = on ? 0 : -1;
    });
    if (!selected && items[0]) items[0].tabIndex = 0;
  };

  /* ---------- Live-Vorschau: Logo, Name, Buttonfarbe, Navigationsleiste, Hintergrund ---------- */
  function initStudio(theme) {
    const root = $("[data-studio]");
    if (!root) return;
    const syncers = [];

    // Farbgruppen: Buttonfarbe, Navigationsleiste, Hintergrundfarbe (je ein Farbwert)
    ["btn", "nav", "solid"].forEach((key) => {
      const group = $(`[data-swatches="${key}"]`, root);
      if (!group) return;
      const swatches = $$(".swatch[data-color]", group);
      const customInput = $("[data-custom]", group);
      const customSwatch = customInput.closest(".swatch");

      swatches.forEach((sw, i) => {
        sw.addEventListener("click", () => theme.set({ [key]: sw.dataset.color }));
        sw.addEventListener("keydown", (e) => arrowNav(swatches, i, e));
      });
      customInput.addEventListener("input", () => theme.set({ [key]: customInput.value }));

      syncers.push((state) => {
        const value = state[key];
        const preset = swatches.find((sw) => sameColor(sw.dataset.color, value));
        markRadio(swatches, preset);
        customSwatch.classList.toggle("is-on", !preset);
        if (!preset) customSwatch.style.setProperty("--c", value);
        if (!sameColor(customInput.value, value)) customInput.value = value;
      });
    });

    // Farbverlauf: Vorlagen + eigene Start-/Endfarbe
    const gradGroup = $('[data-swatches="gradient"]', root);
    if (gradGroup) {
      const swatches = $$(".swatch[data-g1]", gradGroup);
      swatches.forEach((sw, i) => {
        sw.addEventListener("click", () => theme.set({ g1: sw.dataset.g1, g2: sw.dataset.g2 }));
        sw.addEventListener("keydown", (e) => arrowNav(swatches, i, e));
      });
      const inputs = $$("[data-grad-input]", root);
      inputs.forEach((input) =>
        input.addEventListener("input", () => theme.set(input.dataset.gradInput === "1" ? { g1: input.value } : { g2: input.value }))
      );
      syncers.push((state) => {
        markRadio(swatches, swatches.find((sw) => sameColor(sw.dataset.g1, state.g1) && sameColor(sw.dataset.g2, state.g2)));
        inputs.forEach((input) => {
          const value = input.dataset.gradInput === "1" ? state.g1 : state.g2;
          if (!sameColor(input.value, value)) input.value = value;
          input.closest(".swatch").style.setProperty("--c", value);
        });
      });
    }

    // Hintergrund: Bild, einfarbig oder Verlauf (+ passende Farbfelder aufklappen)
    const bgOptions = $$("[data-bg-option]", root);
    const bgPanels = $$("[data-bg-panel]", root);
    bgOptions.forEach((opt, i) => {
      opt.addEventListener("click", () => theme.set({ bg: opt.dataset.bgOption }));
      opt.addEventListener("keydown", (e) => arrowNav(bgOptions, i, e));
    });
    syncers.push((state) => {
      markRadio(bgOptions, bgOptions.find((o) => o.dataset.bgOption === state.bg));
      bgPanels.forEach((panel) => {
        const open = panel.dataset.bgPanel === state.bg;
        panel.classList.toggle("is-open", open);
        panel.inert = !open;
      });
    });

    // Unternehmensname
    const nameInput = $("[data-studio-name]", root);
    nameInput.addEventListener("input", () => theme.set({ name: nameInput.value.trim() }));

    // Eigenes Logo: bleibt im Browser (Object-URL), wird nirgendwohin hochgeladen
    const drop = $("[data-logo-drop]", root);
    const fileInput = $("[data-logo-input]", root);
    const resetBtn = $("[data-logo-reset]", root);
    const preview = $("[data-logo-preview]", root);
    const fileName = $("[data-logo-name]", root);
    const msg = $("[data-logo-msg]", root);
    const defaultSrc = preview.getAttribute("src");
    const defaultName = fileName.textContent;
    let objectUrl = "";

    const useFile = (file) => {
      msg.textContent = "";
      if (!file) return;
      if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(file.type)) {
        msg.textContent = "Bitte eine Bilddatei wählen (PNG, JPG, SVG oder WebP).";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        msg.textContent = "Die Datei ist größer als 5 MB.";
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      preview.src = objectUrl;
      fileName.textContent = file.name;
      resetBtn.hidden = false;
      theme.set({ logo: objectUrl });
    };
    fileInput.addEventListener("change", () => useFile(fileInput.files[0]));
    ["dragenter", "dragover"].forEach((type) =>
      drop.addEventListener(type, (e) => {
        e.preventDefault();
        drop.classList.add("is-drag");
      })
    );
    ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("is-drag")));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      useFile(e.dataTransfer.files[0]);
    });
    resetBtn.addEventListener("click", () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = "";
      fileInput.value = "";
      preview.src = defaultSrc;
      fileName.textContent = defaultName;
      msg.textContent = "";
      resetBtn.hidden = true;
      theme.set({ logo: "" });
      fileInput.focus();
    });

    theme.onChange((state) => syncers.forEach((sync) => sync(state)));
  }

  /* ---------- Hero: Live-Chip – Buttonfarbe direkt im Hero ausprobieren ---------- */
  function initLiveChip(theme) {
    const chip = $("[data-live-chip]");
    if (!chip) return;
    const dots = $$("[data-chip-color]", chip);
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => theme.set({ btn: dot.dataset.chipColor }));
      dot.addEventListener("keydown", (e) => arrowNav(dots, i, e));
    });
    theme.onChange((state) => markRadio(dots, dots.find((d) => sameColor(d.dataset.chipColor, state.btn))));
  }

  /* ---------- Kontaktformular ---------- */
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
    const senderType = () => (form.querySelector('input[name="sender_type"]:checked') || {}).value || "none";

    const updateFields = (animate) => {
      const type = senderType();
      conditional.forEach((field) => {
        const show = field.dataset.showFor.split(" ").includes(type);
        const wasHidden = field.hidden;
        field.hidden = !show;
        $$("input, select, textarea", field).forEach((el) => (el.disabled = !show));
        if (show && wasHidden && animate && !reducedMotion) {
          field.classList.remove("is-entering");
          void field.offsetWidth;
          field.classList.add("is-entering");
        }
      });
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
        street: "Anschrift", postal_code: "PLZ", message: "Nachricht",
      };
      const lines = [];
      data.forEach((value, key) => {
        if (String(value).trim()) lines.push(`${labels[key] || key}: ${value}`);
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
  initRotator();
  initCounters();
  initHero();
  initSpotlight();
  initMagnetic();
  initTabs();
  initWordReveal();
  initNetwork();
  const portalTheme = createPortalTheme();
  initStudio(portalTheme);
  initLiveChip(portalTheme);
  portalTheme.set({});
  initContactForm();
  initCarousel();
  runScrollTasks();
})();
