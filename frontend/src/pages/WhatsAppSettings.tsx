import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Send,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Check,
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
import { Switch } from '../components/ui/switch';
import { Skeleton } from '../components/ui/skeleton';

interface WhatsAppGroup {
  id: string;
  groupJid: string;
  groupName: string;
  clientName: string;
  isActive: boolean;
  platformIds: string[];
  notifyStatusChange: boolean;
  notifyBudgetChange: boolean;
  notifyPerformance: boolean;
  notifyDailySummary: boolean;
  createdAt: string;
}

interface AvailableGroup {
  id: string;
  subject: string;
  size: number;
  desc?: string;
}

interface Platform {
  id: string;
  name: string;
  type: string;
}

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WhatsAppGroup | null>(null);

  // Form state
  const [selectedGroupJid, setSelectedGroupJid] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [notifyStatusChange, setNotifyStatusChange] = useState(true);
  const [notifyBudgetChange, setNotifyBudgetChange] = useState(true);
  const [notifyPerformance, setNotifyPerformance] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(true);

  // Queries
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp/status');
      return res.data.data;
    },
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['whatsapp-groups'],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp/groups');
      return res.data.data as WhatsAppGroup[];
    },
  });

  const { data: availableGroups, isLoading: availableGroupsLoading } = useQuery({
    queryKey: ['whatsapp-available-groups'],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp/available-groups');
      return res.data.data as AvailableGroup[];
    },
    enabled: statusData?.connected === true,
  });

  const { data: platforms } = useQuery({
    queryKey: ['platforms-list'],
    queryFn: async () => {
      const res = await api.get('/api/platforms');
      // API returns data as direct array: { success, data: [...] }
      const data = res.data.data;
      return (Array.isArray(data) ? data : data?.platforms || []) as Platform[];
    },
  });

  // Mutations
  const createGroup = useMutation({
    mutationFn: (data: any) => api.post('/api/whatsapp/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      toast.success('Grupo cadastrado com sucesso');
      closeDialog();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao cadastrar grupo');
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/whatsapp/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      toast.success('Grupo atualizado');
      closeDialog();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar grupo');
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (id: string) => api.delete(`/api/whatsapp/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      toast.success('Grupo desativado');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao desativar grupo');
    },
  });

  const sendTest = useMutation({
    mutationFn: (id: string) => api.post(`/api/whatsapp/groups/${id}/test`),
    onSuccess: () => {
      toast.success('Mensagem de teste enviada!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao enviar teste');
    },
  });

  function openCreateDialog() {
    setEditingGroup(null);
    setSelectedGroupJid('');
    setSelectedGroupName('');
    setClientName('');
    setSelectedPlatformIds([]);
    setNotifyStatusChange(true);
    setNotifyBudgetChange(true);
    setNotifyPerformance(true);
    setNotifyDailySummary(true);
    setDialogOpen(true);
  }

  function openEditDialog(group: WhatsAppGroup) {
    setEditingGroup(group);
    setSelectedGroupJid(group.groupJid);
    setSelectedGroupName(group.groupName);
    setClientName(group.clientName);
    setSelectedPlatformIds(group.platformIds);
    setNotifyStatusChange(group.notifyStatusChange);
    setNotifyBudgetChange(group.notifyBudgetChange);
    setNotifyPerformance(group.notifyPerformance);
    setNotifyDailySummary(group.notifyDailySummary);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingGroup(null);
  }

  function handleSubmit() {
    if (!selectedGroupJid || !clientName || selectedPlatformIds.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const data = {
      groupJid: selectedGroupJid,
      groupName: selectedGroupName,
      clientName,
      platformIds: selectedPlatformIds,
      notifyStatusChange,
      notifyBudgetChange,
      notifyPerformance,
      notifyDailySummary,
    };

    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, data });
    } else {
      createGroup.mutate(data);
    }
  }

  function togglePlatform(platformId: string) {
    setSelectedPlatformIds((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  }

  const isConnected = statusData?.connected === true;
  const activeGroups = groups?.filter((g) => g.isActive) || [];

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp - Evolution API
              </CardTitle>
              <CardDescription>
                Notificações automáticas para grupos de clientes via WhatsApp
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
              Testar Conexão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">Conectado</span>
                  <Badge variant="outline">{statusData?.instance}</Badge>
                </>
              ) : statusData?.configured ? (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-red-600 font-medium">Desconectado</span>
                  <span className="text-sm text-muted-foreground">
                    Verifique a instância do Evolution API
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Não configurado</span>
                  <span className="text-sm text-muted-foreground">
                    Configure EVOLUTION_API_URL, API_KEY e INSTANCE no .env
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grupos Cadastrados</CardTitle>
              <CardDescription>
                {activeGroups.length} grupo{activeGroups.length !== 1 ? 's' : ''} ativo{activeGroups.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={!isConnected}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : activeGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum grupo cadastrado</p>
              <p className="text-sm mt-1">Cadastre um grupo de WhatsApp para receber notificações</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{group.groupName}</h3>
                      <Badge variant="outline" className="text-xs">{group.clientName}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {group.notifyStatusChange && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Status
                        </Badge>
                      )}
                      {group.notifyBudgetChange && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Orçamento
                        </Badge>
                      )}
                      {group.notifyPerformance && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Performance
                        </Badge>
                      )}
                      {group.notifyDailySummary && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Resumo Diário
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {group.platformIds.length} conta{group.platformIds.length !== 1 ? 's' : ''} vinculada{group.platformIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendTest.mutate(group.id)}
                      disabled={sendTest.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(group)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Deseja desativar este grupo?')) {
                          deleteGroup.mutate(group.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Editar Grupo' : 'Cadastrar Novo Grupo'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Atualize as configurações do grupo'
                : 'Selecione um grupo do WhatsApp e configure as notificações'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group Selection */}
            {!editingGroup && (
              <div className="space-y-2">
                <Label>Grupo do WhatsApp</Label>
                {availableGroupsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedGroupJid}
                    onValueChange={(value) => {
                      setSelectedGroupJid(value);
                      const group = availableGroups?.find((g) => g.id === value);
                      if (group) setSelectedGroupName(group.subject);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableGroups || []).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.subject} ({g.size} membros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Client Name */}
            <div className="space-y-2">
              <Label>Nome do Cliente</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Empresa XYZ"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Contas de Anúncio</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {(platforms || []).map((platform) => (
                  <label
                    key={platform.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatformIds.includes(platform.id)}
                      onChange={() => togglePlatform(platform.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{platform.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{platform.type}</Badge>
                  </label>
                ))}
                {(!platforms || platforms.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhuma plataforma conectada</p>
                )}
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3">
              <Label>Tipos de Notificação</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Mudança de Status</Label>
                  <Switch checked={notifyStatusChange} onCheckedChange={setNotifyStatusChange} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Alteração de Orçamento</Label>
                  <Switch checked={notifyBudgetChange} onCheckedChange={setNotifyBudgetChange} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Alertas de Performance</Label>
                  <Switch checked={notifyPerformance} onCheckedChange={setNotifyPerformance} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Resumo Diário (20h)</Label>
                  <Switch checked={notifyDailySummary} onCheckedChange={setNotifyDailySummary} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {(createGroup.isPending || updateGroup.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingGroup ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
