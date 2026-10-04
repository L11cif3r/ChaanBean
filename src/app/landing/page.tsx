import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "ChaanBean | Credit check, payment recovery and legal for MSMEs",
  description:
    "Check a buyer before you supply, get alerts when their situation changes, automate payment reminders in 9 Indian languages and recover dues under the MSMED Act.",
};

export default function Page() {
  return <LandingPage />;
}
