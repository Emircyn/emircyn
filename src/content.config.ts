import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* ---------------------------------------------------------------------------
   Projects. One JSON file per project, both languages inside it, so adding a
   project is adding one file and its screenshots: the projects page, the
   detail page, the homepage line, the sitemap and the structured data are all
   generated from here.

   Screenshots are not referenced from the file. They are found by slug in
   src/assets/projects/ (see src/lib/projects.ts), using the existing
   slug-kind[-theme][-locale].png naming, so a localised or re-themed shot
   needs no data change.
--------------------------------------------------------------------------- */

/** The layers a product is drawn in, top (the hand) to bottom (the data). The
 *  same four words name the services on the homepage. */
export const tierKeys = ["interface", "edge", "server", "ai", "data", "services"] as const;
/** The services shown on the homepage; a tier lights the service it belongs to. */
export const serviceKeys = ["interface", "backend", "data", "ai"] as const;

const tier = z.enum(tierKeys);

const localized = z.object({
  kind: z.string(),
  role: z.string(),
  /** One line, for the line and the homepage. */
  line: z.string(),
  summary: z.string(),
  problem: z.string(),
  contribution: z.string(),
  alt: z.string(),
  altMobile: z.string(),
  /** Where each tier runs and what it does there, keyed by tier. */
  tiers: z.record(tier, z.object({ runs: z.string(), does: z.string() })),
  /** One real request, followed through the tiers. Parallel to `trace`. */
  traceTitle: z.string(),
  traceSteps: z.array(z.string()),
  decisions: z.array(z.object({ title: z.string(), body: z.string() })).min(2),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/projects" }),
  schema: z
    .object({
      name: z.string(),
      order: z.number().int(),
      year: z.number().int(),
      /** Shown on the homepage line. */
      featured: z.boolean().default(false),
      url: z.string().url(),
      host: z.string(),
      source: z.string().url().optional(),
      services: z.array(z.enum(serviceKeys)).min(1),
      /** Tiers in drawing order, each with the technology that lives there. */
      tiers: z.array(z.object({ key: tier, tech: z.array(z.string()) })).min(1),
      /** The tiers a request visits, in order. Repeats are fine. */
      trace: z.array(tier).min(2),
      en: localized,
      tr: localized,
    })
    .superRefine((p, ctx) => {
      // A trace that names a tier the drawing does not have would draw the
      // thread to nothing, and a missing step would leave a stop unlabelled.
      const drawn = new Set(p.tiers.map((t) => t.key));
      p.trace.forEach((k, i) => {
        if (!drawn.has(k)) ctx.addIssue({ code: "custom", path: ["trace", i], message: `tier "${k}" is not drawn` });
      });
      for (const lang of ["en", "tr"] as const) {
        if (p[lang].traceSteps.length !== p.trace.length)
          ctx.addIssue({ code: "custom", path: [lang, "traceSteps"], message: "one step per trace stop" });
        drawn.forEach((k) => {
          if (!p[lang].tiers[k]) ctx.addIssue({ code: "custom", path: [lang, "tiers", k], message: "missing" });
        });
      }
    }),
});

export const collections = { projects };
