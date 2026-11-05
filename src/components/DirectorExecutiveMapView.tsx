import React, { useState, useMemo, useEffect } from "react";
import {
  Map as MapIcon,
  MapPin,
  Search,
  FileText,
  Wrench,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronRight,
  Layers,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "../ThemeContext";
import {
  CATEGORIES_CONFIG,
  CityItem,
  ReportCategory,
  ReportItem,
  UserProfile,
  WorkOrderItem,
  maskCitizenData,
} from "../types";
import {
  extractNeighborhoodFromAddress,
  fetchSystemWorkOrders,
  normalizeSectorCategory,
} from "../lib/workOrderService";

interface DirectorExecutiveMapViewProps {
  user?: UserProfile;
  city?: CityItem | null;
  reports: ReportItem[];
  onRefresh?: () => Promise<void> | void;
  onViewReportDetails?: (report: ReportItem) => void;
  onViewImage?: (url: string, title: string) => void;
}

type TerritorialStage = "triagem" | "with_wo" | "blocked" | "resolved";
type PriorityLevel = "emergency" | "high" | "medium" | "low";

interface TerritorialPoint {
  id: string;
  sourceType: "report" | "standalone_wo";
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  sector: ReportCategory;
  stage: TerritorialStage;
  priority: PriorityLevel;
  hasValidCoords: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  citizenDisplayName: string;
  imageUrl?: string | null;
  report: ReportItem | null;
  linkedWo: WorkOrderItem | null;
}

const PRIORITY_META: Record<
  PriorityLevel,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  emergency: {
    label: "Emergência",
    shortLabel: "Emergência",
    badgeClass: "bg-rose-600 text-white border-rose-500",
  },
  high: {
    label: "Alta Prioridade",
    shortLabel: "Alta",
    badgeClass:
      "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/35",
  },
  medium: {
    label: "Prioridade Média",
    shortLabel: "Média",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  },
  low: {
    label: "Prioridade Baixa",
    shortLabel: "Baixa",
    badgeClass:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
  },
};

