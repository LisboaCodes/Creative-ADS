import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(status: number | null) {
  if (!status) return 'destructive';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'secondary';
  return 'destructive';
}

export default function ApiLogs() {
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-logs', page, platformFilter],
    queryFn: async () => {
      const params: any = { page, limit: 50 };
      if (platformFilter !== 'all') params.platformType = platformFilter;
      const res = await api.get('/api/api-logs', { params });
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Logs de API
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de chamadas às APIs das plataformas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="FACEBOOK">Facebook</SelectItem>
              <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
              <SelectItem value="TIKTOK">TikTok</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamadas Recentes</CardTitle>
          <CardDescription>
            {pagination?.total || 0} logs registrados (retidos por 7 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum log de API encontrado</p>
              <p className="text-sm mt-1">Sincronize uma plataforma para gerar logs</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log: any) => (
                <div key={log.id} className="border rounded-lg">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    {expandedId === log.id
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs font-mono w-14 justify-center">
                      {log.method}
                    </Badge>
                    <span className="text-sm truncate flex-1 font-mono">{log.url}</span>
                    <Badge variant={statusColor(log.responseStatus) as any} className="shrink-0">
                      {log.responseStatus || 'ERR'}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                      {formatDuration(log.duration)}
                    </span>
                    {log.platformType && (
                      <Badge variant="outline" className="shrink-0 text-xs">{log.platformType}</Badge>
                    )}
                  </button>
                  {expandedId === log.id && (
                    <div className="px-4 pb-4 space-y-3 border-t">
                      {log.error && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-destructive mb-1">Erro:</p>
                          <pre className="text-xs bg-destructive/10 p-2 rounded overflow-x-auto">{log.error}</pre>
                        </div>
                      )}
                      {log.requestBody && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Request Body:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            {typeof log.requestBody === 'string' ? log.requestBody : JSON.stringify(log.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.responseBody && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Response Body:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            {typeof log.responseBody === 'string' ? log.responseBody : JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
