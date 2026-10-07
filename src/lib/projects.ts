import { getCollection, type CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import type { Locale } from "@/i18n/utils";

export type Project = CollectionEntry<"projects">;

/* --- Routes ------------------------------------------------------------------

   Each language gets the word its readers would type: /en/projects/ and
   /tr/projeler/. The project slugs stay the same in both (they are product
   names), so a detail page's other-language twin is always one segment swap
   away. hreflang, the sitemap and the language switch all read these. */

export const projectsBase: Record<Locale, string> = { en: "/en/projects/", tr: "/tr/projeler/" };

export const homePath = (lang: Locale) => `/${lang}/`;
export const projectsPath = (lang: Locale) => projectsBase[lang];
export const projectPath = (lang: Locale, slug: string) => `${projectsBase[lang]}${slug}/`;

/** The same page in both languages, for hreflang and the language switch. */
export type Alternates = Record<Locale, string>;

/** Ordered projects, as the line and the homepage show them. */
export async function getProjects() {
  const all = await getCollection("projects");
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Two digits, as the line prints them: 01, 02… */
export const indexOf = (p: Project) => String(p.data.order).padStart(2, "0");

/* --- Screenshots ------------------------------------------------------------

   Theme-specific shots use dark desktop and light mobile previews. Keep the
   theme in the filename so changing it also changes cached preview URLs.
   Localized screenshots take priority over language-neutral ones. */

const files = import.meta.glob<{ default: ImageMetadata }>("/src/assets/projects/*.png", { eager: true });

export function shot(slug: string, kind: "desktop" | "mobile", lang: Locale): ImageMetadata {
  const base = `/src/assets/projects/${slug}-${kind}`;
  const theme = kind === "desktop" ? "dark" : "light";
  const hit =
    files[`${base}-${theme}-${lang}.png`] ??
    files[`${base}-${lang}.png`] ??
    files[`${base}-${theme}.png`] ??
    files[`${base}.png`];
  if (!hit) throw new Error(`No ${kind} screenshot for "${slug}" in src/assets/projects/`);
  return hit.default;
}

/* --- Structured data ------------------------------------------------------- */

const personId = (site: URL) => new URL("/#person", site).href;

export function projectsJsonLd(lang: Locale, site: URL, projects: Project[], title: string, description: string) {
  const url = new URL(projectsPath(lang), site).href;
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: title,
      description,
      inLanguage: lang,
      author: { "@id": personId(site) },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: new URL(projectPath(lang, p.id), site).href,
          name: p.data.name,
        })),
      },
    },
    breadcrumbs(lang, site, [[title, projectsPath(lang)]]),
  ];
}

export function projectJsonLd(lang: Locale, site: URL, p: Project, listTitle: string, image: string) {
  const url = new URL(projectPath(lang, p.id), site).href;
  const c = p.data[lang];
  return [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": url,
      url,
      name: p.data.name,
      headline: `${p.data.name}: ${c.kind}`,
      description: c.summary,
      abstract: c.line,
      inLanguage: lang,
      dateCreated: String(p.data.year),
      image,
      creator: { "@id": personId(site) },
      // Only what the page states: the product's own address and its source.
      sameAs: [p.data.url, ...(p.data.source ? [p.data.source] : [])],
      keywords: p.data.tiers.flatMap((t) => t.tech).join(", "),
    },
    breadcrumbs(lang, site, [
      [listTitle, projectsPath(lang)],
      [p.data.name, projectPath(lang, p.id)],
    ]),
  ];
}

function breadcrumbs(lang: Locale, site: URL, trail: [string, string][]) {
  const all: [string, string][] = [["Emircan Erdemci", homePath(lang)], ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: new URL(path, site).href,
    })),
  };
}

/** The other project after this one, wrapping round to the first. */
export const nextOf = (all: Project[], p: Project) => all[(all.findIndex((q) => q.id === p.id) + 1) % all.length];
