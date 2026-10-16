"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, EmptyState, FormField, Input, Select, Tag, Textarea } from "@/components/ui";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import { RiskTag } from "./risk-tag";
import { GST_STATES } from "@/server/providers/identity/states";
import { UpiBadge } from "./upi-badge";
import type { ActivityItem, CounterpartyProfile as Profile } from "@/server/counterparties/service";

// PRD S07: one place for everything known about a counterparty (FR-CP-06). Reports, cases, transactions and
// documents fill in as Parts 5 to 9 are built; until then those tabs show what will appear there.

const STATE_NAMES = Object.values(GST_STATES).sort((a, b) => a.localeCompare(b, "en-IN"));

type ReportRow = Awaited<ReturnType<typeof import("@/server/checks/service").reportsFor>>[number];

export function CounterpartyProfile({
  profile, activity, reports, canManage, canRun,
}: { profile: Profile; activity: ActivityItem[]; reports: ReportRow[]; canManage: boolean; canRun: boolean }) {
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
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {latest ? (
          <ReportList reports={reports.slice(0, 3)} />
        ) : (
          <Card>
            <EmptyState
              title={t("noChecksTitle")}
              body={t("noChecksBody")}
              action={editable && canRun ? <ButtonLink href={`/checks/new?counterparty=${profile.id}`}>{t("runChecks")}</ButtonLink> : null}
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

      <div className="space-y-5">
        <Card>
          <CardHeader title={t("contactTitle")} action={editable ? <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>{t("edit")}</Button> : null} />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label={t("contactName")} value={profile.contactName} />
              <Row label={t("mobile")} value={<span className="tabular-nums">{profile.mobile}</span>} />
              <Row label={t("whatsapp")} value={<span className="tabular-nums">{profile.whatsapp ?? profile.mobile}</span>} />
              <Row label={t("email")} value={profile.email ?? t("notSet")} />
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
            {editable ? (
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
            {profile.upi.status !== "linked" && profile.upi.status !== "manual_confirmed" ? <p className="text-xs text-muted">{t("upiManualHelp")}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("identityTitle")} />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label={t("sectionType")} value={t(`types.${profile.type}`)} />
              {profile.gstin ? <Row label={t("gstin")} value={<span className="font-mono">{profile.gstin}</span>} /> : null}
              {profile.pan ? <Row label={t("pan")} value={<span className="font-mono">{profile.pan}</span>} /> : null}
              {profile.cin ? <Row label={t("cin")} value={<span className="font-mono">{profile.cin}</span>} /> : null}
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

  return (
    <div className="space-y-6">
      <Link href="/counterparties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary-text">
        <ArrowLeft size={14} aria-hidden="true" /> {t("backToList")}
      </Link>

      {archived ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-neutral-bg px-4 py-3 text-sm font-semibold text-neutral-fg">
          <span>{t("archivedBanner")}</span>
          {canManage ? (
            <Button size="sm" variant="secondary" loading={busy === "restore"} onClick={() => void post(`/api/v1/counterparties/${profile.id}/restore`, {}, t("restored"), "restore")}>
              {t("restore")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <header className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-[1.75rem]">{profile.legalName}</h1>
              <RiskTag risk={latest?.riskLevel ?? null} />
              {profile.gstStatus && profile.gstStatus !== "Active" ? <Tag tone="danger">GST {profile.gstStatus.toLowerCase()}</Tag> : null}
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span className="font-mono">{identifier}</span>
              <span>{t(`types.${profile.type}`)}</span>
              <span>
                {profile.address.city}
                {profile.stateName ? `, ${profile.stateName}` : ""}
              </span>
              <span>{t("addedOn", { date: formatDate(istDate(new Date(profile.createdAt))) })}</span>
            </p>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/checks/new?counterparty=${profile.id}`}>{t("runChecks")}</ButtonLink>
              <ButtonLink href={`/transactions/new?counterparty=${profile.id}`} variant="secondary">
                {t("newTransaction")}
              </ButtonLink>
              <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
                {t("archive")}
              </Button>
            </div>
          ) : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <Stat
            label={t("headerRange")}
            value={withRange ? `${formatInrShort(BigInt(withRange.creditLowPaise ?? 0))} – ${formatInrShort(BigInt(withRange.creditHighPaise!))}` : t("notYet")}
          />
          <Stat label={t("headerOutstanding")} value={formatInr(0n)} />
          <Stat label={t("headerTurnover")} value={t("notYet")} />
          <Stat label={t("headerLastReport")} value={latest ? formatDate(istDate(new Date(latest.createdAt))) : t("notYet")} />
        </dl>
      </header>

      <Tabs
        items={[
          { key: "overview", label: t("tabOverview"), content: overview },
          { key: "reports", label: t("tabReports"), count: reports.length, content: reports.length ? <ReportList reports={reports} /> : empty(t("emptyReports")) },
          { key: "cases", label: t("tabCases"), count: 0, content: empty(t("emptyCases")) },
          { key: "transactions", label: t("tabTransactions"), count: 0, content: empty(t("emptyTransactions")) },
          { key: "documents", label: t("tabDocuments"), count: 0, content: empty(t("emptyDocuments")) },
          { key: "activity", label: t("tabActivity"), count: activity.length, content: <ActivityList items={activity} /> },
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

function ReportList({ reports }: { reports: ReportRow[] }) {
  const t = useTranslations("counterparties");
  return (
    <Card>
      <CardHeader title={t("tabReports")} />
      <ul className="divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <span className="min-w-0">
              <Link href={`/reports/${r.id}`} className="font-bold text-text hover:text-primary-text">
                {t("reportRow", { number: r.reportNo, date: formatDate(istDate(new Date(r.createdAt))) })}
              </Link>
              <span className="mt-0.5 block text-xs text-muted">
                {r.creditHighPaise !== null ? `${formatInrShort(BigInt(r.creditLowPaise ?? 0))} – ${formatInrShort(BigInt(r.creditHighPaise))}` : null}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {r.status === "in_progress" ? <Tag tone="info">{t("inProgress")}</Tag> : null}
              <RiskTag risk={r.riskLevel} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs font-bold uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="mt-1 font-bold text-text">{value}</dd>
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
      <ol className="divide-y divide-border">
        {items.map((a) => {
          const changed = a.action === "counterparty.updated" && a.changes ? Object.keys(a.changes) : [];
          return (
            <li key={a.id} className="flex flex-col gap-1 px-5 py-3.5 text-sm sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-bold text-text">
                  {label(a.action)} {a.actor ? <span className="font-normal text-muted">{t("activityBy", { name: a.actor })}</span> : null}
                </p>
                {changed.length ? (
                  <p className="text-xs text-muted">{t("changedFields", { fields: changed.map((f) => (t.has(`fields.${f}`) ? t(`fields.${f}`) : f)).join(", ") })}</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-muted tabular-nums" dateTime={a.at}>
                {formatDateTimeIst(new Date(a.at))}
              </time>
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
        contactName: v.contactName,
        mobile: v.mobile,
        whatsapp: whatsappSame ? null : v.whatsapp || null,
        email: v.email || null,
        address: v.address,
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
          {errors._ ? <p className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null}
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
