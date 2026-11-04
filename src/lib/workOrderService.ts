import { supabase, generateUUID, isUUID } from "./supabase";
import {
  WorkOrderItem,
  WorkOrderHistoryItem,
  WorkOrderActionType,
  UserProfile,
  ReportItem,
} from "../types";
import {
  notifyReportInProgress,
  notifyReportResolved,
  notifyReportCancelled,
  notifyReportUpdated,
} from "./notificationService";

// Key for deduplicating notifications
const hasNotificationBeenSent = (key: string): boolean => {
  try {
    const sent = JSON.parse(localStorage.getItem("commuaria_sent_notifications") || "[]");
    return sent.includes(key);
  } catch {
    return false;
  }
};

const markNotificationAsSent = (key: string): void => {
  try {
    const sent = JSON.parse(localStorage.getItem("commuaria_sent_notifications") || "[]");
    if (!sent.includes(key)) {
      sent.push(key);
      localStorage.setItem("commuaria_sent_notifications", JSON.stringify(sent.slice(-100)));
    }
  } catch (e) {
    console.warn("Aviso ao salvar notificação enviada:", e);
  }
};

/**
 * Registra um evento imutável no histórico da Ordem de Serviço (Supabase + LocalStorage)
 */
export const recordWorkOrderHistoryEvent = async (params: {
  workOrderId: string;
  userId?: string | null;
  userName: string;
  userRole: any;
  actionType: WorkOrderActionType;
  previousStatus?: string | null;
  newStatus: string;
  message: string;
  photoUrl?: string | null;
}): Promise<WorkOrderHistoryItem> => {
  const historyId = "woh_" + Math.random().toString(36).substring(2, 9);
  const nowIso = new Date().toISOString();

  const historyItem: WorkOrderHistoryItem = {
    id: historyId,
    work_order_id: params.workOrderId,
    user_id: params.userId || null,
    user_name: params.userName || "Agente Municipal",
    user_role: params.userRole || "funcionario",
    action_type: params.actionType,
    previous_status: params.previousStatus || null,
    new_status: params.newStatus,
    message: params.message || "",
    photo_url: params.photoUrl || null,
    created_at: nowIso,
  };

  // 1. LocalStorage
  try {
    const localHistory: WorkOrderHistoryItem[] = JSON.parse(
      localStorage.getItem("commuaria_work_order_history") || "[]"
    );
    localHistory.unshift(historyItem);
    localStorage.setItem("commuaria_work_order_history", JSON.stringify(localHistory));
  } catch (e) {
    console.warn("Erro ao salvar histórico localmente:", e);
  }

  // 2. Supabase
  if (supabase) {
    try {
      const payload: any = {
        id: historyId,
        work_order_id: params.workOrderId,
        user_id: isUUID(params.userId || "") ? params.userId : null,
        user_name: historyItem.user_name,
        user_role: historyItem.user_role,
        action_type: historyItem.action_type,
        previous_status: historyItem.previous_status,
        new_status: historyItem.new_status,
        message: historyItem.message,
        photo_url: historyItem.photo_url,
        created_at: historyItem.created_at,
      };

      const { error } = await supabase.from("work_order_history").insert([payload]);
      if (error) {
        console.warn("Supabase work_order_history insert notice (tabela será criada na migração):", error);
      }
    } catch (dbErr) {
      console.warn("Supabase history insert catch:", dbErr);
    }
  }

  return historyItem;
};

/**
 * Carrega a linha do tempo de eventos de uma Ordem de Serviço
 */
export const getWorkOrderHistory = async (workOrderId: string): Promise<WorkOrderHistoryItem[]> => {
  let list: WorkOrderHistoryItem[] = [];

  // 1. Tenta carregar do Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("work_order_history")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        list = data as WorkOrderHistoryItem[];
      }
    } catch (e) {
      console.warn("Erro ao buscar histórico no Supabase:", e);
    }
  }

  // 2. Mescla com LocalStorage
  try {
    const localHistory: WorkOrderHistoryItem[] = JSON.parse(
      localStorage.getItem("commuaria_work_order_history") || "[]"
    );
    const matchedLocal = localHistory.filter((h) => h.work_order_id === workOrderId);
    matchedLocal.forEach((lh) => {
      if (!list.some((item) => item.id === lh.id)) {
        list.push(lh);
      }
    });
  } catch (e) {
    console.warn("Erro ao mesclar histórico local:", e);
  }

  // Ordena por data decrescente (mais recente primeiro)
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Criação limpa de Ordem de Serviço sem gerar chamado duplicado na tabela reports
 */
