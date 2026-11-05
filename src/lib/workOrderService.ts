import { supabase, isRealSupabase, generateUUID, isUUID } from "./supabase";
import {
  WorkOrderItem,
  WorkOrderHistoryItem,
  WorkOrderActionType,
  UserProfile,
  ReportItem,
  ReportCategory,
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
 * Normaliza o setor / categoria de um chamado ou Ordem de Serviço
 */
export const normalizeSectorCategory = (
  cat?: string | null,
  title?: string | null,
  description?: string | null
): ReportCategory => {
  const exactCategories: ReportCategory[] = [
    "Pavimentação",
    "Iluminação Pública",
    "Limpeza Urbana",
    "Saneamento",
    "Arborização",
    "Outros",
  ];
  if (cat && exactCategories.includes(cat as ReportCategory)) {
    return cat as ReportCategory;
  }

  const text = `${cat || ""} ${title || ""} ${description || ""}`.toLowerCase();
  if (
    text.includes("pav") ||
    text.includes("rua") ||
    text.includes("via") ||
    text.includes("asfalt") ||
    text.includes("burac") ||
    text.includes("calçad") ||
    text.includes("meio-fio")
  ) {
    return "Pavimentação";
  }
  if (
    text.includes("ilu") ||
    text.includes("luz") ||
    text.includes("post") ||
    text.includes("lamp") ||
    text.includes("lâmp") ||
    text.includes("fio")
  ) {
    return "Iluminação Pública";
  }
  if (
    text.includes("limp") ||
    text.includes("lix") ||
    text.includes("entulh") ||
    text.includes("varri") ||
    text.includes("descart")
  ) {
    return "Limpeza Urbana";
  }
  if (
    text.includes("sane") ||
    text.includes("esgot") ||
    text.includes("bueir") ||
    text.includes("vazam") ||
    text.includes("alagad") ||
    text.includes("drenag") ||
    text.includes("água") ||
    text.includes("agua")
  ) {
    return "Saneamento";
  }
  if (
    text.includes("arbor") ||
    text.includes("arvor") ||
    text.includes("árvor") ||
    text.includes("pod") ||
    text.includes("galh") ||
    text.includes("mato")
  ) {
    return "Arborização";
  }
  return "Outros";
};

/**
 * Filtra Ordens de Serviço atribuídas a um Funcionário ou ao seu setor operacional
 */
export const filterEmployeeWorkOrders = (
  workOrders: WorkOrderItem[],
  user: UserProfile,
  assignedSector: string
): WorkOrderItem[] => {
  const cleanId = user.id || "";
  const cleanName = (user.name || "").toLowerCase().trim();
  const cleanEmail = (user.email || "").toLowerCase().trim();

  return workOrders.filter((wo) => {
    const matchEmpId = Boolean(wo.assigned_employee_id && wo.assigned_employee_id === cleanId);
    const matchEmpName = Boolean(
      wo.assigned_employee_name &&
        ((cleanName && wo.assigned_employee_name.toLowerCase().includes(cleanName)) ||
          (cleanEmail && wo.assigned_employee_name.toLowerCase().includes(cleanEmail)))
    );
    const matchTeam = Boolean(
      wo.assigned_team && cleanName && wo.assigned_team.toLowerCase().includes(cleanName)
    );

    if (matchEmpId || matchEmpName || matchTeam) return true;

    // Se estiver atribuída explicitamente a outro servidor pelo ID, não exibe na fila geral
    if (wo.assigned_employee_id && wo.assigned_employee_id !== cleanId) {
      return false;
    }

    const sectorNorm = (wo.category || "").toLowerCase();
    const mySectorNorm = (assignedSector || "Pavimentação").toLowerCase();
    return sectorNorm.includes(mySectorNorm.substring(0, 4));
  });
};

/**
 * Resolve coordenadas reais de GPS de uma Ordem de Serviço (diretas ou via chamado vinculado)
 */
export const resolveWorkOrderCoordinates = (
  wo: WorkOrderItem,
  reports: ReportItem[]
): { latitude: number; longitude: number } | null => {
  if (
    typeof wo.latitude === "number" &&
    typeof wo.longitude === "number" &&
    !Number.isNaN(wo.latitude) &&
    !Number.isNaN(wo.longitude) &&
    wo.latitude !== 0 &&
    wo.longitude !== 0
  ) {
    return { latitude: wo.latitude, longitude: wo.longitude };
  }

  const matchedReport = reports.find(
    (r) =>
      !r.is_work_order &&
      ((wo.linked_report_id && r.id === wo.linked_report_id) ||
        (wo.order_number && r.work_order_number === wo.order_number))
  ) ||
    reports.find(
      (r) =>
        (wo.linked_report_id && r.id === wo.linked_report_id) ||
        (wo.order_number && r.work_order_number === wo.order_number)
    );

  if (
    matchedReport &&
    typeof matchedReport.latitude === "number" &&
    typeof matchedReport.longitude === "number" &&
    !Number.isNaN(matchedReport.latitude) &&
    !Number.isNaN(matchedReport.longitude)
  ) {
    return {
      latitude: matchedReport.latitude,
      longitude: matchedReport.longitude,
    };
  }

  return null;
};

/**
 * Extrai o bairro / região real a partir do endereço registrado em Araucária - PR
 */
export const extractNeighborhoodFromAddress = (address?: string | null): string => {
  if (!address || !address.trim()) return "Região Central / Sede";

  const knownNeighborhoods = [
    "Capela Velha",
    "Costeira",
    "Iguaçu",
    "Centro",
    "Cachoeira",
    "Fazenda Velha",
    "Campina da Barra",
    "Tindiquera",
    "Boqueirão",
    "Thomaz Coelho",
    "Estação",
    "Passaúna",
    "São Miguel",
    "Vila Nova",
    "Porto das Laranjeiras",
    "Jardim Plínio",
    "Barigui",
    "Laranjeiras",
    "Sabiá",
    "Califórnia",
    "Guajuvira",
  ];

  const lower = address.toLowerCase();
  if (lower.includes("victor do amaral")) return "Centro";
  if (lower.includes("vila angélica") || lower.includes("vila angelica")) return "Vila Angélica";
  if (lower.includes("jardim industrial")) return "Jardim Industrial";

  for (const nb of knownNeighborhoods) {
    if (lower.includes(nb.toLowerCase())) {
      return nb;
    }
  }

  const ignoreTokens = [
    "araucária",
    "araucaria",
    "paraná",
    "parana",
    "pr",
    "brasil",
    "região sul",
    "regiao sul",
    "região metropolitana de curitiba",
  ];

  const parts = address
    .split(/[,-]/)
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      const pl = p.toLowerCase();
      if (/^\d+$/.test(pl) || /^\d{5}-?\d{3}$/.test(pl)) return false;
      if (ignoreTokens.some((tok) => pl === tok)) return false;
      return true;
    });

  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return "Araucária (Sede)";
};

