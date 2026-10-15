import type { Metadata } from "next";
import { LegalDraft } from "@/components/shell/legal-draft";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function Page() {
  return <LegalDraft kind="privacy" />;
}
