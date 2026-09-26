/**
 * POST /api/contact — handled by the site's Cloudflare Worker (see worker/index.js)
 *
 * 1. Drops obvious bots (hidden honeypot field).
 * 2. Verifies the Cloudflare Turnstile token server-side.
 * 3. Emails the enquiry via Resend.
 *
 * Runtime variables (Cloudflare → Workers & Pages → in2ition-media → Settings → Variables and Secrets):
 *   TURNSTILE_SECRET_KEY  (secret)   Turnstile widget secret key
 *   RESEND_API_KEY        (secret)   Resend API key
 *   MAIL_TO               (optional) where enquiries go, default shelroy24@gmail.com
 *   MAIL_FROM             (optional) sender, default "In2ition Media Website <website@in2ition.media>"
 */

const LIMITS = { name: 120, business: 160, contact: 200, website: 200, type: 60, budget: 60, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function handleContact(request, env) {
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'bad-request' }, 400); }

  // Honeypot: real people never see or fill this field. Pretend success so bots don't retry.
  if ((form.get('company_website') || '').toString().trim()) return json({ ok: true });

  // Turnstile verification
  const token = (form.get('cf-turnstile-response') || '').toString();
  if (!token) return json({ ok: false, error: 'verification' }, 400);
  if (!env.TURNSTILE_SECRET_KEY) return json({ ok: false, error: 'not-configured' }, 500);
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    }),
  }).then(r => r.json()).catch(() => ({ success: false }));
  if (!verify.success) return json({ ok: false, error: 'verification' }, 400);

  // Collect and validate fields
  const d = {};
  for (const [key, max] of Object.entries(LIMITS)) d[key] = (form.get(key) || '').toString().trim().slice(0, max);
  if (!d.name || !d.business || !d.contact) return json({ ok: false, error: 'missing-fields' }, 400);

  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'not-configured' }, 500);

  const rows = [
    ['Name', d.name],
    ['Business', d.business],
    ['Email / WhatsApp', d.contact],
    ['Current website', d.website || '—'],
    ['Needs', d.type || '—'],
    ['Budget', d.budget || '—'],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${d.message || '—'}\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:560px">
      <h2 style="margin:0 0 16px">New project enquiry</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows.map(([k, v]) => `<tr><td style="color:#666;padding-right:16px">${k}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
      </table>
      <p style="color:#666;margin:20px 0 6px">Message</p>
      <p style="white-space:pre-wrap;margin:0">${escapeHtml(d.message || '—')}</p>
      <p style="color:#999;font-size:12px;margin-top:28px">Sent from the contact form on in2ition.media</p>
    </div>`;

  const email = {
    from: env.MAIL_FROM || 'In2ition Media Website <website@in2ition.media>',
    to: [env.MAIL_TO || 'shelroy24@gmail.com'],
    subject: `New project enquiry: ${d.business}`,
    text,
    html,
    ...(EMAIL_RE.test(d.contact) && { reply_to: d.contact }),
  };

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  }).catch(() => null);

  if (!sent || !sent.ok) return json({ ok: false, error: 'send-failed' }, 502);
  return json({ ok: true });
}
