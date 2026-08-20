import { PageHeader } from "@/components/PageHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS, PROSPECT_CATEGORY_ORDER } from "@shared/prospects";
import { Eye, Loader2, Save, Send, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Category = (typeof PROSPECT_CATEGORY_ORDER)[number];

export default function Campaigns() {
  const utils = trpc.useUtils();

  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<number | undefined>();
  const [serviceSummary, setServiceSummary] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewId, setPreviewId] = useState<number | undefined>();

  const prospectQuery = useMemo(
    () => ({ category: category === "all" ? undefined : category, includeOptedOut: false }),
    [category],
  );

  const { data: config } = trpc.outreach.config.useQuery();
  const { data: prospects } = trpc.outreach.listProspects.useQuery(prospectQuery);
  const { data: templates } = trpc.outreach.listTemplates.useQuery();

  const saveTemplate = trpc.outreach.saveTemplate.useMutation({
    onSuccess: () => {
      toast.success("A sablon mentve.");
      void utils.outreach.listTemplates.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const deleteTemplate = trpc.outreach.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("A sablon törölve.");
      void utils.outreach.listTemplates.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const generateDraft = trpc.outreach.generateDraft.useMutation({
    onSuccess: draft => {
      setSubject(draft.subject);
      setBody(draft.body);
      toast.success("A személyre szabott vázlat elkészült.");
    },
    onError: error => toast.error(error.message),
  });

  const sendCampaign = trpc.outreach.sendCampaign.useMutation({
    onSuccess: result => {
      toast.success(
        `Kampány lezárva: ${result.sent} elküldve, ${result.failed} hibás, ${result.skipped} kihagyva.`,
      );
      setSelected(new Set());
      void utils.outreach.listCampaigns.invalidate();
      void utils.outreach.listMessages.invalidate();
      void utils.outreach.stats.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const selectedProspects = (prospects ?? []).filter(item => selected.has(item.id));
  const activePreviewId =
    previewId && selected.has(previewId) ? previewId : selectedProspects[0]?.id;
  const previewProspect = selectedProspects.find(item => item.id === activePreviewId);
  const draftTargetId = activePreviewId;
  const previewIndex = selectedProspects.findIndex(item => item.id === activePreviewId);
  const previewSubject = subject.replaceAll("{{nev}}", previewProspect?.name ?? "{{nev}}");
  const previewBody = body.replaceAll("{{nev}}", previewProspect?.name ?? "{{nev}}");
  const canSend =
    campaignName.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    signature.trim().length > 0 &&
    selected.size > 0;

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Kampányok"
        title="Megkeresés összeállítása"
        description="Állítsd össze a levelet, ellenőrizd a címzetteket, majd indítsd a kiküldést. A leiratkozott címeket a rendszer automatikusan kihagyja."
      />

      {config && !config.mailerConfigured ? (
        <SetupNotice title="A kiküldés még nincs beállítva">
          A levélküldéshez Resend API kulcs és hitelesített feladó cím szükséges. A vázlatok addig is
          elkészíthetők és elmenthetők.
        </SetupNotice>
      ) : null}

      {config && !config.unsubscribeConfigured ? (
        <SetupNotice title="A leiratkozó link még nincs beállítva">
          Kiküldés előtt add meg az alkalmazás végleges címét az <code>APP_BASE_URL</code> környezeti
          változóban. A rendszer enélkül nem enged kampányt indítani.
        </SetupNotice>
      ) : null}

      <Tabs defaultValue="compose">
        <TabsList className="mb-6">
          <TabsTrigger value="compose">Levél</TabsTrigger>
          <TabsTrigger value="recipients">Címzettek ({selected.size})</TabsTrigger>
          <TabsTrigger value="preview">Előnézet</TabsTrigger>
          <TabsTrigger value="templates">Sablonok</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="panel rise-in space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Kampány neve</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={event => setCampaignName(event.target.value)}
                  placeholder="pl. Balatoni szállásadók, augusztus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Tárgy</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  placeholder="Weboldal-fejlesztés {{nev}} számára"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Levél törzse</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  rows={12}
                  placeholder="Kedves {{nev}}! ..."
                />
                <p className="text-xs text-muted-foreground">
                  Használható helyőrző: <code>{"{{nev}}"}</code> a vállalkozás neve.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">Aláírás</Label>
                <Textarea
                  id="signature"
                  value={signature}
                  onChange={event => setSignature(event.target.value)}
                  rows={4}
                  placeholder={"Üdvözlettel,\nNév\nCég · Székhely · Telefon"}
                />
                <p className="text-xs text-muted-foreground">
                  Az azonosításhoz és a leiratkozási lehetőséghez az aláírásban tüntesd fel a neved és a
                  postai elérhetőséged. A leiratkozó linket a rendszer automatikusan hozzáfűzi.
                </p>
              </div>
            </section>

            <div className="space-y-6">
              <section className="panel rise-in p-6">
                <h2 className="mb-1 text-lg">Vázlat generálása</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  A kijelölt első címzett neve és kategóriája alapján készül személyre szabott szöveg.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="service">A te szolgáltatásod</Label>
                  <Textarea
                    id="service"
                    value={serviceSummary}
                    onChange={event => setServiceSummary(event.target.value)}
                    rows={3}
                    placeholder="pl. modern, mobilra optimalizált weboldalak készítése kis vállalkozásoknak"
                  />
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() =>
                    draftTargetId &&
                    generateDraft.mutate({ prospectId: draftTargetId, serviceSummary })
                  }
                  disabled={
                    generateDraft.isPending || !draftTargetId || serviceSummary.trim().length < 3
                  }
                >
                  {generateDraft.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Vázlat készítése
                </Button>
                {!draftTargetId ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Válassz ki legalább egy címzettet a Címzettek fülön.
                  </p>
                ) : null}
              </section>

              <section className="panel rise-in p-6">
                <h2 className="mb-1 text-lg">Kiküldés</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {selected.size} címzett · feladó: {config?.fromEmail ?? "nincs beállítva"}
                </p>
                <Button
                  className="w-full"
                  onClick={() =>
                    sendCampaign.mutate({
                      name: campaignName.trim(),
                      subject: subject.trim(),
                      body,
                      signature,
                      templateId: editingTemplateId,
                      prospectIds: Array.from(selected),
                    })
                  }
                  disabled={!canSend || sendCampaign.isPending}
                >
                  {sendCampaign.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Kampány indítása
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Egy kampányban legfeljebb {config?.maxRecipients ?? 200} címzett szerepelhet.
                </p>
              </section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recipients">
          <section className="panel rise-in overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
              <Select value={category} onValueChange={value => setCategory(value as Category | "all")}>
                <SelectTrigger className="w-56">
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
              <Button
                variant="outline"
                className="bg-card"
                onClick={() => setSelected(new Set((prospects ?? []).map(item => item.id)))}
                disabled={!prospects || prospects.length === 0}
              >
                Összes kijelölése
              </Button>
              <Button variant="outline" className="bg-card" onClick={() => setSelected(new Set())}>
                Kijelölés törlése
              </Button>
            </div>

            {prospects && prospects.length > 0 ? (
              <ul className="divide-y divide-border">
                {prospects.map(prospect => (
                  <li key={prospect.id} className="flex items-center gap-4 px-6 py-3">
                    <Checkbox
                      checked={selected.has(prospect.id)}
                      onCheckedChange={() => toggle(prospect.id)}
                      aria-label={`${prospect.name} kijelölése`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{prospect.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{prospect.email}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {CATEGORY_LABELS[prospect.category]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                Ebben a kategóriában még nincs megkereshető kontakt.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="preview">
          <section className="panel rise-in overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg">Levél előnézete</h2>
                <p className="text-sm text-muted-foreground">
                  {previewProspect
                    ? `${previewIndex + 1}. / ${selectedProspects.length} címzett · ${previewProspect.email}`
                    : "Válassz címzettet a személyre szabott előnézethez."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {selectedProspects.length > 0 ? (
                  <Select
                    value={String(activePreviewId ?? "")}
                    onValueChange={value => setPreviewId(Number(value))}
                  >
                    <SelectTrigger className="w-[240px]" aria-label="Előnézeti címzett">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProspects.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>

            {body.trim().length > 0 ? (
              <div className="bg-secondary/40 p-6 md:p-10">
                <article className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 shadow-sm">
                  <p className="eyebrow mb-2">Tárgy</p>
                  <p className="mb-6 font-display text-lg leading-snug">
                    {previewSubject || "(nincs tárgy megadva)"}
                  </p>
                  <div className="space-y-4 text-[15px] leading-relaxed">
                    {previewBody.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {signature.trim().length > 0 ? (
                    <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed">{signature}</p>
                  ) : null}
                  <hr className="my-6 border-border" />
                  <p className="text-xs text-muted-foreground">
                    Ha nem szeretne több levelet,{" "}
                    <span className="underline decoration-dotted underline-offset-4">
                      itt leiratkozhat
                    </span>
                    . Ezt a láblécet a rendszer minden levélhez automatikusan hozzáfűzi.
                  </p>
                </article>
              </div>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                Írd meg a levél törzsét a Levél fülön, és itt megjelenik a végleges változat.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="panel rise-in space-y-4 p-6">
              <h2 className="text-lg">Sablon mentése</h2>
              <div className="space-y-2">
                <Label htmlFor="template-name">Sablon neve</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={event => setTemplateName(event.target.value)}
                  placeholder="pl. Szállásadó megkeresés"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                A mentés a Levél fülön szereplő tárgyat és szöveget rögzíti.
              </p>
              <Button
                onClick={() =>
                  saveTemplate.mutate({
                    id: editingTemplateId,
                    name: templateName.trim(),
                    subject: subject.trim(),
                    body,
                  })
                }
                disabled={
                  saveTemplate.isPending ||
                  templateName.trim().length === 0 ||
                  subject.trim().length === 0 ||
                  body.trim().length === 0
                }
              >
                {saveTemplate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingTemplateId ? "Sablon frissítése" : "Új sablon mentése"}
              </Button>
              {editingTemplateId ? (
                <Button
                  variant="outline"
                  className="w-full bg-card"
                  onClick={() => {
                    setEditingTemplateId(undefined);
                    setTemplateName("");
                  }}
                >
                  Új sablonként mentés
                </Button>
              ) : null}
            </section>

            <section className="panel rise-in overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg">Mentett sablonok</h2>
              </div>
              {templates && templates.length > 0 ? (
                <ul className="divide-y divide-border">
                  {templates.map(template => (
                    <li key={template.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{template.name}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {template.subject}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-card"
                            onClick={() => {
                              setEditingTemplateId(template.id);
                              setTemplateName(template.name);
                              setSubject(template.subject);
                              setBody(template.body);
                              toast.success("A sablon betöltve a szerkesztőbe.");
                            }}
                          >
                            Betöltés
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-card text-destructive"
                            onClick={() => deleteTemplate.mutate({ id: template.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Még nincs mentett sablon.
                </p>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
