import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Redirects to `target`, keeping the incoming query string (e.g. ?email= on the old /login URL). */
export async function redirectWithQuery(target: string, searchParams: SearchParams): Promise<never> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  const query = params.toString();
  redirect(query ? `${target}?${query}` : target);
}
