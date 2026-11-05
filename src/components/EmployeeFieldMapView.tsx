import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Map as MapIcon,
  MapPin,
  Navigation,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Play,
  FileText,
  RefreshCw,
  X,
  ExternalLink,
  LocateFixed,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "../ThemeContext";
import { CityItem, ReportItem, UserProfile, WorkOrderItem } from "../types";
import {
  fetchSystemWorkOrders,
  filterEmployeeWorkOrders,
  resolveWorkOrderCoordinates,
  updateWorkOrderStatusUnified,
} from "../lib/workOrderService";

interface EmployeeFieldMapViewProps {
  user: UserProfile;
  city?: CityItem | null;
  category?: string;
  reports?: ReportItem[];
  selectedWorkOrderId?: string | null;
  onRefresh?: () => Promise<void> | void;
  onViewImage?: (url: string, title: string) => void;
  onOpenFieldLog?: (workOrderId: string) => void;
  onOpenWorkExecution?: (workOrderId: string) => void;
}

const MapFocusController: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target && !Number.isNaN(target[0]) && !Number.isNaN(target[1])) {
      map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.7 });
    }
  }, [target?.[0], target?.[1], map]);
  return null;
};

export const EmployeeFieldMapView: React.FC<EmployeeFieldMapViewProps> = ({
  user,
  city,
  category,
  reports = [],
  selectedWorkOrderId,
  onRefresh,
  onViewImage,
  onOpenFieldLog,
  onOpenWorkExecution,
}) => {
  const { isDark } = useTheme();
  const assignedSector = category || user.assigned_category || "Pavimentação";

  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "pending" | "in_progress" | "history">("active");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "emergency" | "high" | "medium" | "low">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(selectedWorkOrderId || null);

  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const list = await fetchSystemWorkOrders(user.city_id || city?.id || "araucaria-pr");
      setWorkOrders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedWorkOrderId) {
      setSelectedOrderId(selectedWorkOrderId);
    }
  }, [selectedWorkOrderId]);

  const handleManualRefresh = async () => {
    await loadOrders();
    if (onRefresh) await onRefresh();
  };

  // O.S. atribuídas ao funcionário ou ao seu setor
  const myWorkOrders = useMemo(
    () => filterEmployeeWorkOrders(workOrders, user, assignedSector),
    [workOrders, user, assignedSector]
  );

  // Enriquecer cada O.S. com coordenadas reais e chamado de origem (sem dados privados do cidadão)
  const enrichedOrders = useMemo(() => {
    return myWorkOrders.map((wo) => {
      const coords = resolveWorkOrderCoordinates(wo, reports);
      const linkedReport =
        reports.find(
          (r) =>
            !r.is_work_order &&
            ((wo.linked_report_id && r.id === wo.linked_report_id) ||
              (wo.order_number && r.work_order_number === wo.order_number))
        ) || null;
      return {
        wo,
        coords,
        linkedReport,
      };
    });
  }, [myWorkOrders, reports]);

  // Métricas rápidas de campo
  const stats = useMemo(() => {
    const pending = myWorkOrders.filter((w) => w.status === "open" || w.status === "dispatched").length;
    const inProgress = myWorkOrders.filter((w) => w.status === "in_progress").length;
    const urgent = myWorkOrders.filter(
      (w) =>
        (w.status === "open" || w.status === "dispatched" || w.status === "in_progress") &&
        (w.priority === "emergency" || w.priority === "high")
    ).length;
    return { pending, inProgress, urgent };
  }, [myWorkOrders]);

  // Aplicar filtros
  const filteredEntries = useMemo(() => {
    return enrichedOrders.filter(({ wo }) => {
      if (statusFilter === "active") {
        if (wo.status !== "open" && wo.status !== "dispatched" && wo.status !== "in_progress") return false;
      } else if (statusFilter === "pending") {
        if (wo.status !== "open" && wo.status !== "dispatched") return false;
      } else if (statusFilter === "in_progress") {
        if (wo.status !== "in_progress") return false;
      } else if (statusFilter === "history") {
        if (wo.status !== "completed" && wo.status !== "impossible" && wo.status !== "cancelled") return false;
      }

      if (priorityFilter !== "all" && wo.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (wo.order_number || "").toLowerCase().includes(q);
        const matchTitle = (wo.title || "").toLowerCase().includes(q);
        const matchAddr = (wo.address || "").toLowerCase().includes(q);
        const matchDesc = (wo.description || "").toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchAddr && !matchDesc) return false;
      }

      return true;
    });
  }, [enrichedOrders, statusFilter, priorityFilter, searchQuery]);

  const mappedEntries = useMemo(
    () => filteredEntries.filter((e) => e.coords !== null),
    [filteredEntries]
  );

  const unmappedEntries = useMemo(
    () => filteredEntries.filter((e) => e.coords === null),
    [filteredEntries]
  );

  // Selecionar automaticamente uma O.S. válida
  const selectedEntry = useMemo(() => {
    if (selectedOrderId) {
      const exact = filteredEntries.find((e) => e.wo.id === selectedOrderId || e.wo.order_number === selectedOrderId);
      if (exact) return exact;
    }
    return mappedEntries[0] || filteredEntries[0] || null;
  }, [selectedOrderId, filteredEntries, mappedEntries]);

  const initialCenter = useMemo<[number, number]>(() => {
    if (mappedEntries.length > 0 && mappedEntries[0].coords) {
      const latSum = mappedEntries.reduce((acc, e) => acc + (e.coords?.latitude || 0), 0);
      const lngSum = mappedEntries.reduce((acc, e) => acc + (e.coords?.longitude || 0), 0);
      return [latSum / mappedEntries.length, lngSum / mappedEntries.length];
    }
    return [city?.center_lat || -25.633835, city?.center_lng || -49.461966];
  }, [mappedEntries.length, city?.center_lat, city?.center_lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setActionMessage("Geolocalização não suportada neste navegador.");
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsLocation(loc);
        setFocusCoords(loc);
        setLocatingGps(false);
      },
      () => {
        setLocatingGps(false);
        setActionMessage("Permissão de GPS negada ou indisponível no dispositivo.");
        setTimeout(() => setActionMessage(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleStartOrder = async (wo: WorkOrderItem) => {
    setIsSubmitting(true);
    try {
      await updateWorkOrderStatusUnified({
        workOrder: wo,
        newStatus: "in_progress",
        agentUser: user,
        message: `Atendimento iniciado em campo via Mapa Operacional por ${user.name || "Técnico"} às ${new Date().toLocaleTimeString("pt-BR")}.`,
      });
      setActionMessage(`O.S. ${wo.order_number} iniciada com sucesso!`);
      await loadOrders();
      if (onRefresh) await onRefresh();
    } catch {
      setActionMessage(`O.S. ${wo.order_number} atualizada localmente.`);
      await loadOrders();
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const buildGoogleMapsUrl = (wo: WorkOrderItem, coords: { latitude: number; longitude: number } | null) => {
    if (coords) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
    }
    const dest = encodeURIComponent(`${wo.address}, ${city?.name || "Araucária"} - ${city?.state || "PR"}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  };

  const buildWazeUrl = (wo: WorkOrderItem, coords: { latitude: number; longitude: number } | null) => {
    if (coords) {
      return `https://waze.com/ul?ll=${coords.latitude},${coords.longitude}&navigate=yes`;
    }
    const dest = encodeURIComponent(`${wo.address}, ${city?.name || "Araucária"} - ${city?.state || "PR"}`);
    return `https://waze.com/ul?q=${dest}&navigate=yes`;
  };

  const getPriorityInfo = (priority?: string) => {
    switch (priority) {
      case "emergency":
        return {
          label: "Emergência",
          badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
        };
      case "high":
        return {
          label: "Alta",
          badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
        };
      case "low":
        return {
          label: "Baixa",
          badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
      default:
        return {
          label: "Média",
          badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
    }
  };

  const getStatusInfo = (status: WorkOrderItem["status"]) => {
    switch (status) {
      case "in_progress":
        return {
          label: "Em Execução",
          badgeClass: "bg-amber-500 text-zinc-950 border-amber-400",
        };
      case "completed":
        return {
          label: "Concluída",
          badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
      case "impossible":
      case "cancelled":
        return {
          label: "Impedimento",
          badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
        };
      default:
        return {
          label: "A Iniciar",
          badgeClass: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
        };
    }
  };

  const createOrderMarkerIcon = (wo: WorkOrderItem, isSelected: boolean) => {
    let colorClass = "bg-cyan-600 text-white shadow-cyan-500/40";
    if (wo.status === "completed") {
      colorClass = "bg-emerald-500 text-white shadow-emerald-500/40";
    } else if (wo.status === "impossible" || wo.status === "cancelled") {
      colorClass = "bg-rose-600 text-white shadow-rose-500/40";
    } else if (wo.priority === "emergency") {
      colorClass = "bg-red-600 text-white shadow-red-500/50 animate-pulse";
    } else if (wo.status === "in_progress") {
      colorClass = "bg-amber-500 text-zinc-950 shadow-amber-500/40";
    }

    const ringClass = isSelected ? "ring-4 ring-white scale-115" : "border border-white/60";

    return L.divIcon({
      className: "custom-leaflet-icon-emp",
      html: `
        <div class="flex items-center justify-center">
          <div class="p-2 rounded-full shadow-lg transition-transform ${colorClass} ${ringClass}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  const gpsMarkerIcon = L.divIcon({
    className: "custom-leaflet-gps",
    html: `
      <div class="flex items-center justify-center">
        <div class="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg ring-4 ring-sky-500/30"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const hasFilters =
    searchQuery.trim() !== "" || statusFilter !== "active" || priorityFilter !== "all";

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
        <div className="max-w-6xl mx-auto pl-4 sm:pl-6 pr-20 sm:pr-24 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-sm">
                <MapIcon size={20} />
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
                  Mapa Operacional de Campo · Setor: {assignedSector}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locatingGps}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-200"
                    : "bg-cyan-50 hover:bg-cyan-100 border-cyan-600/25 text-cyan-800"
                }`}
                title="Localizar minha posição no mapa"
              >
                <LocateFixed size={14} className={locatingGps ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Meu GPS</span>
              </button>

              <button
                type="button"
                onClick={handleManualRefresh}
                className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                    : "bg-zinc-50 hover:bg-zinc-100 border-black/10 text-[#183a2b]"
                }`}
                title="Atualizar mapa de campo"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Feedback Banner */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 rounded-2xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 shadow-md font-bold"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{actionMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <span className={`text-[11px] font-bold block mb-1 ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
              A Iniciar
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                {stats.pending}
              </span>
              <span className="text-[11px] opacity-65 hidden sm:inline">despachadas</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <span className={`text-[11px] font-bold block mb-1 ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
              Em Execução
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {stats.inProgress}
              </span>
              <span className="text-[11px] opacity-65 hidden sm:inline">em campo</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-3xl border transition-all ${
              isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/5 shadow-sm"
            }`}
          >
            <span className={`text-[11px] font-bold block mb-1 ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
              Alta / Emergência
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {stats.urgent}
              </span>
              <span className="text-[11px] opacity-65 hidden sm:inline">prioritárias</span>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div
          className={`w-full backdrop-blur-2xl rounded-[28px] border p-4 sm:p-5 space-y-3.5 transition-colors ${
            isDark
              ? "bg-white/5 border-white/15 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                }`}
              />
              <input
                type="text"
                placeholder="Buscar O.S., rua, bairro ou escopo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-full py-2 pl-10 pr-9 text-xs sm:text-sm focus:outline-none transition-all font-mono ${
                  isDark
                    ? "bg-black/20 border border-white/20 text-white placeholder-white/40 focus:border-white/40"
                    : "bg-white border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:border-[#183a2b]"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "active", label: "Ativas em Campo" },
                { id: "pending", label: "A Iniciar" },
                { id: "in_progress", label: "Em Execução" },
                { id: "history", label: "Histórico" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                      : isDark
                      ? "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                      : "bg-white text-[#2d4a3b] border-black/10 hover:bg-black/5"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t ${
              isDark ? "border-white/10" : "border-black/10"
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-xs flex items-center gap-1 mr-1 font-mono ${isDark ? "text-white/60" : "text-[#2d4a3b]/80"}`}>
                <Filter size={12} /> Prioridade:
              </span>
              {[
                { id: "all", label: "Todas" },
                { id: "emergency", label: "Emergência" },
                { id: "high", label: "Alta" },
                { id: "medium", label: "Média" },
                { id: "low", label: "Baixa" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriorityFilter(p.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    priorityFilter === p.id
                      ? isDark
                        ? "bg-white/25 text-white font-bold border border-white/30"
                        : "bg-[#183a2b] text-white font-bold shadow-sm"
                      : isDark
                      ? "bg-white/5 text-white/65 hover:bg-white/10"
                      : "bg-white/80 text-[#2d4a3b] hover:bg-black/5 border border-black/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono ml-auto">
              <span className="opacity-75">
                <strong>{mappedEntries.length}</strong> no mapa · <strong>{filteredEntries.length}</strong> O.S.
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("active");
                    setPriorityFilter("all");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                    isDark ? "bg-white/10 border-white/15" : "bg-white border-black/15"
                  }`}
                >
                  <X size={12} /> Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Map + Operational Side Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Interactive Map */}
          <div className="lg:col-span-7 w-full h-[360px] lg:h-[510px] rounded-[32px] overflow-hidden shadow-2xl border border-black/10 dark:border-white/20 bg-black/5 relative z-10">
            <MapContainer
              center={initialCenter}
              zoom={Math.max(11, city?.default_zoom || 12)}
              minZoom={6}
              zoomControl={false}
              attributionControl={false}
              style={{
                height: "100%",
                width: "100%",
                filter: isDark ? "saturate(0.85) contrast(1.08) brightness(0.92)" : "none",
              }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapFocusController target={focusCoords} />

              {gpsLocation && (
                <Marker position={gpsLocation} icon={gpsMarkerIcon}>
                  <Popup>
                    <div className="p-1 text-xs font-sans font-bold text-zinc-800">
                      Sua localização atual em campo
                    </div>
                  </Popup>
                </Marker>
              )}

              {mappedEntries.map(({ wo, coords }) => {
                if (!coords) return null;
                const isSelected = selectedEntry?.wo.id === wo.id;
                return (
                  <Marker
                    key={wo.id || wo.order_number}
                    position={[coords.latitude, coords.longitude]}
                    icon={createOrderMarkerIcon(wo, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedOrderId(wo.id);
                        setFocusCoords([coords.latitude, coords.longitude]);
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-1.5 text-zinc-800 font-sans max-w-[190px] space-y-1">
                        <span className="font-mono text-[10px] font-bold text-cyan-700 block">
                          {wo.order_number}
                        </span>
                        <h4 className="font-bold text-xs leading-snug">{wo.title}</h4>
                        <p className="text-[11px] text-zinc-600 truncate">{wo.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Selected O.S. Inspection & Route Card */}
          <div className="lg:col-span-5 w-full">
            {selectedEntry ? (
              <div
                className={`rounded-[32px] border p-5 sm:p-6 space-y-4 transition-all ${
                  isDark
                    ? "bg-white/5 border-white/20 text-white shadow-2xl"
                    : "bg-white border-black/10 text-[#183a2b] shadow-lg"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                    {selectedEntry.wo.order_number}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        getPriorityInfo(selectedEntry.wo.priority).badgeClass
                      }`}
                    >
                      {getPriorityInfo(selectedEntry.wo.priority).label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        getStatusInfo(selectedEntry.wo.status).badgeClass
                      }`}
                    >
                      {getStatusInfo(selectedEntry.wo.status).label}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold leading-snug mb-1.5">
                    {selectedEntry.wo.title}
                  </h3>
                  <p className="text-xs opacity-80 flex items-start gap-1.5">
                    <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{selectedEntry.wo.address}</span>
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
                  <div>
                    <span className="block text-[10px] opacity-60">Prazo Limite</span>
                    <span className="font-mono font-bold flex items-center gap-1 mt-0.5">
                      <Calendar size={12} className="text-amber-500" />
                      {selectedEntry.wo.deadline || "Hoje"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60">Tipo de Manutenção</span>
                    <span className="font-semibold block truncate mt-0.5">
                      {selectedEntry.wo.maintenance_type || selectedEntry.wo.category}
                    </span>
                  </div>
                </div>

                {/* Linked Report Photo / Field Context (without exposing citizen PII) */}
                {selectedEntry.linkedReport?.image_url && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold opacity-70 block">
                      Registro Visual do Local:
                    </span>
                    <div
                      onClick={() =>
                        onViewImage?.(
                          selectedEntry.linkedReport!.image_url!,
                          selectedEntry.wo.title
                        )
                      }
                      className="w-full h-36 rounded-2xl bg-cover bg-center border border-black/10 dark:border-white/15 cursor-pointer hover:opacity-95 transition-opacity"
                      style={{
                        backgroundImage: `url("${selectedEntry.linkedReport.image_url}")`,
                      }}
                    />
                  </div>
                )}

                {selectedEntry.wo.technical_instructions && (
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                    <span className="font-bold text-cyan-800 dark:text-cyan-300 block">
                      Instruções do Supervisor:
                    </span>
                    <p className="opacity-90 leading-relaxed">
                      {selectedEntry.wo.technical_instructions}
                    </p>
                  </div>
                )}

                {selectedEntry.wo.description && (
                  <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1">
                    <span className="font-bold opacity-70 block">Descrição do Serviço:</span>
                    <p className="opacity-85 leading-relaxed">{selectedEntry.wo.description}</p>
                  </div>
                )}

                {/* External Route Navigation */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-65 block">
                    Navegação & Rotas de Deslocamento
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={buildGoogleMapsUrl(selectedEntry.wo, selectedEntry.coords)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      <Navigation size={13} className="text-emerald-500" />
                      <span>Google Maps</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </a>

                    <a
                      href={buildWazeUrl(selectedEntry.wo, selectedEntry.coords)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      <MapPin size={13} className="text-cyan-500" />
                      <span>Abrir Waze</span>
                      <ExternalLink size={11} className="opacity-60" />
                    </a>
                  </div>
                </div>

                {/* Operational Actions */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
                  {(selectedEntry.wo.status === "open" || selectedEntry.wo.status === "dispatched") && (
                    <button
                      type="button"
                      onClick={() => handleStartOrder(selectedEntry.wo)}
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                    >
                      <Play size={14} />
                      <span>Iniciar Atendimento Agora</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {onOpenFieldLog && (
                      <button
                        type="button"
                        onClick={() => onOpenFieldLog(selectedEntry.wo.id)}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Calendar size={13} />
                        <span>Calendário</span>
                      </button>
                    )}

                    {onOpenWorkExecution && (
                      <button
                        type="button"
                        onClick={() => onOpenWorkExecution(selectedEntry.wo.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isDark
                            ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                        }`}
                      >
                        <Wrench size={13} />
                        <span>Execução de O.S.</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-[32px] border p-10 text-center space-y-2 ${
                  isDark ? "bg-white/5 border-white/15" : "bg-zinc-50 border-black/10"
                }`}
              >
                <MapPin size={32} className="mx-auto opacity-40 text-cyan-500" />
                <h4 className="font-serif font-bold text-base">Nenhuma O.S. selecionada</h4>
                <p className="text-xs opacity-70">
                  Não há Ordens de Serviço correspondentes aos filtros aplicados para o setor de {assignedSector}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lista rápida de O.S. filtradas (incluindo O.S. manuais sem coordenada GPS) */}
        {filteredEntries.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-base">
                Fila Geográfica do Turno ({filteredEntries.length})
              </h4>
              {unmappedEntries.length > 0 && (
                <span className="text-[11px] font-mono opacity-70">
                  {unmappedEntries.length} O.S. com rota por endereço
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEntries.map(({ wo, coords }) => {
                const isSelected = selectedEntry?.wo.id === wo.id;
                return (
                  <div
                    key={wo.id || wo.order_number}
                    onClick={() => {
                      setSelectedOrderId(wo.id);
                      if (coords) {
                        setFocusCoords([coords.latitude, coords.longitude]);
                      }
                    }}
                    className={`p-4 rounded-3xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? isDark
                          ? "bg-cyan-500/15 border-cyan-400/50 shadow-md"
                          : "bg-cyan-50/70 border-cyan-600/40 shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20"
                        : "bg-white border-black/10 hover:border-black/20 shadow-sm"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
                          {wo.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            getStatusInfo(wo.status).badgeClass
                          }`}
                        >
                          {getStatusInfo(wo.status).label}
                        </span>
                        {!coords && (
                          <span className="text-[10px] font-mono opacity-65">
                            • Somente endereço
                          </span>
                        )}
                      </div>
                      <h5 className="font-serif font-bold text-sm truncate">{wo.title}</h5>
                      <p className="text-xs opacity-75 truncate flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-500 shrink-0" />
                        <span>{wo.address}</span>
                      </p>
                    </div>

                    <ChevronRight size={16} className="shrink-0 opacity-60" />
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
