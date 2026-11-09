import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Wrench,
  FileText,
  HardHat,
  RefreshCw,
  History,
  Map as MapIcon,
  ShieldAlert,
  PlayCircle,
  CheckSquare,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  ReportItem,
  UserProfile,
  WorkOrderHistoryItem,
  WorkOrderItem,
  maskCitizenData,
} from "../types";
import {
  fetchSystemWorkOrders,
  filterEmployeeWorkOrders,
  getWorkOrderHistory,
} from "../lib/workOrderService";

interface EmployeeFieldLogViewProps {
  user: UserProfile;
  category?: string;
  reports?: ReportItem[];
  selectedWorkOrderId?: string | null;
  onRefresh?: () => Promise<void> | void;
  onViewImage?: (url: string, title: string) => void;
  onOpenMap?: (workOrderId: string) => void;
  onOpenWorkExecution?: (workOrderId: string) => void;
}

type CalendarCommitmentStatus = "pending" | "in_progress" | "overdue" | "completed";

interface ScheduledWorkOrder {
  wo: WorkOrderItem;
  dateKey: string; // YYYY-MM-DD local
  dateObj: Date;
  dateSource: "deadline" | "completed_at" | "created_at";
  dateSourceLabel: string;
  hasExplicitTime: boolean;
  timeLabel: string | null;
  visualStatus: CalendarCommitmentStatus;
  daysFromToday: number; // < 0 past/overdue, 0 today, > 0 upcoming
  isUrgentPriority: boolean;
  isDueSoon: boolean;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseRealDateValue = (
  raw?: string | null
): { date: Date; dateKey: string; hasTime: boolean; timeLabel: string | null } | null => {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // YYYY-MM-DD puro (sem horário definido)
  const dateOnlyIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyIso) {
    const [, y, m, d] = dateOnlyIso;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
    if (!Number.isNaN(localDate.getTime())) {
      return {
        date: localDate,
        dateKey: `${y}-${m}-${d}`,
        hasTime: false,
        timeLabel: null,
      };
    }
  }

  // DD/MM/YYYY puro (sem horário definido)
  const dateOnlyBr = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateOnlyBr) {
    const [, d, m, y] = dateOnlyBr;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
    if (!Number.isNaN(localDate.getTime())) {
      return {
        date: localDate,
        dateKey: `${y}-${m}-${d}`,
        hasTime: false,
        timeLabel: null,
      };
    }
  }

  // Timestamp real (created_at / completed_at)
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const hasNonMidnightTime = parsed.getHours() !== 0 || parsed.getMinutes() !== 0;
  return {
    date: parsed,
    dateKey: formatDateKey(parsed),
    hasTime: hasNonMidnightTime,
    timeLabel: hasNonMidnightTime
      ? parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null,
  };
};

