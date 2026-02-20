import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TreePine, List, Users, UserRound, User } from 'lucide-react';
import { useOrganizationTree } from '@/hooks/useOrganizationTree';
import { OrganizationChart, OrganizationList } from '@/components/team-contacts/organization';

const LeaderOrgTreeView: React.FC = () => {
  const { tree, upline, statistics, settings, loading, error } = useOrganizationTree();
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!tree) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-32 gap-2">
          <TreePine className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Brak danych struktury</p>
        </CardContent>
      </Card>
    );
  }

  const treeSettings = settings || {
    max_depth: 10,
    show_upline: true,
    visible_to_partners: true,
    visible_to_specjalista: false,
    visible_to_clients: false,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{statistics.total > 0 ? statistics.total - 1 : 0}</p>
              <p className="text-xs text-muted-foreground">Wszystkich w strukturze</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <UserRound className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{statistics.partners}</p>
              <p className="text-xs text-muted-foreground">Partnerów</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{statistics.clients}</p>
              <p className="text-xs text-muted-foreground">Klientów</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View mode toggle + chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Twoja struktura
            </CardTitle>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none h-8"
              >
                <List className="h-4 w-4 mr-1" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'graph' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('graph')}
                className="rounded-none h-8"
              >
                <TreePine className="h-4 w-4 mr-1" />
                Graf
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'graph' ? (
            <OrganizationChart
              tree={tree}
              upline={upline}
              settings={treeSettings as any}
              statistics={statistics}
            />
          ) : (
            <OrganizationList
              tree={tree}
              upline={upline}
              settings={treeSettings as any}
              statistics={statistics}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderOrgTreeView;
