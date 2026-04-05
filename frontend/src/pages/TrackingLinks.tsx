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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Copy, Link2, ExternalLink } from 'lucide-react';

const APP_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function TrackingLinks() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    destinationUrl: '',
    whatsappMessage: '',
    whatsappRedirect: 'app' as 'app' | 'web',
    whatsappNumber: '',
    isMetaAds: false,
    redirectPageTitle: 'Redirecionando...',
    redirectPageMessage: 'Voce sera redirecionado para o WhatsApp em instantes.',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['tracking-links'],
    queryFn: async () => {
      const res = await api.get('/api/tracking/links');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/tracking/links', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-links'] });
      toast.success('Link criado com sucesso');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao criar link'),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...form,
      destinationUrl: form.destinationUrl || `https://api.whatsapp.com/send?phone=${form.whatsappNumber}&text=${encodeURIComponent(form.whatsappMessage)}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Links Rastreaveis</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Rastreie cada clique e saiba o que traz resultado
          </p>
          <ul className="mt-3 space-y-1 text-sm opacity-80">
            <li>Crie links com rastreamento UTM completo</li>
            <li>Links especiais para Meta Ads com redirect de 5 segundos</li>
            <li>Configure mensagem inicial do WhatsApp</li>
          </ul>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Links Criados</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Link
        </Button>
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL Curta</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Meta Ads</TableHead>
                <TableHead>Cliques</TableHead>
                <TableHead>Unicos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum link criado</TableCell>
                </TableRow>
              ) : (
                links.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {link.isMetaAds ? `/wa/${link.shortCode}` : `/t/${link.shortCode}`}
                        </code>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => copyToClipboard(`${APP_URL}${link.isMetaAds ? '/wa' : '/t'}/${link.shortCode}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {link.whatsappNumber ? (
                        <Badge variant="outline" className="text-xs">{link.whatsappNumber}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {link.isMetaAds ? (
                        <Badge className="bg-blue-500 text-xs">Meta Ads</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{link.totalClicks}</TableCell>
                    <TableCell>{link.uniqueClicks}</TableCell>
                    <TableCell>
                      <Badge variant={link.isActive ? 'default' : 'secondary'}>
                        {link.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => window.open(link.destinationUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Link Rastreavel</DialogTitle>
            <DialogDescription>Configure seu link de rastreamento com WhatsApp</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basico</TabsTrigger>
              <TabsTrigger value="meta">Meta Ads</TabsTrigger>
              <TabsTrigger value="utm">UTM Params</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome do Link</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Campanha Black Friday" />
              </div>
              <div className="space-y-2">
                <Label>Numero WhatsApp (com DDI)</Label>
                <Input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="5511999999999" />
              </div>
              <div className="space-y-2">
                <Label>Mensagem inicial do WhatsApp</Label>
                <Input value={form.whatsappMessage} onChange={(e) => setForm({ ...form, whatsappMessage: e.target.value })} placeholder="Ola! Vi seu anuncio e gostaria de saber mais." />
              </div>
              <div className="space-y-2">
                <Label>URL de Destino (opcional se usar WhatsApp)</Label>
                <Input value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Redirect</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.whatsappRedirect === 'app'} onChange={() => setForm({ ...form, whatsappRedirect: 'app' })} />
                    <span className="text-sm">Aplicativo WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.whatsappRedirect === 'web'} onChange={() => setForm({ ...form, whatsappRedirect: 'web' })} />
                    <span className="text-sm">WhatsApp Web (Desktop)</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="meta" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Link para Meta Ads</Label>
                  <p className="text-xs text-muted-foreground">Redirect com espera de 5 segundos para capturar dados do pixel</p>
                </div>
                <Switch checked={form.isMetaAds} onCheckedChange={(v) => setForm({ ...form, isMetaAds: v })} />
              </div>
              {form.isMetaAds && (
                <>
                  <div className="space-y-2">
                    <Label>Titulo da pagina de redirecionamento</Label>
                    <Input value={form.redirectPageTitle} onChange={(e) => setForm({ ...form, redirectPageTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem da pagina de redirecionamento</Label>
                    <Input value={form.redirectPageMessage} onChange={(e) => setForm({ ...form, redirectPageMessage: e.target.value })} />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="utm" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>utm_source</Label>
                  <Input value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} placeholder="facebook" />
                </div>
                <div className="space-y-2">
                  <Label>utm_medium</Label>
                  <Input value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} placeholder="cpc" />
                </div>
                <div className="space-y-2">
                  <Label>utm_campaign</Label>
                  <Input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} placeholder="black_friday" />
                </div>
                <div className="space-y-2">
                  <Label>utm_content</Label>
                  <Input value={form.utmContent} onChange={(e) => setForm({ ...form, utmContent: e.target.value })} placeholder="video_ad" />
                </div>
                <div className="space-y-2">
                  <Label>utm_term</Label>
                  <Input value={form.utmTerm} onChange={(e) => setForm({ ...form, utmTerm: e.target.value })} placeholder="marketing digital" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending}>
              Criar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
