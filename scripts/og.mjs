// Link-preview cards, 1200×630, drawn from the site's own plates, portrait,
// screenshots and copy, so a change of title or a new project is one command
// away instead of an image edit:
//
//   node scripts/og.mjs
//
// Writes public/og-image.jpg and public/og-image-tr.jpg (the homepage cards),
// and public/og/projects-{en,tr}.jpg and public/og/<slug>-{en,tr}.jpg. Needs
// the Chromium that playwright-core uses (npx playwright install chromium).
// After changing a card, bump the ?v= in SEO.astro: networks cache by URL.

import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { lettermark } from "./mark.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const at = (...p) => pathToFileURL(join(root, ...p)).href;
const tmp = join(root, "node_modules", ".og");
mkdirSync(tmp, { recursive: true });
mkdirSync(join(root, "public", "og"), { recursive: true });

const t = {
  en: JSON.parse(readFileSync(join(root, "src/i18n/translations/en.json"), "utf8")),
  tr: JSON.parse(readFileSync(join(root, "src/i18n/translations/tr.json"), "utf8")),
};
const projects = readdirSync(join(root, "src/content/projects"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ id: f.replace(/\.json$/, ""), ...JSON.parse(readFileSync(join(root, "src/content/projects", f), "utf8")) }))
  .sort((a, b) => a.order - b.order);

// Same lookup order as src/lib/projects.ts.
const shot = (slug, lang) => {
  const base = `src/assets/projects/${slug}-desktop`;
  for (const f of [`${base}-dark-${lang}.png`, `${base}-${lang}.png`, `${base}-dark.png`, `${base}.png`])
    if (existsSync(join(root, f))) return at(f);
  throw new Error(`no desktop shot for ${slug}`);
};

// The mark leads the top rule on every card, so a preview reads as this site
// before its title does.
const mark = `<img class="mark" alt="" src="data:image/svg+xml,${encodeURIComponent(lettermark())}">`;

const fonts = `
@font-face { font-family: "Archivo"; src: url(${at("node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2")}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "Archivo"; src: url(${at("node_modules/@fontsource-variable/archivo/files/archivo-latin-ext-wdth-normal.woff2")}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; unicode-range: U+0100-024F, U+1E00-1EFF; }
@font-face { font-family: "Mono"; src: url(${at("node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2")}) format("woff2"); }
@font-face { font-family: "Mono"; src: url(${at("node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-500-normal.woff2")}) format("woff2"); unicode-range: U+0100-024F; }`;

const base = `
${fonts}
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #0b0a0a; color: #f1f1ef; font-family: "Archivo"; }
.room { position: absolute; inset: 0; background: url(${at("src/assets/hero/room.jpg")}) center / cover; filter: brightness(.62); }
.haze { position: absolute; inset: 0; background: radial-gradient(55% 60% at 12% 70%, rgba(255,50,71,.28), transparent 70%); }
.grain { position: absolute; inset: 0; background: url(${at("public/tex/grain.png")}) 0 0 / 128px; opacity: .5; }
.top { position: absolute; left: 64px; right: 64px; top: 56px; padding-top: 18px; border-top: 1px solid rgba(241,241,239,.34); display: flex; justify-content: space-between; font: 500 15px/1 "Mono"; letter-spacing: .14em; text-transform: uppercase; color: #a8a39b; }
.top .lit { color: #ff3247; display: flex; align-items: center; gap: 16px; }
.top .mark { height: 26px; margin-top: -4px; }
.name { position: absolute; left: 58px; font-variation-settings: "wdth" 76, "wght" 800; text-transform: uppercase; line-height: .84; letter-spacing: -.02em; }
.cta { position: absolute; left: 64px; bottom: 46px; padding: 16px 22px; border: 1.5px solid #ff3247; font: 500 17px/1 "Mono"; letter-spacing: .14em; text-transform: uppercase; }
.cta b { color: #ff3247; font-weight: 500; }
.line { position: absolute; height: 2px; background: #ff3247; }
.print { position: absolute; border-radius: 14px; overflow: hidden; box-shadow: 0 30px 60px -20px rgba(0,0,0,.9); }
.print img { display: block; width: 100%; aspect-ratio: 16/10; object-fit: cover; object-position: top; }
.latent img { filter: brightness(.5); }
`;

