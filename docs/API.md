# CapitalOS REST API (v1)

Customer-facing, org-scoped REST API for external agents (e.g. a CFO automation) to keep **draft** raise materials in sync without driving the browser.

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

## Write endpoints (draft only)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/deals` | Create deal (`status` forced to `draft`) |
| PATCH | `/deals/:id` | Update draft deal fields (same schema as in-app deal settings) |
| POST | `/data-rooms` | Create data room; optional `dealId` to link |
| POST | `/data-rooms/:roomId/documents` | Upload file (`multipart/form-data`, field `file`) |
| PUT | `/data-rooms/:roomId/documents/:documentId` | Replace file contents |

Allowed upload types: PDF, DOCX, XLSX, PPTX, PNG, JPG, MP4 — max **50MB** (matches UI).

### Deal PATCH highlights

Uses the same fields as the in-app deal settings editor, including:

- `name`, `type`, `terms`, `valuation`, `targetRaise`, `minimumInvestment`, `useOfProceeds`
- `tractionMetrics`, `useOfFundsSplit`, `whyInvest` (narrative cards)
- Narrative text: `marketOpportunity`, `problem`, `solution`, etc.
- `linkedDataRoomId` — set to a room UUID to link, or `null` to unlink rooms from this deal

Only **draft** deals can be updated. Setting `status` to `active` returns **403**.

## Explicitly blocked (403)

- Publishing deals (`status: active`, `closing`, `closed`)
- Inviting investors / sending email / outreach / Resend
- Any body fields like `publish`, `invite`, `sendEmail`, `campaignId`

## Examples

### Pipeline summary

```bash
curl -sS -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  https://capitalos.thecpi.network/api/v1/org | jq
```

### Create draft SAFE

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Series A — CPIN Labs",
    "type": "safe",
    "targetRaise": 750000,
    "minimumInvestment": 100000,
    "terms": "Post-money SAFE, $8M cap"
  }' \
  https://capitalos.thecpi.network/api/v1/deals | jq
```

### Update draft deal

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

### Create data room linked to deal

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Series A diligence", "dealId": "DEAL_UUID" }' \
  https://capitalos.thecpi.network/api/v1/data-rooms | jq
```

### Upload PDF to data room

```bash
curl -sS -X POST \
  -H "Authorization: Bearer cpin_live_YOUR_KEY" \
  -F "file=@./pitch-deck.pdf" \
  -F "kind=deck" \
  https://capitalos.thecpi.network/api/v1/data-rooms/ROOM_UUID/documents | jq
```

## Local development

1. Copy `.env.example` → `.env.local` and configure Firebase Admin + Storage (same as the web app).
2. `npm run dev`
3. Sign in, open **Settings**, create an API key.
4. Call `http://localhost:3000/api/v1/...` with the key.

Run tests: `npm test`

## Vercel deployment

No extra env vars are required for org API keys (stored in Firestore). Deploy as usual; ensure Firestore indexes from `firestore.indexes.json` are deployed (`firebase deploy --only firestore:indexes`).
