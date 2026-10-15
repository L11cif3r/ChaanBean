"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardBody, Checkbox, ErrorSummary, FormField, Input, Select, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { isValidGstin, isValidPan, normaliseIdentifier } from "@/lib/validators";

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

function Steps({ current }: { current: 1 | 2 }) {
  const t = useTranslations("signup");
  const steps = [t("stepMobile"), t("stepBusiness"), t("stepProfile"), t("stepPlan")];
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium" aria-label={t("progress")}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                done ? "border-primary bg-primary text-primary-on" : active ? "border-primary text-primary" : "border-border-strong text-muted",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "text-text" : "text-muted"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-text">{children}</dd>
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
    <div className="grid gap-4 sm:grid-cols-2">
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-text sm:text-2xl">{t("title")}</h1>
        <Steps current={step} />
      </div>
      {errorList.length ? <ErrorSummary title={t("fixErrors")} errors={errorList} /> : null}

      {step === 1 ? (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <div className="inline-flex rounded-lg border border-border-strong p-1" role="radiogroup" aria-label={t("verifyWith")}>
              {(["gstin", "pan"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    setMode(m);
                    reset();
                  }}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-primary text-primary-on" : "text-muted hover:text-text")}
                >
                  {t(m === "gstin" ? "useGstin" : "usePan")}
                </button>
              ))}
            </div>

            {mode === "gstin" ? (
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-start"
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchGst();
                }}
              >
                <FormField id="gstin" label={t("gstin")} error={fields.gstin} required className="flex-1">
                  <Input id="gstin" value={gstin} maxLength={15} autoCapitalize="characters" placeholder="29ABCDE1234F1Z5" className="font-mono uppercase" onChange={(e) => setGstin(e.target.value.toUpperCase())} />
                </FormField>
                <Button type="submit" className="sm:mt-6" loading={busy && !gst} disabled={gstin.length < 15}>
                  {t("fetch")}
                </Button>
              </form>
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void verifyPanNow();
                }}
              >
                <FormField id="pan" label={t("pan")} error={fields.pan} required>
                  <Input id="pan" value={pan} maxLength={10} autoCapitalize="characters" placeholder="ABCDE1234F" className="font-mono uppercase" onChange={(e) => setPan(e.target.value.toUpperCase())} />
                </FormField>
                <FormField id="panName" label={t("nameOnPan")} error={fields.panName} required>
                  <Input id="panName" value={panName} onChange={(e) => setPanName(e.target.value)} />
                </FormField>
                <div className="sm:col-span-2">
                  <Button type="submit" loading={busy && !panResult} disabled={pan.length < 10}>
                    {t("verifyPan")}
                  </Button>
                </div>
              </form>
            )}

            {mode === "gstin" && gst ? (
              <section aria-live="polite" className="space-y-4 border-t border-border pt-5">
                {gst.state === "already_registered" ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text">{t("alreadyRegistered")}</p>
                    {accessRequested ? (
                      <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success-fg">{t("accessRequested")}</p>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <FormField id="requester" label={t("yourName")} error={fields.requester ?? fields.name} className="flex-1">
                          <Input id="requester" value={requester} onChange={(e) => setRequester(e.target.value)} />
                        </FormField>
                        <Button variant="secondary" className="sm:mt-6" onClick={() => void askForAccess()} loading={busy}>
                          {t("requestAccess")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}

                {details ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-text">{t("fromRecords")}</h2>
                      <Tag tone={details.status === "Active" ? "success" : "danger"}>{details.status}</Tag>
                      {gst.sampleData ? <Tag tone="warning">{t("sampleData")}</Tag> : null}
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Detail label={t("legalName")}>{details.legalName}</Detail>
                      <Detail label={t("tradeName")}>{details.tradeName ?? "—"}</Detail>
                      <Detail label={t("constitution")}>{details.constitution}</Detail>
                      <Detail label={t("registered")}>{formatDate(details.registrationDate)}</Detail>
                      <Detail label={t("state")}>{details.stateName}</Detail>
                      <Detail label={t("taxpayerType")}>{details.taxpayerType}</Detail>
                      <div className="sm:col-span-2">
                        <Detail label={t("principalAddress")}>
                          {[details.address.line, details.address.city, details.address.state, details.address.pincode].filter(Boolean).join(", ")}
                        </Detail>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {gst.state === "cancelled" || gst.state === "suspended" ? (
                  <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                    {t("statusBlocked", { status: details?.status ?? "", date: details?.statusDate ? formatDate(details.statusDate) : "—" })}
                  </p>
                ) : null}
                {gst.state === "not_found" ? <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">{t("notFound")}</p> : null}
                {gst.state === "provider_unavailable" ? (
                  <p className="rounded-lg bg-info-bg px-3 py-2 text-sm text-info-fg">{t("providerDown")}</p>
                ) : null}

                {gst.state === "not_found" || gst.state === "provider_unavailable" ? manualFields : null}

                {needsDocument ? (
                  <FormField id="file" label={t("uploadCertificate")} hint={t("uploadHint")} error={fields.file} required>
                    <input
                      id="file"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                    {doc ? <p className="text-xs text-success-fg">{t("uploaded", { name: doc.name })}</p> : null}
                  </FormField>
                ) : null}
              </section>
            ) : null}

            {mode === "pan" && panResult ? (
              <section aria-live="polite" className="space-y-4 border-t border-border pt-5">
                {panResult.state === "already_registered" ? (
                  <p className="text-sm font-medium text-text">{t("alreadyRegistered")}</p>
                ) : panResult.details ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone="success">{t("panVerified")}</Tag>
                      {panResult.sampleData ? <Tag tone="warning">{t("sampleData")}</Tag> : null}
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Detail label={t("nameOnPan")}>{panResult.details.nameOnPan}</Detail>
                      <Detail label={t("holderType")}>{panResult.details.holderType}</Detail>
                    </dl>
                    <FormField id="businessName" label={t("businessName")} error={fields.businessName} required>
                      <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </FormField>
                    {manualFields}
                  </>
                ) : null}
              </section>
            ) : null}

            <div className="flex justify-end border-t border-border pt-5">
              <Button disabled={!canContinue} onClick={() => { reset(); setStep(2); }}>
                {t("continue")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-text">{t("yourDetails")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-3">
              <Checkbox id="authority" label={t("authority")} checked={authority} onChange={(e) => setAuthority(e.target.checked)} />
              {fields.authority ? <p className="text-xs font-medium text-danger-fg">{fields.authority}</p> : null}
              <Checkbox
                id="terms"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label={t.rich("terms", {
                  terms: (c) => (
                    <a href="/legal/terms" target="_blank" className="underline underline-offset-2">
                      {c}
                    </a>
                  ),
                  privacy: (c) => (
                    <a href="/legal/privacy" target="_blank" className="underline underline-offset-2">
                      {c}
                    </a>
                  ),
                })}
              />
              {fields.terms ? <p className="text-xs font-medium text-danger-fg">{fields.terms}</p> : null}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => { reset(); setStep(1); }}>
                {t("back")}
              </Button>
              <Button onClick={() => void submit()} loading={busy}>
                {needsDocument ? t("submitForReview") : t("createAccount")}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
