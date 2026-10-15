import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmEmail } from "./confirm-email";

// S02 marker 6: the work-email confirmation link. Confirming needs a click (not just opening the link), so link
// scanners in mail apps cannot confirm on the user's behalf.
export const metadata: Metadata = { title: "Confirm email" };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <ConfirmEmail />
    </Suspense>
  );
}
