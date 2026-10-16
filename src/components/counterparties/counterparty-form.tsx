"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Landmark, User } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, ErrorSummary, FormField, Input, PageHeader, Select, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { COUNTERPARTY_TYPES, type CounterpartyType, type UpiStatus } from "@/lib/counterparties";
import { isValidGstin, normaliseIdentifier, normaliseMobile, panFromGstin } from "@/lib/validators";
import { GST_STATES } from "@/server/providers/identity/states";
import type { DuplicateMatch } from "@/server/counterparties/service";

// PRD S06: register a buyer, debtor or borrower with verified identity and contact details (FR-CP-01–04).

type GstFetch =
  | { state: "found"; testData: boolean; legalName: string; tradeName: string | null; pan: string; gstStatus: string; address: Address }
  | { state: "not_found" | "unavailable"; testData: boolean };

interface Address {
  line: string;
  city: string;
  state: string;
  pincode: string;
}

interface UpiResult {
  status: Exclude<UpiStatus, "not_checked" | "manual_confirmed">;
  name: string | null;
  testData: boolean;
}

const TYPE_ICONS: Record<CounterpartyType, typeof Building2> = { business_gstin: Building2, business_pan: Landmark, individual: User };
const STATE_NAMES = Object.values(GST_STATES).sort((a, b) => a.localeCompare(b, "en-IN"));

const words = (s: string) => new Set(s.toUpperCase().split(/[^A-Z]+/).filter((w) => w.length >= 3));
/** S06: a UPI name that shares no word with the legal name or contact person is shown as a warning, not a block. */
function namesDiffer(upi: string, legal: string, contact: string) {
  const u = words(upi);
  const known = new Set([...words(legal), ...words(contact)]);
  return u.size > 0 && ![...u].some((w) => known.has(w));
}

