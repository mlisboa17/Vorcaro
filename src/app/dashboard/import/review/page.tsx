import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ImportDashboard } from "@/components/financial-documents/import-dashboard";

export default function ImportReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ImportDashboard mode="review" />
    </Suspense>
  );
}
