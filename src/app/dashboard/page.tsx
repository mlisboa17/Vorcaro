import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ExecutiveDashboard } from "@/components/executive-dashboard/executive-dashboard";
import { AuditAlertBanner } from "./components/audit-alert-banner";

export default function DashboardHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AuditAlertBanner />
      <ExecutiveDashboard />
    </Suspense>
  );
}
