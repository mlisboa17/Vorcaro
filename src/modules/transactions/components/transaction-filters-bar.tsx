"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Search } from "lucide-react";

type Props = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};

export function TransactionFiltersBar({ accounts, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentAccountId = searchParams.get("accountId") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);

  // Sync local search value if URL changes externally
  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page to 1 on filter change
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters("search", searchValue);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
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
        {/* Invisible submit button to trigger form via Enter */}
        <button type="submit" className="hidden">Buscar</button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={currentAccountId}
          onChange={(e) => updateFilters("accountId", e.target.value)}
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
          value={currentCategoryId}
          onChange={(e) => updateFilters("categoryId", e.target.value)}
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
