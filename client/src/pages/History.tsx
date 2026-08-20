import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CAMPAIGN_STATUS_LABELS, MESSAGE_STATUS_LABELS } from "@shared/prospects";
import { useState } from "react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  queued: "secondary",
  skipped: "outline",
  failed: "destructive",
};

export default function History() {
  const [campaignId, setCampaignId] = useState<number | undefined>();
  const { data: campaigns } = trpc.outreach.listCampaigns.useQuery();
  const { data: messages, isLoading } = trpc.outreach.listMessages.useQuery({ campaignId });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Előzmények"
        title="Kiküldési napló"
        description="Minden megkeresés rögzítve van: kinek, mikor és milyen eredménnyel ment ki a levél."
      />

      {messages && messages.length === 0 && (campaigns ?? []).length === 0 && !isLoading ? (
        <EmptyState
          title="Még nincs rögzített kiküldés"
          description="Amint elindítod az első kampányt, itt jelenik meg minden üzenet: címzett, tárgy, időpont és állapot."
          steps={[
            "Állítsd össze a levelet a Kampányok lapon.",
            "Válaszd ki a címzetteket, és indítsd a kiküldést.",
            "A napló minden tételt megőriz, a hibás küldéseket is.",
          ]}
        />
      ) : (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="panel rise-in overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg">Kampányok</h2>
          </div>
          <ul className="divide-y divide-border">
            <li>
              <button
                onClick={() => setCampaignId(undefined)}
                className={`w-full px-5 py-3 text-left text-sm transition-colors hover:bg-accent ${
                  campaignId === undefined ? "bg-accent font-medium" : ""
                }`}
              >
                Összes üzenet
              </button>
            </li>
            {(campaigns ?? []).map(campaign => (
              <li key={campaign.id}>
                <button
                  onClick={() => setCampaignId(campaign.id)}
                  className={`w-full px-5 py-3 text-left transition-colors hover:bg-accent ${
                    campaignId === campaign.id ? "bg-accent" : ""
                  }`}
                >
                  <span className="block truncate text-sm font-medium">{campaign.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleString("hu-HU")} ·{" "}
                    {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel rise-in overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg">Üzenetek</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2].map(index => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <ul className="divide-y divide-border">
              {messages.map(message => (
                <li key={message.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{message.recipientName}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {message.recipientEmail}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{message.subject}</p>
                      {message.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">{message.errorMessage}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={STATUS_VARIANT[message.status] ?? "secondary"} className="text-[11px]">
                        {MESSAGE_STATUS_LABELS[message.status] ?? message.status}
                      </Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(message.sentAt ?? message.createdAt).toLocaleString("hu-HU")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">
              Ebben a kampányban nincs rögzített üzenet.
            </p>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
