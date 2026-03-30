/**
 * Build detailed context for a specific campaign the user is asking about
 */
export function buildCampaignFocusContext(campaign: any): string {
  const metrics = campaign.metrics || [];
  const creatives = campaign.adCreatives || [];

  // Aggregate totals
  const totals = metrics.reduce(
    (acc: any, m: any) => ({
      impressions: acc.impressions + Number(m.impressions || 0),
      reach: acc.reach + Number(m.reach || 0),
      clicks: acc.clicks + Number(m.clicks || 0),
      spend: acc.spend + (m.spend || 0),
      conversions: acc.conversions + (m.conversions || 0),
      revenue: acc.revenue + (m.revenue || 0),
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  // Last 7 days only (compact format, one line per day)
  const recentMetrics = metrics.slice(0, 7);
  const dailyLines = recentMetrics.length > 0
    ? recentMetrics.map((m: any) => {
        const d = new Date(m.date).toISOString().split('T')[0];
        return `${d}: imp=${Number(m.impressions)} cli=${Number(m.clicks)} ctr=${(m.ctr||0).toFixed(1)}% gasto=R$${(m.spend||0).toFixed(2)} conv=${m.conversions||0} rec=R$${(m.revenue||0).toFixed(2)} roas=${(m.roas||0).toFixed(1)}x`;
      }).join('\n')
    : 'Sem dados diarios.';

  // Creatives (compact)
  const creativesInfo = creatives.length > 0
    ? creatives.slice(0, 5).map((c: any) => `- ${c.name || 'Sem nome'}: ${(c.title || '')} | ${(c.body || '').slice(0, 60)}`).join('\n')
    : '';

  // Trend (only if enough data)
  let trendNote = '';
  if (recentMetrics.length >= 4) {
    const half = Math.floor(recentMetrics.length / 2);
    const oldSpend = recentMetrics.slice(half).reduce((s: number, m: any) => s + (m.spend || 0), 0);
    const newSpend = recentMetrics.slice(0, half).reduce((s: number, m: any) => s + (m.spend || 0), 0);
    if (oldSpend > 0) {
      const trend = ((newSpend - oldSpend) / oldSpend) * 100;
      trendNote = `\nTendencia gasto: ${trend > 0 ? '+' : ''}${trend.toFixed(0)}%`;
    }
  }

  return `

## CAMPANHA EM FOCO: ${campaign.name}
ID: ${campaign.id} | Status: ${campaign.status} | ${campaign.platformType}
Orc.Diario: ${campaign.dailyBudget ? `R$${campaign.dailyBudget.toFixed(2)}` : '-'} | Orc.Vitalicio: ${campaign.lifetimeBudget ? `R$${campaign.lifetimeBudget.toFixed(2)}` : '-'}
Periodo: ${campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '-'} a ${campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : 'presente'}

Totais: Gasto=R$${totals.spend.toFixed(2)} Imp=${totals.impressions} Cli=${totals.clicks} CTR=${ctr.toFixed(2)}% CPC=R$${cpc.toFixed(2)} CPM=R$${cpm.toFixed(2)} Conv=${totals.conversions} TxConv=${convRate.toFixed(2)}% Rec=R$${totals.revenue.toFixed(2)} ROAS=${roas.toFixed(2)}x

Ultimos ${recentMetrics.length} dias:
${dailyLines}${trendNote}
${creativesInfo ? `\nCriativos:\n${creativesInfo}` : ''}

Qualidade: CTR=${ctr >= 1.5 ? 'BOM' : ctr >= 0.5 ? 'MEDIO' : 'RUIM'} CPC=${cpc <= 2 ? 'BOM' : cpc <= 5 ? 'MEDIO' : 'ALTO'} ROAS=${roas >= 3 ? 'EXCELENTE' : roas >= 1 ? 'POSITIVO' : 'NEGATIVO'}

Analise esta campanha detalhadamente com recomendacoes concretas.`;
}

export function buildSystemPrompt(context: {
  metricsOverview: any;
  activeCampaignsWithMetrics: any[];
  activeCampaignsNoMetrics: number;
  pausedCampaigns: number;
  totalCampaigns: number;
  platformSummary: any[];
}): string {
  const o = context.metricsOverview;

  // Compact campaign list (one line each)
  const campaignLines = context.activeCampaignsWithMetrics
    .map((c) => `${c.name.slice(0, 30)}|${c.platformType}|R$${c.totalSpend.toFixed(0)}|${c.totalClicks}cli|${c.avgCtr.toFixed(1)}%ctr|R$${c.avgCpc.toFixed(2)}cpc|${c.avgRoas.toFixed(1)}xroas|${c.id}`)
    .join('\n');

  const platformLines = context.platformSummary
    .map((p) => `${p.platformType}: R$${p.spend?.toFixed(0)||'0'} gasto, ${p.clicks||0} cli, ${p.conversions||0} conv, R$${p.revenue?.toFixed(0)||'0'} rec`)
    .join('\n');

  return `Voce e um agente de trafego pago. Analisa campanhas e sugere otimizacoes baseadas em dados reais. Responda em PT-BR, seja direto.

BENCHMARKS: CTR bom>1.5% ruim<0.5% | CPC bom<R$2 alto>R$5 | ROAS bom>3x ruim<1x | CPM bom<R$20 alto>R$50

ACOES DISPONIVEIS (inclua <actions>[json]</actions> quando sugerir):
- PAUSE_CAMPAIGN: {campaignId, parameters:{}, reason:"..."}
- ACTIVATE_CAMPAIGN: {campaignId, parameters:{}, reason:"..."}
- UPDATE_BUDGET: {campaignId, parameters:{dailyBudget:N}, reason:"..."}
- CREATE_CAMPAIGN: {parameters:{name,objective,dailyBudget,targeting}, reason:"..."}

DADOS DO USUARIO (30d):
Geral: R$${o?.spend?.toFixed(2)||'0'} gasto | ${o?.impressions||0} imp | ${o?.clicks||0} cli | ${o?.conversions||0} conv | R$${o?.revenue?.toFixed(2)||'0'} rec | CTR=${o?.ctr?.toFixed(2)||'0'}% | CPC=R$${o?.cpc?.toFixed(2)||'0'} | ROAS=${o?.roas?.toFixed(2)||'0'}x
Campanhas: ${context.totalCampaigns} total | ${context.activeCampaignsWithMetrics.length} ativas c/ gasto | ${context.activeCampaignsNoMetrics} ativas s/ gasto | ${context.pausedCampaigns} pausadas

Top campanhas (nome|plat|gasto|cliques|ctr|cpc|roas|id):
${campaignLines || 'Nenhuma com dados.'}
${context.activeCampaignsWithMetrics.length > 10 ? `+${context.activeCampaignsWithMetrics.length - 10} campanhas omitidas` : ''}

Por plataforma:
${platformLines || 'Sem dados.'}

Ao responder sobre performance, agrupe campanhas por qualidade (Excelente/Boa/Atencao). Campanhas sem dados: mencione apenas a contagem. Nunca sugira deletar, apenas pausar.`;
}

/**
 * Build prompt for client briefing generation
 */
export function buildClientBriefingPrompt(context: {
  platformName: string;
  platformType: string;
  period: { start: string; end: string };
  campaigns: Array<{
    name: string;
    status: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    revenue: number;
    ctr: number;
    roas: number;
  }>;
  overview: {
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    revenue: number;
  };
}): string {
  const campaignsTable = context.campaigns
    .map(
      (c) =>
        `| ${c.name} | ${c.status} | R$${c.spend.toFixed(2)} | ${c.clicks} | ${c.impressions} | ${c.ctr.toFixed(2)}% | ${c.conversions} | R$${c.revenue.toFixed(2)} | ${c.roas.toFixed(2)}x |`
    )
    .join('\n');

  return `Voce e um gestor de trafego pago profissional preparando um briefing para apresentar ao cliente.

Gere um briefing COMPLETO e PROFISSIONAL em PT-BR. Estrutura:
1. RESUMO EXECUTIVO (3-4 frases, investimento total, resultados, ROAS)
2. DESEMPENHO POR CAMPANHA (para cada ativa com gasto: metricas + avaliacao + acao recomendada)
3. PONTOS POSITIVOS (3-5 destaques com numeros)
4. PONTOS DE ATENCAO (problemas + solucoes propostas)
5. RECOMENDACOES PROXIMO PERIODO (3-5 concretas com justificativa)
6. SUGESTOES DE FALA (frases prontas para reuniao)
7. PERGUNTAS FREQUENTES COM RESPOSTAS (3-5)

DADOS:
Cliente: ${context.platformName} | ${context.platformType} | ${context.period.start} a ${context.period.end}
Totais: R$${context.overview.spend.toFixed(2)} gasto | ${context.overview.clicks} cli | ${context.overview.impressions} imp | ${context.overview.conversions} conv | R$${context.overview.revenue.toFixed(2)} rec

| Campanha | Status | Gasto | Cliques | Impressoes | CTR | Conv. | Receita | ROAS |
|----------|--------|-------|---------|------------|-----|-------|---------|------|
${campaignsTable}

Gere o briefing com formatacao rica markdown.`;
}

/**
 * Build prompt for AI automation rule suggestions
 */
export function buildAutomationSuggestPrompt(context: {
  campaigns: Array<{
    id: string; name: string; status: string; platformType: string;
    dailyBudget: number | null;
    spend: number; clicks: number; impressions: number;
    conversions: number; revenue: number;
    ctr: number; cpc: number; cpm: number; roas: number;
  }>;
  existingRules: Array<{
    name: string; ruleType: string; metric: string;
    operator: string; value: number; actionType: string;
  }>;
  metricsOverview: {
    spend: number; clicks: number; impressions: number;
    conversions: number; revenue: number;
    ctr: number; cpc: number; roas: number;
  };
}): string {
  const campaignLines = context.campaigns
    .map((c) => `- ${c.name} (${c.platformType}, ${c.status}): gasto=R$${c.spend.toFixed(2)} cli=${c.clicks} imp=${c.impressions} conv=${c.conversions} rec=R$${c.revenue.toFixed(2)} ctr=${c.ctr.toFixed(2)}% cpc=R$${c.cpc.toFixed(2)} cpm=R$${c.cpm.toFixed(2)} roas=${c.roas.toFixed(2)}x budget=${c.dailyBudget ? `R$${c.dailyBudget.toFixed(2)}` : '-'}`)
    .join('\n');

  const existingLines = context.existingRules.length > 0
    ? context.existingRules.map((r) => `- ${r.name}: ${r.ruleType} | ${r.metric} ${r.operator} ${r.value} -> ${r.actionType}`).join('\n')
    : 'Nenhuma regra existente.';

  const o = context.metricsOverview;

  return `Voce e um especialista em automacao de trafego pago. Analise os dados reais das campanhas abaixo e sugira regras de automacao praticas.

BENCHMARKS: CTR bom>1.5% ruim<0.5% | CPC bom<R$2 alto>R$5 | ROAS bom>3x ruim<1x | CPM bom<R$20 alto>R$50

METRICAS GERAIS (30d): gasto=R$${o.spend.toFixed(2)} cli=${o.clicks} imp=${o.impressions} conv=${o.conversions} rec=R$${o.revenue.toFixed(2)} ctr=${o.ctr.toFixed(2)}% cpc=R$${o.cpc.toFixed(2)} roas=${o.roas.toFixed(2)}x

CAMPANHAS:
${campaignLines || 'Nenhuma campanha encontrada.'}

REGRAS JA EXISTENTES (nao duplicar):
${existingLines}

INSTRUCOES:
- Sugira de 3 a 8 regras de automacao baseadas nos dados reais
- Cada regra deve ter justificativa concreta baseada nos numeros
- Tipos permitidos: simple, compound, scaling, anomaly, auto_restart
- Metricas permitidas: ctr, cpc, cpm, roas, spend, conversions
- Operadores permitidos: lt, gt, lte, gte, eq
- Acoes permitidas: pause, activate, increase_budget, decrease_budget, notify
- applyTo: "all", "active", "paused" ou "specific"
- NAO duplique regras ja existentes
- Retorne APENAS um JSON array puro, sem markdown, sem explicacao fora do JSON

Formato de cada objeto:
{
  "name": "Nome curto da regra",
  "description": "Descricao clara do que a regra faz",
  "reasoning": "Justificativa baseada nos dados reais das campanhas",
  "ruleType": "simple",
  "metric": "ctr",
  "operator": "lt",
  "value": 0.5,
  "periodDays": 7,
  "actionType": "pause",
  "actionValue": null,
  "applyTo": "active",
  "config": null,
  "conditions": null,
  "conditionLogic": null
}

Responda SOMENTE com o JSON array.`;
}
