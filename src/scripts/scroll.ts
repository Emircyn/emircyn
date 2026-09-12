import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setDrivenProgress } from "./scrub";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------------------
   The scroll layer.

   One ScrollTrigger, one timeline. It drives three things that have to stay in
   lockstep, because they are one instrument and not three animations that
   happen to overlap:

     1. the width axis of the display face (wdth 62 -> open)
     2. the font size, refitted so the name stays flush to the measure as the
        axis opens
     3. the portrait mask and the scene text states

   If the visitor prefers reduced motion, none of this initialises. The page
   already renders a complete static composition without it.
--------------------------------------------------------------------------- */

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

const WDTH_MIN = 62;
const WGHT = 800;
// Must match line-height on .hero__name. The reserved band is derived from it,
// and a band that disagrees with the leading either clips the name or leaves a
// gap under it.
const LEADING = 1.04;

type Fit = { widths: number[]; ratios: number[] };

/** Sample how wide a string is, per unit of font size, across the width axis.
 *  Resolution independent, so it survives resize without re-measuring. */
function measure(text: string, source: HTMLElement, samples = 8): Fit {
  const cs = getComputedStyle(source);
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "visibility:hidden",
    "white-space:nowrap",
    "font-size:100px",
    `font-family:${cs.fontFamily}`,
    `text-transform:${cs.textTransform}`,
    `letter-spacing:${cs.letterSpacing}`,
  ].join(";");
  probe.textContent = text;
  document.body.appendChild(probe);

  const widths: number[] = [];
  const ratios: number[] = [];
  for (let i = 0; i < samples; i++) {
    const w = WDTH_MIN + ((125 - WDTH_MIN) * i) / (samples - 1);
    probe.style.fontVariationSettings = `"wdth" ${w}, "wght" ${WGHT}`;
    widths.push(w);
    ratios.push(probe.getBoundingClientRect().width / 100);
  }

  probe.remove();
  return { widths, ratios };
}

/** Linear interpolation across the sampled width ratios. */
function ratioAt(fit: Fit, wdth: number): number {
  const { widths, ratios } = fit;
  if (wdth <= widths[0]) return ratios[0];
  if (wdth >= widths[widths.length - 1]) return ratios[ratios.length - 1];
  for (let i = 1; i < widths.length; i++) {
    if (wdth <= widths[i]) {
      const span = widths[i] - widths[i - 1];
      const k = (wdth - widths[i - 1]) / span;
      return ratios[i - 1] + (ratios[i] - ratios[i - 1]) * k;
    }
  }
  return ratios[ratios.length - 1];
}

