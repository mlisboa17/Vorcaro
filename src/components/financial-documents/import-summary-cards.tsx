import type { ImportLineSummary } from "@/lib/inbox/structured-bank-import.parser";

type Props = {
  summary: ImportLineSummary;
  className?: string;
};

export function ImportSummaryCards({ summary, className }: Props) {
  const cards = [
    { label: "Lançamentos encontrados", value: summary.total, tone: "slate" },
    { label: "Reconhecidos automaticamente", value: summary.recognized, tone: "emerald" },
    { label: "Precisam de revisão", value: summary.needsReview, tone: "amber" },
    { label: "Ignorados", value: summary.ignored, tone: "slate" },
  ] as const;

  const toneClass: Record<(typeof cards)[number]["tone"], string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border p-4 ${toneClass[card.tone]}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
