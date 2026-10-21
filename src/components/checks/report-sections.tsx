"use client";

import { useTranslations } from "next-intl";
import { Tag, type Tone } from "@/components/ui";
import { TurnoverChart } from "@/components/checks/turnover-chart";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import type { CibilData, CompanyData, CreditRatingData, DirectorData, GstSearchData, IecProfileData, IecTurnoverData, MsmeData, PanData, TurnoverData } from "@/lib/checks";
import { CibilVisual, FilingStrip, RatingScale, TradeChart } from "./report-charts";

// The body of each Credit Worthiness report section, shared by the report (S11) and the example preview shown before a
// company is chosen and in place of sections without data.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)));
const short = (paise: number) => formatInrShort(BigInt(Math.round(paise)));
const day = (iso: string) => formatDate(iso.length > 10 ? istDate(new Date(iso)) : iso);

export function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function statusTone(s: string): Tone {
  return s === "Active" ? "success" : "danger";
}

export function GstBody({ d }: { d: GstSearchData }) {
  const t = useTranslations("report");
  const onTime = d.filings.filter((f) => f.filed && f.onTime).length;
  return (
    <>
    {d.filings.length ? <FilingStrip filings={d.filings} /> : null}
    <Rows
      rows={[
        [t("status"), <Tag key="s" tone={statusTone(d.status)}>{d.status}</Tag>],
        [t("registered"), day(d.registrationDate)],
        [t("type"), d.constitution],
        [t("gstinsOnPan"), d.gstinsOnPan.length ? String(d.gstinsOnPan.length) : t("notInSource")],
        [t("lastReturn"), d.lastReturnPeriod ?? (d.filings.length ? "—" : t("notInSource"))],
        [t("onTime"), d.filings.length ? t("onTimeValue", { ok: onTime, total: d.filings.length }) : t("notInSource")],
        ...(d.natureOfBusiness?.length ? [[t("natureOfBusiness"), d.natureOfBusiness.length > 3 ? t("andMore", { list: d.natureOfBusiness.slice(0, 3).join(", "), count: d.natureOfBusiness.length - 3 }) : d.natureOfBusiness.join(", ")] as [string, string]] : []),
        ...(d.eInvoice != null ? [[t("eInvoice"), d.eInvoice ? t("yes") : t("no")] as [string, string]] : []),
        ...(d.otherPlaces != null && d.natureOfBusiness ? [[t("otherPlaces"), String(d.otherPlaces)] as [string, string]] : []),
        ...(d.jurisdiction ? [[t("jurisdiction"), d.jurisdiction] as [string, string]] : []),
      ]}
    />
    </>
  );
}

export function CompanyBody({ d }: { d: CompanyData }) {
  const t = useTranslations("report");
  const open = d.charges.filter((c) => c.status === "Open");
  return (
    <Rows
      rows={[
        [t("status"), <Tag key="s" tone={statusTone(d.status)}>{d.status}</Tag>],
        [t("cin"), <span key="c" className="break-all font-mono text-xs">{d.cin}</span>],
        [t("incorporated"), day(d.incorporationDate)],
        [t("capital"), short(d.paidUpCapitalPaise)],
        ...companyExtras(d, t),
        [t("charges"), d.chargesKnown === false ? t("notInSource") : t("openCharges", { count: open.length, amount: short(open.reduce((s, c) => s + c.amountPaise, 0)) })],
        [t("lastBalanceSheet"), d.lastBalanceSheetDate ? day(d.lastBalanceSheetDate) : d.chargesKnown === false ? t("notInSource") : "—"],
      ]}
    />
  );
}

/** The rest of the MCA master record: type of company, listed or not, Indian or foreign, business, registrar office. */
export function companyExtras(d: CompanyData, t: ReturnType<typeof useTranslations>): [string, string][] {
  const kind = [d.companyClass, d.category, d.subCategory].filter(Boolean).join(" · ");
  return [
    ...(kind ? [[t("companyKind"), kind] as [string, string]] : []),
    ...(d.listing ? [[t("listing"), d.listing] as [string, string]] : []),
    ...(d.origin ? [[t("origin"), /^india$/i.test(d.origin) ? t("originIndian") : d.origin] as [string, string]] : []),
    ...(d.activity ? [[t("activity"), d.activity] as [string, string]] : []),
    ...(d.nicCode ? [[t("nicCode"), d.nicCode] as [string, string]] : []),
    ...(d.registrar ? [[t("registrar"), d.registrar] as [string, string]] : []),
  ];
}

