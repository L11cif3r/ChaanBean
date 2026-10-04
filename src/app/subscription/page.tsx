import { redirectWithQuery } from "@/lib/redirect-with-query";

// The plans page now lives at /landing/subscription; keep old links and bookmarks working.
export default async function SubscriptionRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return redirectWithQuery("/landing/subscription", searchParams);
}
