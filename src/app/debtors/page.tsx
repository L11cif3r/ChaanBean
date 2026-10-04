import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DebtorsPage() {
  redirect("/business-check");
}
