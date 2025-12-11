import React from 'react';
import { cn } from '@/lib/utils';

interface ElementPreviewProps {
  type: string;
  className?: string;
}

export const ElementPreview: React.FC<ElementPreviewProps> = ({ type, className }) => {
  const renderPreview = () => {
    switch (type) {
      case 'heading':
        return (
          <div className="space-y-1">
            <div className="h-2.5 bg-foreground/80 rounded w-full" />
            <div className="h-1.5 bg-muted-foreground/40 rounded w-3/4" />
          </div>
        );
      case 'text':
        return (
          <div className="space-y-1">
            <div className="h-1.5 bg-muted-foreground/60 rounded w-full" />
            <div className="h-1.5 bg-muted-foreground/40 rounded w-5/6" />
            <div className="h-1.5 bg-muted-foreground/30 rounded w-4/6" />
          </div>
        );
      case 'image':
        return (
          <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/20 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-muted-foreground/40 rounded" />
          </div>
        );
      case 'video':
        return (
          <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/20 rounded flex items-center justify-center">
            <div className="w-0 h-0 border-l-[6px] border-l-muted-foreground/60 border-y-[4px] border-y-transparent" />
          </div>
        );
      case 'button':
        return (
          <div className="flex justify-center">
            <div className="px-3 py-1 bg-primary/80 rounded text-[6px] text-primary-foreground font-medium">
              Przycisk
            </div>
          </div>
        );
      case 'divider':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="w-full h-0.5 bg-border" />
          </div>
        );
      case 'spacer':
        return (
          <div className="flex items-center justify-center py-1">
            <div className="w-full h-4 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
              <span className="text-[6px] text-muted-foreground">↕</span>
            </div>
          </div>
        );
      case 'container':
      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-1">
            <div className="aspect-square bg-muted rounded" />
            <div className="aspect-square bg-muted rounded" />
            <div className="aspect-square bg-muted rounded" />
            <div className="aspect-square bg-muted rounded" />
          </div>
        );
      case 'carousel':
        return (
          <div className="flex gap-0.5 overflow-hidden">
            <div className="w-8 h-6 bg-muted rounded shrink-0" />
            <div className="w-8 h-6 bg-muted/60 rounded shrink-0" />
            <div className="w-8 h-6 bg-muted/30 rounded shrink-0" />
          </div>
        );
      case 'gallery':
        return (
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded" />
            ))}
          </div>
        );
      case 'accordion':
        return (
          <div className="space-y-0.5">
            <div className="h-3 bg-muted rounded flex items-center justify-between px-1">
              <div className="w-6 h-1 bg-muted-foreground/40 rounded" />
              <div className="w-1.5 h-1.5 border-b border-r border-muted-foreground/40 rotate-45" />
            </div>
            <div className="h-3 bg-muted/60 rounded" />
          </div>
        );
      case 'cards':
        return (
          <div className="flex gap-1">
            <div className="flex-1 bg-muted rounded p-1">
              <div className="h-2 bg-muted-foreground/20 rounded mb-0.5" />
              <div className="h-1 bg-muted-foreground/10 rounded w-2/3" />
            </div>
            <div className="flex-1 bg-muted rounded p-1">
              <div className="h-2 bg-muted-foreground/20 rounded mb-0.5" />
              <div className="h-1 bg-muted-foreground/10 rounded w-2/3" />
            </div>
          </div>
        );
      case 'counter':
        return (
          <div className="flex items-center justify-center">
            <span className="text-lg font-bold text-primary/80">42</span>
          </div>
        );
      case 'progress-bar':
        return (
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div className="h-full w-2/3 bg-primary/60 rounded" />
            </div>
          </div>
        );
      case 'rating':
        return (
          <div className="flex gap-0.5 justify-center">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-sm",
                  i < 4 ? "bg-yellow-400" : "bg-muted"
                )}
              />
            ))}
          </div>
        );
      case 'testimonial':
        return (
          <div className="space-y-1 p-1 bg-muted/50 rounded">
            <div className="text-[8px] text-muted-foreground italic">"..."</div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted rounded-full" />
              <div className="h-1 bg-muted-foreground/30 rounded w-6" />
            </div>
          </div>
        );
      case 'alert':
        return (
          <div className="flex items-center gap-1 p-1 bg-yellow-500/20 border border-yellow-500/30 rounded">
            <div className="w-2 h-2 bg-yellow-500/60 rounded-full" />
            <div className="h-1.5 bg-yellow-600/40 rounded flex-1" />
          </div>
        );
      case 'social-icons':
        return (
          <div className="flex gap-1 justify-center">
            <div className="w-3 h-3 bg-blue-500/60 rounded" />
            <div className="w-3 h-3 bg-pink-500/60 rounded" />
            <div className="w-3 h-3 bg-sky-500/60 rounded" />
          </div>
        );
      case 'maps':
        return (
          <div className="aspect-video bg-gradient-to-br from-green-200/50 to-blue-200/50 rounded flex items-center justify-center">
            <div className="w-2 h-3 bg-red-500/60 rounded-t-full" />
          </div>
        );
      case 'file-download':
        return (
          <div className="flex justify-center">
            <div className="px-3 py-1 bg-primary/20 border border-primary/30 rounded text-[6px] text-primary font-medium flex items-center gap-1">
              <span>↓</span> Pobierz
            </div>
          </div>
        );
      case 'html':
      case 'shortcode':
        return (
          <div className="font-mono text-[8px] text-muted-foreground bg-muted p-1 rounded">
            &lt;/&gt;
          </div>
        );
      case 'icon':
      case 'icon-field':
        return (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-primary/60 rounded-sm" />
            </div>
          </div>
        );
      default:
        return (
          <div className="aspect-square bg-muted rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-muted-foreground/20 rounded" />
          </div>
        );
    }
  };

  return (
    <div className={cn("w-full p-2", className)}>
      {renderPreview()}
    </div>
  );
};
