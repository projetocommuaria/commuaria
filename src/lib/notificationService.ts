// Commuária - Sistema Unificado de Notificações Externas (Web Push, Mobile/Desktop OS & E-mail)

export type NotificationEventType =
  | 'created'
  | 'forwarded'
  | 'in_analysis'
  | 'in_progress'
  | 'updated'
  | 'resolved'
  | 'cancelled'
  | 'admin_alert';

export interface NotificationReportData {
  id: string;
  protocol?: string;
  title: string;
  category: string;
  address: string;
  statusNotes?: string;
  reason?: string;
  supervisorName?: string;
  assignedTeam?: string;
  deadline?: string;
  createdAt?: string;
}

export interface ExternalNotificationOptions {
  userEmail?: string | null;
  userName?: string;
  eventType: NotificationEventType;
  report: NotificationReportData;
  customTitle?: string;
  customBody?: string;
  adminEmail?: string;
}

/**
 * Registra o Service Worker do Commuária para suporte a Push Notifications em segundo plano
 */
export async function registerCommuariaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Registro do Service Worker:', err);
    return null;
  }
}

/**
 * Retorna o estado atual da permissão de notificações do dispositivo
 */
export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita a permissão do sistema/navegador para enviar notificações nativas
 */
export async function requestDeviceNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerCommuariaServiceWorker();
    }
    return perm;
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificações:', err);
    return Notification.permission;
  }
}

/**
 * Dispara uma notificação nativa no sistema operacional do dispositivo (celular/tablet/computador)
 */
