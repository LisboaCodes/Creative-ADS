import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import api from '../services/api';
import { formatCurrency, formatNumber } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const periodPresets = [
  { label: 'Ultima Semana', days: 7 },
  { label: 'Ultimos 15 dias', days: 15 },
  { label: 'Ultimo Mes', days: 30 },
  { label: 'Ultimos 3 Meses', days: 90 },
  { label: 'Ultimos 6 Meses', days: 180 },
];

const groupByOptions = [
  { label: 'Semanal', value: 'week' as const },
  { label: 'Quinzenal', value: 'biweekly' as const },
  { label: 'Mensal', value: 'monthly' as const },
];

export default function Financial() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [groupBy, setGroupBy] = useState<'week' | 'biweekly' | 'monthly'>('week');
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');

  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfDay(subDays(new Date(), selectedPeriod)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  }), [selectedPeriod]);

  // Fetch platforms for filter
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await api.get('/api/platforms');
      return res.data.data;
    },
  });

  // Fetch financial data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial', startDate, endDate, groupBy, selectedPlatformId],
    queryFn: async () => {
      const params: any = { startDate, endDate, groupBy };
      if (selectedPlatformId) params.platformId = selectedPlatformId;
      const res = await api.get('/api/metrics/financial', { params });
      return res.data.data;
    },
  });

  const periods = financialData?.periods || [];
  const totals = financialData?.totals || {};

  // Calculate projection and variation
  const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAvg = daysElapsed > 0 ? (totals.spend || 0) / daysElapsed : 0;
  const monthProjection = dailyAvg * 30;

  // Variation vs previous period
  const prevStartDate = startOfDay(subDays(new Date(startDate), selectedPeriod)).toISOString();
  const { data: prevData } = useQuery({
    queryKey: ['financial-prev', prevStartDate, startDate, groupBy, selectedPlatformId],
    queryFn: async () => {
      const params: any = { startDate: prevStartDate, endDate: startDate, groupBy };
      if (selectedPlatformId) params.platformId = selectedPlatformId;
      const res = await api.get('/api/metrics/financial', { params });
      return res.data.data;
    },
  });
  const prevTotals = prevData?.totals || {};
  const spendVariation = prevTotals.spend > 0 ? ((totals.spend - prevTotals.spend) / prevTotals.spend) * 100 : 0;

  const handleExportHtml = () => {
    const html = buildFinancialHtml(periods, totals, selectedPlatformId, startDate, endDate);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    const headers = ['Periodo', 'Campanhas', 'Gasto', 'Cliques', 'Conversoes', 'Receita', 'ROAS', 'Custo/Conv.'];
    const rows = periods.map((p: any) =>
      [p.period, p.campaignCount, p.spend.toFixed(2), p.clicks, p.conversions, p.revenue.toFixed(2),
       p.revenue > 0 ? p.roas.toFixed(2) : 'N/A', p.costPerConversion.toFixed(2)].join(',')
    );
    rows.push(['TOTAL', '-', (totals.spend || 0).toFixed(2), totals.clicks || 0, totals.conversions || 0,
      (totals.revenue || 0).toFixed(2), (totals.revenue || 0) > 0 ? (totals.roas || 0).toFixed(2) : 'N/A',
      (totals.costPerConversion || 0).toFixed(2)].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeiro.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Controle Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe gastos e retorno por periodo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportHtml}>
            <Download className="h-4 w-4 mr-2" />
            HTML
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Platform filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conta/Cliente</label>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedPlatformId}
                onChange={(e) => setSelectedPlatformId(e.target.value)}
              >
                <option value="">Todas as contas</option>
                {platforms?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            {/* Period filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Periodo</label>
              <div className="flex gap-1">
                {periodPresets.map((preset) => (
                  <Button
                    key={preset.days}
                    variant={selectedPeriod === preset.days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Group by */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agrupar por</label>
              <div className="flex gap-1">
                {groupByOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={groupBy === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Gasto
            </div>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totals.spend || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Media Diaria
            </div>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(dailyAvg)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              Projecao Mensal
            </div>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(monthProjection)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Variacao vs Anterior
            </div>
            <div className={`text-2xl font-bold ${spendVariation > 0 ? 'text-red-600' : spendVariation < 0 ? 'text-green-600' : ''}`}>
              {isLoading ? <Skeleton className="h-8 w-24" /> : `${spendVariation > 0 ? '+' : ''}${spendVariation.toFixed(1)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Periodo</CardTitle>
          <CardDescription>
            {periods.length} periodos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado financeiro para o periodo selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Periodo</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Campanhas</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Gasto</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cliques</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Conversoes</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">ROAS</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Custo/Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{p.period}</td>
                      <td className="py-2 px-3 text-right">{p.campaignCount}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(p.spend)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(p.clicks)}</td>
                      <td className="py-2 px-3 text-right">{p.conversions}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(p.revenue)}</td>
                      <td className="py-2 px-3 text-right">
                        {p.revenue > 0 ? (
                          <span className={p.roas >= 3 ? 'text-green-600' : p.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                            {p.roas.toFixed(2)}x
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">{formatCurrency(p.costPerConversion)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-2 px-3">TOTAL</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totals.spend || 0)}</td>
                    <td className="py-2 px-3 text-right">{formatNumber(totals.clicks || 0)}</td>
                    <td className="py-2 px-3 text-right">{totals.conversions || 0}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totals.revenue || 0)}</td>
                    <td className="py-2 px-3 text-right">
                      {(totals.revenue || 0) > 0 ? (
                        <span className={(totals.roas || 0) >= 3 ? 'text-green-600' : (totals.roas || 0) >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                          {(totals.roas || 0).toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totals.costPerConversion || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildFinancialHtml(periods: any[], totals: any, _platformId: string, startDate: string, endDate: string): string {
  const rows = periods.map((p: any) => `
    <tr>
      <td>${p.period}</td>
      <td class="text-end">${p.campaignCount}</td>
      <td class="text-end">R$${p.spend.toFixed(2)}</td>
      <td class="text-end">${p.clicks}</td>
      <td class="text-end">${p.conversions}</td>
      <td class="text-end">R$${p.revenue.toFixed(2)}</td>
      <td class="text-end">${p.revenue > 0 ? p.roas.toFixed(2) + 'x' : 'N/A'}</td>
      <td class="text-end">R$${p.costPerConversion.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatorio Financeiro - HackrAds</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 2rem; }
    .header { border-bottom: 3px solid #0d6efd; padding-bottom: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 1.5rem; text-align: center; }
    .kpi-value { font-size: 1.8rem; font-weight: bold; color: #0d6efd; }
    .kpi-label { font-size: 0.85rem; color: #6c757d; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatorio Financeiro</h1>
      <p class="text-muted">HackrAds | Periodo: ${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">R$${(totals.spend || 0).toFixed(2)}</div>
          <div class="kpi-label">Total Gasto</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">R$${(totals.revenue || 0).toFixed(2)}</div>
          <div class="kpi-label">Receita Total</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${(totals.revenue || 0) > 0 ? (totals.roas || 0).toFixed(2) + 'x' : 'N/A'}</div>
          <div class="kpi-label">ROAS</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">R$${(totals.costPerConversion || 0).toFixed(2)}</div>
          <div class="kpi-label">Custo/Conversao</div>
        </div>
      </div>
    </div>

    <table class="table table-striped table-hover">
      <thead class="table-dark">
        <tr>
          <th>Periodo</th>
          <th class="text-end">Campanhas</th>
          <th class="text-end">Gasto</th>
          <th class="text-end">Cliques</th>
          <th class="text-end">Conversoes</th>
          <th class="text-end">Receita</th>
          <th class="text-end">ROAS</th>
          <th class="text-end">Custo/Conv.</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot class="table-secondary fw-bold">
        <tr>
          <td>TOTAL</td>
          <td class="text-end">-</td>
          <td class="text-end">R$${(totals.spend || 0).toFixed(2)}</td>
          <td class="text-end">${totals.clicks || 0}</td>
          <td class="text-end">${totals.conversions || 0}</td>
          <td class="text-end">R$${(totals.revenue || 0).toFixed(2)}</td>
          <td class="text-end">${(totals.revenue || 0) > 0 ? (totals.roas || 0).toFixed(2) + 'x' : 'N/A'}</td>
          <td class="text-end">R$${(totals.costPerConversion || 0).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <footer class="text-center text-muted mt-4 pt-3 border-top">
      <small>Gerado automaticamente por HackrAds em ${new Date().toLocaleDateString('pt-BR')}</small>
    </footer>
  </div>
</body>
</html>`;
}
