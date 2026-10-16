import { redirect } from "next/navigation";

// S09 is folded into S08 and its confirm popup in PRD v2.0 (Figures 4 and 5); buyer consent details arrive with Part 7.
export default function Page() {
  redirect("/checks/new");
}
