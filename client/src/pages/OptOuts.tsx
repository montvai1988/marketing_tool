import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { OPT_OUT_REASON_LABELS } from "@shared/prospects";
import { Loader2, Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function OptOuts() {
  const [email, setEmail] = useState("");
  const utils = trpc.useUtils();
  const { data: optOuts, isLoading } = trpc.outreach.listOptOuts.useQuery();

  const add = trpc.outreach.addOptOut.useMutation({
    onSuccess: () => {
      toast.success("A cím felvéve a kizárási listára.");
      setEmail("");
      void utils.outreach.listOptOuts.invalidate();
      void utils.outreach.listProspects.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.outreach.removeOptOut.useMutation({
    onSuccess: () => {
      toast.success("A cím eltávolítva a kizárási listáról.");
      void utils.outreach.listOptOuts.invalidate();
      void utils.outreach.listProspects.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Leiratkozások"
        title="Kizárási lista"
        description="Az itt szereplő címekre a rendszer semmilyen kampányban nem küld levelet, akkor sem, ha egy új keresés újra megtalálja őket."
      />

      <section className="panel rise-in mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <Input
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="cim@pelda.hu"
          type="email"
          aria-label="Kizárandó e-mail cím"
        />
        <Button
          onClick={() => add.mutate({ email: email.trim(), reason: "manual" })}
          disabled={add.isPending || email.trim().length === 0}
          className="shrink-0"
        >
          {add.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Hozzáadás
        </Button>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : optOuts && optOuts.length > 0 ? (
        <ul className="panel rise-in divide-y divide-border overflow-hidden">
          {optOuts.map(entry => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("hu-HU")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-[11px]">
                  {OPT_OUT_REASON_LABELS[entry.reason] ?? entry.reason}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() => remove.mutate({ email: entry.email })}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Visszavonás
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nincs kizárt cím"
          description="A levelek láblécében szereplő leiratkozó linkről érkező kérések automatikusan itt jelennek meg, és minden további kiküldésből kimaradnak."
          steps={[
            "A leiratkozás azonnal érvényes minden kampányra.",
            "Kézzel is felvehetsz címet, például telefonos kérésre.",
            "Az újbóli felderítés sem hozza vissza a kizárt címeket.",
          ]}
        />
      )}
    </div>
  );
}
