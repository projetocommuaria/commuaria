// Servico de Notificacoes por E-mail do Commuária
export interface ReportNotificationPayload {
  to: string;
  userName?: string;
  eventType: 'created' | 'forwarded' | 'in_analysis' | 'in_progress' | 'updated' | 'resolved' | 'cancelled' | 'admin_alert';
  report: {
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
  };
  customSubject?: string;
  customMessage?: string;
}

export function generateNotificationEmailHtml(payload: ReportNotificationPayload): { subject: string; html: string; text: string } {
  const { userName = 'Cidadão', eventType, report } = payload;
  const protocol = report.protocol || report.id.replace('rep_', '#').replace('mock-', '#');

  let titleBadge = 'Ocorrência Registrada';
  let badgeColor = '#2563EB'; // Blue
  let headerText = 'Sua ocorrência foi registrada com sucesso';
  let subject = `[Commuária] Ocorrência ${protocol} registrada com sucesso`;
  let eventSummary = 'Recebemos a sua solicitação no sistema de zeladoria urbana. Ela passará pela triagem e será direcionada para a secretaria responsável.';

  switch (eventType) {
    case 'created':
      titleBadge = '1. Registrada';
      badgeColor = '#2563EB';
      subject = `[Commuária] 🔔 Ocorrência ${protocol} registrada com sucesso`;
      headerText = 'Ocorrência Registrada com Sucesso';
      eventSummary = 'Seu chamado foi gravado no sistema e está aguardando o encaminhamento para o setor técnico de Araucária.';
      break;

    case 'forwarded':
      titleBadge = '2. Encaminhada ao Setor';
      badgeColor = '#4F46E5'; // Indigo
      subject = `[Commuária] 🔔 Ocorrência ${protocol} recebida pelo setor de ${report.category}`;
      headerText = `Ocorrência Encaminhada: ${report.category}`;
      eventSummary = `O sistema encaminhou automaticamente a sua ocorrência para a equipe e supervisor responsável pelo setor de ${report.category}.`;
      break;

    case 'in_analysis':
      titleBadge = '3. Em Análise Técnica';
      badgeColor = '#D97706'; // Amber
      subject = `[Commuária] 🔔 Ocorrência ${protocol} está em análise pelo setor de ${report.category}`;
      headerText = 'Ocorrência em Análise Técnica';
      eventSummary = `O supervisor do setor de ${report.category} iniciou a avaliação das informações para programar a intervenção necessária.`;
      break;

    case 'in_progress':
      titleBadge = '4. Em Atendimento / Em Andamento';
      badgeColor = '#059669'; // Emerald
      subject = `[Commuária] 🔔 O atendimento da ocorrência ${protocol} foi iniciado`;
      headerText = 'Atendimento Iniciado em Campo';
      eventSummary = `A equipe de manutenção foi mobilizada para realizar os serviços no local indicado (${report.address}).`;
      break;

    case 'updated':
      titleBadge = '5. Atualização / Parecer';
      badgeColor = '#0891B2'; // Cyan
      subject = `[Commuária] 🔔 Atualização na ocorrência ${protocol}`;
      headerText = 'Nova Atualização no Chamado';
      eventSummary = 'O supervisor do setor adicionou novas informações ou parecer técnico sobre o andamento do seu chamado.';
      break;

    case 'resolved':
      titleBadge = '6. Concluído';
      badgeColor = '#16A34A'; // Green
      subject = `[Commuária] ✅ A ocorrência ${protocol} foi concluída`;
      headerText = 'Atendimento Finalizado com Sucesso';
      eventSummary = 'Os serviços de manutenção foram concluídos pela equipe municipal. Agradecemos por contribuir com a zeladoria da nossa cidade!';
      break;

    case 'cancelled':
      titleBadge = '7. Finalizado / Recusado';
      badgeColor = '#DC2626'; // Red
      subject = `[Commuária] ⚠️ A ocorrência ${protocol} foi encerrada`;
      headerText = 'Ocorrência Encerrada / Recusada';
      eventSummary = 'A ocorrência foi encerrada pela fiscalização. Veja abaixo o motivo detalhado informado pelo supervisor.';
      break;

    case 'admin_alert':
      titleBadge = 'Alerta de Gestão';
      badgeColor = '#7C3AED'; // Purple
      subject = `[Commuária Admin] 📢 Novo Chamado no Município: ${protocol}`;
      headerText = 'Nova Ocorrência Cadastrada no Município';
      eventSummary = 'Uma nova solicitação foi registrada no sistema e está disponível no painel de administração e zeladoria.';
      break;
  }

  if (payload.customSubject) {
    subject = payload.customSubject;
  }

  const plainText = `
Commuária - Sistema de Zeladoria e Notificações
Olá, ${userName}!

${headerText}
${eventSummary}

Detalhes da Ocorrência:
- Protocolo: ${protocol}
- Título: ${report.title}
- Categoria / Setor: ${report.category}
- Endereço: ${report.address}
${report.statusNotes ? `- Parecer Técnico: ${report.statusNotes}` : ''}
${report.reason ? `- Motivo do Encerramento: ${report.reason}` : ''}
${report.assignedTeam ? `- Equipe Responsável: ${report.assignedTeam}` : ''}
${report.deadline ? `- Prazo Estimado: ${report.deadline}` : ''}

Acompanhe o andamento completo da ocorrência diretamente no aplicativo Commuária.
Commuária - Conectando cidadãos e zeladoria urbana em Araucária.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      <span style="color: #38bdf8;">Commu</span>ária
                    </div>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 4px; font-weight: 500;">
                      Central de Notificações e Zeladoria Urbana
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #ffffff; background-color: ${badgeColor}; border-radius: 20px;">
                      ${titleBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${headerText}
              </h1>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                Olá, <strong>${userName}</strong>! ${eventSummary}
              </p>

              <!-- Card com detalhes da ocorrencia -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px;">
                      Dados do Chamado
                    </div>

                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="32%" style="font-size: 13px; color: #64748b; font-weight: 600;">Protocolo:</td>
                        <td style="font-size: 14px; color: #0f172a; font-weight: 700; font-family: monospace;">${protocol}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Título:</td>
                        <td style="font-size: 14px; color: #0f172a; font-weight: 600;">${report.title}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Categoria / Setor:</td>
                        <td style="font-size: 14px; color: #0f172a;">${report.category}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Localização:</td>
                        <td style="font-size: 14px; color: #0f172a;">${report.address}</td>
                      </tr>
                      ${report.assignedTeam ? `
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Equipe:</td>
                        <td style="font-size: 14px; color: #0f172a;">${report.assignedTeam}</td>
                      </tr>
                      ` : ''}
                      ${report.deadline ? `
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Previsão:</td>
                        <td style="font-size: 14px; color: #0f172a;">${report.deadline}</td>
                      </tr>
                      ` : ''}
                    </table>

                    ${report.statusNotes ? `
                    <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
                      <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">Parecer Técnico do Supervisor:</div>
                      <div style="font-size: 13px; color: #475569; background-color: #ffffff; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.5;">
                        "${report.statusNotes}"
                      </div>
                    </div>
                    ` : ''}

                    ${report.reason ? `
                    <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #fca5a5;">
                      <div style="font-size: 12px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">Motivo do Encerramento / Recusa:</div>
                      <div style="font-size: 13px; color: #7f1d1d; background-color: #fef2f2; padding: 10px 12px; border-radius: 8px; border: 1px solid #fecaca; line-height: 1.5;">
                        ${report.reason}
                      </div>
                    </div>
                    ` : ''}

                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <div style="text-align: center; margin-top: 24px; margin-bottom: 12px;">
                <a href="https://commuaria.app" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">
                  Acompanhar no Commuária
                </a>
              </div>

              <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
                Você está recebendo este e-mail porque cadastrou ou acompanha uma solicitação de zeladoria.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                <strong>Commuária</strong> - Conectando Cidadãos e Zeladoria Urbana<br>
                Município de Araucária - PR &bull; Atendimento ao Cidadão
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text: plainText };
}
