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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Plus, Pencil, Trash2, Zap, Play } from 'lucide-react';

const META_EVENTS = [
  'ViewContent', 'Lead', 'Purchase', 'AddPaymentInfo', 'AddToCart',
  'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct',
  'Donate', 'FindLocation', 'InitiateCheckout', 'Schedule', 'Search',
  'StartTrial', 'SubmitApplication', 'Subscribe',
];

export default function ConversionEvents() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', platform: 'meta' as 'meta' | 'google',
    metaEventName: '' as string | null, journeyStageId: '' as string | null,
    autoSend: false, isActive: true,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['conversion-events'],
    queryFn: async () => { const r = await api.get('/api/conversion-events'); return r.data.data; },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['journey-stages'],
    queryFn: async () => { const r = await api.get('/api/journey/stages'); return r.data.data; },
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/api/conversion-events', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conversion-events'] }); toast.success('Evento criado'); close(); },
    onError: () => toast.error('Erro ao criar evento'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => api.put(`/api/conversion-events/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conversion-events'] }); toast.success('Evento atualizado'); close(); },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/conversion-events/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['conversion-events'] }); toast.success('Evento removido'); },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/conversion-events/${id}/test`),
    onSuccess: (r) => toast.success(r.data.data?.message || 'Teste enviado'),
    onError: () => toast.error('Erro no teste'),
  });

  const close = () => { setDialogOpen(false); setEditing(null); };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', platform: 'meta', metaEventName: null, journeyStageId: null, autoSend: false, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ name: e.name, platform: e.platform, metaEventName: e.metaEventName, journeyStageId: e.journeyStageId, autoSend: e.autoSend, isActive: e.isActive });
    setDialogOpen(true);
  };

  const submit = () => {
    const d = { ...form, metaEventName: form.metaEventName || null, journeyStageId: form.journeyStageId || null };
    editing ? updateMut.mutate({ id: editing.id, d }) : createMut.mutate(d);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Eventos de Conversao</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">Marque eventos importantes e otimize suas campanhas</p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Eventos Configurados</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Novo Evento</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Auto-envio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : events.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum evento configurado</TableCell></TableRow>
              ) : events.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>
                    <Badge variant={e.platform === 'meta' ? 'default' : 'secondary'}>
                      {e.platform === 'meta' ? 'Meta' : 'Google'}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{e.metaEventName || e.googleConversionAction || '-'}</Badge></TableCell>
                  <TableCell className="text-sm">{e.journeyStage?.name || '-'}</TableCell>
                  <TableCell>{e.autoSend ? <Badge className="bg-green-500 text-xs">Sim</Badge> : <span className="text-muted-foreground text-sm">Nao</span>}</TableCell>
                  <TableCell><Badge variant={e.isActive ? 'default' : 'secondary'}>{e.isActive ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => testMut.mutate(e.id)} title="Testar"><Play className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Evento' : 'Novo Evento de Conversao'}</DialogTitle>
            <DialogDescription>Configure o disparo de eventos para plataformas de anuncios</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Compra Confirmada" />
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.platform === 'meta' && (
              <div className="space-y-2">
                <Label>Evento Meta</Label>
                <Select value={form.metaEventName || 'none'} onValueChange={(v) => setForm({ ...form, metaEventName: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {META_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Etapa da Jornada (opcional)</Label>
              <Select value={form.journeyStageId || 'none'} onValueChange={(v) => setForm({ ...form, journeyStageId: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {stages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-envio</Label>
              <Switch checked={form.autoSend} onCheckedChange={(v) => setForm({ ...form, autoSend: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.name}>{editing ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
