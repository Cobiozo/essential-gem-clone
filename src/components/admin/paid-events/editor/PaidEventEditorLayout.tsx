import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { EventEditorSidebar } from './EventEditorSidebar';
import { EventEditorPreview } from './EventEditorPreview';

interface PaidEventEditorLayoutProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  onClose: () => void;
}

export const PaidEventEditorLayout: React.FC<PaidEventEditorLayoutProps> = ({
  eventId,
  eventSlug,
  eventTitle,
  onClose,
}) => {
  const [highlightedSection, setHighlightedSection] = React.useState<string | null>(null);
  const [previewKey, setPreviewKey] = React.useState(0);

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-lg truncate max-w-[300px] lg:max-w-[500px]">
              Edytor: {eventTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Edytuj treści i zobacz podgląd na żywo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshPreview}>
            <Eye className="w-4 h-4 mr-2" />
            Odśwież podgląd
          </Button>
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Editor */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
            <div className="h-full overflow-hidden bg-muted/30">
              <EventEditorSidebar
                eventId={eventId}
                onDataChange={refreshPreview}
                onSectionHover={setHighlightedSection}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Preview */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full overflow-hidden bg-background border-l">
              <EventEditorPreview
                key={previewKey}
                eventId={eventId}
                eventSlug={eventSlug}
                highlightedSection={highlightedSection}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
