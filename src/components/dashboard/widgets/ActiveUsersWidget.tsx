import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronUp, Shield, Briefcase, User, UserCheck } from 'lucide-react';
import { useUserPresence, UserPresence } from '@/hooks/useUserPresence';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { WidgetInfoButton } from '../WidgetInfoButton';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Pulpit',
  training: 'Szkolenia',
  'knowledge-center': 'Baza wiedzy',
  admin: 'Panel admina',
  'my-account': 'Moje konto',
  events: 'Wydarzenia',
  unknown: 'Nieznana strona',
};

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Shield className="h-3 w-3" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  partner: { label: 'Partner', icon: <Briefcase className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  specjalista: { label: 'Specjalista', icon: <UserCheck className="h-3 w-3" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  client: { label: 'Klient', icon: <User className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400' },
};

export const ActiveUsersWidget: React.FC = () => {
  const { isAdmin } = useAuth();
  const { users, stats, isConnected } = useUserPresence('dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Only show for admins
  if (!isAdmin) return null;

  const usersByRole = users.reduce((acc, user) => {
    const role = user.role || 'client';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {} as Record<string, UserPresence[]>);

  const formatLastActivity = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pl });
    } catch {
      return 'nieznany czas';
    }
  };

  return (
    <Card className="shadow-sm relative" data-tour="active-users-widget">
      <WidgetInfoButton description="Aktualnie zalogowani użytkownicy w systemie (tylko dla administratorów)" />
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Aktywni użytkownicy
                <Badge variant="secondary" className="ml-1">
                  {stats.total}
                </Badge>
                {isConnected ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                )}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {Object.entries(stats.byRole).map(([role, count]) => {
                const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.client;
                return (
                  <div
                    key={role}
                    className={`flex flex-col items-center p-2 rounded-lg ${roleInfo.color}`}
                  >
                    {roleInfo.icon}
                    <span className="text-lg font-semibold">{count}</span>
                    <span className="text-xs">{roleInfo.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Users list grouped by role */}
            <div className="space-y-2">
              {Object.entries(usersByRole).map(([role, roleUsers]) => {
                const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.client;
                const isExpanded = expandedRole === role;
                
                return (
                  <div key={role} className="border rounded-lg">
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto py-2 px-3"
                      onClick={() => setExpandedRole(isExpanded ? null : role)}
                    >
                      <div className="flex items-center gap-2">
                        {roleInfo.icon}
                        <span className="font-medium">{roleInfo.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {roleUsers.length}
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    
                    {isExpanded && (
                      <div className="px-3 pb-2 space-y-1">
                        {roleUsers.map(u => (
                          <div
                            key={u.userId}
                            className="flex items-center justify-between text-sm py-1 border-t first:border-t-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {u.firstName} {u.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {PAGE_LABELS[u.currentPage] || u.currentPage}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatLastActivity(u.lastActivity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {users.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Brak innych aktywnych użytkowników
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ActiveUsersWidget;
