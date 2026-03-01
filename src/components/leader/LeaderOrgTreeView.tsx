import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, TreePine, List, Users, UserRound, User, Shield, Crown, ShieldX } from 'lucide-react';
import { useOrganizationTree } from '@/hooks/useOrganizationTree';
import { useSubTeamLeaders } from '@/hooks/useSubTeamLeaders';
import { useLeaderBlocks } from '@/hooks/useLeaderBlocks';
import { OrganizationChart, OrganizationList } from '@/components/team-contacts/organization';
import LeaderBlockedUsersView from '@/components/leader/LeaderBlockedUsersView';

const LeaderOrgTreeView: React.FC = () => {
  const { tree, upline, treeData, statistics, settings, loading, error } = useOrganizationTree();
  const { isLeader, getSubLeaderInfo, toggleIndependence, loading: subLoading } = useSubTeamLeaders();
  const { blocks, blockUser } = useLeaderBlocks();
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('list');
  const [subView, setSubView] = useState<'structure' | 'blocked'>('structure');

  if (loading || subLoading) {
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

  // Find sub-leaders in tree data (level > 0)
  const subLeadersInTree = treeData
    .filter((m) => m.level > 0 && isLeader(m.id))
    .map((m) => {
      const info = getSubLeaderInfo(m.id);
      return info ? { ...info, memberName: `${m.first_name || ''} ${m.last_name || ''}`.trim() } : null;
    })
    .filter(Boolean) as Array<{
      userId: string;
      teamName: string;
      isIndependent: boolean;
      memberName: string;
    }>;

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

      {/* Sub-leaders panel */}
      {subLeadersInTree.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Liderzy w Twojej strukturze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subLeadersInTree.map((sl) => (
              <div key={sl.userId} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{sl.memberName}</span>
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      {sl.teamName}
                    </Badge>
                    {sl.isIndependent && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Niezależny
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Niezależny:</span>
                  <Switch
                    checked={sl.isIndependent}
                    onCheckedChange={(v) => toggleIndependence(sl.userId, v)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* View mode toggle + chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Twoja struktura
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Sub-view toggle: Struktura / Zablokowani */}
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={subView === 'structure' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSubView('structure')}
                  className="rounded-none h-8"
                >
                  <TreePine className="h-4 w-4 mr-1" />
                  Struktura
                </Button>
                <Button
                  variant={subView === 'blocked' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSubView('blocked')}
                  className="rounded-none h-8"
                >
                  <ShieldX className="h-4 w-4 mr-1" />
                  Zablokowani
                  {blocks.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                      {blocks.length}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* List/Graph toggle — only when viewing structure */}
              {subView === 'structure' && (
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
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subView === 'blocked' ? (
            <div className="p-4">
              <LeaderBlockedUsersView />
            </div>
          ) : viewMode === 'graph' ? (
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
              onBlockUser={(userId, reason) => blockUser.mutate({ userId, reason })}
              blockingInProgress={blockUser.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderOrgTreeView;
