"use client";

import { useState, useTransition } from "react";
import { createRuleAction, deleteRuleAction, toggleRuleStatusAction } from "./actions";
import { Trash2, Plus, Loader2, Cpu, AlertCircle } from "lucide-react";

type Rule = {
  id: string;
  keyword: string;
  priority: number;
  isActive: boolean;
  targetCategory: { name: string; color: string | null };
};

type Category = {
  id: string;
  name: string;
  color: string | null;
};

export default function RulesClient({ rules, categories }: { rules: Rule[], categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const keyword = formData.get("keyword")?.toString();
    const targetCategoryId = formData.get("targetCategoryId")?.toString();

    if (!keyword || !targetCategoryId) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    startTransition(async () => {
      try {
        await createRuleAction(formData);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        setError(err.message || "Erro ao criar regra.");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta regra?")) return;
    startTransition(async () => {
      try {
        await deleteRuleAction(id);
      } catch (err) {
        console.error("Erro ao deletar", err);
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleRuleStatusAction(id, !isActive);
      } catch (err) {
        console.error("Erro ao alterar status", err);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Cpu className="w-8 h-8 text-primary" />
            Regras de Categorização
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Crie palavras-chave para classificar transações automaticamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario (Esquerda) */}
        <div className="col-span-1">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm overflow-hidden sticky top-6">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-zinc-100 dark:border-zinc-900">
              <h3 className="font-semibold leading-none tracking-tight">Nova Regra</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cadastre uma nova palavra-chave.</p>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="keyword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Palavra-chave
                </label>
                <input
                  id="keyword"
                  name="keyword"
                  placeholder="ex: ifood, uber, netflix"
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm ring-offset-white dark:ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="targetCategoryId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Categoria Alvo
                </label>
                <select
                  id="targetCategoryId"
                  name="targetCategoryId"
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm ring-offset-white dark:ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={isPending}
                  defaultValue=""
                >
                  <option value="" disabled className="text-zinc-500">Selecione uma categoria...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Prioridade <span className="text-xs text-zinc-500 font-normal">(opcional)</span>
                </label>
                <input
                  id="priority"
                  name="priority"
                  type="number"
                  placeholder="0"
                  defaultValue={0}
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm ring-offset-white dark:ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 h-10 px-4 py-2 w-full mt-2"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Cadastrar Regra
              </button>
            </form>
          </div>
        </div>

        {/* Lista (Direita) */}
        <div className="col-span-1 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm overflow-hidden">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800">
                  <tr className="border-b transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 data-[state=selected]:bg-zinc-100 dark:data-[state=selected]:bg-zinc-800">
                    <th className="h-12 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400">Palavra-chave</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400">Categoria Alvo</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400">Prioridade</th>
                    <th className="h-12 px-4 text-center align-middle font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-zinc-500 dark:text-zinc-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-full">
                            <Cpu className="w-6 h-6 text-zinc-400" />
                          </div>
                          <p>Nenhuma regra cadastrada ainda.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rules.map(rule => (
                      <tr key={rule.id} className="border-b border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                        <td className="p-4 align-middle font-medium">
                          {rule.keyword}
                        </td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:focus:ring-zinc-300">
                            {rule.targetCategory.name}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-zinc-500 dark:text-zinc-400">
                          {rule.priority}
                        </td>
                        <td className="p-4 align-middle text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.isActive}
                            onClick={() => handleToggle(rule.id, rule.isActive)}
                            disabled={isPending}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 ${rule.isActive ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`}
                          >
                            <span
                              className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${rule.isActive ? "translate-x-4" : "translate-x-0"}`}
                            />
                          </button>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <button
                            onClick={() => handleDelete(rule.id)}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 h-8 w-8 disabled:opacity-50"
                            title="Deletar Regra"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Deletar</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
