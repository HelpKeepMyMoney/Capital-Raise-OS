"use client";

import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { OutreachSequence, OutreachStep } from "@/lib/firestore/types";
import { TEMPLATE_VARIABLE_HINTS } from "@/lib/outreach/template-vars";
import { toast } from "sonner";

function SortableStep(props: {
  step: OutreachStep;
  index: number;
  onChange: (step: OutreachStep) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border/80 bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Step {props.index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          onClick={props.onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Delay (days)</Label>
          <Input
            type="number"
            min={0}
            value={props.step.delayDays}
            onChange={(e) =>
              props.onChange({ ...props.step, delayDays: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trigger</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={props.step.trigger}
            onChange={(e) =>
              props.onChange({
                ...props.step,
                trigger: e.target.value as OutreachStep["trigger"],
              })
            }
          >
            <option value="immediate">Immediate</option>
            <option value="opened">If opened</option>
            <option value="clicked">If clicked</option>
            <option value="no_response">No response</option>
          </select>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Input
          placeholder="Subject template"
          value={props.step.subjectTemplate ?? ""}
          onChange={(e) => props.onChange({ ...props.step, subjectTemplate: e.target.value })}
        />
        <Textarea
          className="min-h-[100px] font-mono text-sm"
          placeholder="Body template (HTML)"
          value={props.step.bodyTemplate ?? ""}
          onChange={(e) => props.onChange({ ...props.step, bodyTemplate: e.target.value })}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Switch
          checked={props.step.aiPersonalized}
          onCheckedChange={(v) => props.onChange({ ...props.step, aiPersonalized: v })}
        />
        <Label className="text-sm">AI personalization</Label>
        <Switch
          className="ml-4"
          checked={props.step.enabled}
          onCheckedChange={(v) => props.onChange({ ...props.step, enabled: v })}
        />
        <Label className="text-sm">Enabled</Label>
      </div>
    </div>
  );
}

export function SequenceBuilder(props: {
  sequence: OutreachSequence | null;
  onSaved: (seq: OutreachSequence) => void;
}) {
  const [name, setName] = React.useState(props.sequence?.name ?? "New sequence");
  const [steps, setSteps] = React.useState<OutreachStep[]>(props.sequence?.steps ?? []);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(props.sequence?.name ?? "New sequence");
    setSteps(props.sequence?.steps ?? []);
  }, [props.sequence?.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function addStep() {
    setSteps((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        type: "email",
        delayDays: s.length === 0 ? 0 : 3,
        subjectTemplate: "Following up — {{deal_name}}",
        bodyTemplate:
          "<p>Hi {{investor_name}},</p><p>I wanted to follow up regarding {{deal_name}}.</p>",
        aiPersonalized: false,
        trigger: s.length === 0 ? "immediate" : "no_response",
        enabled: true,
      },
    ]);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSteps((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function save() {
    setSaving(true);
    try {
      const body = { name, steps };
      const url = props.sequence
        ? `/api/outreach/sequences/${props.sequence.id}`
        : "/api/outreach/sequences";
      const method = props.sequence ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      const json = (await res.json()) as OutreachSequence;
      props.onSaved(json);
      toast.success("Sequence saved");
    } catch {
      toast.error("Could not save sequence");
    } finally {
      setSaving(false);
    }
  }

  const previewHtml = steps[0]?.bodyTemplate ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base">Sequence builder</CardTitle>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save sequence"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sequence name" />
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <SortableStep
                    key={step.id}
                    step={step}
                    index={i}
                    onChange={(next) =>
                      setSteps((all) => all.map((s) => (s.id === step.id ? next : s)))
                    }
                    onRemove={() => setSteps((all) => all.filter((s) => s.id !== step.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" onClick={addStep}>
            <Plus className="mr-2 size-4" />
            Add step
          </Button>
          <p className="text-xs text-muted-foreground">
            Variables: {TEMPLATE_VARIABLE_HINTS.join(", ")}
          </p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base">Email preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-lg border border-border/60 bg-muted/20 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml || "<p>Add a step to preview.</p>" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
