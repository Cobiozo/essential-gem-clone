import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, UsersRound, Pencil, Loader2, Shield } from 'lucide-react';
import { usePlatformTeams, PlatformTeam, TeamMember, SubTeam } from '@/hooks/usePlatformTeams';

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin': return 'destructive' as const;
    case 'partner': return 'default' as const;
    case 'specjalista': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'partner': return 'Partner';
    case 'specjalista': return 'Specjalista';
    case 'client': return 'Klient';
    default: return role;
  }
};

const MemberRow: React.FC<{ member: TeamMember }> = ({ member }) => (
  <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50">
    <Avatar className="h-7 w-7">
      <AvatarImage src={member.avatar_url || undefined} />
      <AvatarFallback className="text-xs">
        {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium">
        {member.first_name} {member.last_name}
      </span>
      {member.eq_id && (
        <span className="text-xs text-muted-foreground ml-2">EQ: {member.eq_id}</span>
      )}
    </div>
    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
      {getRoleLabel(member.role)}
    </Badge>
  </div>
);

const SubTeamSection: React.FC<{ subTeam: SubTeam }> = ({ subTeam }) => (
  <div className="ml-4 border-l-2 border-primary/20 pl-4 my-2">
    <div className="flex items-center gap-2 mb-2">
      <UsersRound className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm">{subTeam.teamName}</span>
      <span className="text-xs text-muted-foreground">
        ({subTeam.leaderName})
      </span>
      <Badge variant="outline" className="text-xs">
        {subTeam.memberCount} os.
      </Badge>
    </div>
    <Accordion type="single" collapsible>
      <AccordionItem value="sub-members" className="border-none">
        <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
          Pokaż członków
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-0.5">
            {subTeam.members.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const TeamCard: React.FC<{
  team: PlatformTeam;
  onEditName: (team: PlatformTeam) => void;
  onToggleIndependence: (leaderUserId: string, value: boolean) => void;
}> = ({ team, onEditName, onToggleIndependence }) => (
  <AccordionItem value={team.leaderUserId}>
    <AccordionTrigger className="hover:no-underline px-4">
      <div className="flex items-center gap-3 flex-1 text-left">
        <Avatar className="h-9 w-9">
          <AvatarImage src={team.leaderAvatarUrl || undefined} />
          <AvatarFallback>
            {(team.leaderFirstName?.[0] || '') + (team.leaderLastName?.[0] || '')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{team.teamName}</span>
            {team.isIndependent && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Niezależny
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Lider: {team.leaderFirstName} {team.leaderLastName}
            {team.leaderEqId && ` (EQ: ${team.leaderEqId})`}
          </div>
        </div>
        <Badge variant="outline" className="ml-auto mr-2">
          {team.totalMemberCount} os.
        </Badge>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 pb-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => onEditName(team)}>
          <Pencil className="h-3 w-3 mr-1" />
          Edytuj nazwę
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Niezależny:</span>
          <Switch
            checked={team.isIndependent}
            onCheckedChange={(v) => onToggleIndependence(team.leaderUserId, v)}
          />
        </div>
      </div>

      {team.directMembers.length > 0 && (
        <>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Członkowie bezpośredni ({team.directMembers.length})
          </h4>
          <div className="space-y-0.5 mb-3">
            {team.directMembers.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
        </>
      )}

      {team.subTeams.length > 0 && (
        <>
          <Separator className="my-3" />
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Podzespoły ({team.subTeams.length})
          </h4>
          {team.subTeams.map((st) => (
            <SubTeamSection key={st.leaderUserId} subTeam={st} />
          ))}
        </>
      )}

      {team.directMembers.length === 0 && team.subTeams.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Brak członków w tym zespole
        </p>
      )}
    </AccordionContent>
  </AccordionItem>
);

export const PlatformTeamsManagement: React.FC = () => {
  const { teams, loading, updateTeamName, toggleIndependence } = usePlatformTeams();
  const [editingTeam, setEditingTeam] = useState<PlatformTeam | null>(null);
  const [editName, setEditName] = useState('');

  const totalMembers = teams.reduce((sum, t) => sum + t.totalMemberCount, 0);
  const avgMembers = teams.length > 0 ? Math.round(totalMembers / teams.length) : 0;

  const handleSaveName = async () => {
    if (!editingTeam) return;
    await updateTeamName(editingTeam.leaderUserId, editName.trim() || null);
    setEditingTeam(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Zespoły platformy PureLifeCenter</h2>
        <p className="text-muted-foreground">
          Zespoły tworzone automatycznie na podstawie hierarchii organizacji
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zespoły</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{teams.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Łączna liczba członków
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalMembers}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Średnio na zespół
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{avgMembers}</span>
          </CardContent>
        </Card>
      </div>

      {/* Teams list */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak zespołów. Dodaj liderów w Panelu Lidera, aby zespoły zostały utworzone automatycznie.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Accordion type="multiple">
            {teams.map((team) => (
              <TeamCard
                key={team.leaderUserId}
                team={team}
                onEditName={(t) => {
                  setEditingTeam(t);
                  setEditName(t.customName || '');
                }}
                onToggleIndependence={toggleIndependence}
              />
            ))}
          </Accordion>
        </Card>
      )}

      {/* Edit name dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj nazwę zespołu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Lider: {editingTeam?.leaderFirstName} {editingTeam?.leaderLastName}
              </p>
              <Input
                placeholder={`Zespół-${(editingTeam?.leaderFirstName?.[0] || '?')}.${(editingTeam?.leaderLastName?.[0] || '?')}.`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Zostaw puste, aby użyć domyślnej nazwy
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTeam(null)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveName}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformTeamsManagement;
