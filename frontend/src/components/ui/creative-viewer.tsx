import {
  Dialog,
  DialogContent,
} from './dialog';
import { X, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';

interface Creative {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  callToAction?: string;
  linkUrl?: string;
  campaignName?: string;
}

interface CreativeViewerProps {
  creative: Creative | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isVideo(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}

export function CreativeViewer({ creative, open, onOpenChange }: CreativeViewerProps) {
  if (!creative) return null;

  const mediaUrl = creative.imageUrl || creative.thumbnailUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Media */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] lg:min-h-[500px] relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            {mediaUrl ? (
              isVideo(mediaUrl) ? (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-full"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={creative.name || 'Criativo'}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              )
            ) : (
              <div className="text-white/50 text-sm">Sem preview disponivel</div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="w-full lg:w-80 p-5 space-y-4 border-t lg:border-t-0 lg:border-l bg-card">
            {creative.campaignName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Campanha</p>
                <Badge variant="outline">{creative.campaignName}</Badge>
              </div>
            )}

            {creative.title && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Titulo</p>
                <p className="font-medium text-sm">{creative.title}</p>
              </div>
            )}

            {creative.body && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Texto</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{creative.body}</p>
              </div>
            )}

            {creative.name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nome do Criativo</p>
                <p className="text-sm">{creative.name}</p>
              </div>
            )}

            {creative.callToAction && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">CTA</p>
                <Badge>{creative.callToAction}</Badge>
              </div>
            )}

            {creative.linkUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Link Destino</p>
                <a
                  href={creative.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {creative.linkUrl.length > 40
                    ? creative.linkUrl.slice(0, 40) + '...'
                    : creative.linkUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
