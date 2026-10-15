import { Skeleton } from "@/components/ui";

/** Placeholder for a signed-in page while its session data streams in. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
