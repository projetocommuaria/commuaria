import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wrench,
  FileText,
  Search,
  MapPin,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronRight,
  PauseCircle,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  CATEGORIES_CONFIG,
  ReportCategory,
  ReportItem,
  UserProfile,
  WorkOrderHistoryItem,
  WorkOrderItem,
  maskCitizenData,
} from "../types";
import {
  fetchRecentWorkOrderHistory,
  fetchSystemWorkOrders,
  normalizeSectorCategory,
} from "../lib/workOrderService";

interface DirectorSlaAuditViewProps {
  user?: UserProfile;
  reports: ReportItem[];
  onRefresh?: () => Promise<void> | void;
  onViewReportDetails?: (report: ReportItem) => void;
  onViewImage?: (url: string, title: string) => void;
}

const parseDeadlineEndOfDay = (deadline?: string | null): Date | null => {
  if (!deadline || !deadline.trim()) return null;
  const raw = deadline.trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatPtDate = (raw?: string | null): string => {
  if (!raw || !raw.trim()) return "Não definido";
  const isoMatch = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString("pt-BR");
};

const extractImpossibilityReason = (wo: WorkOrderItem): string => {
  const text = `${wo.resolution_notes || ""} ${wo.status_notes || ""}`;
  const bracketMatch = text.match(/\[Motivo:\s*([^\]]+)\]/i);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();

  const prefixMatch = text.match(/Impedimento técnico:\s*([^.]+)\./i);
  if (prefixMatch?.[1]) return prefixMatch[1].trim();

  if (wo.status === "cancelled") {
    return "Cancelamento administrativo / encerramento técnico";
  }
  return "Impossibilidade operacional relatada em campo";
};

const STAGNATION_THRESHOLD_DAYS = 3;

