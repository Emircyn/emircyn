/* ---------------------------------------------------------------------------
   The room engine.

   The DOM is the scene. Every card is a real <li> with a real link and a real
   image; this file only moves them. Each frame it decides where the wall is
   (from drag, wheel, keys or the page scroll) and sets every card on a
   cylinder: the card in focus stands just left of centre, the wall comes
   closest a little to its left and turns away into the room to the right, so
   the next cards recede and fade. The pointer moves the camera a few pixels,
   and the cards drift on their own while nothing else moves them.

   If WebGL is worth it on this device, darkroom-gl.ts is loaded afterwards and
   paints the same cards with the same maths, wrapped round the cylinder
   instead of laid flat on it, rippling with speed, over a floor. It never
   owns geometry, so if it fails, nothing moves.

   Not run under reduced motion: the native scroll-snap track is the static
   composition, and it already works with touch, wheel and Tab.
--------------------------------------------------------------------------- */

type Variant = "page" | "home" | "single";

export type CardFrame = {
  img: HTMLImageElement | null;
  /** Arc position of the card's centre from the apex, in room pixels. */
  s: number;
  /** Card top, size, and fade. */
  top: number;
  w: number;
  h: number;
  alpha: number;
  /** 0 in the background, 1 in focus. */
  focus: number;
  phase: number;
};

export type Frame = {
  /** Canvas size in CSS pixels, and where the canvas sits in the room. */
  width: number;
  height: number;
  offX: number;
  offY: number;
  /** Perspective origin and distance, exactly as the CSS uses them. */
  ox: number;
  oy: number;
  persp: number;
  /** The cylinder: where it comes closest, and its radius. */
  apex: number;
  radius: number;
  /** Where the floor is, or 0 for none. */
  floor: number;
  bend: number;
  radiusPx: number;
  time: number;
  cards: CardFrame[];
};

type Card = {
  li: HTMLElement;
  link: HTMLAnchorElement | null;
  img: HTMLImageElement | null;
  end: boolean;
  // Measured
  center: number;
  top: number;
  w: number;
  h: number;
  // Live
  focus: number;
  phase: number;
};

