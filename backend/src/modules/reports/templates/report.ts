interface ReportData {
  title: string;
  template: string;
  clientName?: string;
  platformName?: string;
  period: { start: string; end: string };
  overview: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
  };
  campaigns: Array<{
    name: string;
    status: string;
    platformType: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    revenue: number;
    ctr: number;
    roas: number;
  }>;
  financialPeriods?: Array<{
    period: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
  generatedAt: string;
}

export function buildReportHtml(data: ReportData): string {
  const campaignRows = data.campaigns
    .map(
      (c) => `
    <tr>
      <td>${c.name}</td>
      <td><span class="badge bg-${c.status === 'ACTIVE' ? 'success' : 'secondary'}">${c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}</span></td>
      <td>${c.platformType}</td>
      <td class="text-end">R$${c.spend.toFixed(2)}</td>
      <td class="text-end">${c.clicks.toLocaleString('pt-BR')}</td>
      <td class="text-end">${c.impressions.toLocaleString('pt-BR')}</td>
      <td class="text-end">${c.ctr.toFixed(2)}%</td>
      <td class="text-end">${c.conversions}</td>
      <td class="text-end">R$${c.revenue.toFixed(2)}</td>
      <td class="text-end">${c.revenue > 0 ? `<span class="text-${c.roas >= 3 ? 'success' : c.roas >= 1 ? 'warning' : 'danger'}">${c.roas.toFixed(2)}x</span>` : '<span class="text-muted">N/A</span>'}</td>
    </tr>`
    )
    .join('');

  const financialSection = data.financialPeriods?.length
    ? `
    <h3 class="mt-5 mb-3">Breakdown Financeiro</h3>
    <table class="table table-sm table-hover">
      <thead class="table-light">
        <tr>
          <th>Periodo</th>
          <th class="text-end">Gasto</th>
          <th class="text-end">Receita</th>
          <th class="text-end">ROAS</th>
        </tr>
      </thead>
      <tbody>
        ${data.financialPeriods.map(
          (p) => `
        <tr>
          <td>${p.period}</td>
          <td class="text-end">R$${p.spend.toFixed(2)}</td>
          <td class="text-end">R$${p.revenue.toFixed(2)}</td>
          <td class="text-end">${p.revenue > 0 ? p.roas.toFixed(2) + 'x' : 'N/A'}</td>
        </tr>`
        ).join('')}
      </tbody>
    </table>`
    : '';

  const isDetailed = data.template === 'detailed';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - Multi Ads</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; }
    .report-header { background: linear-gradient(135deg, #0d6efd, #6610f2); color: white; padding: 2rem; border-radius: 0 0 1rem 1rem; margin-bottom: 2rem; }
    .report-header h1 { margin: 0; font-size: 1.8rem; }
    .report-header p { margin: 0.5rem 0 0; opacity: 0.9; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0.75rem; padding: 1.25rem; text-align: center; }
    .kpi-value { font-size: 1.6rem; font-weight: 700; color: #0d6efd; }
    .kpi-label { font-size: 0.8rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title { color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 0.5rem; margin-top: 2rem; }
    .footer { text-align: center; padding: 2rem; color: #6c757d; font-size: 0.8rem; border-top: 1px solid #dee2e6; margin-top: 3rem; }
    @media print {
      .report-header { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-size: 11px; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="container">
      <h1>${data.title}</h1>
      <p>${data.clientName || data.platformName || 'Todas as contas'} | Periodo: ${data.period.start} a ${data.period.end}</p>
    </div>
  </div>

  <div class="container">
    <h2 class="section-title">Visao Geral</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">R$${data.overview.spend.toFixed(2)}</div>
        <div class="kpi-label">Investimento Total</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.overview.impressions.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Impressoes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.overview.clicks.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Cliques</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.overview.ctr.toFixed(2)}%</div>
        <div class="kpi-label">CTR</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.overview.conversions}</div>
        <div class="kpi-label">Conversoes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">R$${data.overview.revenue.toFixed(2)}</div>
        <div class="kpi-label">Receita</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">R$${data.overview.cpc.toFixed(2)}</div>
        <div class="kpi-label">CPC Medio</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.overview.revenue > 0 ? data.overview.roas.toFixed(2) + 'x' : 'N/A'}</div>
        <div class="kpi-label">ROAS</div>
      </div>
    </div>

    ${isDetailed || data.template === 'executive' ? `
    <h2 class="section-title">Campanhas</h2>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th>Campanha</th>
            <th>Status</th>
            <th>Plataforma</th>
            <th class="text-end">Gasto</th>
            <th class="text-end">Cliques</th>
            <th class="text-end">Impressoes</th>
            <th class="text-end">CTR</th>
            <th class="text-end">Conv.</th>
            <th class="text-end">Receita</th>
            <th class="text-end">ROAS</th>
          </tr>
        </thead>
        <tbody>${campaignRows}</tbody>
      </table>
    </div>` : ''}

    ${financialSection}

    <div class="footer">
      <p>Relatorio gerado automaticamente por <strong>Multi Ads Platform</strong></p>
      <p>${data.generatedAt}</p>
    </div>
  </div>
</body>
</html>`;
}
