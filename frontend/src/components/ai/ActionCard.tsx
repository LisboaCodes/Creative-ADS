import {
  Pause,
  Play,
  DollarSign,
  Check,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ActionCardProps {
  action: {
    id: string;
    type: string;
    status: string;
    campaignId?: string;
    parameters?: any;
    reason?: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading?: boolean;
}

const actionTypeLabels: Record<string, string> = {
  PAUSE_CAMPAIGN: 'Pausar Campanha',
  ACTIVATE_CAMPAIGN: 'Ativar Campanha',
  UPDATE_BUDGET: 'Alterar Orçamento',
};

const actionTypeIcons: Record<string, any> = {
  PAUSE_CAMPAIGN: Pause,
  ACTIVATE_CAMPAIGN: Play,
  UPDATE_BUDGET: DollarSign,
};

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  PENDING: { label: 'Pendente', variant: 'outline', icon: AlertCircle },
  APPROVED: { label: 'Aprovada', variant: 'default', icon: Check },
  EXECUTED: { label: 'Executada', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejeitada', variant: 'secondary', icon: XCircle },
  FAILED: { label: 'Falhou', variant: 'destructive', icon: AlertCircle },
};

export default function ActionCard({
  action,
  onApprove,
  onReject,
  loading,
}: ActionCardProps) {
  const Icon = actionTypeIcons[action.type] || AlertCircle;
  const status = statusConfig[action.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const isPending = action.status === 'PENDING';

  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {actionTypeLabels[action.type] || action.type}
                </span>
                <Badge variant={status.variant} className="text-xs">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              {action.reason && (
                <p className="text-sm text-muted-foreground">{action.reason}</p>
              )}
              {action.parameters &&
                action.type === 'UPDATE_BUDGET' &&
                action.parameters.dailyBudget && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Novo orçamento diário: R${action.parameters.dailyBudget}
                  </p>
                )}
            </div>
          </div>

          {isPending && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="default"
                onClick={() => onApprove(action.id)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(action.id)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
