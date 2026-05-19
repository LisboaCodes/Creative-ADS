import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Lightbulb,
  AlertTriangle,
  Info,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

type PeriodOption = 7 | 14 | 30 | 90;

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

const PERIOD_LABEL: Record<PeriodOption, string> = {
  7: 'últimos 7 dias',
  14: 'últimos 14 dias',
  30: 'últimos 30 dias',
  90: 'últimos 90 dias',
};

interface InsightItem {
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  suggestion?: string;
}

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatTrend(change: number | null): { text: string; up: boolean | null } {
  if (change === null) return { text: '', up: null };
  if (change === 0) return { text: '0,0%', up: null };
  const abs = Math.abs(change);
  const formatted = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return { text: `${change > 0 ? '+' : '-'}${formatted}%`, up: change > 0 };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodOption>(30);

  // Current period date range
  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfDay(subDays(new Date(), period)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  }), [period]);

  // Previous period date range (same length, immediately before current period)
  const { prevStartDate, prevEndDate } = useMemo(() => ({
    prevStartDate: startOfDay(subDays(new Date(), period * 2)).toISOString(),
    prevEndDate: endOfDay(subDays(new Date(), period + 1)).toISOString(),
  }), [period]);

  const platformIdParam = selectedPlatformId !== 'all' ? selectedPlatformId : undefined;

  // Connected platforms for the filter dropdown
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  // Current period metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['overview-metrics', startDate, endDate, platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/metrics/overview', {
        params: { startDate, endDate, platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Previous period metrics (for comparison)
  const { data: prevMetrics } = useQuery({
    queryKey: ['overview-metrics-prev', prevStartDate, prevEndDate, platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/metrics/overview', {
        params: { startDate: prevStartDate, endDate: prevEndDate, platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Time-series data for the spending chart
  const { data: timeSeries } = useQuery({
    queryKey: ['time-series-metrics', startDate, endDate, platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/metrics/time-series', {
        params: { startDate, endDate, groupBy: 'day', platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Campaigns (for the attention list + quick stats)
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-stats', platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: { limit: 100, platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Proactive AI insights
  const { data: insights } = useQuery({
    queryKey: ['proactive-insights'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns/insights');
      return res.data.data;
    },
  });

  const allCampaigns: any[] = campaignsData?.campaigns || [];
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'ACTIVE').length;
  const pausedCampaigns = allCampaigns.filter((c) => c.status === 'PAUSED').length;
  const connectedPlatforms = new Set(allCampaigns.map((c) => c.platformType)).size;

  // Campaigns that need attention: active, spending, and either no return or ROAS < 1
  const needsAttention = allCampaigns
    .filter(
      (c) =>
        c.status === 'ACTIVE' &&
        c.aggregated30d?.hasSpend &&
        (c.aggregated30d.totalRevenue === 0 || c.aggregated30d.avgRoas < 1)
    )
    .sort((a, b) => b.aggregated30d.totalSpend - a.aggregated30d.totalSpend)
    .slice(0, 6);

  // Percentage changes vs previous period
  const spendTrend = formatTrend(
    metrics && prevMetrics ? calcPercentChange(metrics.spend, prevMetrics.spend) : null
  );
  const roasTrend = formatTrend(
    metrics && prevMetrics && metrics.revenue > 0 && prevMetrics.revenue > 0
      ? calcPercentChange(metrics.roas, prevMetrics.roas)
      : null
  );
  const clicksTrend = formatTrend(
    metrics && prevMetrics ? calcPercentChange(metrics.clicks, prevMetrics.clicks) : null
  );
  const conversionsTrend = formatTrend(
    metrics && prevMetrics ? calcPercentChange(metrics.conversions, prevMetrics.conversions) : null
  );

  const stats = [
    {
      name: 'Gasto Total',
      value: metrics ? formatCurrency(metrics.spend) : '-',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: spendTrend,
    },
    {
      name: 'ROAS',
      value: metrics ? (metrics.revenue > 0 ? `${metrics.roas}x` : 'N/A') : '-',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: metrics?.revenue > 0 ? roasTrend : { text: '', up: null },
    },
    {
      name: 'Total de Cliques',
      value: metrics ? formatNumber(metrics.clicks) : '-',
      icon: MousePointerClick,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: clicksTrend,
    },
    {
      name: 'Conversões',
      value: metrics ? formatNumber(metrics.conversions) : '-',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: conversionsTrend,
    },
  ];

  // Spending Over Time chart
  const spendChartCategories = timeSeries?.map((item: any) => format(new Date(item.date), 'dd/MM')) || [];
  const spendChartData = timeSeries?.map((item: any) => item.spend) || [];

  const spendChartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 },
    },
    xaxis: {
      categories: spendChartCategories,
      labels: {
        rotate: -45,
        rotateAlways: spendChartCategories.length > 10,
        style: { fontSize: '10px' },
      },
    },
    colors: ['#3B82F6'],
    tooltip: { y: { formatter: (value) => formatCurrency(value) } },
  };

  const spendChartSeries = [{ name: 'Gasto', data: spendChartData }];

  const insightConfig: Record<
    string,
    { icon: typeof Lightbulb; color: string; bgColor: string }
  > = {
    opportunity: {
      icon: Lightbulb,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    },
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const selectedPlatformName =
    selectedPlatformId !== 'all'
      ? platforms?.find((p: any) => p.id === selectedPlatformId)?.name
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel
            {selectedPlatformName && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                - {selectedPlatformName}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Desempenho das campanhas nos {PERIOD_LABEL[period]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {/* Platform Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {platforms?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!metrics ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem dados disponíveis</h3>
            <p className="text-muted-foreground mb-4">
              Conecte uma plataforma e sincronize para acompanhar suas campanhas
            </p>
            <Button onClick={() => navigate('/platforms')}>Conectar plataforma</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const { text, up } = stat.trend;
              const isNeutral = up === null;
              const TrendIcon = isNeutral ? Minus : up ? ArrowUpRight : ArrowDownRight;
              const trendColor = isNeutral
                ? 'text-muted-foreground'
                : up
                  ? 'text-green-600'
                  : 'text-red-600';

              return (
                <Card key={stat.name}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.name}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2 rounded-lg`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {text ? (
                        <>
                          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                          <span className={`text-xs ${trendColor}`}>{text}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            vs período anterior
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem comparação disponível
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Chart + Attention Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Gastos ao Longo do Tempo</CardTitle>
                <CardDescription>Tendência de gastos dos {PERIOD_LABEL[period]}</CardDescription>
              </CardHeader>
              <CardContent>
                {spendChartData.length > 0 ? (
                  <ReactApexChart
                    options={spendChartOptions}
                    series={spendChartSeries}
                    type="area"
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados de gastos para este período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaigns That Need Attention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Precisa de Atenção
                </CardTitle>
                <CardDescription>
                  Campanhas ativas gastando sem retorno (últimos 30 dias)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {needsAttention.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {needsAttention.map((c) => {
                      const noReturn = c.aggregated30d.totalRevenue === 0;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/campaigns/${c.id}`)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(c.aggregated30d.totalSpend)} gasto ·{' '}
                              {formatNumber(c.aggregated30d.totalClicks)} cliques
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="destructive" className="text-xs">
                              {noReturn
                                ? 'Sem retorno'
                                : `ROAS ${c.aggregated30d.avgRoas.toFixed(2)}x`}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                    <p className="text-sm font-medium text-foreground">Tudo certo</p>
                    <p className="text-xs mt-1">
                      Nenhuma campanha ativa gastando sem retorno
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights + Quick Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Insights da IA
                </CardTitle>
                <CardDescription>Análise proativa das suas campanhas</CardDescription>
              </CardHeader>
              <CardContent>
                {insights && insights.length > 0 ? (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {insights.map((insight: InsightItem, idx: number) => {
                      const config = insightConfig[insight.type] || insightConfig.info;
                      const InsightIcon = config.icon;
                      return (
                        <div key={idx} className={`rounded-lg border p-3 ${config.bgColor}`}>
                          <div className="flex items-start gap-2">
                            <InsightIcon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1">{insight.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {insight.description}
                              </p>
                              {insight.suggestion && (
                                <p className="text-xs mt-1.5 font-medium">
                                  Sugestão: {insight.suggestion}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhum insight disponível no momento</p>
                    <p className="text-xs mt-1">
                      Os insights aparecem conforme seus dados acumulam
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Rápido</CardTitle>
                <CardDescription>Indicadores-chave dos {PERIOD_LABEL[period]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impressões</span>
                  <span className="font-semibold">{formatNumber(metrics.impressions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CTR</span>
                  <Badge variant="outline">{formatPercentage(metrics.ctr)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CPC</span>
                  <Badge variant="outline">{formatCurrency(metrics.cpc)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                  <Badge variant="success">{formatPercentage(metrics.conversionRate)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Receita</span>
                  <span className="font-semibold">{formatCurrency(metrics.revenue)}</span>
                </div>
                <div className="border-t pt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{activeCampaigns}</p>
                    <p className="text-xs text-muted-foreground">Ativas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{pausedCampaigns}</p>
                    <p className="text-xs text-muted-foreground">Pausadas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{connectedPlatforms}</p>
                    <p className="text-xs text-muted-foreground">Plataformas</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/campaigns')}
                >
                  Ver todas as campanhas
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
