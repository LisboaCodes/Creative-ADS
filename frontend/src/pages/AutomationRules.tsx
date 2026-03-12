import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { formatDate } from '../lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  Clock,
  Activity,
  Settings2,
  Loader2,
  TrendingUp,
  CalendarClock,
  AlertTriangle,
  RotateCcw,
  Wallet,
  FlaskConical,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// --- Type definitions ---

interface AutomationRule {
  id: string;
  name: string;
  ruleType: string;
  metric: string;
  operator: string;
  value: number;
  periodDays: number;
  conditions?: any[];
  conditionLogic?: string;
  config?: any;
  actionType: string;
  actionValue?: number;
  webhookUrl?: string;
  webhookHeaders?: any;
  applyTo: string;
  campaignIds?: string[];
  platformTypes?: string[];
  status: string;
  lastRunAt?: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
}

interface BudgetCap {
  id: string;
  platformType: string;
  dailyCapAmount: number | null;
  weeklyCapAmount: number | null;
  currentDailySpend: number;
  currentWeeklySpend: number;
  isActive: boolean;
}

interface ABTest {
  id: string;
  name: string;
  status: string;
  campaignIds: string[];
  metric: string;
  evaluationDays: number;
  totalDailyBudget: number | null;
  winnerId: string | null;
  results: any;
  startedAt: string;
  evaluateAt: string;
  completedAt: string | null;
}

// --- Label maps ---

const metricLabels: Record<string, string> = {
  ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', roas: 'ROAS', spend: 'Gasto', conversions: 'Conversoes',
};

const operatorLabels: Record<string, string> = {
  lt: '< Menor que', gt: '> Maior que', lte: '<= Menor ou igual', gte: '>= Maior ou igual', eq: '= Igual',
};

const operatorSymbols: Record<string, string> = {
  lt: '<', gt: '>', lte: '<=', gte: '>=', eq: '=',
};

const actionLabels: Record<string, string> = {
  pause: 'Pausar campanha', activate: 'Ativar campanha',
  increase_budget: 'Aumentar orcamento', decrease_budget: 'Diminuir orcamento',
  notify: 'Notificar', webhook: 'Webhook',
};

const ruleTypeLabels: Record<string, string> = {
  simple: 'Simples', compound: 'Composta (AND/OR)', scaling: 'Smart Scaling',
  dayparting: 'Dayparting', anomaly: 'Deteccao de Anomalia', auto_restart: 'Auto-Restart',
};

const ruleTypeIcons: Record<string, typeof Zap> = {
  simple: Zap, compound: Activity, scaling: TrendingUp,
  dayparting: CalendarClock, anomaly: AlertTriangle, auto_restart: RotateCcw,
};

const platformLabels: Record<string, string> = {
  FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', GOOGLE_ADS: 'Google Ads',
  TIKTOK: 'TikTok', LINKEDIN: 'LinkedIn',
};

const periodOptions = [
  { value: '1', label: '1 dia' },
  { value: '3', label: '3 dias' },
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
];

const budgetActions = ['increase_budget', 'decrease_budget'];

const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

// --- Helper functions ---

function buildConditionText(rule: AutomationRule): string {
  if (rule.ruleType === 'compound' && rule.conditions?.length) {
    const conds = rule.conditions.map((c: any) =>
      `${metricLabels[c.metric] || c.metric} ${operatorSymbols[c.operator] || c.operator} ${c.value}`
    );
    return `Se ${conds.join(` ${rule.conditionLogic || 'AND'} `)}`;
  }
  if (rule.ruleType === 'scaling') {
    const cfg = rule.config || {};
    return `Se ${metricLabels[rule.metric] || rule.metric} ${operatorSymbols[rule.operator]} ${rule.value} por ${cfg.consecutiveDays || 3} dias consecutivos`;
  }
  if (rule.ruleType === 'dayparting') return 'Horarios programados';
  if (rule.ruleType === 'anomaly') {
    const cfg = rule.config || {};
    return `Detectar anomalia > ${cfg.deviationPercent || 50}% em ${metricLabels[rule.metric] || rule.metric}`;
  }
  if (rule.ruleType === 'auto_restart') {
    const cfg = rule.config || {};
    return `Reativar apos ${cfg.waitDays || 3} dias de pausa`;
  }
  const metric = metricLabels[rule.metric] || rule.metric;
  const op = operatorSymbols[rule.operator] || rule.operator;
  return `Se ${metric} ${op} ${rule.value} nos ultimos ${rule.periodDays} dias`;
}

