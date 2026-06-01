import { Suspense } from "react";
import { RulesDashboard } from "@/components/rules/rules-dashboard";
import { Loader2 } from "lucide-react";

export default function RulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <RulesDashboard />
    </Suspense>
  );
}
