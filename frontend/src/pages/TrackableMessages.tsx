import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Plus, Pencil, Trash2, Copy, MessageSquareText } from 'lucide-react';

export default function TrackableMessages() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', messageTemplate: '', gclid: '' });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['trackable-messages'],
    queryFn: async () => { const r = await api.get('/api/trackable-messages'); return r.data.data; },
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/api/trackable-messages', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trackable-messages'] }); toast.success('Mensagem criada'); close(); },
    onError: () => toast.error('Erro ao criar mensagem'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => api.put(`/api/trackable-messages/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trackable-messages'] }); toast.success('Mensagem atualizada'); close(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/trackable-messages/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trackable-messages'] }); toast.success('Mensagem removida'); },
  });

  const close = () => { setDialogOpen(false); setEditing(null); };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', messageTemplate: '', gclid: '' });
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setForm({ name: m.name, messageTemplate: m.messageTemplate, gclid: m.gclid || '' });
    setDialogOpen(true);
  };

  const submit = () => {
    const d = { ...form, gclid: form.gclid || null };
    editing ? updateMut.mutate({ id: editing.id, d }) : createMut.mutate(d);
  };

  const copyMessage = (template: string) => {
    navigator.clipboard.writeText(template);
    toast.success('Mensagem copiada!');
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquareText className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Mensagens Rastreaveis</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Rastreie leads vindos de campanhas Google Ads no WhatsApp
          </p>
          <ul className="mt-3 space-y-1 text-sm opacity-80">
            <li>Crie templates de mensagem com parametros de rastreamento</li>
            <li>Use o GCLID do Google Ads para rastrear conversoes offline</li>
            <li>Copie e compartilhe mensagens pre-configuradas</li>
          </ul>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* GCLID Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">O que e GCLID?</CardTitle>
          <CardDescription>
            O GCLID (Google Click Identifier) e um parametro automatico do Google Ads que identifica
            cada clique em um anuncio. Ao incluir o GCLID na mensagem de WhatsApp, voce consegue
            rastrear qual anuncio gerou aquele lead e reportar conversoes offline para o Google Ads.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Mensagens</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nova Mensagem</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>GCLID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : messages.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma mensagem</TableCell></TableRow>
              ) : messages.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-xs truncate">{m.messageTemplate}</p>
                  </TableCell>
                  <TableCell>
                    {m.gclid ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.gclid}</code> : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? 'default' : 'secondary'}>
                      {m.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyMessage(m.messageTemplate)} title="Copiar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            <DialogTitle>{editing ? 'Editar Mensagem' : 'Nova Mensagem Rastreavel'}</DialogTitle>
            <DialogDescription>Configure o template de mensagem para rastreamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Campanha Verao Google" />
            </div>
            <div className="space-y-2">
              <Label>Template da Mensagem</Label>
              <Textarea
                value={form.messageTemplate}
                onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
                placeholder="Ola! Vi seu anuncio sobre {produto}. Gostaria de saber mais. [GCLID: {gclid}]"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>GCLID (opcional)</Label>
              <Input value={form.gclid} onChange={(e) => setForm({ ...form, gclid: e.target.value })} placeholder="Parametro GCLID do Google Ads" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.name || !form.messageTemplate}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
