import { redirectInvestorGuestsFromRaiseTools } from "@/lib/auth/guest-routes";
import { requireOrgSession } from "@/lib/auth/session";
import { getOrganization, getMembership } from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const membership = await getMembership(ctx.orgId, ctx.user.uid);
  redirectInvestorGuestsFromRaiseTools(membership?.role);
  const org = await getOrganization(ctx.orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-foreground/85">Organization, branding, integrations, and API keys.</p>
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input defaultValue={org?.name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input defaultValue={org?.slug} readOnly />
          </div>
          <Link
            href="/settings/billing"
            className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
          >
            Billing & subscriptions
          </Link>
        </CardContent>
      </Card>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Configure Resend, OpenAI, Anthropic, PayPal, and GA4/GTM via environment variables on Vercel.</p>
          <p>2FA: enable Firebase MFA in console; toggle UI in a follow-up release.</p>
        </CardContent>
      </Card>
    </div>
  );
}