export function CounterpartyForm() {
  const t = useTranslations("counterparties");
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<CounterpartyType>("business_gstin");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cin, setCin] = useState("");
  const [udyam, setUdyam] = useState("");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address>({ line: "", city: "", state: "", pincode: "" });
  const [creditDays, setCreditDays] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tags, setTags] = useState("");

  const [gst, setGst] = useState<GstFetch | null>(null);
  const [upi, setUpi] = useState<UpiResult | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"fetch" | "upi" | "save" | null>(null);

  const digits = normaliseMobile(mobile);

  async function checkDuplicates(next: { gstin?: string; pan?: string; mobile?: string }) {
    const body = { gstin: type === "business_gstin" ? gstin : undefined, pan: type === "business_gstin" ? undefined : pan, mobile, ...next };
    if (!body.gstin && !body.pan && !body.mobile) return;
    const res = await api<{ matches: DuplicateMatch[] }>("/api/v1/counterparties/duplicates", { body });
    if (res.ok) setDuplicate(res.data.matches[0] ?? null);
  }

  async function fetchGst() {
    const id = normaliseIdentifier(gstin);
    if (!isValidGstin(id)) return setErrors((e) => ({ ...e, gstin: "This GSTIN is not valid." }));
    setBusy("fetch");
    const res = await api<GstFetch>("/api/v1/counterparties/gst-fetch", { body: { gstin: id } });
    setBusy(null);
    if (!res.ok) return setErrors((e) => ({ ...e, ...(res.error.fields ?? { gstin: res.error.message }) }));
    setErrors((e) => {
      const rest = { ...e };
      delete rest.gstin;
      return rest;
    });
    setGst(res.data);
    if (res.data.state === "found") {
      setLegalName(res.data.legalName);
      setTradeName(res.data.tradeName ?? "");
      setAddress(res.data.address);
    }
    void checkDuplicates({ gstin: id });
  }

  async function checkUpi() {
    if (!digits) return setErrors((e) => ({ ...e, mobile: "Enter a valid mobile number." }));
    setBusy("upi");
    const res = await api<UpiResult>("/api/v1/counterparties/upi-check", { body: { mobile: digits } });
    setBusy(null);
    if (!res.ok) return toast(res.error.message, "danger");
    setUpi(res.data);
  }

  async function save(thenCheck: boolean) {
    setBusy("save");
    setErrors({});
    const body = {
      type,
      gstin: type === "business_gstin" ? gstin : undefined,
      pan: type === "business_gstin" ? undefined : pan,
      legalName,
      tradeName: tradeName || undefined,
      cin: type === "individual" ? undefined : cin || undefined,
      udyam: type === "individual" ? undefined : udyam || undefined,
      contactName,
      mobile,
      whatsapp: whatsappSame ? undefined : whatsapp || undefined,
      email: email || undefined,
      address,
      creditDays: creditDays === "" ? null : Number(creditDays),
      interestRate: interestRate === "" ? null : Number(interestRate),
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const res = await api<{ id: string }>("/api/v1/counterparties", { body });
    setBusy(null);
    if (!res.ok) {
      const f = res.error.fields ?? {};
      if (res.error.status === 409 && f.duplicateId) {
        setDuplicate({ id: f.duplicateId, legalName: f.duplicateName ?? legalName, status: "active", matchedOn: [] });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setErrors(Object.keys(f).length ? f : { _: res.error.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    toast(t("saved"), "success");
    router.push(thenCheck ? `/checks/new?counterparty=${res.data.id}` : `/counterparties/${res.data.id}`);
    router.refresh();
  }

  const fieldError = (key: string) => errors[key];
  const summary = Object.entries(errors)
    .filter(([k]) => k !== "_")
    .map(([field, message]) => ({ field, message })); // API field paths ("address.pincode") are also the input ids

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <PageHeader title={t("newTitle")} description={t("newSubtitle")} />

      {duplicate ? (
        <div role="alert" className="rounded-[14px] border border-warning-fg/30 bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">
          {t("duplicate")}{" "}
          {duplicate.matchedOn.length ? (
            <span className="font-medium">
              {t("duplicateOn", { fields: duplicate.matchedOn.map((m) => t(m === "gstin" ? "fieldGstin" : m === "pan" ? "fieldPan" : "fieldMobile")).join(", ") })}.{" "}
            </span>
          ) : null}
          {duplicate.status === "archived" ? <span className="font-medium">{t("duplicateArchived")} </span> : null}
          <Link href={`/counterparties/${duplicate.id}`} className="underline underline-offset-2">
            {t("duplicateOpen", { name: duplicate.legalName })}
          </Link>
        </div>
      ) : null}
      {errors._ ? (
        <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
          {errors._}
        </p>
      ) : null}
      <ErrorSummary title={t("errorSummary")} errors={summary} />

      <Card>
        <CardHeader title={t("sectionType")} />
        <CardBody>
          <div role="radiogroup" aria-label={t("sectionType")} className="grid gap-3 sm:grid-cols-3">
            {COUNTERPARTY_TYPES.map((k) => {
              const Icon = TYPE_ICONS[k];
              const on = type === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setType(k);
                    setGst(null);
                    setDuplicate(null);
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all",
                    on ? "border-primary bg-primary-soft shadow-sm" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className={cn("shrink-0 rounded-xl p-1.5", on ? "bg-primary text-white" : "bg-surface-strong text-text-2")} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-text">{t(`types.${k}`)}</span>
                    <span className="mt-0.5 block text-xs text-muted">{t(`typeHints.${k}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sectionIdentity")} />
        <CardBody className="space-y-4">
          {type === "business_gstin" ? (
            <>
              <FormField id="gstin" label={t("gstin")} error={fieldError("gstin")} required>
                <div className="flex gap-2">
                  <Input
                    id="gstin"
                    value={gstin}
                    maxLength={15}
                    autoComplete="off"
                    className="font-mono uppercase"
                    onChange={(e) => {
                      setGstin(e.target.value.toUpperCase());
                      setGst(null);
                    }}
                    onBlur={() => isValidGstin(normaliseIdentifier(gstin)) && void checkDuplicates({ gstin: normaliseIdentifier(gstin) })}
                    error={fieldError("gstin")}
                  />
                  <Button variant="secondary" onClick={() => void fetchGst()} loading={busy === "fetch"} disabled={normaliseIdentifier(gstin).length !== 15}>
                    {t("fetch")}
                  </Button>
                </div>
              </FormField>
              {gst?.state === "found" ? (
                <div className="space-y-1 rounded-2xl border border-border bg-surface-muted p-4 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-text">
                    {t("fetched")} {gst.testData ? <Tag tone="warning">{t("testData")}</Tag> : null}
                  </p>
                  <p className="text-muted">
                    PAN <span className="font-mono text-text-2">{panFromGstin(normaliseIdentifier(gstin))}</span> · {gst.gstStatus}
                  </p>
                  {gst.gstStatus !== "Active" ? <p className="font-semibold text-warning-fg">{t("gstStatusWarning", { status: gst.gstStatus.toLowerCase() })}</p> : null}
                </div>
              ) : gst?.state === "not_found" ? (
                <p className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">{t("gstNotFound")}</p>
              ) : gst?.state === "unavailable" ? (
                <p className="rounded-[14px] bg-info-bg px-4 py-3 text-sm font-semibold text-info-fg">{t("gstUnavailable")}</p>
              ) : null}
            </>
          ) : (
            <FormField id="pan" label={t("pan")} hint={type === "individual" ? t("panHintIndividual") : undefined} error={fieldError("pan")} required>
              <Input
                id="pan"
                value={pan}
                maxLength={10}
                autoComplete="off"
                className="font-mono uppercase"
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                onBlur={() => void checkDuplicates({ pan })}
                error={fieldError("pan")}
              />
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="legalName" label={t("legalName")} error={fieldError("legalName")} required>
              <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120} error={fieldError("legalName")} />
            </FormField>
            <FormField id="tradeName" label={`${t("tradeName")} (${t("optional")})`}>
              <Input id="tradeName" value={tradeName} onChange={(e) => setTradeName(e.target.value)} maxLength={120} />
            </FormField>
          </div>
          {type !== "individual" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cin" label={`${t("cin")} (${t("optional")})`} error={fieldError("cin")}>
                <Input id="cin" value={cin} onChange={(e) => setCin(e.target.value.toUpperCase())} maxLength={21} className="font-mono uppercase" error={fieldError("cin")} />
              </FormField>
              <FormField id="udyam" label={`${t("udyam")} (${t("optional")})`} error={fieldError("udyam")}>
                <Input id="udyam" value={udyam} onChange={(e) => setUdyam(e.target.value.toUpperCase())} maxLength={19} placeholder="UDYAM-XX-00-0000000" className="font-mono uppercase" error={fieldError("udyam")} />
              </FormField>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sectionContact")} />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="contactName" label={t("contactName")} error={fieldError("contactName")} required>
              <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={80} autoComplete="off" error={fieldError("contactName")} />
            </FormField>
            <FormField id="mobile" label={t("mobile")} error={fieldError("mobile")} required>
              <Input
                id="mobile"
                value={mobile}
                inputMode="numeric"
                maxLength={14}
                autoComplete="off"
                placeholder="98765 43210"
                onChange={(e) => {
                  setMobile(e.target.value.replace(/[^\d\s+]/g, ""));
                  setUpi(null);
                }}
                onBlur={() => digits && void checkDuplicates({ mobile: digits })}
                error={fieldError("mobile")}
              />
            </FormField>
          </div>
          <Checkbox id="whatsappSame" label={t("whatsappSame")} checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
          <div className="grid gap-4 sm:grid-cols-2">
            {!whatsappSame ? (
              <FormField id="whatsapp" label={t("whatsapp")} error={fieldError("whatsapp")}>
                <Input id="whatsapp" value={whatsapp} inputMode="numeric" maxLength={14} onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d\s+]/g, ""))} error={fieldError("whatsapp")} />
              </FormField>
            ) : null}
            <FormField id="email" label={`${t("email")} (${t("optional")})`} error={fieldError("email")}>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" error={fieldError("email")} />
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sectionUpi")} />
        <CardBody className="space-y-3">
          <p className="text-sm text-muted">{t("upiIntro")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void checkUpi()} loading={busy === "upi"} disabled={!digits}>
              {upi ? t("upiRecheck") : t("upiCheck")}
            </Button>
            {upi?.testData ? <Tag tone="warning">{t("testData")}</Tag> : null}
          </div>
          {upi?.status === "linked" ? (
            <div className="space-y-2">
              <p role="status" className="rounded-[14px] bg-success-bg px-4 py-3 text-sm font-semibold text-success-fg">
                {t("upiLinked", { name: upi.name ?? "" })}
              </p>
              {upi.name && legalName && namesDiffer(upi.name, legalName, contactName) ? (
                <p className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">
                  {t("nameMismatch", { upi: upi.name, legal: legalName })}
                </p>
              ) : null}
            </div>
          ) : upi?.status === "not_linked" ? (
            <p role="status" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
              {t("upiNotLinked")}
            </p>
          ) : upi?.status === "unavailable" ? (
            <p role="status" className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">
              {t("upiUnavailable")}
            </p>
          ) : null}
          <p className="text-xs text-muted">{t("upiManualHelp")}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sectionAddress")} />
        <CardBody className="space-y-4">
          <FormField id="address.line" label={t("addressLine")} error={fieldError("address.line")} required>
            <Input id="address.line" value={address.line} onChange={(e) => setAddress((a) => ({ ...a, line: e.target.value }))} maxLength={200} error={fieldError("address.line")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="address.city" label={t("city")} error={fieldError("address.city")} required>
              <Input id="address.city" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} maxLength={60} error={fieldError("address.city")} />
            </FormField>
            <FormField id="address.state" label={t("state")} error={fieldError("address.state")} required>
              <Select id="address.state" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} error={fieldError("address.state")}>
                <option value="">{t("selectState")}</option>
                {STATE_NAMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="address.pincode" label={t("pincode")} error={fieldError("address.pincode")} required>
              <Input id="address.pincode" value={address.pincode} inputMode="numeric" maxLength={6} onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "") }))} error={fieldError("address.pincode")} />
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sectionDefaults")} />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="creditDays" label={`${t("creditDays")} (${t("optional")})`} hint={t("creditDaysHint")} error={fieldError("creditDays")}>
              <Input id="creditDays" type="number" min={0} max={365} step={1} inputMode="numeric" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} hint={t("creditDaysHint")} error={fieldError("creditDays")} />
            </FormField>
            <FormField id="interestRate" label={`${t("interestRate")} (${t("optional")})`} hint={t("interestRateHint")} error={fieldError("interestRate")}>
              <Input id="interestRate" type="number" min={0} max={36} step={0.01} inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} hint={t("interestRateHint")} error={fieldError("interestRate")} />
            </FormField>
          </div>
          <FormField id="tags" label={`${t("tags")} (${t("optional")})`} hint={t("tagsHint")} error={fieldError("tags")}>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} hint={t("tagsHint")} error={fieldError("tags")} />
          </FormField>
        </CardBody>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink href="/counterparties" variant="ghost">
          {t("cancel")}
        </ButtonLink>
        <Button variant="secondary" onClick={() => void save(true)} disabled={busy !== null}>
          {t("saveAndCheck")}
        </Button>
        <Button type="submit" loading={busy === "save"} disabled={busy !== null && busy !== "save"}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