export async function showDeviceNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
  }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    // Tenta solicitar permissão se ainda não foi recusada explicitamente
    if (Notification.permission === 'default') {
      const perm = await requestDeviceNotificationPermission();
      if (perm !== 'granted') return false;
    } else {
      return false;
    }
  }

  const notificationOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || '/logo_minimalista.png',
    badge: options.badge || '/logo_minimalista.png',
    tag: options.tag || 'commuaria-status-update',
    data: options.data || { url: '/' },
    // @ts-ignore
    vibrate: [200, 100, 200],
    requireInteraction: options.requireInteraction ?? false,
  };

  try {
    // Tenta disparar via Service Worker (permite aparecer mesmo em segundo plano)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Fallback para Notification API direta
    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.warn('Erro ao exibir notificação nativa do dispositivo:', err);
    try {
      new Notification(title, notificationOptions);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Envia o e-mail de notificação para o servidor Express (/api/notifications/send-email)
 */
export async function sendEmailNotification(payload: {
  to: string;
  userName?: string;
  eventType: NotificationEventType;
  report: NotificationReportData;
  customSubject?: string;
  customMessage?: string;
}): Promise<boolean> {
  try {
    if (!payload.to || !payload.to.includes('@')) {
      return false;
    }

    const response = await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.warn('Aviso no envio do e-mail de notificação:', err);
    return false;
  }
}

/**
 * Formata o número do protocolo para exibição amigável
 */
export function formatReportProtocol(reportId: string, customProtocol?: string): string {
  if (customProtocol) return customProtocol;
  if (!reportId) return '#0000';
  if (reportId.startsWith('#')) return reportId;
  const cleanId = reportId.replace(/^rep_|^mock-r|^wo_/, '').toUpperCase();
  return `#${cleanId.slice(0, 5)}`;
}

/**
 * Função Mestra: Dispara Notificação Externa (Dispositivo Push + E-mail)
 */
export async function triggerExternalNotification(options: ExternalNotificationOptions): Promise<void> {
  const { userEmail, userName = 'Cidadão', eventType, report, customTitle, customBody, adminEmail = 'projetocomnuaria831@gmail.com' } = options;
  const protocol = formatReportProtocol(report.id, report.protocol);

  let pushTitle = '🔔 Commuária';
  let pushBody = '';

  switch (eventType) {
    case 'created':
      pushTitle = '🔔 Commuária - Ocorrência Registrada';
      pushBody = `Sua ocorrência ${protocol} (${report.category}) foi registrada com sucesso e será encaminhada ao setor responsável.`;
      break;

    case 'forwarded':
      pushTitle = '🔔 Commuária - Setor Responsável';
      pushBody = `Sua ocorrência ${protocol} foi recebida e encaminhada para o setor de ${report.category}.`;
      break;

    case 'in_analysis':
      pushTitle = '🔔 Commuária - Em Análise';
      pushBody = `Sua ocorrência ${protocol} está em análise pelo setor de ${report.category}.`;
      break;

    case 'in_progress':
      pushTitle = '🔔 Commuária - Em Atendimento';
      pushBody = `O atendimento da ocorrência ${protocol} foi iniciado pela equipe de manutenção.`;
      break;

    case 'updated':
      pushTitle = '🔔 Commuária - Nova Atualização';
      pushBody = report.statusNotes
        ? `Atualização na ocorrência ${protocol}: "${report.statusNotes}"`
        : `O supervisor adicionou novas informações à ocorrência ${protocol}.`;
      break;

    case 'resolved':
      pushTitle = '🔔 Commuária - Concluído';
      pushBody = `A ocorrência ${protocol} foi concluída. Acesse o Commuária para consultar os detalhes.`;
      break;

    case 'cancelled':
      pushTitle = '🔔 Commuária - Encerramento';
      pushBody = report.reason
        ? `A ocorrência ${protocol} foi encerrada. Motivo: ${report.reason}`
        : `A ocorrência ${protocol} foi finalizada pelo supervisor do setor.`;
      break;

    case 'admin_alert':
      pushTitle = '🔔 Commuária Gestão';
      pushBody = `Novo chamado municipal ${protocol}: ${report.title} (${report.category}) em ${report.address}.`;
      break;
  }

  if (customTitle) pushTitle = customTitle;
  if (customBody) pushBody = customBody;

  // 1. Disparar notificação nativa no dispositivo (celular / tablet / desktop)
  showDeviceNotification(pushTitle, {
    body: pushBody,
    tag: `report-${report.id}-${eventType}`,
    data: {
      reportId: report.id,
      eventType,
      url: '/',
    },
  });

  // 2. Disparar e-mail para o usuário cadastrado se houver e-mail válido
  if (userEmail && userEmail.includes('@') && !userEmail.includes('anonymo')) {
    sendEmailNotification({
      to: userEmail,
      userName,
      eventType,
      report: {
        ...report,
        protocol,
      },
    });
  }

  // 3. Se for criação de chamado ou evento crítico, enviar também notificação para a gestão/admin
  if (eventType === 'created' && adminEmail && adminEmail !== userEmail) {
    sendEmailNotification({
      to: adminEmail,
      userName: 'Equipe de Gestão',
      eventType: 'admin_alert',
      report: {
        ...report,
        protocol,
      },
    });
  }
}

// =========================================================================
// MÉTODOS AUXILIARES DIRETOS PARA CADA UMA DAS 7 ETAPAS DO CICLO DE VIDA
// =========================================================================

/**
 * 1. Ocorrência Registrada
 */
export async function notifyReportCreated(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'created',
    report: params.report,
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * 2. Ocorrência Recebida pelo Setor
 */
export async function notifyReportForwardedToSector(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  supervisorEmail?: string | null;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'forwarded',
    report: params.report,
    userEmail: params.userEmail,
    userName: params.userName,
  });

  // Notificar também o supervisor do setor se houver e-mail
  if (params.supervisorEmail && params.supervisorEmail.includes('@')) {
    sendEmailNotification({
      to: params.supervisorEmail,
      userName: 'Supervisor do Setor',
      eventType: 'forwarded',
      customSubject: `[Commuária Setor] Novo chamado atribuído: ${formatReportProtocol(params.report.id)} - ${params.report.category}`,
      report: params.report,
    });
  }
}

/**
 * 3. Em Análise
 */
export async function notifyReportInAnalysis(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  supervisorNotes?: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'in_analysis',
    report: {
      ...params.report,
      statusNotes: params.supervisorNotes || params.report.statusNotes,
    },
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * 4. Em Atendimento (Início de atendimento / Equipe mobilizada)
 */
export async function notifyReportInProgress(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  assignedTeam?: string;
  deadline?: string;
  supervisorNotes?: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'in_progress',
    report: {
      ...params.report,
      assignedTeam: params.assignedTeam || params.report.assignedTeam,
      deadline: params.deadline || params.report.deadline,
      statusNotes: params.supervisorNotes || params.report.statusNotes,
    },
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * 5. Atualização / Parecer Adicionado pelo Supervisor
 */
export async function notifyReportUpdated(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  updateNotes: string;
  supervisorName?: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'updated',
    report: {
      ...params.report,
      statusNotes: params.updateNotes,
      supervisorName: params.supervisorName || params.report.supervisorName,
    },
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * 6. Concluído
 */
export async function notifyReportResolved(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  resolutionNotes?: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'resolved',
    report: {
      ...params.report,
      statusNotes: params.resolutionNotes || params.report.statusNotes,
    },
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * 7. Cancelado / Recusado
 */
export async function notifyReportCancelled(params: {
  report: NotificationReportData;
  userEmail?: string | null;
  userName?: string;
  reason: string;
}): Promise<void> {
  await triggerExternalNotification({
    eventType: 'cancelled',
    report: {
      ...params.report,
      reason: params.reason,
    },
    userEmail: params.userEmail,
    userName: params.userName,
  });
}

/**
 * Notificação Administrativa / Geral
 */
export async function notifyAdminGeneral(params: {
  title: string;
  message: string;
  report?: NotificationReportData;
  adminEmail?: string;
}): Promise<void> {
  const adminTo = params.adminEmail || 'projetocomnuaria831@gmail.com';

  showDeviceNotification(params.title, {
    body: params.message,
    tag: `admin-alert-${Date.now()}`,
  });

  if (params.report) {
    sendEmailNotification({
      to: adminTo,
      userName: 'Administrador Commuária',
      eventType: 'admin_alert',
      customSubject: params.title,
      customMessage: params.message,
      report: params.report,
    });
  }
}
