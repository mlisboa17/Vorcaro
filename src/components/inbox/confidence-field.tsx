"use client";

import type { FieldConfidence } from "@/modules/shared/domain/confidence";
import { AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LOW_CONFIDENCE_THRESHOLD = 0.75;

interface ConfidenceFieldProps {
  label: string;
  fieldKey: string;
  confidence?: FieldConfidence;
  children: React.ReactNode;
  className?: string;
}

export function ConfidenceField({
  label,
  fieldKey,
  confidence,
  children,
  className,
}: ConfidenceFieldProps) {
  const score = confidence?.score ?? 0;
  const source = confidence?.source ?? "llm";
  const isRuleOrPattern =
    (source === "rule" || source === "pattern") && score >= LOW_CONFIDENCE_THRESHOLD;
  const isLowConfidence = score < LOW_CONFIDENCE_THRESHOLD && source === "llm";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldKey} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {isRuleOrPattern && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Sparkles className="h-3 w-3" />
            Aplicado por Regra Automática
          </span>
        )}
      </div>

      <div
        className={cn(
          "rounded-lg transition",
          isLowConfidence && "ring-2 ring-amber-300 ring-offset-1",
          isRuleOrPattern && "ring-1 ring-emerald-200",
        )}
      >
        {children}
      </div>

      {isLowConfidence && (
        <p className="flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          IA gerou com baixa confiança ({Math.round(score * 100)}%), valide o campo
        </p>
      )}
    </div>
  );
}
