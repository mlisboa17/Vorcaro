export function clampDayToMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return new Date(Date.UTC(year, monthIndex, clampedDay, 12, 0, 0, 0));
}

export function calculateCreditCardCashDate(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
): { dataCaixa: Date; dataVencimentoFatura: Date } {
  const purchaseDay = purchaseDate.getUTCDate();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const purchaseYear = purchaseDate.getUTCFullYear();

  const monthsToAdd = purchaseDay <= closingDay ? 1 : 2;
  const targetMonthIndex = purchaseMonth + monthsToAdd;
  const targetYear = purchaseYear + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  const dataCaixa = clampDayToMonth(targetYear, normalizedMonth, dueDay);

  return {
    dataCaixa,
    dataVencimentoFatura: dataCaixa,
  };
}

export function addMonthsPreserveDay(from: Date, monthsToAdd: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();
  const targetIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  return clampDayToMonth(targetYear, targetMonth, day);
}
