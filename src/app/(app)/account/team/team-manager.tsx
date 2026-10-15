"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, FormField, Input, PageHeader, Select, Skeleton, Tag } from "@/components/ui";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => { setFields({}); setInviteOpen(true); }} disabled={!team || full}>
            {t("inviteUser")}
          </Button>
        }
      />

      {team ? (
        <p className="text-sm text-muted">
          {t("seats", { used: team.seats.used, limit: team.seats.limit })}
          {full ? (
            <>
              {" · "}
              <ButtonLink href="/account/billing" variant="ghost" size="sm">
                {t("upgrade")}
              </ButtonLink>
            </>
          ) : null}
        </p>
      ) : null}

      {team?.requests.length ? (
        <Card>
          <CardHeader title={t("requestsTitle")} />
          <ul className="divide-y divide-border">
            {team.requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{r.name}</p>
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

      <Card>
        <CardHeader title={t("membersTitle")} />
        {!team ? (
          <CardBody className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-xs font-semibold text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5">{t("name")}</th>
                  <th scope="col" className="hidden px-4 py-2.5 md:table-cell">{t("mobile")}</th>
                  <th scope="col" className="hidden px-4 py-2.5 lg:table-cell">{t("email")}</th>
                  <th scope="col" className="px-4 py-2.5">{t("role")}</th>
                  <th scope="col" className="px-4 py-2.5">{t("status")}</th>
                  <th scope="col" className="hidden px-4 py-2.5 md:table-cell">{t("lastActive")}</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">{t("actions")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.members.map((m) => {
                  const editable = m.role !== "owner" && !m.isYou;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-text">{m.name || "—"}</span>
                        {m.isYou ? <span className="ml-2 text-xs text-muted">{t("you")}</span> : null}
                      </td>
                      <td className="hidden px-4 py-3 tabular-nums md:table-cell">{m.mobile}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">{m.email || "—"}</td>
                      <td className="px-4 py-3">
                        {editable && m.status === "active" ? (
                          <Select
                            id={`role-${m.id}`}
                            aria-label={t("changeRole", { name: m.name })}
                            className="h-8 w-28"
                            value={m.role}
                            onChange={(e) => void act(`/api/v1/team/members/${m.id}`, "PATCH", { role: e.target.value }, t("roleChanged"))}
                          >
                            {(["admin", "member", "viewer"] as const).map((r) => (
                              <option key={r} value={r}>{t(`roles.${r}`)}</option>
                            ))}
                          </Select>
                        ) : (
                          t(`roles.${m.role}`)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Tag tone={m.status === "active" ? "success" : "neutral"}>{t(`statuses.${m.status}`)}</Tag>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted md:table-cell">
                        {m.lastActive ? formatDateTimeIst(new Date(m.lastActive)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editable ? (
                          m.status === "active" ? (
                            <Button size="sm" variant="ghost" onClick={() => setConfirm({ id: m.id, name: m.name })}>
                              {t("deactivate")}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/team/members/${m.id}`, "PATCH", { status: "active" }, t("reactivated"))}>
                              {t("reactivate")}
                            </Button>
                          )
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {team?.invites.length ? (
        <Card>
          <CardHeader title={t("invitesTitle")} />
          <ul className="divide-y divide-border">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text">
                    {i.name} <span className="font-normal text-muted">· {t(`roles.${i.role}`)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {i.mobile}
                    {i.email ? ` · ${i.email}` : ""} · {i.expired ? t("expired") : t("expires", { date: formatDateTimeIst(new Date(i.expiresAt)) })}
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

      <details className="rounded-xl border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-text">{t("permissionsTitle")}</summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th scope="col" className="px-4 py-2">{t("capability")}</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2 text-center">{t(`roles.${r}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(CAPABILITIES) as (keyof typeof CAPABILITIES)[]).map((c) => (
                <tr key={c}>
                  <td className="px-4 py-2 text-text">{t(`capabilities.${c.replace(".", "_")}`)}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      {(CAPABILITIES[c] as readonly Role[]).includes(r) ? <span aria-label={t("yes")}>✓</span> : <span className="text-subtle" aria-label={t("no")}>—</span>}
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
        <div className="space-y-4">
          <p className="text-muted">{t("inviteHelp")}</p>
          <FormField id="inv-name" label={t("name")} error={fields.fullName} required>
            <Input id="inv-name" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
          </FormField>
          <FormField id="inv-mobile" label={t("mobile")} error={fields.mobile} required>
            <Input id="inv-mobile" inputMode="numeric" value={invite.mobile} onChange={(e) => setInvite({ ...invite, mobile: e.target.value })} />
          </FormField>
          <FormField id="inv-email" label={t("email")} error={fields.email} required>
            <Input id="inv-email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </FormField>
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
