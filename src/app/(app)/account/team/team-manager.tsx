"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Mail, ShieldCheck, Smartphone, UserPlus, Users } from "lucide-react";
import { Button, ButtonLink, Card, CardHeader, EmptyState, FormField, GradientText, Input, PageHeader, Select, Skeleton, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDateTimeIst } from "@/lib/dates";
import { CAPABILITIES, ROLES, type Role } from "@/lib/permissions";
import { normaliseMobile } from "@/lib/validators";

// PRD S18: who in the organisation can use Chaanbean and what they can do.

export interface Team {
  seats: { limit: number; used: number; active: number; pending: number };
  members: { id: string; name: string; mobile: string; email: string; role: Role; status: string; lastActive: string | null; isYou: boolean }[];
  invites: { id: string; name: string; role: Role; mobile: string; email: string | null; expiresAt: string; expired: boolean }[];
  requests: { id: string; name: string; mobile: string; requestedAt: string }[];
}

const emptyInvite = { fullName: "", mobile: "", email: "", role: "member" as "admin" | "member" | "viewer" };

export function TeamManager({ initial }: { initial: Team }) {
  const t = useTranslations("team");
  const toast = useToast();
  const [team, setTeam] = useState<Team | null>(initial);
  const [denied, setDenied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<Team>("/api/v1/team");
    if (res.ok) setTeam(res.data);
    else if (res.error.status === 403) setDenied(true);
    else toast(res.error.message, "danger");
  }, [toast]);

  async function act(path: string, method: string, body: unknown, done: string) {
    const res = await api(path, { method, body });
    if (!res.ok) return toast(res.error.message, "danger");
    toast(done, "success");
    await load();
  }

  async function sendInvite() {
    const errs: Record<string, string> = {};
    if (invite.fullName.trim().length < 2) errs.fullName = t("errName");
    if (!normaliseMobile(invite.mobile)) errs.mobile = t("errMobile");
    if (!/^\S+@\S+\.\S+$/.test(invite.email)) errs.email = t("errEmail");
    setFields(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await api("/api/v1/team/invites", { body: invite });
    setBusy(false);
    if (!res.ok) {
      setFields(res.error.fields ?? {});
      if (!res.error.fields) toast(res.error.message, "danger");
      return;
    }
    setInviteOpen(false);
    setInvite(emptyInvite);
    toast(t("invited"), "success");
    await load();
  }

  if (denied) {
    return (
      <Card>
        <EmptyState title={t("noAccessTitle")} body={t("noAccessBody")} />
      </Card>
    );
  }

  const full = team ? team.seats.used >= team.seats.limit : false;

  const seatPct = team ? Math.min(100, Math.round((team.seats.used / Math.max(1, team.seats.limit)) * 100)) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={<>{t("titleLead")} <GradientText>{t("titleAccent")}</GradientText></>}
        description={t("description")}
        actions={
          <Button icon={<UserPlus />} onClick={() => { setFields({}); setInviteOpen(true); }} disabled={!team || full}>
            {t("inviteUser")}
          </Button>
        }
      />

      {team ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
            <Users size={17} />
          </span>
          <div className="min-w-[10rem] flex-1">
            <p className="text-sm font-semibold text-text">{t("seats", { used: team.seats.used, limit: team.seats.limit })}</p>
            <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
              <div className={cn("h-full rounded-full", seatPct >= 100 ? "bg-danger" : "bg-brand")} style={{ width: `${seatPct}%` }} />
            </div>
          </div>
          {full ? (
            <ButtonLink href="/account/billing" variant="secondary" size="sm">
              {t("upgrade")}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      {team?.requests.length ? (
        <Card>
          <CardHeader title={t("requestsTitle")} action={<Tag tone="info">{team.requests.length}</Tag>} />
          <ul className="divide-y divide-border">
            {team.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={r.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{r.name}</p>
                  <p className="text-xs text-muted">{r.mobile} · {formatDateTimeIst(new Date(r.requestedAt))}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setInvite({ ...emptyInvite, fullName: r.name }); setFields({}); setInviteOpen(true); }}>
                    {t("invite")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/team/requests/${r.id}/decline`, "POST", {}, t("declined"))}>
                    {t("decline")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section aria-labelledby="members-title" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="members-title" className="font-head text-[15px] font-bold text-text">{t("membersTitle")}</h2>
          {team ? <span className="text-xs text-muted">{t("activeCount", { count: team.seats.active })}</span> : null}
        </div>
        {!team ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (
          // Cards keep table semantics (rows and cells) so screen readers and the e2e tests still find each user's row.
          <div role="table" aria-labelledby="members-title">
            <div role="rowgroup" className="grid gap-3 md:grid-cols-2">
              {team.members.map((m) => {
                const editable = m.role !== "owner" && !m.isYou;
                const inactive = m.status !== "active";
                return (
                  <div
                    key={m.id}
                    role="row"
                    className={cn(
                      "flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary-line hover:shadow-md",
                      inactive && "bg-surface-muted",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={m.name} muted={inactive} />
                      <div role="cell" className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">
                          {m.name || "—"}
                          {m.isYou ? <span className="ml-1.5 text-xs font-normal text-muted">{t("you")}</span> : null}
                        </p>
                        <p className="truncate text-xs text-muted">
                          <span className="tabular-nums">{m.mobile}</span>
                          {m.email ? <> · {m.email}</> : null}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-subtle">
                          {m.lastActive ? t("lastActiveAt", { date: formatDateTimeIst(new Date(m.lastActive)) }) : t("neverActive")}
                        </p>
                      </div>
                      <div role="cell" className="shrink-0">
                        <Tag tone={m.status === "active" ? "success" : "neutral"}>{t(`statuses.${m.status}`)}</Tag>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div role="cell" className="flex items-center gap-2">
                        {editable && m.status === "active" ? (
                          <Select
                            id={`role-${m.id}`}
                            aria-label={t("changeRole", { name: m.name })}
                            className="h-9 w-32 rounded-lg text-[13px] font-semibold"
                            value={m.role}
                            onChange={(e) => void act(`/api/v1/team/members/${m.id}`, "PATCH", { role: e.target.value }, t("roleChanged"))}
                          >
                            {(["admin", "member", "viewer"] as const).map((r) => (
                              <option key={r} value={r}>{t(`roles.${r}`)}</option>
                            ))}
                          </Select>
                        ) : (
                          <RoleTag role={m.role} label={t(`roles.${m.role}`)} />
                        )}
                      </div>
                      <div role="cell">
                        {editable ? (
                          m.status === "active" ? (
                            <Button size="sm" variant="ghost" onClick={() => setConfirm({ id: m.id, name: m.name })}>
                              {t("deactivate")}
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => void act(`/api/v1/team/members/${m.id}`, "PATCH", { status: "active" }, t("reactivated"))}>
                              {t("reactivate")}
                            </Button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {team?.invites.length ? (
        <Card>
          <CardHeader title={t("invitesTitle")} action={<Tag tone="warning">{team.invites.length}</Tag>} />
          <ul className="divide-y divide-border">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-strong text-muted" aria-hidden="true">
                  <Mail size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                    {i.name} <RoleTag role={i.role} label={t(`roles.${i.role}`)} />
                  </p>
                  <p className="truncate text-xs text-muted">
                    {i.mobile}
                    {i.email ? ` · ${i.email}` : ""} · <span className={i.expired ? "font-semibold text-danger-fg" : undefined}>{i.expired ? t("expired") : t("expires", { date: formatDateTimeIst(new Date(i.expiresAt)) })}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void act(`/api/v1/team/invites/${i.id}/resend`, "POST", {}, t("resent"))}>
                    {t("resend")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/team/invites/${i.id}`, "DELETE", undefined, t("revoked"))}>
                    {t("revoke")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <details className="group rounded-2xl border border-border bg-surface shadow-sm">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-text sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true">
              <ShieldCheck size={15} />
            </span>
            {t("permissionsTitle")}
          </span>
          <ChevronDown size={16} className="text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("capability")}</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-center font-medium">{t(`roles.${r}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(CAPABILITIES) as (keyof typeof CAPABILITIES)[]).map((c) => (
                <tr key={c} className="transition-colors hover:bg-hover">
                  <td className="px-4 py-2 text-text">{t(`capabilities.${c.replace(".", "_")}`)}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      {(CAPABILITIES[c] as readonly Role[]).includes(r) ? (
                        <Check size={14} className="inline text-success-fg" aria-label={t("yes")} />
                      ) : (
                        <span className="text-subtle" aria-label={t("no")}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t("inviteTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={busy}>{t("cancel")}</Button>
            <Button onClick={() => void sendInvite()} loading={busy}>{t("sendInvite")}</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-muted">
            <Smartphone size={14} className="mt-px shrink-0 text-primary-text" aria-hidden="true" />
            {t("inviteHelp")}
          </p>
          <FormField id="inv-name" label={t("name")} error={fields.fullName} required>
            <Input id="inv-name" autoComplete="name" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
          </FormField>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField id="inv-mobile" label={t("mobile")} error={fields.mobile} required>
              <Input id="inv-mobile" inputMode="numeric" autoComplete="tel" value={invite.mobile} onChange={(e) => setInvite({ ...invite, mobile: e.target.value })} />
            </FormField>
            <FormField id="inv-email" label={t("email")} error={fields.email} required>
              <Input id="inv-email" type="email" autoComplete="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </FormField>
          </div>
          <FormField id="inv-role" label={t("role")} error={fields.role} required>
            <Select id="inv-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as typeof invite.role })}>
              {(["admin", "member", "viewer"] as const).map((r) => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm!;
          setConfirm(null);
          void act(`/api/v1/team/members/${c.id}`, "PATCH", { status: "deactivated" }, t("deactivated"));
        }}
        title={t("deactivateTitle", { name: confirm?.name ?? "" })}
        body={t("deactivateBody")}
        confirmLabel={t("deactivate")}
        destructive
      />
    </div>
  );
}

/** Initials in a soft tile, as the card's anchor. */
function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold", muted ? "bg-surface-strong text-muted" : "bg-soft text-primary-text")}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

const ROLE_TONE: Record<Role, "warning" | "info" | "neutral" | "success"> = { owner: "warning", admin: "info", member: "success", viewer: "neutral" };

function RoleTag({ role, label }: { role: Role; label: string }) {
  return <Tag tone={ROLE_TONE[role]}>{label}</Tag>;
}
