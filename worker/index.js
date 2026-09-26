/**
 * Cloudflare Worker entry point.
 * Static pages and files in /dist are served automatically; the Worker only runs
 * for requests that don't match a file, such as the contact form endpoint.
 */
import { handleContact, json } from './contact.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
