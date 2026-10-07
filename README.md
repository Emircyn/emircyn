<a href="https://emircyn.com"><img src="public/og-image.jpg" alt="Emircan Erdemci, full stack AI engineer, Ankara" width="100%"></a>

### Full stack AI engineer in Ankara. I build complete products, and the part people touch is still done by hand.

Currently at [InspireIT](https://inspireit.com.tr/). I build products end to end: the interface, the backend and database behind it, payments, and the AI features inside (LLM integrations, tool calls rendered as interface, inference at the edge). I came to this from the frontend, so the motion, the performance and the detail still get the most care.

**[emircyn.com](https://emircyn.com)** · [LinkedIn](https://www.linkedin.com/in/emircyn/) · [emircan.erdemci@hotmail.com](mailto:emircan.erdemci@hotmail.com) · [Türkçe](https://emircyn.com/tr/)

**Recent work** (each one has a page with its architecture and decisions on [emircyn.com/en/projects](https://emircyn.com/en/projects/))

- **[Porch](https://emircyn.com/en/projects/porch/)**: a link-in-bio SaaS, from idea to working product. Plan limits enforced by Postgres triggers and row-level security, Stripe webhooks as the only way to change a plan, fitted to 10 ms of Worker CPU. [Live](https://porch.emircan-erdemci.workers.dev) · [source](https://github.com/Emircyn/porch) · `Next.js` `Supabase` `Stripe` `Cloudflare Workers`
- **[Parley](https://emircyn.com/en/projects/parley/)**: an AI chat whose tool calls arrive as typed parts of the stream and render as cards, on Workers AI, behind Turnstile, signed sessions and rate limits. [Live](https://parley.emircan-erdemci.workers.dev) · [source](https://github.com/Emircyn/parley) · `Nuxt` `AI SDK` `Workers AI`
- **[Formadaş](https://emircyn.com/en/projects/formadas/)**: which players have two clubs shared? A data pipeline from Wikidata into a SQLite cache that refreshes itself on the transfer calendar and still answers when the source is down. [Live](https://formadas.com/) · `Nuxt` `Node` `SQLite` `Docker`
- **[InspireIT](https://emircyn.com/en/projects/inspireit/)**: the bilingual website of the company I work for. I built its frontend and WordPress infrastructure from the Figma design. `WordPress` `Elementor`
- **[emircyn.com](https://emircyn.com)**: this repo. A scroll-driven portfolio with a WebGL project wall, 100 on desktop Lighthouse. `Astro` `GSAP` `WebGL` `Cloudflare Workers`

**Stack:** TypeScript · React / Next.js · Vue / Nuxt · Astro · Node · Postgres / Supabase · SQLite · Stripe · AI SDK / Workers AI · Cloudflare Workers · Docker

<details>
<summary><b>About this repository</b>: the source of emircyn.com, how it works and how to run it</summary>

This is the source of [emircyn.com](https://emircyn.com), in English and Turkish. The homepage is built as a scroll-driven film: five acts on a dark ground with one hard cut to paper, and a crimson thread down the left edge that is drawn by scroll and doubles as navigation.

| # | Act | What happens |
|---|---|---|
| 1 | Hero | Four planes (room, name, alpha-cut figure, haze) driven by scroll, pointer and an idle loop |
| 2 | Work | A stretch of the project wall, pinned while the page scroll walks it, under the four layers a product is built in (interface, backend, data, AI). The layers each print used light up; the line ends on a card to every project |
| 3 | Measure | A dial clip scrubbed by the wheel; the readout steps through figures measured across the stack: Lighthouse scores, Worker size, AI quota, render time |
| 4 | Record | Hard cut to paper, reveals only, deliberately still |
| 5 | Contact | Pointer-lit close with a magnetic mail link |

**The project wall** (`/en/projects/`, `/tr/projeler/`). The projects stand as large cards on a curved wall in the dark room, over a floor grid that runs off into the distance; the crimson thread is drawn on the floor where the wall stands. Drag, flick, scroll or use the arrow keys: the wall turns, the cards ripple like flags with the speed and settle, and the pointer moves the camera a few pixels. It is built in three layers, each complete on its own: a native scroll-snap track of real links (no JS, reduced motion), the same track driven by `darkroom.ts` with CSS 3D, and `darkroom-gl.ts`, a few KB of raw WebGL that wraps each card round the cylinder, ripples it and draws the floor. WebGL loads after the first paint, only on capable devices, and stops when off screen or when the tab is hidden.

**Project pages** (`/en/projects/<slug>/`, `/tr/projeler/<slug>/`) are generated from `src/content/projects/<slug>.json`: the problem, the role, the architecture drawn as a section (each layer, where it runs, and one real request traced through it), the decisions, the stack, the shots and the next project. Adding a project is one JSON file plus `src/assets/projects/<slug>-desktop*.png` and `<slug>-mobile*.png`.

**Between pages**, cross-document View Transitions carry the clicked print from the homepage to the line to its page and back, while the header and the thread hold still.

Every page has a complete static composition. With `prefers-reduced-motion` or without JavaScript, everything still reads top to bottom with real images and links, and the motion is only loaded after the first paint.

**Lighthouse performance:** 100 on desktop, 91 on a throttled phone (median of three runs, September 2026).

#### Stack

- [Astro 5](https://astro.build/), static output, no client framework
- [Tailwind CSS 4](https://tailwindcss.com/) for the tokens, component styles scoped in `.astro` files
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) for pinned and scrubbed timelines
- [Lenis](https://github.com/darkroomengineering/lenis) for wheel smoothing (touch stays native)
- Raw WebGL 1 for the project wall, no 3D library
- Astro content collections for the projects, View Transitions between pages
- Archivo Variable and JetBrains Mono, self-hosted through Fontsource
- A Cloudflare Worker with static assets, which also folds `http://` and `www.` into one canonical host

#### Run it locally

```bash
npm install        # or: bun install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npx wrangler dev   # the built site behind the Worker, as in production
node scripts/og.mjs  # redraw the link-preview cards after copy or project changes
node scripts/icons.mjs  # redraw the favicon, touch and manifest icons from the mark
```

Pushes to `master` build and deploy through Cloudflare Workers Builds. Preview URLs are off; review a build locally with `npx wrangler dev`.

#### Layout

```
src/
├── assets/         # hero plates, portrait, dial poster, project screenshots
├── components/     # one file per act, the project wall (Darkroom.astro), the project pages, SEO, header, thread
├── content/        # projects/<slug>.json: one file per project, both languages
├── i18n/           # en.json, tr.json and the t() helper
├── layouts/        # Layout.astro: engines after first paint, view-transition naming
├── lib/            # projects.ts: routes, screenshots, structured data
├── pages/          # /en/, /tr/, /en/projects/, /tr/projeler/, robots.txt, a local-only gate
├── scripts/        # scroll.ts (acts, thread), scrub.ts (dial), darkroom.ts + darkroom-gl.ts
└── styles/         # global.css: tokens, grounds, grain, ticker, page transitions
public/
├── media/          # dial clips encoded for scrubbing
├── og/             # link-preview cards for the projects pages (scripts/og.mjs)
├── _headers        # edge caching and security headers
└── _redirects      # / → /en/
scripts/mark.mjs    # the EE mark, drawn on a pixel grid; shared by icons and cards
scripts/icons.mjs   # favicon.svg/.ico, touch, manifest and maskable icons, logo.png
scripts/og.mjs      # draws every link-preview card from the site's own assets
worker/index.js     # canonical host redirect, noindex on preview URLs
```

#### License

The code is [MIT](LICENSE). The portrait, photographs, project screenshots and the site’s copy are mine and are not covered by that license; please don’t reuse them.

</details>
