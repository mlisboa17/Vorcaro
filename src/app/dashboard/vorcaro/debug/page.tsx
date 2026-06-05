import { Suspense } from "react";
import { VorcaroDebugDashboard } from "@/components/vorcaro/vorcaro-debug-dashboard";
import { Loader2 } from "lucide-react";

export default function VorcaroDebugPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <VorcaroDebugDashboard />
    </Suspense>
  );
}
