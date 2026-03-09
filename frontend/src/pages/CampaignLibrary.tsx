import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Search,
  BookOpen,
  Target,
  TrendingUp,
  Star,
  ChevronRight,
  ChevronLeft,
  Filter,
  X,
  Lightbulb,
  AlertTriangle,
  Rocket,
  BarChart3,
  Copy,
  CheckCircle2,
  PlayCircle,
  Loader2,
  Check,
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
  'agencia': 'Agência de Marketing',
  'tecnologia': 'Tecnologia',
  'tatuagem': 'Tatuagem / Body Art',
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

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'SEND_WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
];

export default function CampaignLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('');
  const [objective, setObjective] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [detailTab, setDetailTab] = useState<'strategy' | 'structure' | 'creatives' | 'benchmarks' | 'tips'>('strategy');

  // Apply Template Wizard state
  const [applyWizardOpen, setApplyWizardOpen] = useState(false);
  const [applyStep, setApplyStep] = useState(0);
  const [applyData, setApplyData] = useState({
    platformId: '',
    campaignName: '',
    budget: 0,
    budgetType: 'daily' as 'daily' | 'lifetime',
    targeting: {
      geoLocations: { countries: ['BR'] as string[] },
      ageMin: 18,
      ageMax: 65,
      genders: [] as number[],
    },
    pageId: '',
    websiteUrl: '',
    creative: {
      headline: '',
      primaryText: '',
      description: '',
      cta: 'LEARN_MORE',
      imageHash: '',
    },
  });

  // Fetch connected platforms for wizard
  const { data: connectedPlatforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  // Fetch pages for selected platform in wizard
  const { data: wizardPages } = useQuery({
    queryKey: ['platform-pages', applyData.platformId],
    queryFn: async () => {
      const response = await api.get(`/api/platforms/${applyData.platformId}/pages`);
      return response.data.data;
    },
    enabled: !!applyData.platformId && applyWizardOpen,
  });

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/campaigns/apply-template', {
        templateId: selectedTemplate!.id,
        platformId: applyData.platformId,
        campaignName: applyData.campaignName,
        budget: applyData.budget,
        budgetType: applyData.budgetType,
        targeting: applyData.targeting,
        pageId: applyData.pageId || undefined,
        websiteUrl: applyData.websiteUrl || undefined,
        creative: applyData.creative.headline ? applyData.creative : undefined,
      });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Campanha criada com sucesso a partir do template!');
      setApplyWizardOpen(false);
      setSelectedTemplate(null);
      navigate('/campaigns');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao aplicar template');
    },
  });

  const openApplyWizard = () => {
    if (!selectedTemplate) return;
    const setup = selectedTemplate.campaignSetup as any;
    setApplyData({
      platformId: '',
      campaignName: selectedTemplate.name,
      budget: setup?.budgetRange?.recommended || 100,
      budgetType: setup?.budgetType || 'daily',
      targeting: {
        geoLocations: { countries: ['BR'] },
        ageMin: (selectedTemplate.adSetSetup as any)?.targeting?.ageMin || 18,
        ageMax: (selectedTemplate.adSetSetup as any)?.targeting?.ageMax || 65,
        genders: [],
      },
      pageId: '',
      websiteUrl: '',
      creative: {
        headline: (selectedTemplate.creativeSetup as any)?.copyTemplates?.[0]?.headline || '',
        primaryText: (selectedTemplate.creativeSetup as any)?.copyTemplates?.[0]?.primaryText || '',
        description: (selectedTemplate.creativeSetup as any)?.copyTemplates?.[0]?.description || '',
        cta: (selectedTemplate.creativeSetup as any)?.copyTemplates?.[0]?.cta || 'LEARN_MORE',
        imageHash: '',
      },
    });
    setApplyStep(0);
    setApplyWizardOpen(true);
  };

  const applySteps = ['Conta', 'Orçamento', 'Segmentação', 'Criativo', 'Confirmar'];
  const canProceedApply = () => {
    switch (applyStep) {
      case 0: return !!applyData.platformId && !!applyData.campaignName;
      case 1: return applyData.budget > 0;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

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

      {/* Apply Template Wizard */}
      <Dialog open={applyWizardOpen} onOpenChange={setApplyWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aplicar Template: {selectedTemplate?.name}</DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-3">
              {applySteps.map((stepLabel, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                    i < applyStep ? 'bg-primary text-primary-foreground' :
                    i === applyStep ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {i < applyStep ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={cn('text-xs hidden sm:inline', i === applyStep ? 'font-medium' : 'text-muted-foreground')}>
                    {stepLabel}
                  </span>
                  {i < applySteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Step 0: Platform & Name */}
            {applyStep === 0 && (() => {
              // Group platforms by Business Manager
              const connected = connectedPlatforms?.filter((p: any) => p.isConnected) || [];
              const bmGroups = new Map<string, { bmName: string; platforms: any[] }>();
              const ungrouped: any[] = [];

              for (const p of connected) {
                if (p.businessManagerId && p.businessManagerName) {
                  const existing = bmGroups.get(p.businessManagerId);
                  if (existing) {
                    existing.platforms.push(p);
                  } else {
                    bmGroups.set(p.businessManagerId, { bmName: p.businessManagerName, platforms: [p] });
                  }
                } else {
                  ungrouped.push(p);
                }
              }

              const selectedPlatform = connected.find((p: any) => p.id === applyData.platformId);

              return (
                <div className="space-y-4">
                  <div>
                    <Label>Business Manager / Conta de Anúncios</Label>
                    <Select
                      value={applyData.platformId}
                      onValueChange={(v) => setApplyData({ ...applyData, platformId: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione uma conta de anúncios" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(bmGroups.entries()).map(([bmId, group], idx) => (
                          <SelectGroup key={bmId}>
                            {idx > 0 && <SelectSeparator />}
                            <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                              {group.bmName}
                            </SelectLabel>
                            {group.platforms.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="text-xs text-muted-foreground">({p.type})</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                        {ungrouped.length > 0 && (
                          <SelectGroup>
                            {bmGroups.size > 0 && <SelectSeparator />}
                            <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                              Contas Avulsas
                            </SelectLabel>
                            {ungrouped.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="text-xs text-muted-foreground">({p.type})</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedPlatform?.businessManagerName && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        BM: {selectedPlatform.businessManagerName} — ID: {selectedPlatform.externalId}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Nome da Campanha</Label>
                    <Input
                      value={applyData.campaignName}
                      onChange={(e) => setApplyData({ ...applyData, campaignName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Step 1: Budget */}
            {applyStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Tipo de Orçamento</Label>
                  <Select
                    value={applyData.budgetType}
                    onValueChange={(v) => setApplyData({ ...applyData, budgetType: v as any })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="lifetime">Vitalício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor do Orçamento (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={applyData.budget || ''}
                    onChange={(e) => setApplyData({ ...applyData, budget: Number(e.target.value) })}
                    className="mt-1"
                  />
                  {(selectedTemplate?.campaignSetup as any)?.budgetRange && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sugerido: R${(selectedTemplate?.campaignSetup as any).budgetRange.recommended}/
                      {applyData.budgetType === 'daily' ? 'dia' : 'total'}
                      {' '}(min R${(selectedTemplate?.campaignSetup as any).budgetRange.min} - max R${(selectedTemplate?.campaignSetup as any).budgetRange.max})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Targeting */}
            {applyStep === 2 && (
              <div className="space-y-4">
                {(selectedTemplate?.adSetSetup as any)?.targeting?.type === 'BROAD' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                    Este template usa segmentação <strong>BROAD</strong> (aberta). O algoritmo da plataforma encontrará o melhor público automaticamente. Apenas defina a localização geográfica.
                  </div>
                )}
                <div>
                  <Label>País</Label>
                  <Select
                    value={applyData.targeting.geoLocations.countries[0] || 'BR'}
                    onValueChange={(v) => setApplyData({
                      ...applyData,
                      targeting: { ...applyData.targeting, geoLocations: { countries: [v] } },
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Idade Mínima</Label>
                    <Input
                      type="number"
                      min="13"
                      max="65"
                      value={applyData.targeting.ageMin}
                      onChange={(e) => setApplyData({
                        ...applyData,
                        targeting: { ...applyData.targeting, ageMin: Number(e.target.value) },
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Idade Máxima</Label>
                    <Input
                      type="number"
                      min="13"
                      max="65"
                      value={applyData.targeting.ageMax}
                      onChange={(e) => setApplyData({
                        ...applyData,
                        targeting: { ...applyData.targeting, ageMax: Number(e.target.value) },
                      })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Gênero</Label>
                  <Select
                    value={applyData.targeting.genders.length === 0 ? 'all' : String(applyData.targeting.genders[0])}
                    onValueChange={(v) => setApplyData({
                      ...applyData,
                      targeting: {
                        ...applyData.targeting,
                        genders: v === 'all' ? [] : [Number(v)],
                      },
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="1">Masculino</SelectItem>
                      <SelectItem value="2">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Creative */}
            {applyStep === 3 && (
              <div className="space-y-4">
                {/* Copy templates as suggestions */}
                {(selectedTemplate?.creativeSetup as any)?.copyTemplates && (
                  <div>
                    <p className="text-sm font-medium mb-2">Sugestões do template (clique para usar):</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(selectedTemplate?.creativeSetup as any).copyTemplates.map((copy: any, i: number) => (
                        <button
                          key={i}
                          className="w-full text-left bg-muted/50 rounded-lg p-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => setApplyData({
                            ...applyData,
                            creative: {
                              ...applyData.creative,
                              headline: copy.headline || applyData.creative.headline,
                              primaryText: copy.primaryText || applyData.creative.primaryText,
                              description: copy.description || applyData.creative.description,
                              cta: copy.cta || applyData.creative.cta,
                            },
                          })}
                        >
                          {copy.headline && <p className="font-semibold">{copy.headline}</p>}
                          {copy.primaryText && <p className="text-muted-foreground">{copy.primaryText}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Página / Page ID</Label>
                  {wizardPages && wizardPages.length > 0 ? (
                    <Select
                      value={applyData.pageId}
                      onValueChange={(v) => setApplyData({ ...applyData, pageId: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione uma página" />
                      </SelectTrigger>
                      <SelectContent>
                        {wizardPages.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={applyData.pageId}
                      onChange={(e) => setApplyData({ ...applyData, pageId: e.target.value })}
                      placeholder="ID da página do Facebook"
                      className="mt-1"
                    />
                  )}
                </div>
                <div>
                  <Label>Título (Headline)</Label>
                  <Input
                    value={applyData.creative.headline}
                    onChange={(e) => setApplyData({
                      ...applyData,
                      creative: { ...applyData.creative, headline: e.target.value },
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Texto Principal</Label>
                  <Textarea
                    value={applyData.creative.primaryText}
                    onChange={(e) => setApplyData({
                      ...applyData,
                      creative: { ...applyData.creative, primaryText: e.target.value },
                    })}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={applyData.creative.description}
                    onChange={(e) => setApplyData({
                      ...applyData,
                      creative: { ...applyData.creative, description: e.target.value },
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>URL de Destino</Label>
                  <Input
                    value={applyData.websiteUrl}
                    onChange={(e) => setApplyData({ ...applyData, websiteUrl: e.target.value })}
                    placeholder="https://seusite.com.br"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Botão de Ação (CTA)</Label>
                  <Select
                    value={applyData.creative.cta}
                    onValueChange={(v) => setApplyData({
                      ...applyData,
                      creative: { ...applyData.creative, cta: v },
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map((cta) => (
                        <SelectItem key={cta.value} value={cta.value}>{cta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  A imagem pode ser adicionada depois diretamente no Gerenciador de Anúncios.
                </p>
              </div>
            )}

            {/* Step 4: Confirm */}
            {applyStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Resumo da Campanha</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Template</p>
                    <p className="font-medium">{selectedTemplate?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conta</p>
                    <p className="font-medium">
                      {connectedPlatforms?.find((p: any) => p.id === applyData.platformId)?.name || applyData.platformId}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nome</p>
                    <p className="font-medium">{applyData.campaignName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Orçamento</p>
                    <p className="font-medium">
                      R${applyData.budget.toFixed(2)}/{applyData.budgetType === 'daily' ? 'dia' : 'total'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">País</p>
                    <p className="font-medium">{applyData.targeting.geoLocations.countries.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Idade</p>
                    <p className="font-medium">{applyData.targeting.ageMin}-{applyData.targeting.ageMax} anos</p>
                  </div>
                  {applyData.creative.headline && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Criativo</p>
                      <p className="font-medium">{applyData.creative.headline}</p>
                      {applyData.creative.primaryText && (
                        <p className="text-xs text-muted-foreground">{applyData.creative.primaryText}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                  A campanha será criada com status <strong>PAUSADA</strong> na plataforma.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => applyStep > 0 ? setApplyStep(applyStep - 1) : setApplyWizardOpen(false)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {applyStep > 0 ? 'Voltar' : 'Cancelar'}
            </Button>
            {applyStep < applySteps.length - 1 ? (
              <Button onClick={() => setApplyStep(applyStep + 1)} disabled={!canProceedApply()}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Criar na Plataforma
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-xl">{detail.name}</DialogTitle>
                    <p className="text-muted-foreground text-sm mt-1">{detail.description}</p>
                    {detail.source && (
                      <p className="text-xs text-muted-foreground mt-1">Fonte: {detail.source} ({detail.year})</p>
                    )}
                  </div>
                  <Button onClick={openApplyWizard} className="flex-shrink-0">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Aplicar Campanha
                  </Button>
                </div>
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
