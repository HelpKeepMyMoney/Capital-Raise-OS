"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

type Props = {
  disabled?: boolean;
  uploading: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function UploadZone(props: Props) {
  const [drag, setDrag] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (props.disabled) return;
        if (e.dataTransfer.files?.length) props.onFilesSelected(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        props.disabled ? "opacity-50" : "hover:border-primary/50 hover:bg-muted/40",
        drag ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
      role="presentation"
      onClick={() => !props.disabled && props.inputRef.current?.click()}
    >
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Upload className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">Drop files here or browse</p>
      <p className="mt-1 text-xs text-muted-foreground">
        PDF · DOCX · XLSX · PPTX · PNG · JPG · MP4 · up to 50MB each
      </p>
      {props.uploading ? (
        <p className="mt-2 animate-pulse text-xs text-primary">Uploading…</p>
      ) : null}
    </div>
  );
}
