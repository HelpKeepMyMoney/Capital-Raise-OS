import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CPIN | Raise Capital Like an Institution",
  description:
    "CPIN helps sponsors, funds, and private issuers raise capital with investor CRM, deal rooms, data rooms, and workflow automation.",
  openGraph: {
    title: "CPIN | Raise Capital Like an Institution",
    description:
      "CPIN helps sponsors, funds, and private issuers raise capital with investor CRM, deal rooms, data rooms, and workflow automation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CPIN | Raise Capital Like an Institution",
    description:
      "CPIN helps sponsors, funds, and private issuers raise capital with investor CRM, deal rooms, data rooms, and workflow automation.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
