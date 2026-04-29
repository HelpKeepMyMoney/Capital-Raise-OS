# CPIN Capital Management System

AI-powered private capital platform: investor CRM, discovery, outreach, data rooms, deal room, tasks, analytics, AI copilot, and PayPal subscriptions — built with **Next.js (App Router)**, **Firebase** (Auth, Firestore, Storage), **Resend**, **OpenAI / Anthropic**, and **Vercel**.

## Changelog since last commit

Baseline: `534f38d` (“feat: CRM, deals, data room, tasks, invitations, RBAC, platform admin, branding”). This update bundles the following working-tree changes.

### Investor CRM (major UI refresh)

- Modular **`components/investors/`** (header, KPI metrics, toolbar, Kanban, table, relationship map with coverage/network/territory tabs, list and calendar views, sticky copilot, `/` command search).
- **`components/investors-board.tsx`** now re-exports the orchestrator; **`lib/investors/investor-kpis.ts`**, **`investor-filters.ts`**, **`investor-toolbar-types.ts`**, and **`form-options`** (`pipelineStageShortLabel`) support filters, CSV export, and dashboard-aligned KPIs.
- Investor **detail**: **`InvestorEditModal`** (tabbed edit), **`investor-profile-form-fields`** section mode (`part`), metric strip and heuristic AI insight card on **`investor-detail-client`**.
- **`app/(shell)/investors/page.tsx`** — shell styling and tab query params (`board`, `table`, `map`, `list`, `calendar`).

### Dashboard and analytics

- New dashboard building blocks: **`dashboard-header`**, **`dashboard-kpi-grid`**, **`metric-card`**, **`pipeline-chart`**, **`alert-bar`** / **`alert-strip`**, **`quick-actions`**, **`priority-tasks`**, **`loading.tsx`** for streaming UX.
- **`app/(shell)/dashboard/page.tsx`**, **`analytics/page.tsx`**, and **`components/dashboard/*`** refactors for charts, activity feed, stat cards, funnel/outreach visuals.

### Shell, copilot, and navigation

- **`shell-command-palette.tsx`** ( **`cmdk`** via **`components/ui/command.tsx`** ), **`copilot-ui-context.tsx`**, and updates to **`shell-layout-client`**, **`app-sidebar`**, **`copilot-panel`**, **`app/layout.tsx`**.

### Deals, portal, and e-sign

- **`app/(shell)/deals/[id]/page.tsx`** and **`express-interest`** route updates; **`deal-guest-signing`** component.
- **`app/(shell)/portal/`** LP portal routes.
- **`app/api/esign/`**, **`app/api/webhooks/signwell/`**, and **`lib/esign/`** for SignWell-oriented flows.

### Search and APIs

- **`app/api/org-search/route.ts`** — org-scoped search endpoint.

### Billing and plans

- **`lib/billing/features.ts`** and **`billing-client.tsx`** / **`lib/billing/plans.ts`** updates aligned with plan tiers.

### Data layer and actions

- **`lib/firestore/queries.ts`**, **`types.ts`**, **`paths.ts`** — expanded reads/helpers (e.g. dashboard aggregates, analytics helpers).
- **`lib/dashboard/`** — pipeline and funnel helpers used by dashboard/analytics surfaces.
- **`app/actions/investors.ts`** — incremental server-action additions tied to CRM behavior.

### Auth and middleware

- **`lib/auth/guest-routes.ts`** and **`middleware.ts`** — path/guest routing tweaks.

### Styling and assets

- **`app/globals.css`**, marketing and shell touches; **`public/cpin-logo.jpg`** branding asset.

### Dependencies

- **`package.json`** / **`package-lock.json`** — adds **`cmdk`** (command palette) and related lockfile updates.

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
