"use client";

import Image from "next/image";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#investor-crm", label: "Platform", external: false },
  { href: "#pricing", label: "Pricing", external: false },
  { href: BOOK_DEMO_HREF, label: "Book Demo", external: true },
  { href: "#contact", label: "Contact", external: false },
] as const;

function NavLinks(props: {
  onNavigate?: () => void;
  className?: string;
  linkClassName?: string;
}) {
  const { onNavigate, className, linkClassName } = props;
  const base = cn(
    buttonVariants({ variant: "ghost", size: "sm" }),
    "font-medium text-muted-foreground hover:text-foreground justify-start lg:justify-center",
    linkClassName,
  );

  return (
    <nav aria-label="Marketing" className={cn("flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-1 xl:gap-2", className)}>
      {navItems.map(({ href, label, external }) =>
        external ? (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={base} onClick={onNavigate}>
            {label}
          </a>
        ) : (
          <Link key={href} href={href} className={base} onClick={onNavigate}>
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}

export function MarketingHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[padding,backdrop-filter] duration-200",
        scrolled
          ? "border-border/70 bg-background/80 py-3 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(15,37,112,0.12)] dark:bg-background/75 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
          : "border-border/80 bg-background/90 py-4 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="CapitalOS home">
          <Image
            src="/cpin-logo.jpg"
            alt="CapitalOS"
            width={140}
            height={42}
            className={cn("w-auto object-contain object-left transition-[height] duration-200", scrolled ? "h-8 max-h-9" : "h-9 max-h-10")}
            priority
          />
          <span className="font-heading font-semibold tracking-tight text-foreground truncate max-w-[220px] sm:max-w-none">
            CapitalOS
          </span>
        </Link>

        <NavLinks className="hidden lg:flex lg:flex-1 lg:justify-center" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden px-3 font-medium text-muted-foreground hover:text-foreground lg:inline-flex",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden rounded-xl border-border/90 bg-card shadow-sm lg:inline-flex",
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
                size: "sm",
                className:
                  "hidden rounded-xl px-4 shadow-md ring-2 ring-primary/25 ring-offset-2 ring-offset-background lg:inline-flex dark:ring-offset-background",
              }),
            )}
          >
            Book Demo
          </a>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "lg:hidden shrink-0 rounded-xl border-border/80",
              )}
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-border/70 px-6 pb-4 pt-6">
                <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-6 px-6 py-6">
                <NavLinks
                  onNavigate={() => setMobileOpen(false)}
                  linkClassName="h-11 rounded-xl px-4 text-base"
                />
              </div>
              <SheetFooter className="gap-3 border-t border-border/70 px-6 pb-8 pt-4">
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link href="/signup" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full rounded-xl")} onClick={() => setMobileOpen(false)}>
                      Start Free Trial
                    </Link>
                  }
                />
                <SheetClose
                  nativeButton={false}
                  render={
                    <a
                      href={BOOK_DEMO_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "lg", className: "w-full rounded-xl shadow-md" }))}
                      onClick={() => setMobileOpen(false)}
                    >
                      Book Demo
                    </a>
                  }
                />
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full text-muted-foreground")} onClick={() => setMobileOpen(false)}>
                      Sign in
                    </Link>
                  }
                />
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
