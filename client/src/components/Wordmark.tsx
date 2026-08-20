/**
 * Ledger-mark used as the product's repeated visual motif: a ruled column with
 * an outreach dot, echoing the prospect ledger the app maintains.
 */
export function LedgerMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 4.5h14M5 9.5h9M5 14.5h9" strokeLinecap="round" />
        <circle cx="18" cy="16.5" r="2.6" />
      </svg>
    </span>
  );
}

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LedgerMark />
      {collapsed ? null : (
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-semibold leading-none tracking-tight">
            Prospect Hub
          </span>
          <span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.18em] text-muted-foreground">
            Üzletszerzés
          </span>
        </span>
      )}
    </span>
  );
}
