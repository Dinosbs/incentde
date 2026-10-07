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

  /* ---------- Bildordner automatisch auslesen ----------
     1. manifest.json im Ordner (erzeugt von tools/update-image-manifests.mjs bzw. der GitHub Action)
     2. sonst die Verzeichnisliste des Servers (falls aktiviert)
     Ergebnis: Liste der Dateinamen – oder null, wenn weder Manifest noch Listing verfügbar ist. */
  const IMAGE_FILE = /\.(png|jpe?g|webp|svg|gif|avif)$/i;
  const folderCache = new Map();
  const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

  const listImageFolder = (folder) => {
    if (!folderCache.has(folder)) {
      folderCache.set(
        folder,
        (async () => {
          try {
            const res = await fetch(`${folder}manifest.json`, { cache: "no-cache" });
            if (res.ok) {
              const data = await res.json();
              return (data.files || []).filter((f) => IMAGE_FILE.test(f));
            }
          } catch (err) {
            /* weiter mit Verzeichnisliste */
          }
          try {
            const res = await fetch(folder, { cache: "no-cache" });
            if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) {
              const doc = new DOMParser().parseFromString(await res.text(), "text/html");
              const names = Array.from(doc.querySelectorAll("a[href]"))
                .map((a) => decodeURIComponent(a.getAttribute("href").split(/[?#]/)[0].split("/").pop()))
                .filter((f) => IMAGE_FILE.test(f));
              return [...new Set(names)].sort(collator.compare);
            }
          } catch (err) {
            /* kein Listing verfügbar */
          }
          return null;
        })()
      );
    }
    return folderCache.get(folder);
  };

  // "01-REWE-Group.webp" -> "REWE Group", "center-parcs.png" -> "Center Parcs"
  const nameFromFile = (file) => {
    let name = file
      .replace(IMAGE_FILE, "")
      .replace(/^\d+[-_ ]+/, "")
      .replace(/[-_ ]+\d+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (name === name.toLowerCase()) name = name.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    return name;
  };
  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const fileUrl = (folder, file) => folder + encodeURIComponent(file);

  /* ---------- Logos: bei Ladefehler sauberer Text-Ersatz ---------- */
  const attachLogoFallback = (img) => {
    const swap = () => {
      if (!img.isConnected || img.dataset.failed) return;
      img.dataset.failed = "true";
      const label = document.createElement("span");
      label.className = "logo-fallback";
      label.textContent = img.alt;
      img.replaceWith(label);
    };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) swap();
    else img.addEventListener("error", swap, { once: true });
  };
  function initLogoFallbacks() {
    $$("img[data-fallback]").forEach(attachLogoFallback);
  }

  /* ---------- Endlos-Laufband: Inhalt verdoppeln, Tempo an Anzahl anpassen ---------- */
  const startLoop = (track, secondsPerItem) => {
    $$("[data-clone]", track).forEach((clone) => clone.remove());
    const items = Array.from(track.children);
    items.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.clone = "";
      $$("img[data-fallback]", clone).forEach(attachLogoFallback);
      track.append(clone);
    });
    track.style.setProperty("--marquee-dur", `${Math.max(12, items.length * secondsPerItem)}s`);
    if (!reducedMotion) track.classList.add("is-ready");
  };

  /* ---------- Partner-Laufband: Logos aus assets/img/partner-logos/ ---------- */
  async function initPartnerLogos() {
    const marquee = $("[data-logo-folder]");
    const track = marquee && $("[data-marquee-track]", marquee);
    if (!track) return;
    startLoop(track, 3.4);

    const files = await listImageFolder(marquee.dataset.logoFolder);
    if (!files || !files.length) return;

    const folderItems = files.map((file) => {
      const li = document.createElement("li");
      const img = document.createElement("img");
      img.src = fileUrl(marquee.dataset.logoFolder, file);
      img.alt = nameFromFile(file);
      img.loading = "lazy";
      img.dataset.fallback = "";
      li.append(img);
      return li;
    });
    // Platzhalter aus dem HTML nur behalten, wenn es (noch) keine Datei für den Partner gibt
    const inFolder = new Set(folderItems.map((li) => slugify(li.firstChild.alt)));
    const placeholders = Array.from(track.children).filter((li) => {
      if (li.hasAttribute("data-clone")) return false;
      const label = $("img", li)?.alt || li.textContent;
      return !inFolder.has(slugify(label));
    });

    track.replaceChildren(...folderItems, ...placeholders);
    folderItems.forEach((li) => attachLogoFallback(li.firstChild));
    startLoop(track, 3.4);
  }

  /* ---------- Mini-Deal-Kacheln: Bilder aus assets/img/deal-tiles/ (technik.jpg …) ---------- */
  async function initDealTiles() {
    const row = $("[data-tile-folder]");
    if (!row) return;
    const folder = row.dataset.tileFolder;
    const tiles = $$(".mini-deal", row);

    const setImage = (tile, path) => {
      // absolute URL: url() in CSS-Variablen würde sonst relativ zum Stylesheet aufgelöst
      const url = new URL(path, document.baseURI).href;
      const pic = $(".mini-deal__img", tile);
      const probe = new Image();
      probe.onload = () => {
        pic.style.setProperty("--tile-img", `url("${url}")`);
        pic.classList.add("has-img");
        // Kopien im Laufband mitziehen
        $$(`[data-clone][data-tile="${tile.dataset.tile}"] .mini-deal__img`, row).forEach((clone) => {
          clone.style.setProperty("--tile-img", `url("${url}")`);
          clone.classList.add("has-img");
        });
      };
      probe.src = url;
    };

    startLoop(row, 5.6);
    const files = await listImageFolder(folder);

    if (files) {
      const bySlug = new Map(files.map((f) => [slugify(f.replace(IMAGE_FILE, "")), f]));
      tiles.forEach((tile) => {
        const file = bySlug.get(tile.dataset.tile);
        if (file) setImage(tile, fileUrl(folder, file));
      });
      // weitere Bilder im Ordner werden zu zusätzlichen Kacheln
      const known = new Set(tiles.map((t) => t.dataset.tile));
      const extras = files.filter((f) => !known.has(slugify(f.replace(IMAGE_FILE, ""))));
      if (extras.length) {
        extras.forEach((file, n) => {
          const tile = document.createElement("span");
          tile.className = `mini-deal${(tiles.length + n) % 2 ? " is-low" : ""}`;
          tile.dataset.tile = slugify(file.replace(IMAGE_FILE, ""));
          tile.innerHTML = '<i class="mini-deal__img"></i><b></b>';
          $("b", tile).textContent = nameFromFile(file);
          $$("[data-clone]", row).forEach((c) => c.remove());
          row.append(tile);
          tiles.push(tile);
        });
        startLoop(row, 5.6);
        extras.forEach((file) => setImage(tiles.find((t) => t.dataset.tile === slugify(file.replace(IMAGE_FILE, ""))), fileUrl(folder, file)));
      }
    } else {
      // weder Manifest noch Listing: Standardnamen direkt probieren (technik.jpg, …)
      tiles.forEach((tile) => {
        const exts = ["jpg", "jpeg", "png", "webp"];
        const tryNext = (k) => {
          if (k >= exts.length) return;
          const url = `${folder}${tile.dataset.tile}.${exts[k]}`;
          const probe = new Image();
          probe.onload = () => setImage(tile, url);
          probe.onerror = () => tryNext(k + 1);
          probe.src = url;
        };
        tryNext(0);
      });
    }
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

  /* ---------- Cursor-Follow ohne Grenzen: Elemente neigen sich zum Cursor, wandern leicht mit, Lichtreflex ----------
     Beobachtet wird das ganze Fenster, nicht nur die Fläche des Elements. Die Neigung ergibt sich aus der Lage
     des Cursors zur Mitte des Elements (normiert auf einen Teil der Fenstergröße, „reach“); der Lichtreflex sitzt
     unter dem Cursor und wird mit Abstand schwächer. Verlässt die Maus das Fenster, richtet sich alles auf.
     stage:  Element, das gekippt wird (bekommt --rx, --ry, --tx, --ty, --gx, --gy, --glare)
     center: () => {x, y} – Bezugspunkt (Standard: Mitte des Elements)
     Pro Frame weich nachgeführt (lerp); gerechnet wird nur für sichtbare Elemente. Liegt der Fokus im
     Element (z. B. beim Tippen im Formular), hält es weitgehend still. */
  const tilts = [];
  let pointer = null;
  const tiltTick = (t) => {
    const c = t.current;
    const g = t.target;
    c.x += (g.x - c.x) * 0.09;
    c.y += (g.y - c.y) * 0.09;
    c.glare += (g.glare - c.glare) * 0.08;
    c.gx += (g.gx - c.gx) * 0.14;
    c.gy += (g.gy - c.gy) * 0.14;
    const st = t.stage.style;
    st.setProperty("--ry", `${(c.x * t.ry).toFixed(2)}deg`);
    st.setProperty("--rx", `${(-c.y * t.rx).toFixed(2)}deg`);
    st.setProperty("--tx", `${(c.x * t.tx).toFixed(1)}px`);
    st.setProperty("--ty", `${(c.y * t.ty).toFixed(1)}px`);
    st.setProperty("--gx", `${c.gx.toFixed(1)}%`);
    st.setProperty("--gy", `${c.gy.toFixed(1)}%`);
    st.setProperty("--glare", c.glare.toFixed(3));
    const moving =
      Math.abs(g.x - c.x) > 0.0005 || Math.abs(g.y - c.y) > 0.0005 || Math.abs(g.glare - c.glare) > 0.002 ||
      Math.abs(g.gx - c.gx) > 0.05 || Math.abs(g.gy - c.gy) > 0.05;
    t.frame = moving ? requestAnimationFrame(() => tiltTick(t)) : 0;
  };
  const tiltAim = (t) => {
    const g = t.target;
    if (!pointer) {
      g.x = g.y = g.glare = 0;
    } else {
      const r = t.stage.getBoundingClientRect();
      // Mitte ohne die eigene Mitbewegung, sonst läuft das Element dem Cursor davon
      const ctr = t.center
        ? t.center()
        : { x: r.left + r.width / 2 - t.current.x * t.tx, y: r.top + r.height / 2 - t.current.y * t.ty };
      const damp = t.stage.matches(":focus-within") ? 0.3 : 1;
      g.x = clamp((pointer.x - ctr.x) / (window.innerWidth * t.reach), -1, 1) * damp;
      g.y = clamp((pointer.y - ctr.y) / (window.innerHeight * t.reach), -1, 1) * damp;
      const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
      const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
      g.glare = 1 - 0.75 * clamp(Math.hypot(dx, dy) / 480, 0, 1);
      g.gx = clamp(((pointer.x - r.left) / (r.width || 1)) * 100, -30, 130);
      g.gy = clamp(((pointer.y - r.top) / (r.height || 1)) * 100, -30, 130);
    }
    if (!t.frame) t.frame = requestAnimationFrame(() => tiltTick(t));
  };
  const listenTilts = () => {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
        pointer = { x: e.clientX, y: e.clientY };
        tilts.forEach((t) => {
          if (t.onMove) t.onMove(e);
          if (t.visible) tiltAim(t);
        });
      },
      { passive: true }
    );
    const away = () => {
      pointer = null;
      tilts.forEach(tiltAim);
    };
    document.documentElement.addEventListener("pointerleave", away);
    window.addEventListener("blur", away);
    // beim Scrollen wandern die Elemente unter dem ruhenden Cursor weiter
    scrollTasks.push(() => pointer && tilts.forEach((t) => t.visible && tiltAim(t)));
  };
  function createTilt({ stage, center, rx = 7, ry = 11, tx = 22, ty = 12, reach = 0.42, onMove }) {
    if (!finePointer || reducedMotion || !stage) return;
    const t = {
      stage, center, rx, ry, tx, ty, reach, onMove,
      visible: !hasIO,
      frame: 0,
      target: { x: 0, y: 0, glare: 0, gx: 50, gy: 35 },
      current: { x: 0, y: 0, glare: 0, gx: 50, gy: 35 },
    };
    tilts.push(t);
    if (tilts.length === 1) listenTilts();
    if (hasIO)
      new IntersectionObserver(
        ([e]) => {
          t.visible = e.isIntersecting;
          if (t.visible && pointer) tiltAim(t);
        },
        { rootMargin: "120px 0px" }
      ).observe(stage);
  }

  /* ---------- Hero: Lichtkegel, Cursor-Follow, Aufrichten beim Scrollen ---------- */
  function initHero() {
    const hero = $("[data-hero]");
    const spot = $("[data-spot]");
    const visual = $("[data-tilt]");
    const stage = $("[data-tilt-stage]");
    if (!hero) return;

    // Unterseiten: nur der Lichtkegel folgt dem Cursor (im ganzen Fenster)
    if (!visual || !stage) {
      if (finePointer && spot && !reducedMotion) {
        window.addEventListener(
          "pointermove",
          (e) => {
            const r = hero.getBoundingClientRect();
            if (r.bottom < 0) return;
            spot.style.setProperty("--sx", `${e.clientX - r.left}px`);
            spot.style.setProperty("--sy", `${e.clientY - r.top}px`);
          },
          { passive: true }
        );
      }
      return;
    }

    if (reducedMotion) {
      stage.style.setProperty("--p", "1");
      return;
    }

    createTilt({
      stage,
      // im Hero relativ zur Fenstermitte: volle Bewegung über die ganze Seite
      center: () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
      reach: 0.5,
      onMove: (e) => {
        const r = hero.getBoundingClientRect();
        spot.style.setProperty("--sx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--sy", `${e.clientY - r.top}px`);
      },
    });

    scrollTasks.push(() => {
      const top = visual.getBoundingClientRect().top;
      const vh = window.innerHeight;
      const p = clamp((vh - top) / (vh * 0.7), 0, 1);
      stage.style.setProperty("--p", p.toFixed(3));
    });
  }

  /* ---------- Live-Vorschau: Portal folgt dem Cursor wie im Hero ---------- */
  function initStudioTilt() {
    const body = $("[data-studio-body]");
    const stage = $("[data-studio-stage]");
    if (!body || !stage) return;
    createTilt({
      stage,
      rx: 6,
      ry: 9,
      tx: 14,
      ty: 8,
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

  /* ---------- Tabs mit Auto-Play (Lösungen, Showcases, Rabatt-Explorer …) ---------- */
  function initTabs() {
    $$("[data-tabs]").forEach(initTabGroup);
  }
  function initTabGroup(root) {
    const list = $('[role="tablist"]', root);
    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    let current = Math.max(0, tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"));
    let autoplay = !reducedMotion && root.dataset.autoplay !== "false";
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
      if (autoplay && e.animationName === "progress" && e.target.closest("[data-tabs]") === root) select(current + 1);
    });
    // Wer im Inhalt eines Bereichs klickt oder tippt, will dort bleiben: kein automatisches Weiterschalten mehr
    panels.forEach((panel) =>
      panel.addEventListener("pointerdown", () => {
        if (!autoplay) return;
        autoplay = false;
        restartProgress();
      })
    );

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
    const roots = $$(".vp-theme:not([data-theme-local])");
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

  /* ==========================================================================
     Bausteine der Unterseiten
     ========================================================================== */
  const euro = (v, digits = 2) =>
    v.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });

  // Zahl weich von alt nach neu zählen
  const tweenText = (el, to, format, duration = 650) => {
    const from = Number(el.dataset.value || 0);
    el.dataset.value = String(to);
    if (reducedMotion || from === to) {
      el.textContent = format(to);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(from + (to - from) * eased);
      if (t < 1 && el.dataset.value === String(to)) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Karten, die dem Cursor folgen (Hero-Bilder, Gutscheine) ---------- */
  function initTiltCards() {
    $$("[data-tilt-card]").forEach((card) => {
      createTilt({
        stage: card,
        rx: Number(card.dataset.rx || 6),
        ry: Number(card.dataset.ry || 9),
        tx: Number(card.dataset.tx || 10),
        ty: Number(card.dataset.ty || 6),
      });
    });
  }

  /* ---------- Schwebende Tags: passende Icon-Animation beim Darüberfahren (CSS: [data-anim]) ---------- */
  const TAG_ANIMS = {
    handshake: "shake", ticket: "shake", megaphone: "shake", chat: "shake",
    flag: "wave",
    settings: "spin",
    percent: "turn",
    star: "twinkle", sparkles: "twinkle",
    trophy: "bounce", award: "bounce", users: "bounce", user: "bounce", "user-plus": "bounce", coins: "bounce", wallet: "bounce", piggy: "bounce",
    gift: "jump", cake: "jump",
    heart: "beat",
    target: "pulse",
    tag: "swing",
    check: "draw", trending: "draw", wifi: "draw", activity: "draw",
    plane: "fly", send: "fly",
    mail: "slide", car: "slide",
    calendar: "flip",
    eye: "blink",
    zap: "flash",
  };
  function initTagAnims() {
    $$(".chip-float, .float--stat, .float--tag").forEach((tag) => {
      if (tag.dataset.anim) return;
      const use = $("use", tag);
      const icon = use ? (use.getAttribute("href") || "").replace("#i-", "") : "";
      tag.dataset.anim = TAG_ANIMS[icon] || "pop";
    });
  }

  /* ---------- Scroll-Parallax: Bilder neben Text driften beim Scrollen leicht hinter der Seite her ----------
     Setzt --sy (px) auf [data-parallax]; die Bühnen rechnen es in ihr transform ein. Wert = Ausschlag in px. */
  function initParallax() {
    const els = $$("[data-parallax]");
    if (!els.length || reducedMotion) return;
    scrollTasks.push(() => {
      const vh = window.innerHeight;
      els.forEach((el) => {
        // am unbewegten Elternelement messen, sonst schaukelt sich der Versatz auf
        const r = el.parentElement.getBoundingClientRect();
        if (!r.height || r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
        const p = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
        el.style.setProperty("--sy", `${(-p * (Number(el.dataset.parallax) || 32)).toFixed(1)}px`);
      });
    });
  }

  /* ---------- Bild-Karussell mit Überblendung (Screenshots, Kundenportale) ---------- */
  function initShots() {
    $$("[data-shots]").forEach((root) => {
      const items = $$(".shots__item", root);
      const dots = $(".shots__dots", root);
      if (items.length < 2) return;
      let index = 0;
      let timer = 0;
      let hover = false;
      let visible = false;
      const buttons = items.map((item, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", item.dataset.label || `Bild ${i + 1}`);
        b.addEventListener("click", () => {
          go(i);
          restart();
        });
        dots && dots.append(b);
        return b;
      });
      const go = (i) => {
        index = (i + items.length) % items.length;
        items.forEach((item, k) => item.classList.toggle("is-active", k === index));
        buttons.forEach((b, k) => b.setAttribute("aria-current", k === index ? "true" : "false"));
        const label = $(".shots__label", root);
        if (label) label.textContent = items[index].dataset.label || "";
      };
      const restart = () => {
        clearInterval(timer);
        if (!reducedMotion && visible && !hover) timer = setInterval(() => go(index + 1), Number(root.dataset.interval || 3600));
      };
      root.addEventListener("pointerenter", () => ((hover = true), restart()));
      root.addEventListener("pointerleave", () => ((hover = false), restart()));
      if (hasIO) new IntersectionObserver(([e]) => ((visible = e.isIntersecting), restart())).observe(root);
      go(0);
    });
  }

  /* ---------- Schritte: Linie füllt sich beim Scrollen ---------- */
  function initSteps() {
    $$("[data-steps]").forEach((root) => {
      const steps = $$(".step", root);
      if (reducedMotion) {
        root.style.setProperty("--p", "1");
        steps.forEach((s) => s.classList.add("is-on"));
        return;
      }
      scrollTasks.push(() => {
        const r = root.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25), 0, 1);
        root.style.setProperty("--p", p.toFixed(3));
        steps.forEach((s, i) => s.classList.toggle("is-on", p >= (i + 0.35) / steps.length));
      });
    });
  }

  /* ---------- Hotspots auf dem Portal-Mockup (mit kleinen Live-Demos) ---------- */
  const demoLogo = (text = "IHR LOGO") =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 52"><rect x="1.5" y="1.5" width="197" height="49" rx="12" fill="none" stroke="#1c87b8" stroke-width="3" stroke-dasharray="7 6"/><text x="100" y="34" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="22" fill="#1c87b8">${text}</text></svg>`
    );
  // Kategorien je Creator-Thema (Demo „Kategorien passend zu Deinem Content“)
  const CREATOR_CATS = [
    ["Highlights", "Fitness", "Supplements", "Sportmode", "Recovery", "Outdoor", "Ernährung", "Gadgets"],
    ["Highlights", "Reisen", "Kamera", "Gepäck", "Outdoor", "Hotels", "Mobilität", "Technik"],
    ["Highlights", "Gaming", "Technik", "Audio", "Setup", "Streaming", "Snacks", "Merch"],
    ["Highlights", "Beauty", "Skincare", "Fashion", "Wellness", "Düfte", "Schmuck", "Lifestyle"],
  ];
  function initHotspots() {
    $$("[data-hotspots]").forEach((root) => {
      const theme = $("[data-theme-local]", root);
      const spots = $$("[data-spot]", root);
      const pins = $$("[data-pin]", root);
      const logo = theme && $(".vp__logo-custom", theme);
      const emptyLogo = logo && logo.getAttribute("src");
      const logoSrc = demoLogo(root.dataset.logoText);
      const allCats = theme ? $$(".vp__cats i", theme) : [];
      const cats = allCats.slice(0, -1);
      const more = allCats[allCats.length - 1];
      const catTexts = cats.map((c) => c.textContent);
      let catGen = 0;
      // Kategorien weich austauschen: nacheinander ausblenden, Text tauschen (unsichtbar), nacheinander einblenden
      const swapCats = (texts) => {
        const gen = ++catGen;
        if (!cats[0] || !cats[0].animate) return cats.forEach((c, i) => (c.textContent = texts[i]));
        cats.forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
        const outs = cats.map((c, i) =>
          c.animate(
            [{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(-40%)", filter: "blur(2px)" }],
            { duration: 240, delay: i * 30, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
          )
        );
        Promise.all(outs.map((a) => a.finished))
          .then(() => {
            if (gen !== catGen) return;
            // „Alle Kategorien“ bleibt sichtbar: gleitet an seine neue Position statt zu springen
            const from = more.getBoundingClientRect().left;
            more.getAnimations().forEach((a) => a.cancel());
            cats.forEach((c, i) => (c.textContent = texts[i]));
            const dx = from - more.getBoundingClientRect().left;
            if (Math.abs(dx) > 0.5)
              more.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
            cats.forEach((c, i) => {
              c.animate(
                [{ opacity: 0, transform: "translateY(40%)", filter: "blur(2px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
                { duration: 420, delay: i * 45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
              );
            });
            outs.forEach((a) => a.cancel());
          })
          .catch(() => {});
      };
      let active = "";
      let demoTimer = 0;
      let autoTimer = 0;
      let auto = !reducedMotion;
      let visible = false;

      const reset = () => {
        clearInterval(demoTimer);
        if (!theme) return;
        theme.style.removeProperty("--btn");
        theme.dataset.btnTone = "dark";
        theme.dataset.bg = "image";
        theme.dataset.stageTone = "light";
        theme.dataset.logo = "default";
        if (logo) logo.src = emptyLogo;
        theme.classList.remove("is-demo-deals");
        if (theme.classList.contains("is-demo-cats")) {
          theme.classList.remove("is-demo-cats");
          swapCats(catTexts);
        }
      };
      const demos = {
        logo: () => {
          logo.src = logoSrc;
          theme.dataset.logo = "custom";
        },
        farben: () => {
          const colors = ["#e30613", "#00965e", "#7b2cbf", "#ff7a00", "#1c87b8"];
          let k = 0;
          const tick = () => {
            const c = colors[k++ % colors.length];
            theme.style.setProperty("--btn", c);
            theme.dataset.btnTone = toneOf(c);
          };
          tick();
          demoTimer = setInterval(tick, 1100);
        },
        hintergrund: () => {
          const bgs = ["gradient", "solid", "image"];
          let k = 0;
          const tick = () => {
            const bg = bgs[k++ % bgs.length];
            theme.dataset.bg = bg;
            theme.dataset.stageTone = bg === "gradient" ? "dark" : "light";
          };
          tick();
          demoTimer = setInterval(tick, 1500);
        },
        deals: () => theme.classList.add("is-demo-deals"),
        kategorien: () => {
          let k = 0;
          theme.classList.add("is-demo-cats");
          const tick = () => {
            const set = CREATOR_CATS[k++ % CREATOR_CATS.length];
            swapCats(cats.map((c, i) => set[i] || catTexts[i]));
          };
          tick();
          demoTimer = setInterval(tick, 2400);
        },
      };
      const activate = (key) => {
        if (key === active) return;
        active = key;
        reset();
        spots.forEach((s) => {
          const on = s.dataset.spot === key;
          s.classList.toggle("is-active", on);
          s.setAttribute("aria-pressed", String(on));
        });
        pins.forEach((p) => p.classList.toggle("is-active", p.dataset.pin === key));
        if (theme && !reducedMotion && demos[key]) demos[key]();
      };
      const stopAuto = () => {
        auto = false;
        clearInterval(autoTimer);
      };
      const startAuto = () => {
        clearInterval(autoTimer);
        if (!auto || !visible) return;
        autoTimer = setInterval(() => {
          const keys = spots.map((s) => s.dataset.spot);
          activate(keys[(keys.indexOf(active) + 1) % keys.length]);
        }, 3400);
      };

      spots.forEach((s) => {
        s.addEventListener("click", () => (stopAuto(), activate(s.dataset.spot)));
        s.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && (stopAuto(), activate(s.dataset.spot)));
        s.addEventListener("focus", () => (stopAuto(), activate(s.dataset.spot)));
      });
      pins.forEach((p) => p.addEventListener("click", () => (stopAuto(), activate(p.dataset.pin))));
      if (hasIO) new IntersectionObserver(([e]) => ((visible = e.isIntersecting), startAuto())).observe(root);
      activate(spots[0].dataset.spot);
    });
  }

  /* ---------- SELECT-Gutschein: Konfigurator + Vorschau ---------- */
  const MOTIFS = {
    geburtstag: { title: "Alles Gute zum Geburtstag", greeting: "Herzlichen Glückwunsch zum Geburtstag – feiern Sie schön!", icon: "i-cake", accents: ["i-gift", "i-sparkles"] },
    weihnachten: { title: "Frohe Weihnachten", greeting: "Danke für Ihren Einsatz in diesem Jahr. Frohe Festtage!", icon: "i-tree", accents: ["i-star", "i-gift"] },
    jubilaeum: { title: "Herzlichen Glückwunsch zum Jubiläum", greeting: "Danke für viele gemeinsame Jahre!", icon: "i-award", accents: ["i-star", "i-sparkles"] },
    praemie: { title: "Danke für Ihre Idee", greeting: "Ihre Idee hat uns weitergebracht – vielen Dank!", icon: "i-bulb", accents: ["i-zap", "i-star"] },
    hochzeit: { title: "Alles Gute zur Hochzeit", greeting: "Herzlichen Glückwunsch zu Ihrem großen Tag!", icon: "i-heart", accents: ["i-sparkles", "i-gift"] },
    projekt: { title: "Danke für Ihren Projekteinsatz", greeting: "Herzlichen Dank für Ihren Einsatz im Projekt!", icon: "i-target", accents: ["i-star", "i-trending"], cycle: false },
    // Kundengutscheine (Kundenbindung) – nicht im wechselnden Seitenkopf der Mitarbeiterbindung
    treue: { title: "Danke für Ihre Treue", greeting: "Danke, dass Sie uns vertrauen – suchen Sie sich etwas Schönes aus!", icon: "i-heart", accents: ["i-star", "i-sparkles"], cycle: false },
    willkommen: { title: "Herzlich willkommen", greeting: "Schön, dass Sie da sind! Ihr Willkommensgeschenk wartet.", icon: "i-gift", accents: ["i-sparkles", "i-star"], cycle: false },
    gewinn: { title: "Sie haben gewonnen!", greeting: "Herzlichen Glückwunsch zu Ihrem Gewinn – viel Freude damit!", icon: "i-ticket", accents: ["i-star", "i-zap"], cycle: false },
    kulanz: { title: "Wir machen es wieder gut", greeting: "Danke für Ihre Geduld – dieser Gutschein ist unser Dankeschön.", icon: "i-chat", accents: ["i-heart", "i-sparkles"], cycle: false },
    sachbezug: { title: "Ihr monatlicher Sachbezug", greeting: "Ihr steuerfreier Sachbezug für diesen Monat – viel Freude damit!", icon: "i-banknote", accents: ["i-coins", "i-wallet"], cycle: false },
  };

  // Deko-QR-Code (nicht scannbar): drei Suchmuster + Muster aus dem Gutscheincode
  const drawQR = (svg, seed) => {
    const N = 21;
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const finder = (x, y) => x < 7 && y < 7;
    const inFinder = (x, y) => finder(x, y) || finder(N - 1 - x, y) || finder(x, N - 1 - y);
    let d = "";
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (inFinder(x, y)) continue;
        if (rand() > 0.52) d += `M${x} ${y}h1v1h-1z`;
      }
    const ring = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
    svg.setAttribute("viewBox", `-1 -1 ${N + 2} ${N + 2}`);
    svg.innerHTML = `<path fill-rule="evenodd" d="${ring(0, 0)}${ring(N - 7, 0)}${ring(0, N - 7)}${d}"/>`;
  };

  function initVouchers() {
    const validUntil = `31.12.${new Date().getFullYear() + 3}`;
    $$("[data-voucher]").forEach((root) => {
      const card = root.matches("[data-v-card]") ? root : $("[data-v-card]", root);
      const out = (key) => $$(`[data-v-out="${key}"]`, root);
      const set = (key, text) => out(key).forEach((el) => (el.textContent = text));
      const state = { motif: card.dataset.motif || "geburtstag", value: 50, name: "Henry Henryson", greeting: "", format: card.dataset.format || "pdf" };
      const codeFor = (name) => {
        let n = 0;
        for (const ch of name) n = (n * 31 + ch.charCodeAt(0)) % 100000000;
        const digits = String(n).padStart(8, "0");
        return `SBS0006-${digits.slice(0, 4)}-${digits.slice(4)}-1904`;
      };

      const render = () => {
        const motif = MOTIFS[state.motif] || MOTIFS.geburtstag;
        card.dataset.motif = state.motif;
        card.dataset.format = state.format;
        set("title", motif.title);
        set("value", euro(state.value));
        set("name", state.name || "Ihr Name");
        set("greeting", state.greeting || motif.greeting);
        set("valid", validUntil);
        const code = codeFor(state.name || "x");
        set("code", code);
        $$("[data-v-icon]", root).forEach((use) => use.setAttribute("href", `#${motif.icon}`));
        $$("[data-v-accent]", root).forEach((use) => use.setAttribute("href", `#${motif.accents[use.dataset.vAccent]}`));
        $$("[data-qr]", root).forEach((svg) => drawQR(svg, code));
        $$("[data-v-csv-first]", root).forEach((row) => {
          row.cells[0].textContent = state.name || "Ihr Name";
          row.cells[1].textContent = euro(state.value);
          row.cells[2].textContent = code;
        });
        $$("[data-v-csv-value]", root).forEach((cell) => (cell.textContent = euro(state.value)));
        root.querySelectorAll("[data-v-motif]").forEach((b) => {
          const on = b.dataset.vMotif === state.motif;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-checked", String(on));
        });
        root.querySelectorAll("[data-v-format]").forEach((b) => {
          const on = b.dataset.vFormat === state.format;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-checked", String(on));
        });
      };

      root.querySelectorAll("[data-v-motif]").forEach((b, i, all) => {
        b.addEventListener("click", () => {
          state.motif = b.dataset.vMotif;
          state.greeting = "";
          const g = $("[data-v-greeting]", root);
          if (g) g.value = "";
          render();
          card.classList.remove("is-swap");
          void card.offsetWidth;
          card.classList.add("is-swap");
        });
        b.addEventListener("keydown", (e) => arrowNav([...all], i, e));
      });
      root.querySelectorAll("[data-v-format]").forEach((b, i, all) => {
        b.addEventListener("click", () => ((state.format = b.dataset.vFormat), render()));
        b.addEventListener("keydown", (e) => arrowNav([...all], i, e));
      });
      const value = $("[data-v-value]", root);
      if (value) {
        const sync = () => {
          state.value = Number(value.value);
          value.style.setProperty("--fill", `${((value.value - value.min) / (value.max - value.min)) * 100}%`);
          render();
        };
        value.addEventListener("input", sync);
        sync();
      }
      const name = $("[data-v-name]", root);
      if (name) name.addEventListener("input", () => ((state.name = name.value.trim()), render()));
      const greeting = $("[data-v-greeting]", root);
      if (greeting) greeting.addEventListener("input", () => ((state.greeting = greeting.value.trim()), render()));

      // Legende ↔ Bereiche auf dem Gutschein
      $$("[data-v-spot]", root).forEach((spot) => {
        const parts = () => $$(`[data-v-part~="${spot.dataset.vSpot}"]`, root);
        const on = () => parts().forEach((p) => p.classList.add("is-lit"));
        const off = () => parts().forEach((p) => p.classList.remove("is-lit"));
        spot.addEventListener("pointerenter", on);
        spot.addEventListener("pointerleave", off);
        spot.addEventListener("focusin", on);
        spot.addEventListener("focusout", off);
      });

      // von außen steuerbar (Anlass-Finder)
      root.voucherSet = (patch) => {
        Object.assign(state, patch);
        render();
        card.classList.remove("is-swap");
        void card.offsetWidth;
        card.classList.add("is-swap");
      };

      // Wechselnde Motive (z. B. im Hero), solange niemand eingreift
      if (root.hasAttribute("data-voucher-cycle") && !reducedMotion) {
        const keys = Object.keys(MOTIFS).filter((k) => MOTIFS[k].cycle !== false);
        let k = Math.max(0, keys.indexOf(state.motif));
        let paused = false;
        root.addEventListener("pointerenter", () => (paused = true));
        root.addEventListener("pointerleave", () => (paused = false));
        setInterval(() => {
          if (paused || document.hidden) return;
          state.motif = keys[++k % keys.length];
          render();
          card.classList.remove("is-swap");
          void card.offsetWidth;
          card.classList.add("is-swap");
        }, 2800);
      }
      render();
    });
  }

  // Links mit data-pick-motif setzen das Motiv im Gutschein-Gestalter, auf den sie zeigen
  function initMotifLinks() {
    $$("[data-pick-motif]").forEach((link) =>
      link.addEventListener("click", () => {
        const target = document.getElementById((link.getAttribute("href") || "").slice(1));
        const conf = target && $(".vconf[data-voucher]", target);
        if (conf && conf.voucherSet) conf.voucherSet({ motif: link.dataset.pickMotif, greeting: "" });
      })
    );
  }

  /* ---------- Markenplatzierung: So erscheint Ihre Marke ---------- */
  function initPlacement() {
    $$("[data-placement]").forEach((root) => {
      const brand = $("[data-pl-brand]", root);
      const offer = $("[data-pl-offer]", root);
      const cats = $$("[data-pl-cat]", root);
      const views = $$("[data-pl-view]", root);
      const ICONS = { technik: "i-zap", mode: "i-shirt", reisen: "i-plane", sport: "i-activity", wohnen: "i-home" };
      const URLS = { start: "mitarbeiter.vorteile.net", kategorie: "mitarbeiter.vorteile.net/kategorie", newsletter: "Posteingang – Deals der Woche" };
      const state = { cat: root.dataset.cat || "technik", view: root.dataset.view || "start" };
      const set = (key, text) => $$(`[data-pl-out="${key}"]`, root).forEach((el) => (el.textContent = text));
      const pulse = () => {
        root.classList.remove("is-swap");
        void root.offsetWidth;
        root.classList.add("is-swap");
      };
      const render = () => {
        const cat = cats.find((c) => c.dataset.plCat === state.cat) || cats[0];
        root.dataset.cat = state.cat;
        root.dataset.view = state.view;
        set("brand", brand.value.trim() || "Ihre Marke");
        set("offer", offer.value.trim() || "20 %");
        set("desc", cat.dataset.plDesc);
        set("catname", cat.textContent.trim());
        $$("[data-pl-icon]", root).forEach((u) => u.setAttribute("href", `#${ICONS[state.cat]}`));
        $$(".plk__art use, .nlm__art use", root).forEach((u) => u.setAttribute("href", `#${ICONS[state.cat]}`));
        const url = $("[data-pl-url]", root);
        if (url) url.textContent = URLS[state.view];
        markRadio(cats, cat);
        markRadio(views, views.find((v) => v.dataset.plView === state.view));
      };
      brand.addEventListener("input", render);
      offer.addEventListener("input", render);
      cats.forEach((c, i) => {
        c.addEventListener("click", () => ((state.cat = c.dataset.plCat), render(), pulse()));
        c.addEventListener("keydown", (e) => arrowNav(cats, i, e));
      });
      views.forEach((v, i) => {
        v.addEventListener("click", () => ((state.view = v.dataset.plView), render()));
        v.addEventListener("keydown", (e) => arrowNav(views, i, e));
      });
      render();
    });
  }

  /* ---------- Newsletter-Pakete mit Kampagnen-Zeitplan ---------- */
  function initPackages() {
    $$("[data-packages]").forEach((root) => {
      const cards = $$("[data-pk]", root);
      const chart = $("[data-pk-chart]", root);
      const spread = (n, w) => Array.from({ length: n }, (_, i) => Math.min(w, Math.floor(((i + 0.5) * w) / n) + 1));
      const lane = (name, cols) => {
        const track = $(`[data-lane="${name}"] .pkt__track`, chart);
        track.replaceChildren(
          ...cols.map(([start, span], n) => {
            const i = document.createElement("i");
            i.style.gridColumn = `${start} / span ${span}`;
            i.style.setProperty("--n", n);
            return i;
          })
        );
      };
      const render = (card) => {
        markRadio(cards, card);
        const m = Number(card.dataset.months);
        const w = Math.round((m * 52) / 12);
        chart.style.setProperty("--w", w);
        chart.style.setProperty("--m", m);
        $$(".pkt__track", chart).forEach((t) => t.style.setProperty("--w", w));
        lane("list", [[1, w]]);
        lane("start", spread(Number(card.dataset.start), w).map((s) => [s, 1]));
        lane("nl", spread(Number(card.dataset.nl), w).map((s) => [s, 1]));
        lane("banner", spread(Number(card.dataset.banner), w).map((s) => [Math.min(w, s + 1), 1]));
        const months = $(".pkt__months", chart);
        months.style.setProperty("--m", m);
        months.replaceChildren(
          ...Array.from({ length: m }, (_, i) => {
            const s = document.createElement("span");
            s.textContent = m > 12 && i % 3 ? "" : `M${i + 1}`;
            return s;
          })
        );
        $$('[data-pk-out="name"]', root).forEach((el) => (el.textContent = $(".pk__name", card).textContent));
        $$('[data-pk-out="months"]', root).forEach((el) => (el.textContent = m));
      };
      cards.forEach((c, i) => {
        c.addEventListener("click", () => render(c));
        c.addEventListener("keydown", (e) => arrowNav(cards, i, e));
      });
      render(cards.find((c) => c.classList.contains("is-on")) || cards[0]);
    });
  }

  /* ---------- Einnahmen im Vergleich: Brand Deals vs. Community-Shop ---------- */
  function initEarnings() {
    $$("[data-earn]").forEach((root) => {
      const btns = $$("[data-earn-mode]", root);
      let touched = false;
      const set = (mode) => {
        root.dataset.mode = mode;
        btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.earnMode === mode)));
      };
      btns.forEach((b) => b.addEventListener("click", () => ((touched = true), set(b.dataset.earnMode))));
      if (hasIO && !reducedMotion) {
        const io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io.disconnect();
            setTimeout(() => !touched && set("shop"), 1600);
          },
          { threshold: 0.5 }
        );
        io.observe(root);
      }
    });
  }

  /* ---------- Kontaktkalender: ohne / mit Kundenrabatten ---------- */
  function initTouchpoints() {
    $$("[data-touchpoints]").forEach((root) => {
      const btns = $$("[data-tp-mode]", root);
      const count = $("[data-tp-count]", root);
      const pos = $("[data-tp-pos]", root);
      const admin = Number(count.dataset.admin);
      const plus = Number(count.dataset.plus);
      let touched = false;
      const set = (mode) => {
        root.dataset.mode = mode;
        btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tpMode === mode)));
        tweenText(count, mode === "mit" ? admin + plus : admin, (v) => String(Math.round(v)));
        tweenText(pos, mode === "mit" ? plus : 0, (v) => String(Math.round(v)));
      };
      btns.forEach((b) => b.addEventListener("click", () => ((touched = true), set(b.dataset.tpMode))));
      // Beim ersten Sichtkontakt einmal von „ohne“ auf „mit“ umschalten
      if (hasIO && !reducedMotion) {
        const io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io.disconnect();
            setTimeout(() => !touched && set("mit"), 1400);
          },
          { threshold: 0.5 }
        );
        io.observe(root);
      }
    });
  }

  /* ---------- Anlass-Finder: Kachel wählen, Gutschein-Vorschau passt sich an ---------- */
  function initFinder() {
    $$("[data-finder]").forEach((root) => {
      const coupon = $("[data-voucher]", root);
      const cards = $$("[data-motif]", root).filter((el) => !el.matches("[data-v-card]"));
      if (!coupon || !coupon.voucherSet) return;
      const pick = (card) => {
        cards.forEach((c) => c.classList.toggle("is-on", c === card));
        if (coupon.voucherSet) coupon.voucherSet({ motif: card.dataset.motif, greeting: "" });
      };
      cards.forEach((card) => {
        card.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && pick(card));
        card.addEventListener("focus", () => pick(card));
      });
      if (cards[0]) pick(cards[0]);
    });
  }

  /* ---------- Gutschein einlösen: Nachbau des Portal-Checkouts ---------- */
  function initCheckout() {
    $$("[data-checkout]").forEach((root) => {
      const lines = $$(".pline", root);
      const adds = $$("[data-add-for]", root);
      const segs = $$("[data-code-seg]", root);
      const steps = $$("[data-psteps] li", root);
      const values = $$("[data-voucher-value]", root);
      const redeemBtn = $("[data-redeem]", root);
      const payBtn = $("[data-pay]", root);
      const done = $("[data-done]", root);
      const out = (key) => $(`[data-out="${key}"]`, root);
      const CODE = ["SBS", "0006", "1234", "5678", "1904"];
      const initial = lines.map((l) => l.hidden);
      let voucher = Number((values.find((v) => v.classList.contains("is-on")) || values[0]).dataset.voucherValue);
      let redeemed = false;
      let typing = 0;
      let touched = false;

      const setStep = (n) =>
        steps.forEach((li, i) => {
          li.classList.toggle("is-done", i < n - 1);
          li.classList.toggle("is-current", i === n - 1);
        });
      const totals = () => {
        const chosen = lines.filter((l) => !l.hidden);
        const subtotal = chosen.reduce((sum, l) => sum + Number(l.dataset.price), 0);
        const used = redeemed ? Math.min(subtotal, voucher) : 0;
        return { chosen, subtotal, used, pay: subtotal - used, rest: redeemed ? voucher - used : 0 };
      };
      const render = () => {
        const { chosen, subtotal, used, pay, rest } = totals();
        $("[data-cart-empty]", root).hidden = chosen.length > 0;
        adds.forEach((li) => (li.hidden = !lines.find((l) => l.dataset.product === li.dataset.addFor).hidden));
        const count = out("count");
        if (count.textContent !== String(chosen.length)) {
          count.textContent = chosen.length;
          count.classList.remove("is-bump");
          void count.offsetWidth;
          count.classList.add("is-bump");
          setTimeout(() => count.classList.remove("is-bump"), 300);
        }
        tweenText(out("subtotal"), subtotal, (v) => euro(v));
        $("[data-voucher-row]", root).hidden = !redeemed;
        out("voucher-label").textContent = `SELECT-Gutschein (${euro(voucher, 0)})`;
        tweenText(out("voucher"), used, (v) => `– ${euro(v)}`);
        tweenText(out("pay"), pay, (v) => euro(v));
        $("[data-rest-row]", root).hidden = !(redeemed && rest > 0 && chosen.length);
        tweenText(out("rest"), rest, (v) => euro(v));
        payBtn.disabled = !chosen.length;
        payBtn.textContent = chosen.length && pay <= 0 ? "Bestellung abschließen" : "Bezahlen";
        $$("[data-fact]", root).forEach((f) => {
          const k = f.dataset.fact;
          f.classList.toggle("is-lit", (k === "topup" && redeemed && pay > 0) || (k === "rest" && redeemed && rest > 0 && chosen.length > 0) || k === "tax");
        });
      };
      const apply = () => {
        redeemed = true;
        redeemBtn.disabled = true;
        redeemBtn.classList.add("is-done");
        redeemBtn.innerHTML = '<svg class="i i--sm" aria-hidden="true"><use href="#i-check"/></svg>Gutschein eingelöst';
        render();
      };
      const redeem = (instant = false) => {
        if (redeemed) return;
        clearTimeout(typing);
        redeemBtn.disabled = true;
        segs.forEach((s) => ((s.value = ""), s.classList.remove("is-filled")));
        if (instant || reducedMotion) {
          segs.forEach((s, i) => ((s.value = CODE[i]), s.classList.add("is-filled")));
          apply();
          return;
        }
        let i = 0;
        let j = 0;
        const tick = () => {
          segs[i].value = CODE[i].slice(0, ++j);
          if (j >= CODE[i].length) {
            segs[i].classList.add("is-filled");
            i += 1;
            j = 0;
          }
          typing = setTimeout(i < segs.length ? tick : apply, i < segs.length ? 55 : 240);
        };
        tick();
      };
      const unredeem = () => {
        clearTimeout(typing);
        redeemed = false;
        segs.forEach((s) => ((s.value = ""), s.classList.remove("is-filled")));
        redeemBtn.disabled = false;
        redeemBtn.classList.remove("is-done");
        redeemBtn.textContent = "Einlösen";
        render();
      };

      lines.forEach((line) =>
        $("[data-remove]", line).addEventListener("click", () => {
          touched = true;
          line.hidden = true;
          render();
        })
      );
      $$("[data-add]", root).forEach((btn) =>
        btn.addEventListener("click", () => {
          touched = true;
          lines.find((l) => l.dataset.product === btn.dataset.add).hidden = false;
          render();
        })
      );
      redeemBtn.addEventListener("click", () => ((touched = true), redeem()));
      $("[data-unredeem]", root).addEventListener("click", unredeem);
      values.forEach((v, i) => {
        v.addEventListener("click", () => {
          voucher = Number(v.dataset.voucherValue);
          markRadio(values, v);
          render();
        });
        v.addEventListener("keydown", (e) => arrowNav(values, i, e));
      });
      payBtn.addEventListener("click", () => {
        const { used, pay, rest } = totals();
        let text = redeemed ? `${euro(used)} mit dem SELECT-Gutschein bezahlt` : "Ohne Gutschein bezahlt";
        if (pay > 0) text += redeemed ? `, ${euro(pay)} zugezahlt.` : ` (${euro(pay)}).`;
        else text += ".";
        if (redeemed && rest > 0) text += ` Ihr Restguthaben von ${euro(rest)} bleibt erhalten.`;
        out("done-text").textContent = text;
        setStep(4);
        done.hidden = false;
        $("[data-restart]", root).focus({ preventScroll: true });
      });
      $("[data-restart]", root).addEventListener("click", () => {
        lines.forEach((l, i) => (l.hidden = initial[i]));
        done.hidden = true;
        setStep(2);
        unredeem();
        redeemBtn.focus({ preventScroll: true });
      });

      setStep(2);
      render();
      // Beim ersten Sichtkontakt tippt die Demo den Gutscheincode selbst ein
      if (hasIO && !reducedMotion) {
        const io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io.disconnect();
            setTimeout(() => !touched && redeem(), 700);
          },
          { threshold: 0.45 }
        );
        io.observe($(".pbox", root));
      }
    });
  }

  /* ---------- Links auf die aktuelle Seite (ohne Anker): weich nach oben statt neu laden ---------- */
  function initSelfLinks() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      const url = new URL(a.href, location.href);
      if (url.hash || url.href !== location.href.split("#")[0]) return;
      e.preventDefault();
      if (location.hash) history.pushState(null, "", url.pathname + url.search);
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Mitarbeiterbindung: Bereiche umschalten, Leiste an die Navigation andocken ---------- */
  function initMb() {
    const wrap = $("[data-mb-panels]");
    if (!wrap) return;
    const html = document.documentElement;
    const ids = $$(".mb-panel", wrap).map((p) => p.id);
    const nav = $("[data-nav]");
    const navInner = nav && $(".nav__inner", nav);
    const cluster = $("[data-cluster]");
    const dock = $("[data-mb-dock]");
    const meta = $('meta[name="description"]');
    const hosts = $$("[data-mb-tabs]");
    if (nav && dock) nav.append(dock);
    const dockBox = dock && $(".dock", dock);
    const dockToggle = dock && $("[data-dock-toggle]", dock);
    const dockMenu = dock && $(".dock__menu", dock);

    const tabOf = (id) => {
      if (ids.includes(id)) return id;
      const el = id && document.getElementById(id);
      const panel = el && el.closest(".mb-panel");
      return panel ? panel.id : null;
    };
    const isDocked = () => !!nav && nav.classList.contains("is-docked");
    const offset = () => {
      const navBottom = navInner ? navInner.getBoundingClientRect().bottom : 80;
      const bar = dock && $(".dock__bar", dock);
      return Math.round(Math.max(navBottom, 70) + (bar ? bar.offsetHeight : 0) + 18);
    };
    const scrollToEl = (el, behavior) =>
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset()), behavior });

    // gleitende Markierung unter dem aktiven Bereich
    const placeInd = (host) => {
      const a = $('a[aria-current="page"]', host);
      if (!a || !a.offsetWidth) return host.style.setProperty("--io", "0");
      host.style.setProperty("--ix", `${a.offsetLeft}px`);
      host.style.setProperty("--iy", `${a.offsetTop}px`);
      host.style.setProperty("--iw", `${a.offsetWidth}px`);
      host.style.setProperty("--ih", `${a.offsetHeight}px`);
      host.style.setProperty("--io", "1");
    };
    // Textblock im Seitenkopf: Höhe weich an den aktiven Bereich anpassen statt an den längsten
    const texts = $(".subhero__texts");
    const fitTexts = () => {
      const active = texts && $(`[data-mb-only="${html.dataset.mb}"]`, texts);
      if (active) texts.style.height = `${active.offsetHeight}px`;
    };
    const sync = () => {
      const cur = html.dataset.mb;
      const panel = document.getElementById(cur);
      document.title = panel.dataset.title;
      if (meta) meta.content = panel.dataset.desc;
      $$('a[href^="#"]')
        .filter((a) => ids.includes(a.getAttribute("href").slice(1)) && !a.closest(".crumbs"))
        .forEach((a) => (a.getAttribute("href") === `#${cur}` ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
      html.style.setProperty("--mb-i", String(ids.indexOf(cur)));
      html.style.setProperty("--mb-n", String(ids.length));
      $$("[data-dock-step]").forEach((b) => {
        const i = ids.indexOf(cur) + Number(b.dataset.dockStep);
        b.disabled = i < 0 || i >= ids.length;
      });
      hosts.forEach(placeInd);
      fitTexts();
      html.style.scrollPaddingTop = `${offset()}px`;
    };

    let timer = 0;
    const show = (id, { push = true, top = false } = {}) => {
      const tab = tabOf(id);
      if (!tab) return false;
      const target = id === tab ? null : document.getElementById(id);
      if (push && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
      if (tab === html.dataset.mb) {
        if (target) scrollToEl(target, "smooth");
        else if (top || isDocked()) window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
      const swapNow = () => {
        html.dataset.mb = tab;
        sync();
        if (target) scrollToEl(target, "instant");
        else if (top || isDocked()) window.scrollTo({ top: 0, behavior: "instant" });
        requestAnimationFrame(() => {
          wrap.classList.remove("is-leaving");
          runScrollTasks();
        });
      };
      clearTimeout(timer);
      if (reducedMotion) return swapNow(), true;
      wrap.classList.add("is-leaving");
      timer = setTimeout(swapNow, 230);
      return true;
    };

    const setDockMenu = (open) => {
      if (!dockBox) return;
      dockBox.classList.toggle("is-open", open);
      dockToggle.setAttribute("aria-expanded", String(open));
      dockMenu.inert = !open;
    };

    // Alle Links auf Bereiche oder Abschnitte darin laufen über den weichen Wechsel
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, location.href);
      if (url.href.split("#")[0] !== location.href.split("#")[0]) return;
      // Link auf die Seite selbst (z. B. Spaltentitel im Mega-Menü): erster Bereich, nach oben
      if (!url.hash) {
        e.preventDefault();
        setDockMenu(false);
        show(ids[0], { top: true });
        return;
      }
      const id = decodeURIComponent(url.hash.slice(1));
      if (!tabOf(id)) return;
      e.preventDefault();
      setDockMenu(false);
      show(id);
    });
    window.addEventListener("popstate", () => show(decodeURIComponent(location.hash.slice(1)) || ids[0], { push: false }));

    if (nav && cluster && dock) {
      dock.inert = true;
      scrollTasks.push(() => {
        const docked = cluster.getBoundingClientRect().bottom < navInner.getBoundingClientRect().bottom + 4;
        if (docked === isDocked()) return;
        nav.classList.toggle("is-docked", docked);
        dock.inert = !docked;
        if (!docked) setDockMenu(false);
        requestAnimationFrame(() => hosts.forEach(placeInd));
      });
      setDockMenu(false);
      dockToggle.addEventListener("click", () => setDockMenu(!dockBox.classList.contains("is-open")));
      $$("[data-dock-step]", dock).forEach((b) =>
        b.addEventListener("click", () => {
          const i = ids.indexOf(html.dataset.mb) + Number(b.dataset.dockStep);
          if (i >= 0 && i < ids.length) show(ids[i]);
        })
      );
      document.addEventListener("click", (e) => !dock.contains(e.target) && setDockMenu(false));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && dockBox.classList.contains("is-open")) {
          setDockMenu(false);
          dockToggle.focus();
        }
      });
    }

    sync();
    // Direktlink auf einen Abschnitt: nach dem Laden (Bilder, Schriften) noch einmal genau ausrichten
    const first = decodeURIComponent(location.hash.slice(1));
    const firstEl = first && !ids.includes(first) && tabOf(first) ? document.getElementById(first) : null;
    if (firstEl) {
      let moved = false;
      ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => (moved = true), { once: true, passive: true }));
      const align = () => !moved && scrollToEl(firstEl, "instant");
      requestAnimationFrame(align);
      window.addEventListener("load", () => setTimeout(align, 60));
    }
    window.addEventListener("resize", () => {
      hosts.forEach(placeInd);
      fitTexts();
      html.style.scrollPaddingTop = `${offset()}px`;
    });
    if (document.fonts) document.fonts.ready.then(() => (hosts.forEach(placeInd), fitTexts()));
  }

  /* ---------- Preisvergleich: SELECT vs. Prepaid-Kreditkarte ---------- */
  function initPriceCalc() {
    $$("[data-calc]").forEach((root) => {
      const people = $("[data-calc-people]", root);
      const amount = $("[data-calc-amount]", root);
      const FEES = { card: 9.9, create: 2.95, load: 2.95, ship: 1.9 };
      const fill = (input) => input.style.setProperty("--fill", `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
      const render = () => {
        const n = Number(people.value);
        const a = Number(amount.value);
        fill(people);
        fill(amount);
        const loads = a * 12 * n;
        const rows = { loads, card: FEES.card * n, create: FEES.create * n, fee: FEES.load * 12 * n, ship: FEES.ship * n };
        const competitor = loads + rows.card + rows.create + rows.fee + rows.ship;
        const save = competitor - loads;
        $$("[data-calc-label]", root).forEach((el) => {
          el.textContent = el.dataset.calcLabel === "people" ? n.toLocaleString("de-DE") : euro(a, 0);
        });
        $$("[data-calc-unit]", root).forEach((el) => (el.textContent = euro(a)));
        Object.entries(rows).forEach(([k, v]) => $$(`[data-calc-out="${k}"]`, root).forEach((el) => tweenText(el, v, (x) => euro(x))));
        $$('[data-calc-out="competitor"]', root).forEach((el) => tweenText(el, competitor, (x) => euro(x)));
        $$('[data-calc-out="ours"]', root).forEach((el) => tweenText(el, loads, (x) => euro(x)));
        $$('[data-calc-out="save"]', root).forEach((el) => tweenText(el, save, (x) => euro(x, 0)));
        $$('[data-calc-out="pct"]', root).forEach((el) =>
          tweenText(el, (save / competitor) * 100, (x) => `${x.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`)
        );
        $$('[data-calc-bar="ours"]', root).forEach((el) => el.style.setProperty("--w", `${(loads / competitor) * 100}%`));
      };
      people.addEventListener("input", render);
      amount.addEventListener("input", render);
      render();
    });
  }

  /* ---------- Vorteils-Akkordeon: Desktop Liste + Detailkarte, schmal aufklappbar ---------- */
  function initAccordions() {
    const narrow = window.matchMedia("(max-width: 980px)");
    $$("[data-acc]").forEach((root) => {
      const items = $$(".acc__item", root);
      const btns = items.map((item) => $(".acc__btn", item));
      const collapsible = () => root.classList.contains("acc--stack") || narrow.matches;
      const open = (index, { toggle = false } = {}) => {
        const closing = toggle && collapsible() && items[index].classList.contains("is-open");
        items.forEach((item, i) => {
          const on = i === index && !closing;
          item.classList.toggle("is-open", on);
          btns[i].setAttribute("aria-expanded", String(on));
        });
      };
      btns.forEach((btn, i) => {
        btn.addEventListener("click", () => open(i, { toggle: true }));
        btn.addEventListener("keydown", (e) => {
          const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          btns[(i + step + btns.length) % btns.length].focus();
        });
      });
      items.forEach((item, i) => {
        const next = $("[data-acc-next]", item);
        if (!next) return;
        next.addEventListener("click", () => {
          const n = (i + 1) % items.length;
          open(n);
          btns[n].focus({ preventScroll: true });
        });
      });
      // In der Desktop-Ansicht muss immer eine Detailkarte sichtbar sein
      narrow.addEventListener("change", () => {
        if (!collapsible() && !items.some((item) => item.classList.contains("is-open"))) open(0);
      });
    });
  }

  /* ---------- Bindung und Recruiting: Visualisierung zeigt den geöffneten Vorteil ----------
     data-brandviz verweist auf das Akkordeon; data-state = Nummer des offenen Vorteils (0 = keiner). */
  function initBrandViz() {
    $$("[data-brandviz]").forEach((viz) => {
      const acc = $(viz.dataset.brandviz);
      if (!acc) return;
      const items = $$(".acc__item", acc);
      const sync = () => {
        viz.dataset.state = String(items.findIndex((item) => item.classList.contains("is-open")) + 1);
      };
      new MutationObserver(sync).observe(acc, { subtree: true, attributes: true, attributeFilter: ["class"] });
      sync();
    });
  }

  /* ---------- Drei gute Gründe: interaktive Portal-Vorschauen (Mitarbeiterbindung) ----------
     Deal-Detailseite, Gutscheinwelt mit Gutscheinansicht und Portal im wechselnden Corporate Design.
     Jede Vorschau spielt beim Einblenden eine kurze Demo, bis jemand selbst klickt. */
  const PV_IMG = "assets/img/mitarbeiterbindung/vorschau/";
  const PV_HOW = "Persönlichen Gutscheincode anzeigen lassen und im Onlineshop des Partners einlösen.";
  const PV_DEALS = {
    ghd: { slug: "ghd", crumbs: "Health & Beauty › Beauty & Wellness", img: "deal-ghd.webp", logo: "logo-ghd.webp", alt: "ghd", title: "Einfaches Hair-Styling in Salonqualität mit ghd", badge: "25%", how: "Jetzt persönlichen Gutscheincode anzeigen lassen und im Checkout des Onlineshops einlösen.", code: "GHD25-INC-7Q4K" },
    pinkbox: { slug: "pink-box", crumbs: "Health & Beauty › Düfte & Kosmetik", img: "deal-pinkbox.webp", logo: "logo-pinkbox.svg", alt: "Pink Box", title: "Beauty-Boxen von Pink Box", badge: "30%", how: PV_HOW, code: "PINK30-INC-M2X8" },
    klier: { slug: "klier", crumbs: "Health & Beauty › Beauty & Wellness", img: "deal-klier.webp", logo: "logo-klier.webp", alt: "KLIER", title: "Wohlfühlen beginnt hier – mit KLIER", badge: "10%", how: PV_HOW, code: "KLIER10-INC-T5R1" },
    philips: { slug: "philips", crumbs: "Home & Living › Haushaltselektronik", img: "deal-philips.webp", logo: "logo-philips.webp", alt: "Philips", title: "Philips Loyaltyshop Angebote", badge: "bis zu 40%", how: PV_HOW, code: "PHIL40-INC-H9W3" },
  };
  const PV_VOUCHERS = {
    aldi: { brand: "ALDI Nord DE", title: "ALDI Nord Geschenkgutschein", img: "gs-aldi.webp", values: [10, 25, 50] },
    tkmaxx: { brand: "TK Maxx DE", title: "TK Maxx Gutschein", img: "gs-tkmaxx.webp", values: [5, 10, 25, 50] },
    lieferando: { brand: "Lieferando DE", title: "Lieferando Gutschein", img: "gs-lieferando.webp", values: [20, 25, 50] },
    burnhard: { brand: "BURNHARD", title: "Burnhard Gutschein", img: "gs-burnhard.webp", values: [25, 50, 100] },
    fcbayern: { brand: "FC Bayern München DE", title: "FC Bayern München Gutschein", img: "gs-fcbayern.webp", values: [25, 50, 100] },
    mueller: { brand: "Müller DE", title: "Drogerie Müller Gutschein", img: "gs-mueller.webp", values: [15, 25, 50] },
    paperandsons: { brand: "Paper & Sons", title: "Paper & Sons Gutschein", img: "gs-paperandsons.webp", values: [50, 100] },
    home24: { brand: "home24 DE", title: "home24 Gutschein", img: "gs-home24.webp", values: [15, 25, 50] },
    circlek: { brand: "Circle K DE", title: "Circle K Gutschein (Total)", img: "gs-circlek.webp", values: [10, 15, 25, 50, 75, 100] },
    zooplus: { brand: "zooplus DE", title: "zooplus Gutschein", img: "gs-zooplus.webp", values: [5, 10, 25] },
    misterspex: { brand: "misterspex DE", title: "Mister Spex Gutschein", img: "gs-misterspex.webp", values: [10, 25, 50] },
    sixt: { brand: "Sixt", title: "Sixt Gutschein", img: "gs-sixt.webp", values: [15, 25, 50] },
  };
  const PV_CI = {
    incent: { label: "INCENT Corporate Services", btn: "#1c87b8", nav: "#ffffff", bg: "image" },
    nordwerk: { label: "Nordwerk GmbH", btn: "#e30613", nav: "#ffffff", bg: "solid", solid: "#fdeeee", logo: ["NORDWERK", "#e30613"] },
    gruental: { label: "Grüntal AG", btn: "#00965e", nav: "#0b3d2e", bg: "gradient", g1: "#00965e", g2: "#0b3d2e", logo: ["GRÜNTAL", "#ffffff"] },
    vela: { label: "Vela Mobility", btn: "#7b2cbf", nav: "#ffffff", bg: "image", logo: ["VELA", "#7b2cbf"] },
  };
  const textLogo = (text, color) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${text.length * 27 + 8} 52"><text x="2" y="39" font-family="Arial,sans-serif" font-weight="800" font-size="36" letter-spacing="1" fill="${color}">${text}</text></svg>`
    );

  // ruft fn(sichtbar) auf, sobald ein Bereich eingeblendet/ausgeblendet wird oder ins Bild kommt
  const watchShown = (el, fn) => {
    const panel = el.closest("[role='tabpanel']") || el;
    let inView = !hasIO;
    let last = null;
    const check = () => {
      const shown = inView && !panel.hidden;
      if (shown !== last) fn((last = shown));
    };
    if (hasIO) new IntersectionObserver(([e]) => ((inView = e.isIntersecting), check()), { threshold: 0.3 }).observe(el);
    new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    check();
  };

  function initDealPreview(root) {
    const out = (key) => $$(`[data-pvd-out="${key}"]`, root);
    const codeEl = $("[data-pvd-code]", root);
    const copy = $("[data-pvd-copy]", root);
    const fav = $("[data-pvd-fav]", root);
    const tiles = $$("[data-pvd-pick]", root);
    let deal = PV_DEALS.ghd;
    let typing = 0;
    let user = false;
    let demo = 0;
    const setCode = (text) => (codeEl.textContent = text);
    const reveal = () => {
      if (root.classList.contains("is-revealed")) return;
      root.classList.add("is-revealed");
      clearInterval(typing);
      if (reducedMotion) return setCode(deal.code);
      let n = 0;
      setCode("");
      typing = setInterval(() => {
        setCode(deal.code.slice(0, ++n));
        if (n >= deal.code.length) clearInterval(typing);
      }, 55);
    };
    const pick = (key) => {
      const next = PV_DEALS[key];
      if (!next) return;
      clearInterval(typing);
      root.classList.remove("is-revealed");
      copy.classList.remove("is-done");
      $("span", copy).textContent = "Kopieren";
      fav.setAttribute("aria-pressed", "false");
      $("span", fav).textContent = "Diesen Deal merken";
      tiles.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.pvdPick === key)));
      const apply = () => {
        deal = next;
        out("slug").forEach((el) => (el.textContent = deal.slug));
        out("crumbs").forEach((el) => (el.textContent = deal.crumbs));
        out("title").forEach((el) => (el.textContent = deal.title));
        out("badge").forEach((el) => (el.textContent = deal.badge));
        out("how").forEach((el) => (el.textContent = deal.how));
        out("img").forEach((el) => (el.src = PV_IMG + deal.img));
        out("logo").forEach((el) => ((el.src = PV_IMG + deal.logo), (el.alt = deal.alt)));
        setCode("");
        root.classList.remove("is-swapping");
      };
      if (reducedMotion || next === deal) return apply();
      root.classList.add("is-swapping");
      setTimeout(apply, 220);
    };
    $("[data-pvd-reveal]", root).addEventListener("click", reveal);
    copy.addEventListener("click", () => {
      if (navigator.clipboard) navigator.clipboard.writeText(deal.code).catch(() => {});
      copy.classList.add("is-done");
      $("span", copy).textContent = "Kopiert";
    });
    fav.addEventListener("click", () => {
      const on = fav.getAttribute("aria-pressed") !== "true";
      fav.setAttribute("aria-pressed", String(on));
      $("span", fav).textContent = on ? "Gemerkt" : "Diesen Deal merken";
    });
    tiles.forEach((t) => t.addEventListener("click", () => pick(t.dataset.pvdPick)));
    root.addEventListener("pointerdown", () => ((user = true), clearTimeout(demo)));
    // Demo: beim Einblenden zeigt die Vorschau den persönlichen Code
    watchShown(root, (shown) => {
      clearTimeout(demo);
      if (!shown || user) return;
      pick("ghd");
      demo = setTimeout(reveal, 1700);
    });
  }

  function initShopPreview(root) {
    const balanceEl = $("[data-pvs-balance]", root);
    const chip = balanceEl.closest(".pvs__balance");
    const countEl = $("[data-pvs-count]", root);
    const values = $("[data-pvs-values]", root);
    const add = $("[data-pvs-add]", root);
    const note = $("[data-pvs-note]", root);
    const out = (key) => $(`[data-pvs-out="${key}"]`, root);
    const START = 50;
    let balance = START;
    let count = 0;
    let voucher = null;
    let value = 0;
    let user = false;
    let timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const stopDemo = () => {
      timers.forEach(clearTimeout);
      timers = [];
      $$(".is-demo", root).forEach((el) => el.classList.remove("is-demo"));
    };
    const bump = (el, cls = "is-bump") => {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    };
    const setValue = (v) => {
      value = v;
      $$("button", values).forEach((b) => {
        const on = Number(b.dataset.value) === v;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      out("price").textContent = euro(v);
      const tooMuch = v > balance;
      add.disabled = tooMuch || balance <= 0;
      note.classList.toggle("is-warn", tooMuch && balance > 0);
      note.textContent = balance <= 0 ? "Ihr Geschenk-Guthaben ist vollständig eingelöst." : tooMuch ? `Ihr Guthaben reicht für diesen Wert nicht aus (noch ${euro(balance)}).` : "";
    };
    const view = (name, slug) => {
      root.dataset.view = name;
      out("slug").textContent = slug;
    };
    const open = (key) => {
      voucher = PV_VOUCHERS[key];
      if (!voucher) return;
      out("img").src = PV_IMG + voucher.img;
      out("brand").textContent = voucher.brand;
      out("title").textContent = voucher.title;
      values.innerHTML = voucher.values.map((v) => `<button type="button" role="radio" aria-checked="false" data-value="${v}">${v} €</button>`).join("");
      setValue(voucher.values.find((v) => v <= balance) || voucher.values[0]);
      view("detail", `gutschein/${key}`);
    };
    const reset = () => {
      balance = START;
      count = 0;
      balanceEl.textContent = euro(balance);
      countEl.textContent = "0";
      view("list", "gutscheinwelt");
    };
    root.addEventListener("click", (e) => {
      const card = e.target.closest("[data-pvs-open]");
      if (card) return open(card.dataset.pvsOpen);
      if (e.target.closest("[data-pvs-back]")) return view("list", "gutscheinwelt");
      const v = e.target.closest("[data-value]");
      if (v) return setValue(Number(v.dataset.value));
      if (e.target.closest("[data-pvs-add]") && !add.disabled) {
        balance -= value;
        count += 1;
        balanceEl.textContent = euro(balance);
        countEl.textContent = String(count);
        bump(chip);
        bump(countEl);
        setValue(value);
        if (balance > 0) note.textContent = `✓ Im Warenkorb – verbleibendes Guthaben ${euro(balance)}`;
        else note.textContent = "✓ Im Warenkorb – Ihr Geschenk-Guthaben ist vollständig eingelöst.";
        note.classList.remove("is-warn");
      }
    });
    // Pfeiltasten in der Werteauswahl
    values.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step || !voucher) return;
      e.preventDefault();
      const from = Number(e.target.dataset && e.target.dataset.value) || value;
      const i = voucher.values.indexOf(from);
      setValue(voucher.values[(i + step + voucher.values.length) % voucher.values.length]);
      $('[aria-checked="true"]', values).focus();
    });
    root.addEventListener("pointerdown", () => ((user = true), stopDemo()));
    // Demo: Gutschein öffnen, Wert wählen, in den Warenkorb – mit dem Guthaben vom Arbeitgeber
    watchShown(root, (shown) => {
      stopDemo();
      if (!shown || user) return;
      reset();
      if (reducedMotion) return;
      const first = $("[data-pvs-open]", root);
      later(1200, () => first.classList.add("is-demo"));
      later(1900, () => (first.classList.remove("is-demo"), open(first.dataset.pvsOpen)));
      later(3300, () => setValue(25));
      later(4300, () => add.classList.add("is-demo"));
      later(4900, () => (add.classList.remove("is-demo"), add.click()));
    });
  }

  function initCiPreview(root) {
    const theme = $(".vp-theme", root);
    const logo = $(".vp__logo-custom", theme);
    const dots = $$("[data-ci]", root);
    const label = $("[data-ci-label]", root);
    const portal = $("[data-ci-portal]", theme);
    const keys = dots.map((d) => d.dataset.ci);
    let current = keys[0];
    let timer = 0;
    let user = false;
    const apply = (key) => {
      const ci = PV_CI[key];
      current = key;
      theme.style.setProperty("--btn", ci.btn);
      theme.style.setProperty("--nav", ci.nav);
      if (ci.solid) theme.style.setProperty("--bg-solid", ci.solid);
      if (ci.g1) theme.style.setProperty("--bg-g1", ci.g1);
      if (ci.g2) theme.style.setProperty("--bg-g2", ci.g2);
      theme.dataset.btnTone = toneOf(ci.btn);
      theme.dataset.navTone = toneOf(ci.nav);
      theme.dataset.bg = ci.bg;
      theme.dataset.stageTone = ci.bg === "solid" ? toneOf(ci.solid) : ci.bg === "gradient" ? toneOf(mixHex(ci.g1, ci.g2)) : "light";
      if (ci.logo) {
        logo.src = textLogo(ci.logo[0], ci.logo[1]);
        theme.dataset.logo = "custom";
      } else theme.dataset.logo = "default";
      if (portal) portal.textContent = ci.label;
      label.textContent = ci.label;
      dots.forEach((d) => {
        const on = d.dataset.ci === key;
        d.classList.toggle("is-on", on);
        d.setAttribute("aria-checked", String(on));
        d.tabIndex = on ? 0 : -1;
      });
    };
    const stop = () => ((user = true), clearInterval(timer));
    dots.forEach((d, i) => {
      d.addEventListener("click", () => (stop(), apply(d.dataset.ci)));
      d.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        stop();
        const next = dots[(i + step + dots.length) % dots.length];
        apply(next.dataset.ci);
        next.focus();
      });
    });
    // Demo: Beispiel-Designs wechseln, solange niemand selbst wählt
    watchShown(root, (shown) => {
      clearInterval(timer);
      if (!shown || user || reducedMotion) return;
      timer = setInterval(() => apply(keys[(keys.indexOf(current) + 1) % keys.length]), 2200);
    });
    apply(current);
  }

  function initPreviews() {
    $$("[data-pv-deal]").forEach(initDealPreview);
    $$("[data-pv-shop]").forEach(initShopPreview);
    $$("[data-pv-ci]").forEach(initCiPreview);
  }

  /* ---------- Start ---------- */
  initLogoFallbacks();
  initPartnerLogos();
  initDealTiles();
  initNav();
  initScrollProgress();
  initReveal();
  initRotator();
  initCounters();
  initHero();
  initStudioTilt();
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
  initTiltCards();
  initTagAnims();
  initParallax();
  initAccordions();
  initBrandViz();
  initPreviews();
  initTouchpoints();
  initPlacement();
  initPackages();
  initEarnings();
  initMb();
  initSelfLinks();
  initShots();
  initSteps();
  initHotspots();
  initVouchers();
  initFinder();
  initCheckout();
  initMotifLinks();
  initPriceCalc();
  runScrollTasks();
})();
