"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleCheck, CircleX, Clock, FileText, IdCard, RotateCcw } from "lucide-react";
import { Button, ButtonLink, buttonClass, Card, CardBody, Spinner } from "@/components/ui";
import { api } from "@/lib/api-client";
import { formatInr } from "@/lib/money";

// S03 states after returning from the gateway: "We are confirming your payment" for up to 2 minutes while the webhook
// arrives, then paid (with the invoice) or failed (with the gateway's reason and Retry).

interface Order {
  status: "created" | "paid" | "failed" | "cancelled";
  purpose: "plan" | "topup";
  failureReason: string | null;
  totalPaise: number;
  invoiceId: string | null;
}

const POLL_MS = 2_000;
const GIVE_UP_MS = 120_000;

export function PaymentStatus({ orderId, doneHref }: { orderId: string; doneHref?: string }) {
  const t = useTranslations("billing.payment");
  const router = useRouter();
  const pathname = usePathname();
  const [order, setOrder] = useState<Order | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    async function poll() {
      const res = await api<Order>(`/api/v1/billing/orders/${orderId}`);
      if (stop) return;
      if (res.ok) {
        setOrder(res.data);
        if (res.data.status !== "created") return;
      } else {
        setReference(res.error.reference ?? null);
        if (res.error.status === 404 || res.error.status === 403) return setOrder({ status: "failed", purpose: "plan", failureReason: res.error.message, totalPaise: 0, invoiceId: null });
      }
      if (Date.now() - started > GIVE_UP_MS) return setTimedOut(true);
      setTimeout(poll, POLL_MS);
    }
    void poll();
    return () => {
      stop = true;
    };
  }, [orderId]);

  useEffect(() => {
    // The top bar and the page's own figures change once the payment is applied.
    if (order?.status === "paid" && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [order?.status, router]);

  const dismiss = () => router.replace(pathname);

  if (!order || order.status === "created") {
    return (
      <Card className="animate-rise">
        <CardBody className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
            {timedOut ? <Clock size={17} /> : <Spinner />}
          </span>
          <div role="status" className="min-w-0 space-y-0.5">
            <p className="font-head font-bold text-text">{t("confirming")}</p>
            <p className="text-[13px] text-muted">{timedOut ? t("stillPending", { reference: reference ?? orderId.slice(0, 8).toUpperCase() }) : t("confirmingBody")}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (order.status === "paid") {
    return (
      <Card className="animate-rise overflow-hidden border-success-fg/30">
        <CardBody className="space-y-3.5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-bg text-success-fg" aria-hidden="true">
              <CircleCheck size={18} />
            </span>
            <div role="status" className="min-w-0 space-y-0.5">
              <p className="font-head font-bold text-success-fg">{t("paid")}</p>
              <p className="text-[13px] text-text-2">
                {order.purpose === "plan" ? t("paidPlan") : t("paidTopup", { amount: formatInr(BigInt(order.totalPaise), { withPaise: true }) })}
              </p>
            </div>
          </div>
          {/* v4 11.2: KYC comes right after sign-up (not blocking yet, Q6). */}
          {order.purpose === "plan" && doneHref ? (
            <div className="flex flex-col gap-2.5 rounded-xl bg-soft px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <IdCard size={16} className="mt-0.5 shrink-0 text-primary-text" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">{t("kycTitle")}</p>
                  <p className="text-[12.5px] text-text-2">{t("kycBody")}</p>
                </div>
              </div>
              <ButtonLink href="/account/kyc" size="sm" variant="secondary" className="shrink-0">
                {t("kycCta")}
              </ButtonLink>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {doneHref ? (
              <ButtonLink href={doneHref} size="sm">
                {t("goToDashboard")}
                <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>
            ) : (
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {t("dismiss")}
              </Button>
            )}
            {order.invoiceId ? (
              <a href={`/api/v1/billing/invoices/${order.invoiceId}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
                <FileText size={15} aria-hidden="true" />
                {t("viewInvoice")}
              </a>
            ) : null}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="animate-rise border-danger-fg/30">
      <CardBody className="space-y-3.5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger-fg" aria-hidden="true">
            <CircleX size={18} />
          </span>
          <div role="alert" className="min-w-0 space-y-0.5">
            <p className="font-head font-bold text-danger-fg">{t("failed")}</p>
            <p className="text-[13px] text-text-2">{order.failureReason ?? t("failedFallback")}</p>
          </div>
        </div>
        <Button size="sm" onClick={dismiss}>
          <RotateCcw size={15} aria-hidden="true" />
          {t("retry")}
        </Button>
      </CardBody>
    </Card>
  );
}
