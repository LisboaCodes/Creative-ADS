import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Search,
  BookOpen,
  Target,
  TrendingUp,
  Star,
  ChevronRight,
  Filter,
  X,
  Lightbulb,
  AlertTriangle,
  Rocket,
  BarChart3,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘',
  GOOGLE_ADS: '🔍',
  TIKTOK: '🎵',
  LINKEDIN: '💼',
  MULTI: '🌐',
};

const platformColors: Record<string, string> = {
  FACEBOOK: 'bg-blue-500/10 text-blue-600 border-blue-200',
  GOOGLE_ADS: 'bg-green-500/10 text-green-600 border-green-200',
  TIKTOK: 'bg-pink-500/10 text-pink-600 border-pink-200',
  LINKEDIN: 'bg-sky-500/10 text-sky-600 border-sky-200',
  MULTI: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

const nicheLabels: Record<string, string> = {
  'e-commerce': 'E-commerce',
  'infoprodutos': 'Infoprodutos',
  'saas': 'SaaS / B2B',
  'servicos-locais': 'Serviços Locais',
  'imobiliario': 'Imobiliário',
  'saude': 'Saúde / Fitness',
  'educacao': 'Educação',
  'financas': 'Finanças',
  'moda': 'Moda / Beleza',
  'restaurantes': 'Restaurantes / Food',
};

const objectiveLabels: Record<string, string> = {
  'conversao': 'Conversão',
  'vendas-catalogo': 'Vendas Catálogo',
  'trafego': 'Tráfego',
  'mensagens': 'Mensagens',
  'leads': 'Leads',
  'reconhecimento': 'Reconhecimento',
  'engajamento': 'Engajamento',
};

const categoryLabels: Record<string, string> = {
  'asc': 'ASC+ (Advantage+)',
  'bdcap': 'BDCAP',
  'cbo': 'CBO',
  'abo': 'ABO',
  'performance-max': 'Performance Max',
  'spark-ads': 'Spark Ads',
  'lead-gen': 'Lead Gen',
  'remarketing': 'Remarketing',
  'lookalike': 'Lookalike',
};

const difficultyColors: Record<string, string> = {
  'iniciante': 'bg-green-500/10 text-green-600',
  'intermediario': 'bg-yellow-500/10 text-yellow-600',
  'avancado': 'bg-red-500/10 text-red-600',
};

const difficultyLabels: Record<string, string> = {
  'iniciante': 'Iniciante',
  'intermediario': 'Intermediário',
  'avancado': 'Avançado',
};

interface CampaignTemplate {
  id: string;
  name: string;
  niche: string;
  platform: string;
  objective: string;
  category: string;
  description: string;
  strategy?: string;
  difficulty: string;
  rating: number;
  year: number;
  verified: boolean;
  benchmarks: any;
  campaignSetup?: any;
  adSetSetup?: any;
  creativeSetup?: any;
  tips?: string[];
  commonMistakes?: string[];
  scalingGuide?: string;
  source?: string;
}

export default function CampaignLibrary() {
  const [search, setSearch] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('');
  const [objective, setObjective] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [detailTab, setDetailTab] = useState<'strategy' | 'structure' | 'creatives' | 'benchmarks' | 'tips'>('strategy');

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-library', search, niche, platform, objective, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (niche) params.set('niche', niche);
      if (platform) params.set('platform', platform);
      if (objective) params.set('objective', objective);
      if (category) params.set('category', category);
      params.set('limit', '50');
      const res = await api.get(`/api/campaign-library?${params.toString()}`);
      return res.data.data;
    },
  });

  // Fetch full detail when a template is selected
  const { data: templateDetail } = useQuery({
    queryKey: ['campaign-library', selectedTemplate?.id],
    queryFn: async () => {
      const res = await api.get(`/api/campaign-library/${selectedTemplate!.id}`);
      return res.data.data as CampaignTemplate;
    },
    enabled: !!selectedTemplate?.id,
  });

  const templates = data?.templates || [];
  const availableFilters = data?.filters || { niches: [], platforms: [], objectives: [], categories: [] };
  const hasFilters = niche || platform || objective || category;

  const clearFilters = () => {
    setNiche('');
    setPlatform('');
    setObjective('');
    setCategory('');
  };

  const detail = templateDetail || selectedTemplate;

  const renderBenchmark = (label: string, value: any, suffix: string = '') => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 text-sm">
          {value.min !== undefined && (
            <span className="text-red-500">{value.min}{suffix}</span>
          )}
          {value.avg !== undefined && (
            <span className="font-medium">{value.avg}{suffix}</span>
          )}
          {value.top !== undefined && (
            <span className="text-green-500">{value.top}{suffix}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Biblioteca de Campanhas
        </h1>
        <p className="text-muted-foreground mt-1">
          Modelos validados das melhores campanhas 2024-2026. Estruturas, criativos, benchmarks e estratégias por nicho.
        </p>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, estratégia, nicho..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Nicho" />
              </SelectTrigger>
              <SelectContent>
                {(availableFilters.niches.length > 0 ? availableFilters.niches : Object.keys(nicheLabels)).map((n: string) => (
                  <SelectItem key={n} value={n}>{nicheLabels[n] || n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                {(availableFilters.platforms.length > 0 ? availableFilters.platforms : Object.keys(platformIcons)).map((p: string) => (
                  <SelectItem key={p} value={p}>{platformIcons[p]} {p.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent>
                {(availableFilters.objectives.length > 0 ? availableFilters.objectives : Object.keys(objectiveLabels)).map((o: string) => (
                  <SelectItem key={o} value={o}>{objectiveLabels[o] || o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {(availableFilters.categories.length > 0 ? availableFilters.categories : Object.keys(categoryLabels)).map((c: string) => (
                  <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="flex gap-2 mt-4">
                  <div className="h-6 bg-muted rounded w-20" />
                  <div className="h-6 bg-muted rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
            <p className="text-muted-foreground mt-1">Tente ajustar os filtros ou buscar outro termo</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <Filter className="h-4 w-4 inline mr-1" />
            {templates.length} {templates.length === 1 ? 'template encontrado' : 'templates encontrados'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: CampaignTemplate) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => { setSelectedTemplate(template); setDetailTab('strategy'); }}
              >
                <CardContent className="pt-6">
                  {/* Header badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', platformColors[template.platform])}>
                      {platformIcons[template.platform]} {template.platform.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', difficultyColors[template.difficulty])}>
                      {difficultyLabels[template.difficulty]}
                    </Badge>
                    {template.verified && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base leading-tight mb-2 group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="secondary" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      {nicheLabels[template.niche] || template.niche}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {objectiveLabels[template.objective] || template.objective}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabels[template.category] || template.category}
                    </Badge>
                  </div>

                  {/* Benchmarks preview */}
                  {template.benchmarks && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                      {template.benchmarks.roas && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ROAS {template.benchmarks.roas.avg}x
                        </span>
                      )}
                      {template.benchmarks.ctr && (
                        <span>CTR {template.benchmarks.ctr.avg}%</span>
                      )}
                      {template.benchmarks.cpa && (
                        <span>CPA R${template.benchmarks.cpa.avg}</span>
                      )}
                    </div>
                  )}

                  {/* Rating + year */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{template.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{template.year}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className={cn(platformColors[detail.platform])}>
                    {platformIcons[detail.platform]} {detail.platform.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className={cn(difficultyColors[detail.difficulty])}>
                    {difficultyLabels[detail.difficulty]}
                  </Badge>
                  <Badge variant="outline">
                    {categoryLabels[detail.category] || detail.category}
                  </Badge>
                  <Badge variant="outline">
                    {objectiveLabels[detail.objective] || detail.objective}
                  </Badge>
                  {detail.verified && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200" variant="outline">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verificado
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{detail.name}</DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">{detail.description}</p>
                {detail.source && (
                  <p className="text-xs text-muted-foreground mt-1">Fonte: {detail.source} ({detail.year})</p>
                )}
              </DialogHeader>

              {/* Tabs */}
              <div className="flex gap-1 border-b mt-4 overflow-x-auto">
                {[
                  { key: 'strategy', label: 'Estratégia', icon: Rocket },
                  { key: 'structure', label: 'Estrutura', icon: Target },
                  { key: 'creatives', label: 'Criativos', icon: Copy },
                  { key: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
                  { key: 'tips', label: 'Dicas', icon: Lightbulb },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'rounded-b-none border-b-2 border-transparent',
                      detailTab === tab.key && 'border-primary text-primary'
                    )}
                    onClick={() => setDetailTab(tab.key as any)}
                  >
                    <tab.icon className="h-4 w-4 mr-1" />
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="mt-4 space-y-4">
                {detailTab === 'strategy' && detail.strategy && (
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                    {detail.strategy}
                  </div>
                )}

                {detailTab === 'structure' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detail.campaignSetup && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Configuração da Campanha</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {Object.entries(detail.campaignSetup).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1 border-b last:border-0">
                              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="font-medium text-right max-w-[60%]">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    {detail.adSetSetup && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Configuração do Conjunto</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {detail.adSetSetup.targeting && (
                            <div>
                              <p className="font-medium mb-1">Segmentação:</p>
                              <div className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap">
                                {JSON.stringify(detail.adSetSetup.targeting, null, 2)}
                              </div>
                            </div>
                          )}
                          {detail.adSetSetup.placements && (
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Posicionamentos</span>
                              <span className="font-medium">{detail.adSetSetup.placements}</span>
                            </div>
                          )}
                          {detail.adSetSetup.optimizationEvent && (
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Otimização</span>
                              <span className="font-medium">{detail.adSetSetup.optimizationEvent}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {detailTab === 'creatives' && detail.creativeSetup && (
                  <div className="space-y-4">
                    {/* Formats */}
                    {detail.creativeSetup.format && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Formatos Recomendados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(detail.creativeSetup.format) ? detail.creativeSetup.format : []).map((f: string) => (
                              <Badge key={f} variant="secondary">{f}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Hooks */}
                    {detail.creativeSetup.hooks && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Hooks (Ganchos de Abertura)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {detail.creativeSetup.hooks.map((hook: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                                <span className="italic">"{hook}"</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Copy Templates */}
                    {detail.creativeSetup.copyTemplates && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Modelos de Copy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {detail.creativeSetup.copyTemplates.map((copy: any, i: number) => (
                            <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-1">
                              {copy.headline && (
                                <p className="font-semibold text-sm">{copy.headline}</p>
                              )}
                              {copy.primaryText && (
                                <p className="text-sm text-muted-foreground">{copy.primaryText}</p>
                              )}
                              {copy.description && (
                                <p className="text-xs text-muted-foreground">{copy.description}</p>
                              )}
                              {copy.cta && (
                                <Badge variant="outline" className="text-xs mt-1">{copy.cta}</Badge>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Visual Guidelines */}
                    {detail.creativeSetup.visualGuidelines && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Diretrizes Visuais</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {detail.creativeSetup.visualGuidelines.map((g: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {detailTab === 'benchmarks' && detail.benchmarks && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Benchmarks de Performance
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-red-500">Min</span> |{' '}
                        <span className="font-medium">Média</span> |{' '}
                        <span className="text-green-500">Top Performers</span>
                      </p>
                    </CardHeader>
                    <CardContent>
                      {renderBenchmark('CTR', detail.benchmarks.ctr, '%')}
                      {renderBenchmark('CPC', detail.benchmarks.cpc, '')}
                      {renderBenchmark('CPM', detail.benchmarks.cpm, '')}
                      {renderBenchmark('CPA', detail.benchmarks.cpa, '')}
                      {renderBenchmark('CPL (Lead)', detail.benchmarks.cplead, '')}
                      {renderBenchmark('ROAS', detail.benchmarks.roas, 'x')}
                      {renderBenchmark('Conv. Rate', detail.benchmarks.conversionRate, '%')}
                      {renderBenchmark('View Rate', detail.benchmarks.viewRate, '%')}
                      {renderBenchmark('Blended ROAS', detail.benchmarks.blendedRoas, 'x')}
                      {detail.benchmarks.note && (
                        <p className="text-xs text-muted-foreground mt-3 italic">{detail.benchmarks.note}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {detailTab === 'tips' && (
                  <div className="space-y-4">
                    {/* Pro Tips */}
                    {detail.tips && detail.tips.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Dicas dos Especialistas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {detail.tips.map((tip: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Common Mistakes */}
                    {detail.commonMistakes && detail.commonMistakes.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Erros Comuns (Evite!)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {detail.commonMistakes.map((mistake: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Scaling Guide */}
                    {detail.scalingGuide && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Rocket className="h-4 w-4 text-purple-500" />
                            Guia de Escala
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                            {detail.scalingGuide}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
