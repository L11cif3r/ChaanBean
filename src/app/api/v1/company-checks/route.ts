import { after } from "next/server";
import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok, readJson } from "@/lib/company-check/http";
import { getWallet, listChecks, runCheck, startCheck } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // the background fetch continues after the 202 response

// POST /api/v1/company-checks  (PRD §14 #4) — charges the wallet, returns 202, fetches in the background
export async function POST(req: Request) {
  try {
    const ctx = await requireContext(req);
    const body = await readJson(req);
    const { check, replayed } = await startCheck(ctx, body, req.headers.get("idempotency-key") ?? "");
    if (!replayed && check.status === "QUEUED") after(() => runCheck(check.id));
    const wallet = await getWallet(ctx);
    return ok(
      {
        id: check.id,
        status: check.status,
        charge_status: check.charge_status,
        charged_paise: check.charge_status === "CHARGED" ? check.price_paise + check.gst_paise : 0n,
        wallet_balance_paise: wallet.balance_paise,
        replayed,
      },
      replayed ? 200 : 202,
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// GET /api/v1/company-checks?page=&band=&from=&to=  (PRD §14 #11)
export async function GET(req: Request) {
  try {
    const ctx = await requireContext(req);
    const sp = new URL(req.url).searchParams;
    return ok(
      await listChecks(ctx, {
        page: Number(sp.get("page") ?? 1) || 1,
        band: sp.get("band") ?? undefined,
        from: sp.get("from") ?? undefined,
        to: sp.get("to") ?? undefined,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
