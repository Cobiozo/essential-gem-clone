import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ChatPanelContentLazy = lazy(() =>
  import('./ChatPanelContent').then((m) => ({ default: m.ChatPanelContent }))
);

const ChatPanelFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[120px]">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

export const LazyChatPanelContent = () => (
  <Suspense fallback={<ChatPanelFallback />}>
    <ChatPanelContentLazy />
  </Suspense>
);
