# CapitalOS REST API (v1)

Customer-facing, org-scoped REST API so external clients can **read and update** CapitalOS data without using the website.

Invites, outreach, and email sends remain UI-only (they deliver mail to third parties). Everything else that staff edit in the app — deals (including publish), investors, data rooms, documents, tasks, and org profile — can be written through this API.

## Authentication

1. In **Settings → REST API keys**, create a key (founder/admin only). The full secret is shown **once**.
2. Send it on every request:

```bash
Authorization: Bearer cpin_live_<secret>
```

Alternatively:

```bash
X-API-Key: cpin_live_<secret>
```

Keys authenticate as the **organization**, not as a Firebase user session. Raw keys are hashed at rest and never logged.

## Base URL

- Production: `https://capitalos.thecpi.network/api/v1`
- Local: `http://localhost:3000/api/v1`

## Response format

Success:

```json
{ "data": { ... } }
```

Error:

```json
{ "error": { "code": "forbidden", "message": "..." } }
```

List endpoints cap results (deals 100, investors 500, rooms 120, tasks 200).

## Read endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/org` | Current org + Command Center pipeline summary |
| GET | `/deals` | List deals |
| GET | `/deals/:id` | Get one deal |
| GET | `/data-rooms` | List data rooms |
| GET | `/data-rooms/:roomId` | Get one data room |
| GET | `/data-rooms/:roomId/documents` | List documents (metadata) |
| GET | `/data-rooms/:roomId/documents/:documentId` | Document metadata + signed `downloadUrl` (15 min) |
| GET | `/investors` | List CRM investors |
| GET | `/investors/:id` | Get one investor |
| GET | `/tasks` | List tasks |
| GET | `/tasks/:id` | Get one task |

## Write endpoints

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/org` | Update org name, slug, or contact |
| POST | `/deals` | Create a deal (`status` defaults to `draft`; `active` / `closing` / `closed` / `cancelled` allowed) |
| PATCH | `/deals/:id` | Update any deal (same fields as in-app deal settings) |
| POST | `/investors` | Create a CRM investor |
| PATCH | `/investors/:id` | Update investor fields, pipeline stage, or archive (`crmStatus`) |
| POST | `/data-rooms` | Create a data room; optional `dealId` to link |
| PATCH | `/data-rooms/:roomId` | Update room settings, link/unlink a deal, archive |
| POST | `/data-rooms/:roomId/documents/uploads` | Get a signed GCS upload URL (preferred, up to 50MB) |
| POST | `/data-rooms/:roomId/documents/uploads/:documentId/complete` | Finalize after `PUT` to `uploadUrl` |
| POST | `/data-rooms/:roomId/documents` | Multipart upload (small files / local only; Vercel body limit applies) |
| PUT | `/data-rooms/:roomId/documents/:documentId` | Replace file via multipart (same limit) |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update task fields or mark done / cancelled |

### Deal PATCH highlights

Uses the same fields as the in-app deal settings editor, including:

- `name`, `type`, `status`, `terms`, `valuation`, `targetRaise`, `minimumInvestment`, `useOfProceeds`
- `tractionMetrics`, `useOfFundsSplit`, `whyInvest` (narrative cards)
- Narrative text: `marketOpportunity`, `problem`, `solution`, etc.
- `linkedDataRoomId` — set to a room UUID to link, or `null` to unlink rooms from this deal

### Document uploads (production)

Do **not** send 50MB files through the API server. Request a signed URL, PUT the bytes to Google Cloud Storage, then complete:

```bash
# 1. Ask for an upload URL
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"pitch-deck.pdf","mimeType":"application/pdf","sizeBytes":123456,"kind":"deck"}' \
  https://capitalos.thecpi.network/api/v1/data-rooms/ROOM_UUID/documents/uploads

# Response: { "data": { "documentId", "uploadUrl", "contentType" } }

# 2. PUT the file to GCS
curl -sS -X PUT -H "Content-Type: application/pdf" \
  --data-binary @./pitch-deck.pdf \
  "$UPLOAD_URL"

# 3. Finalize
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"pitch-deck.pdf","mimeType":"application/pdf","kind":"deck"}' \
  https://capitalos.thecpi.network/api/v1/data-rooms/ROOM_UUID/documents/uploads/DOCUMENT_ID/complete
```

Allowed types: PDF, DOCX, XLSX, PPTX, PNG, JPG, MP4 — max **50MB**. To replace an existing file, pass `replaceDocumentId` on step 1 and `"replace": true` on complete.

## Explicitly blocked (403)

- Inviting investors / sending email / outreach / Resend
- Body fields like `publish`, `invite`, `sendEmail`, `campaignId`

(`publish` as a body key is rejected because it is ambiguous; set `status: "active"` to go live.)

## Examples

### Pipeline summary

```bash
curl -sS -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  https://capitalos.thecpi.network/api/v1/org | jq
```

### Create and publish a SAFE

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Series A — CPIN Labs",
    "type": "safe",
    "status": "active",
    "targetRaise": 750000,
    "minimumInvestment": 100000,
    "terms": "Post-money SAFE, $8M cap"
  }' \
  https://capitalos.thecpi.network/api/v1/deals | jq
```

### Update a live deal

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "returnsModel": "18-month deployment; target 3x MOIC",
    "tractionMetrics": [
      { "label": "Gyms live", "value": "2" }
    ]
  }' \
  https://capitalos.thecpi.network/api/v1/deals/DEAL_UUID | jq
```

### Create an investor

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "firm": "Analytical Engines",
    "pipelineStage": "contacted",
    "checkSizeMax": 250000
  }' \
  https://capitalos.thecpi.network/api/v1/investors | jq
```

### Move an investor in the pipeline

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "pipelineStage": "due_diligence", "committedAmount": 100000 }' \
  https://capitalos.thecpi.network/api/v1/investors/INVESTOR_UUID | jq
```

### Create a data room linked to a deal

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Series A diligence", "dealId": "DEAL_UUID" }' \
  https://capitalos.thecpi.network/api/v1/data-rooms | jq
```

## Local development

1. Copy `.env.example` → `.env.local` and configure Firebase Admin + Storage (same as the web app).
2. `npm run dev`
3. Sign in, open **Settings**, create an API key.
4. Call `http://localhost:3000/api/v1/...` with the key.

Run tests: `npm test`

## Vercel deployment

No extra env vars are required for org API keys (stored in Firestore). Deploy as usual; ensure Firestore indexes from `firestore.indexes.json` are deployed (`firebase deploy --only firestore:indexes`).
