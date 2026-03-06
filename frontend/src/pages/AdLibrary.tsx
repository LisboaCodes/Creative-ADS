import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatDate } from '../lib/utils';
import {
  Search,
  Globe,
  ExternalLink,
  Loader2,
  Library,
  Eye,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const countries = [
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'ES', name: 'Espanha' },
  { code: 'AR', name: 'Argentina' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'FR', name: 'França' },
];

export default function AdLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [country, setCountry] = useState('BR');
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ad-library', submittedQuery, country, cursor],
    queryFn: async () => {
      const params: any = { country };
      if (submittedQuery) params.q = submittedQuery;
      if (cursor) params.after = cursor;
      const response = await api.get('/api/ad-library/search', { params });
      return response.data.data;
    },
    enabled: !!submittedQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCursor(undefined);
    setSubmittedQuery(searchQuery.trim());
  };

  const ads = data?.ads || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Library className="h-8 w-8" />
          Ad Library
        </h1>
        <p className="text-muted-foreground">
          Pesquise anúncios de concorrentes na biblioteca de anúncios da Meta
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por palavra-chave, marca ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-[160px]">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={!searchQuery.trim() || isLoading}>
                {isLoading || isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {submittedQuery && !isLoading && ads.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum anúncio encontrado</h3>
            <p className="text-muted-foreground">
              Tente buscar com outros termos ou mude o país
            </p>
          </CardContent>
        </Card>
      )}

      {ads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Resultados para "{submittedQuery}"
            </h2>
            <Badge variant="outline">{ads.length} anúncios</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad: any) => (
              <Card key={ad.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">
                        {ad.pageName || 'Página desconhecida'}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ad.adDeliveryStartTime
                            ? formatDate(ad.adDeliveryStartTime)
                            : 'Data desconhecida'}
                          {ad.adDeliveryStopTime && (
                            <> - {formatDate(ad.adDeliveryStopTime)}</>
                          )}
                          {!ad.adDeliveryStopTime && ad.adDeliveryStartTime && (
                            <Badge variant="success" className="text-xs ml-1">Ativo</Badge>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {/* Ad Title */}
                  {ad.adCreativeLinkTitles?.[0] && (
                    <p className="font-medium text-sm">
                      {ad.adCreativeLinkTitles[0]}
                    </p>
                  )}

                  {/* Ad Body */}
                  {ad.adCreativeBodies?.[0] && (
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {ad.adCreativeBodies[0]}
                    </p>
                  )}

                  {/* Ad Caption */}
                  {ad.adCreativeLinkCaptions?.[0] && (
                    <p className="text-xs text-muted-foreground italic">
                      {ad.adCreativeLinkCaptions[0]}
                    </p>
                  )}

                  {/* Metrics */}
                  <div className="flex gap-3 text-xs text-muted-foreground pt-2 border-t">
                    {ad.impressions && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {ad.impressions.lower_bound || '?'}-{ad.impressions.upper_bound || '?'}
                      </div>
                    )}
                    {ad.spend && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {ad.spend.lower_bound || '?'}-{ad.spend.upper_bound || '?'} {ad.currency || 'BRL'}
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Actions */}
                {ad.adSnapshotUrl && (
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(ad.adSnapshotUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Anúncio Completo
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data?.nextCursor && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setCursor(data.nextCursor)}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!submittedQuery && (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Espione a concorrência</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Pesquise anúncios de qualquer marca ou concorrente. Veja os criativos, textos e
              períodos ativos dos anúncios na Meta Ad Library.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
