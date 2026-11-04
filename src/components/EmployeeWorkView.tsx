import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Camera,
  FileText,
  AlertCircle,
  Play,
  Check,
  X,
  RefreshCw,
  HardHat,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { WorkOrderItem, ReportItem, UserProfile } from "../types";
import { supabase } from "../lib/supabase";
import { updateWorkOrderStatusUnified } from "../lib/workOrderService";

interface EmployeeWorkViewProps {
  user: UserProfile;
  category?: string;
  onRefresh?: () => Promise<void> | void;
  onUpdateWorkOrder?: (
    orderId: string,
    status: "in_progress" | "completed" | "impossible",
    notes?: string,
    photoUrl?: string
  ) => Promise<void>;
}

export const EmployeeWorkView: React.FC<EmployeeWorkViewProps> = ({
  user,
  category,
  onRefresh,
  onUpdateWorkOrder,
}) => {
  const { isDark } = useTheme();
  const assignedSector = category || user.assigned_category || "Pavimentação";

  const [activeTab, setActiveTab] = useState<"pending" | "in_progress" | "completed">("pending");
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals for completing or reporting impossibility
  const [completeModalWo, setCompleteModalWo] = useState<WorkOrderItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [impossibleModalWo, setImpossibleModalWo] = useState<WorkOrderItem | null>(null);
  const [impossibleReason, setImpossibleReason] = useState("Condições climáticas desfavoráveis (chuva/vento forte)");
  const [impossibleNotes, setImpossibleNotes] = useState("");

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      let supaWos: WorkOrderItem[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("work_orders")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            supaWos = data;
          }
        } catch (e) {
          console.warn("Aviso ao buscar O.S. no Supabase:", e);
        }
      }

      // Local storage merge
      let localWos: WorkOrderItem[] = [];
      try {
        const stored = localStorage.getItem("commuaria_work_orders");
        if (stored) localWos = JSON.parse(stored);
      } catch (_) {}

      const map = new Map<string, WorkOrderItem>();
      supaWos.forEach((w) => map.set(w.id || w.order_number, w));
      localWos.forEach((w) => map.set(w.id || w.order_number, w));

      setWorkOrders(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const handleManualRefresh = async () => {
    await loadWorkOrders();
    if (onRefresh) await onRefresh();
  };

  // Filter orders assigned to this employee or matching their sector
  const myWorkOrders = useMemo(() => {
    const cleanEmail = (user.email || "").toLowerCase().trim();
    const cleanId = user.id || "";
    const cleanName = (user.name || "").toLowerCase().trim();

    return workOrders.filter((wo) => {
      // Direct assignment check
      const matchEmpId = wo.assigned_employee_id && (wo.assigned_employee_id === cleanId);
      const matchEmpName = wo.assigned_employee_name && cleanName && wo.assigned_employee_name.toLowerCase().includes(cleanName);
      const matchTeam = wo.assigned_team && cleanName && wo.assigned_team.toLowerCase().includes(cleanName);

      if (matchEmpId || matchEmpName || matchTeam) return true;

      // If not directly assigned to someone else and matches sector, employee can view and pick it up
      const sectorNorm = (wo.category || "").toLowerCase();
      const mySectorNorm = (assignedSector || "").toLowerCase();
      const isSectorMatch = sectorNorm.includes(mySectorNorm.substring(0, 4));

      return isSectorMatch;
    });
  }, [workOrders, user, assignedSector]);

  // Split into tabs
  const pendingOrders = useMemo(
    () => myWorkOrders.filter((w) => w.status === "open" || w.status === "dispatched"),
    [myWorkOrders]
  );
  const inProgressOrders = useMemo(
    () => myWorkOrders.filter((w) => w.status === "in_progress"),
    [myWorkOrders]
  );
  const completedOrders = useMemo(
    () => myWorkOrders.filter((w) => w.status === "completed" || w.status === "impossible"),
    [myWorkOrders]
  );

  // Handle Start Task
  // Handle Start Task
  const handleStartTask = async (wo: WorkOrderItem) => {
    setIsSubmitting(true);
    try {
      await updateWorkOrderStatusUnified({
        workOrder: wo,
        newStatus: "in_progress",
        agentUser: user,
        message: `Atendimento iniciado em campo pelo técnico ${user.name || "Técnico"} às ${new Date().toLocaleTimeString("pt-BR")}.`,
      });

      setActionSuccess(`O.S. ${wo.order_number} iniciada com sucesso! Bom trabalho em campo.`);
      await loadWorkOrders();
      if (onRefresh) await onRefresh();
      setActiveTab("in_progress");
    } catch (err: any) {
      console.error("Erro ao iniciar O.S.:", err);
      setActionSuccess(`O.S. ${wo.order_number} iniciada no dispositivo.`);
      await loadWorkOrders();
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Handle Complete Task
  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalWo) return;
    if (!completionNotes.trim()) {
      alert("Por favor, detalhe o serviço técnico executado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalNotes = completionNotes.trim();
      await updateWorkOrderStatusUnified({
        workOrder: completeModalWo,
        newStatus: "completed",
        agentUser: user,
        message: finalNotes,
        photoUrl: completionPhoto,
      });

      setActionSuccess(`O.S. ${completeModalWo.order_number} registrada como Concluída!`);
      setCompleteModalWo(null);
      setCompletionNotes("");
      setCompletionPhoto(null);
      await loadWorkOrders();
      if (onRefresh) await onRefresh();
      setActiveTab("completed");
    } catch (err: any) {
      console.error("Erro ao concluir O.S.:", err);
      setActionSuccess(`O.S. ${completeModalWo.order_number} concluída localmente.`);
      setCompleteModalWo(null);
      await loadWorkOrders();
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Handle Report Impossibility
  const handleConfirmImpossibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impossibleModalWo) return;

    setIsSubmitting(true);
    try {
      const fullReason = `Impedimento técnico: ${impossibleReason}. Detalhes: ${impossibleNotes.trim() || "Nenhum detalhe adicional informado."}`;
      await updateWorkOrderStatusUnified({
        workOrder: impossibleModalWo,
        newStatus: "impossible",
        agentUser: user,
        message: fullReason,
        reason: impossibleReason,
      });

      setActionSuccess(`Impedimento registrado na O.S. ${impossibleModalWo.order_number}. Supervisor alertado.`);
      setImpossibleModalWo(null);
      setImpossibleNotes("");
      await loadWorkOrders();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Erro ao registrar impedimento:", err);
      setActionSuccess(`Impedimento registrado para a O.S. ${impossibleModalWo.order_number}.`);
      setImpossibleModalWo(null);
      await loadWorkOrders();
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCompletionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-sm">
                <Wrench size={20} />
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
                  Setor: {assignedSector} · {user.name || "Funcionário de Campo"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                  : "bg-zinc-50 hover:bg-zinc-100 border-black/10 text-[#183a2b]"
              }`}
              title="Atualizar tarefas"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
        {/* Success Alert */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 rounded-2xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 shadow-md font-bold"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{actionSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-cyan-600 text-white shadow-sm font-extrabold"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-[#183a2b] hover:bg-black/5"
            }`}
          >
            <span>A Iniciar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {pendingOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "in_progress"
                ? "bg-amber-500 text-zinc-950 shadow-sm font-extrabold"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-[#183a2b] hover:bg-black/5"
            }`}
          >
            <span>Em Execução</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {inProgressOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-[#183a2b] hover:bg-black/5"
            }`}
          >
            <span>Histórico</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* Task Cards Stream */}
        <div className="space-y-3">
          {activeTab === "pending" && (
            <>
              {pendingOrders.length === 0 ? (
                <div
                  className={`p-10 text-center rounded-3xl border ${
                    isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                  }`}
                >
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  <h4 className="font-bold text-sm">Sem ordens de serviço pendentes</h4>
                  <p className="text-xs opacity-70 mt-1">
                    Todas as tarefas atribuídas ao seu setor foram iniciadas ou atendidas.
                  </p>
                </div>
              ) : (
                pendingOrders.map((wo) => (
                  <div
                    key={wo.id || wo.order_number}
                    className={`p-5 rounded-3xl border transition-all ${
                      isDark ? "bg-white/5 border-white/10" : "bg-white border-black/10 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                        {wo.order_number}
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Prazo: {wo.deadline || "Hoje"}
                      </span>
                    </div>

                    <h4 className="font-bold text-base font-serif mb-1">{wo.title}</h4>

                    <div className="flex items-center gap-1.5 text-xs opacity-75 mb-3">
                      <MapPin size={13} className="text-emerald-500 shrink-0" />
                      <span>{wo.address}</span>
                    </div>

                    {wo.technical_instructions && (
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs mb-3 space-y-1">
                        <span className="font-bold text-cyan-800 dark:text-cyan-300 block">
                          Instruções do Supervisor:
                        </span>
                        <p>{wo.technical_instructions}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                      <span className="text-[11px] opacity-60">
                        Prioridade: <strong className="uppercase">{wo.priority}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartTask(wo)}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Play size={13} />
                        <span>Iniciar Atendimento</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "in_progress" && (
            <>
              {inProgressOrders.length === 0 ? (
                <div
                  className={`p-10 text-center rounded-3xl border ${
                    isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                  }`}
                >
                  <Clock size={32} className="mx-auto mb-2 opacity-40" />
                  <h4 className="font-bold text-sm">Nenhum atendimento em andamento no momento</h4>
                  <p className="text-xs opacity-70 mt-1">
                    Vá na aba "A Iniciar" para selecionar a próxima ordem de serviço do setor.
                  </p>
                </div>
              ) : (
                inProgressOrders.map((wo) => (
                  <div
                    key={wo.id || wo.order_number}
                    className={`p-5 rounded-3xl border transition-all ${
                      isDark ? "bg-amber-950/20 border-amber-500/30" : "bg-amber-50/60 border-amber-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {wo.order_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950 flex items-center gap-1">
                        <Clock size={10} /> Em Execução
                      </span>
                    </div>

                    <h4 className="font-bold text-base font-serif mb-1">{wo.title}</h4>

                    <div className="flex items-center gap-1.5 text-xs opacity-75 mb-3">
                      <MapPin size={13} className="text-emerald-500 shrink-0" />
                      <span>{wo.address}</span>
                    </div>

                    {wo.technical_instructions && (
                      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs mb-3 space-y-1">
                        <span className="font-bold opacity-70 block">Instruções Técnicas:</span>
                        <p>{wo.technical_instructions}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setImpossibleModalWo(wo)}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle size={13} />
                        <span>Relatar Impossibilidade</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompleteModalWo(wo)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <CheckCircle2 size={13} />
                        <span>Registrar Conclusão</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "completed" && (
            <>
              {completedOrders.length === 0 ? (
                <div
                  className={`p-10 text-center rounded-3xl border ${
                    isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10"
                  }`}
                >
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <h4 className="font-bold text-sm">Histórico de atendimentos vazio</h4>
                  <p className="text-xs opacity-70 mt-1">
                    Os atendimentos finalizados ou justificados aparecerão arquivados aqui.
                  </p>
                </div>
              ) : (
                completedOrders.map((wo) => {
                  const isDone = wo.status === "completed";
                  return (
                    <div
                      key={wo.id || wo.order_number}
                      className={`p-4 rounded-3xl border opacity-90 transition-all ${
                        isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-black/10 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold opacity-75">
                          {wo.order_number}
                        </span>
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Concluída
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle size={10} /> Impedimento
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm font-serif mb-1">{wo.title}</h4>
                      <p className="text-xs opacity-75 truncate mb-2">{wo.address}</p>

                      {wo.resolution_notes && (
                        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs">
                          <span className="block font-bold text-[10px] opacity-70">Relato do Serviço:</span>
                          <p className="opacity-90">{wo.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </main>

      {/* Completion Modal */}
      <AnimatePresence>
        {completeModalWo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
                isDark ? "bg-[#3d443e] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-serif">Concluir Atendimento</h3>
                    <span className="font-mono text-xs opacity-75">{completeModalWo.order_number}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompleteModalWo(null)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmCompletion} className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1">
                    Relatório Técnico do Reparo Executado:
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ex: Equipe realizou fresagem e aplicação de 2 toneladas de CBUQ. Meio-fio pintado e via liberada ao tráfego."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    Foto Comprobatória do Serviço (Opcional):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className={`w-full p-2 rounded-xl border text-xs ${
                      isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                    }`}
                  />
                  {completionPhoto && (
                    <div className="mt-2 rounded-xl overflow-hidden max-h-32 border">
                      <img src={completionPhoto} alt="Comprovação" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompleteModalWo(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      isDark ? "bg-white/10 hover:bg-white/15" : "bg-zinc-100 hover:bg-zinc-200"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Finalizar O.S.</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Impossibility Modal */}
      <AnimatePresence>
        {impossibleModalWo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
                isDark ? "bg-[#3d443e] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-serif">Relatar Impossibilidade Técnica</h3>
                    <span className="font-mono text-xs opacity-75">{impossibleModalWo.order_number}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImpossibleModalWo(null)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmImpossibility} className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1">Motivo do Impedimento:</label>
                  <select
                    value={impossibleReason}
                    onChange={(e) => setImpossibleReason(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none font-medium ${
                      isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                    }`}
                  >
                    <option value="Condições climáticas desfavoráveis (chuva/vento forte)">
                      Condições climáticas desfavoráveis (chuva/vento forte)
                    </option>
                    <option value="Falta de insumos / materiais específicos de reparo">
                      Falta de insumos / materiais específicos de reparo
                    </option>
                    <option value="Obstrução física por veículos estacionados ou obras particulares">
                      Obstrução física por veículos estacionados ou obras particulares
                    </option>
                    <option value="Risco grave de segurança à equipe (rede de alta tensão / desabamento)">
                      Risco grave de segurança à equipe (rede de alta tensão / desabamento)
                    </option>
                    <option value="Localização divergente do relato original do cidadão">
                      Localização divergente do relato original do cidadão
                    </option>
                    <option value="Demanda requer maquinário pesado indisponível no momento">
                      Demanda requer maquinário pesado indisponível no momento
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Observações Técnicas Complementares:</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o que a equipe constatou ao chegar ao local para instruir o supervisor..."
                    value={impossibleNotes}
                    onChange={(e) => setImpossibleNotes(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setImpossibleModalWo(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      isDark ? "bg-white/10 hover:bg-white/15" : "bg-zinc-100 hover:bg-zinc-200"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                    <span>Registrar Impedimento</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
