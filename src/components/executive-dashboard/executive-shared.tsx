export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDateBR(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function ExecutiveSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? "h-24"}`} />;
}
