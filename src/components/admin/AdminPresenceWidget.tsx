import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronUp, MapPin, Clock, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { AdminPresence } from '@/hooks/useAdminPresence';

interface AdminPresenceWidgetProps {
  admins: AdminPresence[];
  currentUserPresence?: AdminPresence | null;
  isConnected: boolean;
}

const TAB_LABELS: Record<string, string> = {
  content: 'Zarządzanie treścią',
  users: 'Zarządzanie użytkownikami',
  pages: 'Zarządzanie stronami',
  training: 'Szkolenia',
  reflinks: 'Linki referencyjne',
  knowledge: 'Baza wiedzy',
  certificates: 'Certyfikaty',
  cookies: 'Cookies',
  compass: 'AI Compass',
  signals: 'Sygnały dnia',
  info: 'Ważne informacje',
  translations: 'Tłumaczenia',
  team: 'Kontakty zespołu',
  email: 'Szablony email',
  notifications: 'Powiadomienia'
};

export const AdminPresenceWidget: React.FC<AdminPresenceWidgetProps> = ({
  admins,
  currentUserPresence,
  isConnected
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const totalCount = admins.length + (currentUserPresence ? 1 : 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4 border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Aktywni administratorzy
                <Badge variant="secondary" className="ml-2">
                  {totalCount}
                </Badge>
                {isConnected ? (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Połączono" />
                ) : (
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Łączenie..." />
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-3">
            {/* Current user's activity */}
            {currentUserPresence && (
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Twoja aktywność</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{TAB_LABELS[currentUserPresence.activeTab] || currentUserPresence.activeTab}</span>
                </div>
              </div>
            )}
            
            {/* Other admins */}
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Brak innych aktywnych administratorów
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Inni administratorzy:</p>
                {admins.map((admin) => (
                  <div
                    key={admin.userId}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg transition-colors",
                      admin.isActive ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50"
                    )}
                  >
                    <div className="mt-1">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full block",
                        admin.isActive 
                          ? "bg-green-500 animate-pulse" 
                          : "bg-yellow-500"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {admin.firstName} {admin.lastName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{TAB_LABELS[admin.activeTab] || admin.activeTab}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {admin.isActive 
                            ? 'aktywny teraz' 
                            : formatDistanceToNow(new Date(admin.lastActivity), { 
                                addSuffix: true, 
                                locale: pl 
                              })
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
