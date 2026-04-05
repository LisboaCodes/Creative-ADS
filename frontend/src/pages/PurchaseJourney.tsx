import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Plus, Pencil, Trash2, GripVertical, Workflow } from 'lucide-react';

const META_EVENTS = [
  'ViewContent', 'Lead', 'Purchase', 'AddPaymentInfo', 'AddToCart',
  'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct',
  'Donate', 'FindLocation', 'InitiateCheckout', 'Schedule', 'Search',
  'StartTrial', 'SubmitApplication', 'Subscribe',
];

export default function PurchaseJourney() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    conversionEvent: '' as string | null,
    isSaleStage: false,
    isFirstContact: false,
    triggerKeyword: '',
  });

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['journey-stages'],
    queryFn: async () => {
      const res = await api.get('/api/journey/stages');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/journey/stages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-stages'] });
      toast.success('Etapa criada com sucesso');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar etapa'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/journey/stages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-stages'] });
      toast.success('Etapa atualizada');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar etapa'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/journey/stages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-stages'] });
      toast.success('Etapa removida');
    },
    onError: () => toast.error('Erro ao remover etapa'),
  });

  const openCreate = () => {
    setEditingStage(null);
    setForm({ name: '', conversionEvent: null, isSaleStage: false, isFirstContact: false, triggerKeyword: '' });
    setDialogOpen(true);
  };

  const openEdit = (stage: any) => {
    setEditingStage(stage);
    setForm({
      name: stage.name,
      conversionEvent: stage.conversionEvent || null,
      isSaleStage: stage.isSaleStage,
      isFirstContact: stage.isFirstContact,
      triggerKeyword: stage.triggerKeyword || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingStage(null);
  };

  const handleSubmit = () => {
    const data = {
      ...form,
      conversionEvent: form.conversionEvent || null,
      triggerKeyword: form.triggerKeyword || null,
    };
    if (editingStage) {
      updateMutation.mutate({ id: editingStage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Workflow className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Jornada de Compra</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Acompanhe cada etapa do funil de vendas de forma personalizada
          </p>
          <ul className="mt-3 space-y-1 text-sm opacity-80">
            <li>Crie etapas personalizadas para o seu funil</li>
            <li>Associe eventos de conversao Meta Ads a cada etapa</li>
            <li>Mova leads entre etapas e acompanhe o historico</li>
          </ul>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Etapas do Funil</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Etapa
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Evento de Conversao</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : stages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma etapa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                stages.map((stage: any) => (
                  <TableRow key={stage.id}>
                    <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="font-mono">{stage.funnelOrder}</TableCell>
                    <TableCell className="font-medium">{stage.name}</TableCell>
                    <TableCell>
                      {stage.conversionEvent ? (
                        <Badge variant="secondary">{stage.conversionEvent}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {stage.isFirstContact && <Badge variant="outline" className="text-xs">1o Contato</Badge>}
                        {stage.isSaleStage && <Badge className="text-xs bg-green-500">Venda</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{stage._count?.leads || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(stage.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(stage)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(stage.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tutorial Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tutorial: Frases Gatilho</CardTitle>
          <CardDescription>
            Configure frases-chave para mover leads automaticamente entre etapas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border">
            <img
              src="https://tintim-static.s3.amazonaws.com/public/media/tintim-gif.gif"
              alt="Tutorial Frases Gatilho"
              className="w-full max-w-lg mx-auto"
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Boas praticas:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Nao use apenas 1 palavra como termo-chave</li>
              <li>Nao use caracteres especiais como !, ? ou emojis</li>
              <li>Nao pule linha no meio da frase gatilho</li>
              <li>Use frases curtas e especificas do seu negocio</li>
              <li>Exemplo: "quero comprar", "fechou negocio", "pagamento confirmado"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>
              {editingStage ? 'Atualize os dados da etapa' : 'Adicione uma nova etapa ao funil'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Proposta Enviada"
              />
            </div>
            <div className="space-y-2">
              <Label>Evento de Conversao (Meta Ads)</Label>
              <Select
                value={form.conversionEvent || 'none'}
                onValueChange={(v) => setForm({ ...form, conversionEvent: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {META_EVENTS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Etapa de venda?</Label>
              <Switch checked={form.isSaleStage} onCheckedChange={(v) => setForm({ ...form, isSaleStage: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Etapa de primeiro contato?</Label>
              <Switch checked={form.isFirstContact} onCheckedChange={(v) => setForm({ ...form, isFirstContact: v })} />
            </div>
            <div className="space-y-2">
              <Label>Termo-chave / Frase gatilho</Label>
              <Input
                value={form.triggerKeyword}
                onChange={(e) => setForm({ ...form, triggerKeyword: e.target.value })}
                placeholder="Ex: pagamento confirmado"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {editingStage ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
