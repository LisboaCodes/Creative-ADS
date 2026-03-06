import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../lib/utils';
import {
  Pause,
  Play,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';

const statusTabs = [
  { value: 'all', label: 'Todas', statusParam: undefined, spendParam: undefined },
  { value: 'ACTIVE_SPEND', label: 'Ativas', statusParam: 'ACTIVE', spendParam: 'true' },
  { value: 'ACTIVE_NO_SPEND', label: 'Sem veiculação', statusParam: 'ACTIVE', spendParam: 'false' },
  { value: 'PAUSED', label: 'Pausadas', statusParam: 'PAUSED', spendParam: undefined },
  { value: 'ARCHIVED', label: 'Arquivadas', statusParam: 'ARCHIVED', spendParam: undefined },
];

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  ARCHIVED: 'Arquivada',
  DELETED: 'Excluída',
};

function calculateHealthScore(agg: any): { score: number; level: string; color: string } {
  if (!agg) return { score: 0, level: 'Crítico', color: 'red' };

  const ctr = agg.avgCtr ?? 0;
  const cpc = agg.avgCpc ?? 0;
  const roas = agg.avgRoas ?? 0;
  const hasSpend = agg.hasSpend ?? false;

  // CTR score (0-25)
  let ctrScore = 5;
  if (ctr >= 2) ctrScore = 25;
  else if (ctr >= 1) ctrScore = 18;
  else if (ctr >= 0.5) ctrScore = 10;

  // CPC score (0-25)
  let cpcScore = 5;
  if (cpc <= 0.5 && cpc > 0) cpcScore = 25;
  else if (cpc <= 1) cpcScore = 18;
  else if (cpc <= 2) cpcScore = 10;

  // ROAS score (0-25): 0 if no revenue data
  let roasScore = 0;
  if (roas > 0) {
    if (roas >= 4) roasScore = 25;
    else if (roas >= 2) roasScore = 18;
    else if (roas >= 1) roasScore = 10;
    else roasScore = 5;
  }

  // Trend score (0-25)
  const trendScore = hasSpend ? 15 : 5;

  const total = ctrScore + cpcScore + roasScore + trendScore;

  let level: string;
  let color: string;
  if (total >= 80) {
    level = 'Excelente';
    color = 'green';
  } else if (total >= 60) {
    level = 'Bom';
    color = 'blue';
  } else if (total >= 40) {
    level = 'Atenção';
    color = 'yellow';
  } else {
    level = 'Crítico';
    color = 'red';
  }

  return { score: total, level, color };
}

const healthColorClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('ACTIVE_SPEND');
  const [clientFilter, setClientFilter] = useState('all');

  // Budget dialog state
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [dailyBudget, setDailyBudget] = useState('');
  const [lifetimeBudget, setLifetimeBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Fetch connected platforms/clients for filter
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  const currentTab = statusTabs.find(t => t.value === activeTab) || statusTabs[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', page, searchTerm, platformFilter, activeTab, clientFilter],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: {
          page,
          limit: 20,
          search: searchTerm || undefined,
          platformType: platformFilter !== 'all' ? platformFilter : undefined,
          status: currentTab.statusParam || undefined,
          hasSpend: currentTab.spendParam || undefined,
          platformId: clientFilter !== 'all' ? clientFilter : undefined,
        },
      });
      return response.data.data;
    },
  });

  // Fetch counts for tabs (no status/spend filter, just search + platform + client)
  const { data: countsData } = useQuery({
    queryKey: ['campaigns-counts', searchTerm, platformFilter, clientFilter],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: {
          page: 1,
          limit: 1,
          search: searchTerm || undefined,
          platformType: platformFilter !== 'all' ? platformFilter : undefined,
          platformId: clientFilter !== 'all' ? clientFilter : undefined,
        },
      });
      return response.data.data;
    },
  });

  const statusCounts = countsData?.summary?.statusCounts || {};
  const activeWithSpend = countsData?.summary?.activeWithSpend || 0;
  const activeNoSpend = countsData?.summary?.activeNoSpend || 0;

  const getTabCount = (tabValue: string) => {
    switch (tabValue) {
      case 'all': return countsData?.pagination?.total || 0;
      case 'ACTIVE_SPEND': return activeWithSpend;
      case 'ACTIVE_NO_SPEND': return activeNoSpend;
      default: return statusCounts[tabValue] || 0;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await api.patch(`/api/campaigns/${campaignId}/status`, { status: newStatus });
      toast.success(`Campanha ${newStatus === 'ACTIVE' ? 'ativada' : 'pausada'}`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao atualizar campanha');
    }
  };

  const handleOpenBudgetDialog = (campaign: any) => {
    setEditingCampaign(campaign);
    setDailyBudget(campaign.dailyBudget?.toString() || '');
    setLifetimeBudget(campaign.lifetimeBudget?.toString() || '');
    setBudgetDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!editingCampaign) return;

    const updateData: any = {};
    if (dailyBudget) updateData.dailyBudget = Number(dailyBudget);
    if (lifetimeBudget) updateData.lifetimeBudget = Number(lifetimeBudget);

    if (!updateData.dailyBudget && !updateData.lifetimeBudget) {
      toast.error('Informe pelo menos um valor de orçamento');
      return;
    }

    setSavingBudget(true);
    try {
      await api.patch(`/api/campaigns/${editingCampaign.id}/budget`, updateData);
      toast.success('Orçamento atualizado com sucesso');
      setBudgetDialogOpen(false);
      setEditingCampaign(null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao atualizar orçamento');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleViewAnalytics = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleDuplicateCampaign = (campaignId: string) => {
    navigate(`/campaigns/new?duplicate=${campaignId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore todas as suas campanhas de publicidade
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => navigate('/campaigns/new')} size="default">
            <Edit className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Conta/Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Contas</SelectItem>
            {platforms?.filter((p: any) => p.isConnected).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Plataformas</SelectItem>
            <SelectItem value="FACEBOOK">Facebook</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
            <SelectItem value="TIKTOK">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Tabs */}
      <div className="border-b">
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {statusTabs.map((tab) => {
            const count = getTabCount(tab.value);
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaigns Table */}
      {data?.campaigns && data.campaigns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab !== 'all' ? currentTab.label : 'Campanhas'}
              {clientFilter !== 'all' && platforms && (
                <span className="text-base font-normal text-muted-foreground ml-2">
                  — {platforms.find((p: any) => p.id === clientFilter)?.name}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {data.pagination?.total || data.campaigns.length} campanhas
              {data.summary && activeTab === 'all' && (
                <span className="ml-2">
                  — <span className="text-green-600 font-medium">{data.summary.withSpend} com gasto</span>
                  {data.summary.withoutSpend > 0 && (
                    <span className="text-orange-500 font-medium"> | {data.summary.withoutSpend} sem veiculação</span>
                  )}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Campanha
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Plataforma
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                      Saúde
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Orçamento
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Gasto 30d
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Cliques 30d
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      CTR 30d
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      ROAS 30d
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((campaign: any) => {
                    const agg = campaign.aggregated30d;
                    const health = calculateHealthScore(agg);
                    return (
                      <tr
                        key={campaign.id}
                        className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                          campaign.status === 'ACTIVE' && !agg?.hasSpend ? 'opacity-60' : ''
                        }`}
                        onClick={() => handleViewAnalytics(campaign.id)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {campaign.adCreatives?.[0]?.thumbnailUrl && (
                              <img
                                src={campaign.adCreatives[0].thumbnailUrl}
                                alt=""
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{campaign.name}</span>
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${healthColorClasses[health.color]}`}
                                  title={`Saúde: ${health.level} (${health.score})`}
                                >
                                  {health.score}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ID: {campaign.externalId?.slice(0, 12)}...
                              </span>
                              {campaign.tags && campaign.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {campaign.tags.map((tag: { id: string; name: string; color: string }) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                        border: `1px solid ${tag.color}40`,
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline">{campaign.platformType}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <Badge variant={campaign.status === 'ACTIVE' ? 'success' : campaign.status === 'PAUSED' ? 'secondary' : 'destructive'}>
                              {statusLabels[campaign.status] || campaign.status}
                            </Badge>
                            {campaign.status === 'ACTIVE' && !agg?.hasSpend && (
                              <Badge variant="outline" className="text-orange-500 border-orange-300 text-xs">
                                Sem veiculação
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${healthColorClasses[health.color]}`}
                            title={`CTR: ${agg?.avgCtr?.toFixed(2) ?? '-'}% | CPC: R$${agg?.avgCpc?.toFixed(2) ?? '-'} | ROAS: ${agg?.avgRoas?.toFixed(2) ?? '-'}x`}
                          >
                            {health.score}
                            <span className="hidden sm:inline">- {health.level}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right font-medium">
                          {agg ? formatCurrency(agg.totalSpend) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {agg ? formatNumber(agg.totalClicks) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {agg ? formatPercentage(agg.avgCtr) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {agg?.avgRoas ? (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              {agg.avgRoas.toFixed(2)}x
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant={campaign.status === 'ACTIVE' ? 'outline' : 'default'}
                              onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                            >
                              {campaign.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenBudgetDialog(campaign)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar Orçamento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewAnalytics(campaign.id)}>
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Ver Análises
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleToggleStatus(campaign.id, 'ACTIVE')}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {data.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || platformFilter !== 'all' || activeTab !== 'all' || clientFilter !== 'all'
                ? 'Tente ajustar seus filtros ou trocar de tab'
                : 'Conecte uma plataforma para ver suas campanhas'}
            </p>
            {searchTerm || platformFilter !== 'all' || activeTab !== 'ACTIVE_SPEND' || clientFilter !== 'all' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setPlatformFilter('all');
                  setActiveTab('all');
                  setClientFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Edit Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Orçamento</DialogTitle>
            <DialogDescription>
              {editingCampaign?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dailyBudget">Orçamento Diário (R$)</Label>
              <Input
                id="dailyBudget"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50.00"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lifetimeBudget">Orçamento Vitalício (R$)</Label>
              <Input
                id="lifetimeBudget"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 1000.00"
                value={lifetimeBudget}
                onChange={(e) => setLifetimeBudget(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
