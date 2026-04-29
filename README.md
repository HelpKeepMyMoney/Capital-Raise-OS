# CPIN Capital Management System

AI-powered private capital platform: investor CRM, discovery, outreach, data rooms, deal room, tasks, analytics, AI copilot, and PayPal subscriptions — built with **Next.js (App Router)**, **Firebase** (Auth, Firestore, Storage), **Resend**, **OpenAI / Anthropic**, and **Vercel**.

## Changelog

### Tasks Workflow Center, organization lifecycle, investor CRM polish

- **Tasks (`/tasks`):** Replaced the legacy **`tasks-panel`** with **`TasksWorkflowClient`** and **`components/tasks/*`** — header, metrics, toolbar (filters / list · Kanban · calendar · by owner), **`task-list`** / **`task-row`**, **`task-board`** (@dnd-kit), **`task-calendar`**, **`task-owner-board`**, **`task-drawer`**, **`new-task-modal`**, **`automation-center`**, **`smart-suggestions`**, **`task-insights`**, loading skeleton **`app/(shell)/tasks/loading.tsx`**. **`lib/tasks/*`** holds Kanban buckets, metrics, suggestion heuristics, and labels.
- **Tasks API & data:** Extended **`Task`** in **`lib/firestore/types.ts`**; **`GET` / `POST` `app/api/tasks/route.ts`** and **`PATCH` `app/api/tasks/[id]/route.ts`** with richer fields; **`GET`/`POST` `app/api/tasks/[id]/comments/route.ts`** for Firestore **`tasks/{id}/comments`**; **`firestore.rules`** allow the comments subcollection for org members.
- **Copilot:** **`copilot-panel.tsx`** adds **`TASKS_QUICK_ACTIONS`** when the route is **`/tasks`**.
- **Dashboard:** **`listUpcomingMeetings`** usage avoids **`Date.now()`** in render for lint purity (**`app/(shell)/dashboard/page.tsx`**).
- **Organization settings:** **`PATCH /api/organizations/[id]`** updates **`name`** and **`slug`** (validated in **`lib/organizations/patch-organization.ts`**); shared **`slugify`** in **`lib/organizations/slug.ts`** (also used by **`app/api/organizations/bootstrap/route.ts`**). **`components/settings/organization-settings-form.tsx`** on **`app/(shell)/settings/page.tsx`**. Founders and org admins may edit (**`canEditOrganizationProfile` / `canEditOrganizationProfileRole`**).
- **Delete organization:** **`POST /api/organizations/[id]/delete`** runs a server-side cascade (**`lib/organizations/delete-organization.ts`**) — deals, tasks (+ nested comments), outreach/data-room-related docs, memberships, org doc, subscription stub, Storage prefix **`orgs/{orgId}/`**, auth claim cleanup; **`investors`** documents are **not** deleted; audit trail keeps a final **`organization.deleted`** entry (org-scoped audit docs are not bulk-deleted). UI: **`DeleteOrganizationSection`** with name confirmation; **founder** or **org admin** only (**`canDeleteOrganization` / `canDeleteOrganizationRole`**).
- **Investor CRM table:** **`InvestorTable`** — **`SortHead`** overlap fix so the **Firm** header is not clipped by the sticky Name column (padding / stacking-safe layout).
- **Sidebar:** **`app-sidebar.tsx`** — optional **`suffix`** on nav items; **Discovery**, **Outreach**, and **Analytics** show **`(coming soon)`**.

### Deal Room experience (premium list & detail, settings, data room link)

- **Deal pages:** `app/(shell)/deals/page.tsx` and `app/(shell)/deals/[id]/page.tsx` compose new **`components/deals/*`** modules (hero/KPIs, why invest, traction, founder, use of funds, terms, documents, FAQ, CTA, guest flows, manager panel). **`loading.tsx`** skeletons for list and detail.
- **Why invest:** Six narrative fields on **`Deal`** (`marketOpportunity`, `problem`, `solution`, `competitiveEdge`, `growthStrategy`, `exitPotential`) replace a single executive summary blob. **`lib/deals/why-invest-narrative.ts`** maps fields to cards; **`PATCH /api/deals/[id]`** (`lib/deals/patch-deal.ts`) validates updates. **`DealSettingsForm`** edits all six; last card spans full width when needed; first + orphan-last row layout in **`WhyInvest`**.
- **Data room ↔ deal:** Rooms link via Firestore **`dealId`** on the room. **`GET /api/data-room/rooms`** lists linkable org rooms; deal **Settings** shows linked rooms, link/unlink (PATCH to existing room route), and points to **`/data-room?deal=<id>`**. **`PATCH /api/data-room/rooms/[roomId]`** audit log is best-effort so Firestore updates still succeed if audit fails.
- **Firestore / metrics:** Helpers such as **`listDocumentsForDeal`**, **`listActiveDataRoomsForDeal`**, **`hasActiveDataRoomForDeal`**, commitment sums, telemetry listing; deal list can show raised totals and interest-style metrics where wired.
- **Telemetry:** **`POST /api/deals/[id]/telemetry`** and **`components/deals/deal-telemetry.tsx`** for page views and CTA events; persistence is best-effort (errors logged, response still OK) so local Firestore gaps do not break the UI.
- **UI polish:** Offering hero (**`deal-title-hero.tsx`**) tightened layout and padding; logo preview and direct-URL hint in settings; **`onError`** hides broken hero logos; traction **`traction-section.tsx`** KPI grid only (chart removed); **Additional terms** row in **`terms-grid.tsx`** spans full width.
- **Product:** **`/data-room?deal=`** seeds deal filter in **`DataRoomShell`**; **Copilot** quick prompts on deal routes (**`copilot-panel.tsx`**); sidebar **Capital** order: **Deal Room** above **Data Room** (**`app-sidebar.tsx`**).

