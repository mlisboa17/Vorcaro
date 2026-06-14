import Link from "next/link";
import { getPendingAuditCount } from "@/modules/transactions/actions/get-pending-audit-count";

export async function AuditAlertBanner() {
  const count = await getPendingAuditCount();

  if (count === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-amber-500 text-xl" aria-hidden="true">⚠️</span>
        <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
          Você possui {count} lançamento{count > 1 ? "s" : ""} capturado{count > 1 ? "s" : ""} por IA que precisa{count > 1 ? "m" : ""} de revisão
        </p>
      </div>
      <Link 
        href="/dashboard/transactions?reviewRequired=true" 
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-md transition-colors"
      >
        Revisar agora
      </Link>
    </div>
  );
}
