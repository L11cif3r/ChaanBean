import "server-only";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";

// Chaanbean staff (Ops). Until staff sign-in with two-factor and the IP allow-list arrive (Part 10), Ops is the
// signed-in users whose mobile is listed in OPS_MOBILES (comma separated, 10 digits). Nobody else sees /admin data.

const opsMobiles = () => (process.env.OPS_MOBILES ?? "").split(",").map((m) => m.replace(/\D/g, "").slice(-10)).filter((m) => m.length === 10);

export async function opsUser() {
  const ctx = await getContext();
  if (!ctx.user) return { ctx, ops: false as const, signedIn: false };
  const phone = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
  return { ctx, ops: opsMobiles().includes(phone), signedIn: true };
}

export async function requireOps() {
  const u = await opsUser();
  if (!u.ops) throw new AppError("forbidden", "Only Chaanbean staff can do this.");
  return u.ctx;
}
