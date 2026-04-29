# CPIN Capital Management System

AI-powered private capital platform: investor CRM, discovery, outreach, data rooms, deal room, tasks, analytics, AI copilot, and PayPal subscriptions — built with **Next.js (App Router)**, **Firebase** (Auth, Firestore, Storage), **Resend**, **OpenAI / Anthropic**, and **Vercel**.

## Changelog since last commit

Baseline: `c701d2b` (“Initial commit: CPIN Capital Raise OS…”). This update includes the following working-tree changes.

### Branding and UX

- Product display name is **CPIN Capital Management System** (replaces “CPIN Capital Raise OS” and the former two-line sidebar title “CPIN Raise OS” / “Capital platform”).
- Global styles and several **shadcn/ui** components (`button`, `card`, `input`, `badge`, `tabs`, `table`, `select`, `dropdown-menu`, **sidebar**) plus **theme provider** storage key were refined for the current theme.
- Dashboard stat/funnel/outreach charts and related components were updated for readability and consistency.

### Auth, roles, and access control

- **`PLATFORM_ADMIN_UIDS`** (see `.env.example`) — comma-separated Firebase Auth UIDs for platform super-admins who can use **`/admin`** (`app/(platform-admin)/`).
- Extended **RBAC**: `investor_guest` and related **investor access** scoping (`lib/auth/investor-access.ts`, `lib/auth/rbac.ts`), **guest route helpers** (`lib/auth/guest-routes.ts`), **platform admin** helpers (`lib/auth/platform-admin.ts`).
- **Middleware** now also protects `/admin` and nested product paths (e.g. dynamic segments under `/deals`, `/investors`, `/tasks`).
- **Sign-in / sign-up flows** and **auth API** (`register`, `session`) and **organization bootstrap** behavior were expanded to support the new roles and invitations story.

### Investor CRM and tasks

- **`app/actions/investors.ts`** — large expansion: CRUD, interactions, follow-ups, guest linking, archiving, and richer pipeline behavior.
- **`components/investors-board.tsx`** — board/list UX overhaul; investor **detail** routes under `app/(shell)/investors/[id]/` with **`investor-detail-client`**, profile fields, outreach/invite panels.
- **`app/api/tasks/`** and **`app/api/tasks/[id]/`**, **`components/tasks-panel.tsx`**, and shell **Tasks** page — org-scoped tasks API and UI (including follow-ups tied to investors).

### Deals and LP / guest flows

- Deals listing and **new deal** (`app/(shell)/deals/new/`, **`new-deal-form`**), **deal detail** (`app/(shell)/deals/[id]/`), commitments (**`deal-commitment-form`**), and **express interest** (`app/api/deals/express-interest/route.ts`, **`express-interest-button`**).
- **`app/api/deals/`** and related routes for creating deals and recording **commitments**.

### Data room

- **Rooms and documents** HTTP APIs under `app/api/data-room/rooms/` and `app/api/data-room/documents/` (including per-document routes), plus **`data-room-client.tsx`** and an expanded **data room** shell page.

### Investor invitations

- **`app/api/invitations/`** — create invitations, **validate** and **redeem** token flows, Resend email copy (branded as CPIN Capital Management System).
- **`app/invite/[token]/`** — accept-invite UX (`invite-client`).
- **`components/invite-investor-panel.tsx`** and **`lib/invitations/`** helpers.

### Billing

- Settings billing page refactored with **`billing-client.tsx`**; PayPal subscription route uses **`brand_name: "CPIN Capital Management System"`**.

### Firebase and data model

- **`lib/firestore/types.ts`** — richer **Investor**, **Task**, **Deal**, **DataRoom**, **RoomDocument**, **InvestorInvitation**, **DealCommitment**, roles, pipeline stages, CRM status, etc.
- **`lib/firestore/queries.ts`**, **`paths.ts`**, **`lib/investors/`** — extended queries and helpers.
- **`firestore.rules`** and **`firestore.indexes.json`** — updated for new collections and access patterns.

### Other

- **Discovery** merge/rank tweaks; **marketing** / **login** copy; **DEPLOYMENT.md** title; **`scripts/seed-demo.ts`** adjustments.
- **`lib/firebase/client.ts`** minor updates.

The npm **`package.json` `name`** remains `capital-raise-os` (internal package identifier).

## Prerequisites

- Node.js 20+
- Firebase project (Auth with Email/Password, Firestore, Storage)
- (Optional) Resend, OpenAI, Anthropic, PayPal sandbox credentials

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in Firebase **client** keys (`NEXT_PUBLIC_*`) and **Admin** service account fields (`FIREBASE_*`).

2. Install dependencies:

   ```bash
   npm install
   ```

3. Deploy Firestore rules and indexes to your Firebase project (or use emulators):

   ```bash
   npx firebase deploy --only firestore
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), sign up, then optionally seed demo data:

   ```bash
   npm run seed -- <your-firebase-uid>
   ```

   The UID is shown in Firebase Console → Authentication, or in browser devtools after sign-in.

## Project structure

- `app/(shell)/` — authenticated product (dashboard, CRM, modules; includes dynamic **investors/[id]**, **deals/[id]**, **deals/new**)
- `app/(platform-admin)/` — platform super-admin (`/admin`) when UIDs are listed in `PLATFORM_ADMIN_UIDS`
- `app/(marketing)/` — landing page
- `app/(auth)/` — login / signup
- `app/onboarding/` — create first organization (session without org)
- `app/invite/[token]/` — redeem investor invitation links
- `app/api/` — session auth, discovery, outreach, data room (rooms/documents/sign-url), deals, tasks, invitations, AI chat, PayPal billing, webhooks
- `lib/` — Firebase, Firestore types/queries, discovery merge, analytics helpers, auth (RBAC, guests, platform admin), invitations, PayPal, billing
- `functions/` — Firebase Cloud Functions (member → custom claims sync, scheduled digest)
- `scripts/seed-demo.ts` — demo org, investors, tasks, emails

## Security notes

- Firestore/Storage rules scope data by `organizationId` and `organization_members`.
- Organizations and memberships are **written via Admin SDK** from Next.js API routes (rules deny direct client writes to those collections).
- Session cookies are HTTP-only Firebase session cookies (`cpin_session`); active org is `cpin_org_id`.
- Investor guests are restricted from raise-team modules via server checks and redirects.

## Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, Firebase, PayPal webhooks, and GA4/GTM.

## Scripts

| Command        | Description                |
| -------------- | -------------------------- |
| `npm run dev`  | Next.js dev server         |
| `npm run build`| Production build           |
| `npm run seed` | Seed demo data (needs UID)|
