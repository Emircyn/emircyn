// Every icon the site ships, drawn from the one mark in scripts/mark.mjs:
//
//   node scripts/icons.mjs
//
// Writes public/favicon.svg (what current browsers use), favicon.ico (16, 32
// and 48 for everything else, and for Google's result favicon crawler),
// apple-touch-icon.png, the manifest's 192/512 and maskable icons, and
// logo.png, a square mark for profile pictures and listings. Needs the
// Chromium that playwright-core uses (npx playwright install chromium).

import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { icon } from "./mark.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const pub = (f) => join(root, "public", f);

const rounded = icon();
// iOS and maskable Android icons are cut by the platform, so they fill the
// square; the maskable one keeps the letters inside the central 80% circle.
const bleed = icon({ radius: 0, scale: 0.92 });
const maskable = icon({ radius: 0, scale: 0.74 });

writeFileSync(pub("favicon.svg"), rounded + "\n");
console.log("wrote public/favicon.svg");

const browser = await chromium.launch();
const tab = await browser.newPage();
const png = async (svg, size) => {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(
    `<style>*{margin:0}html,body{background:transparent}</style><img src="data:image/svg+xml,${encodeURIComponent(svg)}" width="${size}" height="${size}" style="display:block">`,
  );
  return tab.screenshot({ type: "png", omitBackground: true });
};

const files = [
  ["apple-touch-icon.png", bleed, 180],
  ["android-chrome-192x192.png", rounded, 192],
  ["android-chrome-512x512.png", rounded, 512],
  ["maskable-512x512.png", maskable, 512],
  ["favicon-16x16.png", rounded, 16],
  ["favicon-32x32.png", rounded, 32],
  ["logo.png", bleed, 512],
];
for (const [out, svg, size] of files) {
  writeFileSync(pub(out), await png(svg, size));
  console.log("wrote public/" + out);
}

// An ICO is a directory of images; modern readers accept PNG entries as is.
const sizes = [16, 32, 48];
const images = [];
for (const s of sizes) images.push(await png(rounded, s));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  head.writeUInt8(s, at);
  head.writeUInt8(s, at + 1);
  head.writeUInt16LE(1, at + 4); // colour planes
  head.writeUInt16LE(32, at + 6); // bits per pixel
  head.writeUInt32LE(images[i].length, at + 8);
  head.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
});
writeFileSync(pub("favicon.ico"), Buffer.concat([head, ...images]));
console.log("wrote public/favicon.ico");

await browser.close();
