import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCashflowAnalytics } from "@/modules/transactions/services/get-cashflow-analytics";
import { CashflowAnalyticsView } from "@/components/cashflow/cashflow-analytics-view";

export default async function CashflowPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const data = await getCashflowAnalytics(session.user.id);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <CashflowAnalyticsView data={data} />
    </Suspense>
  );
}
