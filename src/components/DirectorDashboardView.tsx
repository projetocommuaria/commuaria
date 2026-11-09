import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  Wrench,
  ChevronRight,
  HardHat,
  MapPin,
  Calendar,
  Layers,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  History,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { CATEGORIES_CONFIG, ReportCategory, ReportItem, WorkOrderItem, UserProfile, WorkOrderHistoryItem, maskCitizenData } from "../types";
import { fetchSystemWorkOrders, getWorkOrderHistory, normalizeSectorCategory } from "../lib/workOrderService";

interface DirectorDashboardViewProps {
  user?: UserProfile;
  reports: ReportItem[];
  workOrders?: WorkOrderItem[];
  onRefresh?: () => Promise<void> | void;
  onViewReportDetails?: (report: ReportItem) => void;
  onTabChange?: (tab: any) => void;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = ({
  user,
  reports = [],
  workOrders: initialWorkOrders = [],
  onRefresh,
  onViewReportDetails,
}) => {
  const { isDark } = useTheme();

  // Selected Sector Filter ("all" or a specific ReportCategory)
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"kpis" | "work_orders" | "reports">("kpis");
  const [woStatusFilter, setWoStatusFilter] = useState<string>("all");
  const [activeWoDetail, setActiveWoDetail] = useState<WorkOrderItem | null>(null);
  const [orderHistory, setOrderHistory] = useState<WorkOrderHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchedWorkOrders, setFetchedWorkOrders] = useState<WorkOrderItem[]>([]);

  const loadWorkOrdersFromDb = async () => {
    const list = await fetchSystemWorkOrders(user?.city_id);
    setFetchedWorkOrders(list);
  };

  useEffect(() => {
    loadWorkOrdersFromDb();
  }, []);

  useEffect(() => {
    if (activeWoDetail) {
      setLoadingHistory(true);
      getWorkOrderHistory(
        activeWoDetail.id,
        activeWoDetail.city_id || user?.city_id || "",
      )
        .then((h) => setOrderHistory(h))
        .catch((err) => console.warn("Erro ao buscar histórico da O.S.:", err))
        .finally(() => setLoadingHistory(false));
    } else {
      setOrderHistory([]);
    }
  }, [activeWoDetail?.id, activeWoDetail?.city_id, user?.city_id]);

