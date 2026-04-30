import type { DealCommitment } from "@/lib/firestore/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CommitmentRow = DealCommitment & { contactEmail?: string };

function statusLabel(c: DealCommitment): string {
  if (c.status === "withdrawn") return "Withdrawn";
  const d = c.docStatus;
  if (d === "complete") return "Wired";
  if (d === "pending") return "Docs sent";
  return "Soft circle";
}

export function CommitmentsTable(props: { rows: CommitmentRow[]; dealId: string }) {
  if (props.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No active commitments yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Investor</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Last contact</th>
            <th className="px-4 py-3 font-medium">Next step</th>
            <th className="px-4 py-3 font-medium">Document</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/80 bg-card">
          {props.rows.map((c) => (
            <tr key={c.userId} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">
                {c.contactEmail ?? `${c.userId.slice(0, 8)}…`}
              </td>
              <td className="px-4 py-3 tabular-nums">${c.amount.toLocaleString()}</td>
              <td className="px-4 py-3">{statusLabel(c)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">Portal</td>
              <td className="px-4 py-3 text-muted-foreground">—</td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.docStatus === "pending" ? "Follow on docs" : "—"}
              </td>
              <td className="px-4 py-3">
                {c.docStatus === "complete" ? (
                  <a
                    href={`/api/esign/subscription/final-document?dealId=${encodeURIComponent(props.dealId)}&userId=${encodeURIComponent(c.userId)}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
                  >
                    Download signed PDF
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
