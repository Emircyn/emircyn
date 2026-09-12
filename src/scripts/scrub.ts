/* ---------------------------------------------------------------------------
   Scroll-scrubbed clips.

   Four things make the difference between a clip that scrubs and one that
   stutters, and all four are easy to leave out:

   1. The clip is mapped across the stage's ENTIRE VISIBLE LIFE, not across its
      pinned travel. A pinned stage is on screen for one viewport before the pin
      engages and one after it releases. Driving the playhead from the pinned
      progress alone leaves the clip frozen on frame one while it slides in and
      frozen on its last frame while it slides out, which reads as the page
      breaking. Every individual frame of that bug looks perfectly correct, so
      it never shows up in a screenshot taken one at a time.

   2. Scroll never writes currentTime. It writes a target; a standalone rAF loop
      walks the playhead toward it. Wheel events do not arrive at a constant
      rate, and a 1:1 write reproduces every gap in them as a stutter.

   3. A deadband, because a seek smaller than one frame costs a decode and shows
      nothing. Larger on touch, where it costs more and shows less.

   4. Seek coalescing. Queueing a seek while the decoder is still resolving the
      last one is how a fast flick freezes the clip outright.

   The poster stays up until a real video frame has painted. iOS keeps a
   seeked-but-never-played muted video blank, so hiding the poster on metadata
   alone flashes an empty stage.
--------------------------------------------------------------------------- */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const LERP = 0.18;

/* Progress published by another driver. The hero clip cannot use the rect
   mapping below: the hero is pinned, so its plane does not move on screen at
   all while the scrub is happening, and its own rect would report a single
   frozen value for the whole act. The hero timeline owns that progress, and
   writes it here. Everything else about the playhead, the lerp, the deadband,
   the seek coalescing and the poster hand-off, stays in one place. */
const driven = new Map<string, number>();

export function setDrivenProgress(key: string, p: number) {
  driven.set(key, Math.min(1, Math.max(0, p)));
}

type Clip = {
  video: HTMLVideoElement;
  stage: HTMLElement;
  poster: HTMLElement | null;
  duration: number;
  target: number;
  current: number;
  seeking: boolean;
  painted: boolean;
  visible: boolean;
  /** Set when the target comes from another driver instead of the rect. */
  drivenBy: string | null;
};

/** Remap linear progress so the clip moves quickly at the edges and settles in
 *  the middle, where the copy sits. Paired with the visible-life mapping: the
 *  fast motion lands on the two slides, the settle lands inside the pin. */
function dwell(p: number, amount: number): number {
  if (amount <= 0) return p;
  const k = 1 - amount;
  const eased = p < 0.5
    ? 0.5 * Math.pow(2 * p, 1 / (1 - amount * 0.75))
    : 1 - 0.5 * Math.pow(2 * (1 - p), 1 / (1 - amount * 0.75));
  return p * k + eased * amount;
}

