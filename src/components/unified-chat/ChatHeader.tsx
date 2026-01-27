import { Users, User, UserCheck, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedChannel } from '@/hooks/useUnifiedChat';

interface ChatHeaderProps {
  channel: UnifiedChannel;
}

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  User,
  UserCheck,
  Shield,
};

export const ChatHeader = ({ channel }: ChatHeaderProps) => {
  const IconComponent = IconMap[channel.icon] || Users;

  return (
    <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center',
            'bg-primary/10'
          )}
        >
          <IconComponent className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{channel.name}</h3>
          <p className="text-xs text-muted-foreground">
            {channel.canSend 
              ? 'Wiadomości do tej grupy' 
              : 'Wiadomości od tej grupy'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
