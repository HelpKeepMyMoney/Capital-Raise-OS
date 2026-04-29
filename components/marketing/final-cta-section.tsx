import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

export function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative overflow-hidden border-b border-sidebar/30 bg-sidebar py-16 text-sidebar-foreground sm:py-20 dark:border-sidebar/50 dark:bg-sidebar dark:text-sidebar-primary-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(120,148,237,0.18),transparent_52%)] opacity-95 dark:bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_52%)]"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2
          id="final-cta-heading"
          className="font-heading text-[1.875rem] font-semibold leading-tight tracking-tight !text-sidebar-foreground dark:!text-sidebar-primary-foreground sm:text-4xl"
        >
          Stop Managing Your Raise in Spreadsheets
        </h2>
        <p className="mt-6 text-lg text-sidebar-foreground/90 dark:text-sidebar-primary-foreground/90">
          Run investor relationships, offerings, diligence, and execution from one platform.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href={BOOK_DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg", variant: "secondary", className: "rounded-xl bg-card text-card-foreground shadow-md hover:bg-card/95" }),
            )}
          >
            Book Demo
          </a>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg", variant: "outline", className: "rounded-xl border-sidebar-primary-foreground/25 bg-transparent text-sidebar-primary-foreground hover:bg-sidebar-accent" }))}
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}
