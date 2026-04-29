import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#investor-crm", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
  { href: BOOK_DEMO_HREF, label: "Book Demo", external: true },
  { href: "#contact", label: "Contact" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="CPIN home">
          <Image
            src="/cpin-logo.jpg"
            alt="CPIN"
            width={140}
            height={42}
            className="h-9 w-auto max-h-10 object-contain object-left shrink-0"
            priority
          />
          <span className="font-heading font-semibold tracking-tight text-foreground truncate max-w-[220px] sm:max-w-none">
            CPIN
          </span>
        </Link>

        <nav
          aria-label="Marketing"
          className="hidden items-center gap-1 md:flex lg:gap-2"
        >
          {navItems.map(({ href, label, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
          >
            Sign in
          </Link>
          <a
            href={BOOK_DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm", className: "hidden sm:inline-flex" }))}
          >
            Book Demo
          </a>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
            Start trial
          </Link>
        </div>
      </div>
    </header>
  );
}
