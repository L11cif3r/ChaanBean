"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArrowLeft, ArrowRight, CalendarCheck, FilePlus2, FileText, IndianRupee, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, EmptyState, FormField, Input, Select, Tag, Textarea } from "@/components/ui";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import { initials } from "./counterparty-list";
import { RiskTag } from "./risk-tag";
import { GST_STATES } from "@/server/providers/identity/states";
import { UpiBadge } from "./upi-badge";
import type { ActivityItem, CounterpartyProfile as Profile } from "@/server/counterparties/service";

// PRD S07: one place for everything known about a counterparty (FR-CP-06): a header card with the key facts as
// small tiles, then tabs for the overview, reports, cases, agreements, documents and activity.

const STATE_NAMES = Object.values(GST_STATES).sort((a, b) => a.localeCompare(b, "en-IN"));

type ReportRow = Awaited<ReturnType<typeof import("@/server/checks/service").reportsFor>>[number];
type CasesTab = Awaited<ReturnType<typeof import("@/server/cases/service").caseChecksFor>>;
type DealRow = Awaited<ReturnType<typeof import("@/server/transactions/service").listTransactions>>[number];

/** Tab label with its count in a small chip; the brackets are read out ("Reports (2)"), not shown. */
function tabLabel(label: string, count: number) {
  return (
    <>
      {label}{" "}
      <span className="relative ml-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-subtle">
        <span className="sr-only">{`(${count})`}</span>
        <span aria-hidden="true">{count}</span>
      </span>
    </>
  );
}

