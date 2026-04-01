import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EventCardCompact } from '@/components/events/EventCardCompact';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import { useAutoWebinarConfig } from '@/hooks/useAutoWebinar';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AutoWebinarEventView } from '@/components/auto-webinar/AutoWebinarEventView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Video, CalendarX, Radio } from 'lucide-react';

const checkAccess = (cfg: any, role: string | undefined) => {
  if (!cfg?.is_enabled) return false;
  if (role === 'admin') return true;
  if (role === 'partner' && cfg.visible_to_partners) return true;
  if (role === 'specjalista' && cfg.visible_to_specjalista) return true;
  if ((role === 'client' || role === 'user') && cfg.visible_to_clients) return true;
  return false;
};

const WebinarsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightedEventId = searchParams.get('event');
  const { upcomingEvents, pastEvents, loading, refetch } = usePublicEvents('webinar');
  const { config: boConfig, loading: boLoading } = useAutoWebinarConfig('business_opportunity');
  const { config: hcConfig, loading: hcLoading } = useAutoWebinarConfig('health_conversation');
  const { userRole } = useAuth();

  const role = userRole?.role;
  const hasBoAccess = !boLoading && checkAccess(boConfig, role);
  const hasHcAccess = !hcLoading && checkAccess(hcConfig, role);
  const showTabs = hasBoAccess || hasHcAccess;

  if (loading) {
    return (
      <DashboardLayout backTo={{ label: "Strona główna", path: "/dashboard" }}>
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
    <DashboardLayout backTo={{ label: "Strona główna", path: "/dashboard" }}>
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

        {showTabs ? (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5">
                <Video className="h-4 w-4" />
                Webinary
              </TabsTrigger>
              {hasBoAccess && (
                <TabsTrigger value="bo" className="gap-1.5">
                  <Radio className="h-4 w-4" />
                  Business Opportunity
                </TabsTrigger>
              )}
              {hasHcAccess && (
                <TabsTrigger value="hc" className="gap-1.5">
                  <Radio className="h-4 w-4" />
                  Health Conversation
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="list">{webinarListContent}</TabsContent>
            {hasBoAccess && (
              <TabsContent value="bo">
                <AutoWebinarEventView category="business_opportunity" />
              </TabsContent>
            )}
            {hasHcAccess && (
              <TabsContent value="hc">
                <AutoWebinarEventView category="health_conversation" />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          webinarListContent
        )}
      </div>
    </DashboardLayout>
  );
};

export default WebinarsPage;
