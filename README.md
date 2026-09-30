<a href="https://emircyn.com"><img src="public/og-image.jpg" alt="Emircan Erdemci, frontend developer, Ankara" width="100%"></a>

### Frontend developer in Ankara. I build the part of the web people actually touch.

Currently at [InspireIT](https://inspireit.com.tr/). Websites and web apps that load fast, hold up on every screen, and move only when the motion explains something. I measure before I fix, and again after.

**[emircyn.com](https://emircyn.com)** · [LinkedIn](https://www.linkedin.com/in/emircyn/) · [emircan.erdemci@hotmail.com](mailto:emircan.erdemci@hotmail.com) · [Türkçe](https://emircyn.com/tr/)

**Recent work**

- **[Porch](https://github.com/Emircyn/porch)**: a link-in-bio SaaS, from idea to working product. Drag-and-drop editor with a live phone preview, Stripe subscriptions, plan limits enforced in Postgres. [Live](https://porch.emircan-erdemci.workers.dev) · [one-click demo](https://porch.emircan-erdemci.workers.dev/demo) · `Next.js` `Supabase` `Stripe`
- **[Parley](https://github.com/Emircyn/parley)**: an AI chat that answers with cards, not just text, running entirely on Cloudflare’s free tier. [Live](https://parley.emircan-erdemci.workers.dev) · `Nuxt` `AI SDK` `Workers AI`
- **[emircyn.com](https://emircyn.com)**: this repo. A scroll-driven portfolio, 100 on desktop Lighthouse. `Astro` `GSAP` `Cloudflare Workers`
- **[InspireIT](https://inspireit.com.tr/)**: the bilingual website of the company I work for. I built its frontend and WordPress infrastructure from the Figma design. `WordPress` `Elementor`
- **[Formadaş](https://formadas.com/)**: find footballers who played for both clubs, compare a country and club, or explore and share player profiles. Installable on your phone, with player-specific share cards. Combines Wikidata and API-Football data with a local SQLite cache. `Nuxt` `Nuxt UI` `SQLite`

**Stack:** TypeScript · React / Next.js · Vue / Nuxt · Astro · Tailwind CSS · Cloudflare Workers

<details>
<summary><b>About this repository</b>: the source of emircyn.com, how it works and how to run it</summary>

This is the source of [emircyn.com](https://emircyn.com), in English and Turkish. The page is built as a scroll-driven film: five acts on a dark ground with one hard cut to paper, and a crimson thread down the left edge that is drawn by scroll and doubles as navigation.

| # | Act | What happens |
|---|---|---|
| 1 | Hero | Four planes (room, name, alpha-cut figure, haze) driven by scroll, pointer and an idle loop |
| 2 | Work | The three services hold still in a column while the projects pass beside them, and the services each project used light up. Each project is a browser frame clipped open from the thread’s side with a phone riding over it |
| 3 | Measure | A dial clip scrubbed by the wheel; the readout steps through real Lighthouse scores |
| 4 | Record | Hard cut to paper, reveals only, deliberately still |
| 5 | Contact | Pointer-lit close with a magnetic mail link |

Every act has a complete static composition. With `prefers-reduced-motion` or without JavaScript, the page still reads top to bottom, and the scroll engine is only loaded after the first paint.

**Lighthouse performance:** 100 on desktop, 91 on a throttled phone (median of three runs, September 2026).

#### Stack

- [Astro 5](https://astro.build/), static output, no client framework
- [Tailwind CSS 4](https://tailwindcss.com/) for the tokens, component styles scoped in `.astro` files
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) for pinned and scrubbed timelines
- [Lenis](https://github.com/darkroomengineering/lenis) for wheel smoothing (touch stays native)
- Archivo Variable and JetBrains Mono, self-hosted through Fontsource
- A Cloudflare Worker with static assets, which also folds `http://` and `www.` into one canonical host

#### Run it locally

```bash
npm install        # or: bun install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npx wrangler dev   # the built site behind the Worker, as in production
```

Pushes to `master` build and deploy through Cloudflare Workers Builds. Preview URLs are off; review a build locally with `npx wrangler dev`.

#### Layout

```
src/
├── assets/         # hero plates, portrait, dial poster, project screenshots
├── components/     # one file per act, plus SEO, header, thread
├── i18n/           # en.json, tr.json and the t() helper
├── layouts/        # Layout.astro loads the scroll engine after first paint
├── pages/          # /en/, /tr/, robots.txt, and a local-only language gate
├── scripts/        # scroll.ts (acts, ambient loop, thread), scrub.ts (dial)
└── styles/         # global.css: tokens, grounds, grain, ticker
public/
├── media/          # dial clips encoded for scrubbing
├── _headers        # edge caching and security headers
└── _redirects      # / → /en/
worker/index.js     # canonical host redirect, noindex on preview URLs
```

#### License

The code is [MIT](LICENSE). The portrait, photographs, project screenshots and the site’s copy are mine and are not covered by that license; please don’t reuse them.

</details>
