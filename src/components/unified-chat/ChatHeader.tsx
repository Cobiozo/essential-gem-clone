import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnifiedChannel } from '@/hooks/useUnifiedChat';

interface ChatHeaderProps {
  channel: UnifiedChannel;
}

export const ChatHeader = ({ channel }: ChatHeaderProps) => {
  return (
    <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background/80">
      <h3 className="font-semibold text-foreground text-lg">{channel.name}</h3>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
};
