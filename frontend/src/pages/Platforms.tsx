import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  Facebook,
  Instagram,
  Chrome,
  Linkedin,
  Twitter,
  RefreshCw,
  Unplug,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useState } from 'react';

const platformIcons: Record<string, any> = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  GOOGLE_ADS: Chrome,
  TIKTOK: Sparkles,
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
};

const platformColors: Record<string, { bg: string; text: string; icon: string }> = {
  FACEBOOK: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
  INSTAGRAM: { bg: 'bg-pink-100', text: 'text-pink-600', icon: 'text-pink-600' },
  GOOGLE_ADS: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' },
  TIKTOK: { bg: 'bg-slate-100', text: 'text-slate-900', icon: 'text-slate-900' },
  LINKEDIN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-700' },
  TWITTER: { bg: 'bg-sky-100', text: 'text-sky-600', icon: 'text-sky-600' },
};

export default function Platforms() {
  const [disconnectDialog, setDisconnectDialog] = useState<string | null>(null);

  const { data: platforms, isLoading, refetch } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  const handleConnect = async (platformType: string) => {
    try {
      const response = await api.get(`/api/platforms/${platformType.toLowerCase()}/connect`);
      const { authUrl } = response.data.data;
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao iniciar autenticação');
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      await api.delete(`/api/platforms/${platformId}`);
      toast.success('Plataforma desconectada com sucesso');
      refetch();
      setDisconnectDialog(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao desconectar plataforma');
    }
  };

  const handleSync = async (platformId: string) => {
    try {
      await api.post(`/api/platforms/${platformId}/sync`);
      toast.success('Sincronização iniciada com sucesso');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao sincronizar plataforma');
    }
  };

  const availablePlatforms = [
    { type: 'FACEBOOK', name: 'Facebook Ads', description: 'Conecte o Facebook Ads Manager para sincronizar campanhas' },
    { type: 'INSTAGRAM', name: 'Instagram Ads', description: 'Gerencie campanhas de publicidade no Instagram' },
    { type: 'GOOGLE_ADS', name: 'Google Ads', description: 'Campanhas de Search, Display e Vídeo' },
    { type: 'TIKTOK', name: 'TikTok Ads', description: 'Conecte o TikTok Ads Manager' },
    { type: 'LINKEDIN', name: 'LinkedIn Ads', description: 'Plataforma de publicidade B2B' },
    { type: 'TWITTER', name: 'Twitter/X Ads', description: 'Tweets promovidos e campanhas' },
  ];

  const platformNames: Record<string, string> = {
    FACEBOOK: 'Facebook Ads',
    INSTAGRAM: 'Instagram Ads',
    GOOGLE_ADS: 'Google Ads',
    TIKTOK: 'TikTok Ads',
    LINKEDIN: 'LinkedIn Ads',
    TWITTER: 'Twitter/X Ads',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-lg mb-2" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plataformas</h1>
        <p className="text-muted-foreground">
          Conecte e gerencie suas plataformas de publicidade
        </p>
      </div>

      {/* Connected Platforms */}
      {platforms && platforms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Plataformas Conectadas</h2>
            <Badge variant="outline">{platforms.length} conectada(s)</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform: any) => {
              const Icon = platformIcons[platform.type] || Facebook;
              const colors = platformColors[platform.type] || platformColors.FACEBOOK;

              return (
                <Card key={platform.id} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${colors.bg} rounded-lg p-3`}>
                          <Icon className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platformNames[platform.type] || platform.type}</CardTitle>
                          <CardDescription className="text-xs">
                            {platform.name}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={platform.isConnected ? 'success' : 'secondary'}>
                        {platform.isConnected ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {platform.isConnected ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Última sinc:{' '}
                        {platform.lastSyncAt
                          ? new Date(platform.lastSyncAt).toLocaleDateString('pt-BR')
                          : 'Nunca'}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleSync(platform.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDisconnectDialog(platform.id)}
                    >
                      <Unplug className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Plataformas Disponíveis</h2>
          <Badge variant="outline">
            <Sparkles className="h-3 w-3 mr-1" />
            {availablePlatforms.length} plataformas
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlatforms.map((platform) => {
            const Icon = platformIcons[platform.type] || Facebook;
            const colors = platformColors[platform.type] || platformColors.FACEBOOK;
            const isConnected = platforms?.some(
              (p: any) => p.type === platform.type && p.isConnected
            );
            const comingSoon = !['FACEBOOK', 'INSTAGRAM', 'GOOGLE_ADS', 'TIKTOK'].includes(platform.type);

            return (
              <Card
                key={platform.type}
                className={isConnected ? 'border-green-200 bg-green-50/50' : ''}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`${colors.bg} rounded-lg p-3`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        {comingSoon && (
                          <Badge variant="secondary" className="text-xs">
                            Em breve
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardFooter>
                  <Button
                    onClick={() => !isConnected && !comingSoon && handleConnect(platform.type)}
                    disabled={isConnected || comingSoon}
                    variant={isConnected ? 'secondary' : 'default'}
                    className="w-full"
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Conectado
                      </>
                    ) : comingSoon ? (
                      'Em Breve'
                    ) : (
                      'Conectar Agora'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disconnect Dialog */}
      <Dialog open={!!disconnectDialog} onOpenChange={() => setDisconnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar Plataforma</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desconectar esta plataforma? Suas campanhas não serão mais
              sincronizadas e você não poderá gerenciá-las por este painel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectDialog && handleDisconnect(disconnectDialog)}
            >
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
