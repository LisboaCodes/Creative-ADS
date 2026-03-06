import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '../lib/utils';
import {
  ArrowLeft,
  RefreshCw,
  Unplug,
  CheckCircle2,
  XCircle,
  DollarSign,
  MousePointer,
  Eye,
  Target,
  TrendingUp,
  BarChart3,
  Image,
  Bot,
  Facebook,
  Instagram,
  Chrome,
  Sparkles,
  Linkedin,
  Twitter,
  Crosshair,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useState, useMemo } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { CreativeViewer } from '../components/ui/creative-viewer';

const platformIcons: Record<string, any> = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  GOOGLE_ADS: Chrome,
  TIKTOK: Sparkles,
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
};

const platformNames: Record<string, string> = {
  FACEBOOK: 'Facebook Ads',
  INSTAGRAM: 'Instagram Ads',
  GOOGLE_ADS: 'Google Ads',
  TIKTOK: 'TikTok Ads',
  LINKEDIN: 'LinkedIn Ads',
  TWITTER: 'Twitter/X Ads',
};

export default function PlatformDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [disconnectDialog, setDisconnectDialog] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<any>(null);

  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfDay(subDays(new Date(), 30)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  }), []);

  // Fetch platform info
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  const platform = platforms?.find((p: any) => p.id === id);

  // Fetch metrics for this platform
  const { data: metrics } = useQuery({
    queryKey: ['overview-metrics', startDate, endDate, id],
    queryFn: async () => {
      const response = await api.get('/api/metrics/overview', {
        params: { startDate, endDate, platformId: id },
      });
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch pixel info for this platform
  const { data: pixelData } = useQuery({
    queryKey: ['pixels', id],
    queryFn: async () => {
      const response = await api.get(`/api/platforms/${id}/pixels`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch campaigns for this platform
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: { platformId: id, limit: 100 },
      });
      return response.data.data;
    },
    enabled: !!id,
  });

  const handleSync = async () => {
    if (!id) return;
    try {
      await api.post(`/api/platforms/${id}/sync`);
      toast.success('Sincronização iniciada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao sincronizar');
    }
  };

  const handleDisconnect = async () => {
    if (!id) return;
    try {
      await api.delete(`/api/platforms/${id}`);
      toast.success('Plataforma desconectada');
      navigate('/platforms');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao desconectar');
    }
  };

  if (!platform) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/platforms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const Icon = platformIcons[platform.type] || Facebook;
  const campaigns = campaignsData?.campaigns || [];
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE');
  const pausedCampaigns = campaigns.filter((c: any) => c.status === 'PAUSED');

  // Collect all creatives from campaigns
  const allCreatives = campaigns.flatMap((c: any) => (c.adCreatives || []).map((cr: any) => ({ ...cr, campaignName: c.name })));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/platforms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6" />
              <h1 className="text-2xl font-bold tracking-tight">{platform.name}</h1>
              <Badge variant={platform.isConnected ? 'success' : 'secondary'}>
                {platform.isConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </>
                ) : (
                  'Inativo'
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {platformNames[platform.type]} &middot; ID: {platform.externalId} &middot;
              Última sinc: {platform.lastSyncAt ? formatDate(platform.lastSyncAt) : 'Nunca'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/ai-agent`)}
          >
            <Bot className="h-4 w-4 mr-2" />
            Analisar com IA
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDisconnectDialog(true)}
          >
            <Unplug className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </div>
      </div>

      {/* Metrics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Gasto 30d
            </div>
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.spend) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              Impressões
            </div>
            <div className="text-2xl font-bold">
              {metrics ? formatNumber(metrics.impressions) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MousePointer className="h-4 w-4" />
              Cliques
            </div>
            <div className="text-2xl font-bold">
              {metrics ? formatNumber(metrics.clicks) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              CTR
            </div>
            <div className="text-2xl font-bold">
              {metrics ? formatPercentage(metrics.ctr) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              Conversões
            </div>
            <div className="text-2xl font-bold">
              {metrics ? formatNumber(metrics.conversions) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              ROAS
            </div>
            <div className="text-2xl font-bold">
              {metrics ? (metrics.revenue > 0 ? `${metrics.roas}x` : 'N/A') : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pixel Info */}
      {pixelData?.pixels && pixelData.pixels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5" />
              Pixels
            </CardTitle>
            <CardDescription>{pixelData.pixels.length} pixel(s) encontrado(s) nesta conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pixelData.pixels.map((pixel: any) => (
                <div key={pixel.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{pixel.name}</span>
                    <Badge variant={pixel.isActive ? 'success' : 'destructive'} className="text-xs">
                      {pixel.isActive ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>ID: {pixel.id}</p>
                    {pixel.lastFiredTime && (
                      <p>Último disparo: {formatDate(pixel.lastFiredTime)}</p>
                    )}
                    {pixel.creationTime && (
                      <p>Criado em: {formatDate(pixel.creationTime)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pixelData?.pixels && pixelData.pixels.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Crosshair className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm text-foreground">Nenhum Pixel encontrado</p>
                <p className="text-xs">Esta conta não possui pixel configurado. Configure um pixel no Gerenciador de Eventos do Facebook para rastrear conversões e receita.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>
                {activeCampaigns.length} ativas, {pausedCampaigns.length} pausadas - {campaigns.length} total
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns?platformId=${id}`)}>
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha encontrada para esta conta
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 15).map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{campaign.name}</p>
                      <Badge
                        variant={campaign.status === 'ACTIVE' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {campaign.status === 'ACTIVE' ? 'Ativo' : campaign.status === 'PAUSED' ? 'Pausado' : campaign.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {campaign.aggregated30d?.hasSpend
                        ? `R$${campaign.aggregated30d.totalSpend.toFixed(2)} gasto | ${campaign.aggregated30d.totalClicks} cliques | CTR ${campaign.aggregated30d.avgCtr.toFixed(2)}%`
                        : 'Sem gasto nos últimos 30 dias'}
                    </p>
                  </div>
                  <div className="text-right">
                    {campaign.aggregated30d?.hasSpend && (
                      <span className={`text-sm font-medium ${
                        campaign.aggregated30d.totalRevenue > 0
                          ? (campaign.aggregated30d.avgRoas >= 3 ? 'text-green-600' : campaign.aggregated30d.avgRoas >= 1 ? 'text-yellow-600' : 'text-red-600')
                          : 'text-muted-foreground'
                      }`}>
                        {campaign.aggregated30d.totalRevenue > 0 ? `${campaign.aggregated30d.avgRoas.toFixed(2)}x ROAS` : 'ROAS N/A'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {campaigns.length > 15 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ...e mais {campaigns.length - 15} campanhas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creatives Grid */}
      {allCreatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Criativos
            </CardTitle>
            <CardDescription>{allCreatives.length} criativos desta conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allCreatives.slice(0, 12).map((creative: any, i: number) => (
                <div
                  key={creative.id || i}
                  className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => setSelectedCreative(creative)}
                >
                  {creative.thumbnailUrl || creative.imageUrl ? (
                    <img
                      src={creative.imageUrl || creative.thumbnailUrl}
                      alt={creative.name || 'Criativo'}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2 space-y-0.5">
                    {creative.title && (
                      <p className="font-medium text-xs truncate">{creative.title}</p>
                    )}
                    {creative.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{creative.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {creative.campaignName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {allCreatives.length > 12 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                ...e mais {allCreatives.length - 12} criativos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <CreativeViewer
        creative={selectedCreative}
        open={!!selectedCreative}
        onOpenChange={(open) => !open && setSelectedCreative(null)}
      />

      {/* Disconnect Dialog */}
      <Dialog open={disconnectDialog} onOpenChange={setDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar Plataforma</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desconectar "{platform.name}"? Suas campanhas não serão mais
              sincronizadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
