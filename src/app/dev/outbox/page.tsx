import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardBody, PageHeader, Skeleton, Tag } from "@/components/ui";
import { formatDateTimeIst } from "@/lib/dates";
import { sql } from "@/server/db/sql";

// Development outbox: messages that Part 6 will send by SMS, email or WhatsApp. Links in them can be clicked here.
export const metadata: Metadata = { title: "Outbox" };

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-text">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} className="font-semibold text-primary-text underline underline-offset-2">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  );
}

async function Messages() {
  await connection();
  const rows = await sql()<{ id: string; channel: string; recipient_masked: string; template: string; subject: string | null; body: string; created_at: Date }[]>`
    select id, channel, recipient_masked, template, subject, body, created_at
      from app_private.outbox_messages order by id desc limit 50`;
  if (!rows.length) return <p className="text-sm text-muted">No messages yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card key={m.id}>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Tag tone="info">{m.channel}</Tag>
              <span>{m.template}</span>
              <span>· {m.recipient_masked}</span>
              <span>· {formatDateTimeIst(m.created_at)}</span>
            </div>
            {m.subject ? <p className="text-sm font-semibold text-text">{m.subject}</p> : null}
            <Linkified text={m.body} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function OutboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader title="Outbox" description="Development only. These messages are not sent until Part 6 connects SMS, email and WhatsApp." />
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <Messages />
      </Suspense>
    </main>
  );
}
