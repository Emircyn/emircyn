// @ts-check
import { readdirSync } from "node:fs";
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

const SITE = "https://emircyn.com";

// Every page and its twin in the other language. The projects live under a
// different word in each language (/en/projects/, /tr/projeler/), so the
// sitemap integration's own i18n option, which assumes the same path after the
// locale, would pair the wrong URLs. The pairs are listed here instead, from
// the same content folder the pages are generated from, and must agree with
// the hreflang links in SEO.astro.
const slugs = readdirSync(new URL("./src/content/projects/", import.meta.url))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const pairs = [
  ["/en/", "/tr/"],
  ["/en/projects/", "/tr/projeler/"],
  ...slugs.map((s) => [`/en/projects/${s}/`, `/tr/projeler/${s}/`]),
];
const twins = new Map(
  pairs.flatMap(([en, tr]) => {
    const links = [
      { lang: "en", url: SITE + en },
      { lang: "tr", url: SITE + tr },
    ];
    return [
      [SITE + en, links],
      [SITE + tr, links],
    ];
  }),
);

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // One page, about 23 KB of CSS. Inlined, it arrives with the HTML instead of
  // blocking the first paint on a second request.
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [tailwindcss()],
    // Both servers are reviewed over a Tailscale hostname, which Vite blocks by
    // default. `server` covers `astro dev` and `preview` covers `astro preview`;
    // they are separate settings. Neither affects the built site.
    server: { allowedHosts: [".ts.net"] },
    preview: { allowedHosts: [".ts.net"] },
  },
  integrations: [
    sitemap({
      // The root is a language gate, not a page, so the index never
      // advertises a redirect as content.
      filter: (page) => page !== `${SITE}/`,
      // The build date, so a crawler can tell the pages changed since it last came.
      lastmod: new Date(),
      // Region-less on purpose: the site is for English and Turkish readers
      // anywhere, not the US and Turkey.
      serialize(item) {
        const links = twins.get(item.url);
        return links ? { ...item, links } : item;
      },
    }),
  ],
  i18n: {
    locales: ["en", "tr"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});