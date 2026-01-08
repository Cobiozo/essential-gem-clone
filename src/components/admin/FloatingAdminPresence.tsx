import { useState } from 'react';
import { Users, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPresenceWidget } from './AdminPresenceWidget';
import type { AdminPresence } from '@/hooks/useAdminPresence';
import { cn } from '@/lib/utils';

interface FloatingAdminPresenceProps {
  admins: AdminPresence[];
  currentUserPresence?: AdminPresence | null;
  isConnected: boolean;
}

export const FloatingAdminPresence = ({
  admins,
  currentUserPresence,
  isConnected,
}: FloatingAdminPresenceProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const totalCount = admins.length + (currentUserPresence ? 1 : 0);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="gap-2 shadow-lg"
        >
          <Users className="h-4 w-4" />
          <span className="font-medium">{totalCount}</span>
          <Maximize2 className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 animate-in slide-in-from-bottom-2 duration-200">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 shadow-sm z-10"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
        <AdminPresenceWidget
          admins={admins}
          currentUserPresence={currentUserPresence}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};
