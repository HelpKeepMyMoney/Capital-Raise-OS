import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_250/0.35),transparent_55%),radial-gradient(ellipse_at_bottom,oklch(0.3_0.1_160/0.25),transparent_50%)]">
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-background/30 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold">
            CP
          </div>
          <span className="font-semibold tracking-tight">CPIN Capital Raise OS</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get started
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-4xl mx-auto gap-8">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">Private markets operating system</p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
          Raise capital like a{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-violet-300 bg-clip-text text-transparent">
            $100M
          </span>{" "}
          SaaS team
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          CRM, discovery, outreach, data rooms, offerings, and AI copilot — tuned for founders,
          syndicators, fund managers, and private issuers.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            Start free trial
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            View dashboard
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4 w-full mt-12 text-left">
          {[
            { t: "Investor CRM", d: "Pipeline stages from lead to close with relationship scoring." },
            { t: "Outreach + data room", d: "Tracked sends, NDAs, and investor-level permissions." },
            { t: "AI + analytics", d: "Copilot, discovery ranking, and GA4-ready funnel events." },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-lg"
            >
              <p className="font-medium">{x.t}</p>
              <p className="text-sm text-muted-foreground mt-2">{x.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
