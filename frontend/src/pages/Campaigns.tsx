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
  FileEdit,
  Send,
  Loader2,
  Layers,
  LayoutGrid,
  Image,
  ChevronDown,
  Bookmark,
  BookmarkPlus,
  X,
  GitCompareArrows,
  CheckSquare,
  Square,
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
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

type HierarchyTab = 'campaigns' | 'adsets' | 'ads';

const hierarchyTabs: { value: HierarchyTab; label: string; icon: any }[] = [
  { value: 'campaigns', label: 'Campanhas', icon: Layers },
  { value: 'adsets', label: 'Conjuntos de Anúncios', icon: LayoutGrid },
  { value: 'ads', label: 'Anúncios', icon: Image },
];

const statusTabs = [
  { value: 'all', label: 'Todas', statusParam: undefined, spendParam: undefined },
  { value: 'ACTIVE_SPEND', label: 'Ativas', statusParam: 'ACTIVE', spendParam: 'true' },
  { value: 'ACTIVE_NO_SPEND', label: 'Sem veiculação', statusParam: 'ACTIVE', spendParam: 'false' },
  { value: 'PAUSED', label: 'Pausadas', statusParam: 'PAUSED', spendParam: undefined },
  { value: 'DRAFT', label: 'Rascunhos', statusParam: 'DRAFT', spendParam: undefined },
  { value: 'ARCHIVED', label: 'Arquivadas', statusParam: 'ARCHIVED', spendParam: undefined },
];

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  ARCHIVED: 'Arquivada',
  DELETED: 'Excluída',
  DRAFT: 'Rascunho',
};

function calculateHealthScore(agg: any): { score: number; level: string; color: string } {
  if (!agg) return { score: 0, level: 'Crítico', color: 'red' };

  const ctr = agg.avgCtr ?? 0;
  const cpc = agg.avgCpc ?? 0;
  const roas = agg.avgRoas ?? 0;
  const hasSpend = agg.hasSpend ?? false;

  let ctrScore = 5;
  if (ctr >= 2) ctrScore = 25;
  else if (ctr >= 1) ctrScore = 18;
  else if (ctr >= 0.5) ctrScore = 10;

  let cpcScore = 5;
  if (cpc <= 0.5 && cpc > 0) cpcScore = 25;
  else if (cpc <= 1) cpcScore = 18;
  else if (cpc <= 2) cpcScore = 10;

  let roasScore = 0;
  if (roas > 0) {
    if (roas >= 4) roasScore = 25;
    else if (roas >= 2) roasScore = 18;
    else if (roas >= 1) roasScore = 10;
    else roasScore = 5;
  }

  const trendScore = hasSpend ? 15 : 5;
  const total = ctrScore + cpcScore + roasScore + trendScore;

  let level: string;
  let color: string;
  if (total >= 80) { level = 'Excelente'; color = 'green'; }
  else if (total >= 60) { level = 'Bom'; color = 'blue'; }
  else if (total >= 40) { level = 'Atenção'; color = 'yellow'; }
  else { level = 'Crítico'; color = 'red'; }

  return { score: total, level, color };
}

const healthColorClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
};

interface SavedFilter {
  id: string;
  name: string;
  searchTerm: string;
  platformFilter: string;
  activeTab: string;
  clientFilter: string;
}

const SAVED_FILTERS_KEY = 'creative-ads-saved-filters';