const STAGE_META: Record<TerritorialStage, { label: string; badgeClass: string }> = {
  triagem: {
    label: "Aguardando O.S.",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  with_wo: {
    label: "Serviço em Campo",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  blocked: {
    label: "Com Impedimento",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  resolved: {
    label: "Concluído",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
};

const normalizePriority = (raw?: string | null): PriorityLevel => {
  if (raw === "emergency" || raw === "high" || raw === "medium" || raw === "low") {
    return raw;
  }
  return "medium";
};

const MapFocusController: React.FC<{ target: [number, number] | null; zoom?: number }> = ({
  target,
  zoom = 14,
}) => {
  const map = useMap();
  useEffect(() => {
    if (target && !Number.isNaN(target[0]) && !Number.isNaN(target[1])) {
      map.flyTo(target, zoom, { duration: 0.75 });
    }
  }, [target?.[0], target?.[1], zoom, map]);
  return null;
};

export const DirectorExecutiveMapView: React.FC<DirectorExecutiveMapViewProps> = ({
  user,
  city,
  reports = [],
  onRefresh,
  onViewReportDetails,
  onViewImage,
}) => {
  const { isDark } = useTheme();

  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros territoriais solicitados: Secretaria, Status, Prioridade, Região e Busca
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<"all" | TerritorialStage>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | PriorityLevel>("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHotspots, setShowHotspots] = useState<boolean>(true);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [focusZoom, setFocusZoom] = useState<number>(14);

  const loadWorkOrders = async () => {
    const list = await fetchSystemWorkOrders(city?.id || user?.city_id || "araucaria-pr");
    setWorkOrders(list);
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadWorkOrders();
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Consolida chamados de cidadãos (protegidos por LGPD) + O.S. avulsas por região e setor
  const territorialPoints = useMemo<TerritorialPoint[]>(() => {
    const citizenReports = (Array.isArray(reports) ? reports : [])
      .filter((r) => !r.is_work_order)
      .map((r) => maskCitizenData(r, "diretor"));

    const usedWoIds = new Set<string>();
    const points: TerritorialPoint[] = [];

    citizenReports.forEach((rep) => {
      const sector = normalizeSectorCategory(
        rep.category || rep.maintenance_type,
        rep.title,
        rep.description
      );
      const linkedWo =
        workOrders.find(
          (wo) =>
            (wo.linked_report_id && wo.linked_report_id === rep.id) ||
            (rep.work_order_number && wo.order_number === rep.work_order_number)
        ) || null;

      if (linkedWo) {
        usedWoIds.add(linkedWo.id);
      }

      let stage: TerritorialStage = "triagem";
      if (rep.status === "resolved" || linkedWo?.status === "completed") {
        stage = "resolved";
      } else if (
        linkedWo?.status === "impossible" ||
        linkedWo?.status === "cancelled"
      ) {
        stage = "blocked";
      } else if (linkedWo) {
        stage = "with_wo";
      }

      // Prioridade efetiva considera a O.S. vinculada (quando despachada) ou a do chamado
      const priority = normalizePriority(linkedWo?.priority || rep.priority);

      const lat =
        typeof rep.latitude === "number" && !Number.isNaN(rep.latitude) && rep.latitude !== 0
          ? rep.latitude
          : typeof linkedWo?.latitude === "number" && !Number.isNaN(linkedWo.latitude)
          ? linkedWo.latitude
          : null;
      const lng =
        typeof rep.longitude === "number" && !Number.isNaN(rep.longitude) && rep.longitude !== 0
          ? rep.longitude
          : typeof linkedWo?.longitude === "number" && !Number.isNaN(linkedWo.longitude)
          ? linkedWo.longitude
          : null;

      points.push({
        id: rep.id,
        sourceType: "report",
        title: rep.title,
        description: rep.description || "",
        address: rep.address || linkedWo?.address || `${city?.name || "Araucária"} - ${city?.state || "PR"}`,
        neighborhood: extractNeighborhoodFromAddress(rep.address || linkedWo?.address),
        sector,
        stage,
        priority,
        hasValidCoords: lat !== null && lng !== null,
        latitude: lat,
        longitude: lng,
        createdAt: rep.created_at,
        citizenDisplayName: rep.user_name || "Munícipe (Protegido LGPD)",
        imageUrl: rep.image_url || linkedWo?.resolution_photo_url || null,
        report: rep,
        linkedWo,
      });
    });

    // Inclui também Ordens de Serviço diretas que não estejam atreladas a um chamado cidadão listado
    workOrders.forEach((wo) => {
      if (usedWoIds.has(wo.id)) return;
      const sector = normalizeSectorCategory(wo.category, wo.title, wo.description);

      let stage: TerritorialStage = "with_wo";
      if (wo.status === "completed") stage = "resolved";
      else if (wo.status === "impossible" || wo.status === "cancelled") stage = "blocked";

      const lat =
        typeof wo.latitude === "number" && !Number.isNaN(wo.latitude) && wo.latitude !== 0
          ? wo.latitude
          : null;
      const lng =
        typeof wo.longitude === "number" && !Number.isNaN(wo.longitude) && wo.longitude !== 0
          ? wo.longitude
          : null;

      points.push({
        id: `wo-${wo.id}`,
        sourceType: "standalone_wo",
        title: wo.title,
        description: wo.description || wo.technical_instructions || "",
        address: wo.address || `${city?.name || "Araucária"} - ${city?.state || "PR"}`,
        neighborhood: extractNeighborhoodFromAddress(wo.address),
        sector,
        stage,
        priority: normalizePriority(wo.priority),
        hasValidCoords: lat !== null && lng !== null,
        latitude: lat,
        longitude: lng,
        createdAt: wo.created_at,
        citizenDisplayName: "Ordem Interna de Zeladoria",
        imageUrl: wo.resolution_photo_url || null,
        report: null,
        linkedWo: wo,
      });
    });

    return points;
  }, [reports, workOrders]);

  // Diagnóstico de Concentração Territorial por Região (respeita filtros de secretaria, status e prioridade)
  const regionConcentration = useMemo(() => {
    const scoped = territorialPoints.filter((pt) => {
      if (selectedSector !== "all" && pt.sector !== selectedSector) return false;
      if (stageFilter !== "all" && pt.stage !== stageFilter) return false;
      if (priorityFilter !== "all" && pt.priority !== priorityFilter) return false;
      return true;
    });

    const totalScoped = scoped.length || 1;
    const groups = new Map<
      string,
      {
        name: string;
        total: number;
        open: number;
        resolved: number;
        urgent: number;
        sectorCounts: Record<string, number>;
        latSum: number;
        lngSum: number;
        coordCount: number;
      }
    >();

    scoped.forEach((pt) => {
      const nb = pt.neighborhood;
      if (!groups.has(nb)) {
        groups.set(nb, {
          name: nb,
          total: 0,
          open: 0,
          resolved: 0,
          urgent: 0,
          sectorCounts: {},
          latSum: 0,
          lngSum: 0,
          coordCount: 0,
        });
      }
      const g = groups.get(nb)!;
      g.total += 1;
      if (pt.stage === "resolved") {
        g.resolved += 1;
      } else {
        g.open += 1;
      }
      if ((pt.priority === "emergency" || pt.priority === "high") && pt.stage !== "resolved") {
        g.urgent += 1;
      }
      g.sectorCounts[pt.sector] = (g.sectorCounts[pt.sector] || 0) + 1;
      if (pt.hasValidCoords && pt.latitude !== null && pt.longitude !== null) {
        g.latSum += pt.latitude;
        g.lngSum += pt.longitude;
        g.coordCount += 1;
      }
    });

    return Array.from(groups.values())
      .map((g, idx) => {
        const sortedSectors = Object.entries(g.sectorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([secId, count]) => {
            const cfg = CATEGORIES_CONFIG.find((c) => c.id === secId);
            return {
              id: secId as ReportCategory,
              shortLabel: cfg?.shortLabel || secId,
              color: cfg?.color || "#6366f1",
              count,
            };
          });

        const centroid: [number, number] | null =
          g.coordCount > 0 ? [g.latSum / g.coordCount, g.lngSum / g.coordCount] : null;
        const sharePct = Math.round((g.total / totalScoped) * 100);

        return {
          ...g,
          rank: idx + 1,
          sharePct,
          sectors: sortedSectors,
          topSectorColor: sortedSectors[0]?.color || "#6366f1",
          centroid,
        };
      })
      .sort((a, b) => b.open - a.open || b.urgent - a.urgent || b.total - a.total)
      .map((g, index) => ({ ...g, isTopHotspot: index === 0 && g.open > 0 }));
  }, [territorialPoints, selectedSector, stageFilter, priorityFilter]);

  // Pontos filtrados para o mapa e consulta operacional
  const filteredPoints = useMemo(() => {
    return territorialPoints.filter((pt) => {
      if (selectedSector !== "all" && pt.sector !== selectedSector) return false;
      if (stageFilter !== "all" && pt.stage !== stageFilter) return false;
      if (priorityFilter !== "all" && pt.priority !== priorityFilter) return false;
      if (selectedNeighborhood !== "all" && pt.neighborhood !== selectedNeighborhood) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = pt.title.toLowerCase().includes(q);
        const matchAddr = pt.address.toLowerCase().includes(q);
        const matchNb = pt.neighborhood.toLowerCase().includes(q);
        const matchDesc = pt.description.toLowerCase().includes(q);
        const matchWo = (pt.linkedWo?.order_number || "").toLowerCase().includes(q);
        if (!matchTitle && !matchAddr && !matchNb && !matchDesc && !matchWo) {
          return false;
        }
      }
      return true;
    });
  }, [
    territorialPoints,
    selectedSector,
    stageFilter,
    priorityFilter,
    selectedNeighborhood,
    searchQuery,
  ]);

  const mappedPoints = useMemo(
    () =>
      filteredPoints.filter(
        (pt): pt is TerritorialPoint & { latitude: number; longitude: number } =>
          pt.hasValidCoords && pt.latitude !== null && pt.longitude !== null
      ),
    [filteredPoints]
  );

  const unmappedPoints = useMemo(
    () => filteredPoints.filter((pt) => !pt.hasValidCoords),
    [filteredPoints]
  );

  const selectedPoint = useMemo(() => {
    if (selectedPointId) {
      const exact = filteredPoints.find((p) => p.id === selectedPointId);
      if (exact) return exact;
    }
    return mappedPoints[0] || filteredPoints[0] || null;
  }, [selectedPointId, filteredPoints, mappedPoints]);

  const initialCenter = useMemo<[number, number]>(() => {
    if (mappedPoints.length > 0) {
      const latSum = mappedPoints.reduce((acc, p) => acc + p.latitude, 0);
      const lngSum = mappedPoints.reduce((acc, p) => acc + p.longitude, 0);
      return [latSum / mappedPoints.length, lngSum / mappedPoints.length];
    }
    return [city?.center_lat || -25.633835, city?.center_lng || -49.461966];
  }, [mappedPoints.length, city?.center_lat, city?.center_lng]);

  const createExecutiveMarkerIcon = (pt: TerritorialPoint, isSelected: boolean) => {
    const cfg = CATEGORIES_CONFIG.find((c) => c.id === pt.sector);
    const bgHex =
      pt.stage === "resolved"
        ? "#10b981"
        : pt.stage === "blocked"
        ? "#e11d48"
        : cfg?.color || "#4f46e5";

    const isCritical =
      (pt.priority === "emergency" || pt.priority === "high") && pt.stage !== "resolved";

    const ringStyle = isSelected
      ? "box-shadow: 0 0 0 4px rgba(255,255,255,0.95), 0 8px 20px rgba(0,0,0,0.4); transform: scale(1.18);"
      : isCritical
      ? "box-shadow: 0 0 0 3px rgba(244,63,94,0.65), 0 4px 12px rgba(0,0,0,0.35); border: 2px solid #ffffff;"
      : "box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.85);";

    return L.divIcon({
      className: "custom-leaflet-icon-director",
      html: `
        <div class="flex items-center justify-center">
          <div style="background:${bgHex}; ${ringStyle}" class="p-2 rounded-full text-white transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.095 1.095 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
    });
  };

  const hasActiveFilters =
    selectedSector !== "all" ||
    stageFilter !== "all" ||
    priorityFilter !== "all" ||
    selectedNeighborhood !== "all" ||
    searchQuery.trim() !== "";

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
                <MapIcon size={20} />
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
                  Mapa Executivo & Diagnóstico Territorial de {city?.name || "seu município"}
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
                title="Atualizar mapa territorial"
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
        {/* Filtro 1: Secretaria / Setor */}
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

        {/* Painel de Filtros Territoriais: Busca, Status e Prioridade */}
        <div
          className={`w-full backdrop-blur-2xl rounded-[28px] border p-4 sm:p-5 space-y-3.5 transition-colors ${
            isDark
              ? "bg-white/5 border-white/15 text-white"
              : "bg-zinc-50 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Busca por endereço, bairro ou O.S. */}
            <div className="relative flex-1">
              <Search
                size={15}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                }`}
              />
              <input
                type="text"
                placeholder="Buscar rua, região/bairro, título ou número de O.S...."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-xl py-2 pl-9 pr-9 text-xs focus:outline-none transition-all ${
                  isDark
                    ? "bg-black/20 border border-white/15 text-white placeholder-white/40 focus:border-white/35"
                    : "bg-white border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/55 focus:border-[#183a2b]"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Alternador de destaque visual de áreas concentradas */}
            <button
              type="button"
              onClick={() => setShowHotspots((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                showHotspots
                  ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/35"
                  : isDark
                  ? "bg-white/5 text-white/70 border-white/10"
                  : "bg-white text-[#183a2b] border-black/10"
              }`}
            >
              <Eye size={14} />
              <span>Áreas de Concentração</span>
            </button>
          </div>

          {/* Linha dupla compacta: Filtro por Status + Filtro por Prioridade */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[11px] font-bold opacity-60 shrink-0 mr-1">Status:</span>
              {[
                { id: "all", label: "Todos" },
                { id: "triagem", label: "Aguardando O.S." },
                { id: "with_wo", label: "Em Campo" },
                { id: "blocked", label: "Impedimento" },
                { id: "resolved", label: "Concluídos" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStageFilter(st.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    stageFilter === st.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isDark
                      ? "bg-white/10 text-white/75 hover:bg-white/15"
                      : "bg-white text-[#183a2b] border border-black/10 hover:bg-zinc-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[11px] font-bold opacity-60 shrink-0 mr-1">Prioridade:</span>
              {[
                { id: "all", label: "Todas" },
                { id: "emergency", label: "Emergência" },
                { id: "high", label: "Alta" },
                { id: "medium", label: "Média" },
                { id: "low", label: "Baixa" },
              ].map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => setPriorityFilter(pr.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    priorityFilter === pr.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isDark
                      ? "bg-white/10 text-white/75 hover:bg-white/15"
                      : "bg-white text-[#183a2b] border border-black/10 hover:bg-zinc-100"
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <div
              className={`flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t text-xs ${
                isDark ? "border-white/10" : "border-black/10"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="opacity-75 font-mono">
                  Exibindo <strong>{filteredPoints.length}</strong> registro(s) ({mappedPoints.length} georreferenciados)
                </span>
                {selectedNeighborhood !== "all" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                    <MapPin size={11} />
                    {selectedNeighborhood}
                    <button
                      type="button"
                      onClick={() => setSelectedNeighborhood("all")}
                      className="hover:opacity-75 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedSector("all");
                  setStageFilter("all");
                  setPriorityFilter("all");
                  setSelectedNeighborhood("all");
                  setSearchQuery("");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                  isDark ? "bg-white/10 border-white/15" : "bg-white border-black/15"
                }`}
              >
                <X size={12} /> Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Mapa Territorial + Consulta Operacional do Ponto Selecionado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Mapa Interativo com Halos de Concentração Regional */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
            <div className="w-full h-[400px] lg:h-[520px] rounded-[32px] overflow-hidden shadow-2xl border border-black/10 dark:border-white/20 bg-black/5 relative z-10">
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
                <MapFocusController target={focusCoords} zoom={focusZoom} />

                {/* Destaque visual de áreas com maior concentração de ocorrências */}
                {showHotspots &&
                  regionConcentration
                    .filter((reg) => reg.centroid !== null && reg.total > 0)
                    .map((reg) => {
                      const isCriticalArea = reg.isTopHotspot || reg.open >= 2 || reg.urgent > 0;
                      const radius = Math.min(48, 20 + reg.total * 9 + reg.open * 4);
                      const strokeColor = isCriticalArea ? "#f43f5e" : "#6366f1";
                      return (
                        <CircleMarker
                          key={`hotspot-${reg.name}`}
                          center={reg.centroid!}
                          radius={radius}
                          pathOptions={{
                            color: strokeColor,
                            weight: isCriticalArea ? 2 : 1.5,
                            fillColor: strokeColor,
                            fillOpacity: isCriticalArea ? 0.22 : 0.12,
                            dashArray: isCriticalArea ? undefined : "4 4",
                          }}
                          eventHandlers={{
                            click: () => {
                              setSelectedNeighborhood(reg.name);
                              setFocusCoords(reg.centroid!);
                              setFocusZoom(14);
                            },
                          }}
                        >
                          <Popup>
                            <div className="p-1 text-zinc-800 font-sans text-xs space-y-0.5">
                              <strong className="block">{reg.name}</strong>
                              <span>
                                {reg.total} ocorrência(s) · {reg.open} em aberto
                              </span>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}

                {/* Pinos Georreferenciados por Setor, Status e Criticidade */}
                {mappedPoints.map((pt) => {
                  const isSelected = selectedPoint?.id === pt.id;
                  return (
                    <Marker
                      key={pt.id}
                      position={[pt.latitude, pt.longitude]}
                      icon={createExecutiveMarkerIcon(pt, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelectedPointId(pt.id);
                          setFocusCoords([pt.latitude, pt.longitude]);
                          setFocusZoom(15);
                        },
                      }}
                    >
                      <Popup>
                        <div className="p-1.5 text-zinc-800 font-sans max-w-[200px] space-y-1">
                          <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                            {pt.sector} · {PRIORITY_META[pt.priority].shortLabel}
                          </span>
                          <h4 className="font-bold text-xs leading-snug">{pt.title}</h4>
                          <p className="text-[11px] text-zinc-600 truncate">{pt.neighborhood}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Legenda Compacta do Mapa */}
            <div
              className={`px-4 py-2.5 rounded-2xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                isDark
                  ? "bg-white/5 border-white/10 text-white/80"
                  : "bg-zinc-50 border-black/5 text-[#183a2b]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/35 border border-rose-500 inline-block" />
                  <span>Alta concentração em aberto</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Concluído</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                  <span>Impedimento / Crítico</span>
                </span>
              </div>

              {unmappedPoints.length > 0 && (
                <span className="font-mono opacity-70">
                  +{unmappedPoints.length} serviço(s) apenas com endereço textual
                </span>
              )}
            </div>
          </div>

          {/* Ficha de Consulta Operacional do Ponto Selecionado (LGPD) */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            {selectedPoint ? (
              <div
                className={`rounded-[32px] border p-5 sm:p-6 space-y-4 transition-all ${
                  isDark
                    ? "bg-white/5 border-white/20 text-white shadow-2xl"
                    : "bg-white border-black/10 text-[#183a2b] shadow-lg"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {selectedPoint.sector}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        PRIORITY_META[selectedPoint.priority].badgeClass
                      }`}
                    >
                      {PRIORITY_META[selectedPoint.priority].shortLabel}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        STAGE_META[selectedPoint.stage].badgeClass
                      }`}
                    >
                      {STAGE_META[selectedPoint.stage].label}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold leading-snug mb-1">
                    {selectedPoint.title}
                  </h3>
                  <p className="text-xs opacity-80 flex items-start gap-1.5">
                    <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{selectedPoint.address}</span>
                  </p>
                </div>

                {selectedPoint.imageUrl && (
                  <div
                    onClick={() =>
                      onViewImage?.(selectedPoint.imageUrl!, selectedPoint.title)
                    }
                    className="w-full h-36 rounded-2xl bg-cover bg-center border border-black/10 dark:border-white/15 cursor-pointer hover:opacity-95 transition-opacity"
                    style={{ backgroundImage: `url("${selectedPoint.imageUrl}")` }}
                  />
                )}

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
                  <div>
                    <span className="block text-[10px] opacity-60">Região / Bairro</span>
                    <span className="font-semibold block truncate mt-0.5">
                      {selectedPoint.neighborhood}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-60">Origem (LGPD)</span>
                    <span className="font-semibold block truncate mt-0.5">
                      {selectedPoint.citizenDisplayName}
                    </span>
                  </div>
                </div>

                {selectedPoint.description && (
                  <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-1">
                    <span className="font-bold opacity-70 block">Descrição Operacional:</span>
                    <p className="opacity-85 leading-relaxed line-clamp-4">
                      {selectedPoint.description}
                    </p>
                  </div>
                )}

                {/* Situação do Serviço / Ordem de Serviço Vinculada */}
                {selectedPoint.linkedWo ? (
                  <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Wrench size={12} />
                        {selectedPoint.linkedWo.order_number}
                      </span>
                      <span className="text-[10px] font-mono font-bold opacity-80">
                        Prazo: {selectedPoint.linkedWo.deadline || "Não fixado"}
                      </span>
                    </div>
                    <p className="opacity-85">
                      Equipe:{" "}
                      <strong>
                        {selectedPoint.linkedWo.assigned_employee_name ||
                          selectedPoint.linkedWo.assigned_team ||
                          "Equipe do Setor"}
                      </strong>
                    </p>
                    {(selectedPoint.linkedWo.resolution_notes ||
                      selectedPoint.linkedWo.technical_instructions) && (
                      <p className="opacity-80 text-[11px] leading-relaxed border-t border-indigo-500/20 pt-1.5">
                        {selectedPoint.linkedWo.resolution_notes ||
                          selectedPoint.linkedWo.technical_instructions}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block">
                      Sem Ordem de Serviço vinculada
                    </span>
                    <p className="opacity-80 mt-0.5">
                      Chamado aguardando despacho operacional da supervisão de{" "}
                      {selectedPoint.sector}.
                    </p>
                  </div>
                )}

                {selectedPoint.report && onViewReportDetails && (
                  <button
                    type="button"
                    onClick={() => onViewReportDetails(selectedPoint.report!)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                        : "bg-zinc-100 hover:bg-zinc-200 border-black/10 text-[#183a2b]"
                    }`}
                  >
                    <FileText size={13} />
                    <span>Abrir Ficha do Chamado</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`rounded-[32px] border p-10 text-center space-y-2 ${
                  isDark ? "bg-white/5 border-white/15" : "bg-zinc-50 border-black/10"
                }`}
              >
                <Layers size={32} className="mx-auto opacity-40 text-indigo-500" />
                <h4 className="font-serif font-bold text-base">
                  Nenhum registro territorial para este filtro
                </h4>
                <p className="text-xs opacity-70">
                  Ajuste os filtros de secretaria, status ou prioridade acima.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Diagnóstico de Concentração Territorial por Região e Setor */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold">
                Concentração Territorial por Região e Setor
              </h3>
              <p className="text-xs opacity-70">
                Regiões de {city?.name || "seu município"} ordenadas pelo volume de demandas ativas e distribuição setorial. Clique para filtrar e focar no mapa.
              </p>
            </div>
            {selectedNeighborhood !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedNeighborhood("all")}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-auto cursor-pointer"
              >
                Mostrar todas as regiões
              </button>
            )}
          </div>

          {regionConcentration.length === 0 ? (
            <div
              className={`p-10 text-center rounded-3xl border ${
                isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
              }`}
            >
              <p className="text-xs opacity-70">
                Nenhuma ocorrência encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regionConcentration.map((region) => {
                const isSelectedRegion = selectedNeighborhood === region.name;
                return (
                  <div
                    key={region.name}
                    onClick={() => {
                      if (isSelectedRegion) {
                        setSelectedNeighborhood("all");
                      } else {
                        setSelectedNeighborhood(region.name);
                        if (region.centroid) {
                          setFocusCoords(region.centroid);
                          setFocusZoom(14);
                        }
                      }
                    }}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.01] space-y-3 ${
                      isSelectedRegion
                        ? isDark
                          ? "bg-indigo-500/20 border-indigo-400/50 shadow-lg"
                          : "bg-indigo-50/70 border-indigo-600/40 shadow-md"
                        : region.isTopHotspot
                        ? isDark
                          ? "bg-rose-950/15 border-rose-500/30 hover:border-rose-400/50"
                          : "bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20"
                        : "bg-zinc-50 border-black/5 hover:border-black/15 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin
                          size={15}
                          className={
                            region.isTopHotspot ? "text-rose-500 shrink-0" : "text-indigo-500 shrink-0"
                          }
                        />
                        <h4 className="font-serif font-bold text-base truncate">
                          {region.name}
                        </h4>
                      </div>

                      {region.isTopHotspot ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0">
                          Maior Concentração
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {region.sharePct}% da demanda
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-black/5 dark:border-white/10 text-xs">
                      <div>
                        <span className="block opacity-60 text-[10px]">Em Aberto</span>
                        <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
                          {region.open}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Urgentes</span>
                        <span
                          className={`font-bold font-mono text-sm ${
                            region.urgent > 0 ? "text-rose-500" : "opacity-70"
                          }`}
                        >
                          {region.urgent}
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60 text-[10px]">Total</span>
                        <span className="font-bold font-mono text-sm">{region.total}</span>
                      </div>
                    </div>

                    {/* Setores presentes na região */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {region.sectors.slice(0, 3).map((sec) => (
                          <span
                            key={sec.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              isDark
                                ? "bg-black/20 border-white/10 text-white/85"
                                : "bg-white border-black/10 text-[#183a2b]"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sec.color }}
                            />
                            <span>
                              {sec.shortLabel} ({sec.count})
                            </span>
                          </span>
                        ))}
                      </div>
                      <ChevronRight size={14} className="opacity-60 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
