/**
 * Cloudflare Worker entry point.
 * Static pages and files in /dist are served automatically; the Worker only runs
 * for requests that don't match a file, such as the contact form endpoint and
 * unknown URLs (which get the branded 404 page).
 */
import { handleContact, json } from './contact.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);
      return handleContact(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // Unknown URL: show the branded 404 page, keeping the 404 status for search engines.
    const notFound = await env.ASSETS.fetch(new URL('/404', request.url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  },
};
