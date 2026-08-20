import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  delay?: number;
};

export function StatCard({ label, value, hint, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <div className="panel rise-in p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-3xl leading-none tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
