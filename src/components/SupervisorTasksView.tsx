import React, { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Camera,
  ChevronRight,
  HardHat,
  Sparkles,
  Layers,
  Wrench,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { CATEGORIES_CONFIG, ReportCategory, ReportItem, UserProfile } from "../types";
import { SafeLogoImage } from "./SafeLogoImage";

interface SupervisorTasksViewProps {
  reports: ReportItem[];
  user?: UserProfile;
  category?: string;
  onViewDetails: (report: any) => void;
  onUpdateStatus?: (
    id: string,
    status: string,
    statusNotes?: string
  ) => Promise<void>;
  onTabChange?: (tab: "home" | "report" | "tasks") => void;
}

export const SupervisorTasksView: React.FC<SupervisorTasksViewProps> = ({
  reports = [],
  user,
  category,
  onViewDetails,
  onUpdateStatus,
  onTabChange,
}) => {
  const { isDark } = useTheme();
  const assignedCategory = category || user?.assigned_category || "Pavimentação";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"assigned" | "all">("assigned");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unresolved" | "in_analysis" | "in_progress" | "resolved"
  >("all");

  const safeReports = Array.isArray(reports) ? reports : [];

  const catConfig = CATEGORIES_CONFIG.find(
    (c) => c.id.toLowerCase() === assignedCategory.toLowerCase()
  );

  // Normalization helper for resilient sector matching
  const normalizeSector = (cat?: string) => {
    if (!cat) return "";
    const c = cat.toLowerCase();
    if (c.includes("pav") || c.includes("via") || c.includes("asfalt") || c.includes("burac")) return "pavimentação";
    if (c.includes("ilu") || c.includes("luz") || c.includes("post") || c.includes("lamp")) return "iluminação pública";
    if (c.includes("limp") || c.includes("lixo") || c.includes("entulh") || c.includes("varri")) return "limpeza urbana";
    if (c.includes("san") || c.includes("esgot") || c.includes("bueir") || c.includes("pluvi")) return "saneamento";
    if (c.includes("arb") || c.includes("arvor") || c.includes("poda") || c.includes("praca")) return "arborização";
    return c.trim();
  };

  const currentSectorNormalized = normalizeSector(assignedCategory);

  const matchesCurrentSector = (report: ReportItem) => {
    if (!assignedCategory) return true;
    const catNorm = normalizeSector(report.category);
    const titleNorm = normalizeSector(report.title);
    return (
      catNorm === currentSectorNormalized ||
      titleNorm === currentSectorNormalized ||
      (report.category && report.category.toLowerCase().includes(assignedCategory.toLowerCase())) ||
      (report.title && report.title.toLowerCase().includes(assignedCategory.toLowerCase()))
    );
  };

  // Filter reports
  const filteredReports = safeReports.filter((report) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (report.title && report.title.toLowerCase().includes(q)) ||
      (report.address && report.address.toLowerCase().includes(q)) ||
      (report.description && report.description.toLowerCase().includes(q));

    // Category filter
    let matchesCategory = true;
    if (filterMode === "assigned") {
      matchesCategory = matchesCurrentSector(report);
    }

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = report.status === statusFilter;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate sector metrics
  const sectorReports = safeReports.filter((r) => matchesCurrentSector(r));

  const pendingCount = sectorReports.filter(
    (r) => r.status === "unresolved" || !r.status
  ).length;
  const inProgressCount = sectorReports.filter(
    (r) => r.status === "in_progress" || r.status === "in_analysis"
  ).length;
  const resolvedCount = sectorReports.filter(
    (r) => r.status === "resolved"
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 size={11} /> Concluído
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Wrench size={11} /> Em Andamento
          </span>
        );
      case "in_analysis":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
            <Clock size={11} /> Em Análise
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
            <AlertTriangle size={11} /> Em Aberto
          </span>
        );
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Header section with cover image */}
      <div className="relative w-full h-[32vh] min-h-[240px] flex flex-col justify-end pb-6">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop')`,
            filter: isDark
              ? "brightness(0.6) saturate(0.8)"
              : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-t via-transparent to-black/30 ${
            isDark ? "from-[#5A635C]" : "from-white"
          }`}
        />

        {/* Header branding */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1
                className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                COMMUÁRIA
              </h1>
              <span className="bg-amber-500 text-[10px] px-2 py-0.5 rounded-full font-sans font-extrabold tracking-wide text-zinc-950 shadow-md">
                SUPERVISOR
              </span>
            </div>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Setor de {assignedCategory}
            </span>
          </div>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: catConfig?.color || "#f59e0b" }}
            />
            <span className="text-xs font-mono font-bold uppercase tracking-widest opacity-80">
              Setor Municipal Designado
            </span>
          </div>
          <h2
            className={`text-[2rem] sm:text-[2.4rem] font-serif font-bold tracking-tight drop-shadow-lg leading-tight ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            {assignedCategory}
          </h2>
          <p
            className={`mt-0.5 text-xs sm:text-sm font-medium drop-shadow-sm ${
              isDark ? "text-white/90" : "text-[#2d4a3b]"
            }`}
          >
            Gerenciamento e atendimento de ocorrências deste setor.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 mt-4">
        {/* Sector Quick KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className={`p-4 rounded-2xl border text-center transition-all ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-black/5 border-black/10"
            }`}
          >
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500 block">
              {pendingCount}
            </span>
            <span className="text-[11px] font-bold opacity-75 uppercase tracking-wider block mt-1">
              Abertos
            </span>
          </div>

          <div
            className={`p-4 rounded-2xl border text-center transition-all ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-black/5 border-black/10"
            }`}
          >
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-400 block">
              {inProgressCount}
            </span>
            <span className="text-[11px] font-bold opacity-75 uppercase tracking-wider block mt-1">
              Em Andamento
            </span>
          </div>

          <div
            className={`p-4 rounded-2xl border text-center transition-all ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-black/5 border-black/10"
            }`}
          >
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 block">
              {resolvedCount}
            </span>
            <span className="text-[11px] font-bold opacity-75 uppercase tracking-wider block mt-1">
              Resolvidos
            </span>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div
          className={`flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-2xl p-4 sm:p-5 rounded-[28px] border shadow-lg transition-colors ${
            isDark
              ? "bg-white/5 border-white/10 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="relative flex items-center w-full md:max-w-md">
            <Search
              size={18}
              className={`absolute left-4 ${
                isDark ? "text-white/40" : "text-[#2d4a3b]/60"
              }`}
            />
            <input
              type="text"
              placeholder={`Pesquisar chamados de ${assignedCategory}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full py-2.5 pl-12 pr-4 text-xs sm:text-sm focus:outline-none transition-all font-mono shadow-inner ${
                isDark
                  ? "bg-black/20 border border-white/20 text-white placeholder-white/40 focus:border-white/40"
                  : "bg-black/5 border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:border-[#183a2b]"
              }`}
            />
          </div>

          {/* Toggle: My Sector vs All Sectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex rounded-full border p-1 border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setFilterMode("assigned")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterMode === "assigned"
                    ? isDark
                      ? "bg-white text-zinc-900 shadow-md"
                      : "bg-[#183a2b] text-white shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                Meu Setor ({sectorReports.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterMode === "all"
                    ? isDark
                      ? "bg-white text-zinc-900 shadow-md"
                      : "bg-[#183a2b] text-white shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                Todos ({reports.length})
              </button>
            </div>

            {/* Status pill filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                isDark
                  ? "bg-zinc-800 border-white/20 text-white"
                  : "bg-white border-black/20 text-[#183a2b]"
              }`}
            >
              <option value="all">Todos os Status</option>
              <option value="unresolved">Em Aberto</option>
              <option value="in_analysis">Em Análise</option>
              <option value="in_progress">Em Andamento</option>
              <option value="resolved">Concluídos</option>
            </select>
          </div>
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <div
            className={`text-center py-16 px-6 rounded-3xl border ${
              isDark
                ? "bg-white/5 border-white/10 text-white/70"
                : "bg-black/5 border-black/10 text-[#183a2b]"
            }`}
          >
            <HardHat size={40} className="mx-auto mb-3 opacity-40 text-amber-500" />
            <p className="text-base font-bold">Nenhum chamado encontrado</p>
            <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto">
              {filterMode === "assigned"
                ? `Não há ocorrências pendentes no setor de ${assignedCategory} com os filtros atuais.`
                : "Nenhum chamado corresponde aos termos pesquisados."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {filteredReports.map((report) => {
              const cat = CATEGORIES_CONFIG.find(
                (c) =>
                  c.id.toLowerCase() ===
                  (report.category || "Pavimentação").toLowerCase()
              );

              return (
                <div
                  key={report.id}
                  onClick={() => onViewDetails(report)}
                  className={`rounded-[28px] border overflow-hidden transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 ${
                    isDark
                      ? "bg-zinc-800/85 border-white/10 hover:border-white/25"
                      : "bg-white border-black/10 hover:border-[#183a2b]/30"
                  }`}
                >
                  <div>
                    {/* Card Cover Image */}
                    <div className="relative w-full h-44 overflow-hidden bg-black/20">
                      {report.image_url ? (
                        <img
                          src={report.image_url}
                          alt={report.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 opacity-30">
                          <Camera size={28} />
                          <span className="text-[11px] font-mono">Sem foto</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md text-white border border-white/20"
                          style={{ backgroundColor: `${cat?.color || "#f59e0b"}dd` }}
                        >
                          {cat?.shortLabel || report.category || "Zeladoria"}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-2.5">
                      <h3
                        className={`text-lg font-bold font-serif leading-snug line-clamp-2 ${
                          isDark ? "text-white" : "text-[#183a2b]"
                        }`}
                      >
                        {report.title}
                      </h3>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isDark ? "text-white/70" : "text-[#2d4a3b]"
                        }`}
                      >
                        {report.description || report.title}
                      </p>

                      {/* Status Notes if available */}
                      {report.status_notes && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200">
                          <span className="font-bold block">Parecer Técnico:</span>
                          <span className="line-clamp-2">{report.status_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer info & Action button */}
                  <div
                    className={`p-4 border-t flex items-center justify-between gap-2 text-xs font-mono ${
                      isDark
                        ? "border-white/10 bg-black/20 text-white/60"
                        : "border-black/5 bg-black/5 text-[#2d4a3b]/75"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <MapPin size={13} className="text-red-500 shrink-0" />
                      <span className="truncate">{report.address || "Araucária"}</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      <span>Atender</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
