import { MessageSquare, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedChatWidget } from '@/components/unified-chat';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';

export const CommunicationCenter = () => {
  const { userRole } = useAuth();
  const { totalUnread } = useUnifiedChat({ enableRealtime: false });

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
              Zarządzaj wiadomościami wewnętrznymi
            </CardDescription>
          </div>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="h-6 px-2">
              <Bell className="h-3 w-3 mr-1" />
              {totalUnread} nowych
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <UnifiedChatWidget />
      </CardContent>
    </Card>
  );
};
