import { Suspense } from "react";
import { CategoryAuditDashboard } from "@/components/categories/category-audit-dashboard";
import { Loader2 } from "lucide-react";

export default function CategoryAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <CategoryAuditDashboard />
    </Suspense>
  );
}