const page = (body, lang = "en") => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${base}</style></head><body>
<div class="room"></div><div class="haze"></div>${body}<div class="grain"></div></body></html>`;

const home = (lang) => {
  const c = t[lang];
  const [first, ...rest] = c.meta.name.split(" ");
  return page(`
  <img src="${at("src/assets/images/hero-portrait.png")}" style="position:absolute;right:20px;bottom:-60px;width:470px;filter:drop-shadow(2px 0 0 #ff3247) drop-shadow(-2px 0 0 #ff3247) drop-shadow(0 2px 0 #ff3247) drop-shadow(0 -2px 0 #ff3247)">
  <div class="top"><span class="lit">${mark}${c.meta.role}</span><span>${c.meta.location}</span></div>
  <div class="name" lang="tr" style="top:200px;font-size:150px">${first}<br><span style="color:#ff3247;padding-left:.14em">${rest.join(" ")}</span></div>
  <div class="cta">${lang === "tr" ? "Projeleri inceleyin" : "See the work"} <b>→ emircyn.com</b></div>`, lang);
};

const list = (lang) => {
  const c = t[lang];
  const shown = projects.slice(0, 3);
  const prints = shown
    .map((p, i) => {
      const left = 480 + i * 245, rot = [-3, 1.5, -1][i], top = 250 + [0, 12, 4][i];
      return `<div class="print ${i === 1 ? "" : "latent"}" style="left:${left}px;top:${top}px;width:230px;transform:perspective(900px) rotateY(${-rot * 6}deg)"><img src="${shot(p.id, lang)}"></div>`;
    })
    .join("");
  return page(`
  <div class="top"><span class="lit">${mark}${c.line.title} · ${String(projects.length).padStart(2, "0")}</span><span>${c.meta.name}</span></div>${prints}
  <div class="name" lang="en" style="top:150px;font-size:78px;width:400px">${projects.map((p) => p.name.split(".")[0]).slice(0, 3).join("<br>")}</div>
  <div class="cta">${c.meta.role} <b>→ emircyn.com</b></div>`, lang);
};

const one = (p, lang) => {
  const c = t[lang], d = p[lang];
  // Long names step down so they never run under the print.
  const size = p.name.length > 9 ? 84 : p.name.length > 6 ? 104 : 132;
  return page(`
  <div class="top"><span class="lit">${mark}${String(p.order).padStart(2, "0")} · ${d.kind}</span><span>${c.meta.name} · ${c.meta.role}</span></div>
  <div class="print" style="left:640px;top:152px;width:510px;transform:perspective(1200px) rotateY(-16deg)"><img src="${shot(p.id, lang)}"></div>
  <div class="name" lang="en" style="top:150px;font-size:${size}px;width:520px">${p.name}</div>
  <p style="position:absolute;left:64px;top:${150 + size * 0.9 + 34}px;width:470px;font:560 25px/1.25 Archivo;font-variation-settings:'wdth' 96">${d.line}</p>
  <div class="cta">${lang === "tr" ? "Nasıl çalışıyor" : "How it works"} <b>→ emircyn.com</b></div>`, lang);
};

const jobs = [
  ["og-image.jpg", home("en")],
  ["og-image-tr.jpg", home("tr")],
  ["og/projects-en.jpg", list("en")],
  ["og/projects-tr.jpg", list("tr")],
  ...projects.flatMap((p) => [
    [`og/${p.id}-en.jpg`, one(p, "en")],
    [`og/${p.id}-tr.jpg`, one(p, "tr")],
  ]),
];

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [out, html] of jobs) {
  const file = join(tmp, "card.html");
  writeFileSync(file, html);
  await tab.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(root, "public", out), type: "jpeg", quality: 86 });
  console.log("wrote public/" + out);
}
await browser.close();
