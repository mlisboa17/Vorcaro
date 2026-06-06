/**
 * Gera extrato sintético com N linhas para stress test de parsers/UI.
 */
export function generateLargeBankStatement(lineCount: number, bank = "Bradesco"): string {
  const header = `
${bank}
Extrato de Conta Corrente — Internet Banking
Titular: EMPRESA TESTE LTDA
CNPJ: 12.345.678/0001-90
Saldo anterior R$ 10.000,00

Data Histórico Documento Débito Crédito Saldo
`.trim();

  const lines: string[] = [header];
  let balance = 10000;

  for (let i = 1; i <= lineCount; i += 1) {
    const day = String((i % 28) + 1).padStart(2, "0");
    const isCredit = i % 3 === 0;
    const amount = (i * 17) % 500 + 10;
    const formatted = amount.toFixed(2).replace(".", ",");
    if (isCredit) {
      balance += amount;
      lines.push(
        `${day}/06/2026 PIX RECEBIDO Cliente ${i} ${1000 + i} 0,00 ${formatted} ${balance.toFixed(2).replace(".", ",")}`,
      );
    } else {
      balance -= amount;
      lines.push(
        `${day}/06/2026 TED ENVIADA Fornecedor ${i} ${2000 + i} ${formatted} 0,00 ${balance.toFixed(2).replace(".", ",")}`,
      );
    }
  }

  return lines.join("\n");
}
