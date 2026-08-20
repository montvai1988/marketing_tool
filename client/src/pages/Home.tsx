import { PageHeader } from "@/components/PageHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS, PROSPECT_CATEGORY_ORDER } from "@shared/prospects";
import { CheckCircle2, Search, ShieldOff, Users, XCircle } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = trpc.outreach.stats.useQuery();
  const { data: config } = trpc.outreach.config.useQuery();
  const { data: campaigns } = trpc.outreach.listCampaigns.useQuery();

  const maxCategory = Math.max(1, ...(stats?.byCategory.map(row => row.count) ?? [1]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Áttekintés"
        title="Üzletszerzési műhelyfal"
        description="Kövesd nyomon a gyűjtött kontaktokat, a kiküldött megkereséseket és a leiratkozásokat."
        actions={
          <>
            <Button asChild variant="outline" className="bg-card">
              <Link href="/kontaktok">Kontaktok</Link>
            </Button>
            <Button asChild>
              <Link href="/kereses">
                <Search className="mr-2 h-4 w-4" />
                Új keresés
              </Link>
            </Button>
          </>
        }
      />

      {config && !config.searchConfigured ? (
        <SetupNotice title="A Google keresés még nincs beállítva">
          A kereséshez Google API kulcs és keresőmotor-azonosító szükséges. Amíg ezek nincsenek
          megadva, a keresés hibával tér vissza.
        </SetupNotice>
      ) : null}

      {config && !config.mailerConfigured ? (
        <SetupNotice title="A kiküldés még nincs beállítva">
          A levélküldéshez Resend API kulcs és hitelesített feladó cím szükséges. A kontaktgyűjtés és a
          vázlatírás ettől függetlenül működik.
        </SetupNotice>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(index => (
            <Skeleton key={index} className="h-[132px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Összes kontakt"
            value={stats?.totalProspects ?? 0}
            hint={`${stats?.activeProspects ?? 0} megkereshető`}
            icon={Users}
          />
          <StatCard
            label="Elküldött levél"
            value={stats?.sentMessages ?? 0}
            hint="Sikeresen átvett üzenetek"
            icon={CheckCircle2}
            delay={40}
          />
          <StatCard
            label="Hibás küldés"
            value={stats?.failedMessages ?? 0}
            hint="Újrapróbálható tételek"
            icon={XCircle}
            delay={80}
          />
          <StatCard
            label="Leiratkozás"
            value={stats?.optOuts ?? 0}
            hint="Automatikusan kizárva"
            icon={ShieldOff}
            delay={120}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel rise-in p-6">
          <h2 className="mb-1 text-xl">Kontaktok kategória szerint</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            A négy támogatott célcsoport megoszlása az adatbázisban.
          </p>
          <ul className="space-y-4">
            {PROSPECT_CATEGORY_ORDER.map(category => {
              const count = stats?.byCategory.find(row => row.category === category)?.count ?? 0;
              return (
                <li key={category}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium">{CATEGORY_LABELS[category]}</span>
                    <span className="font-display text-sm tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${Math.round((count / maxCategory) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel rise-in p-6">
          <h2 className="mb-1 text-xl">Legutóbbi kampányok</h2>
          <p className="mb-6 text-sm text-muted-foreground">A kiküldések összesített eredménye.</p>
          {campaigns && campaigns.length > 0 ? (
            <ul className="space-y-4">
              {campaigns.slice(0, 5).map(campaign => (
                <li key={campaign.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="truncate text-sm font-medium">{campaign.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {campaign.sentCount} elküldve · {campaign.failedCount} hibás ·{" "}
                    {campaign.skippedCount} kihagyva
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Kampánynapló</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">00</span>
              </div>
              <div className="space-y-4" aria-hidden="true">
                {[0, 1, 2].map(row => (
                  <div key={row} className="space-y-2 border-b border-border/70 pb-3 last:border-0">
                    <div className="h-2 w-1/2 rounded-full bg-border" />
                    <div className="h-2 w-2/3 rounded-full bg-border/60" />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Még nincs kiküldött kampány. Az első indítás után itt látod az eredményeket.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
