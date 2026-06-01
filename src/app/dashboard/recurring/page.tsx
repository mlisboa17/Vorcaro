import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RecurringDashboard } from "@/components/recurring/recurring-dashboard";

export default function RecurringPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <RecurringDashboard />
    </Suspense>
  );
}
