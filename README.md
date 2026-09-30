# emircyn.com

Personal site of Emircan Erdemci, frontend developer in Ankara. Live at [emircyn.com](https://emircyn.com), in English and Turkish.

The page is built as a scroll-driven film: five acts on a dark ground with one hard cut to paper, continuous ambient motion, and a crimson thread down the left edge that is drawn by scroll and doubles as navigation.

## Stack

- [Astro 5](https://astro.build/) static output, no client framework, zero islands
- [Tailwind CSS 4](https://tailwindcss.com/) for the token layer, component styles scoped in `.astro` files
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) for pinned acts and scrubbed timelines
- [Lenis](https://github.com/darkroomengineering/lenis) for wheel smoothing (touch stays native)
- Archivo Variable (width axis) and JetBrains Mono, self-hosted via Fontsource
- Deployed as a Cloudflare Worker with static assets

## The acts

| # | Section | Device |
|---|---|---|
| 1 | Hero | Four planes (room, name, alpha-cut figure, haze) driven by scroll, pointer and an idle loop |
| 2 | Work | The three services hold still in a column while the projects pass beside them; the services each project used light up. Each project is a browser frame clipped open from the thread side with a phone riding over it |
| 3 | Measure | A dial clip scrubbed by the wheel; the readout steps through real Lighthouse scores |
| 4 | Record | Hard cut to paper, reveals only, deliberately still |
| 5 | Contact | Pointer-lit close with a magnetic mail link |

Every act has a complete static composition: with `prefers-reduced-motion` or without JavaScript, the page still reads top to bottom.

## Development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview
```

Pushes to `master` build and deploy to production through Cloudflare Workers Builds. Other branches get a preview version.

## Layout

```
src/
├── assets/         # hero plates, portrait, dial poster, project screenshots
├── components/     # one file per act, plus SEO, header, thread
├── i18n/           # en.json, tr.json and the t() helper
├── layouts/        # Layout.astro wires the scroll engine
├── pages/          # / (language gate), /en/, /tr/, robots.txt
├── scripts/        # scroll.ts (acts, ambient loop, thread), scrub.ts (video)
└── styles/         # global.css: tokens, grounds, grain, ticker
public/
├── media/          # dial clips encoded for scrubbing
├── tex/            # grain tile
└── _headers        # edge caching and security headers
```

## License

[MIT](LICENSE).
