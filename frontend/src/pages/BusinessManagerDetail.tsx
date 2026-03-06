import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  FolderOpen,
  Monitor,
  FileImage,
  Target,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

interface BMDetail {
  id: string;
  name: string;
  adAccounts: Array<{
    id: string;
    name: string;
    status: number;
    platformId?: string;
    lastSyncAt?: string;
    isTracked: boolean;
  }>;
  pages: Array<{
    id: string;
    name: string;
    picture?: string;
  }>;
  pixels: Array<{
    id: string;
    name: string;
    isActive: boolean;
    lastFiredTime?: string;
  }>;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 60) return `${diffMinutes}min atras`;
  if (diffHours < 24) return `${diffHours}h atras`;
  if (diffDays < 30) return `${diffDays}d atras`;
  return date.toLocaleDateString('pt-BR');
}

export default function BusinessManagerDetail() {
  const { bmId } = useParams<{ bmId: string }>();
  const navigate = useNavigate();

  const { data: bm, isLoading, error } = useQuery<BMDetail>({
    queryKey: ['bm-detail', bmId],
    queryFn: async () => {
      const response = await api.get(`/api/platforms/bm/${bmId}`);
      return response.data.data;
    },
    enabled: !!bmId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/platforms')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Business Manager nao encontrado ou sem acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platforms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 rounded-lg p-2">
            <FolderOpen className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BM: {bm.name}</h1>
            <p className="text-sm text-muted-foreground">ID: {bm.id}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Monitor className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{bm.adAccounts.length}</p>
              <p className="text-xs text-muted-foreground">Contas de Anuncio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileImage className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{bm.pages.length}</p>
              <p className="text-xs text-muted-foreground">Paginas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{bm.pixels.length}</p>
              <p className="text-xs text-muted-foreground">Pixels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            Contas de Anuncio ({bm.adAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="pages">
            Paginas ({bm.pages.length})
          </TabsTrigger>
          <TabsTrigger value="pixels">
            Pixels ({bm.pixels.length})
          </TabsTrigger>
        </TabsList>

        {/* Ad Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardContent className="p-0">
              {bm.adAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta de anuncio encontrada neste BM.
                </div>
              ) : (
                <div className="divide-y">
                  {bm.adAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors ${
                        acc.platformId ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => acc.platformId && navigate(`/platforms/${acc.platformId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            acc.status === 1 ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={acc.status === 1 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {acc.status === 1 ? 'Ativa' : 'Inativa'}
                        </Badge>
                        {acc.isTracked && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Monitorada
                          </Badge>
                        )}
                        {acc.lastSyncAt && (
                          <span className="text-xs text-muted-foreground">
                            Sinc: {new Date(acc.lastSyncAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {acc.platformId && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardContent className="p-0">
              {bm.pages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma pagina encontrada neste BM.
                </div>
              ) : (
                <div className="divide-y">
                  {bm.pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {page.picture ? (
                        <img
                          src={page.picture}
                          alt={page.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{page.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pixels Tab */}
        <TabsContent value="pixels">
          <Card>
            <CardContent className="p-0">
              {bm.pixels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pixel encontrado neste BM.
                </div>
              ) : (
                <div className="divide-y">
                  {bm.pixels.map((pixel) => (
                    <div
                      key={pixel.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Target
                          className={`h-5 w-5 ${
                            pixel.isActive ? 'text-green-600' : 'text-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">{pixel.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {pixel.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pixel.isActive ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                        {pixel.lastFiredTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(pixel.lastFiredTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
