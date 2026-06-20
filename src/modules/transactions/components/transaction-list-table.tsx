"use client";

import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, FileSearch, Search, Paperclip, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  RowSelectionState
} from "@tanstack/react-table";
import { bulkDeleteTransactions } from "../actions/bulk-delete-transactions";
import { bulkUpdateCategory } from "../actions/bulk-update-category";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

export type TransactionListItemData = {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  accountName: string | null;
  categoryName: string | null;
  reviewRequired?: boolean;
  mediaUrl?: string;
  paymentDate?: Date;
};

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type TransactionFilters = {
  search: string;
  accountId: string;
  categoryId: string;
};

type Props = {
  transactions: TransactionListItemData[];
  page: number;
  totalPages: number;
  totalCount: number;
  accounts: AccountOption[];
  categories: CategoryOption[];
  filters: TransactionFilters;
};

function buildTransactionsHref(filters: TransactionFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

function TransactionListFilters({
  accounts,
  categories,
  filters,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  filters: TransactionFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const updateFilters = useCallback(
    (updates: Partial<TransactionFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const next: TransactionFilters = {
        search: updates.search ?? filters.search,
        accountId: updates.accountId ?? filters.accountId,
        categoryId: updates.categoryId ?? filters.categoryId,
      };

      if (next.search.trim()) params.set("search", next.search.trim());
      else params.delete("search");

      if (next.accountId) params.set("accountId", next.accountId);
      else params.delete("accountId");

      if (next.categoryId) params.set("categoryId", next.categoryId);
      else params.delete("categoryId");

      params.delete("page");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams, filters]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchValue });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar descrição..."
          className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6"
        />
        <button type="submit" className="hidden">
          Buscar
        </button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={filters.accountId}
          onChange={(e) => updateFilters({ accountId: e.target.value })}
          className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Todas as Contas</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        <select
          value={filters.categoryId}
          onChange={(e) => updateFilters({ categoryId: e.target.value })}
          className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

import { getTransactionFileUrl } from "../actions/get-transaction-file-url";

export function TransactionListTable({
  transactions,
  page,
  totalPages,
  totalCount,
  accounts,
  categories,
  filters,
}: Props) {
  const prevHref = buildTransactionsHref(filters, page > 1 ? page - 1 : 1);
  const nextHref = buildTransactionsHref(filters, page < totalPages ? page + 1 : totalPages);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPending, startTransition] = useTransition();

  const columnHelper = createColumnHelper<TransactionListItemData>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          id="select-all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todas as linhas da página"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          id={`select-row-${row.id}`}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
        />
      ),
    }),
    columnHelper.accessor("date", {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Data
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <span className="text-xs font-mono leading-none">
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(info.getValue()))}
        </span>
      ),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => (
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Descrição
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <input
            type="text"
            value={(column.getFilterValue() ?? "") as string}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder="Filtrar..."
            className="block w-full max-w-[120px] rounded border-0 py-0.5 px-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 text-xs leading-4 font-normal normal-case"
          />
        </div>
      ),
      cell: (info) => {
        const tx = info.row.original;
        return (
          <span className="flex items-center gap-1.5 font-medium text-slate-800 text-xs max-w-[180px] truncate leading-none" title={tx.description}>
            <span className="truncate">{tx.description}</span>
            {tx.reviewRequired && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 shrink-0">
                Revisão
              </span>
            )}
            {tx.mediaUrl && (
              <button
                onClick={async () => {
                  try {
                    const signedUrl = await getTransactionFileUrl(tx.mediaUrl!);
                    window.open(signedUrl, "_blank");
                  } catch (error) {
                    console.error("Erro ao gerar URL", error);
                    alert("Não foi possível carregar o anexo.");
                  }
                }}
                className="inline-flex items-center justify-center rounded bg-slate-100 p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0"
                title="Ver Comprovante Original"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        );
      },
    }),
    columnHelper.accessor("paymentDate", {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Data Pgto
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => {
        const val = info.getValue();
        if (!val) return <span className="text-slate-400 text-xs">—</span>;
        return (
          <span className="text-xs font-mono leading-none">
            {new Intl.DateTimeFormat("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(val))}
          </span>
        );
      },
    }),
    columnHelper.accessor("accountName", {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Conta
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className="text-slate-500 text-xs max-w-[100px] truncate block leading-none" title={val ?? ""}>
            {val ?? "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("categoryName", {
      header: ({ column }) => (
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Categoria
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <select
            value={(column.getFilterValue() ?? "") as string}
            onChange={(e) => column.setFilterValue(e.target.value)}
            className="block w-full max-w-[120px] rounded border-0 py-0.5 pl-1.5 pr-5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-slate-900 text-xs leading-4 font-normal normal-case"
          >
            <option value="">Todas</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      ),
      cell: (info) => {
        const cat = info.getValue();
        return cat ? (
          <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-700 max-w-[100px] truncate leading-none" title={cat}>
            {cat}
          </span>
        ) : (
          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.2 text-[10px] font-medium text-slate-400 leading-none">
            Sem Categoria
          </span>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: ({ column }) => (
        <div className="flex justify-end">
          <button
            className="flex items-center gap-1 uppercase hover:text-slate-700 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Valor
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      ),
      cell: (info) => {
        const tx = info.row.original;
        const isExpense = tx.type === "EXPENSE" || tx.amount < 0;
        const absAmount = Math.abs(tx.amount);
        return (
          <div className="flex items-center justify-end gap-1">
            {isExpense ? (
              <ArrowDownCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            ) : (
              <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            )}
            <span className={`font-semibold text-xs leading-none ${isExpense ? "text-red-600" : "text-emerald-600"}`}>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(absAmount)}
            </span>
          </div>
        );
      },
    }),
  ], [categories]);

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalValue = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.amount, 0);
  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkDelete = () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedRows.length} transações?`)) return;
    const ids = selectedRows.map(r => r.original.id);
    startTransition(async () => {
      await bulkDeleteTransactions(ids);
      setRowSelection({});
    });
  };

  const handleBulkCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value;
    if (!catId) return;
    if (!confirm(`Tem certeza que deseja alterar a categoria de ${selectedRows.length} transações?`)) {
      e.target.value = "";
      return;
    }
    const ids = selectedRows.map(r => r.original.id);
    startTransition(async () => {
      await bulkUpdateCategory(ids, catId);
      setRowSelection({});
      e.target.value = "";
    });
  };

  return (
    <div className="flex flex-col gap-4 relative">
      <TransactionListFilters accounts={accounts} categories={categories} filters={filters} />

      {transactions.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
            <FileSearch className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma transação encontrada</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Seu extrato está vazio ou nenhum resultado corresponde aos filtros aplicados.
          </p>
          <Link
            href="/dashboard/transactions/import"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Importar Extrato
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table className="table-fixed">
            <TableHeader className="bg-slate-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-8 leading-none">
                  {headerGroup.headers.map((header) => {
                    const isHidden = ['date', 'paymentDate', 'accountName', 'categoryName'].includes(header.column.id);
                    return (
                      <TableHead key={header.id} className={isHidden ? "hidden md:table-cell text-xs py-1 px-2 truncate max-w-[200px] font-bold" : "text-xs py-1 px-2 truncate max-w-[200px] font-bold"}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="transition-colors hover:bg-slate-50/50 h-8 leading-none">
                  {row.getVisibleCells().map((cell) => {
                    const isHidden = ['date', 'paymentDate', 'accountName', 'categoryName'].includes(cell.column.id);
                    return (
                      <TableCell key={cell.id} className={`${isHidden ? "hidden md:table-cell" : ""} whitespace-nowrap text-xs py-1 px-2 truncate max-w-[200px] leading-none align-middle ${cell.column.id === 'date' ? 'font-medium text-slate-900' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-slate-50 font-medium text-xs">
              <TableRow>
                <TableCell colSpan={6} className="px-2 py-1 text-right text-slate-700 font-bold hidden md:table-cell">
                  Total da Página:
                </TableCell>
                <TableCell colSpan={2} className="px-2 py-1 text-right text-slate-700 font-bold md:hidden">
                  Total:
                </TableCell>
                <TableCell className="px-2 py-1 text-right">
                  <span className={`font-bold ${totalValue < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Math.abs(totalValue))}
                  </span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {hasSelection && (
        <div className="sticky bottom-4 mx-auto flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg w-[90%] max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {selectedRows.length}
            </span>
            <span className="text-sm font-medium text-slate-700">Selecionadas</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              disabled={isPending}
              onChange={handleBulkCategoryChange}
              className="block w-full max-w-xs rounded-lg border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Alterar Categoria...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              disabled={isPending}
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Página <span className="font-medium text-slate-900">{page}</span> de{" "}
            <span className="font-medium text-slate-900">{totalPages}</span>
            {totalCount > 0 ? (
              <>
                {" "}
                · <span className="font-medium text-slate-900">{totalCount}</span> transações
              </>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Link
              href={prevHref}
              aria-disabled={page <= 1}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                page <= 1 ? "pointer-events-none opacity-50" : "text-slate-700"
              }`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={nextHref}
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                page >= totalPages ? "pointer-events-none opacity-50" : "text-slate-700"
              }`}
            >
              Próxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
