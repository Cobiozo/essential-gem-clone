import { useState, useMemo } from 'react';
import { MessageSquare, Users, Inbox, Send, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { useRoleChat } from '@/hooks/useRoleChat';
import { PrivateChatWidget } from '@/components/private-chat/PrivateChatWidget';
import { RoleChatWidget } from '@/components/role-chat/RoleChatWidget';
import { RoleChatInbox } from '@/components/role-chat/RoleChatInbox';
import { ROLE_HIERARCHY } from '@/types/roleChat';

export const CommunicationCenter = () => {
  const { userRole, isAdmin } = useAuth();
  const role = userRole?.role?.toLowerCase() || 'client';
  
  // Get unread counts - only enable realtime when this component is mounted
  const { threads } = usePrivateChat({ enableRealtime: false });
  const { channels, unreadCount: roleUnreadCount } = useRoleChat({ enableRealtime: false });
  
  const [activeTab, setActiveTab] = useState('messages');
  
  // Calculate private chat unread count
  const privateUnreadCount = useMemo(() => {
    return threads.filter(t => t.status === 'active' && t.unread_count > 0).length;
  }, [threads]);
  
  // Determine which tabs to show based on role
  const userLevel = ROLE_HIERARCHY[role] || 25;
  
  // "From Leaders" - users who can receive messages from higher roles
  // Everyone except admin can receive from someone
  const showFromLeaders = role !== 'admin';
  
  // "To Team" - users who can send to lower roles
  // Admin, Partner, Specjalista can send to lower roles
  const showToTeam = userLevel >= 50; // specjalista and above
  
  // Count incoming channels for badge
  const incomingChannels = channels.filter(c => c.target_role === role && c.is_active);
  
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-5 w-5 text-primary" />
              Centrum Komunikacji
            </CardTitle>
            <CardDescription className="mt-1">
              Zarządzaj wiadomościami prywatnymi i zespołowymi
            </CardDescription>
          </div>
          {(privateUnreadCount > 0 || roleUnreadCount > 0) && (
            <Badge variant="destructive" className="h-6 px-2">
              <Bell className="h-3 w-3 mr-1" />
              {privateUnreadCount + roleUnreadCount} nowych
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full mb-6" style={{ 
            gridTemplateColumns: `repeat(${1 + (showFromLeaders ? 1 : 0) + (showToTeam ? 1 : 0)}, minmax(0, 1fr))` 
          }}>
            {/* Private Messages - available to everyone */}
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Wiadomości</span>
              <span className="sm:hidden">Czat</span>
              {privateUnreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {privateUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* From Leaders - for receiving messages from higher roles */}
            {showFromLeaders && (
              <TabsTrigger value="from-leaders" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Od przełożonych</span>
                <span className="sm:hidden">Odebrane</span>
                {roleUnreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                    {roleUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            
            {/* To Team - for sending messages to lower roles */}
            {showToTeam && (
              <TabsTrigger value="to-team" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Do zespołu</span>
                <span className="sm:hidden">Wyślij</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Private Messages Content */}
          <TabsContent value="messages" className="mt-0">
            <PrivateChatWidget />
          </TabsContent>
          
          {/* From Leaders Content */}
          {showFromLeaders && (
            <TabsContent value="from-leaders" className="mt-0">
              <RoleChatInbox />
            </TabsContent>
          )}
          
          {/* To Team Content */}
          {showToTeam && (
            <TabsContent value="to-team" className="mt-0">
              <RoleChatWidget />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
