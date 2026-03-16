import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Pencil,
  Upload,
  Users,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PROCESSING: { label: 'Processando', variant: 'secondary' },
  READY: { label: 'Pronto', variant: 'default' },
  ERROR: { label: 'Erro', variant: 'destructive' },
};

export default function Audiences() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAudience, setEditingAudience] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Create form state
  const [createForm, setCreateForm] = useState({
    platformId: '',
    name: '',
    description: '',
    inputMode: 'paste' as 'paste' | 'csv',
    emailText: '',
    emails: [] as string[],
  });

  // Fetch audiences
  const { data: audiences, isLoading } = useQuery({
    queryKey: ['audiences'],
    queryFn: async () => {
      const res = await api.get('/api/audiences');
      return res.data.data;
    },
  });

  // Fetch connected Facebook platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await api.get('/api/platforms');
      return res.data.data;
    },
  });

  const facebookPlatforms = platforms?.filter((p: any) => p.isConnected && p.type === 'FACEBOOK') || [];

  // Parse emails from text
  const parseEmails = useCallback((text: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches)]; // deduplicate
  }, []);

  const handleTextChange = (text: string) => {
    setCreateForm((prev) => ({
      ...prev,
      emailText: text,
      emails: parseEmails(text),
    }));
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails = parseEmails(text);
      setCreateForm((prev) => ({
        ...prev,
        emailText: `${emails.length} emails carregados do arquivo ${file.name}`,
        emails,
      }));
    };
    reader.readAsText(file);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/audiences', {
        name: createForm.name,
        description: createForm.description || undefined,
        platformId: createForm.platformId,
        emails: createForm.emails,
        source: createForm.inputMode === 'csv' ? 'csv_upload' : 'manual_paste',
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Público criado! Os emails estão sendo processados.');
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      setShowCreate(false);
      setCreateForm({ platformId: '', name: '', description: '', inputMode: 'paste', emailText: '', emails: [] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao criar público');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/audiences/${id}`),
    onSuccess: () => {
      toast.success('Público removido');
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao remover público');
    },
  });

  // Refresh size mutation
  const refreshMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/audiences/${id}/refresh`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Tamanho atualizado');
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao atualizar tamanho');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/api/audiences/${editingAudience.id}`, {
        name: editName,
        description: editDescription || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Público atualizado');
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      setEditingAudience(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao atualizar');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Públicos Personalizados</h1>
          <p className="text-sm text-muted-foreground">
            Crie públicos a partir de listas de emails para segmentar campanhas
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Público
        </Button>
      </div>

      {/* Audiences List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !audiences || audiences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum público criado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro público personalizado com uma lista de emails
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Público
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map((audience: any) => {
            const statusInfo = STATUS_BADGE[audience.status] || STATUS_BADGE.PROCESSING;
            return (
              <Card key={audience.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{audience.name}</h3>
                      {audience.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {audience.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant} className="ml-2 flex-shrink-0">
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plataforma</span>
                      <span>{audience.platform?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emails enviados</span>
                      <span>{audience.emailCount?.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamanho aprox.</span>
                      <span>
                        {audience.approximateSize != null
                          ? audience.approximateSize.toLocaleString('pt-BR')
                          : audience.status === 'PROCESSING'
                          ? 'Processando...'
                          : '-'}
                      </span>
                    </div>
                    {audience.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{audience.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex gap-1.5 mt-4 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshMutation.mutate(audience.id)}
                      disabled={refreshMutation.isPending}
                      title="Atualizar tamanho"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAudience(audience);
                        setEditName(audience.name);
                        setEditDescription(audience.description || '');
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Remover este público? Ele será deletado também no Facebook.')) {
                          deleteMutation.mutate(audience.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Público Personalizado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Conta de Anúncios (Facebook)</Label>
              <Select value={createForm.platformId} onValueChange={(v) => setCreateForm((p) => ({ ...p, platformId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {facebookPlatforms.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {facebookPlatforms.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhuma conta Facebook conectada. Conecte primeiro em Plataformas.
                </p>
              )}
            </div>

            <div>
              <Label>Nome do Público</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Clientes VIP 2026"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Lista de emails de clientes VIP"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Emails</Label>
              <div className="flex gap-2 mt-1 mb-2">
                <Button
                  variant={createForm.inputMode === 'paste' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateForm((p) => ({ ...p, inputMode: 'paste' }))}
                >
                  Colar emails
                </Button>
                <Button
                  variant={createForm.inputMode === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateForm((p) => ({ ...p, inputMode: 'csv' }))}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload CSV
                </Button>
              </div>

              {createForm.inputMode === 'paste' ? (
                <Textarea
                  value={createForm.emailText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Cole os emails aqui (um por linha, separados por vírgula ou ponto-e-vírgula)"
                  rows={6}
                  className="font-mono text-sm"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {createForm.emails.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {createForm.emailText}
                    </p>
                  )}
                </div>
              )}

              {createForm.emails.length > 0 && (
                <p className="text-sm mt-2 font-medium text-primary">
                  {createForm.emails.length.toLocaleString('pt-BR')} emails válidos encontrados
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !createForm.platformId ||
                !createForm.name ||
                createForm.emails.length === 0
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Público ({createForm.emails.length.toLocaleString('pt-BR')} emails)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAudience} onOpenChange={(open) => !open && setEditingAudience(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Público</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAudience(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editName}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
