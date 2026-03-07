import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Facebook,
  Instagram,
  Chrome,
  Linkedin,
  Twitter,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  User,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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

const platformNames: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  GOOGLE_ADS: 'Google Ads',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter/X',
};

interface PlatformLogin {
  id: string;
  platformType: string;
  externalUserId: string;
  externalUserName: string | null;
  platformMetadata: any;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  accountCount: number;
  platforms: Array<{
    id: string;
    type: string;
    name: string;
    externalId: string;
    isConnected: boolean;
    lastSyncAt: string | null;
    businessManagerId: string | null;
    businessManagerName: string | null;
  }>;
}

// Platforms that support OAuth connection
const connectablePlatforms = [
  { type: 'FACEBOOK', name: 'Facebook', description: 'Facebook & Instagram Ads' },
  { type: 'GOOGLE_ADS', name: 'Google Ads', description: 'Campanhas de Search, Display e Video' },
  { type: 'TIKTOK', name: 'TikTok Ads', description: 'Conecte o TikTok Ads Manager' },
  { type: 'LINKEDIN', name: 'LinkedIn Ads', description: 'Plataforma de publicidade B2B' },
];

// Platforms not yet implemented
const comingSoonPlatforms = [
  { type: 'TWITTER', name: 'Twitter/X Ads', description: 'Tweets promovidos e campanhas' },
];