export function initScroll() {
  if (window.matchMedia(REDUCED_QUERY).matches) return;

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const pin = document.querySelector<HTMLElement>("[data-hero-pin]");
  const nameEl = document.querySelector<HTMLElement>("[data-hero-name]");
  const lines = Array.from(
    document.querySelectorAll<HTMLElement>("[data-hero-line]"),
  );
  const portrait = document.querySelector<HTMLElement>("[data-hero-portrait]");
  const scaleIndex = document.querySelector<HTMLElement>("[data-hero-index]");
  const readout = document.querySelector<HTMLElement>("[data-hero-readout]");
  const scenes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-hero-scene]"),
  );

  /* --- Smooth scroll ---------------------------------------------------- */

  const lenis = new Lenis({
    duration: 1.05,
    // Touch is left on the platform's own physics. Lenis smoothing on touch
    // makes iOS scrolling feel detached from the finger.
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // An iOS URL bar collapsing is a viewport resize. Without this every pin
  // recalculates mid-scroll and the section jumps.
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!hero || !pin || !nameEl || !portrait || lines.length === 0) return;

  /* --- Fit the name to the measure -------------------------------------- */

  const fits = lines.map((line) => measure(line.textContent ?? "", nameEl));

  const state = { wdth: WDTH_MIN };

  /** The probe copies the computed font properties but cannot reproduce every
   *  detail of the real line box. Compare it once against the actually
   *  rendered width so the fitted name lands on the measure, not near it. */
  function calibrate() {
    lines.forEach((line, i) => {
      const size = parseFloat(getComputedStyle(line).fontSize);
      if (!size) return;
      const range = document.createRange();
      range.selectNodeContents(line);
      const real = range.getBoundingClientRect().width;
      range.detach();
      const predicted = ratioAt(fits[i], state.wdth) * size;
      if (!real || predicted <= 0) return;
      const k = real / predicted;
      if (k > 0.5 && k < 2) fits[i].ratios = fits[i].ratios.map((r) => r * k);
    });
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function applyWidth() {
    nameEl!.style.setProperty("--hero-wdth", String(state.wdth));
    nameEl!.style.setProperty("--hero-wght", String(WGHT));

    const available = nameEl!.parentElement?.clientWidth ?? window.innerWidth;

    // Two lines at LEADING occupy 2 x LEADING x the font size. The name is
    // given a fixed share of the frame so it can never grow into the scene
    // band.
    const band = pin!.clientHeight * (isMobile() ? 0.36 : 0.46);
    const cap = band / (LEADING * 2);

    // The band is reserved as a fixed height. Refitting the name changes its
    // font size on every frame of the scrub, and in an auto-height row that
    // would resize the row and push the whole column around: a layout shift on
    // every notch of the wheel.
    const type = nameEl!.parentElement;
    if (type) type.style.height = `${Math.round(band)}px`;

    lines.forEach((line, i) => {
      const size = Math.min(available / ratioAt(fits[i], state.wdth), cap);
      line.style.fontSize = `${size}px`;
    });

    // The instrument reads out the axis it is actually driving. Rounded,
    // because a scale with three decimal places is a readout nobody can use.
    if (readout) readout.textContent = String(Math.round(state.wdth));

    if (scaleIndex) {
      // A bare fraction. The rail's own height does the rest, in CSS, so
      // nothing here has to know how tall it currently is.
      const t = (state.wdth - WDTH_MIN) / (125 - WDTH_MIN);
      scaleIndex.style.setProperty("--hero-index", String(t));
    }
  }

  /* --- The timeline ------------------------------------------------------
     Desktop runs all five scenes and opens the axis to 125. Mobile merges the
     middle pair and the closing pair into three scenes, and stops the axis at
     100, because the expanded widths do not fit a narrow measure. */

  let ctx: gsap.Context | null = null;

  function build() {
    ctx?.revert();

    ctx = gsap.context(() => {
      const mobile = isMobile();
      const wdthMax = mobile ? 100 : 125;

      // One message owns one beat, on every viewport. Sharing a beat would put
      // two messages in the same grid cell, on top of each other.
      const beatCount = scenes.length;

      // Scroll distance per beat, in viewport heights. The fourth beat is the
      // peak (the portrait arriving through the type) and gets the most room;
      // the beat before it is deliberately the quietest. Mobile keeps the same
      // five beats but travels less for each, so the pin is shorter.
      const spans = mobile
        ? [0.6, 0.6, 0.6, 1.0, 0.7]
        : [0.7, 0.8, 0.7, 1.4, 0.9];
      const total = spans.reduce((a, b) => a + b, 0);

      state.wdth = WDTH_MIN;
      applyWidth();
      calibrate();
      applyWidth();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero!,
          start: "top top",
          end: () => `+=${window.innerHeight * total}`,
          // The roller plane rides this exact progress. Published rather than
          // measured, because the plane is inside the pin and never moves.
          onUpdate: (self) => setDrivenProgress("hero", self.progress),
          pin: pin!,
          pinSpacing: true,
          scrub: true,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Claimed only here, once the trigger exists. If anything above this
      // line throws, the readable static composition is what remains.
      hero!.setAttribute("data-scroll-ready", "");
      applyWidth();

      // 1. The width axis, opening across the whole timeline.
      tl.to(
        state,
        {
          wdth: wdthMax,
          duration: total,
          onUpdate: applyWidth,
        },
        0,
      );

      // 2. Scene states. One message owns one beat, and hands over cleanly
      //    before the next arrives.
      let at = 0;
      scenes.forEach((el, b) => {
        const span = spans[b];
        const fadeIn = Math.min(0.28, span * 0.35);
        const fadeOut = Math.min(0.24, span * 0.3);

        if (b === 0) {
          // The opening message has to be readable before a single pixel of
          // scroll happens, so it starts on rather than fading in.
          gsap.set(el, { opacity: 1, yPercent: 0 });
        } else {
          tl.fromTo(
            el,
            { opacity: 0, yPercent: 14 },
            { opacity: 1, yPercent: 0, duration: fadeIn, ease: "power2.out" },
            at,
          );
        }

        // The last message stays up, so the hero hands over to the page
        // instead of fading to nothing.
        if (b < beatCount - 1) {
          tl.to(
            el,
            { opacity: 0, yPercent: -10, duration: fadeOut, ease: "power2.in" },
            at + span - fadeOut,
          );
        }

        at += span;
      });

      // 3. The peak. The portrait is masked up from the baseline during the
      //    beat about measurable performance, arriving through the letterforms
      //    exactly as the axis has opened far enough to let it show.
      // 3. The portrait is its own plane. It is present from the first frame,
      //    because a visitor who never scrolls should still meet the person,
      //    and it travels slower than the type so the two separate in depth as
      //    the axis opens. Transform only, and it is never masked or covered:
      //    the name passes behind it.
      tl.fromTo(
        portrait!,
        { yPercent: 7, scale: 1.04 },
        { yPercent: -5, scale: 1, duration: total, ease: "none" },
        0,
      );
    }, hero!);
  }

  // document.fonts.ready matters: measuring before Archivo loads samples the
  // fallback face and the name is fitted to the wrong ratios.
  const start = () => {
    build();
    ScrollTrigger.refresh();
  };

  if (document.fonts?.status === "loaded") {
    start();
  } else {
    document.fonts?.ready.then(start).catch(start);
  }

  /* --- Resize ------------------------------------------------------------
     Width changes rebuild the timeline, because the beat structure itself
     differs between mobile and desktop. Height-only changes (the iOS URL bar)
     are absorbed by ScrollTrigger and must not rebuild. */

  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    build();
    ScrollTrigger.refresh();
  });

  // If the visitor turns reduced motion on mid-session, tear the whole layer
  // down and leave the static composition behind.
  window.matchMedia(REDUCED_QUERY).addEventListener("change", (e) => {
    if (!e.matches) return;
    ctx?.revert();
    hero!.removeAttribute("data-scroll-ready");
    lines.forEach((l) => (l.style.fontSize = ""));
    lenis.destroy();
  });
}

