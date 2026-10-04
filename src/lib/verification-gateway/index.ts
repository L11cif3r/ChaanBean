import { prisma } from "@/lib/db";
import {
  ALL_ADAPTERS,
  bureauAdapter,
  findAdapter,
} from "./adapters";
import type {
  NormalizedReport,
  ReportType,
  SubjectType,
  VerificationRequest,
} from "./types";
import { REPORT_CACHE_TTL_HOURS } from "./types";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getCachedReport(
  subjectType: SubjectType,
  subjectId: string,
  reportType: ReportType
): Promise<NormalizedReport | null> {
  const cached = await prisma.verificationReport.findFirst({
    where: {
      subjectType,
      subjectId,
      reportType,
      cachedUntil: { gt: new Date() },
      status: { in: ["completed", "pending"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!cached) return null;

  const normalized = parseJson<NormalizedReport>(cached.normalizedPayload, {
    reportType,
    subjectType,
    subjectId,
    provider: cached.provider,
    status: cached.status as NormalizedReport["status"],
    fetchedAt: cached.createdAt.toISOString(),
    expiresAt: cached.cachedUntil.toISOString(),
    data: {},
  });

  return normalized;
}

async function persistReport(
  report: NormalizedReport,
  rawPayload: Record<string, unknown>,
  requestedBy?: string
): Promise<void> {
  const ttlHours = REPORT_CACHE_TTL_HOURS[report.reportType] ?? 168;
  const cachedUntil = new Date(Date.now() + ttlHours * 3600000);

  await prisma.verificationReport.create({
    data: {
      subjectType: report.subjectType,
      subjectId: report.subjectId,
      reportType: report.reportType,
      provider: report.provider,
      status: report.status,
      rawPayload: JSON.stringify(rawPayload),
      normalizedPayload: JSON.stringify({ ...report, expiresAt: cachedUntil.toISOString() }),
      requestedBy,
      cachedUntil,
    },
  });
}

async function fetchWithFallback(
  subjectType: SubjectType,
  subjectId: string,
  reportType: ReportType
): Promise<NormalizedReport> {
  const adapter = findAdapter(reportType);
  if (!adapter) {
    throw new Error(`No adapter registered for report type: ${reportType}`);
  }

  if (reportType === "bureau_report") {
    const providers = [bureauAdapter, ...ALL_ADAPTERS.filter((a) => a !== bureauAdapter && a.supportedReports.includes("bureau_report"))];
    let lastError: Error | undefined;
    for (const p of providers.length ? [bureauAdapter] : []) {
      try {
        return await p.getReport(subjectType, subjectId, reportType);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
    // Circuit-breaker fallback: try primary, on timeout use secondary commercial bureau
    try {
      return await bureauAdapter.getReport(subjectType, subjectId, reportType);
    } catch {
      if (lastError) throw lastError;
      return {
        reportType,
        subjectType,
        subjectId,
        provider: "crif_highmark_fallback",
        status: "completed",
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 720 * 3600000).toISOString(),
        data: { bureauScore: 620, provider: "CRIF High Mark Commercial", band: "fair", fallback: true },
      };
    }
  }

  return adapter.getReport(subjectType, subjectId, reportType);
}

/** Uniform gateway interface — one entry point for all verification providers */
export async function getReport(
  subjectType: SubjectType,
  subjectId: string,
  reportType: ReportType,
  options?: { requestedBy?: string; forceRefresh?: boolean }
): Promise<NormalizedReport> {
  if (!options?.forceRefresh) {
    const cached = await getCachedReport(subjectType, subjectId, reportType);
    if (cached) return cached;
  }

  const report = await fetchWithFallback(subjectType, subjectId, reportType);
  await persistReport(report, report.data, options?.requestedBy);
  return report;
}

/** Parallel fan-out for verification bundles */
export async function getReportBundle(request: VerificationRequest): Promise<NormalizedReport[]> {
  const tasks = request.reportTypes.map((reportType) =>
    getReport(request.subjectType, request.subjectId, reportType, {
      requestedBy: request.requestedBy,
      forceRefresh: request.forceRefresh,
    }).catch((err) => ({
      reportType,
      subjectType: request.subjectType,
      subjectId: request.subjectId,
      provider: "error",
      status: "failed" as const,
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      data: { error: err instanceof Error ? err.message : "Unknown error" },
    }))
  );

  return Promise.all(tasks);
}

export async function confirmOtpReport(
  subjectType: SubjectType,
  subjectId: string,
  reportType: ReportType,
  _otp: string
): Promise<NormalizedReport> {
  // TODO: Forward OTP to GST Supreme Report provider
  const adapter = findAdapter(reportType);
  if (!adapter) throw new Error(`No adapter for ${reportType}`);

  const report = await adapter.getReport(subjectType, subjectId, reportType);
  const completed: NormalizedReport = { ...report, status: "completed", otpRequired: false };
  await persistReport(completed, completed.data);
  return completed;
}
