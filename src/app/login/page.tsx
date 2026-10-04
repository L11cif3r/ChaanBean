import { redirectWithQuery } from "@/lib/redirect-with-query";

// The sign-in page now lives at /landing/login; keep old links and bookmarks working.
export default async function LoginRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectWithQuery("/landing/login", searchParams);
}
