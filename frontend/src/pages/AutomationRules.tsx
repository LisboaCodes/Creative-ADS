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

// --- Type definitions ---

interface AutomationRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  value: number;
  periodDays: number;
  actionType: string;
  actionValue?: string;
  applyTo: string;
  campaignIds?: string[];
  platformTypes?: string[];
  status: string;
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
}

interface RuleFormData {
  name: string;
  metric: string;
  operator: string;
  value: string;
  periodDays: string;
  actionType: string;
  actionValue: string;
  applyTo: string;
}

// --- Label maps ---

const metricLabels: Record<string, string> = {
  CTR: 'CTR',
  CPC: 'CPC',
  CPM: 'CPM',
  ROAS: 'ROAS',
  SPEND: 'Gasto',
  CONVERSIONS: 'Conversoes',
};

const operatorSymbols: Record<string, string> = {
  LESS_THAN: '<',
  GREATER_THAN: '>',
  EQUALS: '=',
};

const actionLabels: Record<string, string> = {
  PAUSE_CAMPAIGN: 'Pausar campanha',
  ACTIVATE_CAMPAIGN: 'Ativar campanha',
  INCREASE_BUDGET: 'Aumentar orcamento',
  DECREASE_BUDGET: 'Diminuir orcamento',
  NOTIFY: 'Notificar',
};

const applyToLabels: Record<string, string> = {
  ALL: 'Todas as campanhas',
  SPECIFIC: 'Campanhas especificas',
  PLATFORM: 'Por plataforma',
};

const periodOptions = [
  { value: '3', label: '3 dias' },
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
];

const budgetActions = ['INCREASE_BUDGET', 'DECREASE_BUDGET'];

// --- Helper functions ---

function buildConditionText(rule: AutomationRule): string {
  const metric = metricLabels[rule.metric] || rule.metric;
  const op = operatorSymbols[rule.operator] || rule.operator;
  const suffix = rule.metric === 'CTR' || rule.metric === 'ROAS' ? '%' : '';
  return `Se ${metric} ${op} ${rule.value}${suffix} nos ultimos ${rule.periodDays} dias`;
}

function buildActionText(rule: AutomationRule): string {
  const action = actionLabels[rule.actionType] || rule.actionType;
  if (budgetActions.includes(rule.actionType) && rule.actionValue) {
    return `${action} em ${rule.actionValue}%`;
  }
  return action;
}

const emptyFormData: RuleFormData = {
  name: '',
  metric: 'CTR',
  operator: 'LESS_THAN',
  value: '',
  periodDays: '7',
  actionType: 'PAUSE_CAMPAIGN',
  actionValue: '',
  applyTo: 'ALL',
};

// --- Component ---

