// One canonical host. The zone's redirect settings are not in this repo, so the
// Worker does it: http and www both answer with a single 301 to https apex.
// Everything else is the static build, including public/_redirects.
const CANONICAL_HOST = "emircyn.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only this domain is folded. Preview URLs on workers.dev and local dev
    // are served as they are, so a version can be checked before it ships.
    const ours = url.hostname === CANONICAL_HOST || url.hostname.endsWith(`.${CANONICAL_HOST}`);
    if (ours && (url.protocol === "http:" || url.hostname !== CANONICAL_HOST)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
    const response = await env.ASSETS.fetch(request);
    if (ours) return response;
    // A preview is not a second copy of the site as far as search is concerned.
    const marked = new Response(response.body, response);
    marked.headers.set("X-Robots-Tag", "noindex");
    return marked;
  },
};
