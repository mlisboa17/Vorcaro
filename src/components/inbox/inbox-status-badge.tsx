import type { InboxStatus } from "@prisma/client";
import { AlertCircle, CheckCircle2, Clock, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<
  InboxStatus,
  { label: string; className: string; icon: React.ReactNode; pulse?: boolean }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  PROCESSING: {
    label: "Processando",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    pulse: true,
  },
  READY: {
    label: "Pronto",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  NEEDS_CONFIRMATION: {
    label: "Revisão",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  SAVED: {
    label: "Salvo",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: <Save className="h-3.5 w-3.5" />,
  },
  ERROR: {
    label: "Erro",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

interface InboxStatusBadgeProps {
  status: InboxStatus;
  className?: string;
}

export function InboxStatusBadge({ status, className }: InboxStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        config.pulse && "animate-pulse",
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
