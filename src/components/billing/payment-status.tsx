"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, Spinner } from "@/components/ui";
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
      <Card>
        <CardBody className="flex items-start gap-3">
          <span className="mt-0.5 text-primary-text">{timedOut ? null : <Spinner />}</span>
          <div role="status" className="space-y-1">
            <p className="font-bold text-text">{t("confirming")}</p>
            <p className="text-sm text-muted">{timedOut ? t("stillPending", { reference: reference ?? orderId.slice(0, 8).toUpperCase() }) : t("confirmingBody")}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (order.status === "paid") {
    return (
      <Card className="border-success-fg/30">
        <CardBody className="space-y-3">
          <div role="status" className="space-y-1">
            <p className="font-bold text-success-fg">{t("paid")}</p>
            <p className="text-sm text-text-2">
              {order.purpose === "plan" ? t("paidPlan") : t("paidTopup", { amount: formatInr(BigInt(order.totalPaise), { withPaise: true }) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.invoiceId ? (
              <a href={`/api/v1/billing/invoices/${order.invoiceId}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center rounded-xl border border-border bg-surface px-4 text-xs font-bold text-text-2 shadow-sm hover:border-primary hover:text-primary-text">
                {t("viewInvoice")}
              </a>
            ) : null}
            {doneHref ? (
              <ButtonLink href={doneHref} size="sm">
                {t("goToDashboard")}
              </ButtonLink>
            ) : (
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {t("dismiss")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-danger-fg/30">
      <CardBody className="space-y-3">
        <div role="alert" className="space-y-1">
          <p className="font-bold text-danger-fg">{t("failed")}</p>
          <p className="text-sm text-text-2">{order.failureReason ?? t("failedFallback")}</p>
        </div>
        <Button size="sm" onClick={dismiss}>
          {t("retry")}
        </Button>
      </CardBody>
    </Card>
  );
}