export const createWorkOrderClean = async (params: {
  order: WorkOrderItem;
  creator: UserProfile;
  linkedReport?: ReportItem | null;
}): Promise<WorkOrderItem> => {
  const { order, creator, linkedReport } = params;

  // 1. Salva O.S. no LocalStorage
  const localOrders: WorkOrderItem[] = JSON.parse(
    localStorage.getItem("commuaria_work_orders") || "[]"
  );
  localOrders.unshift(order);
  localStorage.setItem("commuaria_work_orders", JSON.stringify(localOrders));

  // 2. Se houver chamado vinculado, atualiza o chamado original (NÃO DUPLICA CHAMADO!)
  if (order.linked_report_id) {
    const localReports: ReportItem[] = JSON.parse(
      localStorage.getItem("commuaria_reports") || "[]"
    );
    const updatedReports = localReports.map((r) => {
      if (r.id === order.linked_report_id) {
        return {
          ...r,
          status: "in_progress",
          work_order_number: order.order_number,
          assigned_team: order.assigned_team,
          status_notes: `Ordem de Serviço ${order.order_number} emitida para atendimento. Prazo estimado: ${order.deadline}.`,
        };
      }
      return r;
    });
    localStorage.setItem("commuaria_reports", JSON.stringify(updatedReports));

    // Atualiza chamado no Supabase
    if (supabase && isUUID(order.linked_report_id)) {
      try {
        await supabase
          .from("reports")
          .update({
            status: "in_progress",
            work_order_number: order.order_number,
            assigned_team: order.assigned_team,
            status_notes: `Ordem de Serviço ${order.order_number} despachada para a equipe de ${order.category}.`,
          })
          .eq("id", order.linked_report_id);
      } catch (err) {
        console.warn("Aviso ao sincronizar chamado original no Supabase:", err);
      }
    }
  }

  // 3. Salva O.S. no Supabase
  if (supabase) {
    try {
      const woPayload: any = {
        id: order.id,
        order_number: order.order_number,
        title: order.title,
        category: order.category,
        address: order.address,
        priority: order.priority,
        deadline: order.deadline,
        assigned_team: order.assigned_team,
        assigned_employee_id: order.assigned_employee_id || null,
        assigned_employee_name: order.assigned_employee_name || null,
        maintenance_type: order.maintenance_type,
        description: order.description,
        technical_instructions: order.technical_instructions || null,
        status: order.status,
        status_notes: order.status_notes || `O.S. emitida por ${creator.name || creator.email}.`,
        supervisor_name: creator.name || creator.email,
        supervisor_email: creator.email || "",
        linked_report_id: order.linked_report_id || null,
      };

      const { error: woErr } = await supabase.from("work_orders").insert([woPayload]);
      if (woErr) {
        console.warn("Supabase work_orders insert aviso:", woErr);
      }
    } catch (dbErr) {
      console.warn("Supabase work_orders insert catch:", dbErr);
    }
  }

  // 4. Registra evento inicial no histórico de atendimento
  await recordWorkOrderHistoryEvent({
    workOrderId: order.id,
    userId: creator.id,
    userName: creator.name || creator.email,
    userRole: creator.role,
    actionType: "create",
    previousStatus: null,
    newStatus: order.status,
    message: `Ordem de Serviço ${order.order_number} criada e despachada para ${order.assigned_team}.`,
  });

  return order;
};

/**
 * Transiciona o status de uma Ordem de Serviço, gera histórico imutável
 * e sincroniza o chamado original correspondente do cidadão.
 */
