import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, UserX, Settings } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EventEditorSidebar } from './EventEditorSidebar';
import { EventEditorPreview } from './EventEditorPreview';

interface PaidEventEditorLayoutProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  onClose: () => void;
}

export type EditorPreviewMode = 'admin' | 'guest';

export const PaidEventEditorLayout: React.FC<PaidEventEditorLayoutProps> = ({
  eventId,
  eventSlug,
  eventTitle,
  onClose,
}) => {
  const [highlightedSection, setHighlightedSection] = React.useState<string | null>(null);
  const [previewKey, setPreviewKey] = React.useState(0);
  const [previewMode, setPreviewMode] = React.useState<EditorPreviewMode>('admin');

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
          <div className="hidden sm:block min-w-0">
            <h1 className="font-semibold text-lg truncate max-w-[300px] lg:max-w-[500px]">
              Edytor: {eventTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Edytuj treści i zobacz podgląd na żywo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={previewMode}
            onValueChange={(v) => { if (v) setPreviewMode(v as EditorPreviewMode); }}
            className="border rounded-md"
          >
            <ToggleGroupItem value="admin" aria-label="Widok edytora" className="text-xs gap-1.5 px-2.5">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Widok edytora</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="guest" aria-label="Widok niezalogowanego gościa" className="text-xs gap-1.5 px-2.5">
              <UserX className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Widok gościa</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={refreshPreview}>
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Odśwież podgląd</span>
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
                previewMode={previewMode}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