/**
 * Carrega todas as Ordens de Serviço reais do Supabase mescladas com sincronizações locais
 */
export const fetchSystemWorkOrders = async (cityId = "araucaria-pr"): Promise<WorkOrderItem[]> => {
  const map = new Map<string, WorkOrderItem>();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .eq("city_id", cityId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((w: WorkOrderItem) => {
          map.set(w.id || w.order_number, w);
        });
      }
    } catch (e) {
      console.warn("Aviso ao consultar work_orders no Supabase:", e);
    }
  }

  // Mescla apenas registros locais reais (sem sobrescrever dados mais recentes do Supabase quando já existem lá)
  try {
    const raw = localStorage.getItem("commuaria_work_orders");
    if (raw) {
      const localWos: WorkOrderItem[] = JSON.parse(raw);
      if (Array.isArray(localWos)) {
        localWos.forEach((lw) => {
          if ((lw.city_id || "araucaria-pr") !== cityId) return;
          if (isRealSupabase && lw.id?.startsWith("mock-")) return;
          const key = lw.id || lw.order_number;
          if (!map.has(key)) {
            map.set(key, lw);
          } else {
            const existing = map.get(key)!;
            map.set(key, {
              ...lw,
              ...existing,
              checklist_state: existing.checklist_state || lw.checklist_state || null,
              resolution_notes: existing.resolution_notes || lw.resolution_notes,
              resolution_photo_url: existing.resolution_photo_url || lw.resolution_photo_url,
            });
          }
        });
      }
    }
  } catch (_) {}

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

/**
 * Carrega os eventos recentes de auditoria de todas as Ordens de Serviço
 */