const formatFullPtDate = (dateKey: string): string => {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const [, y, m, d] = match;
  const dt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatShortPtDate = (raw?: string | null): string => {
  const parsed = parseRealDateValue(raw);
  if (!parsed) return "Não definido";
  return parsed.date.toLocaleDateString("pt-BR");
};

const STATUS_META: Record<
  CalendarCommitmentStatus,
  {
    label: string;
    dotClass: string;
    badgeDark: string;
    badgeLight: string;
    pillDark: string;
    pillLight: string;
  }
> = {
  overdue: {
    label: "Atrasada",
    dotClass: "bg-rose-500",
    badgeDark: "bg-rose-500/20 text-rose-300 border-rose-500/35",
    badgeLight: "bg-rose-50 text-rose-700 border-rose-200",
    pillDark: "bg-rose-500/25 text-rose-200 border-rose-400/40",
    pillLight: "bg-rose-100 text-rose-800 border-rose-300",
  },
  in_progress: {
    label: "Em Execução",
    dotClass: "bg-amber-500",
    badgeDark: "bg-amber-500/20 text-amber-300 border-amber-500/35",
    badgeLight: "bg-amber-50 text-amber-700 border-amber-200",
    pillDark: "bg-amber-500/25 text-amber-200 border-amber-400/40",
    pillLight: "bg-amber-100 text-amber-800 border-amber-300",
  },
  pending: {
    label: "A Iniciar",
    dotClass: "bg-cyan-500",
    badgeDark: "bg-cyan-500/20 text-cyan-300 border-cyan-500/35",
    badgeLight: "bg-cyan-50 text-cyan-700 border-cyan-200",
    pillDark: "bg-cyan-500/25 text-cyan-200 border-cyan-400/40",
    pillLight: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
  completed: {
    label: "Concluída",
    dotClass: "bg-emerald-500",
    badgeDark: "bg-emerald-500/20 text-emerald-300 border-emerald-500/35",
    badgeLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pillDark: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40",
    pillLight: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

const PRIORITY_LABELS: Record<string, { label: string; isUrgent: boolean }> = {
  emergency: { label: "Emergência", isUrgent: true },
  high: { label: "Alta Prioridade", isUrgent: true },
  medium: { label: "Prioridade Média", isUrgent: false },
  low: { label: "Prioridade Baixa", isUrgent: false },
};

export const EmployeeFieldLogView: React.FC<EmployeeFieldLogViewProps> = ({
  user,
  category,
  reports = [],
  selectedWorkOrderId,
  onRefresh,
  onViewImage,
  onOpenMap,
  onOpenWorkExecution,
}) => {
  const { isDark } = useTheme();
  const assignedSector = category || user.assigned_category || "Pavimentação";

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navegação mensal do calendário
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [statusFilter, setStatusFilter] = useState<"all" | CalendarCommitmentStatus>("all");

  // Ordem de Serviço selecionada para inspeção completa
  const [activeWoId, setActiveWoId] = useState<string | null>(selectedWorkOrderId || null);
  const [historyItems, setHistoryItems] = useState<WorkOrderHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const list = await fetchSystemWorkOrders(user.city_id);
      setWorkOrders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadWorkOrders();
      if (onRefresh) await onRefresh();
      if (activeWoId) {
        const selectedOrder = workOrders.find(
          (order) => order.id === activeWoId || order.order_number === activeWoId,
        );
        if (selectedOrder) {
          const hist = await getWorkOrderHistory(
            selectedOrder.id,
            selectedOrder.city_id || user.city_id || "",
          );
          setHistoryItems(hist);
        }
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  // O.S. atribuídas ao funcionário ou ao seu setor operacional
  const myWorkOrders = useMemo(
    () => filterEmployeeWorkOrders(workOrders, user, assignedSector),
    [workOrders, user, assignedSector]
  );

  // Mapeia cada O.S. para sua data real (sem inventar horários ou compromissos)
  const scheduledOrders = useMemo<ScheduledWorkOrder[]>(() => {
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    const msPerDay = 1000 * 60 * 60 * 24;

    return myWorkOrders
      .map((wo) => {
        const isClosed =
          wo.status === "completed" || wo.status === "impossible" || wo.status === "cancelled";

        const parsedDeadline = parseRealDateValue(wo.deadline);
        const parsedCompleted = parseRealDateValue(wo.completed_at);
        const parsedCreated = parseRealDateValue(wo.created_at);

        let chosen = parsedDeadline;
        let dateSource: "deadline" | "completed_at" | "created_at" = "deadline";
        let dateSourceLabel = "Prazo estipulado";

        if (isClosed && parsedCompleted && !parsedDeadline) {
          chosen = parsedCompleted;
          dateSource = "completed_at";
          dateSourceLabel = "Concluída em";
        } else if (!chosen && parsedCompleted) {
          chosen = parsedCompleted;
          dateSource = "completed_at";
          dateSourceLabel = "Concluída em";
        } else if (!chosen && parsedCreated) {
          chosen = parsedCreated;
          dateSource = "created_at";
          dateSourceLabel = "Emitida em";
        }

        if (!chosen) return null;

        const targetMidnight = new Date(
          chosen.date.getFullYear(),
          chosen.date.getMonth(),
          chosen.date.getDate(),
          0,
          0,
          0,
          0
        ).getTime();

        const daysFromToday = Math.round((targetMidnight - todayMidnight) / msPerDay);

        // Classificação visual conforme o status real e o prazo
        let visualStatus: CalendarCommitmentStatus = "pending";
        if (isClosed) {
          visualStatus = "completed";
        } else if (parsedDeadline && daysFromToday < 0) {
          visualStatus = "overdue";
        } else if (wo.status === "in_progress") {
          visualStatus = "in_progress";
        } else {
          visualStatus = "pending";
        }

        const isUrgentPriority = wo.priority === "emergency" || wo.priority === "high";
        const isDueSoon = !isClosed && parsedDeadline !== null && daysFromToday >= 0 && daysFromToday <= 3;

        return {
          wo,
          dateKey: chosen.dateKey,
          dateObj: chosen.date,
          dateSource,
          dateSourceLabel,
          hasExplicitTime: dateSource !== "deadline" && chosen.hasTime,
          timeLabel: dateSource !== "deadline" ? chosen.timeLabel : null,
          visualStatus,
          daysFromToday,
          isUrgentPriority,
          isDueSoon,
        };
      })
      .filter((item): item is ScheduledWorkOrder => item !== null)
      .sort((a, b) => {
        const statusRank: Record<CalendarCommitmentStatus, number> = {
          overdue: 0,
          in_progress: 1,
          pending: 2,
          completed: 3,
        };
        if (statusRank[a.visualStatus] !== statusRank[b.visualStatus]) {
          return statusRank[a.visualStatus] - statusRank[b.visualStatus];
        }
        if (a.isUrgentPriority !== b.isUrgentPriority) {
          return a.isUrgentPriority ? -1 : 1;
        }
        return a.dateKey.localeCompare(b.dateKey);
      });
  }, [myWorkOrders, today]);

  // Filtro por status no calendário
  const visibleScheduledOrders = useMemo(() => {
    if (statusFilter === "all") return scheduledOrders;
    return scheduledOrders.filter((item) => item.visualStatus === statusFilter);
  }, [scheduledOrders, statusFilter]);

  // Agrupamento de O.S. por dia (YYYY-MM-DD)
  const ordersByDateKey = useMemo(() => {
    const map = new Map<string, ScheduledWorkOrder[]>();
    visibleScheduledOrders.forEach((item) => {
      const arr = map.get(item.dateKey) || [];
      arr.push(item);
      map.set(item.dateKey, arr);
    });
    return map;
  }, [visibleScheduledOrders]);

  // Sincroniza quando uma O.S. vem selecionada de outra tela (Mapa ou Execução)
  useEffect(() => {
    if (!selectedWorkOrderId || scheduledOrders.length === 0) return;
    const target = scheduledOrders.find(
      (item) =>
        item.wo.id === selectedWorkOrderId || item.wo.order_number === selectedWorkOrderId
    );
    if (target) {
      setViewYear(target.dateObj.getFullYear());
      setViewMonth(target.dateObj.getMonth());
      setSelectedDateKey(target.dateKey);
      setActiveWoId(target.wo.id);
    }
  }, [selectedWorkOrderId, scheduledOrders.length]);

  // Ao selecionar um dia, garante que exista uma O.S. ativa coerente com o dia (se houver)
  const selectedDayOrders = useMemo(() => {
    return ordersByDateKey.get(selectedDateKey) || [];
  }, [ordersByDateKey, selectedDateKey]);

  useEffect(() => {
    if (selectedDayOrders.length > 0) {
      const stillInDay = selectedDayOrders.some((i) => i.wo.id === activeWoId);
      if (!stillInDay) {
        setActiveWoId(selectedDayOrders[0].wo.id);
      }
    }
  }, [selectedDateKey, selectedDayOrders]);

  const activeScheduledItem = useMemo(() => {
    if (!activeWoId) return selectedDayOrders[0] || null;
    return (
      scheduledOrders.find((i) => i.wo.id === activeWoId || i.wo.order_number === activeWoId) ||
      selectedDayOrders[0] ||
      null
    );
  }, [activeWoId, scheduledOrders, selectedDayOrders]);

  // Carrega histórico real da O.S. selecionada
  useEffect(() => {
    if (!activeScheduledItem?.wo.id) {
      setHistoryItems([]);
      return;
    }
    setLoadingHistory(true);
    getWorkOrderHistory(
      activeScheduledItem.wo.id,
      activeScheduledItem.wo.city_id || user.city_id || "",
    )
      .then((hist) => setHistoryItems(hist))
      .catch(() => setHistoryItems([]))
      .finally(() => setLoadingHistory(false));
  }, [activeScheduledItem?.wo.id, activeScheduledItem?.wo.city_id, user.city_id]);

  // Chamado cidadão vinculado (com proteção LGPD para Funcionário)
  const linkedReport = useMemo(() => {
    const wo = activeScheduledItem?.wo;
    if (!wo) return null;
    const raw =
      reports.find(
        (r) =>
          !r.is_work_order &&
          ((wo.linked_report_id && r.id === wo.linked_report_id) ||
            (wo.order_number && r.work_order_number === wo.order_number))
      ) || null;
    return raw ? maskCitizenData(raw, "funcionario") : null;
  }, [activeScheduledItem?.wo, reports]);

  // Destaques: serviços urgentes, atrasados e prazos próximos
  const priorityAlerts = useMemo(() => {
    return scheduledOrders.filter(
      (item) =>
        item.visualStatus !== "completed" &&
        (item.visualStatus === "overdue" || item.isUrgentPriority || item.isDueSoon)
    );
  }, [scheduledOrders]);

  // Serviços anteriores (concluídos ou de datas anteriores à de hoje) para consulta rápida de registros
  const pastAndCompletedOrders = useMemo(() => {
    return [...scheduledOrders]
      .filter((item) => item.visualStatus === "completed" || item.dateKey < todayKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [scheduledOrders, todayKey]);

  // Meses que possuem O.S. atribuídas (para navegação rápida quando o mês atual estiver vazio)
  const monthsWithOrders = useMemo(() => {
    const map = new Map<string, { year: number; month: number; count: number; firstDateKey: string }>();
    visibleScheduledOrders.forEach((item) => {
      const y = item.dateObj.getFullYear();
      const m = item.dateObj.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { year: y, month: m, count: 1, firstDateKey: item.dateKey });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [visibleScheduledOrders]);

  const currentMonthOrderCount = useMemo(() => {
    return visibleScheduledOrders.filter(
      (item) =>
        item.dateObj.getFullYear() === viewYear && item.dateObj.getMonth() === viewMonth
    ).length;
  }, [visibleScheduledOrders, viewYear, viewMonth]);

  // Geração da grade mensal (42 células / 6 semanas para layout estável)
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = Domingo
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      year: number;
      month: number;
    }> = [];

    // Dias finais do mês anterior
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dt = new Date(viewYear, viewMonth - 1, d);
      cells.push({
        dateKey: formatDateKey(dt),
        dayNumber: d,
        isCurrentMonth: false,
        year: dt.getFullYear(),
        month: dt.getMonth(),
      });
    }

    // Dias do mês em exibição
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      cells.push({
        dateKey: formatDateKey(dt),
        dayNumber: d,
        isCurrentMonth: true,
        year: viewYear,
        month: viewMonth,
      });
    }

    // Preenchimento final até fechar múltiplo de 7
    const totalNeeded = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < totalNeeded) {
      const dt = new Date(viewYear, viewMonth + 1, nextDay++);
      cells.push({
        dateKey: formatDateKey(dt),
        dayNumber: dt.getDate(),
        isCurrentMonth: false,
        year: dt.getFullYear(),
        month: dt.getMonth(),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateKey(formatDateKey(now));
  };

  const focusScheduledItem = (item: ScheduledWorkOrder) => {
    setViewYear(item.dateObj.getFullYear());
    setViewMonth(item.dateObj.getMonth());
    setSelectedDateKey(item.dateKey);
    setActiveWoId(item.wo.id);
  };

  return (
    <div
      className={`relative min-h-[100dvh] w-full font-sans pb-36 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Header Nativo do Perfil Funcionário */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? "bg-[#5A635C]/90 border-white/15 text-white"
            : "bg-white/90 border-[#183a2b]/10 text-[#183a2b]"
        }`}
      >
        <div className="max-w-6xl mx-auto pl-4 sm:pl-6 lg:pl-8 pr-20 sm:pr-24 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-sm">
                <CalendarIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-bold tracking-wider">
                    COMMUÁRIA
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Operacional
                  </span>
                </div>
                <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                  Calendário de Campo · Setor: <strong>{assignedSector}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                    : "bg-zinc-50 hover:bg-zinc-100 border-black/10 text-[#183a2b]"
                }`}
                title="Atualizar agenda de campo"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white/80"
                    : "bg-black/5 border-black/10 text-[#183a2b]"
                }`}
              >
                <HardHat size={14} className="text-cyan-500" />
                <span className="font-semibold truncate max-w-[150px]">
                  {user.name || "Servidor"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
        {/* Destaques: Serviços Urgentes, Prazos Vencidos e Prazos Próximos */}
        {priorityAlerts.length > 0 && (
          <section
            className={`rounded-3xl border p-4 sm:p-5 space-y-3 transition-all ${
              isDark
                ? "bg-white/5 border-white/15"
                : "bg-zinc-50 border-black/10 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <h3 className="text-sm font-serif font-bold">
                  Atenção na Agenda: Urgências & Prazos Críticos ({priorityAlerts.length})
                </h3>
              </div>
              <span className="text-[11px] opacity-70">
                Toque em um serviço para ir direto à data no calendário
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {priorityAlerts.slice(0, 6).map((item) => {
                const isSelected = activeScheduledItem?.wo.id === item.wo.id;
                const isOverdue = item.visualStatus === "overdue";
                return (
                  <button
                    key={item.wo.id}
                    type="button"
                    onClick={() => focusScheduledItem(item)}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? isDark
                          ? "bg-cyan-500/20 border-cyan-400/50 shadow-md"
                          : "bg-cyan-50 border-cyan-600/40 shadow-sm"
                        : isOverdue
                        ? isDark
                          ? "bg-rose-950/25 border-rose-500/35 hover:border-rose-400/55"
                          : "bg-rose-50/70 border-rose-200 hover:border-rose-300"
                        : isDark
                        ? "bg-black/15 border-white/10 hover:border-white/25"
                        : "bg-white border-black/10 hover:border-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                        {item.wo.order_number}
                      </span>

                      <div className="flex items-center gap-1">
                        {item.wo.priority === "emergency" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                            EMERGÊNCIA
                          </span>
                        )}
                        {item.wo.priority === "high" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-zinc-950">
                            ALTA
                          </span>
                        )}
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            Atrasada ({Math.abs(item.daysFromToday)}d)
                          </span>
                        ) : item.daysFromToday === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Prazo Hoje
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                            Em {item.daysFromToday}d
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-xs line-clamp-1">{item.wo.title}</p>
                      <p className="text-[11px] opacity-75 truncate mt-0.5">
                        {formatShortPtDate(item.dateKey)} · {item.wo.address}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Área Principal: Grade Mensal do Calendário + Agenda do Dia / Detalhes da O.S. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: CALENDÁRIO MENSAL */}
          <section
            className={`lg:col-span-7 rounded-[32px] border p-4 sm:p-6 space-y-4 transition-all ${
              isDark
                ? "bg-white/5 border-white/15 text-white shadow-xl"
                : "bg-white border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            {/* Cabeçalho de Navegação Mensal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold">
                  {MONTH_NAMES[viewMonth]} de {viewYear}
                </h2>
                <p className="text-xs opacity-70">
                  {currentMonthOrderCount > 0
                    ? `${currentMonthOrderCount} Ordem(ns) de Serviço neste mês`
                    : "Nenhuma O.S. registrada neste mês"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                      : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                  }`}
                  title="Mês anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={goToToday}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                      : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                  }`}
                >
                  Hoje
                </button>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                      : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                  }`}
                  title="Próximo mês"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Filtro Visual por Status de Compromisso */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: `Todos (${scheduledOrders.length})` },
                {
                  id: "pending",
                  label: `A Iniciar (${
                    scheduledOrders.filter((i) => i.visualStatus === "pending").length
                  })`,
                },
                {
                  id: "in_progress",
                  label: `Em Execução (${
                    scheduledOrders.filter((i) => i.visualStatus === "in_progress").length
                  })`,
                },
                {
                  id: "overdue",
                  label: `Atrasados (${
                    scheduledOrders.filter((i) => i.visualStatus === "overdue").length
                  })`,
                },
                {
                  id: "completed",
                  label: `Concluídos (${
                    scheduledOrders.filter((i) => i.visualStatus === "completed").length
                  })`,
                },
              ].map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => setStatusFilter(flt.id as any)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border shrink-0 transition-all cursor-pointer ${
                    statusFilter === flt.id
                      ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                      : isDark
                      ? "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                      : "bg-zinc-50 text-[#183a2b] border-black/10 hover:bg-zinc-100"
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>

            {/* Atalho rápido caso as O.S. reais estejam em outros meses */}
            {currentMonthOrderCount === 0 && monthsWithOrders.length > 0 && (
              <div
                className={`p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isDark
                    ? "bg-cyan-500/10 border-cyan-400/25 text-cyan-100"
                    : "bg-cyan-50/80 border-cyan-200 text-[#183a2b]"
                }`}
              >
                <span>Meses com O.S. atribuídas a você:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {monthsWithOrders.slice(0, 4).map((m) => (
                    <button
                      key={`${m.year}-${m.month}`}
                      type="button"
                      onClick={() => {
                        setViewYear(m.year);
                        setViewMonth(m.month);
                        setSelectedDateKey(m.firstDateKey);
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-all cursor-pointer"
                    >
                      {MONTH_NAMES[m.month].substring(0, 3)}/{m.year} ({m.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1.5 text-center pt-1">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="text-[11px] font-bold uppercase tracking-wider opacity-60 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grade Mensal (7 Colunas) */}
            {loading ? (
              <div className="py-16 text-center text-xs opacity-70">
                Carregando calendário operacional...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarCells.map((cell) => {
                  const dayOrders = ordersByDateKey.get(cell.dateKey) || [];
                  const isToday = cell.dateKey === todayKey;
                  const isSelected = cell.dateKey === selectedDateKey;
                  const hasOverdue = dayOrders.some((o) => o.visualStatus === "overdue");
                  const hasUrgent = dayOrders.some(
                    (o) => o.isUrgentPriority && o.visualStatus !== "completed"
                  );

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey(cell.dateKey);
                        if (!cell.isCurrentMonth) {
                          setViewYear(cell.year);
                          setViewMonth(cell.month);
                        }
                      }}
                      className={`relative min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? isDark
                            ? "bg-cyan-500/25 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg"
                            : "bg-cyan-50 border-cyan-600 ring-2 ring-cyan-600/25 shadow-sm"
                          : hasOverdue
                          ? isDark
                            ? "bg-rose-950/20 border-rose-500/35 hover:border-rose-400/60"
                            : "bg-rose-50/50 border-rose-200 hover:border-rose-300"
                          : dayOrders.length > 0
                          ? isDark
                            ? "bg-white/10 border-white/20 hover:bg-white/15"
                            : "bg-zinc-50 border-black/15 hover:border-black/25"
                          : isDark
                          ? "bg-black/10 border-white/5 hover:bg-white/5"
                          : "bg-white border-black/5 hover:bg-zinc-50"
                      } ${!cell.isCurrentMonth ? "opacity-45" : ""}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs sm:text-sm font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-cyan-600 text-white shadow-sm"
                              : ""
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {dayOrders.length > 0 && (
                          <span
                            className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-md ${
                              hasOverdue
                                ? "bg-rose-500 text-white"
                                : hasUrgent
                                ? "bg-amber-500 text-zinc-950"
                                : isDark
                                ? "bg-white/15 text-white"
                                : "bg-[#183a2b]/10 text-[#183a2b]"
                            }`}
                          >
                            {dayOrders.length}
                          </span>
                        )}
                      </div>

                      {/* Marcadores Visuais de Status no Dia */}
                      {dayOrders.length > 0 && (
                        <div className="space-y-1 w-full mt-1">
                          {/* Pílula compacta visível em telas médias/grandes */}
                          <div className="hidden sm:flex flex-col gap-0.5">
                            {dayOrders.slice(0, 2).map((item) => {
                              const meta = STATUS_META[item.visualStatus];
                              return (
                                <span
                                  key={item.wo.id}
                                  className={`block truncate text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                    isDark ? meta.pillDark : meta.pillLight
                                  }`}
                                >
                                  {item.wo.order_number.replace(/^OS-[A-Z]+-\d+-/, "OS-")}
                                </span>
                              );
                            })}
                            {dayOrders.length > 2 && (
                              <span className="text-[9px] font-mono opacity-70 pl-1">
                                +{dayOrders.length - 2} mais
                              </span>
                            )}
                          </div>

                          {/* Pontos coloridos por status (mobile + reforço visual) */}
                          <div className="flex items-center gap-1 flex-wrap sm:hidden">
                            {dayOrders.slice(0, 4).map((item) => (
                              <span
                                key={item.wo.id}
                                className={`w-2 h-2 rounded-full ${
                                  STATUS_META[item.visualStatus].dotClass
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legenda dos Compromissos no Calendário */}
            <div
              className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                isDark ? "border-white/10" : "border-black/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {(["pending", "in_progress", "overdue", "completed"] as CalendarCommitmentStatus[]).map(
                  (st) => (
                    <span key={st} className="flex items-center gap-1.5 font-medium opacity-85">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[st].dotClass}`} />
                      <span>{STATUS_META[st].label}</span>
                    </span>
                  )
                )}
              </div>
              <span className="opacity-60 font-mono">Hoje: {formatShortPtDate(todayKey)}</span>
            </div>
          </section>

          {/* COLUNA DIREITA: COMPROMISSOS DO DIA SELECIONADO + DETALHES DA O.S. */}
          <section className="lg:col-span-5 space-y-4">
            {/* Bloco 1: O.S. Programadas / Relacionadas ao Dia Selecionado */}
            <div
              className={`rounded-[32px] border p-5 space-y-3.5 transition-all ${
                isDark
                  ? "bg-white/5 border-white/15 text-white"
                  : "bg-zinc-50 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 block">
                    Agenda do Dia Selecionado
                  </span>
                  <h3 className="text-base sm:text-lg font-serif font-bold capitalize mt-0.5">
                    {formatFullPtDate(selectedDateKey)}
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 shrink-0">
                  {selectedDayOrders.length} O.S.
                </span>
              </div>

              {selectedDayOrders.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-1.5 ${
                    isDark ? "bg-black/15 border-white/10" : "bg-white border-black/5"
                  }`}
                >
                  <CalendarIcon size={24} className="mx-auto opacity-40 text-cyan-500" />
                  <p className="text-xs font-bold">
                    Nenhuma Ordem de Serviço vinculada a esta data
                  </p>
                  <p className="text-[11px] opacity-70">
                    Selecione um dia marcado no calendário para consultar as O.S. programadas ou anteriores.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayOrders.map((item) => {
                    const meta = STATUS_META[item.visualStatus];
                    const prio = PRIORITY_LABELS[item.wo.priority] || PRIORITY_LABELS.medium;
                    const isSelectedWo = activeScheduledItem?.wo.id === item.wo.id;

                    return (
                      <button
                        key={item.wo.id}
                        type="button"
                        onClick={() => setActiveWoId(item.wo.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelectedWo
                            ? isDark
                              ? "bg-cyan-500/20 border-cyan-400/50 shadow-md"
                              : "bg-white border-cyan-600 ring-1 ring-cyan-600/25 shadow-sm"
                            : isDark
                            ? "bg-black/15 border-white/10 hover:border-white/25"
                            : "bg-white border-black/10 hover:border-black/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                            <span className="font-mono text-xs font-extrabold">
                              {item.wo.order_number}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {prio.isUrgent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                {prio.label}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isDark ? meta.badgeDark : meta.badgeLight
                              }`}
                            >
                              {item.wo.status === "impossible"
                                ? "Impedimento Registrado"
                                : meta.label}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-serif font-bold text-sm leading-snug">
                          {item.wo.title}
                        </h4>

                        <p className="text-xs opacity-80 flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{item.wo.address}</span>
                        </p>

                        <div className="flex items-center justify-between text-[11px] opacity-70 pt-1 border-t border-black/5 dark:border-white/10">
                          <span>
                            {item.dateSourceLabel}:{" "}
                            <strong className="font-mono">{formatShortPtDate(item.dateKey)}</strong>
                          </span>
                          <span className="font-mono">
                            {item.hasExplicitTime && item.timeLabel
                              ? `Registro às ${item.timeLabel}`
                              : "Dia inteiro"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bloco 2: Ficha Completa da O.S. Selecionada */}
            {activeScheduledItem && (
              <div
                className={`rounded-[32px] border p-5 sm:p-6 space-y-4 transition-all ${
                  isDark
                    ? "bg-white/5 border-white/20 text-white shadow-xl"
                    : "bg-white border-black/10 text-[#183a2b] shadow-md"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-black/10 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                      {activeScheduledItem.wo.order_number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark
                          ? STATUS_META[activeScheduledItem.visualStatus].badgeDark
                          : STATUS_META[activeScheduledItem.visualStatus].badgeLight
                      }`}
                    >
                      {activeScheduledItem.wo.status === "impossible"
                        ? "Impedimento Técnico"
                        : STATUS_META[activeScheduledItem.visualStatus].label}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      activeScheduledItem.isUrgentPriority
                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/35"
                        : isDark
                        ? "bg-white/10 text-white/80 border-white/15"
                        : "bg-zinc-100 text-[#183a2b] border-black/10"
                    }`}
                  >
                    {(PRIORITY_LABELS[activeScheduledItem.wo.priority] || PRIORITY_LABELS.medium).label}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold leading-snug mb-1.5">
                    {activeScheduledItem.wo.title}
                  </h3>
                  <p className="text-xs opacity-85 flex items-start gap-1.5">
                    <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{activeScheduledItem.wo.address}</span>
                  </p>
                </div>

                {/* Datas Reais e Equipe */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
                  <div>
                    <span className="block text-[10px] opacity-60">Prazo Estipulado</span>
                    <span className="font-mono font-bold block mt-0.5">
                      {activeScheduledItem.wo.deadline
                        ? formatShortPtDate(activeScheduledItem.wo.deadline)
                        : "Sem prazo fixado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60">Emitida em</span>
                    <span className="font-mono font-semibold block mt-0.5">
                      {formatShortPtDate(activeScheduledItem.wo.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60">Equipe / Responsável</span>
                    <span className="font-semibold block truncate mt-0.5">
                      {activeScheduledItem.wo.assigned_employee_name ||
                        activeScheduledItem.wo.assigned_team ||
                        "Equipe do Setor"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60">Supervisor</span>
                    <span className="font-semibold block truncate mt-0.5">
                      {activeScheduledItem.wo.supervisor_name || "Supervisão Técnica"}
                    </span>
                  </div>
                </div>

                {/* Instruções Técnicas do Supervisor */}
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    isDark
                      ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-100"
                      : "bg-cyan-50/70 border-cyan-200 text-[#183a2b]"
                  }`}
                >
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                    <FileText size={13} />
                    Instruções do Supervisor:
                  </span>
                  <p className="opacity-90 leading-relaxed">
                    {activeScheduledItem.wo.technical_instructions?.trim() ||
                      activeScheduledItem.wo.description?.trim() ||
                      "Realizar vistoria técnica e execução conforme protocolo operacional do setor."}
                  </p>
                </div>

                {/* Foto do Chamado Vinculado (se existir) */}
                {linkedReport?.image_url && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold opacity-70 block">
                      Registro Fotográfico do Local:
                    </span>
                    <div
                      onClick={() =>
                        onViewImage?.(linkedReport.image_url!, activeScheduledItem.wo.title)
                      }
                      className="w-full h-36 rounded-2xl bg-cover bg-center border border-black/10 dark:border-white/15 cursor-pointer hover:opacity-95 transition-opacity"
                      style={{ backgroundImage: `url("${linkedReport.image_url}")` }}
                    />
                  </div>
                )}

                {/* Parecer / Notas de Conclusão ou Status */}
                {(activeScheduledItem.wo.resolution_notes || activeScheduledItem.wo.status_notes) && (
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1.5">
                    <span className="font-bold opacity-75 block">
                      Registro Operacional da O.S.:
                    </span>
                    <p className="opacity-90 leading-relaxed">
                      {activeScheduledItem.wo.resolution_notes ||
                        activeScheduledItem.wo.status_notes}
                    </p>
                    {activeScheduledItem.wo.resolution_photo_url && (
                      <img
                        src={activeScheduledItem.wo.resolution_photo_url}
                        alt="Comprovante do serviço"
                        onClick={() =>
                          onViewImage?.(
                            activeScheduledItem.wo.resolution_photo_url!,
                            activeScheduledItem.wo.order_number
                          )
                        }
                        className="mt-2 h-28 w-auto rounded-xl border border-black/10 dark:border-white/15 object-cover cursor-pointer"
                      />
                    )}
                  </div>
                )}

                {/* Histórico Real de Registros da O.S. */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                    <History size={13} className="text-cyan-500" />
                    Registros desta Ordem de Serviço
                  </span>

                  {loadingHistory ? (
                    <p className="text-xs opacity-60">Carregando registros...</p>
                  ) : historyItems.length === 0 ? (
                    <p className="text-xs opacity-65 italic">
                      Nenhum apontamento adicional registrado no histórico desta O.S.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 pl-3 border-l-2 border-cyan-500/35">
                      {historyItems.map((h) => (
                        <div key={h.id} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-cyan-700 dark:text-cyan-300">
                              {h.user_name || "Equipe Técnica"}
                            </span>
                            <span className="text-[10px] font-mono opacity-60">
                              {new Date(h.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          {h.message && <p className="opacity-85 leading-relaxed">{h.message}</p>}
                          {h.photo_url && (
                            <img
                              src={h.photo_url}
                              alt="Registro em campo"
                              onClick={() =>
                                onViewImage?.(h.photo_url!, activeScheduledItem.wo.order_number)
                              }
                              className="mt-1 h-20 w-auto rounded-lg border object-cover cursor-pointer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações Rápidas Integradas */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {onOpenMap && (
                    <button
                      type="button"
                      onClick={() => onOpenMap(activeScheduledItem.wo.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      <MapIcon size={14} className="text-cyan-500" />
                      <span>Ver no Mapa</span>
                    </button>
                  )}

                  {onOpenWorkExecution && (
                    <button
                      type="button"
                      onClick={() => onOpenWorkExecution(activeScheduledItem.wo.id)}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Wrench size={14} />
                      <span>
                        {activeScheduledItem.visualStatus === "completed"
                          ? "Ver na Lista de O.S."
                          : "Executar Serviço"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Consulta Rápida: Serviços Anteriores e Seus Registros */}
        <section className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-lg font-serif font-bold">
                Serviços Anteriores & Histórico de Agenda
              </h3>
              <p className="text-xs opacity-70">
                Consulte O.S. concluídas ou de datas passadas e clique para abrir seus registros no calendário.
              </p>
            </div>
            <span className="text-xs font-mono opacity-70">
              {pastAndCompletedOrders.length} registro(s)
            </span>
          </div>

          {pastAndCompletedOrders.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center text-xs opacity-70 ${
                isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
              }`}
            >
              Nenhum serviço anterior registrado até o momento para o seu perfil ou setor.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pastAndCompletedOrders.map((item) => {
                const meta = STATUS_META[item.visualStatus];
                const isSelected = activeScheduledItem?.wo.id === item.wo.id;
                return (
                  <button
                    key={item.wo.id}
                    type="button"
                    onClick={() => focusScheduledItem(item)}
                    className={`text-left p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? isDark
                          ? "bg-cyan-500/20 border-cyan-400/50 shadow-md"
                          : "bg-cyan-50/70 border-cyan-600/40 shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 hover:border-white/25"
                        : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-cyan-700 dark:text-cyan-300">
                        {item.wo.order_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isDark ? meta.badgeDark : meta.badgeLight
                        }`}
                      >
                        {item.wo.status === "impossible" ? "Impedimento" : meta.label}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-sm line-clamp-1">
                      {item.wo.title}
                    </h4>

                    <p className="text-xs opacity-75 truncate flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{item.wo.address}</span>
                    </p>

                    <div className="flex items-center justify-between text-[11px] opacity-70 pt-1.5 border-t border-black/5 dark:border-white/10">
                      <span className="font-mono">{formatShortPtDate(item.dateKey)}</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        Ver registros →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