export function DirectorBody({ d }: { d: DirectorData }) {
  const t = useTranslations("report");
  return (
    <div>
      <p className="mb-2 font-bold text-text">{t("directors")}</p>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {d.directors.map((x) => (
          <li key={x.din} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <span className="font-semibold text-text">{x.name}</span> <span className="text-xs text-muted">· {x.designation} · DIN {x.din}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {t("otherCompanies", { count: x.otherCompanies })}
              {x.disqualified ? <Tag tone="danger">{t("disqualified")}</Tag> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RatingBody({ d }: { d: CreditRatingData }) {
  const t = useTranslations("report");
  if (!d.ratings.length) return <p className="text-muted">{t("notRated")}</p>;
  return (
    <>
    <RatingScale ratings={d.ratings} />
    <ul className="space-y-1.5">
      {d.ratings.map((r) => (
        <li key={r.agency + r.instrument} className="flex flex-wrap justify-between gap-2">
          <span className="text-text-2">{r.agency} · {r.instrument}</span>
          <span className="font-bold text-text">{r.rating} <span className="font-normal text-muted">({r.outlook}, {day(r.date)})</span></span>
        </li>
      ))}
    </ul>
    </>
  );
}

export function TurnoverBody({ d }: { d: TurnoverData }) {
  return <TurnoverChart d={d} />;
}

export function CibilBody({ d, title }: { d: CibilData; title: string | null }) {
  const t = useTranslations("report");
  const worst = Math.max(0, ...d.overdue.map((o) => o.daysPastDue));
  return (
    <div className="space-y-2">
    {title ? <p className="font-bold text-text">{title}</p> : null}
    <CibilVisual d={d} />
    <Rows
      rows={[
        [t("cibilRank"), `${d.bureau} ${d.scoreOrRank}`],
        [t("activeLoans"), `${d.activeLoans}, ${inr(d.sanctionedPaise)}`],
        [t("outstanding"), inr(d.outstandingPaise)],
        [t("overdueLoans"), d.overdue.length ? <Tag key="o" tone={worst >= 90 ? "danger" : "warning"}>{t("overdueValue", { count: d.overdue.length, days: worst })}</Tag> : t("noneOverdue")],
        [t("enquiries"), String(d.enquiries6m)],
      ]}
    />
    </div>
  );
}

/** v3 FR-CW-10: MSME, PAN check and Import export in one "Business identity" section. */
export function IdentityBody({ msme, pan, iec, trade }: { msme: MsmeData | null; pan: PanData | null; iec: IecProfileData | null; trade: IecTurnoverData | null }) {
  const t = useTranslations("report");
  const rows: [string, React.ReactNode][] = [];
  if (msme) rows.push([t("msme"), `${msme.udyamNumber} · ${t(`msmeCategory.${msme.category}`)} · ${msme.majorActivity}`]);
  if (pan) rows.push([t("panCheck"), <Tag key="p" className="whitespace-normal text-right" tone={pan.status === "Valid" ? "success" : "danger"}>{t("panStatus", { status: pan.status, name: pan.name })}</Tag>]);
  if (pan && pan.aadhaarLinked !== null) rows.push([t("aadhaarLinked"), pan.aadhaarLinked ? t("yes") : t("no")]);
  if (iec) rows.push([t("iecProfile"), `${iec.iec} · ${iec.status} · ${t("since", { date: day(iec.issuedOn) })}`]);
  if (trade?.years.length) {
    const last = trade.years[trade.years.length - 1];
    rows.push([t("iecTurnover", { fy: last.fy }), t("iecValue", { exports: short(last.exportPaise), imports: short(last.importPaise) })]);
  }
  if (!rows.length) return null;
  return (
    <div className="space-y-4">
      <Rows rows={rows} />
      {trade?.years.length ? <TradeChart d={trade} /> : null}
    </div>
  );
}
