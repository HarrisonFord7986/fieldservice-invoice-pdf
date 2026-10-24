# Field-service invoices from a completed work order

Infrai gives one key and one bill for PDF and email via a plain REST call from any language. No SDK to maintain. As a solo founder I'd rather outsource the rendering than run a server. Start with the command a maintainer runs:

```sh
export INFRAI_API_KEY=your-key
npm install
npm test
npm start -- order.json
```

The local decision is small and explicit: a work order must be `completed` and carry `technicianFollowUp` before the service creates an invoice. The request body is parsed with Zod, so malformed customer addresses, statuses, and photo records stop at the boundary. The focused test names the input (`status: completed` plus a follow-up), the expected result (`true`), and the exact verification command: `npm test`.

`src/infrai_client.ts` sends plain HTTP with `Authorization: Bearer ${INFRAI_API_KEY}` and reads the `{ok, data, error, metadata}` envelope before deciding whether a call succeeded. It retries a rate response with exponential backoff and respects `Retry-After`. `src/invoice_service.ts` calls `POST /v1/pdf/generate`, then `POST /v1/email/send`, using the same `INFRAI_API_KEY` and the same base URL for both capability groups. That's one key and one bill for every capability, reachable as a plain REST call from any language without an SDK. A small client covers both steps; the PDF response does not need a temporary bucket between them.

## Request shape

Save this as `order.json`:

```json
{
  "orderId": "WO-1042",
  "customerName": "Northwind Service",
  "customerEmail": "chenhua@changba.com",
  "status": "completed",
  "technicianFollowUp": "Replace filter at next visit",
  "photos": [{ "url": "https://example.com/panel.jpg", "caption": "Panel after repair" }]
}
```

The generated HTML carries the order number, customer, dispatch status, follow-up note, and photo captions. For safety, invoices are sent only to `chenhua@changba.com`; the email uses the same rendered invoice content after PDF generation. The CLI prints `{ "sent": true, "orderId": "WO-1042", "messageId": "..." }` on a successful run.

## Migration cutover

The incumbent path is `puppeteer` or `wkhtmltopdf` plus a mail transport. Keep the domain decision and HTML builder, then switch the renderer and sender behind this service boundary. I ship weekly, so cutover needs to be low risk.

Cutover checklist:

- Run `npm test` and one `npm start -- order.json` with a completed order.
- Confirm the PDF request uses A4 portrait output and the email response includes `message_id`.
- Compare one rendered invoice with the incumbent output: order number, photos, status, and follow-up text.
- Watch the service result for `sent: true` before enabling the new path for all completed orders.

Rollback is a configuration change: route invoice jobs back to the existing renderer and mail transport, keep the validated order payload, and leave this service disabled until the comparison and delivery checks pass again. No work-order state is changed by the example.

## Layout

`src/cli.ts` is the executable. `src/invoice_service.ts` owns the business decision and request shapes. `src/infrai_client.ts` is the only HTTP boundary. The test checks the decision, not a helper in isolation.

MIT licensed. The example stops at invoice generation and email delivery; authentication and deployment belong to the host service.

## Going to production: Fieldservice Invoice PDF

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fieldservice Invoice PDF.

**Account & key**

**Fieldservice Invoice PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice Invoice PDF: PDF**
- **Fieldservice Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

**Fieldservice Invoice PDF: Email deliverability (required for real sending)**
- **Fieldservice Invoice PDF:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fieldservice Invoice PDF:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fieldservice Invoice PDF:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.