import { FeatureSection } from "@/components/marketing/feature-section";
import { CTASection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works";
import { MarketingContactSection } from "@/components/marketing/marketing-contact-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { OutcomesSection } from "@/components/marketing/outcomes-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TrustBar } from "@/components/marketing/trust-bar";
import { SCREENSHOT } from "@/lib/marketing/constants";

const CRM_BULLETS = [
  "Kanban pipeline by stage",
  "Relationship notes",
  "Check size and fit scoring",
  "Follow up reminders",
  "Momentum tracking",
] as const;

const DEAL_BULLETS = [
  "Raise progress tracking",
  "Investor interest capture",
  "Commitments and updates",
  "Closing timeline visibility",
  "Mobile optimized pages",
] as const;

const INVESTOR_EXP_BULLETS = [
  "Beautiful offering pages",
  "Clear terms and traction metrics",
  "FAQ readiness",
  "Book call CTA",
  "Mobile friendly",
] as const;

const DATA_ROOM_BULLETS = [
  "Secure file sharing",
  "Permission controls",
  "Room analytics",
  "Investor activity visibility",
  "Faster diligence cycles",
] as const;

const TASKS_BULLETS = [
  "Follow up reminders",
  "Closing checklists",
  "Team workflows",
  "Priority tasks",
  "Automation ready",
] as const;

export default function MarketingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex-1">
        <HeroSection />
        <OutcomesSection />
        <TrustBar />

        <FeatureSection
          id="investor-crm"
          eyebrow="Investor CRM"
          headline="Track Every Investor From First Touch to Wire"
          body="Know exactly where every relationship stands and what happens next."
          bullets={CRM_BULLETS}
          imageSrc={SCREENSHOT.crm}
          imageAlt="Investor CRM pipeline and relationship tools in CPIN"
        />

        <FeatureSection
          id="deal-room"
          reverse
          eyebrow="Deal Rooms"
          headline="Launch Live Offerings in Minutes"
          body="Create professional capital raise pages for notes, equity raises, SPVs, and private placements."
          bullets={DEAL_BULLETS}
          imageSrc={SCREENSHOT.dealRoom}
          imageAlt="Live deal offering page in CPIN"
        />

        <FeatureSection
          id="investor-experience"
          eyebrow="Investor Experience"
          headline="Impress Investors and Close Faster"
          body="Give serious investors a clean, organized, confidence building experience."
          bullets={INVESTOR_EXP_BULLETS}
          imageSrc={SCREENSHOT.investorExp}
          imageAlt="Investor-facing offering experience in CPIN"
        />

        <FeatureSection
          id="data-room"
          reverse
          eyebrow="Data Rooms"
          headline="Secure Diligence Without Friction"
          body="Share documents, control access, and monitor investor engagement."
          bullets={DATA_ROOM_BULLETS}
          imageSrc={SCREENSHOT.dataRoom}
          imageAlt="Secure data room with documents in CPIN"
        />

        <FeatureSection
          id="tasks-execution"
          eyebrow="Execution"
          headline="Never Miss Follow Ups Again"
          body="Stay organized while managing active raises and investor conversations."
          bullets={TASKS_BULLETS}
          imageSrc={SCREENSHOT.tasks}
          imageAlt="Tasks and execution workflows in CPIN"
        />

        <HowItWorksSection />
        <PricingSection />
        <MarketingContactSection />
        {/* Hash target for footer Platform → Outreach (no dedicated homepage section yet) */}
        <div id="outreach" className="h-px scroll-mt-28 overflow-hidden" aria-hidden />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
