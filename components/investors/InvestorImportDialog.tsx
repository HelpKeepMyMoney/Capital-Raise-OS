"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importInvestorsCommit } from "@/app/actions/investors";
import { INVESTOR_CSV_HEADERS } from "@/lib/investors/investor-filters";
import { previewInvestorCsvRows, type CsvImportPreviewRow } from "@/lib/investors/csv-import";
import { useRouter } from "next/navigation";

export function InvestorImportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<CsvImportPreviewRow[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [committing, setCommitting] = React.useState(false);

  function reset() {
    setFileName(null);
    setRows([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  React.useEffect(() => {
    if (!props.open) {
      reset();
    }
  }, [props.open]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    void f.text().then((text) => {
      const result = previewInvestorCsvRows(text, props.deals);
      setFileError(result.fileError);
      setRows(result.fileError ? [] : result.rows);
    });
  }

  const validCount = rows.filter((r) => r.ok).length;
  const invalidCount = rows.length - validCount;

  async function onCommit() {
    const payloads = rows.filter((r) => r.ok && r.payload).map((r) => r.payload!);
    if (payloads.length === 0) {
      toast.error("No valid rows to import. Fix errors and re-upload, or add required fields.");
      return;
    }
    setCommitting(true);
    try {
      const res = await importInvestorsCommit(payloads);
      if (res.createdIds.length) {
        toast.success(`Added ${res.createdIds.length} investor${res.createdIds.length === 1 ? "" : "s"} to the CRM.`);
      }
      if (res.failed.length) {
        res.failed.forEach((f) =>
          toast.error(`Row ${f.index} in import batch: ${f.message}`),
        );
      }
      props.onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,900px)] min-h-0 max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 text-left">
          <DialogTitle>Import investors from CSV</DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed">
            Use the <span className="font-medium">Download import template</span> file. Required columns:{" "}
            <span className="font-medium">FirstName, LastName, Email, InvestorType, WarmCold, ReferralSource</span>
            . Other columns are optional. Review the preview, then import only <span className="font-medium">valid</span>{" "}
            rows.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onPickFile}
              />
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()}>
                Choose CSV file
              </Button>
              {fileName ? <span className="text-sm text-muted-foreground">{fileName}</span> : null}
              {fileName ? (
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  Clear
                </Button>
              ) : null}
            </div>
            {fileError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {fileError}
              </p>
            ) : null}
            <p className="break-words text-xs text-muted-foreground">
              Template header order: {INVESTOR_CSV_HEADERS.join(", ")}.
            </p>
          </div>
          {rows.length > 0 ? (
            <div className="border-t border-border/60 bg-muted/10 px-6 py-3 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{rows.length}</span> row{rows.length === 1 ? "" : "s"} parsed
                </span>
                {validCount > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {validCount} valid
                  </Badge>
                ) : null}
                {invalidCount > 0 ? (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-200">
                    {invalidCount} need fixes
                  </Badge>
                ) : null}
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="sticky top-0 z-[1] bg-muted/40 px-2 py-2 backdrop-blur-[2px]">#</th>
                      <th className="sticky top-0 z-[1] bg-muted/40 px-2 py-2 backdrop-blur-[2px]">Name</th>
                      <th className="sticky top-0 z-[1] bg-muted/40 px-2 py-2 backdrop-blur-[2px]">Email</th>
                      <th className="sticky top-0 z-[1] bg-muted/40 px-2 py-2 backdrop-blur-[2px]">Status</th>
                      <th className="sticky top-0 z-[1] bg-muted/40 px-2 py-2 pr-3 backdrop-blur-[2px]">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={r.ok ? "border-b border-border/40" : "border-b border-border/40 bg-amber-500/5"}
                      >
                        <td className="px-2 py-2 align-top font-mono text-muted-foreground">{r.rowIndex}</td>
                        <td className="px-2 py-2 align-top">
                          {r.summary.firstName} {r.summary.lastName}
                        </td>
                        <td className="px-2 py-2 align-top font-mono text-[11px]">{r.summary.email || "—"}</td>
                        <td className="px-2 py-2 align-top">
                          {r.ok ? (
                            <span className="text-emerald-700 dark:text-emerald-400">Ready</span>
                          ) : (
                            <span className="text-amber-800 dark:text-amber-200">Fix</span>
                          )}
                        </td>
                        <td className="px-2 py-2 pr-3 align-top text-[11px] text-muted-foreground">
                          {r.errors.length > 0 ? (
                            <ul className="list-inside list-disc text-destructive">
                              {r.errors.map((e) => (
                                <li key={e}>{e}</li>
                              ))}
                            </ul>
                          ) : null}
                          {r.warnings.length > 0 ? (
                            <ul className="mt-1 list-inside list-disc text-amber-800 dark:text-amber-200">
                              {r.warnings.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          ) : null}
                          {r.ok && r.errors.length === 0 && r.warnings.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={committing || validCount === 0}
            onClick={() => void onCommit()}
          >
            {committing ? "Importing…" : `Import ${validCount} valid row${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
