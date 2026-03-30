import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateRange } from 'react-day-picker';
import api from '../services/api';
import { formatCurrency, formatDate } from '../lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DateRangePicker } from '../components/ui/date-range-picker';

// Icons
import {
  Users, TrendingUp, DollarSign, UserPlus, Plus, Search, Copy, Check,
  ExternalLink, Trash2, Edit3, Link2, BarChart3, RefreshCw, Key,
} from 'lucide-react';

// ─── Types ─────────────

interface TrackingLink {
  id: string;
  shortCode: string;
  name: string;
  destinationUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  totalClicks: number;
  uniqueClicks: number;
  isActive: boolean;
  campaign?: { id: string; name: string } | null;
  platform?: { id: string; name: string; type: string } | null;
  createdAt: string;
}

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  source: string;
  status: string;
  value?: number;
  campaign?: { id: string; name: string } | null;
  trackingLink?: { id: string; name: string; shortCode: string } | null;
  client?: { id: string; name: string } | null;
  createdAt: string;
  notes?: string;
}

interface DashboardData {
  stats: {
    totalLeads: number;
    leadsToday: number;
    conversionRate: number;
    totalValue: number;
  };
  timeSeries: { date: string; count: number }[];
  bySource: { source: string; count: number }[];
}

// ─── Constants ─────────────

const SOURCE_OPTIONS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'ORGANIC', label: 'Orgânico' },
  { value: 'DIRECT', label: 'Direto' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERRAL', label: 'Referência' },
  { value: 'OTHER', label: 'Outro' },
];

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Novo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'CONTACTED', label: 'Contatado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'QUALIFIED', label: 'Qualificado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'SOLD', label: 'Vendido', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: '#1877F2',
  GOOGLE: '#4285F4',
  INSTAGRAM: '#E4405F',
  TIKTOK: '#000000',
  LINKEDIN: '#0A66C2',
  ORGANIC: '#22C55E',
  DIRECT: '#8B5CF6',
  WHATSAPP: '#25D366',
  REFERRAL: '#F59E0B',
  OTHER: '#6B7280',
};

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return opt ? <Badge className={opt.color}>{opt.label}</Badge> : <Badge>{status}</Badge>;
}

function getSourceLabel(source: string) {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label || source;
}

// ─── Main Component ─────────────

