import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------------------
   The scroll layer, build 3.

   Six acts, one smooth-scroll instance, one ScrollTrigger per act. Two kinds
   of motion live here and they are kept apart on purpose:

     scroll-driven   GSAP timelines, scrubbed. Own the outer plane elements.
     ambient         one rAF loop writing CSS variables (--ax/--ay idle drift,
                     --px/--py pointer). Own the inner wrappers. Runs only
                     while its act is on screen.

   Under reduced motion none of this initialises. The page renders a complete
   static composition on its own.
--------------------------------------------------------------------------- */

const MOBILE = "(max-width: 767px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const FINE = "(hover: hover) and (pointer: fine)";

const isMobile = () => window.matchMedia(MOBILE).matches;
const isFine = () => window.matchMedia(FINE).matches;
const q = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const qa = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

let lenis: Lenis | null = null;

export function initPage() {
  initReveals();
  if (window.matchMedia(REDUCED).matches) return;

  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    // Touch stays on the platform's own physics. Smoothing touch on iOS makes
    // the page feel detached from the finger.
    syncTouch: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });

  let ctx: gsap.Context | null = null;
  const build = () => {
    ctx?.revert();
    ctx = gsap.context(() => {
      hero();
      manifesto();
      work();
      close();
    });
    ScrollTrigger.refresh();
    thread();
  };

  const start = () => {
    build();
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  };
  if (document.fonts?.status === "loaded") start();
  else document.fonts?.ready.then(start).catch(start);

  ambient();

  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    build();
  });
}

/* --- Act 1: the hero ------------------------------------------------------ */

function hero() {
  const root = q("[data-hero]");
  const pin = q("[data-hero-pin]");
  if (!root || !pin) return;

  const mobile = isMobile();
  const room = q("[data-hero-room]", root);
  const figure = q("[data-hero-figure]", root);
  const haze = q("[data-hero-haze]", root);
  const line0 = q('[data-hero-line="0"]', root);
  const line1 = q('[data-hero-line="1"]', root);
  const meta = q("[data-hero-meta]", root);
  const beat = q("[data-hero-beat]", root);
  const span = mobile ? 1.7 : 2.3;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${window.innerHeight * span}`,
      pin,
      pinSpacing: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  });
  root.setAttribute("data-scroll-ready", "");

  // Far plane: the camera pushes in, slowly.
  if (room) tl.fromTo(room, { scale: 1.06, yPercent: 0 }, { scale: 1.16, yPercent: -6, duration: 1 }, 0);

  // The name splits and recedes into the wall. Two lines, two directions.
  if (line0 && line1) {
    tl.fromTo(line0, { xPercent: 0 }, { xPercent: mobile ? -70 : -26, duration: 1 }, 0);
    tl.fromTo(line1, { xPercent: 0 }, { xPercent: mobile ? 70 : 18, duration: 1 }, 0);
    tl.fromTo([line0, line1], { opacity: 1 }, { opacity: mobile ? 0 : 0.22, duration: 0.5 }, 0.35);
  }

  // Near plane: the figure comes forward, feet anchored.
  if (figure)
    tl.fromTo(
      figure,
      { yPercent: 0, scale: 1 },
      { yPercent: mobile ? -14 : -6, scale: mobile ? 1.18 : 1.14, duration: 1 },
      0,
    );

  // Haze thins as the room comes forward.
  if (haze) tl.fromTo(haze, { opacity: 1 }, { opacity: 0.45, duration: 1 }, 0);

  if (meta) tl.to(meta, { opacity: 0, yPercent: -40, duration: 0.25 }, 0.1);

  // The second beat: arrives once the name has cleared, and holds.
  if (beat) {
    tl.fromTo(
      beat,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
      0.45,
    );
  }
}

/* --- Act 2: the manifesto ------------------------------------------------- */

function manifesto() {
  const root = q("[data-manifesto]");
  const pin = q("[data-manifesto-pin]");
  if (!root || !pin) return;

  const items = qa("[data-manifesto-item]", root);
  const band = q("[data-manifesto-band]", root);
  const n = items.length;
  if (!n) return;

  const mobile = isMobile();
  const span = mobile ? 0.8 * n : 0.9 * n;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${window.innerHeight * span}`,
      pin,
      pinSpacing: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  });

  if (band) tl.fromTo(band, { xPercent: 0 }, { xPercent: -50, duration: 1 }, 0);

  const slot = 1 / n;
  const inDur = slot * 0.36;
  const outDur = slot * 0.24;
  // The next sentence starts arriving while the last is still leaving, so no
  // scroll position ever shows an empty frame.
  const hold = -outDur * 0.45;

  items.forEach((item, i) => {
    const words = qa(".manifesto__w-in", item);
    const at = i * slot;

    if (i === 0) {
      gsap.set(item, { opacity: 1, scale: 1, yPercent: 0 });
      gsap.set(words, { yPercent: 0 });
    } else {
      tl.fromTo(item, { opacity: 0, scale: 1, yPercent: 4 }, { opacity: 1, yPercent: 0, duration: inDur * 0.5 }, at + hold);
      tl.fromTo(
        words,
        { yPercent: 110 },
        { yPercent: 0, duration: inDur, ease: "power3.out", stagger: inDur / Math.max(words.length, 1) * 0.6 },
        at + hold,
      );
    }
    if (i < n - 1) {
      tl.to(item, { opacity: 0, scale: 0.94, yPercent: -6, duration: outDur, ease: "power2.in" }, at + slot - outDur);
    }
  });
}

