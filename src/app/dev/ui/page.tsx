import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

// Component gallery for reviewing the design system (development only).
export const metadata: Metadata = { title: "Design system" };

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Gallery />
    </main>
  );
}
