"use client";

import type { FinanceCatalog, InboxItem, InboxListResponse } from "@/types/inbox";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import type { InboxIntelligenceMetrics } from "@/modules/inbox-intelligence/application/services/inbox-intelligence-metrics.service";
import {
  buildAutomationMessages,
  buildInboxSmartBatchPlan,
} from "@/modules/inbox-intelligence/domain/types/inbox-automation-policy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmTransactionDrawer } from "./confirm-transaction-drawer";
import { InboxItemList } from "./inbox-item-list";
import { InboxMetricsCards } from "./inbox-metrics-cards";
import { QuickIngest } from "./quick-ingest";
import { cn } from "@/lib/utils/cn";
import { Loader2, Upload } from "lucide-react";
import { FinancialFileImportModal } from "./financial-file-import-modal";
import { InboxBankImportPanel } from "./inbox-bank-import-panel";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { InboxBulkReviewModal } from "./inbox-bulk-review-modal";
import { InboxBulkConfirmDialog } from "./inbox-bulk-confirm-dialog";
import { InboxAutomationBanner } from "./inbox-automation-banner";
import { InboxSmartBatchDialog } from "./inbox-smart-batch-dialog";
import { InboxBulkSelectionBar } from "./inbox-bulk-selection-bar";
import { InboxBulkResultToast } from "./inbox-bulk-result-toast";
import { InboxIntelligenceMetricsCards } from "./inbox-intelligence-metrics";
import { InboxReviewToolbar } from "./inbox-review-toolbar";
import {
  EMPTY_INBOX_REVIEW_FILTERS,
  filterInboxItemsForReview,
  getSelectableInboxItems,
  type InboxReviewFilters,
} from "@/lib/inbox/inbox-review-filters";
import {
  getSelectedIdsArray,
  invertVisibleSelection,
  selectFirstNVisible,
  selectRangeInOrder,
  setSelectionForIds,
} from "@/lib/inbox/inbox-selection";
import {
  buildBulkConfirmSummary,
  countPendingInboxItems,
  DEFAULT_INBOX_QUEUE,
  INBOX_QUEUE_TABS,
  matchesInboxQueue,
  parseInboxQueueFilter,
  runEfetivacaoExitSequence,
  type InboxBulkConfirmSummary,
  type InboxQueueFilter,
} from "@/lib/inbox/inbox-queue-filter";

function InboxDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useSettingsToast();
  const activeQueue = parseInboxQueueFilter(searchParams.get("queue"));

  const [allItems, setAllItems] = useState<InboxItem[]>([]);
  const [catalog, setCatalog] = useState<FinanceCatalog>({
    accounts: [],
    categories: [],
    paymentMethods: [],
    cards: [],
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmBusy, setBulkConfirmBusy] = useState(false);
  const [applySuggestionsBusy, setApplySuggestionsBusy] = useState(false);
  const [classifications, setClassifications] = useState<
    Record<string, InboxClassificationSuggestion>
  >({});
  const [intelligenceMetrics, setIntelligenceMetrics] =
    useState<InboxIntelligenceMetrics | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [reviewFilters, setReviewFilters] = useState<InboxReviewFilters>(EMPTY_INBOX_REVIEW_FILTERS);
  const [selectFirstCount, setSelectFirstCount] = useState("10");
  const [efetivandoIds, setEfetivandoIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [bulkResultSummary, setBulkResultSummary] = useState<InboxBulkConfirmSummary | null>(null);
  const [smartBatchOpen, setSmartBatchOpen] = useState(false);
  const [smartBatchBusy, setSmartBatchBusy] = useState(false);
  const [automationMessages, setAutomationMessages] = useState<ReturnType<typeof buildAutomationMessages>>(
    {},
  );
  const selectionAnchorRef = useRef<string | null>(null);
  const animationLockRef = useRef(false);
  const automationSessionRef = useRef<Set<string>>(new Set());
  const batchPromptKeysRef = useRef<Set<string>>(new Set());

  const fetchInbox = useCallback(async () => {
    const response = await fetch("/api/inbox?limit=100", { credentials: "include" });

    if (response.status === 401) {
      setAuthError(true);
      return;
    }

    if (!response.ok) {
      throw new Error("Falha ao carregar a Caixa Financeira");
    }

    const data = (await response.json()) as InboxListResponse;
    setAllItems(data.items);
    setAuthError(false);
  }, []);

  const fetchCatalog = useCallback(async () => {
    const response = await fetch("/api/finance/catalog", { credentials: "include" });
    if (response.ok) {
      const data = (await response.json()) as FinanceCatalog;
      setCatalog(data);
    }
  }, []);

  const fetchIntelligenceMetrics = useCallback(async () => {
    const response = await fetch("/api/inbox/intelligence/metrics", { credentials: "include" });
    if (response.ok) {
      setIntelligenceMetrics((await response.json()) as InboxIntelligenceMetrics);
    }
  }, []);

  const fetchClassifications = useCallback(async (itemIds: readonly string[]) => {
    if (itemIds.length === 0) return;

    const response = await fetch("/api/inbox/intelligence/classify-batch", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inboxItemIds: itemIds.slice(0, 100) }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as {
      suggestions: Record<string, InboxClassificationSuggestion>;
    };

    setClassifications((current) => ({ ...current, ...data.suggestions }));
  }, []);

  useEffect(() => {
    Promise.all([fetchInbox(), fetchCatalog(), fetchIntelligenceMetrics()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchInbox, fetchCatalog, fetchIntelligenceMetrics]);

  useEffect(() => {
    const hasActiveProcessing = allItems.some(
      (item) => item.status === "PENDING" || item.status === "PROCESSING",
    );

    if (!hasActiveProcessing || animationLockRef.current) {
      return;
    }

    const interval = setInterval(() => {
      fetchInbox().catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [allItems, fetchInbox]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
    selectionAnchorRef.current = null;
  }, [activeQueue]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
    selectionAnchorRef.current = null;
  }, [reviewFilters]);

  useEffect(() => {
    if (!bulkResultSummary) return;
    const timer = window.setTimeout(() => setBulkResultSummary(null), 8000);
    return () => window.clearTimeout(timer);
  }, [bulkResultSummary]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of catalog.categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [catalog.categories]);

  const transitionVisibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of efetivandoIds) ids.add(id);
    for (const id of exitingIds) ids.add(id);
    return ids;
  }, [efetivandoIds, exitingIds]);

  const filteredItems = useMemo(() => {
    const byQueue = allItems.filter(
      (item) => matchesInboxQueue(item, activeQueue) || transitionVisibleIds.has(item.id),
    );
    return filterInboxItemsForReview(byQueue, reviewFilters, categoryNameById, classifications);
  }, [allItems, activeQueue, reviewFilters, categoryNameById, transitionVisibleIds, classifications]);

  const pendingCount = useMemo(() => countPendingInboxItems(allItems), [allItems]);

  const allSelectableItems = useMemo(() => getSelectableInboxItems(allItems), [allItems]);

  const visibleSelectableItems = useMemo(
    () => getSelectableInboxItems(filteredItems),
    [filteredItems],
  );

  const visibleSelectableIds = useMemo(
    () => visibleSelectableItems.map((item) => item.id),
    [visibleSelectableItems],
  );

  const reviewableVisibleIds = useMemo(
    () =>
      filteredItems
        .filter((item) => REVIEWABLE_STATUSES.includes(item.status))
        .map((item) => item.id),
    [filteredItems],
  );

  useEffect(() => {
    const missing = reviewableVisibleIds.filter((id) => !classifications[id]);
    if (missing.length > 0) {
      void fetchClassifications(missing);
    }
  }, [reviewableVisibleIds, classifications, fetchClassifications]);

  const selectedIdsWithSuggestions = useMemo(() => {
    return getSelectedIdsArray(selectedIds).filter((id) => classifications[id]?.categoryId);
  }, [selectedIds, classifications]);

  const reviewableItems = useMemo(
    () => allItems.filter((item) => REVIEWABLE_STATUSES.includes(item.status)),
    [allItems],
  );

  const automationPlan = useMemo(
    () =>
      buildInboxSmartBatchPlan(
        reviewableItems.map((item) => ({
          inboxItemId: item.id,
          suggestion: classifications[item.id],
        })),
      ),
    [reviewableItems, classifications],
  );

  const automationMessagesLive = useMemo(
    () => buildAutomationMessages(automationPlan),
    [automationPlan],
  );

  const showReviewToolbar = activeQueue === "PENDENTES" || visibleSelectableItems.length > 0;

  const markItemsSaved = useCallback((ids: readonly string[]) => {
    const idSet = new Set(ids);
    setAllItems((current) =>
      current.map((item) =>
        idSet.has(item.id) ? { ...item, status: "SAVED" as const } : item,
      ),
    );
  }, []);

  const playEfetivacaoAnimation = useCallback(
    async (ids: readonly string[]) => {
      if (ids.length === 0) return;

      animationLockRef.current = true;

      await runEfetivacaoExitSequence(ids, {
        onShowEfetivado: (batch) => {
          markItemsSaved(batch);
          setEfetivandoIds(new Set(batch));
        },
        onStartFadeOut: (batch) => {
          setExitingIds(new Set(batch));
        },
        onComplete: () => {
          setEfetivandoIds(new Set());
          setExitingIds(new Set());
          animationLockRef.current = false;
        },
      });
    },
    [markItemsSaved],
  );

  const executeSmartBatch = useCallback(
    async (inboxItemIds: readonly string[]) => {
      if (inboxItemIds.length === 0) {
        return null;
      }

      const response = await fetch("/api/inbox/intelligence/smart-batch/execute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxItemIds: [...inboxItemIds], recordFeedback: true }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        confirmed?: number;
        confirmedIds?: string[];
        failed?: number;
        applied?: number;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Falha na confirmação inteligente");
      }

      return body;
    },
    [],
  );

  useEffect(() => {
    if (smartBatchBusy || bulkConfirmBusy || animationLockRef.current) return;

    const pendingAuto = automationPlan.auto.inboxItemIds.filter(
      (id) => classifications[id] && !automationSessionRef.current.has(`auto:${id}`),
    );

    if (pendingAuto.length === 0) return;

    void (async () => {
      setSmartBatchBusy(true);
      try {
        const result = await executeSmartBatch(pendingAuto);
        for (const id of pendingAuto) {
          automationSessionRef.current.add(`auto:${id}`);
        }

        const confirmedIds = result?.confirmedIds ?? [];
        if (confirmedIds.length > 0) {
          void playEfetivacaoAnimation(confirmedIds);
        }

        setAutomationMessages((current) => ({
          ...current,
          auto: `Classifiquei automaticamente ${result?.confirmed ?? 0} transação${(result?.confirmed ?? 0) === 1 ? "" : "ões"} utilizando seu histórico e regras aprendidas.`,
        }));

        pushToast(
          "success",
          `Classifiquei e efetivei automaticamente ${result?.confirmed ?? 0} transação${(result?.confirmed ?? 0) === 1 ? "" : "ões"}.`,
        );
        setBulkResultSummary(
          buildBulkConfirmSummary({
            confirmed: result?.confirmed,
            failed: result?.failed,
          }),
        );
        void fetchIntelligenceMetrics();
      } catch (error) {
        pushToast(
          "error",
          error instanceof Error ? error.message : "Erro na automação inteligente",
        );
      } finally {
        setSmartBatchBusy(false);
      }
    })();
  }, [
    automationPlan,
    classifications,
    smartBatchBusy,
    bulkConfirmBusy,
    executeSmartBatch,
    playEfetivacaoAnimation,
    pushToast,
    fetchIntelligenceMetrics,
  ]);

  useEffect(() => {
    if (smartBatchOpen || smartBatchBusy || bulkConfirmBusy) return;

    const pendingBatch = automationPlan.batch.inboxItemIds.filter(
      (id) => classifications[id] && !automationSessionRef.current.has(`batch:${id}`),
    );

    if (pendingBatch.length === 0) return;

    const promptKey = pendingBatch.slice().sort().join(",");
    if (batchPromptKeysRef.current.has(promptKey)) return;

    batchPromptKeysRef.current.add(promptKey);
    setSmartBatchOpen(true);
  }, [automationPlan.batch.inboxItemIds, classifications, smartBatchOpen, smartBatchBusy, bulkConfirmBusy]);

  async function handleSmartBatchConfirmAll() {
    const ids = automationPlan.batch.inboxItemIds.filter(
      (id) => !automationSessionRef.current.has(`batch:${id}`),
    );
    if (ids.length === 0) {
      setSmartBatchOpen(false);
      return;
    }

    setSmartBatchBusy(true);

    try {
      const result = await executeSmartBatch(ids);
      for (const id of ids) {
        automationSessionRef.current.add(`batch:${id}`);
      }

      const confirmedIds = result?.confirmedIds ?? [];
      if (confirmedIds.length > 0) {
        void playEfetivacaoAnimation(confirmedIds);
      }

      setBulkResultSummary(
        buildBulkConfirmSummary({
          confirmed: result?.confirmed,
          failed: result?.failed,
        }),
      );
      pushToast(
        "success",
        `${result?.confirmed ?? 0} transação${(result?.confirmed ?? 0) === 1 ? "" : "ões"} efetivada${(result?.confirmed ?? 0) === 1 ? "" : "s"} em lote.`,
      );
      setSmartBatchOpen(false);
      void fetchIntelligenceMetrics();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao efetivar em lote");
    } finally {
      setSmartBatchBusy(false);
    }
  }

  function handleSmartBatchReview() {
    const ids = automationPlan.batch.inboxItemIds.filter(
      (id) => !automationSessionRef.current.has(`batch:${id}`),
    );
    setSelectedIds(new Set(ids));
    if (ids[0]) {
      selectionAnchorRef.current = ids[0];
      setSelectionAnchorId(ids[0]);
    }
    for (const id of ids) {
      automationSessionRef.current.add(`batch:${id}`);
    }
    setSmartBatchOpen(false);
    pushToast("success", "Itens selecionados para revisão. Ajuste se necessário antes de efetivar.");
  }

  function handleSmartBatchCancel() {
    for (const id of automationPlan.batch.inboxItemIds) {
      automationSessionRef.current.add(`batch:${id}`);
    }
    setSmartBatchOpen(false);
  }

  function handleQueueChange(queue: InboxQueueFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");

    if (queue === DEFAULT_INBOX_QUEUE) {
      params.delete("queue");
    } else {
      params.set("queue", queue);
    }

    const query = params.toString();
    router.push(query ? `/dashboard/inbox?${query}` : "/dashboard/inbox");
  }

  function handleReview(item: InboxItem) {
    setSelectedItem(item);
    setDrawerOpen(true);
  }

  async function handleConfirmed(itemId: string) {
    setDrawerOpen(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
    await playEfetivacaoAnimation([itemId]);
    setBulkResultSummary(buildBulkConfirmSummary({ confirmed: 1 }));
  }

  function handleToggleSelect(id: string, shiftKey: boolean) {
    const anchor = selectionAnchorRef.current;

    if (shiftKey && anchor) {
      setSelectedIds((current) => selectRangeInOrder(visibleSelectableIds, anchor, id, current));
      setSelectionAnchorId(anchor);
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    selectionAnchorRef.current = id;
    setSelectionAnchorId(id);
  }

  function handleSelectGroup(groupIds: string[]) {
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => setSelectionForIds(current, groupIds, !allSelected));
  }

  function handleSelectAllVisible() {
    setSelectedIds(new Set(visibleSelectableIds));
    if (visibleSelectableIds[0]) {
      selectionAnchorRef.current = visibleSelectableIds[0];
      setSelectionAnchorId(visibleSelectableIds[0]);
    }
  }

  function handleSelectFiltered() {
    handleSelectAllVisible();
    pushToast("success", `${visibleSelectableIds.length} itens filtrados selecionados.`);
  }

  function handleSelectFirstN() {
    const count = Number.parseInt(selectFirstCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      pushToast("error", "Informe um número válido para selecionar.");
      return;
    }
    setSelectedIds((current) => selectFirstNVisible(current, visibleSelectableIds, count));
    if (visibleSelectableIds[0]) {
      selectionAnchorRef.current = visibleSelectableIds[0];
      setSelectionAnchorId(visibleSelectableIds[0]);
    }
  }

  function handleInvertSelection() {
    setSelectedIds((current) => invertVisibleSelection(current, visibleSelectableIds));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
    selectionAnchorRef.current = null;
  }

  async function handleBulkConfirm() {
    const ids = getSelectedIdsArray(selectedIds);
    if (ids.length === 0) return;

    setBulkConfirmBusy(true);
    setBulkConfirmOpen(false);
    handleClearSelection();

    try {
      const response = await fetch("/api/inbox/bulk-confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxItemIds: ids }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        confirmed?: number;
        confirmedIds?: string[];
        skipped?: number;
        failed?: number;
        failedItems?: Array<{ id: string; reason: string }>;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Falha ao efetivar selecionados");
      }

      const summary = buildBulkConfirmSummary(body ?? {});
      const confirmedIds = body?.confirmedIds ?? [];

      if (confirmedIds.length > 0) {
        void playEfetivacaoAnimation(confirmedIds);
      }

      setBulkResultSummary(summary);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao efetivar");
    } finally {
      setBulkConfirmBusy(false);
    }
  }

  async function handleBulkApplySuggestions() {
    const ids = selectedIdsWithSuggestions;
    if (ids.length === 0) return;

    setApplySuggestionsBusy(true);

    try {
      const response = await fetch("/api/inbox/bulk-apply-suggestions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxItemIds: ids }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        applied?: number;
        skipped?: number;
        failed?: number;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Falha ao aplicar sugestões");
      }

      pushToast(
        "success",
        `Sugestões aplicadas: ${body?.applied ?? 0}. ${body?.skipped ?? 0} ignorados, ${body?.failed ?? 0} falhas.`,
      );
      handleClearSelection();
      await fetchInbox();
      void fetchIntelligenceMetrics();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao aplicar sugestões");
    } finally {
      setApplySuggestionsBusy(false);
    }
  }

  function handleBulkSaved(result: { updated: number; skipped: number; failed: number }) {
    pushToast(
      "success",
      `Revisão em massa concluída: ${result.updated} atualizados, ${result.skipped} ignorados, ${result.failed} falhas.`,
    );
    handleClearSelection();
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">
          Faça login com <code className="rounded bg-amber-100 px-1">dev@logos.local</code> para
          acessar a Caixa Financeira.
        </p>
        <a
          href="/api/auth/signin"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", selectedIds.size > 0 && "pb-28")}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Caixa Financeira</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão cognitiva do Logos — IA, regras automáticas e confirmações pendentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Upload className="h-4 w-4" />
          Importar Extrato / Fatura
        </button>
      </header>

      <InboxMetricsCards items={allItems} />

      <InboxBankImportPanel onOpenFullImport={() => setImportOpen(true)} />

      <InboxIntelligenceMetricsCards metrics={intelligenceMetrics} />

      <InboxAutomationBanner
        autoMessage={automationMessages.auto ?? automationMessagesLive.auto}
        batchMessage={smartBatchOpen ? undefined : automationMessagesLive.batch}
        individualMessage={automationMessages.individual ?? automationMessagesLive.individual}
        autoCount={automationPlan.auto.inboxItemIds.length}
        batchCount={automationPlan.batch.inboxItemIds.length}
        uncertainCount={
          automationPlan.individual.inboxItemIds.length + automationPlan.manual.inboxItemIds.length
        }
      />

      <QuickIngest
        onSubmitted={() => {
          fetchInbox().catch(console.error);
        }}
      />

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-1" aria-label="Fila da caixa">
        {INBOX_QUEUE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleQueueChange(tab.value)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              activeQueue === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {showReviewToolbar ? (
        <InboxReviewToolbar
          filters={reviewFilters}
          catalog={catalog}
          visibleSelectableCount={visibleSelectableItems.length}
          pendingCount={pendingCount}
          selectFirstCount={selectFirstCount}
          onFiltersChange={(patch) => setReviewFilters((current) => ({ ...current, ...patch }))}
          onSelectFirstCountChange={setSelectFirstCount}
          onSelectFiltered={handleSelectFiltered}
          onSelectFirstN={handleSelectFirstN}
          onSelectAllVisible={handleSelectAllVisible}
          onClearSelection={handleClearSelection}
        />
      ) : null}

      <InboxItemList
        items={filteredItems}
        selectedIds={selectedIds}
        selectionAnchorId={selectionAnchorId}
        efetivandoIds={efetivandoIds}
        exitingIds={exitingIds}
        onSelectionAnchorChange={(id) => {
          selectionAnchorRef.current = id;
          setSelectionAnchorId(id);
        }}
        onToggleSelect={handleToggleSelect}
        onSelectGroup={handleSelectGroup}
        onReview={handleReview}
        classifications={classifications}
      />

      <InboxBulkSelectionBar
        selectedCount={selectedIds.size}
        visibleSelectableCount={visibleSelectableItems.length}
        totalSelectableCount={allSelectableItems.length}
        busy={bulkConfirmBusy || applySuggestionsBusy || smartBatchBusy}
        onConfirm={() => setBulkConfirmOpen(true)}
        onBulkEdit={() => setBulkOpen(true)}
        onIgnore={() => undefined}
        onClear={handleClearSelection}
        onInvert={handleInvertSelection}
        onApplySuggestions={() => void handleBulkApplySuggestions()}
        applySuggestionsDisabled={selectedIdsWithSuggestions.length === 0}
        ignoreDisabled
      />

      <InboxBulkConfirmDialog
        open={bulkConfirmOpen}
        selectedCount={selectedIds.size}
        submitting={bulkConfirmBusy}
        onClose={() => !bulkConfirmBusy && setBulkConfirmOpen(false)}
        onConfirm={() => void handleBulkConfirm()}
      />

      <InboxSmartBatchDialog
        open={smartBatchOpen}
        tier="batch"
        plan={automationPlan.batch}
        submitting={smartBatchBusy}
        onConfirmAll={() => void handleSmartBatchConfirmAll()}
        onReview={handleSmartBatchReview}
        onCancel={handleSmartBatchCancel}
      />

      {bulkResultSummary ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] sm:bottom-6 sm:right-6">
          <InboxBulkResultToast
            summary={bulkResultSummary}
            onDismiss={() => setBulkResultSummary(null)}
          />
        </div>
      ) : null}

      <ConfirmTransactionDrawer
        item={selectedItem}
        catalog={catalog}
        classification={selectedItem ? classifications[selectedItem.id] : undefined}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirmed={(itemId) => void handleConfirmed(itemId)}
        onFeedbackRecorded={() => void fetchIntelligenceMetrics()}
      />

      <FinancialFileImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={(result) => {
          pushToast(
            "success",
            `Arquivo importado. ${result.imported} lançamentos enviados para revisão.`,
          );
          fetchInbox().catch(console.error);
        }}
      />

      <InboxBulkReviewModal
        open={bulkOpen}
        selectedIds={getSelectedIdsArray(selectedIds)}
        catalog={catalog}
        onClose={() => setBulkOpen(false)}
        onSaved={handleBulkSaved}
      />
    </div>
  );
}

export function InboxDashboard() {
  return (
    <SettingsToastProvider>
      <InboxDashboardContent />
    </SettingsToastProvider>
  );
}
