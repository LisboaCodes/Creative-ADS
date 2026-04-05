import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '../components/ui/collapsible';
import { Plus, Pencil, Trash2, Play, Webhook, ChevronDown } from 'lucide-react';

const EVENT_OPTIONS = [
  { value: 'NEW_LEAD', label: 'Novo Lead' },
  { value: 'LEAD_STAGE_CHANGE', label: 'Mudanca de Etapa' },
  { value: 'SALE_COMPLETED', label: 'Venda Concluida' },
  { value: 'LEAD_UPDATED', label: 'Lead Atualizado' },
];

export default function Webhooks() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', url: '', secret: '', events: [] as string[], isActive: true,
  });

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => { const r = await api.get('/api/webhooks'); return r.data.data; },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['webhook-deliveries', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const r = await api.get(`/api/webhooks/${expandedId}/deliveries`);
      return r.data.data;
    },
    enabled: !!expandedId,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/api/webhooks', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook criado'); close(); },
    onError: () => toast.error('Erro ao criar webhook'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => api.put(`/api/webhooks/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook atualizado'); close(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/webhooks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook removido'); },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/webhooks/${id}/test`),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
      toast.success(r.data.data?.success ? 'Teste enviado com sucesso' : 'Teste falhou');
    },
    onError: () => toast.error('Erro no teste'),
  });

  const close = () => { setDialogOpen(false); setEditing(null); };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', secret: '', events: [], isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ name: e.name, url: e.url, secret: e.secret || '', events: e.events || [], isActive: e.isActive });
    setDialogOpen(true);
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  const submit = () => {
    const d = { ...form, secret: form.secret || undefined };
    editing ? updateMut.mutate({ id: editing.id, d }) : createMut.mutate(d);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Webhook className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Webhooks</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Automatize integracoes e leve dados para outros sistemas
          </p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Novo Webhook</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : endpoints.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum webhook</TableCell></TableRow>
              ) : endpoints.map((ep: any) => (
                <Collapsible key={ep.id} open={expandedId === ep.id} onOpenChange={(o) => setExpandedId(o ? ep.id : null)} asChild>
                  <>
                    <TableRow>
                      <TableCell className="font-medium">{ep.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px] block">{ep.url}</code></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ep.events?.map((e: string) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={ep.isActive ? 'default' : 'secondary'}>{ep.isActive ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell>{ep._count?.deliveries || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon"><ChevronDown className="h-4 w-4" /></Button>
                          </CollapsibleTrigger>
                          <Button variant="ghost" size="icon" onClick={() => testMut.mutate(ep.id)}><Play className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ep)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(ep.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <h4 className="font-semibold text-sm mb-2">Historico de Entregas</h4>
                          {deliveries.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma entrega registrada</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {deliveries.map((d: any) => (
                                <div key={d.id} className="flex items-center gap-3 text-sm border rounded p-2 bg-background">
                                  <Badge variant={d.success ? 'default' : 'destructive'} className="text-xs">
                                    {d.success ? 'OK' : 'FALHA'}
                                  </Badge>
                                  <span className="text-muted-foreground">{d.eventType}</span>
                                  <span className="font-mono text-xs">{d.responseStatus || '-'}</span>
                                  <span className="text-xs text-muted-foreground">{d.duration}ms</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(d.createdAt).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
            <DialogDescription>Configure o endpoint e os eventos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: CRM Integration" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Secret (opcional)</Label>
              <Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="Auto-gerado se vazio" />
            </div>
            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-2 rounded border hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={form.events.includes(opt.value)}
                      onChange={() => toggleEvent(opt.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.name || !form.url || form.events.length === 0}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
