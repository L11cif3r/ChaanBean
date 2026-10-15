import { getRequestConfig } from "next-intl/server";

// Phase 1 is English only (PRD 3.2); every UI string still lives in messages/*.json so Hindi can follow (NFR-10).
// The locale is fixed, so no request data is read here and pages can still prerender.
export default getRequestConfig(async () => ({
  locale: "en-IN",
  messages: (await import("../../messages/en.json")).default,
  timeZone: "Asia/Kolkata",
}));
