"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

/** Pay or fail the mock order, then return to the app like a gateway redirect. Only same-site return URLs are used. */
export function MockCheckout({ providerOrderId, returnUrl, done }: { providerOrderId: string; returnUrl: string; done: boolean }) {
  const [busy, setBusy] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function back() {
    let target = "/account/billing";
    try {
      const u = new URL(returnUrl, window.location.origin);
      if (u.origin === window.location.origin) target = u.pathname + u.search;
    } catch {
      // keep the default
    }
    window.location.assign(target);
  }

  async function report(outcome: "success" | "failure") {
    setBusy(outcome);
    setError(null);
    const res = await api("/api/v1/dev/payments", { body: { providerOrderId, outcome } });
    if (!res.ok) {
      setBusy(null);
      return setError(res.error.message);
    }
    back();
  }

  if (done) {
    return (
      <Button variant="secondary" onClick={back}>
        Return to Chaanbean
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void report("success")} loading={busy === "success"} disabled={busy !== null}>
          Pay successfully
        </Button>
        <Button variant="danger" onClick={() => void report("failure")} loading={busy === "failure"} disabled={busy !== null}>
          Fail the payment
        </Button>
        <Button variant="ghost" onClick={back} disabled={busy !== null}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