export const fetchRecentWorkOrderHistory = async (
  limit = 100,
  cityId = "araucaria-pr"
): Promise<WorkOrderHistoryItem[]> => {
  const map = new Map<string, WorkOrderHistoryItem>();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("work_order_history")
        .select("*")
        .eq("city_id", cityId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        data.forEach((h: WorkOrderHistoryItem) => {
          map.set(h.id, h);
        });
      }
    } catch (e) {
      console.warn("Aviso ao consultar histórico geral no Supabase:", e);
    }
  }

  try {
    const localHistory: WorkOrderHistoryItem[] = JSON.parse(
      localStorage.getItem("commuaria_work_order_history") || "[]"
    );
    if (Array.isArray(localHistory)) {
      localHistory.forEach((lh) => {
        if ((lh.city_id || "araucaria-pr") !== cityId) return;
        if (!map.has(lh.id)) {
          map.set(lh.id, lh);
        }
      });
    }
  } catch (_) {}

  return Array.from(map.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
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
  cityId?: string;
}): Promise<WorkOrderHistoryItem> => {
  const historyId = "woh_" + Math.random().toString(36).substring(2, 9);
  const nowIso = new Date().toISOString();
  let orderCityId = params.cityId;
  try {
    const orders: WorkOrderItem[] = JSON.parse(localStorage.getItem("commuaria_work_orders") || "[]");
    orderCityId = orderCityId || orders.find((order) => order.id === params.workOrderId)?.city_id;
  } catch { /* The database trigger resolves city_id from the linked work order. */ }

  const historyItem: WorkOrderHistoryItem = {
    id: historyId,
    work_order_id: params.workOrderId,
    city_id: orderCityId || "araucaria-pr",
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
        city_id: historyItem.city_id,
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
        console.warn("Supabase work_order_history insert notice:", error);
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
 * Registra um apontamento técnico intermediário no Diário de Campo sem encerrar a O.S.
 */
export const addWorkOrderFieldNote = async (params: {
  workOrder: WorkOrderItem;
  agentUser: UserProfile;
  message: string;
  photoUrl?: string | null;
}): Promise<{ updatedOrder: WorkOrderItem; historyItem: WorkOrderHistoryItem }> => {
  const { workOrder, agentUser, message, photoUrl } = params;
  const cleanMsg = message.trim();

  const updatedOrder: WorkOrderItem = {
    ...workOrder,
    status_notes: cleanMsg,
  };

  // 1. Atualiza LocalStorage
  try {
    const localOrders: WorkOrderItem[] = JSON.parse(
      localStorage.getItem("commuaria_work_orders") || "[]"
    );
    const exists = localOrders.some((o) => o.id === workOrder.id);
    const nextOrders = exists
      ? localOrders.map((o) => (o.id === workOrder.id ? updatedOrder : o))
      : [updatedOrder, ...localOrders];
    localStorage.setItem("commuaria_work_orders", JSON.stringify(nextOrders));
  } catch (_) {}

  // 2. Atualiza status_notes na work_orders do Supabase
  if (supabase) {
    try {
      await supabase
        .from("work_orders")
        .update({ status_notes: cleanMsg })
        .eq("id", workOrder.id);
    } catch (e) {
      console.warn("Aviso ao atualizar nota da O.S. no Supabase:", e);
    }
  }

  // 3. Registra no histórico imutável (actionType = "note")
  const historyItem = await recordWorkOrderHistoryEvent({
    workOrderId: workOrder.id,
    userId: agentUser.id,
    userName: agentUser.name || agentUser.email,
    userRole: agentUser.role,
    actionType: "note",
    previousStatus: workOrder.status,
    newStatus: workOrder.status,
    message: cleanMsg,
    photoUrl: photoUrl || null,
  });

  // 4. Sincroniza nota técnica no chamado original, se houver
  if (workOrder.linked_report_id) {
    const noteSummary = `Atualização de campo (${workOrder.order_number}): ${cleanMsg}`;
    try {
      const localReports: ReportItem[] = JSON.parse(
        localStorage.getItem("commuaria_reports") || "[]"
      );
      let matchedReport: ReportItem | undefined;
      const updatedReports = localReports.map((r) => {
        if (r.id === workOrder.linked_report_id) {
          matchedReport = { ...r, status_notes: noteSummary };
          return matchedReport;
        }
        return r;
      });
      localStorage.setItem("commuaria_reports", JSON.stringify(updatedReports));

      if (supabase && isUUID(workOrder.linked_report_id)) {
        await supabase
          .from("reports")
          .update({ status_notes: noteSummary })
          .eq("id", workOrder.linked_report_id);
      }

      if (matchedReport && matchedReport.user_email) {
        notifyReportUpdated({
          report: matchedReport,
          userEmail: matchedReport.user_email,
          userName: matchedReport.user_name || "Cidadão",
          updateNotes: cleanMsg,
        });
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar apontamento no chamado vinculado:", e);
    }
  }

  return { updatedOrder, historyItem };
};

/**
 * Atualiza o estado do checklist operacional de campo da O.S. (Supabase + LocalStorage)
 */
export const updateWorkOrderChecklist = async (params: {
  workOrder: WorkOrderItem;
  checklistState: Record<string, boolean>;
}): Promise<WorkOrderItem> => {
  const { workOrder, checklistState } = params;
  const updatedOrder: WorkOrderItem = {
    ...workOrder,
    checklist_state: checklistState,
  };

  try {
    const localOrders: WorkOrderItem[] = JSON.parse(
      localStorage.getItem("commuaria_work_orders") || "[]"
    );
    const exists = localOrders.some((o) => o.id === workOrder.id);
    const nextOrders = exists
      ? localOrders.map((o) => (o.id === workOrder.id ? updatedOrder : o))
      : [updatedOrder, ...localOrders];
    localStorage.setItem("commuaria_work_orders", JSON.stringify(nextOrders));
  } catch (_) {}

  if (supabase) {
    try {
      await supabase
        .from("work_orders")
        .update({ checklist_state: checklistState })
        .eq("id", workOrder.id);
    } catch (e) {
      console.warn("Aviso ao salvar checklist no Supabase:", e);
    }
  }

  return updatedOrder;
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

  const enrichedOrder: WorkOrderItem = {
    ...order,
    city_id: order.city_id || linkedReport?.city_id || creator.city_id || "araucaria-pr",
    latitude:
      typeof order.latitude === "number"
        ? order.latitude
        : typeof linkedReport?.latitude === "number"
        ? linkedReport.latitude
        : null,
    longitude:
      typeof order.longitude === "number"
        ? order.longitude
        : typeof linkedReport?.longitude === "number"
        ? linkedReport.longitude
        : null,
  };

  // 1. Salva O.S. no LocalStorage
  const localOrders: WorkOrderItem[] = JSON.parse(
    localStorage.getItem("commuaria_work_orders") || "[]"
  );
  localOrders.unshift(enrichedOrder);
  localStorage.setItem("commuaria_work_orders", JSON.stringify(localOrders));

  // 2. Se houver chamado vinculado, atualiza o chamado original (NÃO DUPLICA CHAMADO!)
  if (enrichedOrder.linked_report_id) {
    const localReports: ReportItem[] = JSON.parse(
      localStorage.getItem("commuaria_reports") || "[]"
    );
    const updatedReports = localReports.map((r) => {
      if (r.id === enrichedOrder.linked_report_id) {
        return {
          ...r,
          status: "in_progress",
          work_order_number: enrichedOrder.order_number,
          assigned_team: enrichedOrder.assigned_team,
          status_notes: `Ordem de Serviço ${enrichedOrder.order_number} emitida para atendimento. Prazo estimado: ${enrichedOrder.deadline}.`,
        };
      }
      return r;
    });
    localStorage.setItem("commuaria_reports", JSON.stringify(updatedReports));

    // Atualiza chamado no Supabase
    if (supabase && isUUID(enrichedOrder.linked_report_id)) {
      try {
        await supabase
          .from("reports")
          .update({
            status: "in_progress",
            work_order_number: enrichedOrder.order_number,
            assigned_team: enrichedOrder.assigned_team,
            status_notes: `Ordem de Serviço ${enrichedOrder.order_number} despachada para a equipe de ${enrichedOrder.category}.`,
          })
          .eq("id", enrichedOrder.linked_report_id);
      } catch (err) {
        console.warn("Aviso ao sincronizar chamado original no Supabase:", err);
      }
    }
  }

  // 3. Salva O.S. no Supabase
  if (supabase) {
    try {
      const woPayload: any = {
        id: enrichedOrder.id,
        city_id: enrichedOrder.city_id,
        order_number: enrichedOrder.order_number,
        title: enrichedOrder.title,
        category: enrichedOrder.category,
        address: enrichedOrder.address,
        latitude: enrichedOrder.latitude,
        longitude: enrichedOrder.longitude,
        priority: enrichedOrder.priority,
        deadline: enrichedOrder.deadline,
        assigned_team: enrichedOrder.assigned_team,
        assigned_employee_id: enrichedOrder.assigned_employee_id || null,
        assigned_employee_name: enrichedOrder.assigned_employee_name || null,
        maintenance_type: enrichedOrder.maintenance_type,
        description: enrichedOrder.description,
        technical_instructions: enrichedOrder.technical_instructions || null,
        status: enrichedOrder.status,
        status_notes: enrichedOrder.status_notes || `O.S. emitida por ${creator.name || creator.email}.`,
        supervisor_name: creator.name || creator.email,
        supervisor_email: creator.email || "",
        linked_report_id: enrichedOrder.linked_report_id || null,
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
    workOrderId: enrichedOrder.id,
    userId: creator.id,
    userName: creator.name || creator.email,
    userRole: creator.role,
    actionType: "create",
    previousStatus: null,
    newStatus: enrichedOrder.status,
    message: `Ordem de Serviço ${enrichedOrder.order_number} criada e despachada para ${enrichedOrder.assigned_team}.`,
  });

  return enrichedOrder;
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
  const existsLocally = localOrders.some((o) => o.id === workOrder.id);
  const updatedOrders = existsLocally
    ? localOrders.map((o) => (o.id === workOrder.id ? updatedOrder : o))
    : [updatedOrder, ...localOrders];
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
  if (newStatus === "in_progress" && (prevStatus === "dispatched" || prevStatus === "open")) {
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
