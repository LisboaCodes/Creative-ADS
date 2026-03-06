import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  Stethoscope,
  Loader2,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function Diagnostics() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'briefing'>('diagnosis');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(searchParams.get('campaignId') || '');
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [diagnosisResult, setDiagnosisResult] = useState<string>('');
  const [briefingResult, setBriefingResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  // Fetch platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await api.get('/api/platforms');
      return res.data.data;
    },
  });

  // Fetch unread notifications (for alerts section)
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/notifications');
      return res.data.data;
    },
  });

  const campaigns = campaignsData?.campaigns || [];
  const alertNotifs = (notifData?.notifications || []).filter(
    (n: any) => (n.type === 'WARNING' || n.type === 'ERROR') && !n.isRead
  );

  // Diagnosis mutation
  const diagnosisMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post('/api/ai/chat', { message });
      return res.data.data;
    },
    onSuccess: (data) => {
      setDiagnosisResult(data.message.content);
      if (resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao gerar diagnostico');
    },
  });

  // Briefing mutation
  const briefingMutation = useMutation({
    mutationFn: async (params: { platformId: string; startDate: string; endDate: string }) => {
      const res = await api.post('/api/ai/briefing', params);
      return res.data.data;
    },
    onSuccess: (data) => {
      setBriefingResult(data.content);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao gerar briefing');
    },
  });

  // Auto-trigger diagnosis if URL has campaignId
  useEffect(() => {
    const campaignId = searchParams.get('campaignId');
    const alert = searchParams.get('alert');
    if (campaignId && !autoTriggered && campaigns.length > 0) {
      setSelectedCampaignId(campaignId);
      setAutoTriggered(true);
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      const campaignName = campaign?.name || campaignId;
      const msg = alert
        ? `Faca um diagnostico completo da campanha "${campaignName}" (ID: ${campaignId}). Alerta detectado: ${alert}. Analise os dados, identifique problemas e sugira solucoes concretas.`
        : `Faca um diagnostico completo da campanha "${campaignName}" (ID: ${campaignId}). Analise desempenho, criativos, publico e sugira otimizacoes.`;
      diagnosisMutation.mutate(msg);
    }
  }, [searchParams, campaigns, autoTriggered]);

  const handleDiagnosis = () => {
    if (!selectedCampaignId) {
      toast.error('Selecione uma campanha');
      return;
    }
    const campaign = campaigns.find((c: any) => c.id === selectedCampaignId);
    const msg = `Faca um diagnostico completo da campanha "${campaign?.name || selectedCampaignId}" (ID: ${selectedCampaignId}). Analise metricas dos ultimos 30 dias, criativos, tendencias. Identifique pontos fortes, fracos e de recomendacoes concretas com justificativa baseada nos dados.`;
    diagnosisMutation.mutate(msg);
  };

  const handleAlertDiagnosis = (notif: any) => {
    const campaignId = notif.metadata?.campaignId;
    if (campaignId) {
      setSelectedCampaignId(campaignId);
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      const msg = `Faca um diagnostico completo da campanha "${campaign?.name || campaignId}" (ID: ${campaignId}). Alerta: "${notif.title}" - ${notif.message}. Analise os dados e sugira solucoes concretas.`;
      diagnosisMutation.mutate(msg);
    }
  };

  const handleBriefing = () => {
    if (!selectedPlatformId) {
      toast.error('Selecione uma conta');
      return;
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    briefingMutation.mutate({
      platformId: selectedPlatformId,
      startDate: thirtyDaysAgo.toISOString(),
      endDate: now.toISOString(),
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para o clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Stethoscope className="h-6 w-6" />
          Diagnosticos IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analise automatica de campanhas e briefings para clientes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'diagnosis' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('diagnosis')}
        >
          <Stethoscope className="h-4 w-4 mr-2" />
          Diagnostico
        </Button>
        <Button
          variant={activeTab === 'briefing' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('briefing')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Briefing para Cliente
        </Button>
      </div>

      {activeTab === 'diagnosis' && (
        <>
          {/* Diagnosis Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Gerar Diagnostico</CardTitle>
              <CardDescription>
                Selecione uma campanha para receber uma analise completa da IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background flex-1"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">Selecione uma campanha...</option>
                  {campaigns.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}) - {c.platformType}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleDiagnosis}
                  disabled={diagnosisMutation.isPending || !selectedCampaignId}
                >
                  {diagnosisMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar Diagnostico
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {alertNotifs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Alertas Ativos
                </CardTitle>
                <CardDescription>
                  {alertNotifs.length} alertas nao lidos - clique para diagnosticar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertNotifs.slice(0, 10).map((notif: any) => (
                    <div
                      key={notif.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {notif.type === 'ERROR' ? (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                        </div>
                      </div>
                      {notif.metadata?.campaignId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlertDiagnosis(notif)}
                          disabled={diagnosisMutation.isPending}
                        >
                          Diagnosticar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis Result */}
          {(diagnosisMutation.isPending || diagnosisResult) && (
            <Card ref={resultRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Resultado do Diagnostico</CardTitle>
                  {diagnosisResult && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(diagnosisResult)}
                    >
                      {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {diagnosisMutation.isPending ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Analisando campanha com IA...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {diagnosisResult}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'briefing' && (
        <>
          {/* Briefing Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Gerar Briefing para Cliente</CardTitle>
              <CardDescription>
                Crie um resumo completo para apresentar ao seu cliente com sugestoes de fala
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background flex-1"
                  value={selectedPlatformId}
                  onChange={(e) => setSelectedPlatformId(e.target.value)}
                >
                  <option value="">Selecione uma conta...</option>
                  {platforms?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
                <Button
                  onClick={handleBriefing}
                  disabled={briefingMutation.isPending || !selectedPlatformId}
                >
                  {briefingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Gerar Briefing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Briefing Result */}
          {(briefingMutation.isPending || briefingResult) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Briefing do Cliente</CardTitle>
                  {briefingResult && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(briefingResult)}
                      >
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {briefingMutation.isPending ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Gerando briefing com IA...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {briefingResult}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
