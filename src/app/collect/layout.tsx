import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

// ChaanBean's brand typeface (marketing redesign), loaded only for this route segment.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata = { title: "Collect - ChaanBean" };

export default function CollectLayout({ children }: { children: ReactNode }) {
  return <div className={jakarta.variable}>{children}</div>;
}