export function initScrub() {
  const stages = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scrub-stage]"),
  );
  if (!stages.length) return;

  const reduced = window.matchMedia(REDUCED_QUERY).matches;
  // Under reduced motion the clip is never fetched at all. The poster still
  // renders, so the section is a still photograph rather than a dead frame.
  if (reduced) {
    stages.forEach((s) => s.setAttribute("data-scrub-static", ""));
    return;
  }

  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const deadband = mobile ? 0.02 : 0.008;
  const clips: Clip[] = [];

  for (const stage of stages) {
    const video = stage.querySelector<HTMLVideoElement>("[data-scrub-video]");
    if (!video) continue;

    const src = mobile
      ? video.dataset.scrubSrcMobile || video.dataset.scrubSrc
      : video.dataset.scrubSrc;
    if (!src) continue;

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    (video as HTMLVideoElement & { disableRemotePlayback: boolean })
      .disableRemotePlayback = true;

    const clip: Clip = {
      video,
      stage,
      poster: stage.querySelector<HTMLElement>("[data-scrub-poster]"),
      duration: 0,
      target: 0,
      current: 0,
      seeking: false,
      painted: false,
      visible: false,
      drivenBy: stage.dataset.scrubDriven || null,
    };

    // Fetched as a Blob so seeking does not depend on the host honouring HTTP
    // range requests, which a static CDN does not always do for video. A dense
    // GOP file is megabytes, so the fetch does not start until the stage is
    // within a screen or two of being needed: it must never sit on the initial
    // load of a page whose whole argument is that performance is measurable.
    let fetched = false;
    const load = () => {
      if (fetched) return;
      fetched = true;
      // Never before the page has finished loading. The hero plane is above
      // the fold, so an observer alone would start a megabyte of video while
      // the first paint is still competing for bandwidth. Nothing here is
      // needed until the visitor scrolls.
      if (document.readyState !== "complete") {
        window.addEventListener("load", () => load2(), { once: true });
        return;
      }
      load2();
    };
    const load2 = () => {
      fetch(src)
        .then((r) => r.blob())
        .then((blob) => {
          video.src = URL.createObjectURL(blob);
        })
        .catch(() => {
          video.src = src;
        });
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            load();
            io.disconnect();
          }
        },
        { rootMargin: "150% 0px" },
      );
      io.observe(stage);
    } else {
      load();
    }

    video.addEventListener("loadedmetadata", () => {
      clip.duration = video.duration || 0;
    });

    video.addEventListener("seeked", () => {
      clip.seeking = false;
      if (!clip.painted) {
        clip.painted = true;
        stage.setAttribute("data-scrub-ready", "");
      }
    });

    clips.push(clip);

    // Visibility only. The progress itself is measured from the element every
    // frame (see tick), not cached in a trigger: the hero pin adds several
    // viewport heights to the document after this runs, and any start/end
    // resolved before that is stale by thousands of pixels, which pins the
    // playhead to the last frame for the whole section.
    if ("IntersectionObserver" in window) {
      const vis = new IntersectionObserver(
        (entries) => {
          clip.visible = entries.some((e) => e.isIntersecting);
        },
        { rootMargin: "50% 0px" },
      );
      vis.observe(stage);
    } else {
      clip.visible = true;
    }
  }

  if (!clips.length) return;

  let raf = 0;
  const tick = () => {
    const vh = window.innerHeight;

    for (const c of clips) {
      if (!c.duration) continue;
      // An offscreen clip that has already arrived is not touched at all.
      if (!c.visible && Math.abs(c.target - c.current) < 0.001) continue;

      // The clip is mapped across the stage's entire visible life: progress 0
      // when its top reaches the bottom of the viewport, 1 when its bottom
      // leaves the top. Mapping it to the sticky travel alone would freeze the
      // clip on frame one while the section slides in and on its last frame
      // while it slides out, which is the failure this device is known for.
      if (c.drivenBy) {
        // Straight through, no dwell: this playhead is tied to another move
        // and has to stay in step with it rather than ease on its own.
        c.target = driven.get(c.drivenBy) ?? c.target;
      } else {
        const rect = c.stage.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh + rect.height);
        c.target = dwell(Math.min(1, Math.max(0, raw)), 0.35);
      }

      c.current += (c.target - c.current) * LERP;
      const t = c.current * c.duration;

      if (!c.seeking && Math.abs(t - c.video.currentTime) > deadband) {
        c.seeking = true;
        try {
          c.video.currentTime = t;
        } catch {
          c.seeking = false;
        }
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // requestVideoFrameCallback is the only reliable signal that a real frame has
  // actually painted, which is what the poster is waiting for.
  for (const c of clips) {
    const rvfc = (
      c.video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      }
    ).requestVideoFrameCallback;
    if (typeof rvfc === "function") {
      rvfc.call(c.video, () => {
        c.painted = true;
        c.stage.setAttribute("data-scrub-ready", "");
      });
    }
  }

  window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
}
