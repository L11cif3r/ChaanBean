import { ReportLibraryView } from "@/components/ReportLibraryView";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ReportsLibraryPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/background-check"
              className="text-xs text-slate-400 hover:text-[#FC8019] flex items-center gap-1 mb-1 font-mono transition"
            >
              <ArrowLeft size={12} />
              Back to AI Credit Check
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="text-chaan-brand" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Report Library</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Catalog of all statutory reports, background verifications, and skip-trace dossiers purchased by your enterprise.
          </p>
        </div>
      </div>

      <ReportLibraryView />
    </div>
  );
}
