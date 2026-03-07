import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Megaphone,
  Target,
  DollarSign,
  Image,
  Eye,
  Bot,
  Search,
  X,
  Upload,
  FileImage,
  FileEdit,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento', description: 'Alcançar o máximo de pessoas' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego', description: 'Enviar pessoas para um destino' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento', description: 'Obter mais interações' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Gerar cadastros e leads' },
  { value: 'OUTCOME_SALES', label: 'Vendas', description: 'Encontrar pessoas propensas a comprar' },
];

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_TRAVEL', label: 'Reservar' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'SEND_WHATSAPP_MESSAGE', label: 'WhatsApp' },
];

const STEPS = [
  { key: 'platform', label: 'Plataforma', icon: Megaphone },
  { key: 'objective', label: 'Objetivo', icon: Target },
  { key: 'audience', label: 'Público', icon: Target },
  { key: 'budget', label: 'Orçamento', icon: DollarSign },
  { key: 'creative', label: 'Criativo', icon: Image },
  { key: 'review', label: 'Revisão', icon: Eye },
];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [interestSearch, setInterestSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    platformId: '',
    name: '',
    objective: '',
    targeting: {
      geoLocations: {
        countries: ['BR'] as string[],
        cities: [] as Array<{ key: string; name: string }>,
      },
      ageMin: 18,
      ageMax: 65,
      genders: [] as number[],
      interests: [] as Array<{ id: string; name: string }>,
    },
    dailyBudget: undefined as number | undefined,
    lifetimeBudget: undefined as number | undefined,
    startDate: '',
    endDate: '',
    budgetType: 'daily' as 'daily' | 'lifetime',
    creative: {
      pageId: '',
      message: '',
      headline: '',
      description: '',
      linkUrl: '',
      callToAction: 'LEARN_MORE',
      imageHash: '',
      useExistingPost: false,
      postId: '',
    },
  });

  // Creative mode: 'new' or 'existing'
  const [creativeMode, setCreativeMode] = useState<'new' | 'existing'>('new');

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // City search state
  const [citySearch, setCitySearch] = useState('');

  // AI suggestions state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNameSuggestions, setAiNameSuggestions] = useState<string[]>([]);
  const [aiInterestSuggestions, setAiInterestSuggestions] = useState<string[]>([]);
  const [aiBudgetSuggestion, setAiBudgetSuggestion] = useState<{ dailyBudget?: number; justification?: string } | null>(null);
  const [aiCopySuggestion, setAiCopySuggestion] = useState<{ message?: string; headline?: string; description?: string } | null>(null);

  // Fetch platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  // Fetch pages for selected platform
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['platform-pages', formData.platformId],
    queryFn: async () => {
      const response = await api.get(`/api/platforms/${formData.platformId}/pages`);
      return response.data.data;
    },
    enabled: !!formData.platformId,
  });

  // Fetch posts for selected page
  const { data: pagePosts, isLoading: postsLoading } = useQuery({
    queryKey: ['page-posts', formData.platformId, formData.creative.pageId],
    queryFn: async () => {
      const response = await api.get(
        `/api/platforms/${formData.platformId}/pages/${formData.creative.pageId}/posts`
      );
      return response.data.data;
    },
    enabled: !!formData.platformId && !!formData.creative.pageId && creativeMode === 'existing',
  });

  // Search cities for geolocation targeting
  const { data: cityResults } = useQuery({
    queryKey: ['city-search', formData.platformId, citySearch],
    queryFn: async () => {
      if (!citySearch || !formData.platformId) return [];
      const response = await api.get('/api/campaigns/targeting/search', {
        params: { platformId: formData.platformId, q: citySearch, type: 'adgeolocation', locationTypes: 'city' },
      });
      return response.data.data;
    },
    enabled: !!citySearch && citySearch.length >= 2 && !!formData.platformId,
  });

  // Search targeting
  const { data: targetingResults } = useQuery({
    queryKey: ['targeting-search', formData.platformId, interestSearch],
    queryFn: async () => {
      if (!interestSearch || !formData.platformId) return [];
      const response = await api.get('/api/campaigns/targeting/search', {
        params: { platformId: formData.platformId, q: interestSearch },
      });
      return response.data.data;
    },
    enabled: !!interestSearch && interestSearch.length >= 2 && !!formData.platformId,
  });

  // Build campaign payload
  const buildPayload = (saveAsDraft = false) => {
    const payload: any = {
      platformId: formData.platformId,
      name: formData.name,
      objective: formData.objective,
      targeting: formData.targeting,
      saveAsDraft,
    };

    if (formData.budgetType === 'daily' && formData.dailyBudget) {
      payload.dailyBudget = formData.dailyBudget;
    }
    if (formData.budgetType === 'lifetime' && formData.lifetimeBudget) {
      payload.lifetimeBudget = formData.lifetimeBudget;
    }
    if (formData.startDate) payload.startDate = formData.startDate;
    if (formData.endDate) payload.endDate = formData.endDate;

    if (formData.creative.pageId) {
      payload.creative = { ...formData.creative };
      if (!payload.creative.imageHash) delete payload.creative.imageHash;
      if (!payload.creative.postId) delete payload.creative.postId;
    }

    return payload;
  };

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/campaigns', buildPayload(false));
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success('Campanha criada com sucesso! Status: PAUSADA');
      navigate(`/campaigns/${data.campaign.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao criar campanha');
    },
  });

  // Save as draft mutation
  const draftMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/campaigns', buildPayload(true));
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Rascunho salvo com sucesso!');
      navigate('/campaigns');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao salvar rascunho');
    },
  });

  // AI suggestion (contextual)
  const askAISuggest = useCallback(async (type: 'names' | 'audience' | 'budget' | 'copy') => {
    setAiLoading(true);
    try {
      const response = await api.post('/api/campaigns/ai-suggest', {
        type,
        context: {
          campaignName: formData.name,
          objective: OBJECTIVES.find((o) => o.value === formData.objective)?.label || formData.objective,
          platformId: formData.platformId,
          budgetType: formData.budgetType,
          interests: formData.targeting.interests.map((i) => i.name),
        },
      });

      const data = response.data.data;

      switch (type) {
        case 'names':
          setAiNameSuggestions(data.names || []);
          break;
        case 'audience':
          setAiInterestSuggestions(data.interests || []);
          break;
        case 'budget':
          setAiBudgetSuggestion(data);
          break;
        case 'copy':
          setAiCopySuggestion(data);
          break;
      }
    } catch {
      toast.error('Falha ao obter sugestão da IA');
    } finally {
      setAiLoading(false);
    }
  }, [formData]);

  // Image upload handler
  const handleImageUpload = useCallback(async (file: File) => {
    if (!formData.platformId) {
      toast.error('Selecione uma plataforma primeiro');
      return;
    }

    setUploadingImage(true);
    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Facebook
      const fd = new FormData();
      fd.append('image', file);
      fd.append('platformId', formData.platformId);

      const response = await api.post('/api/campaigns/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { imageHash, imageUrl } = response.data.data;
      updateCreative('imageHash', imageHash);
      if (imageUrl) setImagePreview(imageUrl);
      toast.success('Imagem enviada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao enviar imagem');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  }, [formData.platformId]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTargeting = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      targeting: { ...prev.targeting, [field]: value },
    }));
  };

  const updateCreative = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      creative: { ...prev.creative, [field]: value },
    }));
  };

  const addInterest = (interest: { id: string; name: string }) => {
    if (!formData.targeting.interests.find((i) => i.id === interest.id)) {
      updateTargeting('interests', [...formData.targeting.interests, interest]);
    }
    setInterestSearch('');
  };

  const removeInterest = (id: string) => {
    updateTargeting(
      'interests',
      formData.targeting.interests.filter((i) => i.id !== id)
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!formData.platformId && !!formData.name;
      case 1:
        return !!formData.objective;
      case 2:
        return formData.targeting.geoLocations.countries.length > 0;
      case 3:
        return (formData.budgetType === 'daily' && formData.dailyBudget && formData.dailyBudget > 0) ||
               (formData.budgetType === 'lifetime' && formData.lifetimeBudget && formData.lifetimeBudget > 0);
      case 4:
        return true; // Creative is optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  const selectedPlatform = platforms?.find((p: any) => p.id === formData.platformId);
  const selectedObjective = OBJECTIVES.find((o) => o.value === formData.objective);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Campanha</h1>
          <p className="text-sm text-muted-foreground">
            Crie uma campanha com assistência de IA
          </p>
        </div>
      </div>

      {/* Steps Progress */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.key}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isDone
                  ? 'bg-primary/10 text-primary cursor-pointer'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Platform & Name */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Conta / Plataforma</Label>
                <Select value={formData.platformId} onValueChange={(v) => updateForm('platformId', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms?.filter((p: any) => p.isConnected).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome da Campanha</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Ex: Black Friday 2026 - Conversões"
                  className="mt-1"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => askAISuggest('names')}
                disabled={aiLoading}
              >
                <Bot className="h-4 w-4 mr-2" />
                {aiLoading ? 'Pensando...' : 'Sugerir nomes com IA'}
              </Button>

              {/* AI name suggestions with auto-fill */}
              {aiNameSuggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Clique para aplicar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiNameSuggestions.map((name, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          updateForm('name', name);
                          setAiNameSuggestions([]);
                        }}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Objective */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Objetivo da Campanha</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => updateForm('objective', obj.value)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      formData.objective === obj.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium">{obj.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Location Targeting */}
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </Label>

                {/* Countries - Multi-select */}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Países</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.targeting.geoLocations.countries.map((code) => {
                      const countryNames: Record<string, string> = {
                        BR: 'Brasil', US: 'Estados Unidos', PT: 'Portugal',
                        AR: 'Argentina', MX: 'México', CO: 'Colômbia',
                        CL: 'Chile', PE: 'Peru', UY: 'Uruguai', ES: 'Espanha',
                      };
                      return (
                        <Badge key={code} variant="secondary" className="gap-1">
                          {countryNames[code] || code}
                          <button onClick={() => {
                            const updated = formData.targeting.geoLocations.countries.filter((c) => c !== code);
                            updateTargeting('geoLocations', { ...formData.targeting.geoLocations, countries: updated });
                          }}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (!formData.targeting.geoLocations.countries.includes(v)) {
                        updateTargeting('geoLocations', {
                          ...formData.targeting.geoLocations,
                          countries: [...formData.targeting.geoLocations.countries, v],
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="+ Adicionar país" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { code: 'BR', name: 'Brasil' },
                        { code: 'US', name: 'Estados Unidos' },
                        { code: 'PT', name: 'Portugal' },
                        { code: 'AR', name: 'Argentina' },
                        { code: 'MX', name: 'México' },
                        { code: 'CO', name: 'Colômbia' },
                        { code: 'CL', name: 'Chile' },
                        { code: 'PE', name: 'Peru' },
                        { code: 'UY', name: 'Uruguai' },
                        { code: 'ES', name: 'Espanha' },
                      ]
                        .filter((c) => !formData.targeting.geoLocations.countries.includes(c.code))
                        .map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cities search */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Cidades (opcional - para segmentação mais precisa)</p>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cidades... (ex: São Paulo, Rio de Janeiro)"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {cityResults && cityResults.length > 0 && (
                    <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                      {cityResults.map((city: any) => (
                        <button
                          key={city.id || city.key}
                          onClick={() => {
                            const cityKey = city.key || city.id;
                            const cityName = city.name;
                            if (!formData.targeting.geoLocations.cities?.find((c) => c.key === cityKey)) {
                              updateTargeting('geoLocations', {
                                ...formData.targeting.geoLocations,
                                cities: [...(formData.targeting.geoLocations.cities || []), { key: cityKey, name: cityName }],
                              });
                            }
                            setCitySearch('');
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-sm text-left"
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span>{city.name}</span>
                          {city.region && <span className="text-xs text-muted-foreground">({city.region})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.targeting.geoLocations.cities && formData.targeting.geoLocations.cities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.targeting.geoLocations.cities.map((city) => (
                        <Badge key={city.key} variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {city.name}
                          <button onClick={() => {
                            updateTargeting('geoLocations', {
                              ...formData.targeting.geoLocations,
                              cities: formData.targeting.geoLocations.cities.filter((c) => c.key !== city.key),
                            });
                          }}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Idade Mínima</Label>
                  <Input
                    type="number"
                    min={13}
                    max={65}
                    value={formData.targeting.ageMin}
                    onChange={(e) => updateTargeting('ageMin', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Idade Máxima</Label>
                  <Input
                    type="number"
                    min={13}
                    max={65}
                    value={formData.targeting.ageMax}
                    onChange={(e) => updateTargeting('ageMax', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Gênero</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { value: [] as number[], label: 'Todos' },
                    { value: [1], label: 'Masculino' },
                    { value: [2], label: 'Feminino' },
                  ].map((opt) => (
                    <Button
                      key={opt.label}
                      variant={JSON.stringify(formData.targeting.genders) === JSON.stringify(opt.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateTargeting('genders', opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Interesses</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar interesses..."
                    value={interestSearch}
                    onChange={(e) => setInterestSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {targetingResults && targetingResults.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                    {targetingResults.map((result: any) => (
                      <button
                        key={result.id}
                        onClick={() => addInterest(result)}
                        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 text-sm"
                      >
                        <span>{result.name}</span>
                        {result.audienceSize && (
                          <span className="text-xs text-muted-foreground">
                            {Number(result.audienceSize).toLocaleString('pt-BR')} pessoas
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {formData.targeting.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.targeting.interests.map((interest) => (
                      <Badge key={interest.id} variant="secondary" className="gap-1">
                        {interest.name}
                        <button onClick={() => removeInterest(interest.id)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => askAISuggest('audience')}
                disabled={aiLoading}
              >
                <Bot className="h-4 w-4 mr-2" />
                {aiLoading ? 'Pensando...' : 'Sugerir público com IA'}
              </Button>

              {/* AI interest suggestions with search-to-add */}
              {aiInterestSuggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sugestões baseadas nas suas campanhas. Clique para buscar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiInterestSuggestions.map((interest, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInterestSearch(interest);
                          setAiInterestSuggestions([]);
                        }}
                      >
                        + {interest}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de Orçamento</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={formData.budgetType === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateForm('budgetType', 'daily')}
                  >
                    Diário
                  </Button>
                  <Button
                    variant={formData.budgetType === 'lifetime' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateForm('budgetType', 'lifetime')}
                  >
                    Vitalício
                  </Button>
                </div>
              </div>

              <div>
                <Label>
                  {formData.budgetType === 'daily' ? 'Orçamento Diário (R$)' : 'Orçamento Total (R$)'}
                </Label>
                <Input
                  type="number"
                  min={1}
                  step={0.01}
                  value={formData.budgetType === 'daily' ? formData.dailyBudget || '' : formData.lifetimeBudget || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    if (formData.budgetType === 'daily') {
                      updateForm('dailyBudget', val);
                    } else {
                      updateForm('lifetimeBudget', val);
                    }
                  }}
                  placeholder="Ex: 50.00"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateForm('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateForm('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => askAISuggest('budget')}
                disabled={aiLoading}
              >
                <Bot className="h-4 w-4 mr-2" />
                {aiLoading ? 'Pensando...' : 'Sugerir orçamento com IA'}
              </Button>

              {/* AI budget suggestion with auto-fill */}
              {aiBudgetSuggestion && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Sugestão: R${aiBudgetSuggestion.dailyBudget?.toFixed(2)}/dia
                      </p>
                      <p className="text-xs text-muted-foreground">{aiBudgetSuggestion.justification}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (aiBudgetSuggestion.dailyBudget) {
                          updateForm('budgetType', 'daily');
                          updateForm('dailyBudget', aiBudgetSuggestion.dailyBudget);
                        }
                        setAiBudgetSuggestion(null);
                      }}
                    >
                      Aplicar R${aiBudgetSuggestion.dailyBudget?.toFixed(2)}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Creative (Redesigned) */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Creative mode toggle */}
              <div>
                <Label>Tipo de Criativo</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={creativeMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreativeMode('new');
                      updateCreative('useExistingPost', false);
                      updateCreative('postId', '');
                    }}
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    Criar novo
                  </Button>
                  <Button
                    variant={creativeMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCreativeMode('existing');
                      updateCreative('useExistingPost', true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Usar post existente
                  </Button>
                </div>
              </div>

              {/* Page selector (shared between both modes) */}
              <div>
                <Label>Página do Facebook</Label>
                {pages && pages.length > 0 ? (
                  <Select
                    value={formData.creative.pageId}
                    onValueChange={(v) => updateCreative('pageId', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione uma página" />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((page: any) => (
                        <SelectItem key={page.id} value={page.id}>
                          <div className="flex items-center gap-2">
                            {page.picture && (
                              <img
                                src={page.picture}
                                alt=""
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            {page.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    <Input
                      value={formData.creative.pageId}
                      onChange={(e) => updateCreative('pageId', e.target.value)}
                      placeholder="ID da página (ex: 123456789)"
                      className="mt-1"
                    />
                    {pagesLoading && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Carregando páginas...
                      </p>
                    )}
                    {!pagesLoading && formData.platformId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Nenhuma página encontrada. Insira o ID manualmente.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* MODE: Create new creative */}
              {creativeMode === 'new' && (
                <>
                  {/* Image upload */}
                  <div>
                    <Label>Imagem do Anúncio</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    {imagePreview ? (
                      <div className="mt-1 relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-48 rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-7 w-7 p-0"
                          onClick={() => {
                            setImagePreview(null);
                            updateCreative('imageHash', '');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="mt-1 w-full border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          {uploadingImage ? 'Enviando...' : 'Clique para enviar uma imagem'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG ou GIF (max. 30MB)
                        </p>
                      </button>
                    )}
                  </div>

                  <div>
                    <Label>Texto Principal</Label>
                    <Textarea
                      value={formData.creative.message}
                      onChange={(e) => updateCreative('message', e.target.value)}
                      placeholder="O texto que aparece acima do anúncio..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Título</Label>
                    <Input
                      value={formData.creative.headline}
                      onChange={(e) => updateCreative('headline', e.target.value)}
                      placeholder="Título do anúncio"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={formData.creative.description}
                      onChange={(e) => updateCreative('description', e.target.value)}
                      placeholder="Descrição complementar"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>URL de Destino</Label>
                    <Input
                      value={formData.creative.linkUrl}
                      onChange={(e) => updateCreative('linkUrl', e.target.value)}
                      placeholder="https://seusite.com.br/landing"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Botão de Ação (CTA)</Label>
                    <Select
                      value={formData.creative.callToAction}
                      onValueChange={(v) => updateCreative('callToAction', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CTA_OPTIONS.map((cta) => (
                          <SelectItem key={cta.value} value={cta.value}>
                            {cta.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => askAISuggest('copy')}
                    disabled={aiLoading}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {aiLoading ? 'Pensando...' : 'Gerar copy com IA'}
                  </Button>

                  {/* AI copy suggestion with auto-fill */}
                  {aiCopySuggestion && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Sugestão da IA:</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Texto:</span> {aiCopySuggestion.message}</p>
                        <p><span className="font-medium">Título:</span> {aiCopySuggestion.headline}</p>
                        <p><span className="font-medium">Descrição:</span> {aiCopySuggestion.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (aiCopySuggestion.message) updateCreative('message', aiCopySuggestion.message);
                            if (aiCopySuggestion.headline) updateCreative('headline', aiCopySuggestion.headline);
                            if (aiCopySuggestion.description) updateCreative('description', aiCopySuggestion.description);
                            setAiCopySuggestion(null);
                          }}
                        >
                          Aplicar tudo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAiCopySuggestion(null)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODE: Use existing post */}
              {creativeMode === 'existing' && (
                <div>
                  {!formData.creative.pageId ? (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma página acima para ver os posts disponíveis.
                    </p>
                  ) : postsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando posts...
                    </div>
                  ) : pagePosts && pagePosts.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Selecione um post</Label>
                      <div className="grid gap-2 max-h-80 overflow-y-auto">
                        {pagePosts.map((post: any) => (
                          <button
                            key={post.id}
                            onClick={() => updateCreative('postId', post.id)}
                            className={`flex gap-3 p-3 rounded-lg border text-left transition-colors ${
                              formData.creative.postId === post.id
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {post.fullPicture && (
                              <img
                                src={post.fullPicture}
                                alt=""
                                className="w-16 h-16 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm line-clamp-2">
                                {post.message || '(Post sem texto)'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(post.createdTime).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            {formData.creative.postId === post.id && (
                              <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum post encontrado nesta página.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Revisão da Campanha</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Plataforma</p>
                    <p className="font-medium">{selectedPlatform?.name || formData.platformId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Objetivo</p>
                    <p className="font-medium">{selectedObjective?.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Orçamento</p>
                    <p className="font-medium">
                      {formData.budgetType === 'daily'
                        ? `R$${formData.dailyBudget?.toFixed(2) || '0'}/dia`
                        : `R$${formData.lifetimeBudget?.toFixed(2) || '0'} total`}
                    </p>
                  </div>
                  {formData.startDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Período</p>
                      <p className="font-medium">
                        {formData.startDate} {formData.endDate ? `até ${formData.endDate}` : '- Sem data de término'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Público</p>
                    <p className="font-medium">
                      {formData.targeting.geoLocations.countries.join(', ')} |{' '}
                      {formData.targeting.ageMin}-{formData.targeting.ageMax} anos
                    </p>
                  </div>
                  {formData.targeting.interests.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Interesses</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.targeting.interests.map((i) => (
                          <Badge key={i.id} variant="outline" className="text-xs">
                            {i.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.creative.pageId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Criativo</p>
                      {creativeMode === 'existing' && formData.creative.postId ? (
                        <p className="font-medium text-sm">Post existente selecionado</p>
                      ) : (
                        <>
                          {imagePreview && (
                            <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded object-cover mt-1" />
                          )}
                          {formData.creative.headline && (
                            <p className="font-medium">{formData.creative.headline}</p>
                          )}
                          {formData.creative.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.creative.message}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                Ao publicar, a campanha será criada com status <strong>PAUSADA</strong> na plataforma.
                Ou salve como rascunho para publicar depois.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/campaigns'))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step > 0 ? 'Voltar' : 'Cancelar'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => draftMutation.mutate()}
              disabled={draftMutation.isPending || createMutation.isPending}
            >
              {draftMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileEdit className="h-4 w-4 mr-2" />
              )}
              Salvar Rascunho
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || draftMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Publicar Agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
