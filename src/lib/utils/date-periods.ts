export type PeriodPreset = "current_month" | "previous_month";

export interface DatePeriod {
  preset: PeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function resolvePeriodPreset(preset: PeriodPreset, reference = new Date()): DatePeriod {
  const base =
    preset === "previous_month"
      ? new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
      : new Date(reference.getFullYear(), reference.getMonth(), 1);

  return {
    preset,
    startDate: startOfMonth(base),
    endDate: endOfMonth(base),
    label: `${MONTH_LABELS[base.getMonth()]} ${base.getFullYear()}`,
  };
}

export function parsePeriodPreset(value: string | null | undefined): PeriodPreset {
  if (value === "previous_month") {
    return "previous_month";
  }

  return "current_month";
}
