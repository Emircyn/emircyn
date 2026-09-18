import type { APIRoute } from 'astro';

// AhrefsBot and friends crawl for their own link databases and send no visitors;
// across this account they were a fifth of all traffic. They obey robots.txt.
const robotsTxt = `
User-agent: *
Allow: /

User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: MJ12bot
User-agent: DotBot
Disallow: /

Sitemap: ${new URL('sitemap-index.xml', 'https://emircyn.com').href}
`.trim();

export const GET: APIRoute = () => {
    return new Response(robotsTxt, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
};
