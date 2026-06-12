import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

type Props = {
  income: number;
  expense: number;
  balance: number;
};

export function TransactionSummaryCards({ income, expense, balance }: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <div className="grid gap-4 sm:grid-cols-3 mb-6">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <ArrowUpCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Receitas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(income)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <ArrowDownCircle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Despesas</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(Math.abs(expense))}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Wallet className="h-6 w-6 text-slate-700" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Saldo Líquido</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
