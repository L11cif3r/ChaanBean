import type { Metadata } from "next";
import { LegalDraft } from "@/components/shell/legal-draft";

export const metadata: Metadata = { title: "Terms of Use" };

export default function Page() {
  return <LegalDraft kind="terms" />;
}
