import { requireOrgSession } from "@/lib/auth/session";
import { listDeals } from "@/lib/firestore/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function DealsPage() {
  const ctx = await requireOrgSession();
  if (!ctx) redirect("/login");
  const deals = await listDeals(ctx.orgId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Deal room</h1>
          <p className="mt-1 text-muted-foreground">
            Offerings: equity, SAFE, convertible, syndication, LP fund, revenue share, private bond.
          </p>
        </div>
        <Button variant="outline" className="w-fit">
          New offering
        </Button>
      </div>
      <div className="grid gap-4">
        {deals.map((d) => (
          <Card key={d.id} className="border-white/10 bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{d.name}</CardTitle>
              <Badge variant="secondary" className="capitalize">
                {d.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm">
              <div className="space-y-1 text-muted-foreground">
                <p className="capitalize text-foreground font-medium">{d.type.replace(/_/g, " ")}</p>
                {d.targetRaise != null ? <p>Target raise: ${(d.targetRaise / 1_000_000).toFixed(1)}M</p> : null}
                {d.minimumInvestment != null ? <p>Min: ${(d.minimumInvestment / 1000).toFixed(0)}K</p> : null}
              </div>
              <Button size="sm">Express interest</Button>
            </CardContent>
          </Card>
        ))}
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offerings yet — seed demo data or create one.</p>
        ) : null}
      </div>
    </div>
  );
}
