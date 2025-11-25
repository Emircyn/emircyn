// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://emircyn.com",
  vite: { plugins: [tailwindcss()], },
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-US",
          tr: "tr-TR",
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