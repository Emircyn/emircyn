import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------------------
   The scroll layer.

   Five acts, one smooth-scroll instance, one ScrollTrigger per act. Two kinds
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

/* Pages change without a reload (Astro's ClientRouter), so everything this
   file starts is stopped again before the next page is swapped in: window
   listeners through one AbortSignal, the rest through the cleanups list. */
let ac: AbortController | null = null;
let cleanups: (() => void)[] = [];
const later = (fn: () => void) => cleanups.push(fn);
const live = () => !!ac && !ac.signal.aborted;

export function destroyPage() {
  ac?.abort();
  ac = null;
  cleanups.splice(0).reverse().forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

/** Stop smooth scrolling where it is, before a page change is captured. */
export function freezePage() {
  lenis?.stop();
}

export function initPage() {
  destroyPage();
  ac = new AbortController();
  const signal = ac.signal;
  initReveals();
  initServiceIndex();
  if (window.matchMedia(REDUCED).matches) return;

  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    // Touch stays on the platform's own physics. Smoothing touch on iOS makes
    // the page feel detached from the finger.
    syncTouch: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  later(() => {
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
  });
  ScrollTrigger.config({ ignoreMobileResize: true });

  let ctx: gsap.Context | null = null;
  later(() => {
    ctx?.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
  const build = () => {
    if (!live()) return;
    ctx?.revert();
    ctx = gsap.context(() => {
      hero();
      work();
      close();
    });
    ScrollTrigger.refresh();
    thread();
  };

  const start = () => {
    build();
    if (document.readyState !== "complete")
      window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true, signal });
  };
  if (document.fonts?.status === "loaded") start();
  else document.fonts?.ready.then(start).catch(start);

  ambient();

  // In-page links ride the smooth scroll instead of jumping.
  qa<HTMLAnchorElement>('a[href^="#"]:not(.thread__link)').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute("href") || "");
      if (!target) return;
      e.preventDefault();
      lenis?.scrollTo(target, { duration: 1.4 });
    });
  });

  let lastWidth = window.innerWidth;
  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      build();
    },
    { signal },
  );
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
    // On a phone the name clears out before the beat arrives in its place.
    tl.fromTo([line0, line1], { opacity: 1 }, { opacity: mobile ? 0 : 0.22, duration: mobile ? 0.3 : 0.5 }, mobile ? 0.12 : 0.35);
  }

  // Near plane: the figure comes forward, feet anchored.
  if (figure)
    tl.fromTo(
      figure,
      { yPercent: 0, scale: 1 },
      { yPercent: mobile ? -7 : -6, scale: mobile ? 1.08 : 1.14, duration: 1 },
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

/* --- Act 2: work --------------------------------------------------------

   The act is pinned while the page scroll walks the line from print to print.
   The line itself lives in darkroom.ts; this only tells it how far along the
   act is, so the prints keep their own weight and swing. */

function work() {
  const root = q("[data-work]");
  const pin = q("[data-work-pin]");
  const room = q("[data-darkroom='home']", root ?? document);
  if (!root || !pin || !room) return;
  const stops = qa("[data-print]", room).length;
  ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: () => `+=${window.innerHeight * Math.max(1, stops - 1) * (isMobile() ? 0.6 : 0.75)}`,
    pin,
    pinSpacing: true,
    invalidateOnRefresh: true,
    anticipatePin: 1,
    onUpdate: (self) => room.dispatchEvent(new CustomEvent("darkroom:progress", { detail: self.progress })),
  });
}

/* --- Act 5: the close ----------------------------------------------------- */

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

  // Pages without a hero or a close have nothing for this loop to do.
  if (!heroPin && !closePin) return;
  const fine = isFine();
  let heroOn = !!heroRoot;
  let closeOn = false;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) =>
      entries.forEach((e) => (e.target === heroRoot ? (heroOn = e.isIntersecting) : (closeOn = e.isIntersecting))),
    );
    if (heroRoot) io.observe(heroRoot);
    if (closeRoot) io.observe(closeRoot);
    later(() => io.disconnect());
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
      { passive: true, signal: ac!.signal },
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

    if (live()) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* --- Layers index --------------------------------------------------------

   Not motion, so it runs whenever the line does. The print in the middle of
   the line decides which layers are lit. */

function initServiceIndex() {
  const layers = q("[data-services]");
  const room = q("[data-darkroom='home']");
  if (!layers || !room) return;
  const services = qa("[data-service]", layers);
  const prints = qa("[data-print]", room);
  room.addEventListener("darkroom:current", ((e: CustomEvent<number>) => {
    const uses = (prints[e.detail]?.dataset.uses || "").split(" ");
    // The end card is not a project: every layer comes back on.
    const end = prints[e.detail]?.hasAttribute("data-print-end");
    layers.toggleAttribute("data-live", !end);
    services.forEach((s) => s.toggleAttribute("data-on", end || uses.includes(s.dataset.service || "")));
  }) as EventListener);
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
  later(() => io.disconnect());
}

/* --- The thread (signature) ----------------------------------------------- */

function thread() {
  const nav = q("[data-thread]");
  const line = q<SVGLineElement & HTMLElement>("[data-thread-line]");
  const list = q("[data-thread-stops]");
  const bar = q("[data-bar]");
  const paper = q("[data-paper]");
  const works = q("[data-work]");
  const measureAct = q("[data-scrub-stage]");
  const dots = !!q("[data-thread-dots]");
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
  later(() => ScrollTrigger.removeEventListener("refresh", measure));

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

    // Over the work act the heading and layers sit at the page edge, so the
    // thread keeps its line and dots and drops its labels until it has passed.
    // Pages whose copy starts at the page edge keep the labels away for good.
    // The work act and the measure's readings panel also start at the page
    // edge, so over them the thread keeps its line and dots only.
    if (dots) nav.setAttribute("data-thread-quiet", "");
    else if (works || measureAct) {
      const over = (el: HTMLElement | null) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.3;
      };
      nav.toggleAttribute("data-thread-quiet", over(works) || over(measureAct));
    }

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
  later(() => ScrollTrigger.removeEventListener("scrollEnd", update));
  lenis?.on("scroll", update);
}
