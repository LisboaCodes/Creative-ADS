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
  Target
} from 'lucide-react';
import { subDays, format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export default function Dashboard() {
  const startDate = subDays(new Date(), 30).toISOString();
  const endDate = new Date().toISOString();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['overview-metrics', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/api/metrics/overview', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
  });

  // Fetch time-series data for the spending chart
  const { data: timeSeries } = useQuery({
    queryKey: ['time-series-metrics', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/api/metrics/time-series', {
        params: { startDate, endDate, groupBy: 'day' },
      });
      return response.data.data;
    },
  });

  // Fetch by-platform data for the distribution chart
  const { data: platformData } = useQuery({
    queryKey: ['platform-metrics', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/api/metrics/by-platform', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
  });

  // Fetch campaigns for Quick Stats
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-stats'],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: { limit: 100 },
      });
      return response.data.data;
    },
  });

  // Calculate quick stats from real data
  const activeCampaigns = campaignsData?.campaigns?.filter((c: any) => c.status === 'ACTIVE').length || 0;
  const pausedCampaigns = campaignsData?.campaigns?.filter((c: any) => c.status === 'PAUSED').length || 0;
  const connectedPlatforms = campaignsData?.campaigns
    ? new Set(campaignsData.campaigns.map((c: any) => c.platformType)).size
    : 0;

  // Stat Cards Configuration
  const stats = [
    {
      name: 'Total Spend',
      value: metrics ? formatCurrency(metrics.spend) : '-',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      name: 'ROAS',
      value: metrics ? `${metrics.roas}x` : '-',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: '+8.2%',
      trendUp: true,
    },
    {
      name: 'Total Clicks',
      value: metrics ? formatNumber(metrics.clicks) : '-',
      icon: MousePointerClick,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+15.3%',
      trendUp: true,
    },
    {
      name: 'Conversions',
      value: metrics ? formatNumber(metrics.conversions) : '-',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: '-2.4%',
      trendUp: false,
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
      name: 'Spend',
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your advertising performance across all platforms
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendUp ? ArrowUpRight : ArrowDownRight;

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
                  <TrendIcon
                    className={`h-3 w-3 ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}
                  />
                  <span className={`text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                </div>
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
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>Last 30 days spending trend</CardDescription>
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
                    No spending data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
                <CardDescription>Spend distribution by platform</CardDescription>
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
                    No platform data available
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
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impressions</span>
                  <span className="font-semibold">{formatNumber(metrics.impressions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reach</span>
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
                  Conversion Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Conversions</span>
                  <span className="font-semibold">{formatNumber(metrics.conversions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <Badge variant="success">{formatPercentage(metrics.conversionRate)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="font-semibold">{formatCurrency(metrics.revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ROAS</span>
                  <Badge variant="success">{metrics.roas}x</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Campaigns</span>
                  <Badge>{activeCampaigns}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Paused Campaigns</span>
                  <Badge variant="secondary">{pausedCampaigns}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Connected Platforms</span>
                  <Badge variant="outline">{connectedPlatforms}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Campaigns</span>
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
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground mb-4">
              Connect a platform to start tracking your advertising performance
            </p>
            <Badge variant="outline">Get Started</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