export const updateWorkOrderStatusUnified = async (params: {
  workOrder: WorkOrderItem;
  newStatus: WorkOrderItem["status"];
  agentUser: UserProfile;
  message: string;
  photoUrl?: string | null;
  reason?: string;
}): Promise<WorkOrderItem> => {
  const { workOrder, newStatus, agentUser, message, photoUrl, reason } = params;
  const prevStatus = workOrder.status;

  const updatedOrder: WorkOrderItem = {
    ...workOrder,
    status: newStatus,
    status_notes: message,
    resolution_notes: newStatus === "completed" || newStatus === "impossible" ? message : workOrder.resolution_notes,
    resolution_photo_url: photoUrl || workOrder.resolution_photo_url,
    completed_at: newStatus === "completed" ? new Date().toISOString() : workOrder.completed_at,
  };

  // 1. Atualiza O.S. no LocalStorage
  const localOrders: WorkOrderItem[] = JSON.parse(
    localStorage.getItem("commuaria_work_orders") || "[]"
  );
  const updatedOrders = localOrders.map((o) => (o.id === workOrder.id ? updatedOrder : o));
  localStorage.setItem("commuaria_work_orders", JSON.stringify(updatedOrders));

  // 2. Atualiza O.S. no Supabase
  if (supabase) {
    try {
      const updatePayload: any = {
        status: newStatus,
        status_notes: message,
        resolution_notes: updatedOrder.resolution_notes || null,
        resolution_photo_url: updatedOrder.resolution_photo_url || null,
        completed_at: updatedOrder.completed_at || null,
      };

      await supabase
        .from("work_orders")
        .update(updatePayload)
        .eq("id", workOrder.id);
    } catch (e) {
      console.warn("Erro ao atualizar O.S. no Supabase:", e);
    }
  }

  // 3. Determina o tipo de ação para o histórico
  let actionType: WorkOrderActionType = "note";
  if (newStatus === "in_progress" && prevStatus === "dispatched") {
    actionType = "start";
  } else if (newStatus === "completed") {
    actionType = "complete";
  } else if (newStatus === "impossible") {
    actionType = "impossible";
  } else if (newStatus === "cancelled") {
    actionType = "cancel";
  }

  // 4. Grava evento no histórico imutável
  await recordWorkOrderHistoryEvent({
    workOrderId: workOrder.id,
    userId: agentUser.id,
    userName: agentUser.name || agentUser.email,
    userRole: agentUser.role,
    actionType,
    previousStatus: prevStatus,
    newStatus,
    message: reason ? `[Motivo: ${reason}] ${message}` : message,
    photoUrl: photoUrl || null,
  });

  // 5. Se houver chamado original vinculado (`linked_report_id`), atualiza diretamente o chamado do munícipe
  if (workOrder.linked_report_id) {
    const reportStatusToApply =
      newStatus === "completed"
        ? "resolved"
        : newStatus === "impossible"
        ? "in_analysis"
        : newStatus === "in_progress"
        ? "in_progress"
        : "in_progress";

    const reportNote =
      newStatus === "completed"
        ? `Atendimento concluído pela equipe técnica. Laudo: ${message}`
        : newStatus === "impossible"
        ? `Atendimento temporariamente impedido (${reason || "Impossibilidade técnica"}). Justificativa: ${message}`
        : `Serviço em execução no local pela equipe ${workOrder.assigned_team}.`;

    // LocalStorage
    const localReports: ReportItem[] = JSON.parse(
      localStorage.getItem("commuaria_reports") || "[]"
    );
    let originalReportTarget: ReportItem | undefined;

    const updatedReports = localReports.map((r) => {
      if (r.id === workOrder.linked_report_id) {
        originalReportTarget = {
          ...r,
          status: reportStatusToApply as any,
          status_notes: reportNote,
          resolved_at: newStatus === "completed" ? new Date().toISOString() : r.resolved_at,
        };
        return originalReportTarget;
      }
      return r;
    });
    localStorage.setItem("commuaria_reports", JSON.stringify(updatedReports));

    // Supabase
    if (supabase && isUUID(workOrder.linked_report_id)) {
      try {
        await supabase
          .from("reports")
          .update({
            status: reportStatusToApply,
            status_notes: reportNote,
            resolved_at: newStatus === "completed" ? new Date().toISOString() : null,
          })
          .eq("id", workOrder.linked_report_id);
      } catch (rErr) {
        console.warn("Erro ao sincronizar chamado original no Supabase:", rErr);
      }
    }

    // 6. Notificação deduplicada para o cidadão
    if (originalReportTarget) {
      const todayStr = new Date().toISOString().split("T")[0];
      const notifKey = `notif_${originalReportTarget.id}_${newStatus}_${todayStr}`;

      if (!hasNotificationBeenSent(notifKey)) {
        markNotificationAsSent(notifKey);

        const targetEmail = originalReportTarget.user_email || "";
        const targetName = originalReportTarget.user_name || "Cidadão";

        if (newStatus === "completed") {
          notifyReportResolved({
            report: originalReportTarget,
            userEmail: targetEmail,
            userName: targetName,
            resolutionNotes: message,
          });
        } else if (newStatus === "impossible") {
          notifyReportCancelled({
            report: originalReportTarget,
            userEmail: targetEmail,
            userName: targetName,
            reason: `Impedimento no atendimento: ${reason || ""} - ${message}`,
          });
        } else if (newStatus === "in_progress") {
          notifyReportInProgress({
            report: originalReportTarget,
            userEmail: targetEmail,
            userName: targetName,
            supervisorNotes: message,
          });
        }
      }
    }
  }

  return updatedOrder;
};
