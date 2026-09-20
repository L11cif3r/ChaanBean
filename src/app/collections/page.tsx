import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CollectionsPage() {
  redirect("/payment-recovery");
}
