// One canonical host. The zone's redirect settings are not in this repo, so the
// Worker does it: http and www both answer with a single 301 to https apex.
// Everything else is the static build, including public/_redirects.
const CANONICAL_HOST = "emircyn.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!local && (url.protocol === "http:" || url.hostname !== CANONICAL_HOST)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