export const DirectorSlaAuditView: React.FC<DirectorSlaAuditViewProps> = ({
  user,
  reports = [],
  onRefresh,
  onViewReportDetails,
  onViewImage,
}) => {
  const { isDark } = useTheme();

  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<WorkOrderHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<
    "overdue" | "stagnant" | "impossibilities" | "sectors"
  >("overdue");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOperationalData = async () => {
    const [wos, hist] = await Promise.all([
      fetchSystemWorkOrders(user?.city_id || "araucaria-pr"),
      fetchRecentWorkOrderHistory(200, user?.city_id || "araucaria-pr"),
    ]);
    setWorkOrders(wos);
    setRecentHistory(hist);
  };

  useEffect(() => {
    loadOperationalData();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadOperationalData();
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const nowMs = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;

  // Mapa da última movimentação real registrada por O.S. em work_order_history
  const latestActivityByWoId = useMemo(() => {
    const map = new Map<string, { timestampMs: number; iso: string; summary: string }>();
    recentHistory.forEach((ev) => {
      if (!ev.work_order_id || !ev.created_at) return;
      const ts = new Date(ev.created_at).getTime();
      if (Number.isNaN(ts)) return;
      const existing = map.get(ev.work_order_id);
      if (!existing || ts > existing.timestampMs) {
        map.set(ev.work_order_id, {
          timestampMs: ts,
          iso: ev.created_at,
          summary: ev.message || "Movimentação registrada",
        });
      }
    });
    return map;
  }, [recentHistory]);

  // Chamados reais de munícipes com proteção LGPD
  const citizenReports = useMemo(() => {
    return (Array.isArray(reports) ? reports : [])
      .filter((r) => !r.is_work_order)
      .map((r) => maskCitizenData(r, "diretor"));
  }, [reports]);

  // Análise de atrasos, estagnação e impedimentos nas O.S. reais
  const analyzedWorkOrders = useMemo(() => {
    return workOrders.map((wo) => {
      const sector = normalizeSectorCategory(wo.category, wo.title, wo.description);
      const isPending =
        wo.status === "open" || wo.status === "dispatched" || wo.status === "in_progress";
      const isBlocked = wo.status === "impossible" || wo.status === "cancelled";

      const deadlineDate = parseDeadlineEndOfDay(wo.deadline);
      let overdueDays = 0;
      let daysRemaining: number | null = null;
      let isOverdue = false;
      let isDueSoon = false;

      if (deadlineDate && isPending) {
        const diff = deadlineDate.getTime() - nowMs;
        if (diff < 0) {
          isOverdue = true;
          overdueDays = Math.max(1, Math.ceil(Math.abs(diff) / msPerDay));
        } else {
          daysRemaining = Math.ceil(diff / msPerDay);
          isDueSoon = daysRemaining <= 2;
        }
      }

      const createdMs = wo.created_at ? new Date(wo.created_at).getTime() : nowMs;
      const lastHist = latestActivityByWoId.get(wo.id);
      const lastMovementMs = lastHist ? Math.max(createdMs, lastHist.timestampMs) : createdMs;
      const idleDays = Math.max(0, Math.floor((nowMs - lastMovementMs) / msPerDay));
      const isStagnant = isPending && idleDays >= STAGNATION_THRESHOLD_DAYS;

      return {
        wo,
        sector,
        isPending,
        isBlocked,
        isOverdue,
        isDueSoon,
        overdueDays,
        daysRemaining,
        idleDays,
        isStagnant,
        lastMovementIso: lastHist?.iso || wo.created_at,
        lastMovementSummary:
          lastHist?.summary ||
          wo.status_notes ||
          "Sem registros operacionais após a emissão da O.S.",
        impossibilityReason: isBlocked ? extractImpossibilityReason(wo) : null,
      };
    });
  }, [workOrders, latestActivityByWoId, nowMs]);

  // Chamados abertos aguardando atendimento sem O.S. emitida
  const waitingCitizenReports = useMemo(() => {
    return citizenReports
      .map((rep) => {
        const sector = normalizeSectorCategory(
          rep.category || rep.maintenance_type,
          rep.title,
          rep.description
        );
        const linkedWo = workOrders.find(
          (wo) =>
            (wo.linked_report_id && wo.linked_report_id === rep.id) ||
            (rep.work_order_number && wo.order_number === rep.work_order_number)
        );
        const createdMs = rep.created_at ? new Date(rep.created_at).getTime() : nowMs;
        const waitingDays = Math.max(0, Math.floor((nowMs - createdMs) / msPerDay));
        return {
          report: rep,
          sector,
          linkedWo,
          waitingDays,
        };
      })
      .filter((item) => item.report.status !== "resolved" && !item.linkedWo)
      .sort((a, b) => b.waitingDays - a.waitingDays);
  }, [citizenReports, workOrders, nowMs]);

  // Diagnóstico dos setores com maiores dificuldades operacionais (independente do filtro de secretaria)
  const sectorBottlenecks = useMemo(() => {
    return CATEGORIES_CONFIG.map((cfg) => {
      const secWos = analyzedWorkOrders.filter((i) => i.sector === cfg.id);
      const overdue = secWos.filter((i) => i.isOverdue);
      const stagnant = secWos.filter((i) => i.isStagnant);
      const blocked = secWos.filter((i) => i.isBlocked);
      const waiting = waitingCitizenReports.filter((r) => r.sector === cfg.id);

      const maxOverdueDays = overdue.reduce((acc, i) => Math.max(acc, i.overdueDays), 0);
      const maxWaitingDays = waiting.reduce((acc, r) => Math.max(acc, r.waitingDays), 0);
      const maxIdleDays = stagnant.reduce((acc, i) => Math.max(acc, i.idleDays), 0);

      // Pontuação objetiva de dificuldade operacional para ordenação executiva
      const bottleneckIssuesCount =
        overdue.length + waiting.length + blocked.length + stagnant.length;
      const severityScore =
        overdue.length * 4 +
        blocked.length * 3 +
        waiting.length * 2 +
        stagnant.length * 2 +
        Math.min(10, Math.floor(maxOverdueDays / 7));

      const highlights: string[] = [];
      if (overdue.length > 0) {
        highlights.push(
          `${overdue.length} O.S. vencida(s) (até ${maxOverdueDays}d de atraso)`
        );
      }
      if (waiting.length > 0) {
        highlights.push(
          `${waiting.length} chamado(s) sem O.S. (até ${maxWaitingDays}d de espera)`
        );
      }
      if (stagnant.length > 0) {
        highlights.push(
          `${stagnant.length} serviço(s) sem movimentação (até ${maxIdleDays}d parado)`
        );
      }
      if (blocked.length > 0) {
        highlights.push(`${blocked.length} impedimento(s) técnico(s) em campo`);
      }

      return {
        id: cfg.id,
        label: cfg.label,
        shortLabel: cfg.shortLabel,
        color: cfg.color,
        overdueCount: overdue.length,
        waitingCount: waiting.length,
        stagnantCount: stagnant.length,
        blockedCount: blocked.length,
        maxOverdueDays,
        maxWaitingDays,
        maxIdleDays,
        bottleneckIssuesCount,
        severityScore,
        highlights,
      };
    }).sort((a, b) => b.severityScore - a.severityScore || a.label.localeCompare(b.label));
  }, [analyzedWorkOrders, waitingCitizenReports]);

  // Aplicação dos filtros de secretaria e busca textual
  const scopedWorkOrders = useMemo(() => {
    return analyzedWorkOrders.filter((item) => {
      if (selectedSector !== "all" && item.sector !== selectedSector) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (item.wo.order_number || "").toLowerCase().includes(q);
        const matchTitle = (item.wo.title || "").toLowerCase().includes(q);
        const matchAddr = (item.wo.address || "").toLowerCase().includes(q);
        const matchTeam = (item.wo.assigned_team || "").toLowerCase().includes(q);
        const matchReason = (item.impossibilityReason || "").toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchAddr && !matchTeam && !matchReason) {
          return false;
        }
      }
      return true;
    });
  }, [analyzedWorkOrders, selectedSector, searchQuery]);

  const scopedWaitingReports = useMemo(() => {
    return waitingCitizenReports.filter((item) => {
      if (selectedSector !== "all" && item.sector !== selectedSector) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.report.title || "").toLowerCase().includes(q);
        const matchAddr = (item.report.address || "").toLowerCase().includes(q);
        const matchDesc = (item.report.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchAddr && !matchDesc) return false;
      }
      return true;
    });
  }, [waitingCitizenReports, selectedSector, searchQuery]);

  // Recortes específicos de gargalos (sem listar O.S. normais concluídas/folgadas)
  const overdueOrders = useMemo(() => {
    return scopedWorkOrders
      .filter((i) => i.isOverdue)
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [scopedWorkOrders]);

  const dueSoonOrders = useMemo(() => {
    return scopedWorkOrders
      .filter((i) => !i.isOverdue && i.isDueSoon)
      .sort((a, b) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99));
  }, [scopedWorkOrders]);

  const stagnantOrders = useMemo(() => {
    return scopedWorkOrders
      .filter((i) => i.isStagnant)
      .sort((a, b) => b.idleDays - a.idleDays);
  }, [scopedWorkOrders]);

  const blockedOrders = useMemo(() => {
    return scopedWorkOrders.filter((i) => i.isBlocked);
  }, [scopedWorkOrders]);

  const impossibilityReasons = useMemo(() => {
    const counts = new Map<string, number>();
    blockedOrders.forEach((item) => {
      const reason = item.impossibilityReason || "Impossibilidade técnica";
      counts.set(reason, (counts.get(reason) || 0) + 1);
    });
    const total = blockedOrders.length || 1;
    return Array.from(counts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [blockedOrders]);

  // Métricas exclusivas de Exceção e Gargalo (zero repetição com o Painel de Indicadores)
  const exceptionSummary = useMemo(() => {
    const maxOverdue = overdueOrders.reduce((acc, i) => Math.max(acc, i.overdueDays), 0);
    const maxWaiting = scopedWaitingReports.reduce(
      (acc, r) => Math.max(acc, r.waitingDays),
      0
    );
    const maxIdle = stagnantOrders.reduce((acc, i) => Math.max(acc, i.idleDays), 0);
    const topImpossibility = impossibilityReasons[0]?.reason || null;

    return {
      overdueCount: overdueOrders.length,
      maxOverdue,
      waitingCount: scopedWaitingReports.length,
      maxWaiting,
      stagnantCount: stagnantOrders.length,
      maxIdle,
      blockedCount: blockedOrders.length,
      topImpossibility,
    };
  }, [overdueOrders, scopedWaitingReports, stagnantOrders, blockedOrders, impossibilityReasons]);

  const criticalSectorsCount = useMemo(
    () => sectorBottlenecks.filter((s) => s.bottleneckIssuesCount > 0).length,
    [sectorBottlenecks]
  );

  return (
    <div
      className={`relative min-h-[100dvh] w-full font-sans pb-36 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Header Nativo da Diretoria */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? "bg-[#5A635C]/90 border-white/15 text-white"
            : "bg-white/90 border-[#183a2b]/10 text-[#183a2b]"
        }`}
      >
        <div className="max-w-6xl mx-auto pl-4 sm:pl-6 lg:pl-8 pr-20 sm:pr-24 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-sm">
                <Activity size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-bold tracking-wider">
                    COMMUÁRIA
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    Diretoria
                  </span>
                </div>
                <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                  Central de SLA, Gargalos Operacionais & Impedimentos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                    : "bg-zinc-50 hover:bg-zinc-100 border-black/10 text-[#183a2b]"
                }`}
                title="Atualizar central de gargalos"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <div
                className={`px-3 py-1.5 rounded-xl border text-xs hidden md:flex items-center gap-1.5 ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white/80"
                    : "bg-black/5 border-black/10 text-[#183a2b]"
                }`}
              >
                <ShieldCheck size={14} className="text-indigo-500" />
                <span className="font-semibold">{user?.name || "Diretor(a)"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Filtro por Secretaria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSector("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedSector === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : isDark
                ? "bg-white/5 hover:bg-white/10 text-white/70"
                : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
            }`}
          >
            Todas as Secretarias
          </button>
          {CATEGORIES_CONFIG.map((cat) => {
            const isSelected = selectedSector === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedSector(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 text-white/70"
                    : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Painel Resumo Exclusivo de Exceções e Gargalos (sem repetir indicadores gerais) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab("overdue")}
            className={`text-left p-4 rounded-3xl border transition-all cursor-pointer ${
              activeSubTab === "overdue"
                ? isDark
                  ? "bg-rose-950/25 border-rose-400/45 shadow-md"
                  : "bg-rose-50/70 border-rose-300 shadow-sm"
                : isDark
                ? "bg-white/5 border-white/10 hover:border-white/20"
                : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/75" : "text-[#2d4a3b]/75"}`}>
                Prazos Vencidos
              </span>
              <Clock size={16} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {exceptionSummary.overdueCount}
              </span>
              <span className="text-xs opacity-70">O.S.</span>
            </div>
            <p className="text-[11px] opacity-70 mt-2 truncate">
              {exceptionSummary.maxOverdue > 0
                ? `Maior atraso: ${exceptionSummary.maxOverdue} dia(s)`
                : "Sem prazos estourados"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("stagnant")}
            className={`text-left p-4 rounded-3xl border transition-all cursor-pointer ${
              activeSubTab === "stagnant"
                ? isDark
                  ? "bg-amber-950/25 border-amber-400/45 shadow-md"
                  : "bg-amber-50/70 border-amber-300 shadow-sm"
                : isDark
                ? "bg-white/5 border-white/10 hover:border-white/20"
                : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/75" : "text-[#2d4a3b]/75"}`}>
                Espera Sem O.S.
              </span>
              <FileText size={16} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {exceptionSummary.waitingCount}
              </span>
              <span className="text-xs opacity-70">chamado(s)</span>
            </div>
            <p className="text-[11px] opacity-70 mt-2 truncate">
              {exceptionSummary.maxWaiting > 0
                ? `Aguardando até ${exceptionSummary.maxWaiting} dia(s)`
                : "Nenhum chamado retido"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("stagnant")}
            className={`text-left p-4 rounded-3xl border transition-all cursor-pointer ${
              isDark
                ? "bg-white/5 border-white/10 hover:border-white/20"
                : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/75" : "text-[#2d4a3b]/75"}`}>
                Sem Movimentação
              </span>
              <PauseCircle size={16} className="text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums">
                {exceptionSummary.stagnantCount}
              </span>
              <span className="text-xs opacity-70">parado(s)</span>
            </div>
            <p className="text-[11px] opacity-70 mt-2 truncate">
              {exceptionSummary.maxIdle > 0
                ? `Até ${exceptionSummary.maxIdle} dia(s) sem avanço`
                : `Sem inatividade >= ${STAGNATION_THRESHOLD_DAYS}d`}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("impossibilities")}
            className={`text-left p-4 rounded-3xl border transition-all cursor-pointer ${
              activeSubTab === "impossibilities"
                ? isDark
                  ? "bg-rose-950/25 border-rose-400/45 shadow-md"
                  : "bg-rose-50/70 border-rose-300 shadow-sm"
                : isDark
                ? "bg-white/5 border-white/10 hover:border-white/20"
                : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/75" : "text-[#2d4a3b]/75"}`}>
                Impedimentos
              </span>
              <AlertTriangle size={16} className="text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums">
                {exceptionSummary.blockedCount}
              </span>
              <span className="text-xs opacity-70">bloqueio(s)</span>
            </div>
            <p className="text-[11px] opacity-70 mt-2 truncate">
              {exceptionSummary.topImpossibility || "Nenhum bloqueio relatado"}
            </p>
          </button>
        </div>

        {/* Navegação de Diagnóstico Operacional & Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveSubTab("overdue")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeSubTab === "overdue"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              O.S. Vencidas ({overdueOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("stagnant")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeSubTab === "stagnant"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Espera & Sem Movimentação ({scopedWaitingReports.length + stagnantOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("impossibilities")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeSubTab === "impossibilities"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Motivos de Impossibilidade ({blockedOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("sectors")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeSubTab === "sectors"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Setores Críticos ({criticalSectorsCount})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Buscar O.S., rua ou motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-8 py-1.5 rounded-xl border text-xs outline-none ${
                isDark
                  ? "bg-black/20 border-white/15 text-white placeholder-white/40"
                  : "bg-zinc-50 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/55"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ABA 1: O.S. COM PRAZOS VENCIDOS (+ RISCO IMINENTE) */}
        {activeSubTab === "overdue" && (
          <div className="space-y-6">
            {overdueOrders.length === 0 ? (
              <div
                className={`p-12 text-center rounded-3xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                }`}
              >
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500 opacity-70" />
                <h4 className="font-bold text-sm font-serif">
                  Nenhuma Ordem de Serviço com prazo vencido
                </h4>
                <p className="text-xs opacity-70 mt-1">
                  Todos os serviços ativos da secretaria filtrada estão dentro do prazo estipulado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueOrders.map(({ wo, sector, overdueDays, idleDays }) => (
                  <div
                    key={wo.id || wo.order_number}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                      isDark
                        ? "bg-rose-950/20 border-rose-500/35"
                        : "bg-rose-50/40 border-rose-200 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {wo.order_number}
                        </span>
                        <span className="text-xs font-bold opacity-85">{sector}</span>
                        {(wo.priority === "emergency" || wo.priority === "high") && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                            {wo.priority === "emergency" ? "Emergência" : "Alta Prioridade"}
                          </span>
                        )}
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/35 flex items-center gap-1 self-start sm:self-auto">
                        <AlertCircle size={11} />
                        Vencida há {overdueDays} dia(s)
                      </span>
                    </div>

                    <h4 className="font-bold text-sm sm:text-base font-serif mb-1">
                      {wo.title}
                    </h4>

                    <p className="flex items-center gap-1.5 text-xs opacity-80 mb-3">
                      <MapPin size={13} className="shrink-0 text-emerald-500" />
                      <span>{wo.address}</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
                      <div>
                        <span className="block opacity-60 text-[10px]">Prazo que Venceu</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatPtDate(wo.deadline)}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Equipe Responsável</span>
                        <span className="font-semibold">
                          {wo.assigned_employee_name || wo.assigned_team || "Equipe do Setor"}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Tempo Sem Avanço</span>
                        <span className="font-mono font-semibold">
                          {idleDays} dia(s) · {wo.status === "in_progress" ? "Em Campo" : "A Iniciar"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alerta secundário apenas para O.S. prestes a vencer em até 48h */}
            {dueSoonOrders.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h4 className="text-sm font-serif font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock size={15} />
                  Atenção Preventiva: Prazos Vencendo nas Próximas 48h ({dueSoonOrders.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dueSoonOrders.map(({ wo, sector, daysRemaining }) => (
                    <div
                      key={wo.id}
                      className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                        isDark
                          ? "bg-amber-950/20 border-amber-500/30"
                          : "bg-amber-50/60 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-extrabold">{wo.order_number}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                          {daysRemaining === 0 ? "Vence Hoje" : `Vence em ${daysRemaining}d`}
                        </span>
                      </div>
                      <p className="font-bold text-sm font-serif">{wo.title}</p>
                      <p className="opacity-75 truncate">
                        {sector} · {wo.address}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CHAMADOS EM LONGA ESPERA + SERVIÇOS PARADOS / SEM MOVIMENTAÇÃO */}
        {activeSubTab === "stagnant" && (
          <div className="space-y-8">
            {/* Frente 1: Chamados aguardando atendimento sem emissão de O.S. */}
            <section className="space-y-3">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold">
                  Chamados Aguardando Atendimento Sem O.S. ({scopedWaitingReports.length})
                </h3>
                <p className="text-xs opacity-70">
                  Solicitações de munícipes abertas que ainda não receberam despacho de Ordem de Serviço, ordenadas pelo maior tempo de espera.
                </p>
              </div>

              {scopedWaitingReports.length === 0 ? (
                <div
                  className={`p-8 text-center rounded-3xl border text-xs opacity-75 ${
                    isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                  }`}
                >
                  Nenhum chamado aberto aguardando emissão de O.S. neste filtro.
                </div>
              ) : (
                <div className="space-y-3">
                  {scopedWaitingReports.map(({ report, sector, waitingDays }) => (
                    <div
                      key={report.id}
                      onClick={() => onViewReportDetails?.(report)}
                      className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all ${
                        isDark
                          ? "bg-white/5 border-white/10 hover:border-white/20"
                          : "bg-white border-black/5 hover:border-black/15 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {sector}
                          </span>
                          <span className="text-xs opacity-40">·</span>
                          <span className="text-xs opacity-75">{report.user_name}</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            waitingDays >= 7
                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/35"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/35"
                          }`}
                        >
                          Aguardando há {waitingDays} dia(s)
                        </span>
                      </div>

                      <h4 className="font-bold text-sm sm:text-base font-serif mb-1">
                        {report.title}
                      </h4>
                      <p className="text-xs opacity-80 truncate mb-2 flex items-center gap-1.5">
                        <MapPin size={12} className="text-emerald-500 shrink-0" />
                        <span>{report.address}</span>
                      </p>

                      <div className="flex items-center justify-between text-[11px] opacity-70 pt-1">
                        <span className="font-mono">
                          Aberto em {formatPtDate(report.created_at)}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          Consultar chamado <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Frente 2: Serviços em aberto ou em campo sem movimentação */}
            <section className="space-y-3">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold">
                  Serviços Parados ou Sem Movimentação ({stagnantOrders.length})
                </h3>
                <p className="text-xs opacity-70">
                  Ordens de Serviço despachadas ou em execução há pelo menos {STAGNATION_THRESHOLD_DAYS} dias sem novos registros ou atualização de status.
                </p>
              </div>

              {stagnantOrders.length === 0 ? (
                <div
                  className={`p-8 text-center rounded-3xl border text-xs opacity-75 ${
                    isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                  }`}
                >
                  Nenhum serviço parado sem movimentação recente neste filtro.
                </div>
              ) : (
                <div className="space-y-3">
                  {stagnantOrders.map(
                    ({
                      wo,
                      sector,
                      idleDays,
                      isOverdue,
                      lastMovementIso,
                      lastMovementSummary,
                    }) => (
                      <div
                        key={wo.id}
                        className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                          isDark
                            ? "bg-white/5 border-white/15"
                            : "bg-zinc-50 border-black/10 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              {wo.order_number}
                            </span>
                            <span className="text-xs font-bold opacity-85">{sector}</span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                Prazo vencido
                              </span>
                            )}
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1">
                            <PauseCircle size={11} />
                            Sem movimentação há {idleDays} dia(s)
                          </span>
                        </div>

                        <h4 className="font-bold text-sm sm:text-base font-serif mb-1">
                          {wo.title}
                        </h4>
                        <p className="text-xs opacity-80 mb-3 flex items-center gap-1.5">
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <span>{wo.address}</span>
                        </p>

                        <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] opacity-70">
                            <span>
                              Equipe:{" "}
                              <strong>
                                {wo.assigned_employee_name || wo.assigned_team || "Setor"}
                              </strong>
                            </span>
                            <span className="font-mono">
                              Último registro: {formatPtDate(lastMovementIso)}
                            </span>
                          </div>
                          <p className="opacity-85 leading-relaxed">{lastMovementSummary}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ABA 3: MOTIVOS REGISTRADOS PARA IMPOSSIBILIDADE DE EXECUÇÃO */}
        {activeSubTab === "impossibilities" && (
          <div className="space-y-5">
            {impossibilityReasons.length > 0 && (
              <div
                className={`p-5 rounded-3xl border space-y-3.5 ${
                  isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
                }`}
              >
                <h4 className="font-serif font-bold text-base">
                  Causas Registradas para Não Execução em Campo
                </h4>
                <div className="space-y-3">
                  {impossibilityReasons.map((item) => (
                    <div key={item.reason} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium">{item.reason}</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                          {item.count} O.S. ({item.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedOrders.length === 0 ? (
              <div
                className={`p-12 text-center rounded-3xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                }`}
              >
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500 opacity-70" />
                <h4 className="font-bold text-sm font-serif">
                  Nenhum motivo de impossibilidade registrado no momento
                </h4>
                <p className="text-xs opacity-70 mt-1">
                  Quando equipes de campo relatam impedimento técnico ou bloqueio em uma O.S., os motivos e justificativas reais são consolidados aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedOrders.map(({ wo, sector, impossibilityReason }) => (
                  <div
                    key={wo.id || wo.order_number}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                      isDark
                        ? "bg-white/5 border-rose-500/30"
                        : "bg-white border-rose-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                          {wo.order_number}
                        </span>
                        <span className="text-xs font-bold opacity-80">{sector}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle size={11} /> {impossibilityReason}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm sm:text-base font-serif mb-1">{wo.title}</h4>
                    <p className="text-xs opacity-75 mb-3">{wo.address}</p>

                    {(wo.resolution_notes || wo.status_notes) && (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                        <span className="font-bold text-rose-700 dark:text-rose-300 block">
                          Justificativa Técnica Registrada:
                        </span>
                        <p className="opacity-90 leading-relaxed">
                          {wo.resolution_notes || wo.status_notes}
                        </p>
                        {wo.resolution_photo_url && (
                          <img
                            src={wo.resolution_photo_url}
                            alt="Registro do impedimento"
                            onClick={() =>
                              onViewImage?.(wo.resolution_photo_url!, wo.order_number)
                            }
                            className="mt-2 h-24 w-auto rounded-xl border object-cover cursor-pointer"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 4: IDENTIFICAÇÃO DOS SETORES COM MAIORES DIFICULDADES OPERACIONAIS */}
        {activeSubTab === "sectors" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold">
                Diagnóstico de Dificuldades Operacionais por Setor
              </h3>
              <p className="text-xs opacity-70">
                Secretarias ordenadas pela concentração real de atrasos de SLA, chamados retidos sem O.S., serviços parados e impedimentos de execução.
              </p>
            </div>

            <div className="space-y-3.5">
              {sectorBottlenecks.map((sec, index) => {
                const hasBottleneck = sec.bottleneckIssuesCount > 0;
                const isTopCritical = index === 0 && hasBottleneck;

                return (
                  <div
                    key={sec.id}
                    onClick={() => {
                      setSelectedSector(sec.id);
                      if (sec.overdueCount > 0) setActiveSubTab("overdue");
                      else if (sec.waitingCount > 0 || sec.stagnantCount > 0)
                        setActiveSubTab("stagnant");
                      else if (sec.blockedCount > 0) setActiveSubTab("impossibilities");
                    }}
                    className={`p-5 rounded-3xl border transition-all ${
                      hasBottleneck ? "cursor-pointer hover:scale-[1.005]" : ""
                    } ${
                      isTopCritical
                        ? isDark
                          ? "bg-rose-950/20 border-rose-500/35 shadow-lg"
                          : "bg-rose-50/40 border-rose-200 shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20"
                        : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sec.color }}
                        />
                        <h4 className="font-serif font-bold text-base">{sec.label}</h4>
                      </div>

                      {isTopCritical ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/35 self-start sm:self-auto">
                          Maior Sobrecarga / Gargalo Ativo
                        </span>
                      ) : hasBottleneck ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                          Requer Atenção Operacional
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
                          Sem Gargalos Registrados
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 border-y border-black/5 dark:border-white/10 text-xs">
                      <div>
                        <span className="block opacity-60 text-[10px]">O.S. Vencidas</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            sec.overdueCount > 0 ? "text-rose-500" : "opacity-75"
                          }`}
                        >
                          {sec.overdueCount}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Espera Sem O.S.</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            sec.waitingCount > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "opacity-75"
                          }`}
                        >
                          {sec.waitingCount}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Sem Movimentação</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            sec.stagnantCount > 0
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "opacity-75"
                          }`}
                        >
                          {sec.stagnantCount}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Impedimentos</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            sec.blockedCount > 0 ? "text-rose-500" : "opacity-75"
                          }`}
                        >
                          {sec.blockedCount}
                        </span>
                      </div>
                    </div>

                    {hasBottleneck ? (
                      <div className="flex items-center justify-between gap-3 pt-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {sec.highlights.map((hl) => (
                            <span
                              key={hl}
                              className={`px-2.5 py-1 rounded-xl text-[11px] border ${
                                isDark
                                  ? "bg-black/20 border-white/10 text-white/85"
                                  : "bg-white border-black/10 text-[#183a2b]"
                              }`}
                            >
                              {hl}
                            </span>
                          ))}
                        </div>
                        <ChevronRight size={15} className="opacity-65 shrink-0" />
                      </div>
                    ) : (
                      <p className="pt-2.5 text-xs opacity-65">
                        Nenhum prazo vencido, chamado retido ou bloqueio operacional ativo nesta secretaria.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