export default function Leads() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Link form state
  const [linkForm, setLinkForm] = useState({
    name: '', destinationUrl: '', utmSource: '', utmMedium: '',
    utmCampaign: '', utmContent: '', utmTerm: '',
  });

  // Lead form state
  const [leadForm, setLeadForm] = useState({
    name: '', phone: '', email: '', source: 'OTHER',
    status: 'NEW', value: '', notes: '',
  });

  const filterParams = {
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm || undefined,
  };

  // ─── Queries ─────────────

  const { data: dashboardData, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['tracking-dashboard', filterParams.startDate, filterParams.endDate, filterParams.source, filterParams.status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterParams.startDate) params.startDate = filterParams.startDate;
      if (filterParams.endDate) params.endDate = filterParams.endDate;
      if (filterParams.source) params.source = filterParams.source;
      if (filterParams.status) params.status = filterParams.status;
      const res = await api.get('/api/tracking/dashboard', { params });
      return res.data.data;
    },
    enabled: activeTab === 'dashboard',
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['tracking-leads', filterParams],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterParams.startDate) params.startDate = filterParams.startDate;
      if (filterParams.endDate) params.endDate = filterParams.endDate;
      if (filterParams.source) params.source = filterParams.source;
      if (filterParams.status) params.status = filterParams.status;
      if (filterParams.search) params.search = filterParams.search;
      const res = await api.get('/api/tracking/leads', { params });
      return res.data.data;
    },
    enabled: activeTab === 'leads',
  });

  const { data: links, isLoading: linksLoading } = useQuery<TrackingLink[]>({
    queryKey: ['tracking-links'],
    queryFn: async () => {
      const res = await api.get('/api/tracking/links');
      return res.data.data;
    },
    enabled: activeTab === 'links',
  });

  const { data: apiKeyData } = useQuery<{ apiKey: string | null }>({
    queryKey: ['tracking-api-key'],
    queryFn: async () => {
      const res = await api.get('/api/tracking/api-key');
      return res.data.data;
    },
    enabled: activeTab === 'links',
  });

  // ─── Mutations ─────────────

  const createLinkMut = useMutation({
    mutationFn: (data: typeof linkForm) => api.post('/api/tracking/links', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-links'] });
      setLinkDialogOpen(false);
      setLinkForm({ name: '', destinationUrl: '', utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '' });
      toast.success('Link criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar link'),
  });

  const deleteLinkMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tracking/links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-links'] });
      toast.success('Link excluído');
    },
    onError: () => toast.error('Erro ao excluir link'),
  });

  const createLeadMut = useMutation({
    mutationFn: (data: any) => api.post('/api/tracking/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-leads'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      setLeadDialogOpen(false);
      resetLeadForm();
      toast.success('Lead criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar lead'),
  });

  const updateLeadMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/tracking/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-leads'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      setEditingLead(null);
      setLeadDialogOpen(false);
      resetLeadForm();
      toast.success('Lead atualizado');
    },
    onError: () => toast.error('Erro ao atualizar lead'),
  });

  const deleteLeadMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tracking/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-leads'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-dashboard'] });
      toast.success('Lead excluído');
    },
    onError: () => toast.error('Erro ao excluir lead'),
  });

  const regenerateKeyMut = useMutation({
    mutationFn: () => api.post('/api/tracking/api-key/regenerate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-api-key'] });
      toast.success('Chave API regenerada');
    },
    onError: () => toast.error('Erro ao regenerar chave'),
  });

  // ─── Helpers ─────────────

  function resetLeadForm() {
    setLeadForm({ name: '', phone: '', email: '', source: 'OTHER', status: 'NEW', value: '', notes: '' });
  }

  function openEditLead(lead: Lead) {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source,
      status: lead.status,
      value: lead.value?.toString() || '',
      notes: lead.notes || '',
    });
    setLeadDialogOpen(true);
  }

  function handleLeadSubmit() {
    const data = {
      ...leadForm,
      value: leadForm.value ? parseFloat(leadForm.value) : undefined,
      email: leadForm.email || undefined,
    };
    if (editingLead) {
      updateLeadMut.mutate({ id: editingLead.id, data });
    } else {
      createLeadMut.mutate(data);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;

  // ─── Chart Options ─────────────

  const areaChartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    xaxis: {
      categories: dashboardData?.timeSeries.map((t) => t.date) || [],
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    colors: ['#3B82F6'],
    tooltip: { y: { formatter: (val: number) => `${val} leads` } },
  };

  const donutChartOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: dashboardData?.bySource.map((s) => getSourceLabel(s.source)) || [],
    colors: dashboardData?.bySource.map((s) => SOURCE_COLORS[s.source] || '#6B7280') || [],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '60%' } } },
  };

  // ─── Render ─────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Rastreamento de leads, links e pipeline de vendas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-2" />Dashboard</TabsTrigger>
          <TabsTrigger value="leads"><Users className="h-4 w-4 mr-2" />Leads</TabsTrigger>
          <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-2" />Links de Rastreamento</TabsTrigger>
        </TabsList>

        {/* ════════════ DASHBOARD TAB ════════════ */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[280px]" />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                {SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          {dashLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Leads</CardTitle>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{dashboardData?.stats.totalLeads || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Leads Hoje</CardTitle>
                  <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-lg"><UserPlus className="h-4 w-4 text-green-600" /></div>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{dashboardData?.stats.leadsToday || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{dashboardData?.stats.conversionRate || 0}%</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg"><DollarSign className="h-4 w-4 text-orange-600" /></div>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(dashboardData?.stats.totalValue || 0)}</div></CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Leads ao Longo do Tempo</CardTitle></CardHeader>
              <CardContent>
                {dashboardData?.timeSeries && dashboardData.timeSeries.length > 0 ? (
                  <ReactApexChart
                    options={areaChartOptions}
                    series={[{ name: 'Leads', data: dashboardData.timeSeries.map((t) => t.count) }]}
                    type="area" height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Leads por Fonte</CardTitle></CardHeader>
              <CardContent>
                {dashboardData?.bySource && dashboardData.bySource.length > 0 ? (
                  <ReactApexChart
                    options={donutChartOptions}
                    series={dashboardData.bySource.map((s) => s.count)}
                    type="donut" height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════ LEADS TAB ════════════ */}
        <TabsContent value="leads" className="space-y-4">
          {/* Filters + Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, email ou telefone..." className="pl-9"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[240px]" />
            <Button onClick={() => { setEditingLead(null); resetLeadForm(); setLeadDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Lead
            </Button>
          </div>

          {/* Table */}
          {leadsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Telefone</th>
                      <th className="text-left p-3 font-medium">Fonte</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Campanha</th>
                      <th className="text-right p-3 font-medium">Valor</th>
                      <th className="text-left p-3 font-medium">Data</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads && leads.length > 0 ? leads.map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div>{lead.name || '-'}</div>
                          {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                        </td>
                        <td className="p-3">{lead.phone || '-'}</td>
                        <td className="p-3"><Badge variant="outline">{getSourceLabel(lead.source)}</Badge></td>
                        <td className="p-3">{getStatusBadge(lead.status)}</td>
                        <td className="p-3 text-muted-foreground">{lead.campaign?.name || '-'}</td>
                        <td className="p-3 text-right">{lead.value ? formatCurrency(lead.value) : '-'}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditLead(lead)}><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir este lead?')) deleteLeadMut.mutate(lead.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum lead encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════════════ LINKS TAB ════════════ */}
        <TabsContent value="links" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Links de Rastreamento</h3>
              <p className="text-sm text-muted-foreground">Crie links com UTM para rastrear cliques e leads</p>
            </div>
            <Button onClick={() => { setLinkForm({ name: '', destinationUrl: '', utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '' }); setLinkDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Link
            </Button>
          </div>

          {linksLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">URL Curta</th>
                      <th className="text-left p-3 font-medium">Destino</th>
                      <th className="text-center p-3 font-medium">Cliques</th>
                      <th className="text-center p-3 font-medium">Únicos</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links && links.length > 0 ? links.map((link) => {
                      const shortUrl = `${baseUrl}/t/${link.shortCode}`;
                      return (
                        <tr key={link.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{link.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">{shortUrl}</code>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => copyToClipboard(shortUrl, link.id)}>
                                {copiedId === link.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 max-w-[200px]">
                              <span className="truncate text-muted-foreground text-xs">{link.destinationUrl}</span>
                              <a href={link.destinationUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              </a>
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">{link.totalClicks}</td>
                          <td className="p-3 text-center font-medium">{link.uniqueClicks}</td>
                          <td className="p-3 text-center">
                            <Badge variant={link.isActive ? 'default' : 'secondary'}>
                              {link.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm"
                              onClick={() => { if (confirm('Excluir este link?')) deleteLinkMut.mutate(link.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum link criado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />Chave API para Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use esta chave para enviar leads via webhook externo.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={apiKeyData?.apiKey || 'Nenhuma chave gerada'} className="font-mono text-sm" />
                {apiKeyData?.apiKey && (
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(apiKeyData.apiKey!, 'api-key')}>
                    {copiedId === 'api-key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => regenerateKeyMut.mutate()} disabled={regenerateKeyMut.isPending}>
                  <RefreshCw className={`h-4 w-4 ${regenerateKeyMut.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {apiKeyData?.apiKey && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Endpoint do Webhook:</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-3 py-2 rounded flex-1 break-all">
                      POST {baseUrl}/api/tracking/webhook?api_key={apiKeyData.apiKey}
                    </code>
                    <Button variant="outline" size="sm"
                      onClick={() => copyToClipboard(`${baseUrl}/api/tracking/webhook?api_key=${apiKeyData.apiKey}`, 'webhook-url')}>
                      {copiedId === 'webhook-url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════ LINK DIALOG ════════════ */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Link de Rastreamento</DialogTitle>
            <DialogDescription>Crie um link com parâmetros UTM para rastrear tráfego.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={linkForm.name} onChange={(e) => setLinkForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Facebook - Black Friday" /></div>
            <div><Label>URL de Destino *</Label><Input value={linkForm.destinationUrl} onChange={(e) => setLinkForm((f) => ({ ...f, destinationUrl: e.target.value }))} placeholder="https://meusite.com/landing" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>UTM Source</Label><Input value={linkForm.utmSource} onChange={(e) => setLinkForm((f) => ({ ...f, utmSource: e.target.value }))} placeholder="facebook" /></div>
              <div><Label>UTM Medium</Label><Input value={linkForm.utmMedium} onChange={(e) => setLinkForm((f) => ({ ...f, utmMedium: e.target.value }))} placeholder="cpc" /></div>
              <div><Label>UTM Campaign</Label><Input value={linkForm.utmCampaign} onChange={(e) => setLinkForm((f) => ({ ...f, utmCampaign: e.target.value }))} placeholder="black_friday_2025" /></div>
              <div><Label>UTM Content</Label><Input value={linkForm.utmContent} onChange={(e) => setLinkForm((f) => ({ ...f, utmContent: e.target.value }))} placeholder="banner_v1" /></div>
            </div>
            <div><Label>UTM Term</Label><Input value={linkForm.utmTerm} onChange={(e) => setLinkForm((f) => ({ ...f, utmTerm: e.target.value }))} placeholder="marketing digital" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createLinkMut.mutate(linkForm)} disabled={!linkForm.name || !linkForm.destinationUrl || createLinkMut.isPending}>
              {createLinkMut.isPending ? 'Criando...' : 'Criar Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ LEAD DIALOG ════════════ */}
      <Dialog open={leadDialogOpen} onOpenChange={(open) => { setLeadDialogOpen(open); if (!open) { setEditingLead(null); resetLeadForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
            <DialogDescription>{editingLead ? 'Atualize as informações do lead.' : 'Adicione um lead manualmente.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={leadForm.name} onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={leadForm.phone} onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={leadForm.email} onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fonte</Label>
                <Select value={leadForm.source} onValueChange={(v) => setLeadForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={leadForm.status} onValueChange={(v) => setLeadForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={leadForm.value} onChange={(e) => setLeadForm((f) => ({ ...f, value: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Observações</Label><Textarea value={leadForm.notes} onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLeadSubmit} disabled={createLeadMut.isPending || updateLeadMut.isPending}>
              {(createLeadMut.isPending || updateLeadMut.isPending) ? 'Salvando...' : editingLead ? 'Salvar' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
