"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trophy, TrendingUp, History } from "lucide-react";

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  impactLevel: string;
};

type EvolutionProfile = {
  healthTrend: string;
  cashflowTrend: string;
  spendingTrend: string;
  debtTrend: string;
  goalTrend: string;
  netWorthTrend: string;
  historyDaysAvailable: number;
  lastHealthScore: number | null;
  previousHealthScore: number | null;
};

type Achievement = {
  id: string;
  achievementKey: string;
  title: string;
  description: string;
  unlockedAt: string;
};

const TREND_LABELS: Record<string, string> = {
  IMPROVING: "Melhorando",
  STABLE: "Estável",
  DECLINING: "Em declínio",
};

const IMPACT_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-rose-100 text-rose-800",
};

export function VorcaroTimelineDashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [profile, setProfile] = useState<EvolutionProfile | null>(null);
  const [healthLabel, setHealthLabel] = useState<string>("");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [historyDays, setHistoryDays] = useState(0);
  const [hasSufficientHistory, setHasSufficientHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineRes, evolutionRes, achievementsRes] = await Promise.all([
        fetch("/api/vorcaro/timeline", { credentials: "include" }),
        fetch("/api/vorcaro/evolution", { credentials: "include" }),
        fetch("/api/vorcaro/achievements", { credentials: "include" }),
      ]);

      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setEvents(data.events ?? []);
        setHistoryDays(data.historyDaysAvailable ?? 0);
        setHasSufficientHistory(data.hasSufficientHistory ?? false);
      }

      if (evolutionRes.ok) {
        const data = await evolutionRes.json();
        setProfile(data.profile ?? null);
        setHealthLabel(data.healthScore?.label ?? "");
        if (data.profile?.historyDaysAvailable != null) {
          setHistoryDays(data.profile.historyDaysAvailable);
        }
        setHasSufficientHistory(data.hasSufficientHistory ?? false);
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando memória financeira…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasSufficientHistory ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não há histórico suficiente para uma análise confiável. Continue usando o LOGOS — após 30 dias de
          snapshots, comparações e tendências ficam disponíveis. ({historyDays} dias registrados)
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Score</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">{healthLabel || "—"}</p>
        </div>
        {profile ? (
          <>
            {(
              [
                ["Saúde", profile.healthTrend],
                ["Patrimônio", profile.netWorthTrend],
                ["Caixa", profile.cashflowTrend],
                ["Gastos", profile.spendingTrend],
                ["Dívida", profile.debtTrend],
                ["Metas", profile.goalTrend],
              ] as const
            ).map(([label, trend]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {TREND_LABELS[trend] ?? trend}
                </p>
              </div>
            ))}
          </>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">Conquistas</h2>
        </div>
        {achievements.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conquista desbloqueada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {achievements.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-600">{a.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(a.unlockedAt).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Linha do tempo</h2>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="space-y-4">
            {events.map((e) => (
              <li key={e.id} className="border-l-2 border-emerald-500 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {new Date(e.eventDate).toLocaleDateString("pt-BR")}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${IMPACT_COLORS[e.impactLevel] ?? IMPACT_COLORS.LOW}`}
                  >
                    {e.impactLevel}
                  </span>
                </div>
                <p className="font-medium text-slate-900">{e.title}</p>
                <p className="text-sm text-slate-600">{e.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
