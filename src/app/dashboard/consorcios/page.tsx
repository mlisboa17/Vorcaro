import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ConsortiumDashboard } from "@/components/consortium/consortium-dashboard";

export default function ConsorciosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ConsortiumDashboard />
    </Suspense>
  );
}