const REDUCED = "(prefers-reduced-motion: reduce)";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* Pages change without a reload (Astro's ClientRouter): every room is
   stopped, and its GL context given back, before the next page arrives. */
let rooms: AbortController[] = [];
export function destroyDarkrooms() {
  rooms.splice(0).forEach((ac) => ac.abort());
}

export function initDarkrooms() {
  destroyDarkrooms();
  if (window.matchMedia(REDUCED).matches) return;
  document.querySelectorAll<HTMLElement>("[data-darkroom]").forEach((root) => {
    const ac = new AbortController();
    rooms.push(ac);
    try {
      room(root, ac.signal);
    } catch (err) {
      // The native track is still there and still works.
      root.removeAttribute("data-engine");
      console.warn("[room]", err);
    }
  });
}

function room(root: HTMLElement, signal: AbortSignal) {
  const variant = (root.dataset.darkroom || "page") as Variant;
  const track = root.querySelector<HTMLElement>("[data-room-track]")!;
  const list = root.querySelector<HTMLElement>("[data-room-list]")!;
  const canvas = root.querySelector<HTMLCanvasElement>("[data-room-gl]");
  const nows = Array.from(root.querySelectorAll<HTMLElement>("[data-now]"));
  const prev = root.querySelector<HTMLButtonElement>("[data-room-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-room-next]");

  const cards: Card[] = Array.from(root.querySelectorAll<HTMLElement>("[data-print]")).map((li, i) => ({
    li,
    link: li.querySelector("a"),
    img: li.querySelector<HTMLImageElement>("[data-print-img]"),
    end: li.hasAttribute("data-print-end"),
    center: 0,
    top: 0,
    w: 0,
    h: 0,
    focus: 0,
    phase: i * 1.73,
  }));
  if (!cards.length) return;

  // The engine hides nothing until it is ready to draw it.
  root.setAttribute("data-engine", "");
  track.scrollLeft = 0;
  // Offscreen cards in a clipped track would never trigger lazy loading.
  cards.forEach((c) => c.img && (c.img.loading = "eager"));

  let gl: { draw: (f: Frame) => void; resize: (w: number, h: number) => void; dispose: () => void } | null = null;

  /* --- Geometry ----------------------------------------------------------- */

  let W = 0, H = 0, trackX = 0, trackY = 0, trackW = 0, trackH = 0;
  let persp = 1400, radius = 1000, apexK = 0.26, cornerPx = 16;
  let canvasX = 0, canvasY = 0, canvasW = 0, canvasH = 0;
  let stops: number[] = [];
  const num = (name: string, fallback: number) =>
    parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;

  const measure = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    trackX = track.offsetLeft;
    trackY = track.offsetTop;
    trackW = track.clientWidth;
    trackH = track.clientHeight;
    const mobile = W < 768;
    persp = variant === "single" ? 2200 : mobile ? 1000 : 1600;
    radius = W * num("--curve", 1);
    apexK = num("--apex", 26) / 100;
    track.style.setProperty("--persp", `${persp}px`);
    // A transformed list becomes the cards' offsetParent in some engines, so
    // offsets are taken relative to the list and the list's own place in the
    // track is added once. offsetLeft/Top ignore transforms: this is the card
    // at rest, which is what both the CSS and the shader start from.
    const lx = list.offsetLeft, ly = list.offsetTop;
    cards.forEach((c) => {
      const viaList = c.li.offsetParent === list;
      c.w = c.li.offsetWidth;
      c.h = c.li.offsetHeight;
      c.center = c.li.offsetLeft + (viaList ? lx : 0) + c.w / 2;
      c.top = c.li.offsetTop + (viaList ? ly : 0);
    });
    const anchor = num("--anchor", 50);
    stops = cards.map((c) => c.center - (trackW * anchor) / 100);
    cornerPx = parseFloat(getComputedStyle(cards[0].link || cards[0].li).borderTopLeftRadius) || 16;
    if (canvas) {
      canvasX = canvas.offsetLeft;
      canvasY = canvas.offsetTop;
      canvasW = canvas.clientWidth;
      canvasH = canvas.clientHeight;
    }
    gl?.resize(canvasW, canvasH);
  };

  /* --- State -------------------------------------------------------------- */

  const startAt = (() => {
    // Coming back from a project, the wall starts on that project.
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem("vt-slug");
    } catch {}
    const hit = slug ? cards.findIndex((c) => c.li.dataset.slug === slug) : -1;
    return variant === "page" && hit >= 0 ? hit : Number(root.dataset.start || 0);
  })();

  measure();
  let x = stops[startAt] ?? 0;
  let target = x;
  let lastX = x;
  let bend = 0;
  let current = -1;
  cards[startAt] && (cards[startAt].focus = 1);

  const minX = () => stops[0];
  const maxX = () => stops[stops.length - 1];
  const nearest = (v: number) => {
    let best = 0;
    stops.forEach((s, i) => Math.abs(s - v) < Math.abs(stops[best] - v) && (best = i));
    return best;
  };
  // Past either end the wall gives, then pulls back.
  const rubber = (v: number) => {
    const lo = minX(), hi = maxX();
    if (v < lo) return lo - Math.pow(lo - v, 0.8);
    if (v > hi) return hi + Math.pow(v - hi, 0.8);
    return v;
  };
  const go = (i: number, focus = false) => {
    const k = clamp(i, 0, cards.length - 1);
    target = stops[k];
    if (focus) cards[k].link?.focus({ preventScroll: true });
  };

  /* --- Input -------------------------------------------------------------- */

  const self = variant === "page";
  let dragging = false;
  let moved = false;
  let wheelIdle = 0;
  let wheelFrom = 0;

  if (self) {
    // Wheel: either axis moves the line. At either end it lets go, so the
    // page below the line can still be reached with the same gesture.
    root.addEventListener(
      "wheel",
      (e) => {
        const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
        const atStart = target <= minX() + 1 && d < 0;
        const atEnd = target >= maxX() - 1 && d > 0;
        if ((atStart || atEnd) && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return;
        e.preventDefault();
        e.stopPropagation();
        if (!wheelIdle) wheelFrom = nearest(target);
        target = clamp(target + d * 1.1, minX() - 120, maxX() + 120);
        clearTimeout(wheelIdle);
        // When the gesture ends, settle on a card. One notch of a mouse
        // wheel is a deliberate "next", so any real travel moves at least one.
        wheelIdle = window.setTimeout(() => {
          wheelIdle = 0;
          const moved = target - stops[wheelFrom];
          let to = nearest(target);
          if (to === wheelFrom && Math.abs(moved) > 40) to += Math.sign(moved);
          go(to);
        }, 160);
      },
      { passive: false },
    );

    // Drag and flick, for mouse, pen and touch alike. Vertical swipes are
    // left to the page (touch-action: pan-y); only a clearly horizontal
    // gesture is taken.
    let sx = 0, sy = 0, st = 0, decided = false, pid = -1;
    let samples: { t: number; x: number }[] = [];
    track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      sx = e.clientX;
      sy = e.clientY;
      st = target;
      decided = false;
      moved = false;
      pid = e.pointerId;
      samples = [{ t: e.timeStamp, x: e.clientX }];
    });
    track.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!decided) {
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          decided = true;
          dragging = true;
          moved = true;
          root.setAttribute("data-dragging", "");
          track.setPointerCapture(e.pointerId);
        } else if (Math.abs(dy) > 8) {
          pid = -1;
          return;
        } else return;
      }
      const k = e.pointerType === "touch" ? 1.2 : 1;
      target = rubber(st - dx * k);
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 6) samples.shift();
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      if (!dragging) return;
      dragging = false;
      root.removeAttribute("data-dragging");
      const a = samples[0], b = samples[samples.length - 1];
      const v = a && b && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0; // px per ms, on screen
      const from = nearest(target);
      let to = nearest(target - v * 260);
      // A flick always moves at least one card, however short.
      if (to === from && Math.abs(v) > 0.35) to = from + (v < 0 ? 1 : -1);
      go(to);
    };
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    // A drag that started on a link must not open it.
    track.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true,
    );
    track.addEventListener("dragstart", (e) => e.preventDefault());

    // Keys: anywhere on the page while nothing else has focus, and always
    // inside the room. Focus follows, so a screen reader hears the card.
    document.addEventListener("keydown", (e) => {
      const a = document.activeElement;
      if (a && a !== document.body && !root.contains(a)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const i = nearest(target);
      const to =
        e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? cards.length - 1 : null;
      if (to === null) return;
      e.preventDefault();
      go(to, true);
    }, { signal });
    prev?.addEventListener("click", () => go(nearest(target) - 1));
    next?.addEventListener("click", () => go(nearest(target) + 1));
  }

  // Tabbing onto a card brings it into focus, whatever drives the wall.
  root.addEventListener("focusin", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("[data-print]");
    if (li) go(Number(li.dataset.index));
  });

  // The homepage drives its line from the page scroll (scroll.ts pins the act
  // and sends progress). The line still eases toward it, so it has weight.
  root.addEventListener("darkroom:progress", ((e: CustomEvent<number>) => {
    target = minX() + (maxX() - minX()) * clamp(e.detail, 0, 1);
  }) as EventListener);

  // The pointer moves the camera a little: the room has depth, and shows it.
  let px = 0, py = 0, cx = 0, cy = 0;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    root.addEventListener("pointermove", (e) => {
      const r = root.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    root.addEventListener("pointerleave", () => (px = py = 0));
  }

  // The single card answers the page scroll instead.
  let pageY = window.scrollY, pageV = 0;

  /* --- Frame -------------------------------------------------------------- */

  const frame: Frame = {
    width: 0, height: 0, offX: 0, offY: 0, ox: 0, oy: 0, persp: 0,
    apex: 0, radius: 0, floor: 0, bend: 0, radiusPx: 0, time: 0, cards: [],
  };
  const cf: CardFrame[] = cards.filter((c) => !c.end).map((c) => ({
    img: c.img, s: 0, top: 0, w: 0, h: 0, alpha: 1, focus: 0, phase: c.phase,
  }));

  const t0 = performance.now();
  let lastT = t0;

  const step = (now: number) => {
    const dt = clamp((now - lastT) / 16.667, 0.25, 3);
    lastT = now;
    const time = (now - t0) / 1000;

    // The wall.
    const ease = dragging ? 0.5 : variant === "home" ? 0.12 : 0.085;
    x += (target - x) * (1 - Math.pow(1 - ease, dt));
    const v = (x - lastX) / dt;
    lastX = x;

    if (variant === "single") {
      const y = window.scrollY;
      pageV += ((y - pageY) / dt - pageV) * 0.2;
      pageY = y;
    }
    // Speed ripples the cards; screen motion is the opposite of x.
    const drive = variant === "single" ? clamp(pageV / 60, -1, 1) * 0.5 : clamp(-v / 30, -1, 1);
    bend += (drive - bend) * 0.12;

    cx += (px - cx) * 0.05;
    cy += (py - cy) * 0.05;

    list.style.transform = `translate3d(${(-x).toFixed(2)}px,0,0)`;

    // Perspective origin: the middle of the track, nudged by the pointer.
    const pox = trackW / 2 + cx * 22;
    const poy = trackH / 2 + cy * 14;
    track.style.perspectiveOrigin = `${pox.toFixed(1)}px ${poy.toFixed(1)}px`;
    const ox = trackX + pox;
    const oy = trackY + poy;

    const apex = variant === "single" ? trackX + cards[0].center - x : trackX + trackW * apexK;
    const here = nearest(x);
    let gi = 0;
    let floor = 0;

    cards.forEach((c, i) => {
      const layoutX = trackX + c.center - x;
      const s = layoutX - apex;
      const th = s / radius;
      // Where the cylinder puts the card's centre, and how far it has turned.
      const wx = apex + radius * Math.sin(th);
      const wz = -radius * (1 - Math.cos(th));
      // Cards turning away fade out before they would show their backs.
      const alpha = clamp(1 - (Math.abs(th) - 0.55) / 0.5, 0, 1);
      // A slow drift, out of phase from card to card.
      const drift = variant === "single" ? 0 : Math.sin(time * 0.8 + c.phase) * 4;

      const tgt = i === here ? 1 : 0;
      c.focus += (tgt - c.focus) * 0.08 * dt;

      c.li.style.transform = `translate3d(${(wx - layoutX).toFixed(1)}px,${drift.toFixed(1)}px,${wz.toFixed(1)}px) rotateY(${th.toFixed(4)}rad)`;
      c.li.style.opacity = alpha.toFixed(3);
      c.li.style.visibility = alpha < 0.01 ? "hidden" : "";
      floor = Math.max(floor, trackY + c.top + c.h);

      if (!c.end) {
        const f = cf[gi++];
        f.s = s;
        f.top = trackY + c.top + drift;
        f.w = c.w;
        f.h = c.h;
        f.alpha = alpha;
        f.focus = c.focus;
      }
    });

    const ci = nearest(target);
    if (ci !== current) {
      current = ci;
      cards.forEach((c, i) => c.li.toggleAttribute("data-current", i === ci));
      nows.forEach((n, i) => n.toggleAttribute("data-current", i === ci));
      if (prev) prev.disabled = ci === 0;
      if (next) next.disabled = ci === cards.length - 1;
      root.dispatchEvent(new CustomEvent("darkroom:current", { detail: ci, bubbles: true }));
    }

    if (gl) {
      // Everything handed over in canvas pixels.
      frame.width = canvasW;
      frame.height = canvasH;
      frame.offX = -canvasX;
      frame.offY = -canvasY;
      frame.ox = ox - canvasX;
      frame.oy = oy - canvasY;
      frame.persp = persp;
      frame.apex = apex - canvasX;
      frame.radius = radius;
      frame.floor = variant === "single" ? 0 : floor + H * 0.02 - canvasY;
      frame.bend = bend;
      frame.radiusPx = cornerPx;
      frame.time = time;
      frame.cards = cf;
      gl.draw(frame);
    }
  };

  /* --- Loop: only while visible ------------------------------------------ */

  let raf = 0;
  let visible = true;
  const loop = (now: number) => {
    step(now);
    raf = requestAnimationFrame(loop);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    if (visible && !document.hidden && !signal.aborted) {
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      run();
    });
    io.observe(root);
    signal.addEventListener("abort", () => io.disconnect());
  }
  document.addEventListener("visibilitychange", run, { signal });

  let rw = window.innerWidth;
  const ro = new ResizeObserver(() => {
    const was = nearest(target);
    measure();
    // Keep the same card in focus across a resize.
    if (window.innerWidth !== rw) {
      rw = window.innerWidth;
      x = target = stops[was];
    }
  });
  ro.observe(root);
  signal.addEventListener("abort", () => {
    visible = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    gl?.dispose();
    gl = null;
  });

  /* --- WebGL, if it is worth it ------------------------------------------ */

  const startGL = () => {
    if (!canvas) return;
    // A lost context hands the room back to the DOM cards, mid-flight.
    canvas.addEventListener("webglcontextlost", () => {
      gl = null;
      root.removeAttribute("data-gl");
    });
    import("./darkroom-gl")
      .then((m) => {
        if (signal.aborted) return;
        gl = m.createRenderer(canvas, cards.filter((c) => !c.end).map((c) => c.img));
        if (!gl) return;
        gl.resize(canvasW, canvasH);
        root.setAttribute("data-gl", "");
      })
      .catch((err) => console.warn("[room] staying on DOM cards:", err));
  };
  if (canvas && glWorthIt()) {
    // On a phone the cards are already in place as DOM; WebGL waits for the
    // first touch, scroll or key, so it never competes with loading the page
    // and a visitor who only reads never pays for it. The canvas fades in.
    if (window.matchMedia("(pointer: coarse)").matches) {
      const events = ["pointerdown", "touchstart", "scroll", "wheel", "keydown"] as const;
      const once = () => {
        events.forEach((e) => window.removeEventListener(e, once));
        startGL();
      };
      events.forEach((e) => window.addEventListener(e, once, { passive: true, once: true, signal }));
    } else startGL();
  }

  run();
}

/** WebGL only where it will run well: not on data saver, not on a low-memory
 *  or low-core device, and only if a context can actually be made. */
function glWorthIt() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4) return false;
  return true;
}
