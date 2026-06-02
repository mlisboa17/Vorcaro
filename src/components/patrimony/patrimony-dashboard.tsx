"use client";

import {
  ASSET_TYPE_LABELS,
  formatBRL,
  isPatrimonyTab,
  LIABILITY_TYPE_LABELS,
  PATRIMONY_TABS,
  type PatrimonyAssetDto,
  type PatrimonyLiabilityDto,
  type PatrimonySummaryDto,
  type PatrimonyTab,
} from "@/types/patrimony";
import { cn } from "@/lib/utils/cn";
import {
  FormField,
  InstrumentFormModal,
  inputClassName,
} from "@/components/instruments/instrument-form-modal";
import { SettingsConfirmDialog } from "@/components/settings/settings-confirm-dialog";
import { SettingsRowActions } from "@/components/settings/settings-row-actions";
import { SettingsStatusBadge } from "@/components/settings/settings-status-badge";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { Loader2, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function PatrimonyDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useSettingsToast();
  const tabParam = searchParams.get("tab");
  const activeTab: PatrimonyTab = isPatrimonyTab(tabParam) ? tabParam : "visao";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PatrimonySummaryDto | null>(null);
  const [assets, setAssets] = useState<PatrimonyAssetDto[]>([]);
  const [liabilities, setLiabilities] = useState<PatrimonyLiabilityDto[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<"ALL" | "VEHICLE" | "REAL_ESTATE" | "INVESTMENT" | "CONSORTIUM">("ALL");

  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [liabilityFormOpen, setLiabilityFormOpen] = useState(false);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PatrimonyAssetDto | null>(null);
  const [editingLiability, setEditingLiability] = useState<PatrimonyLiabilityDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "asset" | "liability";
    item: PatrimonyAssetDto | PatrimonyLiabilityDto;
  } | null>(null);

  const [assetNome, setAssetNome] = useState("");
  const [assetTipo, setAssetTipo] = useState("INVESTMENT");
  const [assetValorAquisicao, setAssetValorAquisicao] = useState("");
  const [assetData, setAssetData] = useState(new Date().toISOString().slice(0, 10));
  const [assetLiabilityId, setAssetLiabilityId] = useState("");

  const [liabilityNome, setLiabilityNome] = useState("");
  const [liabilityTipo, setLiabilityTipo] = useState("FINANCING");
  const [liabilitySaldo, setLiabilitySaldo] = useState("");
  const [liabilityTaxa, setLiabilityTaxa] = useState("0");
  const [liabilityDataContrato, setLiabilityDataContrato] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [liabilityDataQuitacao, setLiabilityDataQuitacao] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [txAssetId, setTxAssetId] = useState("");
  const [txTipo, setTxTipo] = useState<"APORTE" | "RESGATE" | "RENDIMENTO">("APORTE");
  const [txValor, setTxValor] = useState("");
  const [txData, setTxData] = useState(new Date().toISOString().slice(0, 10));

  const [finLiabilityId, setFinLiabilityId] = useState("");
  const [finAmortizacao, setFinAmortizacao] = useState("");
  const [finJuros, setFinJuros] = useState("");
  const [finSeguro, setFinSeguro] = useState("");
  const [finTaxa, setFinTaxa] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = showInactive ? "?includeInactive=true" : "";
      const [summaryRes, assetsRes, liabilitiesRes] = await Promise.all([
        fetch("/api/patrimony/summary", { credentials: "include" }),
        fetch(`/api/patrimony/assets${query}`, { credentials: "include" }),
        fetch(`/api/patrimony/liabilities${query}`, { credentials: "include" }),
      ]);

      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) as PatrimonySummaryDto);
      }
      if (assetsRes.ok) {
        const payload = (await assetsRes.json()) as { items: PatrimonyAssetDto[] };
        setAssets(payload.items ?? []);
      }
      if (liabilitiesRes.ok) {
        const payload = (await liabilitiesRes.json()) as { items: PatrimonyLiabilityDto[] };
        setLiabilities(payload.items ?? []);
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar patrimônio");
    } finally {
      setLoading(false);
    }
  }, [showInactive, pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function setTab(tab: PatrimonyTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/patrimony?${params.toString()}`);
  }

  const investments = useMemo(
    () => assets.filter((a) => a.tipo === "INVESTMENT" || a.tipo === "INVESTIMENTO"),
    [assets],
  );

  const consortiums = useMemo(
    () => assets.filter((a) => a.tipo === "CONSORTIUM" || a.tipo === "CONSORCIO"),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesSearch = a.nome.toLowerCase().includes(term);
      const matchesType = assetTypeFilter === "ALL" ? true : a.tipo === assetTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [assets, search, assetTypeFilter]);

  const filteredLiabilities = useMemo(() => {
    const term = search.trim().toLowerCase();
    return liabilities.filter((l) => l.nome.toLowerCase().includes(term));
  }, [liabilities, search]);

  function openCreateAsset(defaultTipo?: string) {
    setEditingAsset(null);
    setAssetNome("");
    setAssetTipo(defaultTipo ?? "OTHER");
    setAssetValorAquisicao("");
    setAssetData(new Date().toISOString().slice(0, 10));
    setAssetLiabilityId("");
    setAssetFormOpen(true);
  }

  function openEditAsset(item: PatrimonyAssetDto) {
    setEditingAsset(item);
    setAssetNome(item.nome);
    setAssetTipo(item.tipo);
    setAssetValorAquisicao(String(item.valorAquisicao));
    setAssetData(item.dataAquisicao ?? new Date().toISOString().slice(0, 10));
    setAssetLiabilityId(item.liabilityId ?? "");
    setAssetFormOpen(true);
  }

  async function saveAsset() {
    setSubmitting(true);
    try {
      const body = {
        nome: assetNome,
        tipo: assetTipo,
        valorAquisicao: Number(assetValorAquisicao),
        dataAquisicao: assetData || undefined,
        liabilityId: assetLiabilityId || undefined,
      };

      const url = editingAsset ? `/api/patrimony/assets/${editingAsset.id}` : "/api/patrimony/assets";
      const method = editingAsset ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao salvar ativo");
      }

      pushToast("success", editingAsset ? "Ativo atualizado." : "Ativo criado.");
      setAssetFormOpen(false);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateLiability() {
    setEditingLiability(null);
    setLiabilityNome("");
    setLiabilityTipo("FINANCING");
    setLiabilitySaldo("");
    setLiabilityTaxa("0");
    setLiabilityDataContrato(new Date().toISOString().slice(0, 10));
    setLiabilityDataQuitacao(new Date().toISOString().slice(0, 10));
    setLiabilityFormOpen(true);
  }

  async function saveLiability() {
    setSubmitting(true);
    try {
      const body = {
        nome: liabilityNome,
        tipo: liabilityTipo,
        saldoOriginal: Number(liabilitySaldo),
        taxaJuros: Number(liabilityTaxa),
        dataContratacao: liabilityDataContrato,
        dataQuitacaoPrevista: liabilityDataQuitacao,
      };

      const url = editingLiability
        ? `/api/patrimony/liabilities/${editingLiability.id}`
        : "/api/patrimony/liabilities";
      const method = editingLiability ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao salvar passivo");
      }

      pushToast("success", editingLiability ? "Passivo atualizado." : "Passivo criado.");
      setLiabilityFormOpen(false);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteItem() {
    if (!confirmDelete) return;

    setSubmitting(true);
    try {
      const url =
        confirmDelete.type === "asset"
          ? `/api/patrimony/assets/${confirmDelete.item.id}`
          : `/api/patrimony/liabilities/${confirmDelete.item.id}`;

      const response = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        throw new Error("Falha ao excluir");
      }

      const payload = (await response.json()) as { mode: "soft" | "hard" };
      pushToast(
        "success",
        payload.mode === "soft"
          ? "Registro desativado (possui histórico vinculado)."
          : "Registro excluído permanentemente.",
      );
      setConfirmDelete(null);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(
    type: "asset" | "liability",
    item: PatrimonyAssetDto | PatrimonyLiabilityDto,
    active: boolean,
  ) {
    const url =
      type === "asset"
        ? `/api/patrimony/assets/${item.id}`
        : `/api/patrimony/liabilities/${item.id}`;

    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estaAtiva: active }),
    });

    if (!response.ok) {
      pushToast("error", "Falha ao atualizar status.");
      return;
    }

    pushToast("success", active ? "Reativado." : "Desativado.");
    await loadData();
  }

  async function submitInvestmentTx() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/patrimony/transactions/investment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: txAssetId,
          tipo: txTipo,
          valorTotal: Number(txValor),
          data: txData,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao registrar movimentação");
      }

      pushToast("success", "Movimentação registrada com impacto contábil correto.");
      setTxFormOpen(false);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFinancingPayment() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/patrimony/transactions/financing-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liabilityId: finLiabilityId,
          data: txData,
          amortizacao: Number(finAmortizacao),
          juros: Number(finJuros),
          seguro: Number(finSeguro),
          taxa: Number(finTaxa),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao registrar parcela");
      }

      pushToast("success", "Parcela registrada: amortização no passivo, juros/seguro/taxa na DRE.");
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patrimônio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestão patrimonial com regras contábeis separadas para investimentos, financiamentos,
          consórcios e bens.
        </p>
      </header>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 text-emerald-800">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Ativos Totais</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {formatBRL(summary.totalAtivos)}
            </p>
          </article>
          <article className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-red-800">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">Passivos Totais</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-900">
              {formatBRL(summary.totalPassivos)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium">Patrimônio Líquido</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatBRL(summary.patrimonioLiquido)}
            </p>
          </article>
        </div>
      ) : null}

      {summary?.evolucaoMensal?.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Evolução Patrimonial (Jan a Dez)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Snapshot mensal por data de aquisição dos ativos e saldo atual dos passivos.
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.evolucaoMensal}>
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Line type="monotone" dataKey="patrimonioLiquido" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        {PATRIMONY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTab(tab.value)}
            className={cn(
              "shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition",
              activeTab === tab.value
                ? "border-b-2 border-emerald-600 text-slate-900"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded border-slate-300"
        />
        Mostrar inativos
      </label>

      {activeTab === "visao" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Principais ativos</h2>
            <ul className="mt-3 space-y-2">
              {assets.slice(0, 5).map((asset) => (
                <li key={asset.id} className="flex justify-between text-sm">
                  <span>{asset.nome}</span>
                  <span className="font-medium">{formatBRL(asset.valorAtual)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Principais passivos</h2>
            <ul className="mt-3 space-y-2">
              {liabilities.slice(0, 5).map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{item.nome}</span>
                  <span className="font-medium text-red-700">{formatBRL(item.saldoAtual)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {(activeTab === "ativos" || activeTab === "investimentos" || activeTab === "consorcios") && (
        <section className="space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ativo..."
                className="max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {activeTab === "ativos" ? (
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: "ALL", label: "Todos" },
                    { value: "VEHICLE", label: "Veículo" },
                    { value: "REAL_ESTATE", label: "Imóvel" },
                    { value: "INVESTMENT", label: "Investimento" },
                    { value: "CONSORTIUM", label: "Consórcio" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAssetTypeFilter(option.value as typeof assetTypeFilter)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs",
                        assetTypeFilter === option.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() =>
                openCreateAsset(
                  activeTab === "investimentos"
                    ? "INVESTMENT"
                    : activeTab === "consorcios"
                      ? "CONSORTIUM"
                      : undefined,
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Novo ativo
            </button>
          </div>

          {activeTab === "ativos" ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Valor aquisição</th>
                    <th className="px-4 py-3">Valor atual</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-4 py-3 font-medium">{asset.nome}</td>
                      <td className="px-4 py-3">{ASSET_TYPE_LABELS[asset.tipo] ?? asset.tipo}</td>
                      <td className="px-4 py-3">{formatBRL(asset.valorAquisicao)}</td>
                      <td className="px-4 py-3">{formatBRL(asset.valorAtual)}</td>
                      <td className="px-4 py-3">
                        <SettingsStatusBadge active={asset.estaAtivo} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SettingsRowActions
                          active={asset.estaAtivo}
                          onEdit={() => openEditAsset(asset)}
                          onToggleActive={() => void toggleActive("asset", asset, !asset.estaAtivo)}
                          onDelete={() => setConfirmDelete({ type: "asset", item: asset })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {(activeTab === "investimentos" ? investments : consortiums).map((asset) => (
              <article
                key={asset.id}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-sm",
                  asset.estaAtivo ? "border-slate-200" : "border-slate-100 opacity-70",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{asset.nome}</h3>
                      <span className="text-xs text-slate-500">
                        {ASSET_TYPE_LABELS[asset.tipo] ?? asset.tipo}
                      </span>
                      <SettingsStatusBadge active={asset.estaAtivo} />
                    </div>
                    <p className="mt-1 text-lg font-semibold">{formatBRL(asset.valorAtual)}</p>
                    {asset.liability ? (
                      <p className="text-sm text-slate-600">
                        Saldo devedor: {formatBRL(asset.liability.saldoAtual)} · PL do bem:{" "}
                        <strong>{formatBRL(asset.patrimonioLiquidoDoBem)}</strong>
                      </p>
                    ) : null}
                  </div>
                  <SettingsRowActions
                    active={asset.estaAtivo}
                    onEdit={() => openEditAsset(asset)}
                    onToggleActive={() => void toggleActive("asset", asset, !asset.estaAtivo)}
                    onDelete={() => setConfirmDelete({ type: "asset", item: asset })}
                  />
                </div>
              </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "passivos" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar passivo..."
              className="max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={openCreateLiability}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Novo passivo
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Saldo atual</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLiabilities.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">{LIABILITY_TYPE_LABELS[item.tipo] ?? item.tipo}</td>
                    <td className="px-4 py-3">{formatBRL(item.saldoAtual)}</td>
                    <td className="px-4 py-3">
                      <SettingsStatusBadge active={item.estaAtivo} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SettingsRowActions
                        active={item.estaAtivo}
                        onEdit={() => {
                          setEditingLiability(item);
                          setLiabilityNome(item.nome);
                          setLiabilityTipo(item.tipo);
                          setLiabilitySaldo(String(item.saldoAtual));
                          setLiabilityTaxa(String(item.taxaJuros));
                          setLiabilityDataContrato(item.dataContratacao ?? "");
                          setLiabilityDataQuitacao(item.dataQuitacaoPrevista ?? "");
                          setLiabilityFormOpen(true);
                        }}
                        onToggleActive={() =>
                          void toggleActive("liability", item, !item.estaAtivo)
                        }
                        onDelete={() => setConfirmDelete({ type: "liability", item })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-900">Registrar parcela de financiamento</h3>
            <p className="mt-1 text-xs text-slate-500">
              Amortização reduz o passivo. Juros, seguro e taxa impactam a DRE — não a despesa
              integral da parcela.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Passivo">
                <select
                  className={inputClassName}
                  value={finLiabilityId}
                  onChange={(e) => setFinLiabilityId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {liabilities.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amortização">
                <input
                  className={inputClassName}
                  type="number"
                  value={finAmortizacao}
                  onChange={(e) => setFinAmortizacao(e.target.value)}
                />
              </FormField>
              <FormField label="Juros">
                <input
                  className={inputClassName}
                  type="number"
                  value={finJuros}
                  onChange={(e) => setFinJuros(e.target.value)}
                />
              </FormField>
              <FormField label="Seguro">
                <input
                  className={inputClassName}
                  type="number"
                  value={finSeguro}
                  onChange={(e) => setFinSeguro(e.target.value)}
                />
              </FormField>
              <FormField label="Taxa">
                <input
                  className={inputClassName}
                  type="number"
                  value={finTaxa}
                  onChange={(e) => setFinTaxa(e.target.value)}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => void submitFinancingPayment()}
              disabled={submitting || !finLiabilityId}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Registrar parcela
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "investimentos" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Movimentação de investimento</h3>
          <p className="mt-1 text-xs text-slate-500">
            Aporte e resgate não impactam a DRE. Rendimento gera receita na DRE.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Investimento">
              <select
                className={inputClassName}
                value={txAssetId}
                onChange={(e) => setTxAssetId(e.target.value)}
              >
                <option value="">Selecione</option>
                {investments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Tipo">
              <select
                className={inputClassName}
                value={txTipo}
                onChange={(e) => setTxTipo(e.target.value as typeof txTipo)}
              >
                <option value="APORTE">Aporte</option>
                <option value="RESGATE">Resgate</option>
                <option value="RENDIMENTO">Rendimento</option>
              </select>
            </FormField>
            <FormField label="Valor">
              <input
                className={inputClassName}
                type="number"
                value={txValor}
                onChange={(e) => setTxValor(e.target.value)}
              />
            </FormField>
            <FormField label="Data">
              <input
                className={inputClassName}
                type="date"
                value={txData}
                onChange={(e) => setTxData(e.target.value)}
              />
            </FormField>
          </div>
          <button
            type="button"
            onClick={() => void submitInvestmentTx()}
            disabled={submitting || !txAssetId}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Registrar movimentação
          </button>
        </div>
      ) : null}

      <InstrumentFormModal
        open={assetFormOpen}
        title={editingAsset ? "Editar ativo" : "Novo ativo"}
        onClose={() => setAssetFormOpen(false)}
        onSubmit={() => void saveAsset()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={assetNome} onChange={(e) => setAssetNome(e.target.value)} required />
        </FormField>
        <FormField label="Tipo">
          <select className={inputClassName} value={assetTipo} onChange={(e) => setAssetTipo(e.target.value)}>
            {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Valor de aquisição">
          <input
            className={inputClassName}
            type="number"
            value={assetValorAquisicao}
            onChange={(e) => setAssetValorAquisicao(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Data de aquisição">
          <input
            className={inputClassName}
            type="date"
            value={assetData}
            onChange={(e) => setAssetData(e.target.value)}
          />
        </FormField>
        <FormField label="Passivo vinculado (opcional)">
          <select
            className={inputClassName}
            value={assetLiabilityId}
            onChange={(e) => setAssetLiabilityId(e.target.value)}
          >
            <option value="">Nenhum</option>
            {liabilities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </FormField>
      </InstrumentFormModal>

      <InstrumentFormModal
        open={liabilityFormOpen}
        title={editingLiability ? "Editar passivo" : "Novo passivo"}
        onClose={() => setLiabilityFormOpen(false)}
        onSubmit={() => void saveLiability()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input
            className={inputClassName}
            value={liabilityNome}
            onChange={(e) => setLiabilityNome(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Tipo">
          <select
            className={inputClassName}
            value={liabilityTipo}
            onChange={(e) => setLiabilityTipo(e.target.value)}
          >
            {Object.entries(LIABILITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Saldo original / atual">
          <input
            className={inputClassName}
            type="number"
            value={liabilitySaldo}
            onChange={(e) => setLiabilitySaldo(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Taxa de juros (% a.a.)">
          <input
            className={inputClassName}
            type="number"
            step="0.01"
            value={liabilityTaxa}
            onChange={(e) => setLiabilityTaxa(e.target.value)}
          />
        </FormField>
        <FormField label="Data contratação">
          <input
            className={inputClassName}
            type="date"
            value={liabilityDataContrato}
            onChange={(e) => setLiabilityDataContrato(e.target.value)}
          />
        </FormField>
        <FormField label="Quitação prevista">
          <input
            className={inputClassName}
            type="date"
            value={liabilityDataQuitacao}
            onChange={(e) => setLiabilityDataQuitacao(e.target.value)}
          />
        </FormField>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmDelete !== null}
        title="Excluir registro"
        description="Se houver movimentações vinculadas, o registro será apenas desativado."
        confirmLabel="Excluir"
        destructive
        loading={submitting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
    </div>
  );
}

export function PatrimonyDashboard() {
  return (
    <SettingsToastProvider>
      <PatrimonyDashboardInner />
    </SettingsToastProvider>
  );
}
