export type PeriodPreset = "today" | "last_7_days" | "current_month" | "previous_month" | "custom";

export interface DatePeriod {
  preset: PeriodPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
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

export function resolvePeriodPreset(
  preset: PeriodPreset,
  reference = new Date(),
  customStart?: Date,
  customEnd?: Date
): DatePeriod {
  if (preset === "today") {
    return {
      preset,
      startDate: startOfDay(reference),
      endDate: endOfDay(reference),
      label: "Hoje",
    };
  }

  if (preset === "last_7_days") {
    const start = new Date(reference);
    start.setDate(start.getDate() - 6);
    return {
      preset,
      startDate: startOfDay(start),
      endDate: endOfDay(reference),
      label: "Últimos 7 dias",
    };
  }

  if (preset === "previous_month") {
    const base = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    return {
      preset,
      startDate: startOfMonth(base),
      endDate: endOfMonth(base),
      label: `${MONTH_LABELS[base.getMonth()]} ${base.getFullYear()}`,
    };
  }

  if (preset === "custom" && customStart && customEnd) {
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    return {
      preset,
      startDate: startOfDay(customStart),
      endDate: endOfDay(customEnd),
      label: `${formatDate(customStart)} - ${formatDate(customEnd)}`,
    };
  }

  const base = new Date(reference.getFullYear(), reference.getMonth(), 1);
  return {
    preset: "current_month",
    startDate: startOfMonth(base),
    endDate: endOfMonth(base),
    label: `${MONTH_LABELS[base.getMonth()]} ${base.getFullYear()}`,
  };
}

export function parsePeriodPreset(value: string | null | undefined): PeriodPreset {
  if (
    value === "today" ||
    value === "last_7_days" ||
    value === "current_month" ||
    value === "previous_month" ||
    value === "custom"
  ) {
    return value;
  }

  return "current_month";
}
