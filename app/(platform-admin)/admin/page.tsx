import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformAdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Platform admin</h1>
        <p className="mt-1 text-foreground/85">
          Internal tools and org-wide metrics. Add operational sections here as needed.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Listing and health checks will go here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No data wired yet.</CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Aggregate usage and billing signals will go here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No data wired yet.</CardContent>
        </Card>
      </div>
    </div>
  );
}
