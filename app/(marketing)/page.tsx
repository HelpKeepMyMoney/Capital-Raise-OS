import { FeatureSection } from "@/components/marketing/feature-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { MarketingContactSection } from "@/components/marketing/marketing-contact-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TrustBar } from "@/components/marketing/trust-bar";
import { SCREENSHOT } from "@/lib/marketing/constants";

const CRM_BULLETS = [
  "Kanban pipeline by investor stage",
  "Relationship notes and ownership",
  "Check size and fit scoring",
  "Follow up reminders",
  "Momentum tracking",
] as const;

const DEAL_BULLETS = [
  "Raise progress tracking",
  "Investor interest capture",
  "Secure deal pages",
  "Commitments and updates",
  "Closing timeline visibility",
] as const;

const INVESTOR_EXP_BULLETS = [
  "Beautiful offering pages",
  "Clear terms and traction metrics",
  "FAQ and diligence readiness",
  "Book call CTA",
  "Mobile optimized",
] as const;

const DATA_ROOM_BULLETS = [
  "Secure file sharing",
  "Permission controls",
  "Investor activity visibility",
  "Room analytics",
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
        <TrustBar />

        <FeatureSection
          id="investor-crm"
          headline="Track Every Investor From First Touch to Wire"
          bullets={CRM_BULLETS}
          imageSrc={SCREENSHOT.crm}
          imageAlt="Investor CRM pipeline and relationship tools in CPIN"
        />

        <FeatureSection
          id="deal-room"
          reverse
          headline="Launch Live Offerings in Minutes"
          body="Create professional offering pages for notes, equity raises, SPVs, and private placements."
          bullets={DEAL_BULLETS}
          imageSrc={SCREENSHOT.dealRoom}
          imageAlt="Live deal offering page in CPIN"
        />

        <FeatureSection
          id="investor-experience"
          headline="Impress Investors and Close Faster"
          bullets={INVESTOR_EXP_BULLETS}
          imageSrc={SCREENSHOT.investorExp}
          imageAlt="Investor-facing offering experience in CPIN"
        />

        <FeatureSection
          id="data-room"
          reverse
          headline="Built In Data Rooms"
          bullets={DATA_ROOM_BULLETS}
          imageSrc={SCREENSHOT.dataRoom}
          imageAlt="Secure data room with documents in CPIN"
        />

        <FeatureSection
          id="tasks-execution"
          headline="Never Miss Follow Ups Again"
          bullets={TASKS_BULLETS}
          imageSrc={SCREENSHOT.tasks}
          imageAlt="Tasks and execution workflows in CPIN"
        />

        <PricingSection />
        <FinalCtaSection />
        <MarketingContactSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
