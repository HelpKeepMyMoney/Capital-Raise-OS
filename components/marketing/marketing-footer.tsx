import Link from "next/link";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";

export function MarketingFooter() {
  const links = [
    { href: "#investor-crm", label: "Platform", external: false },
    { href: "#pricing", label: "Pricing", external: false },
    { href: BOOK_DEMO_HREF, label: "Book Demo", external: true },
    { href: "#contact", label: "Contact", external: false },
  ];

  return (
    <footer className="border-t border-border bg-muted/30 py-14 dark:bg-muted/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-heading text-xl font-semibold tracking-tight text-foreground">CPIN</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Operating System for Private Capital
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium">
          {links.map(({ href, label, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition hover:text-foreground"
              >
                {label}
              </a>
            ) : (
              <Link key={href} href={href} className="text-muted-foreground transition hover:text-foreground">
                {label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 sm:text-start">
        © {new Date().getFullYear()} CPIN. All rights reserved.
      </p>
    </footer>
  );
}