### Follow-up (deal list, deal documents, data room table)

- **Deal list:** **`deal-card.tsx`** shows **`logoUrl`** when load succeeds (rounded tile + **`onError`** fallback); placeholder monogram or briefcase when missing or invalid.
- **Deal detail — Documents:** **Download summary** in **`deal-documents.tsx`** calls **`POST /api/data-room/sign-url`** for a heuristically chosen file (name matches summary/overview/teaser, else deck, else first PDF, else first doc) and opens it in a **new tab** only (no navigation of the current tab; pop-up–friendly **`window.open`** usage).
- **Data Room — document table:** **`DocumentManager.tsx`** supports **sortable columns** (name, category, version, size, uploaded, views, last viewed, access) with header toggles and direction indicators.

### Data Room portal redesign (since `1f136f3`)

Premium sponsor workspace for diligence: header actions, six KPI cards (from Firestore + audit aggregation), deal-filtered room rail with search, tabbed workspace (**Documents**, **Activity**, **Investors**, **Settings**, **Investor view**), drag-and-drop uploads with document table, audit-driven activity feed and charts, deal-scoped **Invite investor** dialog, room settings via **PATCH**, and a sticky **Room AI** copilot (`/api/ai/chat` with room context).

**UI:** Replaced monolithic **`components/data-room-client.tsx`** with **`components/data-room/`** — `DataRoomHeader`, `RoomMetrics`, `RoomCard`, `RoomWorkspace`, `DocumentManager`, `UploadZone`, `ActivityAnalytics`, `InvestorAccessTable`, `RoomSettings`, `InvestorPreview`, `DataRoomCopilot`, orchestrated by **`data-room-shell.tsx`**. **`app/(shell)/data-room/page.tsx`** loads rooms, documents, deals, metrics, invitations, activity, and per-deal maps for preview.

**APIs (additive):**

- **`POST /api/data-room/rooms`** — optional `dealId`; default visibility/download flags.
- **`PATCH /api/data-room/rooms/[roomId]`** — name, deal, description, NDA, visibility, downloads, watermark, expiry, login requirement, welcome message, optional **`ndaTemplateRef`** (e-sign prep), archive.
- **`POST /api/data-room/sign-url`** — increments document **`viewCount`** and sets **`lastViewedAt`**.
- **`POST /api/data-room/documents`** — stores **`sizeBytes`**, **`mimeType`**, **`createdByUid`**, **`version`**.
- **`PATCH .../documents/[documentId]`** — optional **`accessLevel`**, **`version`**.
- **`GET /api/data-room/invitations`**, **`GET /api/data-room/activity`** — staff-only lists for the Investors tab and activity feed.

**Libraries:** **`lib/data-room/metrics.ts`** (org KPIs + week-over-week opens from audit), **`kind-labels.ts`**, **`server-queries.ts`** (invitations + audit feed for RSC).

**Firestore:** **`lib/firestore/types.ts`** — expanded **`DataRoom`** and **`RoomDocument`** fields; **`firestore.indexes.json`** — composite index on **`audit_logs`** (`organizationId`, `createdAt`).

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
- `app/api/` — session auth, discovery, outreach, data room (rooms `GET`/`POST`/`PATCH`, documents, sign-url, **invitations**, **activity**), **deals** (`PATCH /api/deals/[id]`, **telemetry**), **tasks** (`GET`/`POST`, **`PATCH /api/tasks/[id]`**, **`/api/tasks/[id]/comments`**), **organizations** (`PATCH /api/organizations/[id]`, **`POST .../delete`**), invitations, AI chat, PayPal billing, webhooks
- `components/data-room/` — Data Room UI modules; `components/deals/` — Deal Room UI; **`components/tasks/`** — Tasks Workflow Center UI; **`components/settings/`** — org settings / delete; `lib/data-room/` — metrics, kind labels, server queries; **`lib/deals/`** — deal patch schema, narrative helpers, telemetry aggregation, formatting; **`lib/tasks/`** — task workflow helpers; **`lib/organizations/`** — org patch, deletion cascade, slug helpers
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
