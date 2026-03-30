import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { evolutionService } from './evolution.service';

type EventType =
  | 'STATUS_CHANGE'
  | 'BUDGET_CHANGE'
  | 'CAMPAIGN_CREATED'
  | 'AUTOMATION_TRIGGERED'
  | 'PERFORMANCE_ALERT'
  | 'DAILY_SUMMARY'
  | 'REPORT_GENERATED'
  | 'BILLING_PAUSE'
  | 'SCHEDULED_PAUSE'
  | 'SCHEDULED_RESUME';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa ✅',
  PAUSED: 'Pausada ⏸️',
  ARCHIVED: 'Arquivada 📦',
  DELETED: 'Excluída 🗑️',
  DRAFT: 'Rascunho 📝',
};

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatDate(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('pt-BR');
}

function formatTime(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export class WhatsAppNotificationsService {
  formatStatusChange(campaignName: string, oldStatus: string, newStatus: string): string {
    return [
      `📢 *Atualização de Campanha*`,
      ``,
      `Campanha: *${campaignName}*`,
      `Status: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
      ``,
      `Ação realizada em ${formatDate()} às ${formatTime()}`,
    ].join('\n');
  }

  formatBudgetChange(campaignName: string, oldBudget: number, newBudget: number): string {
    const pctChange = oldBudget > 0 ? Math.round(((newBudget - oldBudget) / oldBudget) * 100) : 0;
    const pctLabel = pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`;

    return [
      `💰 *Alteração de Orçamento*`,
      ``,
      `Campanha: *${campaignName}*`,
      `Orçamento anterior: ${formatCurrency(oldBudget)}/dia`,
      `Novo orçamento: ${formatCurrency(newBudget)}/dia (${pctLabel})`,
      ``,
      `Alterado em ${formatDate()} às ${formatTime()}`,
    ].join('\n');
  }

  formatPerformanceAlert(
    campaignName: string,
    alertType: string,
    metrics: { ctr?: number; roas?: number; impressions?: number; clicks?: number; spend?: number; revenue?: number }
  ): string {
    const lines = [`⚠️ *Alerta de Performance*`, ``, `Campanha: *${campaignName}*`];

    if (alertType === 'CTR_LOW' && metrics.ctr !== undefined) {
      lines.push(`CTR atual: ${metrics.ctr.toFixed(2)}% (abaixo de 0.5%)`);
      if (metrics.impressions !== undefined) lines.push(`Impressões: ${formatNumber(metrics.impressions)}`);
      if (metrics.clicks !== undefined) lines.push(`Cliques: ${formatNumber(metrics.clicks)}`);
      lines.push(``, `💡 Sugestão: Revise os criativos ou segmentação.`);
    } else if (alertType === 'ROAS_NEGATIVE' && metrics.roas !== undefined) {
      lines.push(`ROAS atual: ${metrics.roas.toFixed(2)}x (abaixo de 1.0x)`);
      if (metrics.spend !== undefined) lines.push(`Gasto: ${formatCurrency(metrics.spend)}`);
      if (metrics.revenue !== undefined) lines.push(`Receita: ${formatCurrency(metrics.revenue)}`);
      lines.push(``, `💡 Sugestão: Considere pausar ou otimizar a campanha.`);
    } else if (alertType === 'ZERO_SPEND') {
      lines.push(`Status: ATIVA sem gasto nos últimos 2 dias`);
      lines.push(``, `💡 Sugestão: Verifique orçamento, público e criativos. A campanha pode estar sem veiculação.`);
    } else if (alertType === 'CPC_HIGH' && (metrics as any).cpc !== undefined) {
      lines.push(`CPC atual: ${formatCurrency((metrics as any).cpc)} (acima de R$5,00)`);
      if (metrics.clicks !== undefined) lines.push(`Cliques: ${formatNumber(metrics.clicks)}`);
      if (metrics.spend !== undefined) lines.push(`Gasto: ${formatCurrency(metrics.spend)}`);
      lines.push(``, `💡 Sugestão: Otimize o público ou reduza lances para diminuir o CPC.`);
    }

    return lines.join('\n');
  }

  formatDailySummary(
    date: Date,
    campaigns: Array<{
      name: string;
      spend: number;
      clicks: number;
      impressions: number;
      conversions: number;
      revenue: number;
    }>
  ): string {
    const lines = [
      `📊 *Resumo Diário - ${formatDate(date)}*`,
      ``,
      `📌 ${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} ativa${campaigns.length !== 1 ? 's' : ''}`,
    ];

    let totalSpend = 0;
    let totalConversions = 0;

    campaigns.forEach((c, i) => {
      const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';
      const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
      totalSpend += c.spend;
      totalConversions += c.conversions;

      lines.push(``);
      lines.push(`${numberEmoji(i + 1)} *${c.name}*`);
      lines.push(`   Gasto: ${formatCurrency(c.spend)} | Cliques: ${formatNumber(c.clicks)} | CTR: ${ctr}%`);
      if (c.conversions > 0) {
        lines.push(`   Conversões: ${c.conversions} | CPA: ${formatCurrency(cpa)}`);
      }
    });

    lines.push(``);
    lines.push(`💰 Total gasto hoje: ${formatCurrency(totalSpend)}`);
    if (totalConversions > 0) {
      lines.push(`📈 Total conversões: ${totalConversions}`);
    }

    return lines.join('\n');
  }

  formatCampaignCreated(campaignName: string, platformType: string): string {
    return [
      `🚀 *Nova Campanha Criada*`,
      ``,
      `Campanha: *${campaignName}*`,
      `Plataforma: ${platformType}`,
      `Status: Pausada ⏸️ (aguardando ativação)`,
      ``,
      `Criada em ${formatDate()} às ${formatTime()}`,
    ].join('\n');
  }

  formatAutomationTriggered(
    ruleName: string,
    campaignName: string,
    actionType: string,
    metricValue: number
  ): string {
    const actionLabels: Record<string, string> = {
      pause: 'Campanha pausada',
      activate: 'Campanha ativada',
      increase_budget: 'Orçamento aumentado',
      decrease_budget: 'Orçamento reduzido',
      notify: 'Notificação enviada',
    };

    return [
      `⚡ *Automação Executada*`,
      ``,
      `Regra: *${ruleName}*`,
      `Campanha: *${campaignName}*`,
      `Ação: ${actionLabels[actionType] || actionType}`,
      `Valor da métrica: ${metricValue.toFixed(2)}`,
      ``,
      `Executada em ${formatDate()} às ${formatTime()}`,
    ].join('\n');
  }

  formatBillingPause(campaignName: string, reason: string, dailyBudget?: number | null): string {
    const lines = [
      `⚠️ *Campanha Pausada pela Plataforma*`,
      ``,
      `Campanha: *${campaignName}*`,
      `Motivo: ${reason}`,
    ];

    if (dailyBudget) {
      lines.push(`Orçamento diário: ${formatCurrency(dailyBudget)}`);
    }

    lines.push(``);
    lines.push(`💡 Verifique o método de pagamento na conta de anúncios.`);
    lines.push(``);
    lines.push(`_Detectado em ${formatDate()} às ${formatTime()}_`);

    return lines.join('\n');
  }

  formatScheduledAction(campaignName: string, action: 'paused' | 'resumed', nextAction?: string): string {
    const emoji = action === 'paused' ? '⏸️' : '▶️';
    const label = action === 'paused' ? 'Pausada' : 'Retomada';

    const lines = [
      `${emoji} *Campanha ${label} (Agendamento)*`,
      ``,
      `Campanha: *${campaignName}*`,
    ];

    if (nextAction) {
      lines.push(`Próxima ação: ${nextAction}`);
    }

    lines.push(``);
    lines.push(`_Executado em ${formatDate()} às ${formatTime()}_`);

    return lines.join('\n');
  }

  formatCampaignUpdate(
    campaignName: string,
    status: string,
    metrics: {
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      conversions: number;
      revenue: number;
      daysWithData: number;
    },
    dailyBudget?: number | null
  ): string {
    const lines = [
      `📋 *Relatório da Campanha*`,
      ``,
      `🏷️ *${campaignName}*`,
      `📍 Status: ${statusLabels[status] || status}`,
      `📅 Período: últimos ${metrics.daysWithData} dias`,
      ``,
      `━━━━━━━━━━━━━━━━━`,
      ``,
      `💰 *Investimento*`,
      `Total: ${formatCurrency(metrics.spend)}`,
    ];

    if (dailyBudget) {
      lines.push(`Orçamento diário: ${formatCurrency(dailyBudget)}`);
    } else if (metrics.daysWithData > 0) {
      lines.push(`Média diária: ${formatCurrency(metrics.spend / metrics.daysWithData)}`);
    }

    lines.push(``);
    lines.push(`👥 *Alcance*`);
    if (metrics.reach > 0) {
      lines.push(`Pessoas alcançadas: ${formatNumber(metrics.reach)}`);
    }
    lines.push(`Visualizações do anúncio: ${formatNumber(metrics.impressions)}`);

    lines.push(``);
    lines.push(`👆 *Engajamento*`);
    lines.push(`Cliques no anúncio: ${formatNumber(metrics.clicks)}`);
    const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    lines.push(`Taxa de cliques: ${ctr.toFixed(2)}%`);

    if (metrics.conversions > 0) {
      const cpa = metrics.spend / metrics.conversions;
      lines.push(``);
      lines.push(`🎯 *Resultados*`);
      lines.push(`Conversões: ${formatNumber(metrics.conversions)}`);
      lines.push(`Custo por resultado: ${formatCurrency(cpa)}`);
    }

    if (metrics.revenue > 0) {
      const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
      lines.push(``);
      lines.push(`📈 *Retorno*`);
      lines.push(`Receita gerada: ${formatCurrency(metrics.revenue)}`);
      lines.push(`Retorno: ${roas.toFixed(2)}x (cada R$ 1 investido gerou R$ ${roas.toFixed(2)})`);
    }

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━`);
    lines.push(``);

    // Health assessment in simple language
    const healthScore = this.calculateSimpleHealth(ctr, metrics.spend, metrics.clicks, metrics.conversions, metrics.revenue);
    lines.push(healthScore);

    lines.push(``);
    lines.push(`_Atualização enviada em ${formatDate()} às ${formatTime()}_`);

    return lines.join('\n');
  }

  private calculateSimpleHealth(
    ctr: number,
    spend: number,
    clicks: number,
    conversions: number,
    revenue: number
  ): string {
    if (spend === 0) return `ℹ️ *Campanha ainda sem investimento registrado*`;

    const roas = spend > 0 ? revenue / spend : 0;
    const hasConversions = conversions > 0;
    const hasRevenue = revenue > 0;

    if (hasRevenue && roas >= 3) return `✅ *Excelente desempenho!* Retorno acima de 3x o investimento.`;
    if (hasRevenue && roas >= 1.5) return `✅ *Bom desempenho.* Campanha gerando retorno positivo.`;
    if (hasRevenue && roas >= 1) return `⚠️ *Atenção.* Retorno próximo do ponto de equilíbrio.`;
    if (hasRevenue && roas < 1) return `🔴 *Campanha com retorno negativo.* Sugerimos revisão.`;
    if (hasConversions && ctr >= 1.5) return `✅ *Bom desempenho.* Boa taxa de cliques e conversões.`;
    if (hasConversions) return `👍 *Desempenho razoável.* Campanha gerando resultados.`;
    if (ctr >= 2) return `✅ *Bom engajamento!* Alta taxa de cliques.`;
    if (ctr >= 1) return `👍 *Engajamento adequado.* Campanha performando dentro do esperado.`;
    if (ctr >= 0.5) return `⚠️ *Engajamento moderado.* Pode melhorar com ajustes nos criativos.`;
    return `🔴 *Engajamento baixo.* Sugerimos revisão dos criativos ou público.`;
  }

  async sendCampaignUpdate(userId: string, campaignId: string): Promise<{ sent: number; groups: string[] }> {
    if (!evolutionService.isConfigured()) {
      throw new Error('WhatsApp não está configurado');
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        platform: { userId },
      },
      include: {
        platform: true,
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) throw new Error('Campanha não encontrada');

    // Aggregate metrics
    const metrics = campaign.metrics || [];
    const totals = metrics.reduce(
      (acc, m) => ({
        spend: acc.spend + (m.spend || 0),
        impressions: acc.impressions + Number(m.impressions || 0),
        reach: acc.reach + Number(m.reach || 0),
        clicks: acc.clicks + Number(m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        revenue: acc.revenue + (m.revenue || 0),
      }),
      { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0 }
    );

    const message = this.formatCampaignUpdate(
      campaign.name,
      campaign.status,
      { ...totals, daysWithData: metrics.length },
      campaign.dailyBudget
    );

    // Find groups linked to this campaign's platform
    const groups = await prisma.whatsAppGroup.findMany({
      where: {
        userId,
        isActive: true,
        platformIds: { has: campaign.platformId },
      },
    });

    if (groups.length === 0) {
      const platformName = campaign.platform?.name || 'Sem nome';
      const platformExtId = campaign.platform?.externalId || '';
      const platformType = campaign.platform?.type || '';

      // Fetch existing groups to help user identify the issue
      const existingGroups = await prisma.whatsAppGroup.findMany({
        where: { userId, isActive: true },
        select: { groupName: true, platformIds: true },
      });

      let hint = '';
      if (existingGroups.length === 0) {
        hint = 'Você ainda não tem nenhum grupo de WhatsApp cadastrado. Vá em WhatsApp e cadastre um grupo.';
      } else {
        const groupNames = existingGroups.map(g => g.groupName).join(', ');
        hint = `Grupos existentes: ${groupNames}. Vá em WhatsApp > Editar grupo e adicione a conta "${platformName}" na lista de contas vinculadas.`;
      }

      throw new Error(
        `A conta de anúncio "${platformName}" (${platformType}${platformExtId ? `, ID: ${platformExtId}` : ''}) não está vinculada a nenhum grupo de WhatsApp. ${hint}`
      );
    }

    const sentTo: string[] = [];
    for (const group of groups) {
      try {
        await evolutionService.sendTextMessage(group.groupJid, message);
        sentTo.push(group.groupName);
      } catch (err: any) {
        logger.warn(`WhatsApp update failed for group ${group.groupJid}:`, err.message);
      }
    }

    return { sent: sentTo.length, groups: sentTo };
  }

  async notifyGroups(
    userId: string,
    eventType: EventType,
    data: {
      campaign?: { id?: string; name: string; platformType?: string; platformId?: string; dailyBudget?: number | null };
      oldStatus?: string;
      newStatus?: string;
      oldBudget?: number;
      newBudget?: number;
      rule?: { name: string };
      action?: string;
      metricValue?: number;
      alertType?: string;
      metrics?: any;
      reportTitle?: string;
      template?: string;
      period?: string;
    }
  ): Promise<void> {
    if (!evolutionService.isConfigured()) {
      logger.debug('WhatsApp notification skipped: Evolution API not configured');
      return;
    }

    // SEGURANÇA: platformId é OBRIGATÓRIO para garantir isolamento entre clientes
    // Sem platformId, não envia para nenhum grupo (previne vazamento de dados)
    const platformId = data.campaign?.platformId;
    if (!platformId) {
      logger.warn('WhatsApp notification skipped: no platformId provided (data isolation)');
      return;
    }

    try {
      // Find groups that have THIS specific platform linked
      const groups = await prisma.whatsAppGroup.findMany({
        where: {
          userId,
          isActive: true,
          platformIds: { has: platformId },
        },
      });

      if (groups.length === 0) return;

      // Format message based on event type
      let message: string | null = null;

      switch (eventType) {
        case 'STATUS_CHANGE':
          if (!data.campaign || !data.oldStatus || !data.newStatus) break;
          message = this.formatStatusChange(data.campaign.name, data.oldStatus, data.newStatus);
          break;

        case 'BUDGET_CHANGE':
          if (!data.campaign || data.oldBudget === undefined || data.newBudget === undefined) break;
          message = this.formatBudgetChange(data.campaign.name, data.oldBudget, data.newBudget);
          break;

        case 'CAMPAIGN_CREATED':
          if (!data.campaign) break;
          message = this.formatCampaignCreated(data.campaign.name, data.campaign.platformType || 'N/A');
          break;

        case 'AUTOMATION_TRIGGERED':
          if (!data.rule || !data.campaign || !data.action || data.metricValue === undefined) break;
          message = this.formatAutomationTriggered(data.rule.name, data.campaign.name, data.action, data.metricValue);
          break;

        case 'PERFORMANCE_ALERT':
          if (!data.campaign || !data.alertType) break;
          message = this.formatPerformanceAlert(data.campaign.name, data.alertType, data.metrics || {});
          break;

        case 'REPORT_GENERATED':
          if (data.reportTitle) {
            message = [
              `📄 *Relatório Gerado*`,
              ``,
              `Título: *${data.reportTitle}*`,
              data.period ? `Período: ${data.period}` : '',
              ``,
              `Gerado em ${formatDate()} às ${formatTime()}`,
            ].filter(Boolean).join('\n');
          }
          break;

        case 'BILLING_PAUSE':
          if (!data.campaign || !data.metrics?.reason) break;
          message = this.formatBillingPause(data.campaign.name, data.metrics.reason, data.campaign.dailyBudget);
          break;

        case 'SCHEDULED_PAUSE':
          if (!data.campaign) break;
          message = this.formatScheduledAction(data.campaign.name, 'paused', data.metrics?.nextAction);
          break;

        case 'SCHEDULED_RESUME':
          if (!data.campaign) break;
          message = this.formatScheduledAction(data.campaign.name, 'resumed', data.metrics?.nextAction);
          break;
      }

      if (!message) return;

      // Check notification preferences and send
      const notifField: Record<EventType, string> = {
        STATUS_CHANGE: 'notifyStatusChange',
        BUDGET_CHANGE: 'notifyBudgetChange',
        CAMPAIGN_CREATED: 'notifyStatusChange',
        AUTOMATION_TRIGGERED: 'notifyStatusChange',
        PERFORMANCE_ALERT: 'notifyPerformance',
        DAILY_SUMMARY: 'notifyDailySummary',
        REPORT_GENERATED: 'notifyDailySummary',
        BILLING_PAUSE: 'notifyStatusChange',
        SCHEDULED_PAUSE: 'notifyStatusChange',
        SCHEDULED_RESUME: 'notifyStatusChange',
      };

      const field = notifField[eventType];

      for (const group of groups) {
        if (!(group as any)[field]) continue;

        try {
          await evolutionService.sendTextMessage(group.groupJid, message);
        } catch (err: any) {
          logger.warn(`WhatsApp notification failed for group ${group.groupJid}:`, err.message);
        }
      }
    } catch (error: any) {
      logger.error('WhatsApp notifyGroups error:', error.message);
    }
  }
}

function numberEmoji(n: number): string {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return emojis[n - 1] || `${n}.`;
}

export const whatsAppNotificationsService = new WhatsAppNotificationsService();