/* The plates are windows onto a larger sheet, not pictures pasted on the page.
   The image is oversized inside a fixed frame and travels against the scroll,
   so the frame reads as an aperture moving over printed matter. One property,
   transform only, and it is the only thing these sections do. */
export function initPlates() {
  if (window.matchMedia(REDUCED_QUERY).matches) return;

  document.querySelectorAll<HTMLElement>("[data-plate]").forEach((frame) => {
    const img = frame.querySelector<HTMLElement>("[data-plate-img]");
    if (!img) return;

    frame.setAttribute("data-plate-live", "");

    // The image is 1.32x the frame, so it can travel 16% in each direction
    // without ever exposing an edge.
    gsap.fromTo(
      img,
      { yPercent: -12 },
      {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

/* Positions resolved before the hero pin exists are stale by several viewport
   heights, because pinning adds its spacer to the document after the fact. Call
   this once everything has been created, and again on load when the images have
   settled the final height. */
export function refreshScroll() {
  const run = () => ScrollTrigger.refresh();
  if (document.fonts?.status === "loaded") run();
  else document.fonts?.ready.then(run).catch(run);
  window.addEventListener("load", run, { once: true });
}

/* On a phone the identity strip moves up into the slot the header leaves when
   it scrolls away. Driven by an observer on the header itself rather than a
   scroll threshold, so it cannot disagree with where the header actually is.

   The hero copy of the strip is faded out at the same moment. Without that the
   two are on screen together, because the hero is pinned and its own strip
   never leaves: the same line printed twice, one above the other. */
export function initRoleBar() {
  const bar = document.querySelector<HTMLElement>("[data-role-bar]");
  const header = document.querySelector<HTMLElement>(".site-header");
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!bar || !header || !("IntersectionObserver" in window)) return;

  new IntersectionObserver(
    ([entry]) => {
      const gone = !entry.isIntersecting;
      bar.toggleAttribute("data-role-bar-on", gone);
      hero?.toggleAttribute("data-meta-lifted", gone);
    },
    { threshold: 0 },
  ).observe(header);
}

/* The closing device: the press coming into register.

   The mark is printed twice, colour plate and key plate, and they arrive out of
   register. Scrolling the footer into place closes the offset to zero, and the
   readout counts it down the way the hero scale reads out its axis.

   Position is measured from the element every frame rather than cached in a
   ScrollTrigger. Two things went wrong with the trigger version and both were
   silent: the hero pin lengthens the document after the trigger resolves its
   start and end, and invalidateOnRefresh re-records the start value from the
   current one, so once the tween had run it became 0 to 0. Reading the rect
   cannot go stale and has no start value to re-record. */
export function initFooterRegister() {
  if (window.matchMedia(REDUCED_QUERY).matches) return;

  const footer = document.querySelector<HTMLElement>("[data-footer]");
  const mark = document.querySelector<HTMLElement>(".site-footer__mark");
  const readout = document.querySelector<HTMLElement>("[data-footer-readout]");
  if (!footer || !mark) return;

  const key = readout?.querySelector<HTMLElement>(".site-footer__readout-key");
  const val = readout?.querySelector<HTMLElement>(".site-footer__readout-val");
  const offsetWord = readout?.dataset.offset ?? "Offset";
  const registeredWord = readout?.dataset.registered ?? "In register";

  // The widest offset the plates are allowed to drift, in the units the
  // readout reports. Only the readout is in millimetres; the drift itself is
  // set in em so it scales with the mark.
  const MAX_MM = 1.4;

  let visible = false;
  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
    },
    { rootMargin: "25% 0px" },
  ).observe(footer);

  let last = -1;
  // The server renders the resolved reading, so that is the state to track
  // from. Deriving it from last was silently wrong: the first frame never
  // counted as a change, so the label never left the resolved word.
  let wasRegistered = true;
  const tick = () => {
    if (visible) {
      const r = mark.getBoundingClientRect();
      const view = window.innerHeight;
      // The convergence is measured on the mark, not on the footer, and its
      // travel is exactly the scroll that remains once the mark has entered
      // the viewport. Measuring it against the footer box instead put most of
      // the range below the fold: by the time the mark appeared it was already
      // a fifth of a millimetre out and the move was over. Deriving the travel
      // this way also guarantees the two ends land: full offset the frame the
      // mark appears, dead in register at the bottom of the document.
      const maxScroll = document.documentElement.scrollHeight - view;
      const docTop = r.top + window.scrollY;
      const travel = Math.max(1, view - (docTop - maxScroll));
      const p = Math.min(1, Math.max(0, (view - r.top) / travel));
      // Snapped at the ends. A residual thousandth is invisible in the
      // impression but it is the difference between the readout saying it is
      // in register and saying it is 0.00 mm out, which is not a reading an
      // instrument should ever give.
      const raw2 = Math.round((1 - p) * 1000) / 1000;
      const reg = raw2 < 0.005 ? 0 : raw2;
      if (reg !== last) {
        last = reg;
        footer.style.setProperty("--reg", String(reg));
        if (key && val) {
          const registered = reg === 0;
          // Only touched when the state actually flips, so the readout is not
          // rewriting the same two strings on every frame of the scroll.
          if (registered !== wasRegistered) {
            wasRegistered = registered;
            key.textContent = registered ? registeredWord : offsetWord;
          }
          val.textContent = registered
            ? ""
            : `${(reg * MAX_MM).toFixed(2)} mm`;
        }
      }
    }
    requestAnimationFrame(tick);
  };
  footer.style.setProperty("--reg", "1");
  requestAnimationFrame(tick);
}

/* Section reveals below the hero. Deliberately one device, used once per
   section, rather than a fade-up on every element. */
export function initReveals() {
  if (window.matchMedia(REDUCED_QUERY).matches) return;

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      },
    );
  });
}
