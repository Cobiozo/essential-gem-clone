import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EventCardCompact } from '@/components/events/EventCardCompact';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import { useAutoWebinarConfig } from '@/hooks/useAutoWebinar';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AutoWebinarEmbed } from '@/components/auto-webinar/AutoWebinarEmbed';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Video, CalendarX, Radio } from 'lucide-react';

const WebinarsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightedEventId = searchParams.get('event');
  const { upcomingEvents, pastEvents, loading, refetch } = usePublicEvents('webinar');
  const { config, loading: configLoading } = useAutoWebinarConfig();
  const { userRole } = useAuth();

  // Check if current user role has access to auto-webinar tab
  const role = userRole?.role;
  const hasAutoAccess = (() => {
    if (!config?.is_enabled) return false;
    if (role === 'admin') return true;
    if (role === 'partner' && config.visible_to_partners) return true;
    if (role === 'specjalista' && config.visible_to_specjalista) return true;
    if ((role === 'client' || role === 'user') && config.visible_to_clients) return true;
    return false;
  })();

  const showAutoTab = !configLoading && hasAutoAccess;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const webinarListContent = (
    <div className="space-y-6">
      {/* Upcoming Webinars */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Nadchodzące webinary
        </h2>
        
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <EventCardCompact 
                key={event.id} 
                event={event} 
                onRegister={refetch}
                defaultOpen={event.id === highlightedEventId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Brak zaplanowanych webinarów</p>
            <p className="text-sm text-muted-foreground mt-1">Sprawdź ponownie później</p>
          </div>
        )}
      </section>

      {/* Past Webinars */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
            Zakończone webinary
          </h2>
          <div className="space-y-2 opacity-70">
            {pastEvents.slice(0, 6).map((event) => (
              <EventCardCompact 
                key={event.id} 
                event={event} 
                showRegistration={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Webinary</h1>
            <p className="text-muted-foreground">Zaplanowane wydarzenia online</p>
          </div>
        </div>

        {showAutoTab ? (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5">
                <Video className="h-4 w-4" />
                Webinary
              </TabsTrigger>
              <TabsTrigger value="auto" className="gap-1.5">
                <Radio className="h-4 w-4" />
                {config?.room_title || 'Webinary Biznesowe 24h/live'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list">{webinarListContent}</TabsContent>
            <TabsContent value="auto">
              <AutoWebinarEmbed />
            </TabsContent>
          </Tabs>
        ) : (
          webinarListContent
        )}
      </div>
    </DashboardLayout>
  );
};

export default WebinarsPage;
