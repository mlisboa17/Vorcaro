"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PeriodPreset, resolvePeriodPreset } from "@/lib/utils/date-periods";

interface DateRangePickerProps {
  period: PeriodPreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onChange: (next: { period: PeriodPreset; startDate?: string; endDate?: string }) => void;
  className?: string;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "current_month", label: "Este mês" },
  { value: "previous_month", label: "Mês anterior" },
  { value: "custom", label: "Personalizado" },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function DateRangePicker({
  period,
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Estados temporários do calendário
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Mês exibido no calendário
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (startDate) return new Date(startDate);
    return new Date();
  });

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincroniza estados temporários quando o popover abre
  useEffect(() => {
    if (isOpen) {
      if (period === "custom" && startDate && endDate) {
        setTempStart(new Date(startDate + "T00:00:00"));
        setTempEnd(new Date(endDate + "T23:59:59"));
        setCurrentMonth(new Date(startDate + "T00:00:00"));
      } else {
        const resolved = resolvePeriodPreset(period);
        setTempStart(resolved.startDate);
        setTempEnd(resolved.endDate);
        setCurrentMonth(resolved.startDate);
      }
      setHoverDate(null);
    }
  }, [isOpen, period, startDate, endDate]);

  // Formata o período ativo para exibição no botão principal
  const displayLabel = useMemo(() => {
    if (period === "custom" && startDate && endDate) {
      const formatStr = (str: string) => {
        const parts = str.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };
      return `${formatStr(startDate)} - ${formatStr(endDate)}`;
    }
    return resolvePeriodPreset(period).label;
  }, [period, startDate, endDate]);

  // Dias a serem renderizados no calendário do mês corrente
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Primeiro dia do mês e seu dia da semana
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 a 6 (Dom a Sáb)

    // Total de dias no mês
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Dias do mês anterior para preenchimento (grid)
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Preenche dias do mês anterior
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Preenche dias do mês corrente
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Preenche dias do mês seguinte até completar o grid de 42 células (6 semanas)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  function handlePrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  // Lida com cliques nos dias do calendário (seleção de 2 cliques)
  function handleDayClick(date: Date) {
    if (!tempStart || (tempStart && tempEnd)) {
      // Primeiro clique: define o início
      setTempStart(date);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      // Segundo clique: define o fim
      if (date < tempStart) {
        // Se clicar em data anterior ao início, ela vira o novo início
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  }

  // Verifica se o dia é o início ou o fim exato
  function isStart(date: Date) {
    return tempStart ? date.toDateString() === tempStart.toDateString() : false;
  }

  function isEnd(date: Date) {
    return tempEnd ? date.toDateString() === tempEnd.toDateString() : false;
  }

  // Verifica se o dia está dentro da faixa selecionada (ou na faixa sendo hovered)
  function isInRange(date: Date) {
    if (tempStart && tempEnd) {
      return date >= tempStart && date <= tempEnd;
    }
    if (tempStart && hoverDate) {
      const [start, end] = tempStart < hoverDate ? [tempStart, hoverDate] : [hoverDate, tempStart];
      return date >= start && date <= end;
    }
    return false;
  }

  // Formata um objeto Date para string YYYY-MM-DD
  function toYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Aplica o período selecionado
  function handleApply() {
    if (tempStart && tempEnd) {
      onChange({
        period: "custom",
        startDate: toYmd(tempStart),
        endDate: toYmd(tempEnd),
      });
      setIsOpen(false);
    }
  }

  // Lida com cliques rápidos nos presets
  function handlePresetClick(value: PeriodPreset) {
    if (value === "custom") {
      // Não fecha o popover, apenas permite selecionar no calendário
      return;
    }

    const resolved = resolvePeriodPreset(value);
    onChange({
      period: value,
      startDate: toYmd(resolved.startDate),
      endDate: toYmd(resolved.endDate),
    });
    setIsOpen(false);
  }

  const isCustomActive = period === "custom" || !tempEnd;

  return (
    <div className={cn("relative inline-block text-left", className)} ref={popoverRef}>
      {/* Botão de Período */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950"
      >
        <CalendarIcon className="h-4 w-4 text-slate-500" />
        <span>{displayLabel}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 flex flex-col md:flex-row rounded-xl border border-slate-200 bg-white shadow-xl max-w-full md:max-w-2xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1">
          {/* Menu Lateral de Presets */}
          <div className="w-full md:w-48 bg-slate-50 p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetClick(p.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition",
                  period === p.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-200/60"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendário e Seleção de Range */}
          <div className="flex flex-col p-4 space-y-4">
            <header className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </header>

            {/* Grid dos Dias */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEKDAYS.map((w) => (
                <div key={w} className="font-semibold text-slate-400 py-1">
                  {w}
                </div>
              ))}

              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const activeStart = isStart(date);
                const activeEnd = isEnd(date);
                const activeRange = isInRange(date);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(date)}
                    onMouseEnter={() => setHoverDate(date)}
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center font-medium transition-all relative",
                      isCurrentMonth ? "text-slate-800" : "text-slate-300",
                      activeRange && "bg-emerald-50 text-emerald-800 rounded-none first:rounded-l-lg last:rounded-r-lg",
                      activeStart && "bg-emerald-600 text-white rounded-lg z-10 shadow-sm",
                      activeEnd && "bg-emerald-600 text-white rounded-lg z-10 shadow-sm",
                      !activeStart && !activeEnd && "hover:bg-slate-100"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Botões Aplicar/Cancelar */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
