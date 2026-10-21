"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Database, Plug, RefreshCw, Users } from "lucide-react";
import { Button, Card, CardBody, CardHeader, FormField, GradientText, PageHeader, Select, StatCard, Tag, Toggle } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { GST_STATES } from "@/server/providers/identity/states";

// S21 (first part, v4): data sources, the MCA search copy, and per-organisation sample data mode and KYC.

interface Overview {
  providers: { service: string; providers: string[]; missingKeys: string[] }[];
  sampleEnv: boolean;
  mca: { companies: number; states: string[]; keySet: boolean; imports: { scope: string; status: string; rowsDone: number; rowsTotal: number | null; datasetDate: string | null; error: string | null; startedAt: string }[] };
  databaseBytes: number;
  orgs: { id: string; name: string; createdAt: string; sample: boolean; kyc: string; walletPaise: number; members: number }[];
}

const STATES = Object.values(GST_STATES).sort((a, b) => a.localeCompare(b, "en-IN"));
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(0)}\u00a0MB`;

export function OpsConsole({ data }: { data: Overview }) {
  const t = useTranslations("ops");
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState("Karnataka");
  const [busy, setBusy] = useState<string | null>(null);

  async function importState() {
    setBusy("mca");
    const res = await api<{ importId: number }>("/api/v1/ops/mca-import", { body: { state } });
    setBusy(null);
    toast(res.ok ? t("importStarted", { state }) : res.error.message, res.ok ? "success" : "danger");
    router.refresh();
  }

  async function sample(orgId: string, on: boolean) {
    setBusy(orgId);
    const res = await api(`/api/v1/ops/orgs/${orgId}/sample`, { body: { on } });
    setBusy(null);
    if (!res.ok) return toast(res.error.message, "danger");
    router.refresh();
  }

  const live = data.providers.filter((p) => p.providers.some((n) => n !== "mock"));
  const th = "px-4 py-2.5 font-medium";
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={<>{t("titleLead")} <GradientText>{t("titleAccent")}</GradientText></>}
        description={t("subtitle")}
        actions={data.sampleEnv ? <Tag tone="warning">{t("sampleEnvOn")}</Tag> : null}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("statLive")} value={`${live.length}/${data.providers.length}`} hint={t("statLiveHint")} icon={<Plug />} />
        <StatCard label={t("statCompanies")} value={data.mca.companies.toLocaleString("en-IN")} hint={t("statStates", { count: data.mca.states.length })} icon={<Building2 />} />
        <StatCard label={t("statOrgs")} value={data.orgs.length} hint={t("statSample", { count: data.orgs.filter((o) => o.sample).length })} icon={<Users />} />
        <StatCard label={t("statDb")} value={mb(data.databaseBytes)} hint={t("statDbHint")} icon={<Database />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t("sources")} action={<span className="text-xs text-muted">{t("liveCount", { count: live.length, total: data.providers.length })}</span>} />
          <ul className="grid gap-px bg-border sm:grid-cols-2">
            {data.providers.map((p) => {
              const isLive = p.providers.some((n) => n !== "mock");
              const tone = !isLive ? "neutral" : p.missingKeys.length ? "danger" : "success";
              return (
                <li key={p.service} className="flex min-h-11 items-center justify-between gap-2 bg-surface px-4 py-2" title={p.missingKeys.length ? p.missingKeys.join(", ") : undefined}>
                  <span className="min-w-0 truncate font-mono text-xs text-text-2">{p.service}</span>
                  <Tag tone={tone} className="max-w-[55%] shrink-0 truncate">{isLive ? p.providers.join(", ") : t("sample")}</Tag>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title={t("mcaTitle")} />
          <CardBody className="space-y-3 text-sm">
            <p className="text-text-2">{t("mcaSummary", { count: data.mca.companies.toLocaleString("en-IN"), states: data.mca.states.join(", ") || "—", size: mb(data.databaseBytes) })}</p>
            {!data.mca.keySet ? <p className="rounded-xl bg-danger-bg px-3 py-2 text-[13px] font-semibold text-danger-fg">{t("noKey")}</p> : null}
            <div className="flex flex-wrap items-end gap-2">
              <FormField id="ops-state" label={t("state")} className="min-w-0 flex-1 basis-48">
                <Select id="ops-state" value={state} onChange={(e) => setState(e.target.value)}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <Button icon={<RefreshCw />} loading={busy === "mca"} disabled={!data.mca.keySet} onClick={() => void importState()}>{t("import")}</Button>
            </div>
            <p className="text-xs text-muted">{t("mcaNote")}</p>
          </CardBody>
          {data.mca.imports.length ? (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
                  <tr><th className={th}>{t("colScope")}</th><th className={th}>{t("colStatus")}</th><th className={cn(th, "text-right")}>{t("colRows")}</th><th className={th}>{t("colData")}</th><th className={th}>{t("colStarted")}</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.mca.imports.map((i) => (
                    <tr key={`${i.scope}-${i.startedAt}`} className="transition-colors hover:bg-hover">
                      <td className="px-4 py-2.5 font-medium text-text">{i.scope.replace(/^state=/, "")}</td>
                      <td className="px-4 py-2.5"><Tag tone={i.status === "done" ? "success" : i.status === "failed" ? "danger" : "info"}>{t(`importStatus.${i.status}`)}</Tag>{i.error && i.status !== "done" ? <span className="ml-2 text-xs text-danger-fg">{i.error}</span> : null}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{i.rowsDone.toLocaleString("en-IN")}{i.rowsTotal ? ` / ${i.rowsTotal.toLocaleString("en-IN")}` : ""}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{i.datasetDate ? formatDate(i.datasetDate) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{formatDateTimeIst(new Date(i.startedAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("orgsTitle")} action={<span className="text-xs text-muted tabular-nums">{data.orgs.length}</span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
              <tr><th className={th}>{t("colOrg")}</th><th className={cn(th, "text-right")}>{t("colUsers")}</th><th className={cn(th, "text-right")}>{t("colWallet")}</th><th className={th}>{t("colKyc")}</th><th className={th}>{t("colSample")}</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.orgs.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-hover">
                  <td className="px-4 py-2.5"><span className="font-semibold text-text">{o.name}</span><span className="block text-xs text-muted">{formatDate(o.createdAt.slice(0, 10))}</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{o.members}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(BigInt(o.walletPaise), { withPaise: true })}</td>
                  <td className="px-4 py-2.5"><Tag tone={o.kyc === "verified" ? "success" : o.kyc === "failed" ? "danger" : "neutral"}>{t(`kyc.${o.kyc}`)}</Tag></td>
                  <td className="px-4 py-1">
                    <Toggle
                      id={`sample-${o.id}`}
                      checked={o.sample}
                      disabled={busy === o.id}
                      onChange={(e) => void sample(o.id, e.target.checked)}
                      className="min-h-11 text-xs font-semibold"
                      label={o.sample ? t("sampleOn") : t("sampleOff")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
