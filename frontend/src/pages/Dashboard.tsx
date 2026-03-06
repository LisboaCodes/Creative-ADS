import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Target,
  Filter,
  Lightbulb,
  AlertTriangle,
  Info,
  BarChart3,
  Calendar,
  Minus,
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
  metric?: string;
  value?: number;
  suggestion?: string;
}

interface ForecastData {
  projectedDailySpend: number;
  projected30dSpend: number;
  projectedDailyClicks: number;
  projected30dClicks: number;
  projectedDailyConversions: number;
  projected30dConversions: number;
  projectedDailyRevenue: number;
  projected30dRevenue: number;
  projectedROAS: number;
  projectedCPC: number;
  projectedCPA: number;
  projectedConversionRate: number;
  basedOnDays: number;
  campaignCount: number;
}

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default function Dashboard() {
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

  // Fetch connected platforms for the filter dropdown
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  const platformIdParam = selectedPlatformId !== 'all' ? selectedPlatformId : undefined;

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

  // Fetch time-series data for the spending chart
  const { data: timeSeries } = useQuery({
    queryKey: ['time-series-metrics', startDate, endDate, platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/metrics/time-series', {
        params: { startDate, endDate, groupBy: 'day', platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Fetch by-platform data for the distribution chart
  const { data: platformData } = useQuery({
    queryKey: ['platform-metrics', startDate, endDate, platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/metrics/by-platform', {
        params: { startDate, endDate, platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Fetch campaigns for Quick Stats
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-stats', platformIdParam],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: { limit: 100, platformId: platformIdParam },
      });
      return response.data.data;
    },
  });

  // Fetch proactive AI insights
  const { data: insights } = useQuery({
    queryKey: ['proactive-insights'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns/insights');
      return res.data.data;
    },
  });

  // Fetch budget forecast
  const { data: forecast } = useQuery({
    queryKey: ['campaign-forecast'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns/forecast');
      return res.data.data;
    },
  });

  // Calculate quick stats from real data
  const activeCampaigns = campaignsData?.campaigns?.filter((c: any) => c.status === 'ACTIVE').length || 0;
  const pausedCampaigns = campaignsData?.campaigns?.filter((c: any) => c.status === 'PAUSED').length || 0;
  const connectedPlatforms = campaignsData?.campaigns
    ? new Set(campaignsData.campaigns.map((c: any) => c.platformType)).size
    : 0;

  // Calculate real percentage changes from current vs previous period
  const spendChange = metrics && prevMetrics
    ? calcPercentChange(metrics.spend, prevMetrics.spend)
    : null;
  const roasChange = metrics && prevMetrics && metrics.revenue > 0 && prevMetrics.revenue > 0
    ? calcPercentChange(metrics.roas, prevMetrics.roas)
    : null;
  const clicksChange = metrics && prevMetrics
    ? calcPercentChange(metrics.clicks, prevMetrics.clicks)
    : null;
  const conversionsChange = metrics && prevMetrics
    ? calcPercentChange(metrics.conversions, prevMetrics.conversions)
    : null;

  function formatTrend(change: number | null): { text: string; up: boolean | null } {
    if (change === null) return { text: '', up: null };
    if (change === 0) return { text: '0,0%', up: null };
    const abs = Math.abs(change);
    const formatted = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
    return {
      text: `${change > 0 ? '+' : '-'}${formatted}%`,
      up: change > 0,
    };
  }

  const spendTrend = formatTrend(spendChange);
  const roasTrend = formatTrend(roasChange);
  const clicksTrend = formatTrend(clicksChange);
  const conversionsTrend = formatTrend(conversionsChange);

  // Stat Cards Configuration with real trends
  const stats = [
    {
      name: 'Gasto Total',
      value: metrics ? formatCurrency(metrics.spend) : '-',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: spendTrend.text,
      trendUp: spendTrend.up,
    },
    {
      name: 'ROAS',
      value: metrics ? (metrics.revenue > 0 ? `${metrics.roas}x` : 'N/A') : '-',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: metrics?.revenue > 0 ? roasTrend.text : '',
      trendUp: roasTrend.up,
    },
    {
      name: 'Total de Cliques',
      value: metrics ? formatNumber(metrics.clicks) : '-',
      icon: MousePointerClick,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: clicksTrend.text,
      trendUp: clicksTrend.up,
    },
    {
      name: 'Conversões',
      value: metrics ? formatNumber(metrics.conversions) : '-',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: conversionsTrend.text,
      trendUp: conversionsTrend.up,
    },
  ];

  // Build Spending Over Time chart from real time-series data
  const spendChartCategories = timeSeries?.map((item: any) => format(new Date(item.date), 'MMM dd')) || [];
  const spendChartData = timeSeries?.map((item: any) => item.spend) || [];

  const spendChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
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
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value),
      },
    },
  };

  const spendChartSeries = [
    {
      name: 'Gasto',
      data: spendChartData,
    },
  ];

  // Build Platform Distribution chart from real data
  const platformLabels = platformData?.map((p: any) => {
    const nameMap: Record<string, string> = {
      FACEBOOK: 'Facebook',
      INSTAGRAM: 'Instagram',
      GOOGLE_ADS: 'Google Ads',
      TIKTOK: 'TikTok',
      LINKEDIN: 'LinkedIn',
      TWITTER: 'Twitter',
      PINTEREST: 'Pinterest',
      SNAPCHAT: 'Snapchat',
    };
    return nameMap[p.platformType] || p.platformType;
  }) || [];
  const platformSpendData = platformData?.map((p: any) => Number(p.spend.toFixed(2))) || [];
  const platformColors: Record<string, string> = {
    FACEBOOK: '#1877F2',
    INSTAGRAM: '#E4405F',
    GOOGLE_ADS: '#4285F4',
    TIKTOK: '#000000',
    LINKEDIN: '#0A66C2',
    TWITTER: '#1DA1F2',
    PINTEREST: '#E60023',
    SNAPCHAT: '#FFFC00',
  };
  const platformColorArray = platformData?.map((p: any) => platformColors[p.platformType] || '#888888') || [];

  const platformChartOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: platformLabels,
    colors: platformColorArray.length > 0 ? platformColorArray : ['#888888'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value),
      },
    },
  };

  const platformChartSeries = platformSpendData;

  // Insight styling helpers
  const insightConfig: Record<string, { icon: typeof Lightbulb; color: string; bgColor: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
    opportunity: { icon: Lightbulb, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', badgeVariant: 'success' },
    warning: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', badgeVariant: 'destructive' },
    info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', badgeVariant: 'default' },
  };

  const insightTypeLabel: Record<string, string> = {
    opportunity: 'Oportunidade',
    warning: 'Alerta',
    info: 'Informação',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel
            {selectedPlatformId !== 'all' && platforms && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                - {platforms.find((p: any) => p.id === selectedPlatformId)?.name || ''}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho das suas campanhas em todas as plataformas
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
              <SelectTrigger className="w-[240px]">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const hasTrend = stat.trend !== '' && stat.trendUp !== null;
          const isNeutral = stat.trendUp === null;
          const TrendIcon = isNeutral ? Minus : (stat.trendUp ? ArrowUpRight : ArrowDownRight);

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
                {hasTrend ? (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon
                      className={`h-3 w-3 ${
                        isNeutral
                          ? 'text-muted-foreground'
                          : stat.trendUp
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isNeutral
                          ? 'text-muted-foreground'
                          : stat.trendUp
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}
                    >
                      {stat.trend}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      vs período anterior
                    </span>
                  </div>
                ) : stat.trend === '' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">Sem comparação disponível</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">Calculando...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {metrics && (
        <>
          {/* Charts Row */}
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

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Plataforma</CardTitle>
                <CardDescription>Distribuição de gastos por plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                {platformChartSeries.length > 0 ? (
                  <ReactApexChart
                    options={platformChartOptions}
                    series={platformChartSeries}
                    type="donut"
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Sem dados de plataforma disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights + Budget Forecast Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Proactive AI Insights Card */}
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
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {insights.map((insight: InsightItem, idx: number) => {
                      const config = insightConfig[insight.type] || insightConfig.info;
                      const InsightIcon = config.icon;
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 ${config.bgColor}`}
                        >
                          <div className="flex items-start gap-2">
                            <InsightIcon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{insight.title}</span>
                                <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                                  {insightTypeLabel[insight.type] || insight.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {insight.description}
                              </p>
                              {insight.suggestion && (
                                <p className="text-xs mt-1.5 font-medium">
                                  Sugestão: {insight.suggestion}
                                </p>
                              )}
                              {insight.metric && insight.value !== undefined && (
                                <div className="mt-1.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {insight.metric}: {typeof insight.value === 'number' ? formatNumber(insight.value) : insight.value}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhum insight disponível no momento</p>
                    <p className="text-xs mt-1">Os insights serão gerados conforme seus dados acumulam</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Forecast Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Projeção de Orçamento
                </CardTitle>
                <CardDescription>
                  Previsão para os próximos 30 dias
                  {(forecast as ForecastData)?.basedOnDays
                    ? ` (baseado em ${(forecast as ForecastData).basedOnDays} dias de dados)`
                    : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {forecast ? (
                  <div className="space-y-4">
                    {/* Main projected values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-blue-50 border-blue-200 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Gasto Projetado (30d)</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency((forecast as ForecastData).projected30dSpend)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency((forecast as ForecastData).projectedDailySpend)}/dia
                        </p>
                      </div>
                      <div className="rounded-lg border bg-green-50 border-green-200 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Receita Projetada (30d)</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency((forecast as ForecastData).projected30dRevenue)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency((forecast as ForecastData).projectedDailyRevenue)}/dia
                        </p>
                      </div>
                      <div className="rounded-lg border bg-purple-50 border-purple-200 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Cliques Projetados (30d)</p>
                        <p className="text-lg font-bold text-purple-700">
                          {formatNumber((forecast as ForecastData).projected30dClicks)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatNumber((forecast as ForecastData).projectedDailyClicks)}/dia
                        </p>
                      </div>
                      <div className="rounded-lg border bg-orange-50 border-orange-200 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Conversões Projetadas (30d)</p>
                        <p className="text-lg font-bold text-orange-700">
                          {formatNumber((forecast as ForecastData).projected30dConversions)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatNumber((forecast as ForecastData).projectedDailyConversions)}/dia
                        </p>
                      </div>
                    </div>

                    {/* Efficiency metrics */}
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Métricas de Eficiência Projetadas</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">ROAS</span>
                          <Badge variant="success">{(forecast as ForecastData).projectedROAS?.toFixed(2)}x</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">CPC</span>
                          <Badge variant="outline">{formatCurrency((forecast as ForecastData).projectedCPC)}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">CPA</span>
                          <Badge variant="outline">{formatCurrency((forecast as ForecastData).projectedCPA)}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Taxa Conv.</span>
                          <Badge variant="outline">{formatPercentage((forecast as ForecastData).projectedConversionRate)}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Campaign count info */}
                    {(forecast as ForecastData).campaignCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Baseado em {(forecast as ForecastData).campaignCount} campanha{(forecast as ForecastData).campaignCount !== 1 ? 's' : ''} ativa{(forecast as ForecastData).campaignCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Projeção indisponível</p>
                    <p className="text-xs mt-1">Necessário dados históricos para gerar projeções</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Métricas de Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impressões</span>
                  <span className="font-semibold">{formatNumber(metrics.impressions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alcance</span>
                  <span className="font-semibold">{formatNumber(metrics.reach)}</span>
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
                  <span className="text-sm text-muted-foreground">CPM</span>
                  <Badge variant="outline">{formatCurrency(metrics.cpm)}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Métricas de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de Conversões</span>
                  <span className="font-semibold">{formatNumber(metrics.conversions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                  <Badge variant="success">{formatPercentage(metrics.conversionRate)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Receita</span>
                  <span className="font-semibold">{formatCurrency(metrics.revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ROAS</span>
                  <Badge variant={metrics.revenue > 0 ? 'success' : 'secondary'}>
                    {metrics.revenue > 0 ? `${metrics.roas}x` : 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Rápido</CardTitle>
                <CardDescription>Indicadores-chave de desempenho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
                  <Badge>{activeCampaigns}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Campanhas Pausadas</span>
                  <Badge variant="secondary">{pausedCampaigns}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plataformas Conectadas</span>
                  <Badge variant="outline">{connectedPlatforms}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de Campanhas</span>
                  <Badge variant="outline">{campaignsData?.pagination?.total || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State */}
      {!metrics && (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem dados disponíveis</h3>
            <p className="text-muted-foreground mb-4">
              Conecte uma plataforma para começar a acompanhar o desempenho das suas campanhas
            </p>
            <Badge variant="outline">Começar</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
