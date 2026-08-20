import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CATEGORY_LABELS, PROSPECT_CATEGORY_ORDER, parseTags } from "@shared/prospects";
import { ExternalLink, Loader2, Search, ShieldOff, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Category = (typeof PROSPECT_CATEGORY_ORDER)[number];

export default function Prospects() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [includeOptedOut, setIncludeOptedOut] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tagTarget, setTagTarget] = useState<{ id: number; tags: string } | null>(null);

  const utils = trpc.useUtils();
  const queryInput = useMemo(
    () => ({
      category: category === "all" ? undefined : category,
      search: search.trim() || undefined,
      tag: tagFilter.trim() || undefined,
      includeOptedOut,
    }),
    [category, search, tagFilter, includeOptedOut],
  );

  const { data: prospects, isLoading } = trpc.outreach.listProspects.useQuery(queryInput);

  const setTags = trpc.outreach.setTags.useMutation({
    onSuccess: () => {
      toast.success("A címkék frissítve.");
      setTagTarget(null);
      void utils.outreach.listProspects.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const removeProspects = trpc.outreach.deleteProspects.useMutation({
    onSuccess: () => {
      toast.success("A kijelölt kontaktok törölve.");
      setSelected(new Set());
      void utils.outreach.listProspects.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const optOut = trpc.outreach.addOptOut.useMutation({
    onSuccess: () => {
      toast.success("A cím felvéve a leiratkozási listára.");
      void utils.outreach.listProspects.invalidate();
      void utils.outreach.listOptOuts.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = Boolean(prospects?.length) && selected.size === prospects?.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Kontaktok"
        title="Kapcsolati lista"
        description="Szűrd, címkézd és tartsd rendben a gyűjtött kontaktokat. Minden sor mellett ott van a forrás, ahonnan az adat származik."
        actions={
          selected.size > 0 ? (
            <Button
              variant="destructive"
              onClick={() => removeProspects.mutate({ ids: Array.from(selected) })}
              disabled={removeProspects.isPending}
            >
              {removeProspects.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {selected.size} törlése
            </Button>
          ) : undefined
        }
      />

      <section className="panel rise-in mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-category">Kategória</Label>
            <Select value={category} onValueChange={value => setCategory(value as Category | "all")}>
              <SelectTrigger id="filter-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes kategória</SelectItem>
                {PROSPECT_CATEGORY_ORDER.map(item => (
                  <SelectItem key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-search">Keresés</Label>
            <Input
              id="filter-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Név vagy e-mail"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-tag">Címke</Label>
            <Input
              id="filter-tag"
              value={tagFilter}
              onChange={event => setTagFilter(event.target.value)}
              placeholder="pl. prémium"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeOptedOut}
                onCheckedChange={value => setIncludeOptedOut(Boolean(value))}
              />
              Leiratkozottak megjelenítése
            </label>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(index => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : prospects && prospects.length > 0 ? (
        <section className="panel rise-in overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-6 py-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={value =>
                setSelected(value ? new Set(prospects.map(item => item.id)) : new Set())
              }
              aria-label="Összes kijelölése"
            />
            <span className="text-sm text-muted-foreground">
              {prospects.length} kontakt · {selected.size} kijelölve
            </span>
          </div>
          <ul className="divide-y divide-border">
            {prospects.map(prospect => (
              <li key={prospect.id} className="flex gap-4 px-6 py-4">
                <div className="pt-1">
                  <Checkbox
                    checked={selected.has(prospect.id)}
                    onCheckedChange={() => toggle(prospect.id)}
                    aria-label={`${prospect.name} kijelölése`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{prospect.name}</p>
                    <Badge variant="secondary" className="text-[11px]">
                      {CATEGORY_LABELS[prospect.category]}
                    </Badge>
                    {prospect.optedOut ? (
                      <Badge variant="destructive" className="text-[11px]">
                        Leiratkozott
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{prospect.email}</p>
                  <a
                    href={prospect.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                  >
                    <span className="truncate">{prospect.sourceUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  {parseTags(prospect.tags).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parseTags(prospect.tags).map(tag => (
                        <Badge key={tag} variant="outline" className="bg-secondary text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    onClick={() => setTagTarget({ id: prospect.id, tags: prospect.tags })}
                  >
                    <Tag className="mr-1.5 h-3.5 w-3.5" />
                    Címkék
                  </Button>
                  {!prospect.optedOut ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card"
                      onClick={() => optOut.mutate({ email: prospect.email, reason: "manual" })}
                    >
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                      Kizárás
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          title="A napló még üres"
          description="Itt gyűlnek majd a felderített kontaktok, mindegyik mellett a forrással, ahonnan az adat származik."
          steps={[
            "Válassz kategóriát és indíts keresést a Keresés lapon.",
            "Nézd át a találatokat, és mentsd el a használható kontaktokat.",
            "Címkézd őket, majd állítsd össze az első megkeresést.",
          ]}
          action={
            <Button asChild>
              <Link href="/kereses">
                <Search className="mr-2 h-4 w-4" />
                Keresés indítása
              </Link>
            </Button>
          }
        />
      )}

      <Dialog open={tagTarget !== null} onOpenChange={open => !open && setTagTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Címkék szerkesztése</DialogTitle>
            <DialogDescription>
              Vesszővel válaszd el a címkéket, például: prémium, Balaton, nyári szezon.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tagTarget?.tags ?? ""}
            onChange={event =>
              setTagTarget(current => (current ? { ...current, tags: event.target.value } : current))
            }
            placeholder="prémium, Balaton"
          />
          <DialogFooter>
            <Button variant="outline" className="bg-card" onClick={() => setTagTarget(null)}>
              Mégsem
            </Button>
            <Button
              onClick={() =>
                tagTarget &&
                setTags.mutate({ id: tagTarget.id, tags: parseTags(tagTarget.tags) })
              }
              disabled={setTags.isPending}
            >
              {setTags.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
