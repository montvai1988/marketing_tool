import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS, PROSPECT_CATEGORY_ORDER } from "@shared/prospects";
import { MAX_SOURCE_DOMAINS } from "@shared/sources";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Category = (typeof PROSPECT_CATEGORY_ORDER)[number];

export default function Sources() {
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const utils = trpc.useUtils();
  const { data: sites, isLoading } = trpc.outreach.listSourceSites.useQuery();

  const add = trpc.outreach.addSourceSites.useMutation({
    onSuccess: result => {
      toast.success(`${result.inserted} forrásoldal felvéve, ${result.skipped} már szerepelt.`);
      if (result.rejected.length > 0) {
        toast.error(`Nem felismert sorok: ${result.rejected.slice(0, 3).join(", ")}`);
      }
      setInput("");
      void utils.outreach.listSourceSites.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const toggleActive = trpc.outreach.setSourceSiteActive.useMutation({
    onSuccess: () => void utils.outreach.listSourceSites.invalidate(),
    onError: error => toast.error(error.message),
  });

  const remove = trpc.outreach.deleteSourceSite.useMutation({
    onSuccess: () => {
      toast.success("A forrásoldal törölve.");
      void utils.outreach.listSourceSites.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const domainList = Array.from(new Set((sites ?? []).map(site => site.domain)));

  async function copyPatterns() {
    const patterns = domainList.map(domain => `*.${domain}/*`).join("\n");
    try {
      await navigator.clipboard.writeText(patterns);
      toast.success("A domain minták a vágólapra kerültek.");
    } catch {
      toast.error("A vágólapra írás nem sikerült.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Forrásoldalak"
        title="Keresési források"
        description="A Google 2026 januárjától új keresőmotoroknál nem engedi a teljes webes keresést, ezért itt te adod meg, mely platformokon és oldalakon keressen a rendszer."
        actions={
          domainList.length > 0 ? (
            <Button variant="outline" className="bg-card" onClick={copyPatterns}>
              <Copy className="mr-2 h-4 w-4" />
              Domain minták másolása
            </Button>
          ) : undefined
        }
      />

      <section className="panel rise-in mb-6 p-6">
        <div className="grid gap-5 md:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-2">
            <Label htmlFor="sources">Platformok és oldalak</Label>
            <Textarea
              id="sources"
              rows={6}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={"szallas.hu\nwww.pelda-katalogus.hu\nhttps://zenekarok.hu/kereso"}
            />
            <p className="text-xs text-muted-foreground">
              Soronként egy oldal. Teljes URL is beilleszthető, a rendszer kiolvassa belőle a domaint.
              Legfeljebb {MAX_SOURCE_DOMAINS} domain vehető fel, mert a Google ennyit engedélyez.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-category">Kategória</Label>
            <Select value={category} onValueChange={value => setCategory(value as Category | "all")}>
              <SelectTrigger id="source-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden kategóriához</SelectItem>
                {PROSPECT_CATEGORY_ORDER.map(item => (
                  <SelectItem key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="mt-2 w-full"
              onClick={() =>
                add.mutate({ input, category: category === "all" ? null : category })
              }
              disabled={add.isPending || input.trim().length === 0}
            >
              {add.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Hozzáadás
            </Button>
          </div>
        </div>
      </section>

      <div className="panel rise-in mb-6 p-5">
        <p className="eyebrow mb-2">Google beállítás</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ugyanezeket az oldalakat a Google vezérlőpultján is fel kell venni a keresőmotor „Sites to
          search” listájába. A fenti másolás gombbal a helyes minta formátumot (<code>*.domain/*</code>)
          kapod meg, amit egyszerűen beilleszthetsz. Jelenleg {domainList.length} /{" "}
          {MAX_SOURCE_DOMAINS} domain van felvéve.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : sites && sites.length > 0 ? (
        <ul className="panel rise-in divide-y divide-border overflow-hidden">
          {sites.map(site => (
            <li key={site.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{site.domain}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {site.category ? CATEGORY_LABELS[site.category] : "Minden kategóriához"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={site.active ? "default" : "secondary"} className="text-[11px]">
                  {site.active ? "Aktív" : "Kikapcsolva"}
                </Badge>
                <Switch
                  checked={site.active}
                  onCheckedChange={value => toggleActive.mutate({ id: site.id, active: value })}
                  aria-label={`${site.domain} aktiválása`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card text-destructive"
                  onClick={() => remove.mutate({ id: site.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Még nincs forrásoldal"
          description="A keresés csak az itt megadott oldalakon fut. Vedd fel azokat a platformokat és katalógusokat, ahol a célcsoportjaid megtalálhatók."
          steps={[
            "Illeszd be a platformok címét, soronként egyet.",
            "Válaszd ki, hogy melyik kategóriához tartozik, vagy hagyd minden kategórián.",
            "Ugyanezeket vedd fel a Google keresőmotor „Sites to search” listájába is.",
          ]}
        />
      )}
    </div>
  );
}
