import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../lib/utils';
import {
  Pause,
  Play,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Skeleton } from '../components/ui/skeleton';

export default function Campaigns() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', page, searchTerm, platformFilter, statusFilter],
    queryFn: async () => {
      const response = await api.get('/api/campaigns', {
        params: {
          page,
          limit: 20,
          search: searchTerm || undefined,
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      return response.data.data;
    },
  });

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await api.patch(`/api/campaigns/${campaignId}/status`, { status: newStatus });
      toast.success(`Campaign ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update campaign');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your advertising campaigns
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="FACEBOOK">Facebook</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="GOOGLE">Google Ads</SelectItem>
            <SelectItem value="TIKTOK">TikTok</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns Table */}
      {data?.campaigns && data.campaigns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
            <CardDescription>
              {data.pagination?.total || data.campaigns.length} campaigns found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Platform
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Budget
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Spend
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      Clicks
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      CTR
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      ROAS
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((campaign: any) => {
                    const latestMetrics = campaign.metrics[0];
                    return (
                      <tr
                        key={campaign.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{campaign.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {campaign.platformCampaignId?.slice(0, 12)}...
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline">{campaign.platformType}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={campaign.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right font-medium">
                          {latestMetrics ? formatCurrency(latestMetrics.spend) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {latestMetrics ? formatNumber(Number(latestMetrics.clicks)) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {latestMetrics ? formatPercentage(latestMetrics.ctr) : '-'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {latestMetrics?.roas ? (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              {latestMetrics.roas}x
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant={campaign.status === 'ACTIVE' ? 'outline' : 'default'}
                              onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                            >
                              {campaign.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Budget
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  View Analytics
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {data.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || platformFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Connect a platform to see your campaigns'}
            </p>
            {searchTerm || platformFilter !== 'all' || statusFilter !== 'all' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setPlatformFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
