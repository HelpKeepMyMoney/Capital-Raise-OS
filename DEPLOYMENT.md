# Deployment guide — CPIN Capital Raise OS

## Vercel

1. Import the Git repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to the repository root (this project).
3. Add all variables from `.env.example` in **Project → Settings → Environment Variables**.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://app.yourdomain.com`).
5. Deploy. Production builds run `next build`.

### Turbopack / monorepo warning

If Vercel or local builds warn about multiple lockfiles, set the project root explicitly in Vercel or add to `next.config.ts`:

```ts
turbopack: { root: __dirname },
```

(Use the path that matches your repo layout.)

## Firebase

1. Create a project; enable **Authentication** (Email/Password), **Firestore**, **Storage**.
2. Download a service account JSON; map to `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`.
3. Add Web app config to `NEXT_PUBLIC_FIREBASE_*`.
4. Deploy rules and indexes:

   ```bash
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore,storage
   ```

5. **Cloud Functions** (optional): `cd functions && npm install && npm run build`, then `firebase deploy --only functions`.

## PayPal

1. Create REST app in PayPal Developer Dashboard (sandbox or live).
2. Create **Subscription Plans** for Starter / Pro / Capital Team; copy plan IDs into `PAYPAL_PLAN_*_ID` env vars.
3. Create a **Webhook** pointing to `https://<your-domain>/api/webhooks/paypal` and subscribe to subscription and payment events.
4. Set `PAYPAL_WEBHOOK_ID` to the webhook’s ID from the dashboard.
5. Set `PAYPAL_MODE` to `sandbox` or `live`.

## Resend

1. Verify your sending domain in Resend.
2. Set `RESEND_API_KEY` and `RESEND_FROM` (e.g. `CPIN <hello@yourdomain.com>`).

## Google Analytics 4 & GTM

1. Create a GTM container; add a GA4 Configuration tag.
2. Set `NEXT_PUBLIC_GTM_ID`.
3. Custom events are defined in `lib/analytics/ga4-events.ts` and pushed from `lib/analytics/client-track.ts` (dataLayer + `gtag` when present).
4. For server-side reliability (subscriptions), configure `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` and call `sendGa4Mp` from webhooks where appropriate.

## Post-deploy checklist

- [ ] Firebase session cookie works over HTTPS (`secure` cookie in production).
- [ ] CORS / authorized domains include your Vercel URL in Firebase Auth settings.
- [ ] PayPal return/cancel URLs match `NEXT_PUBLIC_APP_URL`.
- [ ] Resend domain verified; outreach send tested.
- [ ] Firestore composite indexes deployed (`firestore.indexes.json`).
