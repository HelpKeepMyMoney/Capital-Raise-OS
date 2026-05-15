"use client";

import { cn } from "@/lib/utils";

export type GuideTab = "workflow" | "investors" | "invitations" | "platform";

export type TocEntry = {
  id: string;
  label: string;
  tab: GuideTab;
};

export const SPONSOR_GUIDE_TOC: TocEntry[] = [
  { tab: "workflow", id: "sg-organization", label: "Organization" },
  { tab: "workflow", id: "sg-your-profile", label: "Your profile" },
  { tab: "workflow", id: "sg-esign", label: "E-sign templates" },
  { tab: "workflow", id: "sg-deal-room", label: "Deal room" },
  { tab: "workflow", id: "sg-data-room", label: "Data room" },
  { tab: "workflow", id: "sg-tasks", label: "Tasks" },
  { tab: "investors", id: "sg-crm-add", label: "Add investors" },
  { tab: "investors", id: "sg-crm-import", label: "Import & export" },
  { tab: "investors", id: "sg-crm-views", label: "Views & filters" },
  { tab: "investors", id: "sg-crm-interactions", label: "Notes & interactions" },
  { tab: "invitations", id: "sg-inv-deal", label: "Deal & portal invites" },
  { tab: "invitations", id: "sg-inv-dataroom", label: "Data room access" },
  { tab: "invitations", id: "sg-inv-accept", label: "Accepting invites" },
  { tab: "platform", id: "sg-pl-raise", label: "Raise" },
  { tab: "platform", id: "sg-pl-capital", label: "Capital" },
  { tab: "platform", id: "sg-pl-insights", label: "Insights" },
  { tab: "platform", id: "sg-pl-system", label: "System" },
  { tab: "platform", id: "sg-pl-copilot", label: "AI Copilot" },
];

type Props = {
  activeTab: GuideTab;
  onNavigate: (tab: GuideTab, sectionId: string) => void;
  className?: string;
};

export function SponsorGuideToc(props: Props) {
  return (
    <aside
      className={cn(
        "lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
        props.className,
      )}
    >
      <nav aria-label="Guide sections" className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
        <ul className="space-y-1 text-sm">
          {SPONSOR_GUIDE_TOC.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => props.onNavigate(e.tab, e.id)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/80",
                  props.activeTab === e.tab ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
