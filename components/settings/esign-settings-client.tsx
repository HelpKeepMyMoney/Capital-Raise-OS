"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EsignTemplateField } from "@/lib/firestore/types";
import { EsignTemplateFieldEditor } from "@/components/settings/esign-template-field-editor";

type ListRow = {
  id: string;
  name: string;
  fieldCount: number;
  updatedAt: number;
};

const TEMPLATE_SELECT_TRIGGER_CLASS =
  "h-auto min-h-8 w-full min-w-0 max-w-full rounded-xl py-2 text-left whitespace-normal [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:break-words";

const TEMPLATE_SELECT_CONTENT_CLASS =
  "max-h-[min(40vh,var(--available-height))] min-w-[min(100vw-2rem,34rem)] max-w-[min(100vw-2rem,42rem)] overflow-x-visible sm:min-w-[36rem]";

const TEMPLATE_SELECT_ITEM_CLASS =
  "items-start py-1.5 [&_span]:max-w-full [&_span]:whitespace-normal [&_span]:break-words";

function templateOptionLabel(t: ListRow): string {
  return `${t.name} (${t.fieldCount} field${t.fieldCount === 1 ? "" : "s"})`;
}

function OrgTemplateSelect(props: {
  value: string | null;
  onValueChange: (next: string | null) => void;
  templates: ListRow[];
  disabled: boolean;
  placeholder: string;
  noneLabel?: string;
}) {
  const triggerLabel = React.useMemo(() => {
    if (!props.value) return props.noneLabel ?? "None";
    const t = props.templates.find((x) => x.id === props.value);
    return t ? templateOptionLabel(t) : props.value;
  }, [props.value, props.templates, props.noneLabel]);

  return (
    <Select
      value={props.value ?? "__none__"}
      onValueChange={(v) => props.onValueChange(v === "__none__" ? null : v)}
      disabled={props.disabled}
    >
      <SelectTrigger className={TEMPLATE_SELECT_TRIGGER_CLASS}>
        <SelectValue placeholder={props.placeholder}>{triggerLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className={TEMPLATE_SELECT_CONTENT_CLASS}>
        <SelectItem value="__none__">{props.noneLabel ?? "None"}</SelectItem>
        {props.templates.map((t) => (
          <SelectItem key={t.id} value={t.id} className={TEMPLATE_SELECT_ITEM_CLASS}>
            {templateOptionLabel(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EsignSettingsClient(props: {
  organizationId: string;
  canManageTemplates: boolean;
  canSetSubscriptionTemplate: boolean;
  initialSubscriptionTemplateId: string | null;
  initialQuestionnaireTemplateId: string | null;
}) {
  const [templates, setTemplates] = React.useState<ListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createName, setCreateName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(
    props.initialSubscriptionTemplateId,
  );
  const [questionnaireId, setQuestionnaireId] = React.useState<string | null>(
    props.initialQuestionnaireTemplateId,
  );
  const [subscriptionSaving, setSubscriptionSaving] = React.useState(false);
  const [questionnaireSaving, setQuestionnaireSaving] = React.useState(false);

  React.useEffect(() => {
    setSubscriptionId(props.initialSubscriptionTemplateId);
  }, [props.initialSubscriptionTemplateId]);

  React.useEffect(() => {
    setQuestionnaireId(props.initialQuestionnaireTemplateId);
  }, [props.initialQuestionnaireTemplateId]);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/esign/templates");
      const json = (await res.json()) as { templates?: ListRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load templates");
      setTemplates(json.templates ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  async function createTemplate() {
    const name = createName.trim();
    if (!name) {
      toast.message("Enter a template name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/esign/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Template created — upload a PDF next");
      setCreateName("");
      await loadList();
      if (json.id) setSelectedId(json.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function saveSubscriptionTemplate(value: string | null) {
    setSubscriptionSaving(true);
    try {
      const res = await fetch(`/api/organizations/${props.organizationId}/esign-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionSignableTemplateId: value }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSubscriptionId(value);
      toast.success("Subscription template updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubscriptionSaving(false);
    }
  }

  async function saveQuestionnaireTemplate(value: string | null) {
    setQuestionnaireSaving(true);
    try {
      const res = await fetch(`/api/organizations/${props.organizationId}/esign-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorQuestionnaireSignableTemplateId: value }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setQuestionnaireId(value);
      toast.success("Investor questionnaire template updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setQuestionnaireSaving(false);
    }
  }

  async function deleteTemplate(t: ListRow) {
    if (
      !window.confirm(
        `Delete template “${t.name}”? It will be removed from the library and can’t be used for new packets. Envelopes already started may still finish.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/esign/templates/${t.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Template deleted");
      setSelectedId((cur) => (cur === t.id ? null : cur));
      setSubscriptionId((cur) => (cur === t.id ? null : cur));
      setQuestionnaireId((cur) => (cur === t.id ? null : cur));
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const templatePickDisabled = loading || subscriptionSaving || questionnaireSaving;

  return (
    <div className="space-y-8">
      {props.canSetSubscriptionTemplate ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Investor subscription packet</Label>
            <p className="text-xs text-muted-foreground">
              LP guests sign this template when they request subscription documents on a deal.
            </p>
            <OrgTemplateSelect
              value={subscriptionId}
              onValueChange={(v) => void saveSubscriptionTemplate(v)}
              templates={templates}
              disabled={templatePickDisabled}
              placeholder="None — choose a template"
              noneLabel="None"
            />
          </div>

          <div className="space-y-2 border-t border-border/60 pt-6">
            <Label>Investor questionnaire</Label>
            <p className="text-xs text-muted-foreground">
              Optional: pick a signable PDF (e.g. accreditation or suitability questionnaire). Stored org-wide on your
              organization for flows that use it.
            </p>
            <OrgTemplateSelect
              value={questionnaireId}
              onValueChange={(v) => void saveQuestionnaireTemplate(v)}
              templates={templates}
              disabled={templatePickDisabled}
              placeholder="None — choose a template"
              noneLabel="None"
            />
          </div>
        </div>
      ) : null}

      {props.canManageTemplates ? (
        <>
          <div className="space-y-3 rounded-xl border border-border/80 p-4">
            <div className="font-medium">New template</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="tpl-name">Name</Label>
                <Input
                  id="tpl-name"
                  className="rounded-xl"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Mutual NDA, Subscription agreement"
                />
              </div>
              <Button type="button" className="rounded-xl" disabled={creating} onClick={() => void createTemplate()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your templates</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet. Create one above.</p>
            ) : (
              <ul className="divide-y rounded-xl border border-border/80">
                {templates.map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                        onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                      >
                        <span className="flex-1 break-words font-medium">{t.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t.fieldCount} field{t.fieldCount === 1 ? "" : "s"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t.id === selectedId ? "▼" : "Edit"}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="mr-3 shrink-0 rounded-lg"
                        onClick={() => void deleteTemplate(t)}
                      >
                        Delete
                      </Button>
                    </div>
                    {t.id === selectedId ? (
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-4">
                        <EsignTemplateFieldEditor
                          templateId={t.id}
                          templateName={t.name}
                          onFieldsSaved={(fields: EsignTemplateField[]) => {
                            setTemplates((prev) =>
                              prev.map((row) =>
                                row.id === t.id ? { ...row, fieldCount: fields.length } : row,
                              ),
                            );
                          }}
                          onRenamed={(name) => {
                            setTemplates((prev) => prev.map((row) => (row.id === t.id ? { ...row, name } : row)));
                          }}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to edit templates.</p>
      )}
    </div>
  );
}
