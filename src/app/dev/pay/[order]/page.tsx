import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardBody, PageHeader, Skeleton } from "@/components/ui";
import { formatInr } from "@/lib/money";
import { getContext } from "@/server/context";
import { sql } from "@/server/db/sql";
import { MockCheckout } from "./mock-checkout";

// Development only: the mock payment gateway's checkout page. Paying or failing here delivers a signed webhook through
// the real webhook handler, so everything after it behaves as with a real gateway.
export const metadata: Metadata = { title: "Mock checkout" };

async function Order({ params, searchParams }: PageProps<"/dev/pay/[order]">) {
  const { order } = await params;
  const ctx = await getContext();
  if (!ctx.orgId) notFound();
  const [o] = await sql()<{ purpose: string; total_paise: string; status: string; legal_name: string }[]>`
    select p.purpose::text, p.total_paise, p.status::text, o.legal_name
      from public.payment_orders p join public.organisations o on o.id = p.org_id
     where p.provider = 'mock' and p.provider_order_id = ${order} and p.org_id = ${ctx.orgId}`;
  if (!o) notFound();
  const ret = (await searchParams).return;
  return (
    <Card>
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted">Merchant</dt>
          <dd>Chaanbean</dd>
          <dt className="text-muted">Customer</dt>
          <dd>{o.legal_name}</dd>
          <dt className="text-muted">For</dt>
          <dd>{o.purpose === "plan" ? "Plan subscription" : "Wallet top-up"}</dd>
          <dt className="text-muted">Amount</dt>
          <dd className="text-lg font-extrabold">{formatInr(BigInt(o.total_paise), { withPaise: true })}</dd>
          <dt className="text-muted">Status</dt>
          <dd>{o.status}</dd>
        </dl>
        <MockCheckout providerOrderId={order} returnUrl={typeof ret === "string" ? ret : "/account/billing"} done={o.status !== "created"} />
      </CardBody>
    </Card>
  );
}

export default function MockPayPage(props: PageProps<"/dev/pay/[order]">) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <PageHeader title="Mock payment gateway" description="Development only. No money moves. Choose what the gateway reports back." />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <Order {...props} />
      </Suspense>
    </main>
  );
}
