import { MessageSquare, X, PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';
import { ChatPanelContent } from './ChatPanelContent';

export const ChatDockedPanel = () => {
  const { isDocked, close, openFloating } = useChatSidebar();

  return (
    <div
      className={cn(
        'h-full border-l border-border bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0',
        isDocked ? 'w-[380px] max-md:fixed max-md:inset-0 max-md:w-full max-md:z-50' : 'w-0 border-l-0'
      )}
    >
      {isDocked && (
        <>
          <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Czat</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openFloating} title="Tryb pływający">
                <PictureInPicture2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ChatPanelContent />
        </>
      )}
    </div>
  );
};
