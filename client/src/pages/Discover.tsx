import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS, PROSPECT_CATEGORY_ORDER } from "@shared/prospects";
import { ExternalLink, Loader2, Save, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Category = (typeof PROSPECT_CATEGORY_ORDER)[number];

type Row = {
  name: string;
  sourceUrl: string;
  email: string | null;
  category: Category;
  status: "found" | "no_email" | "opted_out" | "duplicate";
  note?: string;
};

const STATUS_LABEL: Record<Row["status"], string> = {
  found: "Kontakt megtalálva",
  no_email: "Nincs e-mail",
  opted_out: "Leiratkozott",
  duplicate: "Ismétlődő",
};

export default function Discover() {
  const [category, setCategory] = useState<Category>("accommodations");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("10");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const { data: config, isLoading: configLoading } = trpc.outreach.config.useQuery();
  const { data: sources } = trpc.outreach.listSourceSites.useQuery();

  const activeSources = (sources ?? []).filter(site => site.active);
  const relevantSources = activeSources.filter(
    site => site.category === null || site.category === category,
  );

  const discover = trpc.outreach.discover.useMutation({
    onSuccess: data => {
      setRows(data.results as Row[]);
      const usable = new Set(
        (data.results as Row[]).filter(row => row.status === "found").map(row => row.email ?? ""),
      );
      setSelected(usable);
      toast.success(`${data.searched} találat feldolgozva, ${usable.size} használható kontakt.`);
    },
    onError: error => toast.error(error.message),
  });

  const save = trpc.outreach.saveDiscovered.useMutation({
    onSuccess: data => {
      toast.success(`${data.inserted} kontakt mentve, ${data.skipped} kihagyva.`);
      setRows([]);
      setSelected(new Set());
      void utils.outreach.listProspects.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const usableRows = rows.filter(row => row.status === "found" && row.email);

  function toggle(email: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function handleSave() {
    const payload = usableRows
      .filter(row => row.email && selected.has(row.email))
      .map(row => ({
        name: row.name,
        sourceUrl: row.sourceUrl,
        email: row.email as string,
        category: row.category,
      }));

    if (payload.length === 0) {
      toast.error("Nincs kiválasztott kontakt a mentéshez.");
      return;
    }

    save.mutate({ rows: payload });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Keresés"
        title="Kontaktok felderítése"
        description="A keresés az általad megadott forrásoldalakon fut, majd a találatokat végigjárva kiolvassuk a vállalkozás nevét, a forrás címét és az e-mail címet."
      />

      {!configLoading && config && !config.searchConfigured ? (
        <SetupNotice title="A keresés beállítása szükséges">
          Add meg a Google API kulcsot és a keresőmotor azonosítóját, különben a keresés nem indítható.
        </SetupNotice>
      ) : null}

      {sources && relevantSources.length === 0 ? (
        <SetupNotice title="Ehhez a kategóriához nincs aktív forrásoldal">
          A Google 2026 januárja óta új keresőmotoroknál nem engedi a teljes webes keresést, ezért a
          rendszer csak a megadott oldalakon keres.{" "}
          <Link
            href="/forrasok"
            className="underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            Vegyél fel forrásoldalakat
          </Link>
          , majd térj vissza ide.
        </SetupNotice>
      ) : null}

      <section className="panel rise-in mb-6 p-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="category">Kategória</Label>
            <Select value={category} onValueChange={value => setCategory(value as Category)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROSPECT_CATEGORY_ORDER.map(item => (
                  <SelectItem key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query">Kulcsszó (opcionális)</Label>
            <Input
              id="query"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="pl. panzió, esküvői zenekar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Helyszín (opcionális)</Label>
            <Input
              id="location"
              value={location}
              onChange={event => setLocation(event.target.value)}
              placeholder="pl. Balaton, Budapest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Találatok száma</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger id="limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "10", "20"].map(value => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              discover.mutate({
                category,
                query: query.trim() || undefined,
                location: location.trim() || undefined,
                limit: Number(limit),
              })
            }
            disabled={discover.isPending || relevantSources.length === 0}
          >
            {discover.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Keresés indítása
          </Button>
          <p className="text-xs text-muted-foreground">
            {relevantSources.length} forrásoldalon keres, és minden találatnál felkeresi az oldalt,
            ezért több másodpercig tarthat.
          </p>
        </div>
      </section>

      {discover.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <section className="panel rise-in overflow-hidden">
          {discover.data?.domains && discover.data.domains.length > 0 ? (
            <div className="border-b border-border bg-secondary/40 px-6 py-4">
              <p className="eyebrow mb-2">Lekérdezett forrásoldalak</p>
              <ul className="flex flex-wrap gap-2">
                {discover.data.domains.map(domain => (
                  <li
                    key={domain}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {domain}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg">Találatok áttekintése</h2>
              <p className="text-sm text-muted-foreground">
                {usableRows.length} használható kontakt · {selected.size} kiválasztva
              </p>
            </div>
            <Button onClick={handleSave} disabled={save.isPending || selected.size === 0}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Kiválasztottak mentése
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {rows.map((row, index) => {
              const isUsable = row.status === "found" && row.email;
              return (
                <li key={`${row.sourceUrl}-${index}`} className="flex gap-4 px-6 py-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={isUsable ? selected.has(row.email as string) : false}
                      disabled={!isUsable}
                      onCheckedChange={() => isUsable && toggle(row.email as string)}
                      aria-label={`${row.name} kiválasztása`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{row.name}</p>
                      <Badge variant={isUsable ? "default" : "secondary"} className="text-[11px]">
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.email ?? "Nem található e-mail cím"}
                    </p>
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                    >
                      {row.sourceUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : !discover.isPending ? (
        <EmptyState
          title="Indíts egy felderítést"
          description="A keresés a Google találatait járja végig, majd a nyilvános oldalakról kiolvassa a vállalkozás nevét, a forrás címét és az e-mail címet. Csak ez a három adat kerül tárolásra."
          steps={[
            "Válaszd ki a kategóriát, és szűkíts kulcsszóval vagy helyszínnel.",
            "Nézd át a találatokat: a leiratkozott és ismétlődő címek külön jelölést kapnak.",
            "Mentsd el azokat, amelyeket valóban meg szeretnél keresni.",
          ]}
        />
      ) : null}
    </div>
  );
}