function loadSavedFilters(): SavedFilter[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || '[]');
  } catch { return []; }
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('ACTIVE_SPEND');
  const [clientFilter, setClientFilter] = useState('all');

  // Hierarchy tab state
  const [hierarchyTab, setHierarchyTab] = useState<HierarchyTab>('campaigns');
  const [filterCampaignId, setFilterCampaignId] = useState<string | null>(null);
  const [filterCampaignName, setFilterCampaignName] = useState<string | null>(null);
  const [filterAdSetId, setFilterAdSetId] = useState<string | null>(null);
  const [filterAdSetName, setFilterAdSetName] = useState<string | null>(null);

  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Campaign comparison state
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Publishing draft state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  // ──── Campaigns query ────
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
    enabled: hierarchyTab === 'campaigns',
  });

  // Fetch counts for tabs
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
    enabled: hierarchyTab === 'campaigns',
  });

  // ──── Ad Sets query ────
  const { data: adSetsData, isLoading: adSetsLoading, refetch: refetchAdSets } = useQuery({
    queryKey: ['adsets', page, searchTerm, filterCampaignId],
    queryFn: async () => {
      const response = await api.get('/api/campaigns/adsets', {
        params: {
          page,
          limit: 20,
          search: searchTerm || undefined,
          campaignId: filterCampaignId || undefined,
        },
      });
      return response.data.data;
    },
    enabled: hierarchyTab === 'adsets',
  });

  // ──── Ads query ────
  const { data: adsData, isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['ads', page, searchTerm, filterAdSetId, filterCampaignId],
    queryFn: async () => {
      const response = await api.get('/api/campaigns/ads', {
        params: {
          page,
          limit: 20,
          search: searchTerm || undefined,
          adSetId: filterAdSetId || undefined,
          campaignId: !filterAdSetId ? filterCampaignId || undefined : undefined,
        },
      });
      return response.data.data;
    },
    enabled: hierarchyTab === 'ads',
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

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      searchTerm,
      platformFilter,
      activeTab,
      clientFilter,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    setFilterName('');
    setShowSaveFilterDialog(false);
  };

  const handleDeleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
  };

  const handleApplySavedFilter = (filter: SavedFilter) => {
    setSearchTerm(filter.searchTerm);
    setPlatformFilter(filter.platformFilter);
    setActiveTab(filter.activeTab);
    setClientFilter(filter.clientFilter);
    setPage(1);
  };

  const handleToggleCompare = (campaignId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(campaignId)) return prev.filter(id => id !== campaignId);
      if (prev.length >= 3) return prev;
      return [...prev, campaignId];
    });
  };

  const comparedCampaigns = data?.campaigns?.filter((c: any) => selectedForCompare.includes(c.id)) || [];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleHierarchyTabChange = (tab: HierarchyTab) => {
    setHierarchyTab(tab);
    setPage(1);
    setSearchTerm('');
    if (tab === 'campaigns') {
      setFilterCampaignId(null);
      setFilterCampaignName(null);
      setFilterAdSetId(null);
      setFilterAdSetName(null);
    }
  };

  const handleDrillDownToAdSets = (campaignId: string, campaignName: string) => {
    setFilterCampaignId(campaignId);
    setFilterCampaignName(campaignName);
    setFilterAdSetId(null);
    setFilterAdSetName(null);
    setHierarchyTab('adsets');
    setPage(1);
    setSearchTerm('');
  };

  const handleDrillDownToAds = (adSetId: string, adSetName: string) => {
    setFilterAdSetId(adSetId);
    setFilterAdSetName(adSetName);
    setHierarchyTab('ads');
    setPage(1);
    setSearchTerm('');
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

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/api/platforms/sync-all');
      toast.success(res.data.message || 'Sincronização iniciada');
      setTimeout(() => { refetch(); refetchAdSets(); refetchAds(); }, 5000);
      setTimeout(() => { refetch(); refetchAdSets(); refetchAds(); }, 15000);
      setTimeout(() => { refetch(); refetchAdSets(); refetchAds(); setSyncing(false); }, 30000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao sincronizar');
      setSyncing(false);
    }
  };

  const handlePublishDraft = async (campaignId: string) => {
    setPublishingId(campaignId);
    try {
      await api.post(`/api/campaigns/${campaignId}/publish`);
      toast.success('Rascunho publicado com sucesso! Status: PAUSADA');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao publicar rascunho');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteDraft = async (campaignId: string) => {
    try {
      await api.patch(`/api/campaigns/${campaignId}/status`, { status: 'DELETED' });
      toast.success('Rascunho excluído');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao excluir rascunho');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await api.patch(`/api/campaigns/${campaignId}/status`, { status: 'DELETED' });
      toast.success('Campanha excluída (não aparecerá mais após sync)');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao excluir campanha');
    }
  };

  const currentIsLoading = hierarchyTab === 'campaigns' ? isLoading : hierarchyTab === 'adsets' ? adSetsLoading : adsLoading;

  if (currentIsLoading && hierarchyTab === 'campaigns' && !data) {
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

  // Get current pagination data
  const currentPagination = hierarchyTab === 'campaigns'
    ? data?.pagination
    : hierarchyTab === 'adsets'
    ? adSetsData?.pagination
    : adsData?.pagination;

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
          <Button
            onClick={handleSyncAll}
            variant="outline"
            size="default"
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Button onClick={() => navigate('/campaigns/new')} size="default">
            <Edit className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Hierarchy Tabs — Facebook Ads Manager style */}
      <div className="border-b border-border">
        <div className="flex gap-0 -mb-px">
          {hierarchyTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = hierarchyTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleHierarchyTabChange(tab.value)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-[3px] transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb for drill-down */}
      {(filterCampaignName || filterAdSetName) && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => handleHierarchyTabChange('campaigns')}
            className="text-primary hover:underline"
          >
            Campanhas
          </button>
          {filterCampaignName && (
            <>
              <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
              <button
                onClick={() => {
                  setFilterAdSetId(null);
                  setFilterAdSetName(null);
                  setHierarchyTab('adsets');
                  setPage(1);
                }}
                className={`${hierarchyTab === 'adsets' && !filterAdSetName ? 'text-foreground font-medium' : 'text-primary hover:underline'}`}
              >
                {filterCampaignName}
              </button>
            </>
          )}
          {filterAdSetName && (
            <>
              <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
              <span className="text-foreground font-medium">{filterAdSetName}</span>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              hierarchyTab === 'campaigns' ? 'Buscar campanhas...' :
              hierarchyTab === 'adsets' ? 'Buscar conjuntos...' :
              'Buscar anúncios...'
            }
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        {hierarchyTab === 'campaigns' && (
          <>
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
          </>
        )}

        {hierarchyTab === 'campaigns' && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setShowSaveFilterDialog(true)}
            title="Salvar filtro atual"
          >
            <BookmarkPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Saved Filters Chips */}
      {hierarchyTab === 'campaigns' && savedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Bookmark className="h-4 w-4 text-muted-foreground mt-0.5" />
          {savedFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => handleApplySavedFilter(f)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {f.name}
              <span
                onClick={(e) => { e.stopPropagation(); handleDeleteSavedFilter(f.id); }}
                className="ml-0.5 hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
            <DialogDescription>Dê um nome para o filtro atual</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Ex: Campanhas ativas Facebook"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveFilterDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Tabs (only for campaigns tab) */}
      {hierarchyTab === 'campaigns' && (
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
      )}

      {/* ══════════════════ CAMPAIGNS TABLE ══════════════════ */}
      {hierarchyTab === 'campaigns' && (
        <>
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
                        <th className="py-3 px-2 w-8"></th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Campanha</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Plataforma</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Saúde</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Orçamento</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Gasto 30d</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Cliques 30d</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">CTR 30d</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">ROAS 30d</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Ações</th>
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
                            onClick={() => handleDrillDownToAdSets(campaign.id, campaign.name)}
                          >
                            <td className="py-4 px-2 w-8" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleCompare(campaign.id)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                {selectedForCompare.includes(campaign.id)
                                  ? <CheckSquare className="h-4 w-4 text-primary" />
                                  : <Square className="h-4 w-4" />
                                }
                              </button>
                            </td>
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
                                    {campaign.externalId
                                      ? `ID: ${campaign.externalId.slice(0, 12)}...`
                                      : campaign.status === 'DRAFT' ? 'Rascunho local' : ''}
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
                                <Badge variant={
                                  campaign.status === 'ACTIVE' ? 'success' :
                                  campaign.status === 'PAUSED' ? 'secondary' :
                                  campaign.status === 'DRAFT' ? 'outline' :
                                  'destructive'
                                } className={campaign.status === 'DRAFT' ? 'text-gray-500 border-gray-300' : ''}>
                                  {campaign.status === 'DRAFT' && <FileEdit className="h-3 w-3 mr-1" />}
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
                                {campaign.status === 'DRAFT' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handlePublishDraft(campaign.id)}
                                      disabled={publishingId === campaign.id}
                                    >
                                      {publishingId === campaign.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                      <span className="ml-1 hidden sm:inline">Publicar</span>
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
                                        <DropdownMenuItem onClick={() => handleViewAnalytics(campaign.id)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar Rascunho
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDeleteDraft(campaign.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                ) : (
                                  <>
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
                                          onClick={() => handleDeleteCampaign(campaign.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
        </>
      )}

      {/* ══════════════════ AD SETS TABLE ══════════════════ */}
      {hierarchyTab === 'adsets' && (
        <>
          {adSetsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              </CardContent>
            </Card>
          ) : adSetsData?.adSets && adSetsData.adSets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Conjuntos de Anúncios
                  {filterCampaignName && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      — {filterCampaignName}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {adSetsData.pagination?.total || adSetsData.adSets.length} conjuntos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Nome</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Campanha</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Orçamento</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Otimização</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Anúncios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adSetsData.adSets.map((adSet: any) => (
                        <tr
                          key={adSet.id}
                          className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleDrillDownToAds(adSet.id, adSet.name)}
                        >
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium">{adSet.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {adSet.externalId?.slice(0, 12)}...
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm">{adSet.campaign?.name}</span>
                              <Badge variant="outline" className="w-fit mt-1 text-xs">
                                {adSet.campaign?.platformType}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={
                              adSet.status === 'ACTIVE' ? 'success' :
                              adSet.status === 'PAUSED' ? 'secondary' :
                              'destructive'
                            }>
                              {statusLabels[adSet.status] || adSet.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {adSet.dailyBudget
                              ? `${formatCurrency(adSet.dailyBudget)}/dia`
                              : adSet.lifetimeBudget
                              ? formatCurrency(adSet.lifetimeBudget)
                              : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-muted-foreground">
                              {adSet.optimizationGoal?.replace(/_/g, ' ') || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge variant="outline">{adSet._count?.ads ?? 0}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum conjunto de anúncios encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {filterCampaignName
                    ? `Nenhum conjunto encontrado para "${filterCampaignName}". Sincronize para buscar da plataforma.`
                    : 'Sincronize suas plataformas para importar conjuntos de anúncios.'}
                </p>
                {filterCampaignId && (
                  <Button variant="outline" onClick={() => { setFilterCampaignId(null); setFilterCampaignName(null); }}>
                    Ver Todos os Conjuntos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════ ADS TABLE ══════════════════ */}
      {hierarchyTab === 'ads' && (
        <>
          {adsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              </CardContent>
            </Card>
          ) : adsData?.ads && adsData.ads.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Anúncios
                  {filterAdSetName && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      — {filterAdSetName}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {adsData.pagination?.total || adsData.ads.length} anúncios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Anúncio</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Conjunto</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Campanha</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Criativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adsData.ads.map((ad: any) => (
                        <tr key={ad.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {ad.creative?.thumbnailUrl && (
                                <img
                                  src={ad.creative.thumbnailUrl}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">{ad.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {ad.externalId?.slice(0, 12)}...
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm">{ad.adSet?.name || '-'}</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm">{ad.adSet?.campaign?.name || '-'}</span>
                              <Badge variant="outline" className="w-fit mt-1 text-xs">
                                {ad.adSet?.campaign?.platformType}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={
                              ad.status === 'ACTIVE' ? 'success' :
                              ad.status === 'PAUSED' ? 'secondary' :
                              'destructive'
                            }>
                              {statusLabels[ad.status] || ad.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {ad.creative ? (
                              <div className="flex flex-col max-w-xs">
                                {ad.creative.title && (
                                  <span className="text-sm font-medium truncate">{ad.creative.title}</span>
                                )}
                                {ad.creative.body && (
                                  <span className="text-xs text-muted-foreground truncate">{ad.creative.body}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum anúncio encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {filterAdSetName
                    ? `Nenhum anúncio encontrado para "${filterAdSetName}". Sincronize para buscar da plataforma.`
                    : 'Sincronize suas plataformas para importar anúncios.'}
                </p>
                {(filterAdSetId || filterCampaignId) && (
                  <Button variant="outline" onClick={() => { setFilterAdSetId(null); setFilterAdSetName(null); setFilterCampaignId(null); setFilterCampaignName(null); }}>
                    Ver Todos os Anúncios
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pagination (shared) */}
      {currentPagination && currentPagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            Página {page} de {currentPagination.totalPages}
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
              onClick={() => setPage((p) => Math.min(currentPagination.totalPages, p + 1))}
              disabled={page === currentPagination.totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Compare Button */}
      {selectedForCompare.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="shadow-lg gap-2"
            onClick={() => setCompareDialogOpen(true)}
          >
            <GitCompareArrows className="h-5 w-5" />
            Comparar {selectedForCompare.length} campanhas
          </Button>
        </div>
      )}

      {/* Campaign Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comparação de Campanhas</DialogTitle>
            <DialogDescription>Análise lado a lado das campanhas selecionadas</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Campaign cards */}
            <div className="grid grid-cols-3 gap-4">
              {comparedCampaigns.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{c.platformType}</Badge>
                      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Metrics comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Métrica</th>
                    {comparedCampaigns.map((c: any) => (
                      <th key={c.id} className="text-right py-2 px-3 font-medium">{c.name.slice(0, 20)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Gasto 30d', key: 'totalSpend', format: (v: number) => formatCurrency(v) },
                    { label: 'Cliques 30d', key: 'totalClicks', format: (v: number) => formatNumber(v) },
                    { label: 'Impressões 30d', key: 'totalImpressions', format: (v: number) => formatNumber(v) },
                    { label: 'CTR', key: 'avgCtr', format: (v: number) => formatPercentage(v) },
                    { label: 'CPC', key: 'avgCpc', format: (v: number) => formatCurrency(v) },
                    { label: 'ROAS', key: 'avgRoas', format: (v: number) => `${(v || 0).toFixed(2)}x` },
                    { label: 'Conversões', key: 'totalConversions', format: (v: number) => formatNumber(v) },
                  ].map((metric) => {
                    const values = comparedCampaigns.map((c: any) => c.aggregated30d?.[metric.key] ?? 0);
                    const bestIdx = metric.key === 'avgCpc'
                      ? values.indexOf(Math.min(...values.filter((v: number) => v > 0)))
                      : values.indexOf(Math.max(...values));
                    return (
                      <tr key={metric.key} className="border-b">
                        <td className="py-2 px-3 text-muted-foreground">{metric.label}</td>
                        {comparedCampaigns.map((c: any, idx: number) => {
                          const val = c.aggregated30d?.[metric.key] ?? 0;
                          return (
                            <td
                              key={c.id}
                              className={`py-2 px-3 text-right font-medium ${idx === bestIdx ? 'text-green-600 dark:text-green-400' : ''}`}
                            >
                              {metric.format(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Radar chart */}
            {comparedCampaigns.length > 0 && (() => {
              const radarLabels = ['CTR', 'CPC Inv', 'ROAS', 'Conversões', 'Cliques'];
              const normalize = (vals: number[]) => {
                const max = Math.max(...vals, 1);
                return vals.map(v => Number(((v / max) * 100).toFixed(1)));
              };
              const allCtr = comparedCampaigns.map((c: any) => c.aggregated30d?.avgCtr ?? 0);
              const allCpcInv = comparedCampaigns.map((c: any) => {
                const cpc = c.aggregated30d?.avgCpc ?? 0;
                return cpc > 0 ? 1 / cpc : 0;
              });
              const allRoas = comparedCampaigns.map((c: any) => c.aggregated30d?.avgRoas ?? 0);
              const allConv = comparedCampaigns.map((c: any) => c.aggregated30d?.totalConversions ?? 0);
              const allClicks = comparedCampaigns.map((c: any) => c.aggregated30d?.totalClicks ?? 0);

              const normCtr = normalize(allCtr);
              const normCpcInv = normalize(allCpcInv);
              const normRoas = normalize(allRoas);
              const normConv = normalize(allConv);
              const normClicks = normalize(allClicks);

              const radarSeries = comparedCampaigns.map((c: any, i: number) => ({
                name: c.name.slice(0, 20),
                data: [normCtr[i], normCpcInv[i], normRoas[i], normConv[i], normClicks[i]],
              }));

              const radarOptions: ApexOptions = {
                chart: { type: 'radar', toolbar: { show: false } },
                xaxis: { categories: radarLabels },
                yaxis: { show: false },
                colors: ['#3B82F6', '#10B981', '#F59E0B'],
                legend: { position: 'bottom' },
              };

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Radar de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactApexChart
                      options={radarOptions}
                      series={radarSeries}
                      type="radar"
                      height={320}
                    />
                  </CardContent>
                </Card>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompareDialogOpen(false); setSelectedForCompare([]); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
