import { LedgerMark } from "./Wordmark";

type EmptyStateProps = {
  title: string;
  description: string;
  steps?: string[];
  action?: React.ReactNode;
};

/**
 * Ledger-styled empty state: instead of a bare icon, it shows ruled placeholder
 * rows so an empty screen still reads as the prospect ledger.
 */
export function EmptyState({ title, description, steps, action }: EmptyStateProps) {
  return (
    <div className="panel rise-in overflow-hidden">
      <div className="grid gap-8 p-8 md:grid-cols-[1fr_0.9fr] md:p-10">
        <div>
          <LedgerMark className="mb-5" />
          <h2 className="mb-2 text-2xl">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          {steps && steps.length > 0 ? (
            <ol className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[11px] tabular-nums">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {action ? <div className="mt-7">{action}</div> : null}
        </div>

        <div
          aria-hidden="true"
          className="hidden rounded-lg border border-dashed border-border bg-secondary/40 p-5 md:block"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="eyebrow">Kontaktnapló</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">00</span>
          </div>
          <div className="space-y-4">
            {[0, 1, 2, 3].map(row => (
              <div key={row} className="space-y-2 border-b border-border/70 pb-3 last:border-0">
                <div className="h-2 w-1/2 rounded-full bg-border" />
                <div className="h-2 w-2/3 rounded-full bg-border/60" />
                <div className="h-2 w-1/3 rounded-full bg-border/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
