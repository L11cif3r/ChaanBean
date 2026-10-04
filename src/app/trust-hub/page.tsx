import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrustHubPage() {
  redirect("/background-check");
}