export default function AutomationRules() {
  const queryClient = useQueryClient();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData);

  // Fetch rules
  const { data: rules, isLoading } = useQuery<AutomationRule[]>({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const res = await api.get('/api/automation');
      return res.data.data;
    },
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const payload = {
        name: data.name,
        metric: data.metric,
        operator: data.operator,
        value: Number(data.value),
        periodDays: Number(data.periodDays),
        actionType: data.actionType,
        actionValue: budgetActions.includes(data.actionType) ? data.actionValue : undefined,
        applyTo: data.applyTo,
      };
      const res = await api.post('/api/automation', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Regra criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao criar regra');
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RuleFormData> & { status?: string } }) => {
      const payload: Record<string, any> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.metric !== undefined) payload.metric = data.metric;
      if (data.operator !== undefined) payload.operator = data.operator;
      if (data.value !== undefined) payload.value = Number(data.value);
      if (data.periodDays !== undefined) payload.periodDays = Number(data.periodDays);
      if (data.actionType !== undefined) {
        payload.actionType = data.actionType;
        payload.actionValue = budgetActions.includes(data.actionType) ? data.actionValue : undefined;
      }
      if (data.applyTo !== undefined) payload.applyTo = data.applyTo;
      if (data.status !== undefined) payload.status = data.status;

      const res = await api.patch(`/api/automation/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Regra atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao atualizar regra');
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/automation/${id}`);
    },
    onSuccess: () => {
      toast.success('Regra excluida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao excluir regra');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const res = await api.patch(`/api/automation/${id}`, { status: newStatus });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      const newStatus = variables.currentStatus === 'ACTIVE' ? 'pausada' : 'ativada';
      toast.success(`Regra ${newStatus} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao alterar status');
    },
  });

  // --- Handlers ---

  function handleOpenCreate() {
    setEditingRule(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  }

  function handleOpenEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      metric: rule.metric,
      operator: rule.operator,
      value: String(rule.value),
      periodDays: String(rule.periodDays),
      actionType: rule.actionType,
      actionValue: rule.actionValue || '',
      applyTo: rule.applyTo,
    });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingRule(null);
    setFormData(emptyFormData);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error('Informe o nome da regra');
      return;
    }
    if (!formData.value || isNaN(Number(formData.value))) {
      toast.error('Informe um valor numerico valido');
      return;
    }
    if (budgetActions.includes(formData.actionType) && (!formData.actionValue || isNaN(Number(formData.actionValue)))) {
      toast.error('Informe o percentual para a acao de orcamento');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function handleDelete(rule: AutomationRule) {
    if (window.confirm(`Tem certeza que deseja excluir a regra "${rule.name}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  }

  function handleToggleStatus(rule: AutomationRule) {
    toggleStatusMutation.mutate({ id: rule.id, currentStatus: rule.status });
  }

  function updateField<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // --- Loading skeleton ---

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7" />
            Regras de Automacao
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure regras automaticas para gerenciar suas campanhas
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Summary stats */}
      {rules && rules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {rules.filter((r) => r.status === 'ACTIVE').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Regras ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Settings2 className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {rules.filter((r) => r.status === 'PAUSED').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Regras pausadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {rules.reduce((sum, r) => sum + r.executionCount, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de execucoes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rules list */}
      {rules && rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={`transition-opacity ${rule.status === 'PAUSED' ? 'opacity-70' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{rule.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {buildConditionText(rule)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={rule.status === 'ACTIVE'}
                    onCheckedChange={() => handleToggleStatus(rule)}
                    disabled={toggleStatusMutation.isPending}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action */}
                <div className="flex items-center gap-2">
                  <Badge variant={rule.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {rule.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                  </Badge>
                  <Badge variant="outline">
                    {buildActionText(rule)}
                  </Badge>
                </div>

                {/* Apply scope */}
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Escopo:</span>{' '}
                  {applyToLabels[rule.applyTo] || rule.applyTo}
                </div>

                {/* Execution info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {rule.lastExecutedAt
                      ? `Ultima execucao: ${formatDate(rule.lastExecutedAt)}`
                      : 'Nunca executada'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {rule.executionCount} {rule.executionCount === 1 ? 'execucao' : 'execucoes'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(rule)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rule)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma regra de automacao</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira regra para automatizar o gerenciamento das suas campanhas
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Regra
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra de Automacao'}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? 'Altere as configuracoes da regra de automacao'
                : 'Configure uma nova regra para automacao de campanhas'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="rule-name">Nome da regra</Label>
              <Input
                id="rule-name"
                placeholder="Ex: Pausar campanhas com CTR baixo"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            {/* Condition row: Metric + Operator + Value */}
            <div className="space-y-2">
              <Label>Condicao</Label>
              <div className="grid grid-cols-3 gap-3">
                <Select value={formData.metric} onValueChange={(v) => updateField('metric', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Metrica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CTR">CTR</SelectItem>
                    <SelectItem value="CPC">CPC</SelectItem>
                    <SelectItem value="CPM">CPM</SelectItem>
                    <SelectItem value="ROAS">ROAS</SelectItem>
                    <SelectItem value="SPEND">Gasto</SelectItem>
                    <SelectItem value="CONVERSIONS">Conversoes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={formData.operator} onValueChange={(v) => updateField('operator', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Operador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LESS_THAN">Menor que</SelectItem>
                    <SelectItem value="GREATER_THAN">Maior que</SelectItem>
                    <SelectItem value="EQUALS">Igual a</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Valor"
                  value={formData.value}
                  onChange={(e) => updateField('value', e.target.value)}
                />
              </div>
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label>Periodo de avaliacao</Label>
              <Select value={formData.periodDays} onValueChange={(v) => updateField('periodDays', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label>Acao</Label>
              <Select value={formData.actionType} onValueChange={(v) => updateField('actionType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Acao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAUSE_CAMPAIGN">Pausar campanha</SelectItem>
                  <SelectItem value="ACTIVATE_CAMPAIGN">Ativar campanha</SelectItem>
                  <SelectItem value="INCREASE_BUDGET">Aumentar orcamento</SelectItem>
                  <SelectItem value="DECREASE_BUDGET">Diminuir orcamento</SelectItem>
                  <SelectItem value="NOTIFY">Notificar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Value (only for budget actions) */}
            {budgetActions.includes(formData.actionType) && (
              <div className="space-y-2">
                <Label htmlFor="action-value">Percentual (%)</Label>
                <Input
                  id="action-value"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  placeholder="Ex: 20"
                  value={formData.actionValue}
                  onChange={(e) => updateField('actionValue', e.target.value)}
                />
              </div>
            )}

            {/* Apply to */}
            <div className="space-y-2">
              <Label>Aplicar em</Label>
              <Select value={formData.applyTo} onValueChange={(v) => updateField('applyTo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as campanhas</SelectItem>
                  <SelectItem value="SPECIFIC">Campanhas especificas</SelectItem>
                  <SelectItem value="PLATFORM">Por plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingRule ? (
                'Salvar Alteracoes'
              ) : (
                'Criar Regra'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
