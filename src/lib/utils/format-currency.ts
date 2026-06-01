const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number): string {
  return BRL_FORMATTER.format(value);
}

export function formatSignedCurrency(value: number, type: "INCOME" | "EXPENSE" | "TRANSFER"): string {
  const formatted = formatCurrency(Math.abs(value));

  if (type === "INCOME") {
    return `+ ${formatted}`;
  }

  if (type === "EXPENSE") {
    return `- ${formatted}`;
  }

  return formatted;
}