function buildActionText(rule: AutomationRule): string {
  if (rule.ruleType === 'dayparting') return 'Pausar/Ativar por horario';
  if (rule.ruleType === 'scaling') return `Escalar budget +${rule.config?.increasePercent || 20}%`;
  if (rule.ruleType === 'auto_restart') return 'Reativar campanha';
  const action = actionLabels[rule.actionType] || rule.actionType;
  if (budgetActions.includes(rule.actionType) && rule.actionValue) return `${action} em ${rule.actionValue}%`;
  if (rule.actionType === 'webhook') return 'Webhook';
  return action;
}

// --- Component ---

export default function AutomationRules() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules');

  // ─── Rules state ─────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formRuleType, setFormRuleType] = useState('simple');
  const [formMetric, setFormMetric] = useState('ctr');
  const [formOperator, setFormOperator] = useState('lt');
  const [formValue, setFormValue] = useState('');
  const [formPeriodDays, setFormPeriodDays] = useState('7');
  const [formActionType, setFormActionType] = useState('pause');
  const [formActionValue, setFormActionValue] = useState('');
  const [formApplyTo, setFormApplyTo] = useState('all');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [formWebhookHeaders, setFormWebhookHeaders] = useState('');
  // Compound
  const [formConditions, setFormConditions] = useState<Array<{ metric: string; operator: string; value: string; periodDays: string }>>([]);
  const [formConditionLogic, setFormConditionLogic] = useState('AND');
  // Scaling
  const [formScalingPct, setFormScalingPct] = useState('20');
  const [formScalingMax, setFormScalingMax] = useState('10000');
  const [formScalingDays, setFormScalingDays] = useState('3');
  const [formScalingCooldown, setFormScalingCooldown] = useState('24');
  // Dayparting
  const [formDaypartSchedule, setFormDaypartSchedule] = useState<Array<{ day: number; startHour: number; endHour: number; active: boolean }>>(
    dayNames.map((_, i) => ({ day: i, startHour: 8, endHour: 22, active: i >= 1 && i <= 5 }))
  );
  const [formTimezone, setFormTimezone] = useState('America/Sao_Paulo');
  // Anomaly
  const [formAnomalyRefDays, setFormAnomalyRefDays] = useState('30');
  const [formAnomalyDeviation, setFormAnomalyDeviation] = useState('50');
  const [formAnomalyDirection, setFormAnomalyDirection] = useState('both');
  // Auto-restart
  const [formRestartWaitDays, setFormRestartWaitDays] = useState('3');
  const [formRestartMetric, setFormRestartMetric] = useState('');
  const [formRestartOperator, setFormRestartOperator] = useState('gt');
  const [formRestartValue, setFormRestartValue] = useState('');

  // ─── Budget Caps state ─────────────────────────────────
  const [capDialogOpen, setCapDialogOpen] = useState(false);
  const [capPlatform, setCapPlatform] = useState('FACEBOOK');
  const [capDaily, setCapDaily] = useState('');
  const [capWeekly, setCapWeekly] = useState('');

  // ─── A/B Test state ─────────────────────────────────
  const [abDialogOpen, setAbDialogOpen] = useState(false);
  const [abName, setAbName] = useState('');
  const [abMetric, setAbMetric] = useState('roas');
  const [abDays, setAbDays] = useState('7');
  const [abBudget, setAbBudget] = useState('');
  const [abCampaignIds, setAbCampaignIds] = useState('');

  // ─── Queries ─────────────────────────────────

  const { data: rules, isLoading } = useQuery<AutomationRule[]>({
    queryKey: ['automation-rules'],
    queryFn: async () => { const res = await api.get('/api/automation'); return res.data.data; },
  });

  const { data: budgetCaps } = useQuery<BudgetCap[]>({
    queryKey: ['budget-caps'],
    queryFn: async () => { const res = await api.get('/api/automation/budget-caps'); return res.data.data; },
  });

  const { data: abTests } = useQuery<ABTest[]>({
    queryKey: ['ab-tests'],
    queryFn: async () => { const res = await api.get('/api/automation/ab-tests'); return res.data.data; },
  });

  const { data: campaigns } = useQuery<any[]>({
    queryKey: ['campaigns-list'],
    queryFn: async () => { const res = await api.get('/api/campaigns'); return res.data.data; },
  });

  // ─── Mutations ─────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/automation', payload);
      return res.data.data;
    },
    onSuccess: () => { toast.success('Regra criada!'); queryClient.invalidateQueries({ queryKey: ['automation-rules'] }); handleCloseDialog(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao criar regra'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/api/automation/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => { toast.success('Regra atualizada!'); queryClient.invalidateQueries({ queryKey: ['automation-rules'] }); handleCloseDialog(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/automation/${id}`); },
    onSuccess: () => { toast.success('Regra excluida!'); queryClient.invalidateQueries({ queryKey: ['automation-rules'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao excluir'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const res = await api.patch(`/api/automation/${id}`, { status: newStatus });
      return res.data.data;
    },
    onSuccess: (_d, v) => {
      toast.success(`Regra ${v.currentStatus === 'ACTIVE' ? 'pausada' : 'ativada'}!`);
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  // Budget cap mutations
  const capMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/automation/budget-caps', data); return res.data.data; },
    onSuccess: () => { toast.success('Limite salvo!'); queryClient.invalidateQueries({ queryKey: ['budget-caps'] }); setCapDialogOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  const deleteCapMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/automation/budget-caps/${id}`); },
    onSuccess: () => { toast.success('Limite removido!'); queryClient.invalidateQueries({ queryKey: ['budget-caps'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  // A/B test mutations
  const abCreateMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/automation/ab-tests', data); return res.data.data; },
    onSuccess: () => { toast.success('Teste A/B criado!'); queryClient.invalidateQueries({ queryKey: ['ab-tests'] }); setAbDialogOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  const abCancelMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/api/automation/ab-tests/${id}/cancel`); },
    onSuccess: () => { toast.success('Teste cancelado!'); queryClient.invalidateQueries({ queryKey: ['ab-tests'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  // ─── Handlers ─────────────────────────────────

  function resetForm() {
    setFormName(''); setFormRuleType('simple'); setFormMetric('ctr'); setFormOperator('lt');
    setFormValue(''); setFormPeriodDays('7'); setFormActionType('pause'); setFormActionValue('');
    setFormApplyTo('all'); setFormWebhookUrl(''); setFormWebhookHeaders('');
    setFormConditions([]); setFormConditionLogic('AND');
    setFormScalingPct('20'); setFormScalingMax('10000'); setFormScalingDays('3'); setFormScalingCooldown('24');
    setFormDaypartSchedule(dayNames.map((_, i) => ({ day: i, startHour: 8, endHour: 22, active: i >= 1 && i <= 5 })));
    setFormTimezone('America/Sao_Paulo');
    setFormAnomalyRefDays('30'); setFormAnomalyDeviation('50'); setFormAnomalyDirection('both');
    setFormRestartWaitDays('3'); setFormRestartMetric(''); setFormRestartOperator('gt'); setFormRestartValue('');
  }

  function handleOpenCreate() {
    setEditingRule(null);
    resetForm();
    setDialogOpen(true);
  }

  function handleOpenEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormRuleType(rule.ruleType || 'simple');
    setFormMetric(rule.metric);
    setFormOperator(rule.operator);
    setFormValue(String(rule.value));
    setFormPeriodDays(String(rule.periodDays));
    setFormActionType(rule.actionType);
    setFormActionValue(rule.actionValue ? String(rule.actionValue) : '');
    setFormApplyTo(rule.applyTo);
    setFormWebhookUrl(rule.webhookUrl || '');
    setFormWebhookHeaders(rule.webhookHeaders ? JSON.stringify(rule.webhookHeaders) : '');
    setFormConditions(rule.conditions?.map((c: any) => ({ ...c, value: String(c.value), periodDays: String(c.periodDays || rule.periodDays) })) || []);
    setFormConditionLogic(rule.conditionLogic || 'AND');
    const cfg = rule.config || {};
    setFormScalingPct(String(cfg.increasePercent || 20));
    setFormScalingMax(String(cfg.maxBudget || 10000));
    setFormScalingDays(String(cfg.consecutiveDays || 3));
    setFormScalingCooldown(String(cfg.cooldownHours || 24));
    setFormDaypartSchedule(cfg.schedule || dayNames.map((_, i) => ({ day: i, startHour: 8, endHour: 22, active: i >= 1 && i <= 5 })));
    setFormTimezone(cfg.timezone || 'America/Sao_Paulo');
    setFormAnomalyRefDays(String(cfg.referencePeriodDays || 30));
    setFormAnomalyDeviation(String(cfg.deviationPercent || 50));
    setFormAnomalyDirection(cfg.direction || 'both');
    setFormRestartWaitDays(String(cfg.waitDays || 3));
    setFormRestartMetric(cfg.restartMetric || '');
    setFormRestartOperator(cfg.restartOperator || 'gt');
    setFormRestartValue(cfg.restartValue !== undefined ? String(cfg.restartValue) : '');
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingRule(null);
    resetForm();
  }

  function buildPayload() {
    const payload: any = {
      name: formName,
      ruleType: formRuleType,
      metric: formMetric,
      operator: formOperator,
      value: Number(formValue) || 0,
      periodDays: Number(formPeriodDays) || 7,
      actionType: formActionType,
      actionValue: budgetActions.includes(formActionType) ? Number(formActionValue) || undefined : undefined,
      applyTo: formApplyTo,
    };

    if (formActionType === 'webhook') {
      payload.webhookUrl = formWebhookUrl;
      try { payload.webhookHeaders = formWebhookHeaders ? JSON.parse(formWebhookHeaders) : undefined; } catch { /* ignore */ }
    }

    if (formRuleType === 'compound') {
      payload.conditions = formConditions.map(c => ({
        metric: c.metric, operator: c.operator, value: Number(c.value), periodDays: Number(c.periodDays) || 7,
      }));
      payload.conditionLogic = formConditionLogic;
    }

    if (formRuleType === 'scaling') {
      payload.config = {
        increasePercent: Number(formScalingPct) || 20,
        maxBudget: Number(formScalingMax) || 10000,
        consecutiveDays: Number(formScalingDays) || 3,
        cooldownHours: Number(formScalingCooldown) || 24,
      };
    }

    if (formRuleType === 'dayparting') {
      payload.config = { timezone: formTimezone, schedule: formDaypartSchedule };
    }

    if (formRuleType === 'anomaly') {
      payload.config = {
        referencePeriodDays: Number(formAnomalyRefDays) || 30,
        deviationPercent: Number(formAnomalyDeviation) || 50,
        direction: formAnomalyDirection,
      };
    }

    if (formRuleType === 'auto_restart') {
      payload.config = {
        waitDays: Number(formRestartWaitDays) || 3,
        ...(formRestartMetric ? {
          restartMetric: formRestartMetric,
          restartOperator: formRestartOperator,
          restartValue: Number(formRestartValue) || 0,
        } : {}),
      };
    }

    return payload;
  }

  function handleSubmit() {
    if (!formName.trim()) { toast.error('Informe o nome da regra'); return; }
    if (formRuleType === 'simple' && (!formValue || isNaN(Number(formValue)))) {
      toast.error('Informe um valor numerico'); return;
    }
    if (formRuleType === 'compound' && formConditions.length < 2) {
      toast.error('Adicione pelo menos 2 condicoes'); return;
    }
    if (formActionType === 'webhook' && !formWebhookUrl) {
      toast.error('Informe a URL do webhook'); return;
    }

    const payload = buildPayload();
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Loading ─────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-4 w-96" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-4 w-64" /></CardHeader>
              <CardContent><div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7" />
            Automacoes
          </h1>
          <p className="text-muted-foreground mt-1">Regras, limites de orcamento, testes A/B e mais</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Regras ({rules?.length || 0})</TabsTrigger>
          <TabsTrigger value="budget-caps">Limites de Orcamento</TabsTrigger>
          <TabsTrigger value="ab-tests">Testes A/B</TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB: REGRAS ═══════════ */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />Nova Regra</Button>
          </div>

          {/* Summary stats */}
          {rules && rules.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg"><Activity className="h-4 w-4 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{rules.filter(r => r.status === 'ACTIVE').length}</p><p className="text-sm text-muted-foreground">Ativas</p></div>
              </div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg"><Settings2 className="h-4 w-4 text-yellow-600" /></div>
                <div><p className="text-2xl font-bold">{rules.filter(r => r.status === 'PAUSED').length}</p><p className="text-sm text-muted-foreground">Pausadas</p></div>
              </div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><Clock className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-2xl font-bold">{rules.reduce((s, r) => s + r.triggerCount, 0)}</p><p className="text-sm text-muted-foreground">Execucoes</p></div>
              </div></CardContent></Card>
            </div>
          )}

          {/* Rules grid */}
          {rules && rules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const Icon = ruleTypeIcons[rule.ruleType] || Zap;
                return (
                  <Card key={rule.id} className={`transition-opacity ${rule.status === 'PAUSED' ? 'opacity-70' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">{ruleTypeLabels[rule.ruleType] || rule.ruleType}</Badge>
                          </div>
                          <CardTitle className="text-base truncate">{rule.name}</CardTitle>
                          <CardDescription className="mt-1">{buildConditionText(rule)}</CardDescription>
                        </div>
                        <Switch checked={rule.status === 'ACTIVE'} onCheckedChange={() => toggleStatusMutation.mutate({ id: rule.id, currentStatus: rule.status })} disabled={toggleStatusMutation.isPending} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={rule.status === 'ACTIVE' ? 'success' : 'secondary'}>{rule.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}</Badge>
                        <Badge variant="outline">{buildActionText(rule)}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{rule.lastTriggeredAt ? `Ultimo trigger: ${formatDate(rule.lastTriggeredAt)}` : 'Nunca disparada'}</div>
                        <div className="flex items-center gap-1"><Activity className="h-3 w-3" />{rule.triggerCount} {rule.triggerCount === 1 ? 'vez' : 'vezes'}</div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(rule)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`Excluir "${rule.name}"?`)) deleteMutation.mutate(rule.id); }} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma regra</h3>
              <p className="text-muted-foreground mb-4">Crie sua primeira regra de automacao</p>
              <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />Criar Regra</Button>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════ TAB: BUDGET CAPS ═══════════ */}
        <TabsContent value="budget-caps" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Defina limites diarios e semanais de gasto por plataforma</p>
            <Button onClick={() => { setCapPlatform('FACEBOOK'); setCapDaily(''); setCapWeekly(''); setCapDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Limite
            </Button>
          </div>

          {budgetCaps && budgetCaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetCaps.map((cap) => (
                <Card key={cap.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {platformLabels[cap.platformType] || cap.platformType}
                      </CardTitle>
                      <Badge variant={cap.isActive ? 'success' : 'secondary'}>{cap.isActive ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cap.dailyCapAmount && (
                      <div>
                        <div className="flex justify-between text-sm"><span>Diario</span><span>R${cap.currentDailySpend.toFixed(2)} / R${cap.dailyCapAmount.toFixed(2)}</span></div>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div className={`h-2 rounded-full ${cap.currentDailySpend > cap.dailyCapAmount ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, (cap.currentDailySpend / cap.dailyCapAmount) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {cap.weeklyCapAmount && (
                      <div>
                        <div className="flex justify-between text-sm"><span>Semanal</span><span>R${cap.currentWeeklySpend.toFixed(2)} / R${cap.weeklyCapAmount.toFixed(2)}</span></div>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div className={`h-2 rounded-full ${cap.currentWeeklySpend > cap.weeklyCapAmount ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, (cap.currentWeeklySpend / cap.weeklyCapAmount) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm('Remover este limite?')) deleteCapMutation.mutate(cap.id); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum limite definido</h3>
              <p className="text-muted-foreground mb-4">Defina limites para controlar gastos por plataforma</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════ TAB: A/B TESTS ═══════════ */}
        <TabsContent value="ab-tests" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Compare campanhas e encontre a vencedora automaticamente</p>
            <Button onClick={() => { setAbName(''); setAbMetric('roas'); setAbDays('7'); setAbBudget(''); setAbCampaignIds(''); setAbDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Teste A/B
            </Button>
          </div>

          {abTests && abTests.length > 0 ? (
            <div className="space-y-4">
              {abTests.map((test) => {
                const statusColors: Record<string, string> = { RUNNING: 'default', EVALUATING: 'secondary', COMPLETED: 'success', CANCELLED: 'destructive' };
                const statusLabels: Record<string, string> = { RUNNING: 'Em andamento', EVALUATING: 'Avaliando', COMPLETED: 'Concluido', CANCELLED: 'Cancelado' };
                return (
                  <Card key={test.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" />{test.name}</CardTitle>
                        <Badge variant={statusColors[test.status] as any}>{statusLabels[test.status] || test.status}</Badge>
                      </div>
                      <CardDescription>Metrica: {metricLabels[test.metric] || test.metric} | {test.campaignIds.length} campanhas | {test.evaluationDays} dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Inicio: {formatDate(test.startedAt)}</span>
                        <span>Avaliacao: {formatDate(test.evaluateAt)}</span>
                        {test.winnerId && <Badge variant="success">Vencedor definido</Badge>}
                      </div>
                      {test.results?.rankings && (
                        <div className="mt-3 space-y-1">
                          {test.results.rankings.map((r: any, i: number) => (
                            <div key={r.campaignId} className={`flex justify-between text-sm px-2 py-1 rounded ${i === 0 ? 'bg-green-50 dark:bg-green-950 font-medium' : ''}`}>
                              <span>{i === 0 ? '🏆 ' : ''}{r.campaignName}</span>
                              <span>{metricLabels[test.metric]}: {r.metricValue?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {test.status === 'RUNNING' && (
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => { if (window.confirm('Cancelar teste?')) abCancelMutation.mutate(test.id); }}>
                          <X className="h-3.5 w-3.5 mr-1" />Cancelar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum teste A/B</h3>
              <p className="text-muted-foreground mb-4">Crie um teste para comparar campanhas</p>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════ DIALOG: NOVA/EDITAR REGRA ═══════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Automacao'}</DialogTitle>
            <DialogDescription>Configure os parametros da regra</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nome da regra</Label>
              <Input placeholder="Ex: Pausar campanhas com CTR baixo" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            {/* Rule Type */}
            <div className="space-y-2">
              <Label>Tipo de regra</Label>
              <Select value={formRuleType} onValueChange={setFormRuleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ruleTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Simple / Compound shared fields ── */}
            {(formRuleType === 'simple' || formRuleType === 'anomaly') && (
              <>
                <div className="space-y-2">
                  <Label>Condicao</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Select value={formMetric} onValueChange={setFormMetric}>
                      <SelectTrigger><SelectValue placeholder="Metrica" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formOperator} onValueChange={setFormOperator}>
                      <SelectTrigger><SelectValue placeholder="Operador" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(operatorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="any" placeholder="Valor" value={formValue} onChange={(e) => setFormValue(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Periodo</Label>
                  <Select value={formPeriodDays} onValueChange={setFormPeriodDays}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── Scaling fields ── */}
            {formRuleType === 'scaling' && (
              <>
                <div className="space-y-2">
                  <Label>Condicao para escalar</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Select value={formMetric} onValueChange={setFormMetric}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={formOperator} onValueChange={setFormOperator}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(operatorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="any" placeholder="Valor" value={formValue} onChange={(e) => setFormValue(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>% aumento</Label><Input type="number" value={formScalingPct} onChange={(e) => setFormScalingPct(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Budget maximo (R$)</Label><Input type="number" value={formScalingMax} onChange={(e) => setFormScalingMax(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Dias consecutivos</Label><Input type="number" value={formScalingDays} onChange={(e) => setFormScalingDays(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Cooldown (horas)</Label><Input type="number" value={formScalingCooldown} onChange={(e) => setFormScalingCooldown(e.target.value)} /></div>
                </div>
              </>
            )}

            {/* ── Compound fields ── */}
            {formRuleType === 'compound' && (
              <>
                <div className="flex items-center gap-3">
                  <Label>Logica:</Label>
                  <Select value={formConditionLogic} onValueChange={setFormConditionLogic}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="AND">AND</SelectItem><SelectItem value="OR">OR</SelectItem></SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setFormConditions([...formConditions, { metric: 'ctr', operator: 'lt', value: '', periodDays: '7' }])}>
                    <Plus className="h-3 w-3 mr-1" />Condicao
                  </Button>
                </div>
                {formConditions.map((cond, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <Select value={cond.metric} onValueChange={(v) => { const c = [...formConditions]; c[i].metric = v; setFormConditions(c); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={cond.operator} onValueChange={(v) => { const c = [...formConditions]; c[i].operator = v; setFormConditions(c); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(operatorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="any" placeholder="Valor" value={cond.value} onChange={(e) => { const c = [...formConditions]; c[i].value = e.target.value; setFormConditions(c); }} />
                    <Select value={cond.periodDays} onValueChange={(v) => { const c = [...formConditions]; c[i].periodDays = v; setFormConditions(c); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => setFormConditions(formConditions.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                {formConditions.length < 2 && <p className="text-xs text-muted-foreground">Adicione pelo menos 2 condicoes</p>}
              </>
            )}

            {/* ── Dayparting fields ── */}
            {formRuleType === 'dayparting' && (
              <>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={formTimezone} onValueChange={setFormTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasilia (BRT)</SelectItem>
                      <SelectItem value="America/New_York">New York (ET)</SelectItem>
                      <SelectItem value="Europe/Lisbon">Lisboa (WET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horarios por dia</Label>
                  <div className="space-y-2">
                    {formDaypartSchedule.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Switch checked={s.active} onCheckedChange={(v) => {
                          const sched = [...formDaypartSchedule]; sched[i].active = v; setFormDaypartSchedule(sched);
                        }} />
                        <span className="w-20">{dayNames[i]}</span>
                        {s.active && (
                          <>
                            <Input type="number" min={0} max={23} className="w-16" value={s.startHour} onChange={(e) => {
                              const sched = [...formDaypartSchedule]; sched[i].startHour = Number(e.target.value); setFormDaypartSchedule(sched);
                            }} />
                            <span>h ate</span>
                            <Input type="number" min={0} max={23} className="w-16" value={s.endHour} onChange={(e) => {
                              const sched = [...formDaypartSchedule]; sched[i].endHour = Number(e.target.value); setFormDaypartSchedule(sched);
                            }} />
                            <span>h</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Anomaly extra fields ── */}
            {formRuleType === 'anomaly' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Periodo referencia (dias)</Label><Input type="number" value={formAnomalyRefDays} onChange={(e) => setFormAnomalyRefDays(e.target.value)} /></div>
                <div className="space-y-2"><Label>Desvio minimo (%)</Label><Input type="number" value={formAnomalyDeviation} onChange={(e) => setFormAnomalyDeviation(e.target.value)} /></div>
                <div className="space-y-2"><Label>Direcao</Label>
                  <Select value={formAnomalyDirection} onValueChange={setFormAnomalyDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="up">Subiu</SelectItem><SelectItem value="down">Caiu</SelectItem><SelectItem value="both">Ambos</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── Auto-restart fields ── */}
            {formRuleType === 'auto_restart' && (
              <>
                <div className="space-y-2"><Label>Dias de espera apos pausa</Label>
                  <Input type="number" value={formRestartWaitDays} onChange={(e) => setFormRestartWaitDays(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Condicao para reativar (opcional)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Select value={formRestartMetric} onValueChange={setFormRestartMetric}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formRestartMetric && (
                      <>
                        <Select value={formRestartOperator} onValueChange={setFormRestartOperator}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(operatorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" step="any" placeholder="Valor" value={formRestartValue} onChange={(e) => setFormRestartValue(e.target.value)} />
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Action (for simple, compound, anomaly) ── */}
            {['simple', 'compound', 'anomaly'].includes(formRuleType) && (
              <>
                <div className="space-y-2">
                  <Label>Acao</Label>
                  <Select value={formActionType} onValueChange={setFormActionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {budgetActions.includes(formActionType) && (
                  <div className="space-y-2"><Label>Percentual (%)</Label><Input type="number" min="1" max="100" placeholder="20" value={formActionValue} onChange={(e) => setFormActionValue(e.target.value)} /></div>
                )}
                {formActionType === 'webhook' && (
                  <>
                    <div className="space-y-2"><Label>URL do Webhook</Label><Input placeholder="https://..." value={formWebhookUrl} onChange={(e) => setFormWebhookUrl(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Headers (JSON, opcional)</Label><Input placeholder='{"Authorization": "Bearer ..."}' value={formWebhookHeaders} onChange={(e) => setFormWebhookHeaders(e.target.value)} /></div>
                  </>
                )}
              </>
            )}

            {/* ── Apply to ── */}
            {!['dayparting', 'auto_restart'].includes(formRuleType) && (
              <div className="space-y-2">
                <Label>Aplicar em</Label>
                <Select value={formApplyTo} onValueChange={setFormApplyTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    <SelectItem value="active">Campanhas ativas</SelectItem>
                    <SelectItem value="specific">Campanhas especificas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editingRule ? 'Salvar' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ DIALOG: BUDGET CAP ═══════════ */}
      <Dialog open={capDialogOpen} onOpenChange={setCapDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Limite de Orcamento</DialogTitle><DialogDescription>Defina limites de gasto por plataforma</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Plataforma</Label>
              <Select value={capPlatform} onValueChange={setCapPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(platformLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Limite diario (R$)</Label><Input type="number" step="0.01" placeholder="Ex: 500" value={capDaily} onChange={(e) => setCapDaily(e.target.value)} /></div>
            <div className="space-y-2"><Label>Limite semanal (R$)</Label><Input type="number" step="0.01" placeholder="Ex: 3000" value={capWeekly} onChange={(e) => setCapWeekly(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => capMutation.mutate({
              platformType: capPlatform,
              dailyCapAmount: capDaily ? Number(capDaily) : null,
              weeklyCapAmount: capWeekly ? Number(capWeekly) : null,
            })} disabled={capMutation.isPending}>
              {capMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ DIALOG: A/B TEST ═══════════ */}
      <Dialog open={abDialogOpen} onOpenChange={setAbDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Novo Teste A/B</DialogTitle><DialogDescription>Compare campanhas e encontre a vencedora</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome do teste</Label><Input placeholder="Ex: Teste criativos Junho" value={abName} onChange={(e) => setAbName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Metrica de comparacao</Label>
              <Select value={abMetric} onValueChange={setAbMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Dias de avaliacao</Label><Input type="number" value={abDays} onChange={(e) => setAbDays(e.target.value)} /></div>
              <div className="space-y-2"><Label>Budget total diario (R$)</Label><Input type="number" step="0.01" placeholder="Opcional" value={abBudget} onChange={(e) => setAbBudget(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>IDs das campanhas (separados por virgula)</Label>
              <Input placeholder="id1, id2, id3" value={abCampaignIds} onChange={(e) => setAbCampaignIds(e.target.value)} />
              {campaigns && campaigns.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                  {campaigns.filter((c: any) => c.status === 'ACTIVE').slice(0, 20).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                      <input type="checkbox" checked={abCampaignIds.split(',').map(s => s.trim()).includes(c.id)}
                        onChange={(e) => {
                          const ids = abCampaignIds.split(',').map(s => s.trim()).filter(Boolean);
                          if (e.target.checked) ids.push(c.id); else ids.splice(ids.indexOf(c.id), 1);
                          setAbCampaignIds(ids.join(', '));
                        }} />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const ids = abCampaignIds.split(',').map(s => s.trim()).filter(Boolean);
              if (!abName.trim()) { toast.error('Informe o nome'); return; }
              if (ids.length < 2) { toast.error('Selecione pelo menos 2 campanhas'); return; }
              abCreateMutation.mutate({
                name: abName, campaignIds: ids, metric: abMetric,
                evaluationDays: Number(abDays) || 7,
                totalDailyBudget: abBudget ? Number(abBudget) : undefined,
              });
            }} disabled={abCreateMutation.isPending}>
              {abCreateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
