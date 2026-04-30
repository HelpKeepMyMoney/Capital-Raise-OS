import Link from "next/link";
import {
  BNIC_ABOUT_HREF,
  BNIC_PRIVACY_HREF,
  BNIC_TERMS_HREF,
  BOOK_DEMO_HREF,
} from "@/lib/marketing/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const platformLinks = [
  { href: "#investor-crm", label: "Investor CRM" },
  { href: "#deal-room", label: "Deal Rooms" },
  { href: "#data-room", label: "Data Rooms" },
  { href: "#outreach", label: "Outreach" },
  { href: "#tasks-execution", label: "Tasks & Workflows" },
] as const;

const companyLinks = [
  { href: "#pricing", label: "Pricing", external: false },
  { href: BOOK_DEMO_HREF, label: "Book Demo", external: true },
  { href: "#contact", label: "Contact", external: false },
] as const;

const legalLinks = [
  { href: BNIC_PRIVACY_HREF, label: "Privacy" },
  { href: BNIC_TERMS_HREF, label: "Terms" },
  { href: BNIC_ABOUT_HREF, label: "About" },
] as const;

const getStartedBullets = [
  "Secure document sharing",
  "Investor access controls",
  "Built for private capital workflows",
] as const;

export function MarketingFooter() {
  const year = Math.max(2026, new Date().getFullYear());

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-heading text-xl font-semibold tracking-tight text-foreground">CPIN</p>
            <p className="mt-2 text-sm text-muted-foreground">Operating System for Private Capital</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Run your entire capital raise from pipeline to close in one platform.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Built for sponsors, funds, and private issuers.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Platform</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {platformLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Company</h3>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
              (Operated by The BNIC Network LLC)
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {companyLinks.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-col gap-3">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Get Started</h3>
            <div className="mt-4 flex flex-col items-start gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({
                    size: "default",
                    className: "h-10 w-full rounded-xl px-5 font-semibold sm:w-auto",
                  }),
                )}
              >
                Start Free Trial
              </Link>
              <a
                href={BOOK_DEMO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "default",
                    className:
                      "h-10 w-full rounded-xl border-border px-5 font-semibold sm:w-auto dark:border-border",
                  }),
                )}
              >
                Book a Demo
              </a>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
              {getStartedBullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 dark:border-border">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © {year} CPIN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
