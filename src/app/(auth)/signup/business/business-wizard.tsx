"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CircleCheck, IdCard, Info, ReceiptIndianRupee, TriangleAlert, Upload } from "lucide-react";
import { SignupSteps } from "@/components/shell/signup-steps";
import { Button, Card, CardBody, ErrorSummary, FormField, Input, Select, Spinner, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { isValidGstin, isValidPan, normaliseIdentifier } from "@/lib/validators";
import { GST_STATES } from "@/server/providers/identity/states";

// PRD S02: verify the business by GSTIN (default) or PAN, then the person's details, then create the organisation.

type LookupState = "active" | "cancelled" | "suspended" | "not_found" | "provider_unavailable" | "already_registered";

interface GstDetails {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  constitution: string;
  status: string;
  registrationDate: string;
  statusDate: string | null;
  stateName: string;
  taxpayerType: string;
  address: { line: string; city: string; state: string; pincode: string };
}

interface GstLookup {
  state: LookupState;
  gstin: string;
  lookupId?: string;
  details?: GstDetails | null;
  sampleData?: boolean;
}

interface PanLookup {
  state: "verified" | "already_registered";
  lookupId?: string;
  details?: { pan: string; nameOnPan: string; holderType: string };
  sampleData?: boolean;
}

const DESIGNATIONS = ["Proprietor", "Partner", "Director", "Manager", "Accountant", "Other"] as const;
const emptyManual = { legalName: "", addressLine: "", city: "", pincode: "" };

function Detail({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.8px] text-subtle">{label}</dt>
      <dd className="mt-0.5 break-words text-[13.5px] font-medium text-text">{children}</dd>
    </div>
  );
}

