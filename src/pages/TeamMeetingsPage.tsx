import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EventCard } from '@/components/events/EventCard';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Users, CalendarX } from 'lucide-react';

const TeamMeetingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { upcomingEvents, pastEvents, loading, refetch } = usePublicEvents('team_training');

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Spotkania zespołu</h1>
            <p className="text-muted-foreground">
              Szkolenia i spotkania zespołowe
            </p>
          </div>
        </div>

        {/* Upcoming Team Meetings */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Nadchodzące spotkania
          </h2>
          
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onRegister={refetch}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Brak zaplanowanych spotkań zespołu
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sprawdź ponownie później
              </p>
            </div>
          )}
        </section>

        {/* Past Team Meetings (optional) */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
              Zakończone spotkania
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
              {pastEvents.slice(0, 6).map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  showRegistration={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamMeetingsPage;