/* --- Act 3: the work rail ------------------------------------------------- */

function work() {
  const root = q("[data-work]");
  const pin = q("[data-work-pin]");
  const rail = q("[data-work-rail]");
  if (!root || !pin || !rail) return;

  const cards = qa("[data-work-card]", rail);
  const plates = qa<HTMLImageElement>(".card__plate-img", rail);

  if (isMobile()) {
    // A stack. The plates travel against the scroll inside their frames and
    // each card rises as it arrives.
    plates.forEach((img) => {
      gsap.fromTo(
        img,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });
    cards.forEach((card) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 88%", once: true },
        },
      );
    });
    return;
  }

  const travel = () => Math.max(0, rail.scrollWidth - window.innerWidth);

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${travel() + window.innerHeight * 0.4}`,
      pin,
      pinSpacing: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  });

  tl.to(rail, { x: () => -travel(), duration: 1 }, 0);
  // The plates slide inside their frames at a different rate to the rail, so
  // each card has depth of its own while it crosses.
  plates.forEach((img) => tl.fromTo(img, { xPercent: 6 }, { xPercent: -6, duration: 1 }, 0));
  cards.forEach((card, i) =>
    tl.fromTo(card, { y: i % 2 ? 24 : 0 }, { y: i % 2 ? -24 : 20, duration: 1 }, 0),
  );
}

/* --- Act 6: the close ----------------------------------------------------- */

function close() {
  const root = q("[data-close]");
  if (!root) return;
  const lines = qa("[data-close-line]", root);
  const body = q("[data-close-body]", root);

  gsap.fromTo(
    lines,
    { yPercent: 40, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 75%", end: "top 20%", scrub: 0.6 },
    },
  );
  if (body)
    gsap.fromTo(
      body,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, ease: "power2.out", scrollTrigger: { trigger: root, start: "top 55%", end: "top 15%", scrub: 0.6 } },
    );
}

/* --- Ambient loop --------------------------------------------------------- */

function ambient() {
  const heroPin = q("[data-hero-pin]");
  const closePin = q("[data-close-pin]");
  const magnet = q("[data-magnet]");
  const heroRoot = q("[data-hero]");
  const closeRoot = q("[data-close]");

  const fine = isFine();
  let heroOn = true;
  let closeOn = false;

  if ("IntersectionObserver" in window) {
    if (heroRoot)
      new IntersectionObserver(([e]) => (heroOn = e.isIntersecting), { threshold: 0 }).observe(heroRoot);
    if (closeRoot)
      new IntersectionObserver(([e]) => (closeOn = e.isIntersecting), { threshold: 0 }).observe(closeRoot);
  }

  // Pointer, normalised to -1..1 from the viewport centre, lerped.
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  // The light in the close, in viewport percent.
  const lightT = { x: 30, y: 60 };
  const light = { x: 30, y: 60 };
  let magnetRect: DOMRect | null = null;
  let px = 0, py = 0;

  if (fine) {
    window.addEventListener(
      "pointermove",
      (e) => {
        px = e.clientX;
        py = e.clientY;
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = (e.clientY / window.innerHeight) * 2 - 1;
        lightT.x = (e.clientX / window.innerWidth) * 100;
        lightT.y = (e.clientY / window.innerHeight) * 100;
      },
      { passive: true },
    );
  }

  const t0 = performance.now();
  const tick = (now: number) => {
    const t = (now - t0) / 1000;

    if (heroOn && heroPin) {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      // Idle drift: two slow sines, never in phase, so the planes breathe.
      const ax = Math.sin(t * 0.21) * 0.9 + Math.sin(t * 0.07) * 0.5;
      const ay = Math.cos(t * 0.17) * 0.8 + Math.sin(t * 0.11) * 0.4;
      heroPin.style.setProperty("--px", cur.x.toFixed(4));
      heroPin.style.setProperty("--py", cur.y.toFixed(4));
      heroPin.style.setProperty("--ax", ax.toFixed(4));
      heroPin.style.setProperty("--ay", ay.toFixed(4));
    }

    if (closeOn && closePin) {
      // With no pointer the light wanders on its own.
      const wx = fine ? lightT.x : 40 + Math.sin(t * 0.18) * 22;
      const wy = fine ? lightT.y : 55 + Math.cos(t * 0.14) * 18;
      light.x += (wx - light.x) * 0.08;
      light.y += (wy - light.y) * 0.08;
      closePin.style.setProperty("--lx", `${light.x.toFixed(2)}%`);
      closePin.style.setProperty("--ly", `${light.y.toFixed(2)}%`);

      if (fine && magnet) {
        if (!magnetRect || now % 30 < 16) magnetRect = magnet.getBoundingClientRect();
        const cx = magnetRect.left + magnetRect.width / 2;
        const cy = magnetRect.top + magnetRect.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const d = Math.hypot(dx, dy);
        const r = 140;
        const k = d < r ? (1 - d / r) * 0.35 : 0;
        magnet.style.transform = `translate3d(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px, 0)`;
      }
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* --- Reveals -------------------------------------------------------------- */

function initReveals() {
  const els = qa("[data-reveal]");
  if (!els.length || window.matchMedia(REDUCED).matches || !("IntersectionObserver" in window)) return;
  els.forEach((el) => el.setAttribute("data-reveal-armed", ""));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.setAttribute("data-reveal-on", "");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

/* --- The thread (signature) ----------------------------------------------- */

function thread() {
  const nav = q("[data-thread]");
  const line = q<SVGLineElement & HTMLElement>("[data-thread-line]");
  const list = q("[data-thread-stops]");
  const bar = q("[data-bar]");
  const paper = q("[data-paper]");
  if (!nav || !line || !list) return;

  const stops = qa("[data-thread-stop]");
  if (!stops.length) return;
  nav.hidden = false;

  type Stop = { el: HTMLElement; li: HTMLElement; at: number };
  const rows: Stop[] = [];
  list.innerHTML = "";
  stops.forEach((el) => {
    const li = document.createElement("li");
    li.className = "thread__stop";
    const a = document.createElement("a");
    a.className = "thread__link";
    a.href = `#${el.id}`;
    a.textContent = el.dataset.threadStop || el.id;
    const dot = document.createElement("span");
    dot.className = "thread__dot";
    li.append(dot, a);
    list.append(li);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      lenis?.scrollTo(el, { offset: 0, duration: 1.4 });
    });
    rows.push({ el, li, at: 0 });
  });

  const measure = () => {
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY;
    rows.forEach((r) => {
      const top = r.el.getBoundingClientRect().top + y;
      r.at = Math.min(0.985, Math.max(0.01, top / total));
      r.li.style.setProperty("--at", r.at.toFixed(4));
    });
  };
  measure();
  ScrollTrigger.addEventListener("refresh", measure);

  const update = () => {
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / total));
    line.style.strokeDashoffset = String(1000 * (1 - p));
    nav.toggleAttribute("data-thread-on", p > 0.015);

    let current: Stop | null = null;
    rows.forEach((r) => {
      const stamped = p >= r.at - 0.012;
      r.li.toggleAttribute("data-stamped", stamped);
      if (stamped) current = r;
    });
    rows.forEach((r) => r.li.toggleAttribute("data-current", r === current));

    // Ground: the thread and the bar re-ink over the paper act.
    if (paper) {
      const rect = paper.getBoundingClientRect();
      const mid = window.innerHeight * 0.5;
      nav.toggleAttribute("data-thread-paper", rect.top < mid && rect.bottom > mid);
      bar?.toggleAttribute("data-bar-paper", rect.top < 40 && rect.bottom > 40);
    }
  };
  update();
  ScrollTrigger.addEventListener("scrollEnd", update);
  lenis?.on("scroll", update);
}
