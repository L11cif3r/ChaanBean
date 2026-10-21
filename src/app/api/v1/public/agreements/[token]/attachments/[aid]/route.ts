import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { agreementAttachment } from "@/server/transactions/public";
import { fileResponse } from "@/server/transactions/routes";

export const GET = route({ auth: "public" }, async ({ params }) => {
  const f = await agreementAttachment(tokenOf(params), String(params.aid));
  return fileResponse(f.bytes, f.name, f.type);
});
