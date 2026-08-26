import React, { useState, useEffect } from "react";
import {
  Wrench,
  HardHat,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText,
  Search,
  ChevronRight,
  Sparkles,
  Layers,
  Truck,
  Plus,
  Copy,
  Printer,
  X,
  Building2,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { CATEGORIES_CONFIG, ReportCategory, ReportItem, UserProfile, WorkOrderItem } from "../types";
import { SafeLogoImage } from "./SafeLogoImage";
import { supabase } from "../lib/supabase";

interface SupervisorWorkOrderViewProps {
  category?: string;
  user?: UserProfile;
  reports?: ReportItem[];
  onRefresh?: () => Promise<void>;
  onTabChange?: (tab: "home" | "report" | "tasks") => void;
  onGoToProfile?: () => void;
  onGoToSettings?: () => void;
  onUpdateReportStatus?: (reportId: string, newStatus: string, notes?: string) => Promise<void>;
  onViewReportDetails?: (report: any) => void;
}

export const SupervisorWorkOrderView: React.FC<SupervisorWorkOrderViewProps> = ({
  category = "Pavimentação",
  user,
  reports = [],
  onRefresh,
  onTabChange,
  onGoToProfile,
  onGoToSettings,
  onUpdateReportStatus,
  onViewReportDetails,
}) => {
  const { isDark } = useTheme();
  const assignedCategory = category || user?.assigned_category || "Pavimentação";

  const [activeSubTab, setActiveSubTab] = useState<"new_order" | "citizen_reports" | "history">("citizen_reports");
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<WorkOrderItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [orderTitle, setOrderTitle] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderPriority, setOrderPriority] = useState<"low" | "medium" | "high" | "emergency">("medium");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [orderTeam, setOrderTeam] = useState("");
  const [orderType, setOrderType] = useState("Manutenção Corretiva");
  const [orderDescription, setOrderDescription] = useState("");
  const [technicalInstructions, setTechnicalInstructions] = useState("");
  const [linkedReportId, setLinkedReportId] = useState("");

  const catConfig = CATEGORIES_CONFIG.find(
    (c) => c.id.toLowerCase() === assignedCategory.toLowerCase()
  );

  // Generate readable protocol prefix
  const categoryCode =
    assignedCategory.toLowerCase().includes("pav")
      ? "PAV"
      : assignedCategory.toLowerCase().includes("ilu")
      ? "ILU"
      : assignedCategory.toLowerCase().includes("limp")
      ? "LMP"
      : assignedCategory.toLowerCase().includes("san")
      ? "SAN"
      : assignedCategory.toLowerCase().includes("arb")
      ? "ARB"
      : "ZEL";

  // Load Work Orders from LocalStorage & Supabase
  const loadWorkOrders = async () => {
    try {
      let dbOrders: WorkOrderItem[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("work_orders")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            dbOrders = data;
          }
        } catch (dbErr) {
          console.warn("Tabela work_orders no Supabase:", dbErr);
        }
      }

      const stored = localStorage.getItem("commuaria_work_orders");
      let localList: WorkOrderItem[] = stored ? JSON.parse(stored) : [];

      const merged = [...dbOrders];
      localList.forEach((lo) => {
        if (!merged.some((m) => m.id === lo.id || m.order_number === lo.order_number)) {
          merged.push(lo);
        }
      });

      // Filter by sector if assigned
      let filtered = merged;
      if (assignedCategory) {
        const normAssigned = assignedCategory.toLowerCase();
        filtered = filtered.filter((o) => {
          if (!o.category) return true;
          const oCat = o.category.toLowerCase();
          return oCat.includes(normAssigned) || normAssigned.includes(oCat);
        });
      }
      setWorkOrders(filtered);
    } catch (e) {
      console.warn("Erro ao carregar Ordens de Serviço:", e);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, [assignedCategory]);

  // Set default deadline (e.g. 48h from now)
  useEffect(() => {
    if (!orderDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setOrderDeadline(d.toISOString().split("T")[0]);
    }
  }, []);

  const handleSetDeadlineDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setOrderDeadline(d.toISOString().split("T")[0]);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle.trim()) {
      setErrorMessage("Por favor, informe o título da intervenção.");
      return;
    }
    if (!orderAddress.trim()) {
      setErrorMessage("Por favor, informe a localização/endereço da manutenção.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedOrderNumber = `OS-${categoryCode}-${new Date().getFullYear()}-${randomSuffix}`;
      const newOrderId = "wo_" + Math.random().toString(36).substring(2, 9);

      const newOrder: WorkOrderItem = {
        id: newOrderId,
        order_number: generatedOrderNumber,
        title: orderTitle.trim(),
        category: assignedCategory,
        address: orderAddress.trim(),
        priority: orderPriority,
        deadline: orderDeadline,
        assigned_team: orderTeam.trim() || "Equipe Operacional de Plantão",
        maintenance_type: orderType,
        description: orderDescription.trim(),
        technical_instructions: technicalInstructions.trim(),
        status: "dispatched",
        supervisor_name: user?.name || "Supervisor do Setor",
        supervisor_email: user?.email || "",
        linked_report_id: linkedReportId || undefined,
        created_at: new Date().toISOString(),
      };

      // 1. Save to commuaria_work_orders in local storage
      const existingOrders: WorkOrderItem[] = JSON.parse(
        localStorage.getItem("commuaria_work_orders") || "[]"
      );
      const updatedOrders = [newOrder, ...existingOrders];
      localStorage.setItem("commuaria_work_orders", JSON.stringify(updatedOrders));

      // 2. Also register in commuaria_reports so it shows up in system tracking as dispatched
      const existingReports = JSON.parse(
        localStorage.getItem("commuaria_reports") || "[]"
      );
      const reportRepresentation: ReportItem = {
        id: newOrderId,
        title: `[${generatedOrderNumber}] ${orderTitle.trim()}`,
        description: `Ordem de Serviço emitida pelo setor de ${assignedCategory}.\nEquipe: ${newOrder.assigned_team}\nTipo: ${orderType}\n${orderDescription}`,
        category: assignedCategory,
        address: orderAddress.trim(),
        latitude: -25.5925 + (Math.random() - 0.5) * 0.02,
        longitude: -49.4055 + (Math.random() - 0.5) * 0.02,
        status: "in_progress",
        status_notes: `O.S. ${generatedOrderNumber} despachada para ${newOrder.assigned_team}. Prazo: ${orderDeadline}`,
        created_at: new Date().toISOString(),
        is_work_order: true,
        work_order_number: generatedOrderNumber,
        assigned_team: newOrder.assigned_team,
        priority: orderPriority,
        deadline: orderDeadline,
      };
      localStorage.setItem(
        "commuaria_reports",
        JSON.stringify([reportRepresentation, ...existingReports])
      );

      // 3. Persist to Supabase if connected
      if (supabase) {
        try {
          // A. Insert into dedicated work_orders table
          const { error: woErr } = await supabase.from("work_orders").insert([{
            id: newOrderId,
            order_number: generatedOrderNumber,
            title: orderTitle.trim(),
            category: assignedCategory,
            address: orderAddress.trim(),
            priority: orderPriority,
            deadline: orderDeadline,
            assigned_team: newOrder.assigned_team,
            maintenance_type: orderType,
            description: orderDescription.trim(),
            technical_instructions: technicalInstructions.trim(),
            status: "dispatched",
            status_notes: `O.S. ${generatedOrderNumber} despachada para ${newOrder.assigned_team}.`,
            supervisor_name: user?.name || "Supervisor do Setor",
            supervisor_email: user?.email || "",
            linked_report_id: linkedReportId || null,
          }]);
          if (woErr) {
            console.warn("Supabase work_orders insert notice:", woErr);
          }

          // B. Insert into reports table
          await supabase.from("reports").insert([
            {
              id: newOrderId,
              title: reportRepresentation.title,
              description: reportRepresentation.description,
              category: reportRepresentation.category,
              address: reportRepresentation.address,
              latitude: reportRepresentation.latitude,
              longitude: reportRepresentation.longitude,
              status: "in_progress",
              status_notes: reportRepresentation.status_notes,
              is_work_order: true,
              work_order_number: generatedOrderNumber,
              assigned_team: newOrder.assigned_team,
              priority: orderPriority,
              deadline: orderDeadline,
            },
          ]);
        } catch (dbErr) {
          console.warn("Supabase O.S. insert warning:", dbErr);
        }
      }

      setSuccessMessage(`Ordem de Serviço ${generatedOrderNumber} emitida com sucesso!`);
      // Clear form
      setOrderTitle("");
      setOrderAddress("");
      setOrderTeam("");
      setOrderDescription("");
      setTechnicalInstructions("");
      setLinkedReportId("");
      await loadWorkOrders();

      if (onRefresh) {
        await onRefresh();
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setActiveSubTab("history");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao emitir Ordem de Serviço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: "open" | "dispatched" | "in_progress" | "completed" | "cancelled",
    notes?: string
  ) => {
    try {
      const existingOrders: WorkOrderItem[] = JSON.parse(
        localStorage.getItem("commuaria_work_orders") || "[]"
      );
      const updated = existingOrders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            status_notes: notes || o.status_notes,
            completed_at:
              newStatus === "completed" ? new Date().toISOString() : o.completed_at,
          };
        }
        return o;
      });
      localStorage.setItem("commuaria_work_orders", JSON.stringify(updated));

      // Also update system reports
      const existingReports = JSON.parse(
        localStorage.getItem("commuaria_reports") || "[]"
      );
      const updatedReports = existingReports.map((r: any) => {
        if (r.id === orderId) {
          return {
            ...r,
            status: newStatus === "completed" ? "resolved" : "in_progress",
            status_notes: notes || `O.S. atualizada para ${newStatus}.`,
            resolved_at:
              newStatus === "completed" ? new Date().toISOString() : r.resolved_at,
          };
        }
        return r;
      });
      localStorage.setItem(
        "commuaria_reports",
        JSON.stringify(updatedReports)
      );

      // Sync with Supabase
      if (supabase) {
        try {
          await supabase
            .from("work_orders")
            .update({
              status: newStatus,
              status_notes: notes,
              completed_at: newStatus === "completed" ? new Date().toISOString() : null,
            })
            .eq("id", orderId);

          await supabase
            .from("reports")
            .update({
              status: newStatus === "completed" ? "resolved" : "in_progress",
              status_notes: notes || `O.S. atualizada para ${newStatus}.`,
              resolved_at: newStatus === "completed" ? new Date().toISOString() : null,
            })
            .eq("id", orderId);
        } catch (dbErr) {
          console.warn("Supabase update error:", dbErr);
        }
      }

      await loadWorkOrders();
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail((prev) =>
          prev ? { ...prev, status: newStatus, status_notes: notes || prev.status_notes } : null
        );
      }
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.warn("Erro ao atualizar status da O.S.:", e);
    }
  };

  const handleCopyProtocol = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    setCopiedId(orderNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  // All sector citizen reports (excluding work orders themselves)
  const sectorCitizenReports = reports.filter((r) => {
    if (r.is_work_order) return false;
    const rSector = normalizeSector(r.category || r.title);
    return !rSector || rSector === currentSectorNormalized || !currentSectorNormalized;
  });

  // Pending sector citizen reports for linking / action
  const pendingSectorReports = sectorCitizenReports.filter(
    (r) => r.status !== "resolved"
  );

  // Filtered orders for history tab
  const filteredOrders = workOrders.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.order_number.toLowerCase().includes(q) ||
      order.title.toLowerCase().includes(q) ||
      order.address.toLowerCase().includes(q) ||
      order.assigned_team.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return {
          label: "Emergencial (24h)",
          bg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
        };
      case "high":
        return {
          label: "Alta Prioridade (48h)",
          bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
        };
      case "medium":
        return {
          label: "Média (Padrão)",
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
      default:
        return {
          label: "Baixa / Rotina",
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return {
          label: "Concluída",
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "in_progress":
        return {
          label: "Em Execução",
          bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
          icon: Wrench,
        };
      case "dispatched":
        return {
          label: "Equipe em Campo",
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
          icon: Truck,
        };
      case "cancelled":
        return {
          label: "Cancelada",
          bg: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-300 border-neutral-500/30",
          icon: X,
        };
      default:
        return {
          label: "Aberta",
          bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
          icon: Clock,
        };
    }
  };

  return (
    <div
      className={`min-h-full w-full pb-32 font-sans transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-30 px-6 py-5 border-b backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? "bg-[#5A635C]/90 border-white/10"
            : "bg-white/90 border-black/10"
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${
                catConfig
                  ? `${catConfig.bgLight} ${catConfig.borderLight} dark:${catConfig.bgDark} dark:${catConfig.borderDark}`
                  : isDark
                  ? "bg-white/10 border-white/20"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <Wrench
                size={20}
                className={
                  catConfig
                    ? `${catConfig.textLight} dark:${catConfig.textDark}`
                    : isDark
                    ? "text-emerald-400"
                    : "text-emerald-700"
                }
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-lg sm:text-xl font-serif font-bold tracking-tight ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  Ordens de Serviço (O.S.)
                </h1>
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide shadow-sm">
                  SUPERVISOR
                </span>
              </div>
              <p
                className={`text-xs ${
                  isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                }`}
              >
                Setor:{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {assignedCategory}
                </span>{" "}
                • Despacho técnico & gestão de campo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadWorkOrders}
              title="Atualizar dados"
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  : "bg-black/5 border-black/10 text-[#2d4a3b]/70 hover:bg-black/10 hover:text-[#183a2b]"
              }`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="max-w-4xl mx-auto mt-4 flex gap-2">
          <button
            onClick={() => setActiveSubTab("citizen_reports")}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition-all ${
              activeSubTab === "citizen_reports"
                ? isDark
                  ? "bg-white/20 border-white/30 text-white shadow-md"
                  : "bg-[#183a2b] border-[#183a2b] text-white shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                : "bg-black/5 border-black/10 text-[#2d4a3b]/70 hover:bg-black/10"
            }`}
          >
            <AlertTriangle size={15} className="text-amber-500" />
            <span>Chamados da População ({sectorCitizenReports.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("new_order")}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition-all ${
              activeSubTab === "new_order"
                ? isDark
                  ? "bg-white/20 border-white/30 text-white shadow-md"
                  : "bg-[#183a2b] border-[#183a2b] text-white shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                : "bg-black/5 border-black/10 text-[#2d4a3b]/70 hover:bg-black/10"
            }`}
          >
            <Plus size={15} />
            <span>Emitir Nova O.S.</span>
          </button>

          <button
            onClick={() => setActiveSubTab("history")}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-center gap-2 transition-all ${
              activeSubTab === "history"
                ? isDark
                  ? "bg-white/20 border-white/30 text-white shadow-md"
                  : "bg-[#183a2b] border-[#183a2b] text-white shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                : "bg-black/5 border-black/10 text-[#2d4a3b]/70 hover:bg-black/10"
            }`}
          >
            <FileText size={15} />
            <span>Ordens Emitidas ({workOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Banner with Sector Stats */}
        <div
          className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDark
              ? "bg-white/5 border-white/10"
              : "bg-emerald-50/60 border-emerald-200/60"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <HardHat size={24} className="text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Canal Oficial de Engenharia & Manutenção
              </span>
              <h2
                className={`text-base font-bold ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Supervisão de {assignedCategory}
              </h2>
              <p
                className={`text-xs ${
                  isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                }`}
              >
                Atenda ocorrências relatadas pelos moradores e emita ordens de serviço diretas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-3.5 py-2 rounded-2xl border text-center ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-emerald-200"
              }`}
            >
              <div className="text-lg font-bold text-amber-500">
                {pendingSectorReports.length}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Chamados Abertos
              </div>
            </div>
            <div
              className={`px-3.5 py-2 rounded-2xl border text-center ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-emerald-200"
              }`}
            >
              <div className="text-lg font-bold text-blue-500">
                {workOrders.filter((w) => w.status === "dispatched" || w.status === "in_progress").length}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                O.S. em Campo
              </div>
            </div>
            <div
              className={`px-3.5 py-2 rounded-2xl border text-center ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-emerald-200"
              }`}
            >
              <div className="text-lg font-bold text-emerald-500">
                {workOrders.filter((w) => w.status === "completed").length}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Concluídas
              </div>
            </div>
          </div>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0 text-red-500" />
            {errorMessage}
          </div>
        )}

        {/* TAB 0: CHAMADOS DA POPULAÇÃO DO SETOR */}
        {activeSubTab === "citizen_reports" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b">
              <div>
                <h3
                  className={`text-base font-bold font-serif ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  Chamados da População ({sectorCitizenReports.length})
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                  }`}
                >
                  Reclamações e solicitações enviadas pelos cidadãos de Araucária para o setor de {assignedCategory}.
                </p>
              </div>

              {pendingSectorReports.length > 0 && (
                <button
                  onClick={() => {
                    const firstPending = pendingSectorReports[0];
                    setLinkedReportId(firstPending.id);
                    setOrderTitle(firstPending.title);
                    setOrderAddress(firstPending.address);
                    setOrderDescription(firstPending.description);
                    setActiveSubTab("new_order");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  Despachar Chamado Pendente
                </button>
              )}
            </div>

            {sectorCitizenReports.length === 0 ? (
              <div
                className={`text-center py-12 px-6 rounded-3xl border ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white/70"
                    : "bg-black/5 border-black/10 text-[#183a2b]"
                }`}
              >
                <AlertTriangle size={36} className="mx-auto mb-2.5 opacity-40 text-amber-500" />
                <p className="text-sm font-bold">Nenhum chamado da população registrado para este setor</p>
                <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto">
                  Assim que os cidadãos abrirem novos chamados de {assignedCategory}, eles aparecerão listados aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectorCitizenReports.map((report) => {
                  const isResolved = report.status === "resolved";
                  const isInProgress = report.status === "in_progress" || report.status === "in_analysis";

                  return (
                    <div
                      key={report.id}
                      className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between gap-3 transition-all ${
                        isDark
                          ? "bg-white/5 border-white/10 hover:border-white/20"
                          : "bg-white border-black/10 hover:border-emerald-600/30"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isResolved
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : isInProgress
                                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse"
                            }`}
                          >
                            {isResolved ? "Concluído" : isInProgress ? "Em Atendimento" : "Aguardando Vistoria"}
                          </span>

                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(report.created_at || Date.now()).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        {report.image_url && (
                          <div className="w-full h-36 rounded-2xl overflow-hidden bg-black/10 relative">
                            <img
                              src={report.image_url}
                              alt={report.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        <div>
                          <h4
                            className={`font-bold text-sm leading-snug ${
                              isDark ? "text-white" : "text-[#183a2b]"
                            }`}
                          >
                            {report.title}
                          </h4>
                          <p
                            className={`text-xs mt-1 line-clamp-2 ${
                              isDark ? "text-white/70" : "text-[#2d4a3b]"
                            }`}
                          >
                            {report.description || report.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <MapPin size={13} className="text-red-500 shrink-0" />
                          <span className="truncate">{report.address || "Araucária"}</span>
                        </div>

                        {report.status_notes && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200">
                            <span className="font-bold">Nota Técnica: </span>
                            <span>{report.status_notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-2">
                        {/* Dispatch Button */}
                        <button
                          onClick={() => {
                            setLinkedReportId(report.id);
                            setOrderTitle(report.title);
                            setOrderAddress(report.address);
                            setOrderDescription(report.description);
                            setActiveSubTab("new_order");
                          }}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Wrench size={13} />
                          Gerar O.S.
                        </button>

                        {/* View details */}
                        {onViewReportDetails && (
                          <button
                            onClick={() => onViewReportDetails(report)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                              isDark
                                ? "bg-white/5 border-white/15 text-white hover:bg-white/10"
                                : "bg-neutral-100 border-neutral-300 text-[#183a2b] hover:bg-neutral-200"
                            }`}
                          >
                            Ver Detalhes
                          </button>
                        )}

                        {/* Quick Status update */}
                        {onUpdateReportStatus && !isResolved && (
                          <button
                            onClick={() =>
                              onUpdateReportStatus(
                                report.id,
                                "resolved",
                                `Atendido e vistoriado pela Supervisão de ${assignedCategory}.`
                              )
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-colors"
                            title="Marcar chamado como concluído"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: FORM DE NOVA O.S. */}
        {activeSubTab === "new_order" && (
          <form
            onSubmit={handleCreateWorkOrder}
            className={`p-6 sm:p-8 rounded-3xl border shadow-md space-y-6 ${
              isDark ? "bg-white/5 border-white/10" : "bg-white border-black/10"
            }`}
          >
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <h3
                  className={`text-base font-bold font-serif ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  Formulário de Despacho Técnico
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                  }`}
                >
                  Preencha os dados da intervenção operacional para envio à equipe técnica.
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                PROT: OS-{categoryCode}-{new Date().getFullYear()}-AUTO
              </span>
            </div>

            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Título da Manutenção / Intervenção *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operação Tapa-buraco e nivelamento asfáltico"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Tipo de Manutenção
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? "bg-[#424943] border-white/15 text-white"
                      : "bg-white border-black/15 text-[#183a2b]"
                  }`}
                >
                  <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                  <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                  <option value="Recapeamento / Asfalto">Recapeamento / Asfalto</option>
                  <option value="Substituição / Troca">Substituição / Troca</option>
                  <option value="Vistoria Técnica">Vistoria Técnica</option>
                  <option value="Emergência Pluvial/Vias">Emergência</option>
                </select>
              </div>
            </div>

            {/* Address & Neighborhood */}
            <div className="space-y-1.5">
              <label
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isDark ? "text-white/80" : "text-[#183a2b]"
                }`}
              >
                <MapPin size={14} className="text-emerald-500" />
                Localização / Endereço Completo em Araucária *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Rua Presidente Carlos Cavalcanti, nº 450 - Centro (próximo à praça)"
                value={orderAddress}
                onChange={(e) => setOrderAddress(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  isDark
                    ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                    : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                }`}
              />
            </div>

            {/* Priority & Deadline & Team */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Priority */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Prioridade Operacional
                </label>
                <select
                  value={orderPriority}
                  onChange={(e) =>
                    setOrderPriority(
                      e.target.value as "low" | "medium" | "high" | "emergency"
                    )
                  }
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? "bg-[#424943] border-white/15 text-white"
                      : "bg-white border-black/15 text-[#183a2b]"
                  }`}
                >
                  <option value="low">Baixa (Rotina)</option>
                  <option value="medium">Média (Até 5 dias)</option>
                  <option value="high">Alta (Prioritário - 48h)</option>
                  <option value="emergency">Emergencial (24h)</option>
                </select>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold flex items-center justify-between ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  <span>Prazo Limite</span>
                  <span className="text-[10px] font-normal text-emerald-500">
                    <button
                      type="button"
                      onClick={() => handleSetDeadlineDays(2)}
                      className="underline mr-1 hover:text-emerald-400"
                    >
                      48h
                    </button>
                    |
                    <button
                      type="button"
                      onClick={() => handleSetDeadlineDays(7)}
                      className="underline ml-1 hover:text-emerald-400"
                    >
                      7d
                    </button>
                  </span>
                </label>
                <input
                  type="date"
                  value={orderDeadline}
                  onChange={(e) => setOrderDeadline(e.target.value)}
                  className={`w-full px-4 py-2 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? "bg-[#424943] border-white/15 text-white"
                      : "bg-white border-black/15 text-[#183a2b]"
                  }`}
                />
              </div>

              {/* Team */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Equipe / Veículo Designado
                </label>
                <input
                  type="text"
                  placeholder="Ex: Equipe Alfa - Caminhão 02"
                  value={orderTeam}
                  onChange={(e) => setOrderTeam(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                  }`}
                />
              </div>
            </div>

            {/* Link with Citizen Report */}
            {pendingSectorReports.length > 0 && (
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark
                    ? "bg-white/5 border-white/10"
                    : "bg-emerald-50/40 border-emerald-200/50"
                }`}
              >
                <label
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isDark ? "text-white/90" : "text-[#183a2b]"
                  }`}
                >
                  <Layers size={14} className="text-emerald-500" />
                  Vincular a um Chamado Aberto da População (Opcional)
                </label>
                <select
                  value={linkedReportId}
                  onChange={(e) => {
                    setLinkedReportId(e.target.value);
                    const selected = pendingSectorReports.find(
                      (r) => r.id === e.target.value
                    );
                    if (selected) {
                      if (!orderTitle) setOrderTitle(selected.title);
                      if (!orderAddress) setOrderAddress(selected.address);
                      if (!orderDescription) setOrderDescription(selected.description);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-[#424943] border-white/15 text-white"
                      : "bg-white border-black/15 text-[#183a2b]"
                  }`}
                >
                  <option value="">-- Nenhum chamado vinculado (O.S. Independente) --</option>
                  {pendingSectorReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} - {r.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description & Technical Instructions */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Descrição do Problema & Diagnóstico Preliminar
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva as condições encontradas no local..."
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold ${
                    isDark ? "text-white/80" : "text-[#183a2b]"
                  }`}
                >
                  Instruções Técnicas para a Equipe de Campo
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Utilizar massa asfáltica quente CBUQ, compactar bordas com rolo e sinalizar cone na via esquerda..."
                  value={technicalInstructions}
                  onChange={(e) => setTechnicalInstructions(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                  }`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Emitindo e Despachando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Emitir Ordem de Serviço
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: HISTÓRICO DE O.S. DO SETOR */}
        {activeSubTab === "history" && (
          <div className="space-y-4">
            {/* Search & Status Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search
                  size={16}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-white/40" : "text-black/40"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Buscar por O.S., rua, equipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-2xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white placeholder-white/40"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-black/40"
                  }`}
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "Todas" },
                  { id: "dispatched", label: "Em Campo" },
                  { id: "in_progress", label: "Em Execução" },
                  { id: "completed", label: "Concluídas" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      statusFilter === st.id
                        ? isDark
                          ? "bg-white/20 border-white/30 text-white shadow-sm"
                          : "bg-[#183a2b] border-[#183a2b] text-white shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        : "bg-black/5 border-black/10 text-[#2d4a3b]/70 hover:bg-black/10"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Cards List */}
            {filteredOrders.length === 0 ? (
              <div
                className={`p-12 text-center rounded-3xl border ${
                  isDark
                    ? "bg-white/5 border-white/10"
                    : "bg-black/5 border-black/10"
                }`}
              >
                <FileText
                  size={40}
                  className={`mx-auto mb-3 opacity-40 ${
                    isDark ? "text-white" : "text-black"
                  }`}
                />
                <h4
                  className={`text-sm font-bold ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  Nenhuma Ordem de Serviço encontrada
                </h4>
                <p
                  className={`text-xs mt-1 max-w-sm mx-auto ${
                    isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                  }`}
                >
                  Clique na aba "Emitir Nova O.S." para gerar despachos operacionais para as equipes de campo.
                </p>
                <button
                  onClick={() => setActiveSubTab("new_order")}
                  className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Emitir Primeira O.S.
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredOrders.map((order) => {
                  const priority = getPriorityBadge(order.priority);
                  const status = getStatusBadge(order.status);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={order.id}
                      className={`p-5 rounded-3xl border shadow-sm transition-all hover:shadow-md ${
                        isDark
                          ? "bg-white/5 border-white/10 hover:border-white/20"
                          : "bg-white border-black/10 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                              {order.order_number}
                              <button
                                onClick={() => handleCopyProtocol(order.order_number)}
                                title="Copiar protocolo"
                                className="hover:text-emerald-900 dark:hover:text-white"
                              >
                                {copiedId === order.order_number ? (
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priority.bg}`}
                            >
                              {priority.label}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${status.bg}`}
                            >
                              <StatusIcon size={12} />
                              {status.label}
                            </span>
                          </div>

                          <h3
                            className={`text-sm sm:text-base font-bold ${
                              isDark ? "text-white" : "text-[#183a2b]"
                            }`}
                          >
                            {order.title}
                          </h3>

                          <div
                            className={`text-xs flex items-center gap-1.5 ${
                              isDark ? "text-white/70" : "text-[#2d4a3b]/80"
                            }`}
                          >
                            <MapPin size={13} className="text-emerald-500 shrink-0" />
                            <span>{order.address}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1 text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Truck size={13} />
                              <span>{order.assigned_team}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={13} />
                              <span>Prazo: {order.deadline || "Não informado"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                          <button
                            onClick={() => setSelectedOrderDetail(order)}
                            className={`w-full px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                              isDark
                                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                : "bg-neutral-100 border-neutral-300 text-[#183a2b] hover:bg-neutral-200"
                            }`}
                          >
                            <FileText size={13} />
                            Ficha O.S.
                          </button>

                          {order.status !== "completed" && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(
                                  order.id,
                                  "completed",
                                  "Serviço concluído e vistoriado pela equipe de campo."
                                )
                              }
                              className="w-full px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                              <CheckCircle2 size={13} />
                              Concluir O.S.
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETALHE DA O.S. / PROTOCOLO TÉCNICO */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto ${
              isDark ? "bg-[#484e49] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Wrench size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedOrderDetail.order_number}
                  </span>
                  <h3 className="text-base font-serif font-bold">Ficha de Ordem de Serviço</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1">
                <div className="font-bold text-sm">{selectedOrderDetail.title}</div>
                <div className="text-neutral-500 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-500" />
                  {selectedOrderDetail.address}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl border border-black/10 dark:border-white/10">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Setor</span>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedOrderDetail.category}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-black/10 dark:border-white/10">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Tipo</span>
                  <div className="font-semibold">{selectedOrderDetail.maintenance_type}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-black/10 dark:border-white/10">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Equipe</span>
                  <div className="font-semibold">{selectedOrderDetail.assigned_team}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-black/10 dark:border-white/10">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Prazo</span>
                  <div className="font-semibold">{selectedOrderDetail.deadline}</div>
                </div>
              </div>

              {selectedOrderDetail.description && (
                <div>
                  <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">
                    Diagnóstico
                  </span>
                  <p className="p-3 rounded-xl bg-black/5 dark:bg-white/5 mt-1">
                    {selectedOrderDetail.description}
                  </p>
                </div>
              )}

              {selectedOrderDetail.technical_instructions && (
                <div>
                  <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">
                    Instruções Técnicas de Campo
                  </span>
                  <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 mt-1">
                    {selectedOrderDetail.technical_instructions}
                  </p>
                </div>
              )}

              {/* Status Update Quick Select */}
              <div className="pt-2 border-t space-y-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">
                  Alterar Status Operacional
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(selectedOrderDetail.id, "dispatched")
                    }
                    className="p-2 rounded-xl border text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                  >
                    Equipe em Campo
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(selectedOrderDetail.id, "in_progress")
                    }
                    className="p-2 rounded-xl border text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                  >
                    Em Execução
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateOrderStatus(selectedOrderDetail.id, "completed")
                    }
                    className="p-2 rounded-xl border text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  >
                    Concluída
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <button
                onClick={() => handleCopyProtocol(selectedOrderDetail.order_number)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Copy size={14} />
                Copiar Protocolo
              </button>

              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
