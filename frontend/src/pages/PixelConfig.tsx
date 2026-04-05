import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Plus, Trash2, Play, QrCode, Eye, EyeOff } from 'lucide-react';

export default function PixelConfig() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    platform: 'meta' as 'meta' | 'google',
    pixelId: '',
    accessToken: '',
    testEventCode: '',
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['pixel-configs'],
    queryFn: async () => { const r = await api.get('/api/pixel'); return r.data.data; },
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/api/pixel', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pixel-configs'] }); toast.success('Pixel configurado'); setDialogOpen(false); },
    onError: () => toast.error('Erro ao configurar pixel'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/pixel/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pixel-configs'] }); toast.success('Pixel removido'); },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/pixel/${id}/test`),
    onSuccess: (r) => toast.success(r.data.data?.message || 'Teste enviado'),
    onError: () => toast.error('Erro no teste'),
  });

  const toggleToken = (id: string) => setShowTokens((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <QrCode className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Pixel</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Envie conversoes reais para o Pixel do Meta Ads e otimize seus anuncios
          </p>
          <ul className="mt-3 space-y-1 text-sm opacity-80">
            <li>Configure Pixel ID e Access Token</li>
            <li>Envie disparos de teste para validar a integracao</li>
            <li>Suporte para Meta e Google</li>
          </ul>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pixels Configurados</h2>
        <Button onClick={() => { setForm({ platform: 'meta', pixelId: '', accessToken: '', testEventCode: '' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Pixel
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : configs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum pixel configurado</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={c.platform === 'meta' ? 'default' : 'secondary'}>
                    {c.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                  </Badge>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">Pixel: {c.pixelId}</CardTitle>
                <CardDescription>
                  Criado em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Token:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 truncate">
                      {showTokens[c.id] ? c.accessToken : '••••••••••••'}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleToken(c.id)}>
                      {showTokens[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  {c.testEventCode && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Test Event Code:</span>{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{c.testEventCode}</code>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => testMut.mutate(c.id)}>
                    <Play className="h-3 w-3 mr-1" /> Testar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteMut.mutate(c.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pixel</DialogTitle>
            <DialogDescription>Configure o Pixel ID e Access Token</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label>Pixel ID</Label>
              <Input value={form.pixelId} onChange={(e) => setForm({ ...form, pixelId: e.target.value })} placeholder="Ex: 1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder="Token de acesso" />
            </div>
            <div className="space-y-2">
              <Label>Test Event Code (opcional)</Label>
              <Input value={form.testEventCode} onChange={(e) => setForm({ ...form, testEventCode: e.target.value })} placeholder="TEST12345" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.pixelId || !form.accessToken}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
