"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowFlowchart } from "@/components/help/workflow-flowchart";
import { SponsorGuideToc, type GuideTab } from "@/components/help/sponsor-guide-toc";

function isGuideTab(v: string | null): v is GuideTab {
  return v === "workflow" || v === "investors" || v === "invitations" || v === "platform";
}

function Section(props: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={props.id} className="scroll-mt-24 space-y-3">
      <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">{props.title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{props.children}</div>
    </section>
  );
}

function ProseLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link href={props.href} className="font-medium text-primary underline-offset-4 hover:underline">
      {props.children}
    </Link>
  );
}

export function SponsorGuideClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: GuideTab = isGuideTab(rawTab) ? rawTab : "workflow";

  const setTab = React.useCallback(
    (next: GuideTab) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const navigateToSection = React.useCallback(
    (nextTab: GuideTab, sectionId: string) => {
      setTab(nextTab);
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    },
    [setTab],
  );

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <SponsorGuideToc activeTab={tab} onNavigate={navigateToSection} className="hidden w-56 shrink-0 lg:block" />

      <div className="min-w-0 flex-1 space-y-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as GuideTab)} className="w-full gap-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-muted/60 p-1.5">
            {(
              [
                ["workflow", "Workflow"],
                ["investors", "Investors & CRM"],
                ["invitations", "Invitations"],
                ["platform", "Platform"],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-xl px-3 py-2 data-active:bg-card data-active:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="workflow" className="space-y-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
            <p className="text-sm text-muted-foreground">
              Follow this order the first time you set up CapitalOS for a raise. You can return to any step later.
            </p>
            <WorkflowFlowchart />

            <Section id="sg-organization" title="1. Organization (Settings)">
              <p>
                Open <ProseLink href="/settings">Settings</ProseLink> and select the <strong>Organization</strong> tab
                in the card at the top. Complete your workspace name and slug, organization contact details, and review
                the billing entry point. The integrations note on Settings describes environment-driven services (email,
                AI, payments) configured on the host.
              </p>
            </Section>

            <Section id="sg-your-profile" title="2. Your profile (Settings)">
              <p>
                In the same Settings page, switch to <strong>Your profile</strong>. Add your display name, phone, title,
                and mailing address where you want them for templates and team visibility.
              </p>
            </Section>

            <Section id="sg-esign" title="3. E-sign templates">
              <>
                <p>
                  Open <ProseLink href="/settings/esign">E-sign templates</ProseLink> from the sidebar or via{" "}
                  <strong>E-Sign Templates</strong> on <ProseLink href="/settings">Settings</ProseLink>. The page is
                  grouped as <strong>Library, subscription &amp; questionnaire</strong>: org-wide signing assets and how
                  deals use them.
                </p>
                <p>
                  <strong>Who can change what.</strong> Most raise-team roles can use the <strong>New template</strong>{" "}
                  flow and expand templates under <strong>Your templates</strong> to upload PDFs and draw fields.
                  Picking the <strong>Investor subscription packet</strong> and <strong>Investor questionnaire</strong>{" "}
                  templates is limited to members who are allowed to edit organization profile settings—if you do not
                  see those selectors, ask a founder or org admin to assign them.
                </p>
                <p>
                  <strong>Build the template library.</strong> Create a named template (for example &quot;Mutual
                  NDA&quot; or &quot;Subscription agreement&quot;), then expand it and <strong>upload a PDF</strong>.
                  On the canvas, page through the document, drag on the page to add signature or field boxes, move and
                  resize them, and mark each as <strong>Sponsor</strong> or <strong>Investor</strong> so routing is
                  correct. Changes to the name and field layout <strong>auto-save to the server shortly after you pause
                  editing</strong> (about one second); use <strong>Save name &amp; fields</strong> anytime for an
                  immediate manual save. The editor includes a merge-field reference (expand <strong>Merge field IDs</strong>) for auto-filling text or
                  date fields from organization contact, signing user profile, or investor name/email. If PDF upload
                  fails, the UI calls out Firebase Storage and credentials—fix the environment before retrying.
                </p>
                <p>
                  <strong>Investor subscription packet.</strong> Choose which library template LPs use when they
                  request subscription documents on a <strong>deal</strong>. Selection saves immediately. When the PDF
                  includes sponsor-side fields, your team gets a counter-sign link after the investor finishes their
                  pass.
                </p>
                <p>
                  <strong>Investor questionnaire.</strong> Optionally choose a signable PDF (for example accreditation
                  or suitability) stored org-wide for flows that collect it from investors.
                </p>
                <p>
                  <strong>Data rooms and NDAs.</strong> Each data room&apos;s <strong>Settings</strong> tab links a{" "}
                  <strong>NDA / room access agreement</strong> template from this same library—configure those rooms
                  after the PDF exists here. If investors must sign an NDA before opening a data room, add that NDA as a
                  template in this library first, then select it in the room&apos;s settings and use{" "}
                  <strong>Send for signature (e-sign)</strong> there when you want to push an envelope to a specific
                  investor.
                </p>
                <p>
                  <strong>Lifecycle.</strong> The list shows each template&apos;s field count. <strong>Delete</strong>{" "}
                  removes a template from the library and clears it from pickers; envelopes already in flight can still
                  finish per the confirmation copy in the product.
                </p>
              </>
            </Section>

            <Section id="sg-deal-room" title="4. Deal room">
              <>
                <p>
                  Create an offering from <ProseLink href="/deals/new">New offering</ProseLink>, then manage it from{" "}
                  <ProseLink href="/deals">Deal room</ProseLink>. Open a deal to use the sponsor panel along the deal
                  manager. When available, preview the investor-facing page from the deal so you can confirm what invited
                  LPs will see.
                </p>
                <p>
                  <strong>Analytics.</strong> Review page views, unique visitors, CRM interest count, open invites,
                  commitment totals and average check, and CTA engagement charts as investors interact with this
                  offering.
                </p>
                <p>
                  <strong>Invite investors.</strong> Create deal-scoped or full-portal invites, copy links, optionally
                  email recipients, set expiry, and note NDA expectations (enforce NDAs via your linked data room). See
                  the Invitations tab of this guide for more detail.
                </p>
                <p>
                  <strong>Commitments.</strong> Track who has committed capital on this deal, amounts, and document
                  status so you can move investors toward close.
                </p>
                <p>
                  <strong>Updates.</strong> Publish short investor-facing posts (title and body) that appear on the deal
                  for invited investors—keep content factual and coordinated with counsel; this is not a substitute for
                  required disclosures.
                </p>
                <p>
                  <strong>Settings.</strong> Configure how this deal appears to investors: narrative, media, CTAs,
                  linked data rooms, calendar booking, and related options. <strong>Fill in every field you want
                  investors to see</strong>—empty fields can change how polished or complete the offering looks. Empty
                  subsections under <strong>Why invest — investor narrative</strong> are hidden from investors, so
                  leave unused parts blank if you prefer. The <strong>Traction</strong> block on the investor view only
                  appears when you have added <strong>at least one traction metric</strong>; otherwise that section
                  stays hidden. Use paragraphs and bullet-style lines in long text fields so the page is easy to scan.
                  When you are done editing, press <strong>Save changes</strong> so your updates apply.
                </p>
              </>
            </Section>

            <Section id="sg-data-room" title="5. Data room">
              <>
                <p>
                  Open <ProseLink href="/data-room">Data room</ProseLink>, create or pick a room, and use the workspace
                  tabs for that room. Link the room to a deal in <strong>Settings</strong> when you want deal-scoped
                  invitations and eligible NDA recipients from the CRM.
                </p>
                <p>
                  <strong>Investor view.</strong> See the room as an invited investor would: welcome copy, documents
                  available to them, and gating (for example when an NDA is required before files unlock).
                </p>
                <p>
                  <strong>NDA.</strong> This tab lists NDA envelopes for the room. Signing links appear in the table:
                  open <strong>Sponsor</strong> or <strong>Investor</strong> to complete unsigned steps in the e-sign
                  flow (while those links are still valid). When an envelope is <strong>Completed</strong>, use the{" "}
                  <strong>PDF</strong> action to download the fully executed agreement.
                </p>
                <p>
                  <strong>Documents.</strong> The toolbar includes a <strong>Bulk actions</strong> label next to{" "}
                  <strong>New folder</strong>—use <strong>New folder</strong> to add folders at your current location
                  in the breadcrumb, open folder rows to drill in, and use <strong>Move to…</strong> from a file&apos;s{" "}
                  <strong>⋯</strong> (Actions) menu to place files inside nested folders. When uploading, choose{" "}
                  <strong>Upload into folder</strong> (room root or a folder path) and set <strong>Default upload type</strong>{" "}
                  so each new file is stored with the right category (for example Pitch Deck, Financial Model, Legal).
                  Use the category chips (<strong>All</strong>, <strong>Financials</strong>, <strong>Legal</strong>,{" "}
                  <strong>Pitch</strong>, <strong>Media</strong>, <strong>Hidden</strong>) to filter files{" "}
                  <strong>by type across every folder</strong>; switch back to the folder tree from the category view
                  when you want to browse by folder again. Row <strong>⋯</strong> menus also cover rename/move, investor
                  visibility, preview/download, and delete.
                </p>
                <p>
                  <strong>Activity.</strong> Review document opens, views by category, top files, and a chronological
                  activity feed for the room.
                </p>
                <p>
                  <strong>Investors.</strong> See invitations that can access this room (respecting deal filters when
                  applied), with columns such as invite status and NDA status. Use the <strong>⋯</strong> menu on a row
                  for actions like resend, readmit, message, assign an owner, or revoke—depending on status and your
                  permissions.
                </p>
                <p>
                  <strong>Settings.</strong> Complete room name, associated deal, description, visibility, and whether
                  an <strong>NDA is required before access</strong>. Under <strong>Electronic signatures (e-sign)</strong>,{" "}
                  choose the <strong>NDA / room access agreement (this room)</strong> template from your org library
                  (templates are created under <ProseLink href="/settings/esign">E-sign templates</ProseLink>). The{" "}
                  <strong>Send for signature (e-sign)</strong> card lets you start an envelope for a specific CRM
                  investor (they must have the linked deal on <strong>Interested deals</strong> and a valid email—save
                  room settings after linking a deal so eligible investors load). Also configure downloads, optional
                  room expiry, login requirements, and the investor <strong>Welcome message</strong>. Press{" "}
                  <strong>Save settings</strong> when finished.
                </p>
              </>
            </Section>

            <Section id="sg-tasks" title="6. Tasks">
              <>
                <p>
                  Open <ProseLink href="/tasks">Tasks</ProseLink> for the execution center: follow-ups, closings,
                  diligence, and other work tied to your raise.
                </p>
                <p>
                  <strong>Header (managers).</strong> Use <strong>New Task</strong> to open the create dialog.{" "}
                  <strong>Bulk Actions</strong> is reserved for a future multi-select workflow (it currently shows a
                  placeholder notice). <strong>Automations</strong> in the header jumps to the automation center at
                  the bottom of the page—the same control appears in the workspace toolbar.
                </p>
                <p>
                  <strong>Metrics and suggestions.</strong> The metric cards summarize <strong>Open tasks</strong>,{" "}
                  <strong>Due today</strong>, <strong>Overdue</strong>, <strong>Completed this week</strong> (with a
                  trend vs the prior week when available), <strong>Investor follow ups</strong>, and{" "}
                  <strong>Deal closing tasks</strong>. If your org has very large lists, a note may appear that counts
                  are capped to the latest loaded tasks. <strong>Smart suggestions</strong> (when present) surface
                  lightbulb-style recommendations from recent CRM, meeting, and task activity.
                </p>
                <p>
                  <strong>Workspace chips.</strong> Switch between <strong>My Tasks</strong> (assigned to you),{" "}
                  <strong>Team Tasks</strong> (all open items for the org load), <strong>Investor Follow Ups</strong>{" "}
                  (tasks flagged as investor follow-up), <strong>Deal Closings</strong> (closing, send-docs, and
                  commitment-review types), and <strong>Completed</strong> (closed history). Use the{" "}
                  <strong>Automations</strong> chip in the toolbar to scroll to the automation list.
                </p>
                <p>
                  <strong>Views and filters.</strong> Choose <strong>List</strong>, <strong>Kanban</strong>,{" "}
                  <strong>Calendar</strong>, or <strong>By owner</strong>. <strong>Kanban</strong> and{" "}
                  <strong>By owner</strong> apply to open work only—they are hidden while you are on the{" "}
                  <strong>Completed</strong> chip. <strong>Calendar</strong> overlays open tasks with upcoming meetings.
                  Narrow the list with search (title, linked investor, or linked deal), <strong>All priorities</strong>{" "}
                  (Critical through Low), and <strong>All owners</strong> (including <strong>Unassigned</strong>).
                </p>
                <p>
                  <strong>Working a task.</strong> Open a row to use the side drawer: review details, change assignee
                  or links, and jump to the related <ProseLink href="/investors">investor</ProseLink> or{" "}
                  <ProseLink href="/deals">deal</ProseLink> when linked. From the list, mark items done or reopen them,
                  snooze follow-ups for a week, or cancel tasks you no longer need.
                </p>
                <p>
                  <strong>Creating tasks.</strong> In <strong>New task</strong>, use quick template chips (for example{" "}
                  <em>Investor follow up</em>, <em>Closing checklist</em>, <em>Send docs</em>) to prefill title and task
                  type. Add optional description, notes, due date and time, reminder, priority, workflow status, assignee,
                  and optional links to a CRM investor, deal, and data room. Repeat schedules and other fields are
                  available in the form; if you leave due blank, the dialog explains the default horizon.
                </p>
                <p>
                  <strong>Task analytics and automations.</strong> <strong>Task analytics</strong> shows overdue share
                  and a chart of open tasks by owner. <strong>Automation center</strong> lists rules (some live, others
                  preview) such as auto-creating a follow-up when an investor expresses interest on a deal—read each card
                  for trigger and status.
                </p>
                <p>
                  <strong>CRM link.</strong> Setting <strong>next follow-up</strong> on an investor in the CRM pairs with
                  follow-up work here so dates and tasks stay aligned.
                </p>
              </>
            </Section>
          </TabsContent>

          <TabsContent value="investors" className="space-y-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
            <Section id="sg-crm-add" title="Add investors">
              <p>
                Open <ProseLink href="/investors">Investor CRM</ProseLink> and use <strong>Add investor</strong> to
                create a record. You can also use the dashboard quick action or open{" "}
                <ProseLink href="/investors?add=1">Investor CRM with add dialog</ProseLink> directly.
              </p>
            </Section>

            <Section id="sg-crm-import" title="Import and export">
              <p>
                Download the CSV import template from the CRM toolbar, fill rows, then use <strong>Import investors</strong>{" "}
                to validate and commit. Export the current list to CSV anytime for backups or mail-merge outside the
                app.
              </p>
            </Section>

            <Section id="sg-crm-views" title="Views and filters">
              <p>
                Switch between <strong>Board</strong> (pipeline), <strong>Table</strong>, <strong>Map</strong>,{" "}
                <strong>List</strong>, and <strong>Calendar</strong> views. Use the toolbar to filter by stage, deal
                interest, and more; save filter presets for repeat use. Open any investor for their full profile at{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/investors/[id]</code>.
              </p>
            </Section>

            <Section id="sg-crm-interactions" title="Notes and interactions">
              <p>
                Log touches with quick notes and keep the pipeline stage current. Bulk-select investors to move stages
                together when you are cleaning up after a roadshow.
              </p>
            </Section>
          </TabsContent>

          <TabsContent
            value="invitations"
            className="space-y-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-6"
          >
            <Section id="sg-inv-deal" title="Deal and portal invites">
              <p>
                On a deal&apos;s <strong>Invite investors</strong> tab, choose access scope: <strong>This deal only</strong> or{" "}
                <strong>Full investor portal (all deals)</strong>. Optionally enter an email, set link expiry, copy the
                invite link, and send email when your environment supports it. If an NDA is required, note it on the
                invite and enforce signing via your linked data room.
              </p>
            </Section>

            <Section id="sg-inv-dataroom" title="Data room access">
              <p>
                From <ProseLink href="/data-room">Data room</ProseLink>, manage investor visibility per room. Deal-scoped
                invitations include data rooms tagged with that deal—keep room tags aligned with the deal you invited
                investors to.
              </p>
            </Section>

            <Section id="sg-inv-accept" title="Accepting invites">
              <p>
                Investors open their invite URL (for example <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/invite/[token]</code>
                ) to join with the access you granted. They then see deal room and data room items according to role and
                invite scope.
              </p>
            </Section>
          </TabsContent>

          <TabsContent value="platform" className="space-y-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:p-6">
            <Section id="sg-pl-raise" title="Raise (sidebar)">
              <p>
                <strong>Dashboard</strong> — KPIs, pipeline and outreach charts, recent activity, priority tasks, and
                alerts. <strong>Discovery</strong> and <strong>Outreach</strong> are marked{" "}
                <span className="text-muted-foreground">(coming soon)</span> in the nav; quick actions may still link to
                those routes as placeholders.
              </p>
            </Section>

            <Section id="sg-pl-capital" title="Capital (sidebar)">
              <p>
                <strong>Investor CRM</strong>, <strong>Deal room</strong>, <strong>Data room</strong>, and{" "}
                <strong>Tasks</strong> — the core modules for pipeline, offering, documents, and execution described in
                the other tabs here.
              </p>
            </Section>

            <Section id="sg-pl-insights" title="Insights (sidebar)">
              <p>
                <strong>Analytics</strong> is marked <span className="text-muted-foreground">(coming soon)</span>.
              </p>
            </Section>

            <Section id="sg-pl-system" title="System (sidebar)">
              <p>
                <strong>Sponsor Guide</strong> (this page) and <strong>Settings</strong> — organization, profile, e-sign
                entry, billing, and org lifecycle actions your role allows. <strong>Platform admin</strong> appears only
                for platform administrators.
              </p>
            </Section>

            <Section id="sg-pl-copilot" title="AI Copilot">
              <p>
                Open <strong>AI Copilot</strong> from the sidebar footer. When your plan does not include AI, the button
                shows a <strong>Pro+</strong> badge; enabled orgs can chat with the copilot in context.
              </p>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
