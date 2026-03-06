import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '../lib/utils';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointer,
  Eye,
  Target,
  BarChart3,
  Pause,
  Play,
  RefreshCw,
  Image,
  Plus,
  X,
  History,
  Copy,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';
import { CreativeViewer } from '../components/ui/creative-viewer';
import { useState } from 'react';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCreative, setSelectedCreative] = useState<any>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const { data: campaign, isLoading, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await api.get(`/api/campaigns/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch audit log for this campaign
  const { data: auditLog } = useQuery({
    queryKey: ['audit-log', id],
    queryFn: async () => {
      const res = await api.get('/api/campaigns/audit-log', { params: { entityId: id } });
      return res.data.data;
    },
    enabled: !!id,
  });

  // Tag mutations
  const addTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return api.post(`/api/campaigns/${id}/tags`, { name, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      setNewTagName('');
      setShowTagInput(false);
      toast.success('Tag adicionada');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erro ao adicionar tag'),
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => api.delete(`/api/campaigns/${id}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Tag removida');
    },
  });

  // Health score calculation
  const calculateHealthScore = (agg: any) => {
    if (!agg) return { score: 0, level: 'Sem dados', color: 'text-muted-foreground' };
    let score = 0;
    const ctr = agg.avgCtr || 0;
    score += ctr >= 2 ? 25 : ctr >= 1 ? 18 : ctr >= 0.5 ? 10 : 5;
    const cpc = agg.avgCpc || 0;
    score += cpc <= 0.5 ? 25 : cpc <= 1 ? 18 : cpc <= 2 ? 10 : 5;
    const roas = agg.avgRoas || 0;
    if (roas > 0) score += roas >= 4 ? 25 : roas >= 2 ? 18 : roas >= 1 ? 10 : 5;
    score += agg.hasSpend ? 15 : 5;
    const level = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Atenção' : 'Crítico';
    const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
    return { score, level, color };
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    try {
      const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await api.patch(`/api/campaigns/${campaign.id}/status`, { status: newStatus });
      toast.success(`Campanha ${newStatus === 'ACTIVE' ? 'ativada' : 'pausada'}`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao atualizar campanha');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Campanha não encontrada</h2>
        <Button variant="outline" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  // Aggregate metrics from all days
  const metrics = campaign.metrics || [];
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

  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const hasRevenue = totals.revenue > 0;
  const avgRoas = totals.spend > 0 && hasRevenue ? totals.revenue / totals.spend : 0;
  const convRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  const creatives = campaign.adCreatives || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
              <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {campaign.status === 'ACTIVE' ? 'Ativo' : campaign.status === 'PAUSED' ? 'Pausado' : campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.platformType} &middot; ID: {campaign.externalId} &middot;{' '}
              {campaign.startDate
                ? `${formatDate(campaign.startDate)}${campaign.endDate ? ` - ${formatDate(campaign.endDate)}` : ' - Presente'}`
                : `Últimos ${metrics.length} dias com dados`}
            </p>
            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {campaign.tags?.map((tag: any) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs gap-1"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTagMutation.mutate(tag.id); }}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da tag"
                    className="h-6 w-24 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) addTagMutation.mutate(newTagName.trim());
                      if (e.key === 'Escape') setShowTagInput(false);
                    }}
                    autoFocus
                  />
                  <button onClick={() => setShowTagInput(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Tag
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant={campaign.status === 'ACTIVE' ? 'outline' : 'default'}
            onClick={handleToggleStatus}
          >
            {campaign.status === 'ACTIVE' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Ativar
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/campaigns/new?duplicate=${campaign.id}`)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Gasto Total
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.spend)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              Impressões
            </div>
            <div className="text-2xl font-bold">{formatNumber(totals.impressions)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MousePointer className="h-4 w-4" />
              Cliques
            </div>
            <div className="text-2xl font-bold">{formatNumber(totals.clicks)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              CTR
            </div>
            <div className="text-2xl font-bold">{formatPercentage(avgCtr)}</div>
            <div className="text-xs text-muted-foreground">
              {avgCtr >= 1.5 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Bom
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Abaixo do ideal
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              Conversões
            </div>
            <div className="text-2xl font-bold">{formatNumber(totals.conversions)}</div>
            <div className="text-xs text-muted-foreground">
              Taxa: {formatPercentage(convRate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              ROAS
            </div>
            <div className="text-2xl font-bold">{hasRevenue ? `${avgRoas.toFixed(2)}x` : 'N/A'}</div>
            <div className="text-xs text-muted-foreground">
              {!hasRevenue ? (
                <span className="text-muted-foreground">Sem receita rastreada</span>
              ) : avgRoas >= 3 ? (
                <span className="text-green-600">Excelente</span>
              ) : avgRoas >= 1 ? (
                <span className="text-yellow-600">Positivo</span>
              ) : (
                <span className="text-red-600">Negativo</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">CPC Médio</div>
                <div className="text-xl font-bold">{formatCurrency(avgCpc)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">CPM Médio</div>
                <div className="text-xl font-bold">{formatCurrency(avgCpm)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Receita Total</div>
                <div className="text-xl font-bold">{formatCurrency(totals.revenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Alcance</div>
                <div className="text-xl font-bold">{formatNumber(totals.reach)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Orç. Diário</div>
                <div className="text-xl font-bold">
                  {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Orç. Vitalício</div>
                <div className="text-xl font-bold">
                  {campaign.lifetimeBudget ? formatCurrency(campaign.lifetimeBudget) : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Início</div>
                <div className="text-xl font-bold">
                  {campaign.startDate ? formatDate(campaign.startDate) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Término</div>
                <div className="text-xl font-bold">
                  {campaign.endDate ? formatDate(campaign.endDate) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Dias c/ dados</div>
                <div className="text-xl font-bold">{metrics.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Metrics Table */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Métricas Diárias</CardTitle>
            <CardDescription>
              {campaign.startDate
                ? `Período: ${formatDate(campaign.startDate)}${campaign.endDate ? ` a ${formatDate(campaign.endDate)}` : ' até hoje'}`
                : 'Desempenho dia a dia'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Impressões</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cliques</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">CTR</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Gasto</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">CPC</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Conv.</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{formatDate(m.date)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(Number(m.impressions))}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(Number(m.clicks))}</td>
                      <td className="py-2 px-3 text-right">{formatPercentage(m.ctr)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(m.spend)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(m.cpc)}</td>
                      <td className="py-2 px-3 text-right">{m.conversions}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(m.revenue)}</td>
                      <td className="py-2 px-3 text-right">
                        {m.revenue > 0 && m.roas ? (
                          <span className={m.roas >= 3 ? 'text-green-600' : m.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                            {m.roas.toFixed(2)}x
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ad Creatives */}
      {creatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Criativos
            </CardTitle>
            <CardDescription>{creatives.length} criativos encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatives.map((creative: any) => (
                <div
                  key={creative.id}
                  className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => setSelectedCreative(creative)}
                >
                  {creative.thumbnailUrl || creative.imageUrl ? (
                    <img
                      src={creative.imageUrl || creative.thumbnailUrl}
                      alt={creative.name || 'Criativo'}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    {creative.title && (
                      <p className="font-medium text-sm">{creative.title}</p>
                    )}
                    {creative.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{creative.body}</p>
                    )}
                    {creative.name && (
                      <p className="text-xs text-muted-foreground">
                        {creative.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CreativeViewer
        creative={selectedCreative}
        open={!!selectedCreative}
        onOpenChange={(open) => !open && setSelectedCreative(null)}
      />

      {/* Health Score + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score */}
        {(() => {
          const agg = campaign.aggregated30d || {
            avgCtr: avgCtr,
            avgCpc: avgCpc,
            avgRoas: avgRoas,
            hasSpend: totals.spend > 0,
          };
          const health = calculateHealthScore(agg);
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Saúde da Campanha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className={`text-5xl font-bold ${health.color}`}>
                    {health.score}
                  </div>
                  <div>
                    <Badge className={health.color.replace('text-', 'bg-').replace('600', '100') + ' ' + health.color}>
                      {health.level}
                    </Badge>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-8">
                        <span className="text-muted-foreground">CTR</span>
                        <span>{formatPercentage(avgCtr)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-muted-foreground">CPC</span>
                        <span>{formatCurrency(avgCpc)}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-muted-foreground">ROAS</span>
                        <span>{hasRevenue ? `${avgRoas.toFixed(2)}x` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </CardTitle>
            <CardDescription>Últimas mudanças nesta campanha</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLog && auditLog.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {auditLog.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{log.action}</p>
                      {log.description && (
                        <p className="text-muted-foreground text-xs">{log.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(log.createdAt)} &middot; {log.source || 'manual'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma alteração registrada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
