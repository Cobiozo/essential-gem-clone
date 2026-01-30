import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, FileText, Ticket, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventMainSettingsPanel } from './EventMainSettingsPanel';
import { EventSectionsPanel } from './EventSectionsPanel';
import { EventTicketsPanel } from './EventTicketsPanel';
import { EventSpeakersPanel } from './EventSpeakersPanel';

interface EventEditorSidebarProps {
  eventId: string;
  onDataChange: () => void;
  onSectionHover?: (sectionId: string | null) => void;
}

export const EventEditorSidebar: React.FC<EventEditorSidebarProps> = ({
  eventId,
  onDataChange,
  onSectionHover,
}) => {
  const [activeTab, setActiveTab] = useState('main');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b bg-background/80 backdrop-blur-sm shrink-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="main" className="text-xs sm:text-sm">
              <Settings className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Główne</span>
            </TabsTrigger>
            <TabsTrigger value="sections" className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Sekcje</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs sm:text-sm">
              <Ticket className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Bilety</span>
            </TabsTrigger>
            <TabsTrigger value="speakers" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Prelegenci</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="main" className="m-0">
              <EventMainSettingsPanel eventId={eventId} onDataChange={onDataChange} />
            </TabsContent>

            <TabsContent value="sections" className="m-0">
              <EventSectionsPanel 
                eventId={eventId} 
                onDataChange={onDataChange}
                onSectionHover={onSectionHover}
              />
            </TabsContent>

            <TabsContent value="tickets" className="m-0">
              <EventTicketsPanel eventId={eventId} onDataChange={onDataChange} />
            </TabsContent>

            <TabsContent value="speakers" className="m-0">
              <EventSpeakersPanel eventId={eventId} onDataChange={onDataChange} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Footer hint */}
      <div className="p-3 border-t bg-muted/50 text-xs text-muted-foreground text-center shrink-0">
        Podgląd na żywo — Zmiany zapisują się automatycznie
      </div>
    </div>
  );
};
