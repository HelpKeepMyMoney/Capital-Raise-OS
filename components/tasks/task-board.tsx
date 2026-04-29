"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Task } from "@/lib/firestore/types";
import {
  type KanbanColumnId,
  kanbanColumnForTask,
  patchPayloadForKanbanColumn,
} from "@/lib/tasks/kanban-buckets";

const COLUMNS: { id: KanbanColumnId; title: string }[] = [
  { id: "today", title: "Today & overdue" },
  { id: "week", title: "Upcoming" },
  { id: "waiting", title: "Waiting" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Completed" },
];

function DroppableColumn(props: {
  id: KanbanColumnId;
  title: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[320px] flex-col rounded-2xl border border-border/70 bg-muted/15 shadow-inner transition-colors ${
        isOver ? "border-primary/50 bg-primary/[0.04]" : ""
      }`}
    >
      <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {props.title}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">{props.children}</div>
    </div>
  );
}

function DraggableCard(props: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      className={`rounded-xl border border-border/80 bg-card px-3 py-2 text-left text-xs shadow-sm transition ${
        isDragging ? "cursor-grabbing opacity-70 ring-2 ring-primary/30" : "cursor-grab hover:bg-muted/40"
      }`}
    >
      <span className="line-clamp-3 font-medium leading-snug">{props.task.title}</span>
    </button>
  );
}

export function TaskBoard(props: { tasks: Task[] }) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const grouped = React.useMemo(() => {
    const map = new Map<KanbanColumnId, Task[]>();
    for (const c of COLUMNS) map.set(c.id, []);
    for (const t of props.tasks) {
      const col = kanbanColumnForTask(t);
      map.get(col)!.push(t);
    }
    return map;
  }, [props.tasks]);

  async function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id != null ? String(event.over.id) : "";
    if (!overId) return;

    let columnId = overId as KanbanColumnId;
    const ids = COLUMNS.map((c) => c.id);
    if (!ids.includes(columnId)) {
      const sibling = props.tasks.find((x) => x.id === overId);
      columnId = sibling ? kanbanColumnForTask(sibling) : "week";
    }

    try {
      const res = await fetch(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayloadForKanbanColumn(columnId)),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not move task");
      toast.success("Task updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move task");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(e) => void onDragEnd(e)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => (
          <DroppableColumn key={col.id} id={col.id} title={col.title}>
            {(grouped.get(col.id) ?? []).map((t) => (
              <DraggableCard key={t.id} task={t} />
            ))}
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
}