export default function Platforms() {
  const [disconnectLoginDialog, setDisconnectLoginDialog] = useState<string | null>(null);
  const [expandedLogins, setExpandedLogins] = useState<Set<string>>(new Set());
  const [expandedBMs, setExpandedBMs] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch platform logins (with hierarchy)
  const { data: logins, isLoading: loginsLoading, error: loginsError } = useQuery<PlatformLogin[]>({
    queryKey: ['platformLogins'],
    queryFn: async () => {
      const response = await api.get('/api/platforms/logins');
      console.log('[Platforms] logins response:', response.data);
      return response.data.data;
    },
    refetchOnMount: 'always',
    retry: 2,
  });

  // Also fetch all platforms for connected status
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  // Resync login mutation
  const resyncMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const response = await api.post(`/api/platforms/logins/${loginId}/sync`);
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronizado: ${data.adAccounts} contas (${data.newAccounts} novas)`);
      queryClient.invalidateQueries({ queryKey: ['platformLogins'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao sincronizar');
    },
  });

  // Disconnect login mutation
  const disconnectLoginMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const response = await api.delete(`/api/platforms/logins/${loginId}`);
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Login desconectado. ${data.accountsDisconnected} conta(s) removida(s).`);
      queryClient.invalidateQueries({ queryKey: ['platformLogins'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setDisconnectLoginDialog(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao desconectar login');
    },
  });

  const handleConnect = async (platformType: string) => {
    try {
      const response = await api.get(`/api/platforms/${platformType.toLowerCase()}/connect`);
      const { authUrl } = response.data.data;
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao iniciar autenticacao');
    }
  };

  const handleCreateBM = () => {
    window.open('https://business.facebook.com/overview', '_blank');
    toast.info('Apos criar o Business Manager no Facebook, volte aqui e clique em Sincronizar na conta correspondente.');
  };

  const toggleLogin = (loginId: string) => {
    setExpandedLogins((prev) => {
      const next = new Set(prev);
      if (next.has(loginId)) {
        next.delete(loginId);
      } else {
        next.add(loginId);
      }
      return next;
    });
  };

  const toggleBM = (bmKey: string) => {
    setExpandedBMs((prev) => {
      const next = new Set(prev);
      if (next.has(bmKey)) {
        next.delete(bmKey);
      } else {
        next.add(bmKey);
      }
      return next;
    });
  };

  // Group platforms by BM within a login
  const groupPlatformsByBM = (loginPlatforms: PlatformLogin['platforms']) => {
    const groups: Record<string, typeof loginPlatforms> = {};
    const ungrouped: typeof loginPlatforms = [];

    for (const p of loginPlatforms) {
      if (p.businessManagerId && p.businessManagerName) {
        const key = p.businessManagerId;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      } else {
        ungrouped.push(p);
      }
    }

    return { groups, ungrouped };
  };

  // Group logins by platform type
  const loginsByPlatform = (logins || []).reduce<Record<string, PlatformLogin[]>>((acc, login) => {
    const key = login.platformType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(login);
    return acc;
  }, {});

  // Debug: log state
  console.log('[Platforms] logins:', logins?.length, 'loading:', loginsLoading, 'error:', loginsError?.message);

  if (loginsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the disconnecting login to show platform name in dialog
  const disconnectingLogin = logins?.find((l) => l.id === disconnectLoginDialog);

  // Render a login card (reusable for all platforms)
  const renderLoginCard = (login: PlatformLogin) => {
    const isExpanded = expandedLogins.has(login.id);
    const metadata = login.platformMetadata || {};
    const bms = metadata.businessManagers || [];
    const { groups, ungrouped } = groupPlatformsByBM(login.platforms);
    const colors = platformColors[login.platformType] || platformColors.FACEBOOK;
    const Icon = platformIcons[login.platformType] || Sparkles;

    return (
      <div
        key={login.id}
        className="border rounded-lg overflow-hidden"
      >
        {/* Login Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => toggleLogin(login.id)}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Icon className={`h-5 w-5 ${colors.icon}`} />
            <div>
              <span className="font-medium">
                {login.externalUserName || `Conta ${login.externalUserId}`}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">
                  {login.accountCount} conta(s) de anuncio
                </Badge>
                {bms.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {bms.length} BM(s)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              disabled={resyncMutation.isPending}
              onClick={() => resyncMutation.mutate(login.id)}
            >
              {resyncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1">Sync</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDisconnectLoginDialog(login.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content: BMs and Accounts */}
        {isExpanded && (
          <div className="px-4 py-3 space-y-2">
            {/* BM Groups (Facebook-specific) */}
            {Object.entries(groups).map(([bmId, bmPlatforms]) => {
              const bmName = bmPlatforms[0]?.businessManagerName || bmId;
              const bmKey = `${login.id}-${bmId}`;
              const isBMExpanded = expandedBMs.has(bmKey);

              return (
                <div key={bmId} className="border rounded-md">
                  <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleBM(bmKey)}
                  >
                    <div className="flex items-center gap-2">
                      {isBMExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <FolderOpen className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-sm">BM: {bmName}</span>
                      <Badge variant="outline" className="text-xs">
                        {bmPlatforms.length} conta(s)
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/platforms/bm/${bmId}`);
                      }}
                    >
                      Ver detalhes
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  {isBMExpanded && (
                    <div className="px-3 pb-2 space-y-1">
                      {bmPlatforms.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => navigate(`/platforms/${p.id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-sm">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({p.externalId})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.lastSyncAt && (
                              <span className="text-xs text-muted-foreground">
                                Sinc: {new Date(p.lastSyncAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped accounts (no BM) */}
            {ungrouped.length > 0 && (
              <div className="border rounded-md">
                {Object.keys(groups).length > 0 && (
                  <div className="px-3 py-2">
                    <span className="text-sm text-muted-foreground font-medium">
                      Contas sem Business Manager
                    </span>
                  </div>
                )}
                <div className="px-3 pb-2 space-y-1">
                  {ungrouped.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => navigate(`/platforms/${p.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({p.externalId})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.lastSyncAt && (
                          <span className="text-xs text-muted-foreground">
                            Sinc: {new Date(p.lastSyncAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {login.platforms.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                Nenhuma conta de anuncio encontrada. Clique em "Sync" para redescobrir.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plataformas</h1>
        <p className="text-muted-foreground">
          Conecte e gerencie suas contas de publicidade
        </p>
      </div>

      {/* Connected Platforms - one card per platform type that has logins */}
      {connectablePlatforms.map((cp) => {
        const typeLogins = loginsByPlatform[cp.type] || [];
        const hasLogins = typeLogins.length > 0;
        const Icon = platformIcons[cp.type] || Sparkles;
        const colors = platformColors[cp.type] || platformColors.FACEBOOK;
        const isFacebook = cp.type === 'FACEBOOK';

        return (
          <Card key={cp.type}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${colors.bg} rounded-lg p-2`}>
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Contas {cp.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {hasLogins
                        ? `${typeLogins.length} login(s) conectado(s)`
                        : 'Nenhuma conta conectada'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isFacebook && (
                    <Button variant="outline" size="sm" onClick={handleCreateBM}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Criar novo BM
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleConnect(cp.type)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Conectar conta {cp.name}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!hasLogins ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Nenhuma conta {cp.name} conectada</p>
                  <p className="text-sm mt-1">
                    Clique em "Conectar conta {cp.name}" para comecar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {typeLogins.map(renderLoginCard)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Coming Soon Platforms */}
      {comingSoonPlatforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Em breve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {comingSoonPlatforms.map((platform) => {
                const Icon = platformIcons[platform.type] || Sparkles;
                const colors = platformColors[platform.type] || platformColors.FACEBOOK;

                return (
                  <div
                    key={platform.type}
                    className="flex items-center gap-3 p-4 border rounded-lg"
                  >
                    <div className={`${colors.bg} rounded-lg p-2`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{platform.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {platform.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      Em breve
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Login Dialog */}
      <Dialog open={!!disconnectLoginDialog} onOpenChange={() => setDisconnectLoginDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Desconectar Conta {disconnectingLogin ? platformNames[disconnectingLogin.platformType] || disconnectingLogin.platformType : ''}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desconectar esta conta? Todas as contas de anuncio associadas serao desconectadas e nao serao mais sincronizadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectLoginDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={disconnectLoginMutation.isPending}
              onClick={() => disconnectLoginDialog && disconnectLoginMutation.mutate(disconnectLoginDialog)}
            >
              {disconnectLoginMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
