import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CPIN | Raise More Capital. Close Faster.",
  description:
    "Investor CRM, deal rooms, data rooms, and workflows for sponsors, funds, syndicators, and private issuers — raise and close capital from one platform.",
  openGraph: {
    title: "CPIN | Raise More Capital. Close Faster.",
    description:
      "Investor CRM, deal rooms, data rooms, and workflows for sponsors, funds, syndicators, and private issuers — raise and close capital from one platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CPIN | Raise More Capital. Close Faster.",
    description:
      "Investor CRM, deal rooms, data rooms, and workflows for sponsors, funds, syndicators, and private issuers — raise and close capital from one platform.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
