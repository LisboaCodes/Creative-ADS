import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  Facebook,
  Instagram,
  Chrome,
  Linkedin,
  Twitter,
  RefreshCw,
  Unplug,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
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
import { useState } from 'react';

const platformIcons: Record<string, any> = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  GOOGLE_ADS: Chrome,
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
};

const platformColors: Record<string, { bg: string; text: string; icon: string }> = {
  FACEBOOK: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
  INSTAGRAM: { bg: 'bg-pink-100', text: 'text-pink-600', icon: 'text-pink-600' },
  GOOGLE_ADS: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' },
  TIKTOK: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'text-gray-600' },
  LINKEDIN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-700' },
  TWITTER: { bg: 'bg-sky-100', text: 'text-sky-600', icon: 'text-sky-600' },
};

export default function Platforms() {
  const [disconnectDialog, setDisconnectDialog] = useState<string | null>(null);

  const { data: platforms, isLoading, refetch } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await api.get('/api/platforms');
      return response.data.data;
    },
  });

  const handleConnect = async (platformType: string) => {
    try {
      const response = await api.get(`/api/platforms/${platformType.toLowerCase()}/connect`);
      const { authUrl } = response.data.data;
      window.location.href = authUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to initiate OAuth');
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      await api.delete(`/api/platforms/${platformId}`);
      toast.success('Platform disconnected successfully');
      refetch();
      setDisconnectDialog(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disconnect platform');
    }
  };

  const handleSync = async (platformId: string) => {
    try {
      await api.post(`/api/platforms/${platformId}/sync`);
      toast.success('Sync started successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sync platform');
    }
  };

  const availablePlatforms = [
    { type: 'FACEBOOK', name: 'Facebook Ads', description: 'Connect Facebook Ads Manager to sync campaigns' },
    { type: 'INSTAGRAM', name: 'Instagram Ads', description: 'Manage Instagram advertising campaigns' },
    { type: 'GOOGLE_ADS', name: 'Google Ads', description: 'Search, Display, and Video campaigns' },
    { type: 'TIKTOK', name: 'TikTok Ads', description: 'Connect TikTok Ads Manager' },
    { type: 'LINKEDIN', name: 'LinkedIn Ads', description: 'B2B advertising platform' },
    { type: 'TWITTER', name: 'Twitter/X Ads', description: 'Promoted tweets and campaigns' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-lg mb-2" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platforms</h1>
        <p className="text-muted-foreground">
          Connect and manage your advertising platforms
        </p>
      </div>

      {/* Connected Platforms */}
      {platforms && platforms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Connected Platforms</h2>
            <Badge variant="outline">{platforms.length} connected</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform: any) => {
              const Icon = platformIcons[platform.type] || Facebook;
              const colors = platformColors[platform.type] || platformColors.FACEBOOK;

              return (
                <Card key={platform.id} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${colors.bg} rounded-lg p-3`}>
                          <Icon className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platform.type}</CardTitle>
                          <CardDescription className="text-xs">
                            {platform.name}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={platform.isConnected ? 'success' : 'secondary'}>
                        {platform.isConnected ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {platform.isConnected ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Last sync:{' '}
                        {platform.lastSyncAt
                          ? new Date(platform.lastSyncAt).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleSync(platform.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDisconnectDialog(platform.id)}
                    >
                      <Unplug className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available Platforms</h2>
          <Badge variant="outline">
            <Sparkles className="h-3 w-3 mr-1" />
            {availablePlatforms.length} platforms
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlatforms.map((platform) => {
            const Icon = platformIcons[platform.type] || Facebook;
            const colors = platformColors[platform.type] || platformColors.FACEBOOK;
            const isConnected = platforms?.some(
              (p: any) => p.type === platform.type && p.isConnected
            );
            const comingSoon = !['FACEBOOK', 'INSTAGRAM'].includes(platform.type);

            return (
              <Card
                key={platform.type}
                className={isConnected ? 'border-green-200 bg-green-50/50' : ''}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`${colors.bg} rounded-lg p-3`}>
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        {comingSoon && (
                          <Badge variant="secondary" className="text-xs">
                            Soon
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardFooter>
                  <Button
                    onClick={() => !isConnected && !comingSoon && handleConnect(platform.type)}
                    disabled={isConnected || comingSoon}
                    variant={isConnected ? 'secondary' : 'default'}
                    className="w-full"
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Connected
                      </>
                    ) : comingSoon ? (
                      'Coming Soon'
                    ) : (
                      'Connect Now'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disconnect Dialog */}
      <Dialog open={!!disconnectDialog} onOpenChange={() => setDisconnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Platform</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this platform? Your campaigns will no longer be
              synced and you won't be able to manage them from this dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectDialog && handleDisconnect(disconnectDialog)}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
