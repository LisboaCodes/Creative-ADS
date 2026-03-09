import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';
import { formatDate } from '../lib/utils';
import {
  FileText,
  Plus,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import { toast } from 'sonner';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const templateOptions = [
  { value: 'executive', label: 'Executivo', desc: 'Resumo com KPIs e destaques' },
  { value: 'detailed', label: 'Detalhado', desc: 'Todas as campanhas + financeiro' },
  { value: 'financial', label: 'Financeiro', desc: 'Foco em gastos e retorno' },
];

const periodPresets = [
  { label: 'Ultima Semana', days: 7 },
  { label: 'Ultimos 15 dias', days: 15 },
  { label: 'Ultimo Mes', days: 30 },
  { label: 'Ultimos 3 Meses', days: 90 },
];

const statusIcons: Record<string, typeof Clock> = {
  PENDING: Clock,
  GENERATING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
};

const statusColors: Record<string, string> = {
  PENDING: 'secondary',
  GENERATING: 'default',
  COMPLETED: 'success',
  FAILED: 'destructive',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  GENERATING: 'Gerando...',
  COMPLETED: 'Completo',
  FAILED: 'Falhou',
};

export default function Reports() {
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('executive');
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await api.get('/api/reports');
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

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const startDate = startOfDay(subDays(new Date(), selectedPeriod)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      const res = await api.post('/api/reports', {
        title: title || `Relatorio ${templateOptions.find((t) => t.value === template)?.label} - ${new Date().toLocaleDateString('pt-BR')}`,
        template,
        platformId: selectedPlatformId || undefined,
        startDate,
        endDate,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Relatorio gerado com sucesso!');
      setCreateDialog(false);
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao gerar relatorio');
    },
  });

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await api.delete(`/api/reports/${reportId}`);
    },
    onSuccess: () => {
      toast.success('Relatorio apagado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Falha ao apagar relatorio');
    },
  });

  const handleDelete = (reportId: string) => {
    if (window.confirm('Tem certeza que deseja apagar este relatorio?')) {
      deleteMutation.mutate(reportId);
    }
  };

  const handleViewHtml = async (reportId: string) => {
    try {
      const res = await api.get(`/api/reports/${reportId}/html`, { responseType: 'text' });
      const blob = new Blob([res.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Falha ao abrir relatorio');
    }
  };

  const handlePrintPdf = async (reportId: string) => {
    try {
      const res = await api.get(`/api/reports/${reportId}/html`, { responseType: 'text' });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(res.data);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch {
      toast.error('Falha ao gerar PDF');
    }
  };

  const handleDownloadCsv = async (reportId: string) => {
    try {
      const res = await api.get(`/api/reports/${reportId}/csv`, { responseType: 'text' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${reportId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Falha ao baixar CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Relatorios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere relatorios HTML para seus clientes
          </p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Relatorio
        </Button>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Relatorios</CardTitle>
          <CardDescription>
            {reports?.length || 0} relatorios gerados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum relatorio gerado ainda</p>
              <p className="text-sm mt-1">Clique em "Criar Relatorio" para gerar seu primeiro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Titulo</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Template</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report: any) => {
                    const StatusIcon = statusIcons[report.status] || Clock;
                    return (
                      <tr key={report.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{report.title}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">
                            {templateOptions.find((t) => t.value === report.template)?.label || report.template}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={statusColors[report.status] as any}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${report.status === 'GENERATING' ? 'animate-spin' : ''}`} />
                            {statusLabels[report.status] || report.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {formatDate(report.generatedAt || report.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.status === 'COMPLETED' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewHtml(report.id)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  HTML
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintPdf(report.id)}
                                  title="Imprimir / Salvar como PDF"
                                >
                                  <Printer className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadCsv(report.id)}
                                  title="Baixar CSV"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  CSV
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(report.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Relatorio</DialogTitle>
            <DialogDescription>
              Configure e gere um relatorio HTML para seu cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">Titulo (opcional)</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="Ex: Relatorio Mensal - Cliente X"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Template */}
            <div>
              <label className="text-sm font-medium mb-1 block">Template</label>
              <div className="grid grid-cols-3 gap-2">
                {templateOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      template === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setTemplate(opt.value)}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-sm font-medium mb-1 block">Conta/Cliente</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedPlatformId}
                onChange={(e) => setSelectedPlatformId(e.target.value)}
              >
                <option value="">Todas as contas</option>
                {platforms?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="text-sm font-medium mb-1 block">Periodo</label>
              <div className="flex gap-2 flex-wrap">
                {periodPresets.map((preset) => (
                  <Button
                    key={preset.days}
                    variant={selectedPeriod === preset.days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar Relatorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