export function BusinessWizard() {
  const t = useTranslations("signup");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"gstin" | "pan">("gstin");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [panName, setPanName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gst, setGst] = useState<GstLookup | null>(null);
  const [panResult, setPanResult] = useState<PanLookup | null>(null);
  const [manual, setManual] = useState(emptyManual);
  const [doc, setDoc] = useState<{ ref: string; name: string } | null>(null);
  const [requester, setRequester] = useState("");
  const [accessRequested, setAccessRequested] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", designation: "", designationOther: "", workEmail: "" });
  const [authority, setAuthority] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);

  const reset = () => {
    setFields({});
    setSummary(null);
  };

  const showErrors = (f: Record<string, string> | undefined, message: string) => {
    setFields(f ?? {});
    setSummary(f && Object.keys(f).length ? null : message);
  };

  async function fetchGst() {
    reset();
    const value = normaliseIdentifier(gstin);
    if (!isValidGstin(value)) return setFields({ gstin: t("gstinInvalid") });
    setBusy(true);
    const res = await api<GstLookup>("/api/v1/onboarding/gst-lookup", { body: { gstin: value } });
    setBusy(false);
    if (!res.ok) return showErrors(res.error.fields, res.error.message);
    setGst(res.data);
    setDoc(null);
    setManual({ ...emptyManual, legalName: res.data.details?.legalName ?? "" });
  }

  async function verifyPanNow() {
    reset();
    const value = normaliseIdentifier(pan);
    if (!isValidPan(value)) return setFields({ pan: t("panInvalid") });
    if (panName.trim().length < 2) return setFields({ panName: t("nameRequired") });
    setBusy(true);
    const res = await api<PanLookup>("/api/v1/onboarding/pan-verify", { body: { pan: value, panName } });
    setBusy(false);
    if (!res.ok) return showErrors(res.error.fields, res.error.message);
    setPanResult(res.data);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    reset();
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    const res = await api<{ documentRef: string; name: string }>("/api/v1/onboarding/documents", { form });
    setBusy(false);
    if (!res.ok) return showErrors(res.error.fields, res.error.message);
    setDoc({ ref: res.data.documentRef, name: res.data.name });
  }

  // Signed in with the wrong number (or an account that no longer exists): end the session and start again.
  async function signOut() {
    await api("/api/v1/auth/signout", { body: {} });
    router.replace("/login");
    router.refresh();
  }

  async function askForAccess() {
    reset();
    if (requester.trim().length < 2) return setFields({ requester: t("nameRequired") });
    setBusy(true);
    const res = await api("/api/v1/onboarding/request-access", { body: { gstin: normaliseIdentifier(gstin), name: requester } });
    setBusy(false);
    if (!res.ok) return showErrors(res.error.fields, res.error.message);
    setAccessRequested(true);
  }

  const needsManual = mode === "pan" || gst?.state === "provider_unavailable" || gst?.state === "not_found";
  const needsDocument = mode === "gstin" && (gst?.state === "cancelled" || gst?.state === "suspended" || gst?.state === "not_found");
  const manualComplete = manual.legalName.trim().length >= 2 && manual.addressLine.trim().length >= 5 && manual.city.trim() && /^[1-9]\d{5}$/.test(manual.pincode);
  const canContinue =
    mode === "gstin"
      ? gst?.state === "active" ||
        ((gst?.state === "cancelled" || gst?.state === "suspended") && Boolean(doc)) ||
        (gst?.state === "not_found" && Boolean(doc) && manualComplete) ||
        (gst?.state === "provider_unavailable" && manualComplete)
      : panResult?.state === "verified" && businessName.trim().length >= 2 && manual.addressLine.trim().length >= 5 && /^[1-9]\d{5}$/.test(manual.pincode);

  async function submit() {
    reset();
    const designation = profile.designation === "Other" ? profile.designationOther.trim() : profile.designation;
    const errs: Record<string, string> = {};
    if (profile.fullName.trim().length < 2) errs["profile.fullName"] = t("fullNameError");
    if (!designation) errs["profile.designation"] = t("designationError");
    if (!/^\S+@\S+\.\S+$/.test(profile.workEmail)) errs["profile.workEmail"] = t("emailError");
    if (!authority) errs.authority = t("authorityError");
    if (!terms) errs.terms = t("termsError");
    if (Object.keys(errs).length) return setFields(errs);

    const lookupId = mode === "gstin" ? gst?.lookupId : panResult?.lookupId;
    setBusy(true);
    const res = await api<{ next: string }>("/api/v1/onboarding/complete", {
      body: {
        method: mode,
        lookupId,
        businessName: mode === "pan" ? businessName : undefined,
        manual: needsManual ? { ...manual, legalName: mode === "pan" ? businessName : manual.legalName } : undefined,
        documentRef: doc?.ref,
        documentName: doc?.name,
        profile: { fullName: profile.fullName, designation, workEmail: profile.workEmail },
        authority,
        terms,
      },
    });
    setBusy(false);
    if (!res.ok) return showErrors(res.error.fields, res.error.message);
    router.replace(res.data.next);
    router.refresh();
  }

  const errorList = [
    ...Object.entries(fields).map(([field, message]) => ({ field: field.replace(/^profile\./, ""), message })),
    ...(summary ? [{ field: "main", message: summary }] : []),
  ];

  const manualFields = (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {mode === "gstin" ? (
        <FormField id="legalName" label={t("legalName")} error={fields["manual.legalName"] ?? fields.legalName} required className="sm:col-span-2">
          <Input id="legalName" value={manual.legalName} onChange={(e) => setManual({ ...manual, legalName: e.target.value })} />
        </FormField>
      ) : null}
      <FormField id="addressLine" label={t("address")} error={fields["manual.addressLine"]} required className="sm:col-span-2">
        <Input id="addressLine" autoComplete="street-address" value={manual.addressLine} onChange={(e) => setManual({ ...manual, addressLine: e.target.value })} />
      </FormField>
      <FormField id="city" label={t("city")} error={fields["manual.city"]} required>
        <Input id="city" autoComplete="address-level2" value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} />
      </FormField>
      <FormField id="pincode" label={t("pincode")} error={fields["manual.pincode"]} required>
        <Input id="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={manual.pincode} onChange={(e) => setManual({ ...manual, pincode: e.target.value.replace(/\D/g, "") })} />
      </FormField>
    </div>
  );

  const details = gst?.details;
  const gstinValue = normaliseIdentifier(gstin);
  const gstinFull = gstinValue.length === 15;
  const gstinOk = gstinFull && isValidGstin(gstinValue);
  const gstinState = GST_STATES[gstinValue.slice(0, 2)];
  const accent = (c: ReactNode) => <span className="text-gradient">{c}</span>;

  return (
    <div className="space-y-5">
      <SignupSteps current={step} />
      <div className="animate-rise space-y-1 text-center sm:text-left">
        <h1 className="font-head text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em] text-text sm:text-[1.9rem]">
          {t.rich(step === 1 ? "titleRich" : "yourDetailsRich", { accent })}
        </h1>
        <p className="text-sm text-muted">{t(step === 1 ? "titleSub" : "yourDetailsSub")}</p>
      </div>
      {errorList.length ? <ErrorSummary title={t("fixErrors")} errors={errorList} /> : null}

      {step === 1 ? (
        <Card className="animate-rise [animation-delay:60ms]">
          <CardBody className="space-y-5 p-4 sm:p-6">
            <fieldset>
              <legend className="mb-2.5 font-head text-[15px] font-bold text-text">{t("howFile")}</legend>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={t("verifyWith")}>
                {(["gstin", "pan"] as const).map((m) => {
                  const on = mode === m;
                  const Icon = m === "gstin" ? ReceiptIndianRupee : IdCard;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setMode(m);
                        reset();
                      }}
                      className={cn(
                        "relative flex min-h-[104px] flex-col items-start gap-2.5 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow,translate] duration-150 active:scale-[0.99] sm:min-h-0 sm:flex-row sm:items-center sm:p-4",
                        on
                          ? "border-primary bg-primary-softer shadow-[0_0_0_3px_var(--primary-soft)]"
                          : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary-line",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          on ? "bg-brand text-white shadow-orange" : "bg-soft text-primary-text",
                        )}
                        aria-hidden="true"
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 sm:pr-6">
                        <span className="block text-[13.5px] font-bold leading-snug text-text sm:text-sm">{t(m === "gstin" ? "optGst" : "optPan")}</span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted sm:text-xs">{t(m === "gstin" ? "optGstSub" : "optPanSub")}</span>
                      </span>
                      <span
                        className={cn(
                          "absolute right-3 top-3 flex size-[18px] items-center justify-center rounded-full border-2 transition-colors sm:top-1/2 sm:-translate-y-1/2",
                          on ? "border-primary bg-primary text-white" : "border-border-strong",
                        )}
                        aria-hidden="true"
                      >
                        {on ? <Check size={11} strokeWidth={3.5} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {mode === "gstin" ? (
              <form
                className="space-y-3"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchGst();
                }}
              >
                <FormField
                  id="gstin"
                  label={t("gstin")}
                  error={fields.gstin ?? (gstinFull && !gstinOk ? t("gstinInvalid") : undefined)}
                  hint={gstinOk || (gstinFull && !gstinOk) || fields.gstin ? undefined : t("gstinHint")}
                  required
                >
                  <div className="relative">
                    <Input
                      id="gstin"
                      value={gstin}
                      maxLength={15}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="29ABCDE1234F1Z5"
                      className="h-14 pr-16 font-mono text-[1.05rem] uppercase tracking-[0.08em] site:h-14 sm:text-lg"
                      onChange={(e) => {
                        setGstin(e.target.value.toUpperCase().replace(/\s+/g, ""));
                        if (gst) setGst(null);
                        if (fields.gstin) reset();
                      }}
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono text-xs tabular-nums",
                        gstinOk ? "font-bold text-success-fg" : gstinFull ? "text-text-2" : "text-subtle",
                      )}
                      aria-hidden="true"
                    >
                      {gstinValue.length}/15
                    </span>
                  </div>
                  {gstinOk ? (
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-success-fg">
                      <CircleCheck size={13} aria-hidden="true" />
                      {gstinState ? t("gstinLooksRightIn", { state: gstinState }) : t("gstinLooksRight")}
                    </p>
                  ) : null}
                </FormField>
                {!gst ? (
                  <>
                    <Button type="submit" className="w-full" loading={busy}>
                      {t("fetch")}
                      {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
                    </Button>
                    <p className="text-center text-[11.5px] text-subtle">{t("fetchNote")}</p>
                  </>
                ) : null}
              </form>
            ) : (
              <form
                className="grid gap-3.5 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void verifyPanNow();
                }}
              >
                <FormField id="pan" label={t("pan")} hint={fields.pan ? undefined : t("panHint")} error={fields.pan} required>
                  <Input
                    id="pan"
                    value={pan}
                    maxLength={10}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ABCDE1234F"
                    className="font-mono uppercase tracking-[0.08em]"
                    onChange={(e) => {
                      setPan(e.target.value.toUpperCase().replace(/\s+/g, ""));
                      if (panResult) setPanResult(null);
                    }}
                  />
                </FormField>
                <FormField id="panName" label={t("nameOnPan")} error={fields.panName} required>
                  <Input id="panName" value={panName} onChange={(e) => setPanName(e.target.value)} />
                </FormField>
                {!panResult ? (
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full" loading={busy}>
                      {t("verifyPan")}
                      {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
                    </Button>
                  </div>
                ) : null}
              </form>
            )}

            {mode === "gstin" && gst ? (
              <section aria-live="polite" className="animate-rise space-y-4">
                {gst.state === "already_registered" ? (
                  <div className="space-y-3">
                    <Notice tone="warning" icon={<Building2 size={16} />}>
                      {t("alreadyRegistered")}
                    </Notice>
                    {accessRequested ? (
                      <Notice tone="success" icon={<CircleCheck size={16} />}>
                        {t("accessRequested")}
                      </Notice>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <FormField id="requester" label={t("yourName")} error={fields.requester ?? fields.name} className="flex-1">
                          <Input id="requester" value={requester} onChange={(e) => setRequester(e.target.value)} />
                        </FormField>
                        <Button variant="secondary" onClick={() => void askForAccess()} loading={busy}>
                          {t("requestAccess")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}

                {details ? (
                  <div className="rounded-xl border border-border bg-surface-muted p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true">
                        <BadgeCheck size={15} />
                      </span>
                      <h2 className="font-head text-sm font-bold text-text">{t("fromRecords")}</h2>
                      <Tag tone={details.status === "Active" ? "success" : "danger"}>{details.status}</Tag>
                      {gst.sampleData ? <Tag tone="warning">{t("sampleData")}</Tag> : null}
                    </div>
                    <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3">
                      <Detail label={t("legalName")} wide>
                        {details.legalName}
                      </Detail>
                      <Detail label={t("tradeName")}>{details.tradeName ?? "—"}</Detail>
                      <Detail label={t("constitution")}>{details.constitution}</Detail>
                      <Detail label={t("registered")}>{formatDate(details.registrationDate)}</Detail>
                      <Detail label={t("state")}>{details.stateName}</Detail>
                      <Detail label={t("taxpayerType")} wide>
                        {details.taxpayerType}
                      </Detail>
                      <Detail label={t("principalAddress")} wide>
                        {[details.address.line, details.address.city, details.address.state, details.address.pincode].filter(Boolean).join(", ")}
                      </Detail>
                    </dl>
                  </div>
                ) : null}

                {gst.state === "cancelled" || gst.state === "suspended" ? (
                  <Notice tone="danger" icon={<TriangleAlert size={16} />}>
                    {t("statusBlocked", { status: details?.status ?? "", date: details?.statusDate ? formatDate(details.statusDate) : "—" })}
                  </Notice>
                ) : null}
                {gst.state === "not_found" ? (
                  <Notice tone="warning" icon={<TriangleAlert size={16} />}>
                    {t("notFound")}
                  </Notice>
                ) : null}
                {gst.state === "provider_unavailable" ? (
                  <Notice tone="info" icon={<Info size={16} />}>
                    {t("providerDown")}
                  </Notice>
                ) : null}

                {gst.state === "not_found" || gst.state === "provider_unavailable" ? manualFields : null}

                {needsDocument ? (
                  <FormField id="file" label={t("uploadCertificate")} hint={t("uploadHint")} error={fields.file} required>
                    <input
                      id="file"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="peer sr-only"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                    <label
                      htmlFor="file"
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-sm font-semibold transition-colors peer-focus-visible:border-primary peer-focus-visible:shadow-[0_0_0_4px_var(--primary-soft)]",
                        doc ? "border-success-fg/40 bg-success-bg text-success-fg" : "border-border-strong bg-surface-muted text-text-2 hover:border-primary hover:text-primary-text",
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-text shadow-sm" aria-hidden="true">
                        {busy ? <Spinner /> : <Upload size={16} />}
                      </span>
                      {doc ? t("replaceFile") : t("chooseFile")}
                    </label>
                    {doc ? (
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-fg">
                        <CircleCheck size={13} aria-hidden="true" />
                        {t("uploaded", { name: doc.name })}
                      </p>
                    ) : null}
                  </FormField>
                ) : null}
              </section>
            ) : null}

            {mode === "pan" && panResult ? (
              <section aria-live="polite" className="animate-rise space-y-4">
                {panResult.state === "already_registered" ? (
                  <Notice tone="warning" icon={<Building2 size={16} />}>
                    {t("alreadyRegistered")}
                  </Notice>
                ) : panResult.details ? (
                  <>
                    <div className="rounded-xl border border-border bg-surface-muted p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="success">{t("panVerified")}</Tag>
                        {panResult.sampleData ? <Tag tone="warning">{t("sampleData")}</Tag> : null}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                        <Detail label={t("nameOnPan")}>{panResult.details.nameOnPan}</Detail>
                        <Detail label={t("holderType")}>{panResult.details.holderType}</Detail>
                      </dl>
                    </div>
                    <FormField id="businessName" label={t("businessName")} error={fields.businessName} required>
                      <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </FormField>
                    {manualFields}
                  </>
                ) : null}
              </section>
            ) : null}

            {canContinue ? (
              <StickyActions>
                <Button
                  className="w-full"
                  onClick={() => {
                    reset();
                    setStep(2);
                  }}
                >
                  {t("continue")}
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </StickyActions>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <Card className="animate-rise">
          <CardBody className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField id="fullName" label={t("fullName")} error={fields["profile.fullName"]} required>
                <Input id="fullName" autoComplete="name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
              </FormField>
              <FormField id="designation" label={t("designation")} error={fields["profile.designation"]} required>
                <Select id="designation" value={profile.designation} onChange={(e) => setProfile({ ...profile, designation: e.target.value })}>
                  <option value="" disabled>
                    {t("select")}
                  </option>
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t(`designations.${d}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
              {profile.designation === "Other" ? (
                <FormField id="designationOther" label={t("designationOther")} required>
                  <Input id="designationOther" value={profile.designationOther} onChange={(e) => setProfile({ ...profile, designationOther: e.target.value })} />
                </FormField>
              ) : null}
              <FormField id="workEmail" label={t("workEmail")} hint={t("workEmailHint")} error={fields["profile.workEmail"]} required className="sm:col-span-2">
                <Input id="workEmail" type="email" autoComplete="email" value={profile.workEmail} onChange={(e) => setProfile({ ...profile, workEmail: e.target.value })} />
              </FormField>
            </div>
            <div className="space-y-2">
              <CheckTile id="authority" checked={authority} onChange={setAuthority} error={fields.authority}>
                {t("authority")}
              </CheckTile>
              <CheckTile id="terms" checked={terms} onChange={setTerms} error={fields.terms}>
                {t.rich("terms", {
                  terms: (c) => (
                    <a href="/legal/terms" target="_blank" className="font-semibold underline underline-offset-2">
                      {c}
                    </a>
                  ),
                  privacy: (c) => (
                    <a href="/legal/privacy" target="_blank" className="font-semibold underline underline-offset-2">
                      {c}
                    </a>
                  ),
                })}
              </CheckTile>
            </div>
            <StickyActions className="flex gap-2.5">
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => {
                  reset();
                  setStep(1);
                }}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {t("back")}
              </Button>
              <Button className="flex-1" onClick={() => void submit()} loading={busy}>
                {needsDocument ? t("submitForReview") : t("createAccount")}
              </Button>
            </StickyActions>
          </CardBody>
        </Card>
      )}
      <p className="text-center text-xs text-muted">
        {t("wrongAccount")}{" "}
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex min-h-10 items-center font-bold text-primary-text underline-offset-2 hover:underline"
        >
          {t("signOut")}
        </button>
      </p>
    </div>
  );
}

const NOTICE_TONES = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
} as const;

/** A short status line with an icon (lookup results, access requests). */
function Notice({ tone, icon, children }: { tone: keyof typeof NOTICE_TONES; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] font-semibold leading-snug", NOTICE_TONES[tone])}>
      <span className="mt-px shrink-0" aria-hidden="true">
        {icon}
      </span>
      <p>{children}</p>
    </div>
  );
}

/** A checkbox inside a large tappable tile; the whole tile is the label. */
function CheckTile({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-[13.5px] leading-snug text-text transition-colors",
          checked ? "border-primary-line bg-primary-softer" : error ? "border-danger" : "border-border hover:border-border-strong",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-px size-[18px] shrink-0 rounded border-border accent-[var(--primary)]"
        />
        <span>{children}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The step's main action: pinned to the bottom of the screen on phones, inline from 640 px. */
function StickyActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 -mb-4 rounded-b-2xl border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 sm:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