export function CounterpartyProfile({
  profile, activity, reports, cases, deals, canManage, canRun,
}: { profile: Profile; activity: ActivityItem[]; reports: ReportRow[]; cases: CasesTab; deals: DealRow[]; canManage: boolean; canRun: boolean }) {
  const t = useTranslations("counterparties");
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(profile.notes ?? "");
  const archived = profile.status === "archived";
  const editable = canManage && !archived;

  async function post(path: string, body: unknown, done: string, key: string) {
    setBusy(key);
    const res = await api(path, { body });
    setBusy(null);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(done, "success");
    router.refresh();
  }

  async function saveNotes() {
    setBusy("notes");
    const res = await api(`/api/v1/counterparties/${profile.id}`, { method: "PATCH", body: { notes } });
    setBusy(null);
    if (!res.ok) return toast(res.error.fields?.notes ?? res.error.message, "danger");
    toast(t("updated"), "success");
    router.refresh();
  }

  const identifier = profile.gstin ?? profile.pan ?? "";
  const latest = reports[0] ?? null;
  const withRange = reports.find((r) => r.creditHighPaise !== null) ?? null;
  const overview = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="min-w-0 space-y-4 lg:col-span-2">
        {latest ? (
          <ReportList reports={reports.slice(0, 3)} />
        ) : (
          <Card>
            <EmptyState
              title={t("noChecksTitle")}
              body={t("noChecksBodyShort")}
              action={editable && canRun ? <ButtonLink href={`/checks/new?counterparty=${profile.id}`}><ShieldCheck aria-hidden="true" /> {t("runChecks")}</ButtonLink> : null}
            />
          </Card>
        )}
        <Card>
          <CardHeader title={t("exposureTitle")} />
          <CardBody>
            <p className="text-sm text-muted">{t("exposureBody", { outstanding: formatInr(0n) })}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("notes")} />
          <CardBody className="space-y-3">
            <FormField id="notes" label={<span className="sr-only">{t("notes")}</span>} hint={t("notesHint")}>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} disabled={!editable} hint={t("notesHint")} />
            </FormField>
            {editable ? (
              <Button size="sm" variant="secondary" onClick={() => void saveNotes()} loading={busy === "notes"} disabled={notes === (profile.notes ?? "")}>
                {t("saveNotes")}
              </Button>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader title={t("contactTitle")} action={editable ? <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>{t("edit")}</Button> : null} />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label={t("contactName")} value={profile.contactName ?? t("notSet")} />
              <Row label={t("mobile")} value={<span className="tabular-nums">{profile.mobile ?? t("notSet")}</span>} />
              <Row label={t("whatsapp")} value={<span className="tabular-nums">{profile.whatsapp ?? profile.mobile ?? t("notSet")}</span>} />
              <Row label={t("email")} value={<span className="break-all">{profile.email ?? t("notSet")}</span>} />
              <Row label={t("addressLine")} value={`${profile.address.line}, ${profile.address.city}, ${profile.address.state} ${profile.address.pincode}`} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("sectionUpi")} action={<UpiBadge status={profile.upi.status} />} />
          <CardBody className="space-y-3 text-sm">
            {profile.upi.status === "linked" ? <p className="text-text-2">{t("upiLinked", { name: profile.upi.name ?? "" })}</p> : null}
            {profile.upi.status === "not_linked" ? <p className="font-semibold text-danger-fg">{t("upiNotLinked")}</p> : null}
            {profile.upi.status === "unavailable" ? <p className="font-semibold text-warning-fg">{t("upiUnavailable")}</p> : null}
            {profile.upi.status === "manual_confirmed" ? <p className="text-text-2">{t("upiManual")}</p> : null}
            {profile.upi.checkedAt ? <p className="text-xs text-muted">{formatDateTimeIst(new Date(profile.upi.checkedAt))}</p> : null}
            {editable && profile.mobile ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" loading={busy === "upi"} onClick={() => void post(`/api/v1/counterparties/${profile.id}/upi`, { action: "recheck" }, t("upiChecked"), "upi")}>
                  {profile.upi.status === "not_checked" ? t("upiCheck") : t("upiRecheck")}
                </Button>
                {profile.upi.status !== "linked" && profile.upi.status !== "manual_confirmed" ? (
                  <Button size="sm" variant="ghost" loading={busy === "manual"} onClick={() => void post(`/api/v1/counterparties/${profile.id}/upi`, { action: "confirm" }, t("upiConfirmed"), "manual")}>
                    {t("upiConfirm")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {profile.upi.status !== "linked" && profile.upi.status !== "manual_confirmed" ? (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-semibold text-text-2 hover:text-text">{t("upiManualSummary")}</summary>
                <p className="mt-1">{t("upiManualHelp")}</p>
              </details>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("identityTitle")} />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label={t("sectionType")} value={t(`types.${profile.type}`)} />
              {profile.gstin ? <Row label={t("gstin")} value={<span className="font-mono">{profile.gstin}</span>} /> : null}
              {profile.pan ? <Row label={t("pan")} value={<span className="font-mono">{profile.pan}</span>} /> : null}
              {profile.cin ? <Row label={t("cin")} value={<span className="break-all font-mono">{profile.cin}</span>} /> : null}
              {profile.udyam ? <Row label={t("udyam")} value={<span className="font-mono">{profile.udyam}</span>} /> : null}
              {profile.iec ? <Row label={t("iec")} value={<span className="font-mono">{profile.iec}</span>} /> : null}
              {profile.tradeName ? <Row label={t("tradeName")} value={profile.tradeName} /> : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("defaultsTitle")} />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label={t("creditDays")} value={profile.creditDays === null ? t("notSet") : t("days", { count: profile.creditDays })} />
              <Row label={t("interestRate")} value={profile.interestRate === null ? t("notSet") : t("perYear", { rate: profile.interestRate })} />
              <Row
                label={t("tags")}
                value={profile.tags.length ? <span className="flex flex-wrap justify-end gap-1">{profile.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</span> : t("noTags")}
              />
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );

  const empty = (body: string) => (
    <Card>
      <EmptyState title={body} />
    </Card>
  );

  const range = withRange ? `${formatInrShort(BigInt(withRange.creditLowPaise ?? 0))} – ${formatInrShort(BigInt(withRange.creditHighPaise!))}` : null;

  return (
    <div className="space-y-5">
      <Link href="/counterparties" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={14} aria-hidden="true" /> {t("backToList")}
      </Link>

      {archived ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-neutral-bg px-4 py-3 text-sm font-semibold text-neutral-fg">
          <span className="inline-flex items-center gap-2">
            <Archive size={15} aria-hidden="true" /> {t("archivedBanner")}
          </span>
          {canManage ? (
            <Button size="sm" variant="secondary" loading={busy === "restore"} onClick={() => void post(`/api/v1/counterparties/${profile.id}/restore`, {}, t("restored"), "restore")}>
              {t("restore")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <span className="absolute inset-x-0 top-0 h-28 bg-soft" />
          <span className="absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.18),transparent_65%)] blur-2xl" />
        </span>
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand font-head text-base font-bold text-white shadow-orange sm:size-14 sm:text-lg" aria-hidden="true">
              {initials(profile.legalName)}
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-extrabold tracking-tight text-text sm:text-[1.6rem]">{profile.legalName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <RiskTag risk={latest?.riskLevel ?? null} />
                {profile.gstStatus && profile.gstStatus !== "Active" ? <Tag tone="danger">GST {profile.gstStatus.toLowerCase()}</Tag> : null}
                <span className="rounded-md bg-surface-strong px-2 py-1 font-mono text-[11.5px] font-semibold leading-none text-text-2">{identifier}</span>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                <span>{t(`types.${profile.type}`)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {profile.address.city}
                  {profile.stateName ? `, ${profile.stateName}` : ""}
                </span>
                <span aria-hidden="true">·</span>
                <span>{t("addedOn", { date: formatDate(istDate(new Date(profile.createdAt))) })}</span>
              </p>
            </div>
          </div>
          {editable ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:shrink-0 lg:justify-end">
              <ButtonLink href={`/checks/new?counterparty=${profile.id}`} className="col-span-2 sm:col-span-1">
                <ShieldCheck aria-hidden="true" /> {t("runChecks")}
              </ButtonLink>
              <ButtonLink href={`/transactions/new?counterparty=${profile.id}`} variant="secondary" className="px-3">
                <FilePlus2 aria-hidden="true" /> {t("newTransaction")}
              </ButtonLink>
              <Button variant="ghost" onClick={() => setArchiveOpen(true)} icon={<Archive aria-hidden="true" />}>
                {t("archive")}
              </Button>
            </div>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-4 sm:p-4">
          <Stat icon={<TrendingUp />} label={t("headerRange")} value={range ?? t("notYet")} accent={Boolean(range)} />
          <Stat icon={<Wallet />} label={t("headerOutstanding")} value={formatInr(0n)} />
          <Stat icon={<IndianRupee />} label={t("headerTurnover")} value={t("notYet")} />
          <Stat icon={<CalendarCheck />} label={t("headerLastReport")} value={latest ? formatDate(istDate(new Date(latest.createdAt))) : t("notYet")} />
        </dl>
      </header>

      <Tabs
        items={[
          { key: "overview", label: t("tabOverview"), content: overview },
          { key: "reports", label: tabLabel(t("tabReports"), reports.length), content: reports.length ? <ReportList reports={reports} /> : empty(t("emptyReports")) },
          {
            key: "cases",
            label: tabLabel(t("tabCases"), cases.confirmed.length),
            content: cases.runs.length ? <CaseList cases={cases} counterpartyId={profile.id} canRun={canRun} /> : empty(t("emptyCases")),
          },
          {
            key: "transactions",
            label: tabLabel(t("tabTransactions"), deals.length),
            content: deals.length ? <DealList deals={deals} counterpartyId={profile.id} canManage={canManage} /> : empty(t("emptyTransactions")),
          },
          { key: "documents", label: tabLabel(t("tabDocuments"), 0), content: empty(t("emptyDocuments")) },
          { key: "activity", label: tabLabel(t("tabActivity"), activity.length), content: <ActivityList items={activity} /> },
        ]}
      />

      {editOpen ? <EditDialog profile={profile} onClose={() => setEditOpen(false)} onSaved={() => router.refresh()} /> : null}
      <ConfirmDialog
        open={archiveOpen}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => {
          setArchiveOpen(false);
          void post(`/api/v1/counterparties/${profile.id}/archive`, {}, t("archived"), "archive");
        }}
        title={t("archiveTitle", { name: profile.legalName })}
        body={t("archiveBody")}
        confirmLabel={t("archive")}
      />
    </div>
  );
}

const ROW = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 text-sm transition-colors hover:bg-hover sm:px-5";

/** S07 Agreements tab: every Business Security agreement with this counterparty. */
function DealList({ deals, counterpartyId, canManage }: { deals: DealRow[]; counterpartyId: string; canManage: boolean }) {
  const t = useTranslations("transactions");
  return (
    <Card>
      <CardHeader title={t("listTitle")} action={canManage ? <ButtonLink href={`/transactions/new?counterparty=${counterpartyId}`} size="sm" variant="secondary">{t("newAgreement")}</ButtonLink> : null} />
      <ul className="divide-y divide-border">
        {deals.map((d) => (
          <li key={d.id} className={ROW}>
            <span className="min-w-0">
              <Link href={`/transactions/${d.id}`} className="font-semibold text-text hover:text-primary-text">{d.reference}</Link>
              <span className="mt-0.5 block text-xs text-muted">{t(`type.${d.type}`)} · {formatInr(BigInt(d.totalPaise))} · {formatDate(d.dueDate)}</span>
            </span>
            <Tag tone={d.status === "overdue" || d.status === "rejected" ? "danger" : d.status === "paid" || d.status === "active" ? "success" : "neutral"}>{t(`status.${d.status}`)}</Tag>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** S07 Cases tab: confirmed cases first (they feed the risk level), then every Case Check run. */
function CaseList({ cases, counterpartyId, canRun }: { cases: CasesTab; counterpartyId: string; canRun: boolean }) {
  const t = useTranslations("cases.tab");
  const c = useTranslations("cases");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("confirmed")} action={canRun ? <ButtonLink href={`/cases?counterparty=${counterpartyId}`} size="sm" variant="secondary">{t("run")}</ButtonLink> : null} />
        {cases.confirmed.length ? (
          <ul className="divide-y divide-border">
            {cases.confirmed.map((m) => (
              <li key={m.id} className={ROW}>
                <span className="min-w-0">
                  <span className="font-semibold text-text">{m.caseNo ?? m.listName}</span>
                  <span className="mt-0.5 block text-xs text-muted">{m.court} · {m.caseType}</span>
                </span>
                <span className="flex items-center gap-2">
                  {m.recovery ? <Tag tone="warning">{c("recovery")}</Tag> : null}
                  <Tag tone={m.pending ? "danger" : "neutral"}>{m.status}</Tag>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <CardBody><p className="text-sm text-muted">{t("noneConfirmed")}</p></CardBody>
        )}
      </Card>
      <Card>
        <CardHeader title={t("runs")} />
        <ul className="divide-y divide-border">
          {cases.runs.map((r) => (
            <li key={r.id} className={ROW}>
              <Link href={`/cases/${r.id}`} className="font-semibold text-text hover:text-primary-text">
                {c("resultsMeta", { number: r.reportNo, date: formatDate(istDate(new Date(r.createdAt))) })}
              </Link>
              <span className="flex items-center gap-2 text-xs text-muted">
                {t("matches", { count: r.matches })}
                {r.notReviewed ? <Tag tone="info">{t("notReviewed", { count: r.notReviewed })}</Tag> : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ReportList({ reports }: { reports: ReportRow[] }) {
  const t = useTranslations("counterparties");
  return (
    <Card>
      <CardHeader title={t("tabReports")} />
      <ul className="divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id} className={ROW}>
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
                <FileText size={16} />
              </span>
              <span className="min-w-0">
                <Link href={`/reports/${r.id}`} className="font-semibold text-text hover:text-primary-text">
                  {t("reportRow", { number: r.reportNo, date: formatDate(istDate(new Date(r.createdAt))) })}
                </Link>
                {r.creditHighPaise !== null ? (
                  <span className="mt-0.5 block text-xs tabular-nums text-muted">
                    {t("safeRange")}: {formatInrShort(BigInt(r.creditLowPaise ?? 0))} – {formatInrShort(BigInt(r.creditHighPaise))}
                  </span>
                ) : null}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {r.status === "in_progress" ? <Tag tone="info">{t("inProgress")}</Tag> : null}
              <RiskTag risk={r.riskLevel} />
              <ArrowRight size={14} className="hidden text-subtle sm:block" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text">{value}</dd>
    </div>
  );
}

/** Key fact tile in the header. */
function Stat({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase leading-tight tracking-[0.8px] text-subtle">
        <span className="shrink-0 text-primary-text [&_svg]:size-3.5" aria-hidden="true">{icon}</span>
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className={accent ? "text-gradient mt-1.5 font-head text-base font-bold" : "mt-1.5 font-head text-base font-bold text-text"}>{value}</dd>
    </div>
  );
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  const t = useTranslations("counterparties");
  if (!items.length) return <Card><EmptyState title={t("emptyActivity")} /></Card>;
  const label = (action: string) => {
    const key = action.replace(/^counterparty\./, ""); // message keys cannot contain dots
    return t.has(`activity.${key}`) ? t(`activity.${key}`) : action;
  };
  return (
    <Card>
      <ol className="px-4 py-2 sm:px-5">
        {items.map((a, i) => {
          const changed = a.action === "counterparty.updated" && a.changes ? Object.keys(a.changes) : [];
          return (
            <li key={a.id} className="relative flex gap-3 py-3 text-sm">
              {/* Timeline: a dot per event, joined by a thin line. */}
              <span className="relative flex w-3 shrink-0 justify-center" aria-hidden="true">
                <span className="mt-1.5 size-2.5 rounded-full bg-brand ring-4 ring-primary-softer" />
                {i < items.length - 1 ? <span className="absolute bottom-[-0.75rem] top-5 w-px bg-border" /> : null}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    {label(a.action)} {a.actor ? <span className="font-normal text-muted">{t("activityBy", { name: a.actor })}</span> : null}
                  </p>
                  {changed.length ? (
                    <p className="text-xs text-muted">{t("changedFields", { fields: changed.map((f) => (t.has(`fields.${f}`) ? t(`fields.${f}`) : f)).join(", ") })}</p>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-muted tabular-nums" dateTime={a.at}>
                  {formatDateTimeIst(new Date(a.at))}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

interface EditValues {
  contactName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: Profile["address"];
  creditDays: number | null;
  interestRate: number | null;
  tags: string[];
}

/** S07 inline edit: same rules as S06; the full mobile is loaded only here. Changes are logged in Activity. */
function EditDialog({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("counterparties");
  const toast = useToast();
  const [v, setV] = useState<EditValues | null>(null);
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // v4: a company picked from MCA records may have no GSTIN or contact yet; both can be added here.
  const [gstin, setGstin] = useState("");
  const [loadedAddress, setLoadedAddress] = useState("");
  const canAddGstin = profile.type === "business_cin" && !profile.gstin;

  useEffect(() => {
    let live = true;
    void api<EditValues & { notes: string }>(`/api/v1/counterparties/${profile.id}/contact`).then((res) => {
      if (!live) return;
      if (!res.ok) {
        toast(res.error.message, "danger");
        onClose();
        return;
      }
      setV(res.data);
      setLoadedAddress(JSON.stringify(res.data.address));
      setWhatsappSame(!res.data.whatsapp || res.data.whatsapp === res.data.mobile);
      setTags(res.data.tags.join(", "));
    });
    return () => {
      live = false;
    };
  }, [profile.id, toast, onClose]);

  async function save() {
    if (!v) return;
    setBusy(true);
    const res = await api(`/api/v1/counterparties/${profile.id}`, {
      method: "PATCH",
      body: {
        gstin: canAddGstin && gstin.trim() ? gstin.trim() : undefined,
        contactName: v.contactName.trim() ? v.contactName : undefined,
        mobile: v.mobile.trim() ? v.mobile : undefined,
        whatsapp: whatsappSame ? null : v.whatsapp || null,
        email: v.email || null,
        address: JSON.stringify(v.address) === loadedAddress ? undefined : v.address,
        creditDays: v.creditDays,
        interestRate: v.interestRate,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    setBusy(false);
    if (!res.ok) {
      if (res.error.status === 409) return setErrors({ mobile: t("duplicate") });
      return setErrors(res.error.fields ?? { _: res.error.message });
    }
    toast(t("updated"), "success");
    onClose();
    onSaved();
  }

  const set = <K extends keyof EditValues>(k: K, value: EditValues[K]) => setV((x) => (x ? { ...x, [k]: value } : x));
  const num = (s: string) => (s === "" ? null : Number(s));

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("editTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void save()} loading={busy} disabled={!v}>
            {t("saveChanges")}
          </Button>
        </>
      }
    >
      {!v ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : (
        <div className="space-y-4">
          {errors._ ? <p className="rounded-lg bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null}
          {canAddGstin ? (
            <FormField id="e-gstin" label={t("gstinOptional")} hint={t("gstinLinkHint")} error={errors.gstin}>
              <Input id="e-gstin" value={gstin} maxLength={15} onChange={(e) => setGstin(e.target.value.toUpperCase())} error={errors.gstin} />
            </FormField>
          ) : null}
          <FormField id="e-contactName" label={t("contactName")} error={errors.contactName} required>
            <Input id="e-contactName" value={v.contactName} onChange={(e) => set("contactName", e.target.value)} error={errors.contactName} />
          </FormField>
          <FormField id="e-mobile" label={t("mobile")} error={errors.mobile} required>
            <Input id="e-mobile" value={v.mobile} inputMode="numeric" maxLength={14} onChange={(e) => set("mobile", e.target.value.replace(/[^\d\s+]/g, ""))} error={errors.mobile} />
          </FormField>
          <Checkbox id="e-whatsappSame" label={t("whatsappSame")} checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
          {!whatsappSame ? (
            <FormField id="e-whatsapp" label={t("whatsapp")} error={errors.whatsapp}>
              <Input id="e-whatsapp" value={v.whatsapp} inputMode="numeric" maxLength={14} onChange={(e) => set("whatsapp", e.target.value.replace(/[^\d\s+]/g, ""))} error={errors.whatsapp} />
            </FormField>
          ) : null}
          <FormField id="e-email" label={`${t("email")} (${t("optional")})`} error={errors.email}>
            <Input id="e-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
          </FormField>
          <FormField id="e-line" label={t("addressLine")} error={errors["address.line"]} required>
            <Input id="e-line" value={v.address.line} onChange={(e) => set("address", { ...v.address, line: e.target.value })} error={errors["address.line"]} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="e-city" label={t("city")} error={errors["address.city"]} required>
              <Input id="e-city" value={v.address.city} onChange={(e) => set("address", { ...v.address, city: e.target.value })} error={errors["address.city"]} />
            </FormField>
            <FormField id="e-state" label={t("state")} error={errors["address.state"]} required>
              <Select id="e-state" value={v.address.state} onChange={(e) => set("address", { ...v.address, state: e.target.value })} error={errors["address.state"]}>
                <option value="">{t("selectState")}</option>
                {STATE_NAMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="e-pincode" label={t("pincode")} error={errors["address.pincode"]} required>
              <Input id="e-pincode" value={v.address.pincode} inputMode="numeric" maxLength={6} onChange={(e) => set("address", { ...v.address, pincode: e.target.value.replace(/\D/g, "") })} error={errors["address.pincode"]} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="e-creditDays" label={t("creditDays")} error={errors.creditDays}>
              <Input id="e-creditDays" type="number" min={0} max={365} value={v.creditDays ?? ""} onChange={(e) => set("creditDays", num(e.target.value))} error={errors.creditDays} />
            </FormField>
            <FormField id="e-interestRate" label={t("interestRate")} error={errors.interestRate}>
              <Input id="e-interestRate" type="number" min={0} max={36} step={0.01} value={v.interestRate ?? ""} onChange={(e) => set("interestRate", num(e.target.value))} error={errors.interestRate} />
            </FormField>
          </div>
          <FormField id="e-tags" label={t("tags")} hint={t("tagsHint")} error={errors.tags}>
            <Input id="e-tags" value={tags} onChange={(e) => setTags(e.target.value)} hint={t("tagsHint")} error={errors.tags} />
          </FormField>
        </div>
      )}
    </Dialog>
  );
}
