import { Prisma } from "@prisma/client";

export function decimalToCents(value: Prisma.Decimal | string | number): number {
  const n = typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
  return Math.round(n * 100);
}

export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function prismaDecimal(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function monthsBetweenUtc(from: Date, to: Date): number {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  const total = years * 12 + months;
  if (to.getUTCDate() < from.getUTCDate()) {
    return Math.max(0, total);
  }
  return Math.max(0, total);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