  // Merge Supabase work orders with any passed props
  const workOrders = useMemo(() => {
    const map = new Map<string, WorkOrderItem>();
    initialWorkOrders.forEach((w) => map.set(w.id || w.order_number, w));
    fetchedWorkOrders.forEach((w) => map.set(w.id || w.order_number, w));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [initialWorkOrders, fetchedWorkOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadWorkOrdersFromDb();
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const citizenReports = useMemo(
    () => (Array.isArray(reports) ? reports.filter((r) => !r.is_work_order) : []),
    [reports]
  );

  // Sector normalizer helper
  const normalizeSector = (cat?: string, title?: string, desc?: string): string =>
    normalizeSectorCategory(cat, title, desc);

  // Filtered reports by sector and search (with LGPD citizen masking for Diretor role)
  const filteredReports = useMemo(() => {
    return citizenReports
      .map((r) => maskCitizenData(r, "diretor"))
      .filter((r) => {
        const sector = normalizeSector(r.category || r.maintenance_type, r.title, r.description);
        if (selectedSector !== "all" && sector !== selectedSector) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (r.title || "").toLowerCase().includes(q);
          const matchAddr = (r.address || "").toLowerCase().includes(q);
          const matchDesc = (r.description || "").toLowerCase().includes(q);
          if (!matchTitle && !matchAddr && !matchDesc) return false;
        }
        return true;
      });
  }, [reports, selectedSector, searchQuery]);

  // Filtered work orders by sector and status
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const sector = normalizeSector(wo.category, wo.title);
      if (selectedSector !== "all" && sector !== selectedSector) return false;

      if (woStatusFilter !== "all") {
        if (woStatusFilter === "open" && wo.status !== "open" && wo.status !== "dispatched") return false;
        if (woStatusFilter === "in_progress" && wo.status !== "in_progress") return false;
        if (woStatusFilter === "completed" && wo.status !== "completed") return false;
        if (woStatusFilter === "impossible" && wo.status !== "impossible" && wo.status !== "cancelled") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (wo.order_number || "").toLowerCase().includes(q);
        const matchTitle = (wo.title || "").toLowerCase().includes(q);
        const matchAddr = (wo.address || "").toLowerCase().includes(q);
        const matchTeam = (wo.assigned_team || "").toLowerCase().includes(q);
        const matchEmp = (wo.assigned_employee_name || "").toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchAddr && !matchTeam && !matchEmp) return false;
      }
      return true;
    });
  }, [workOrders, selectedSector, woStatusFilter, searchQuery]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const totalReports = filteredReports.length;
    const resolvedReports = filteredReports.filter((r) => r.status === "resolved").length;
    const pendingReports = totalReports - resolvedReports;
    const reportResolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

    const totalWos = filteredWorkOrders.length;
    const completedWos = filteredWorkOrders.filter((w) => w.status === "completed").length;
    const inProgressWos = filteredWorkOrders.filter((w) => w.status === "in_progress").length;
    const openWos = filteredWorkOrders.filter((w) => w.status === "open" || w.status === "dispatched").length;
    const blockedWos = filteredWorkOrders.filter((w) => w.status === "impossible" || w.status === "cancelled").length;
    const woEfficiencyRate = totalWos > 0 ? Math.round((completedWos / totalWos) * 100) : 0;

    return {
      totalReports,
      resolvedReports,
      pendingReports,
      reportResolutionRate,
      totalWos,
      completedWos,
      inProgressWos,
      openWos,
      blockedWos,
      woEfficiencyRate,
    };
  }, [filteredReports, filteredWorkOrders]);

  // Comparison Matrix by Sector
  const sectorMatrix = useMemo(() => {
    const sectors: ReportCategory[] = [
      "Pavimentação",
      "Iluminação Pública",
      "Limpeza Urbana",
      "Saneamento",
      "Arborização",
    ];

    return sectors.map((sec) => {
      const secReports = citizenReports.filter((r) => normalizeSector(r.category || r.maintenance_type, r.title, r.description) === sec);
      const secWos = workOrders.filter((w) => normalizeSector(w.category, w.title, w.description) === sec);
      const totalR = secReports.length;
      const resR = secReports.filter((r) => r.status === "resolved").length;
      const totalW = secWos.length;
      const compW = secWos.filter((w) => w.status === "completed").length;
      const rate = totalR > 0 ? Math.round((resR / totalR) * 100) : (totalW > 0 ? Math.round((compW / totalW) * 100) : 0);

      const cfg = CATEGORIES_CONFIG.find((c) => c.id === sec);

      return {
        id: sec,
        label: cfg?.label || sec,
        shortLabel: cfg?.shortLabel || sec,
        color: cfg?.color || "#10b981",
        totalReports: totalR,
        resolvedReports: resR,
        pendingReports: totalR - resR,
        totalWos: totalW,
        completedWos: compW,
        activeWos: totalW - compW,
        rate,
      };
    });
  }, [citizenReports, workOrders]);

  return (
    <div
      className={`relative min-h-[100dvh] w-full font-sans pb-36 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Header */}
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
                <Building2 size={20} />
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
                  Gabinete de Auditoria & Indicadores de Zeladoria
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                    : "bg-zinc-50 hover:bg-zinc-100 border-black/10 text-[#183a2b]"
                }`}
                title="Atualizar dados"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <div
                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${
                  isDark ? "bg-white/5 border-white/10 text-white/80" : "bg-black/5 border-black/10 text-[#183a2b]"
                }`}
              >
                <ShieldCheck size={14} className="text-indigo-500" />
                <span className="font-semibold">{user?.name || "Diretor(a)"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Sector Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSector("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 text-white/70"
                    : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                }`}
              >
                {cat.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                Chamados Registrados
              </span>
              <FileText size={16} className="text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums">
                {metrics.totalReports}
              </span>
              <span className="text-xs opacity-70">
                ({metrics.resolvedReports} resolvidos)
              </span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.reportResolutionRate}%` }}
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                O.S. Emitidas
              </span>
              <Wrench size={16} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {metrics.totalWos}
              </span>
              <span className="text-xs opacity-70">
                ({metrics.inProgressWos} em campo)
              </span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.woEfficiencyRate}%` }}
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                O.S. Concluídas
              </span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {metrics.completedWos}
              </span>
              <span className="text-xs opacity-70">
                ({metrics.woEfficiencyRate}% concl.)
              </span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.woEfficiencyRate}%` }}
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                Índice Geral de Resolução
              </span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold tabular-nums">
                {metrics.reportResolutionRate}%
              </span>
              <span className="text-xs opacity-70">
                eficiência
              </span>
            </div>
            <p className="text-[11px] opacity-70 mt-2 truncate">
              {metrics.blockedWos > 0 ? `${metrics.blockedWos} impedimentos relatados` : "Sem gargalos críticos"}
            </p>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewTab("kpis")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewTab === "kpis"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Matriz das Secretarias
            </button>
            <button
              type="button"
              onClick={() => setViewTab("work_orders")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewTab === "work_orders"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Auditoria de O.S. ({filteredWorkOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("reports")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewTab === "reports"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : isDark
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-zinc-100 text-[#183a2b]"
              }`}
            >
              Chamados de Munícipes ({filteredReports.length})
            </button>
          </div>

          <div className="relative hidden sm:block w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Buscar por O.S., rua ou equipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                isDark ? "bg-black/20 border-white/15 text-white" : "bg-zinc-50 border-black/15 text-black"
              }`}
            />
          </div>
        </div>

        {/* Tab 1: Sector Matrix Breakdown */}
        {viewTab === "kpis" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectorMatrix.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedSector(item.id);
                    setViewTab("work_orders");
                  }}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark
                      ? "bg-white/5 border-white/10 hover:border-white/20"
                      : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <h4 className="font-bold text-base font-serif">{item.label}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {item.rate}% resolvido
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-black/5 dark:border-white/10 text-xs">
                    <div>
                      <span className="block opacity-60 text-[10px]">Chamados</span>
                      <span className="font-bold font-mono text-sm">{item.totalReports}</span>
                    </div>
                    <div>
                      <span className="block opacity-60 text-[10px]">O.S. Emitidas</span>
                      <span className="font-bold font-mono text-sm">{item.totalWos}</span>
                    </div>
                    <div>
                      <span className="block opacity-60 text-[10px]">O.S. Ativas</span>
                      <span className="font-bold font-mono text-sm text-amber-500">{item.activeWos}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 text-xs opacity-75">
                    <span>Clique para auditar ordens de serviço</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Work Orders Audit Feed */}
        {viewTab === "work_orders" && (
          <div className="space-y-4">
            {/* Status Subfilters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold opacity-60">Filtrar:</span>
              {[
                { id: "all", label: "Todas" },
                { id: "open", label: "Despachadas" },
                { id: "in_progress", label: "Em Andamento" },
                { id: "completed", label: "Concluídas" },
                { id: "impossible", label: "Impedimento / Cancelada" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setWoStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    woStatusFilter === st.id
                      ? "bg-indigo-600 text-white"
                      : isDark
                      ? "bg-white/10 text-white/70 hover:bg-white/15"
                      : "bg-zinc-100 text-[#183a2b] hover:bg-zinc-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {filteredWorkOrders.length === 0 ? (
              <div
                className={`p-12 text-center rounded-3xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                }`}
              >
                <Wrench size={32} className="mx-auto mb-3 opacity-40" />
                <h4 className="font-bold text-sm">Nenhuma Ordem de Serviço encontrada</h4>
                <p className="text-xs opacity-70 mt-1">
                  Não há registros para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWorkOrders.map((wo) => {
                  const isCompleted = wo.status === "completed";
                  const isInProgress = wo.status === "in_progress";
                  const isImpossible = wo.status === "impossible" || wo.status === "cancelled";

                  return (
                    <div
                      key={wo.id || wo.order_number}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                        isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-black/5 hover:border-black/15 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                            {wo.order_number}
                          </span>
                          <span className="text-xs font-bold opacity-75">
                            {wo.category}
                          </span>
                          <span className="text-xs opacity-40">·</span>
                          <span className="text-xs opacity-70 font-mono">
                            {new Date(wo.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        <div>
                          {isCompleted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Concluída
                            </span>
                          ) : isInProgress ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock size={11} /> Em Andamento
                            </span>
                          ) : isImpossible ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle size={11} /> Com Impedimento
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 flex items-center gap-1">
                              Despachada
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm sm:text-base font-serif mb-1">
                        {wo.title}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs opacity-75 mb-3">
                        <MapPin size={13} className="shrink-0 text-emerald-500" />
                        <span className="truncate">{wo.address}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs mb-3">
                        <div>
                          <span className="block opacity-60 text-[10px]">Supervisor:</span>
                          <span className="font-semibold">{wo.supervisor_name || "Setor de Zeladoria"}</span>
                        </div>
                        <div>
                          <span className="block opacity-60 text-[10px]">Equipe / Técnico:</span>
                          <span className="font-semibold">
                            {wo.assigned_employee_name || wo.assigned_team || "Equipe Geral"}
                          </span>
                        </div>
                        <div>
                          <span className="block opacity-60 text-[10px]">Prazo de Execução:</span>
                          <span className="font-mono font-semibold">{wo.deadline || "Não fixado"}</span>
                        </div>
                      </div>

                      {wo.resolution_notes && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs mb-3">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                            Relatório de Conclusão Técnica:
                          </span>
                          <p className="opacity-90">{wo.resolution_notes}</p>
                        </div>
                      )}

                      {wo.status_notes && !wo.resolution_notes && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs mb-3">
                          <span className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5">
                            Observações do Atendimento:
                          </span>
                          <p className="opacity-90">{wo.status_notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="opacity-60 text-[11px]">
                          Prioridade: <strong className="uppercase">{wo.priority}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveWoDetail(wo)}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Ver Detalhes da O.S. <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reports Overview Feed */}
        {viewTab === "reports" && (
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div
                className={`p-12 text-center rounded-3xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                }`}
              >
                <FileText size={32} className="mx-auto mb-3 opacity-40" />
                <h4 className="font-bold text-sm">Nenhum chamado de munícipe encontrado</h4>
              </div>
            ) : (
              filteredReports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => onViewReportDetails && onViewReportDetails(rep)}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                    isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-black/5 hover:border-black/15 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {rep.category || "Geral"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.status === "resolved"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {rep.status === "resolved" ? "Resolvido" : "Em Aberto"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm font-serif mb-1">{rep.title}</h4>
                  <p className="text-xs opacity-75 truncate mb-2">{rep.address}</p>
                  <div className="flex items-center justify-between text-[11px] opacity-60">
                    <span>{new Date(rep.created_at || "").toLocaleDateString("pt-BR")}</span>
                    <span className="font-bold">Ver detalhes →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* O.S. Modal Detail */}
      <AnimatePresence>
        {activeWoDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-lg w-full p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
                isDark ? "bg-[#3d443e] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2 py-1 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    {activeWoDetail.order_number}
                  </span>
                  <span className="text-xs font-bold opacity-75">{activeWoDetail.category}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveWoDetail(null)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold font-serif mb-1">{activeWoDetail.title}</h3>
                <p className="text-xs opacity-75 flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-500" /> {activeWoDetail.address}
                </p>
              </div>

              {activeWoDetail.description && (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1">
                  <span className="font-bold block opacity-70">Escopo da Manutenção:</span>
                  <p>{activeWoDetail.description}</p>
                </div>
              )}

              {activeWoDetail.technical_instructions && (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1">
                  <span className="font-bold block opacity-70">Instruções Técnicas da Chefia:</span>
                  <p>{activeWoDetail.technical_instructions}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-2xl border border-black/10 dark:border-white/10">
                <div>
                  <span className="block opacity-60 text-[10px]">Supervisor:</span>
                  <span className="font-semibold">{activeWoDetail.supervisor_name || "Geral"}</span>
                </div>
                <div>
                  <span className="block opacity-60 text-[10px]">Técnico Atribuído:</span>
                  <span className="font-semibold">{activeWoDetail.assigned_employee_name || activeWoDetail.assigned_team || "Equipe"}</span>
                </div>
                <div>
                  <span className="block opacity-60 text-[10px]">Prazo:</span>
                  <span className="font-mono font-semibold">{activeWoDetail.deadline || "Indefinido"}</span>
                </div>
                <div>
                  <span className="block opacity-60 text-[10px]">Status:</span>
                  <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">{activeWoDetail.status}</span>
                </div>
              </div>

              {/* Resolution or Impossibility Details */}
              {(activeWoDetail.resolution_notes || activeWoDetail.resolution_photo_url) && (
                <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5 text-xs">
                  <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={13} />
                    Registro de Conclusão / Execução de Campo
                  </span>
                  {activeWoDetail.resolution_notes && (
                    <p className="opacity-90">{activeWoDetail.resolution_notes}</p>
                  )}
                  {activeWoDetail.resolution_photo_url && (
                    <div className="mt-2">
                      <span className="text-[10px] opacity-60 block mb-1">Registro Fotográfico de Campo:</span>
                      <img
                        src={activeWoDetail.resolution_photo_url}
                        alt="Foto da Conclusão"
                        className="w-full max-h-48 object-cover rounded-xl border border-black/10 dark:border-white/10"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Immutable Audit Timeline */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider opacity-60 flex items-center gap-1">
                    <History size={13} className="text-indigo-500" />
                    Trilha de Auditoria e Acompanhamento
                  </span>
                  {loadingHistory && <span className="text-[10px] opacity-60">Carregando...</span>}
                </div>

                {orderHistory.length === 0 && !loadingHistory ? (
                  <p className="text-[11px] opacity-60 italic">
                    Nenhum evento registrado ainda para esta O.S.
                  </p>
                ) : (
                  <div className="space-y-2 relative pl-3 border-l-2 border-indigo-500/30">
                    {orderHistory.map((h) => {
                      const actionLabels: Record<string, { label: string; color: string }> = {
                        create: { label: "Criação", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                        delegate: { label: "Delegação", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                        start: { label: "Início", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                        note: { label: "Nota Técnica", color: "bg-neutral-500/10 text-neutral-600 border-neutral-500/20" },
                        complete: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                        impossible: { label: "Impossibilidade", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
                        cancel: { label: "Cancelado", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
                      };
                      const badge = actionLabels[h.action_type] || { label: h.action_type, color: "bg-neutral-500/10 text-neutral-600 border-neutral-500/20" };

                      return (
                        <div key={h.id} className="text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="font-semibold">{h.user_name || "Sistema"}</span>
                            <span className="text-[10px] opacity-60">
                              {new Date(h.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          {h.message && <p className="opacity-80">{h.message}</p>}
                          {h.photo_url && (
                            <img
                              src={h.photo_url}
                              alt="Anexo do Histórico"
                              className="mt-1 h-20 w-auto rounded-lg border object-cover"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveWoDetail(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
