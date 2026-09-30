// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://emircyn.com",
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
      // The root is a language gate, not a page. Only the two real pages are
      // listed, so the index never advertises a redirect as content.
      filter: (page) => page !== "https://emircyn.com/",
      // These have to match the hreflang values in SEO.astro, or the sitemap and
      // the markup disagree about the same two URLs. Region-less on purpose: the
      // site is for English and Turkish readers anywhere, not the US and Turkey.
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          tr: "tr",
        },
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