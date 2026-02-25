import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, User, CalendarCheck, CalendarPlus, History } from 'lucide-react';
import { PartnerMeetingBooking } from '@/components/events/PartnerMeetingBooking';
import { UpcomingMeetings } from '@/components/events/UpcomingMeetings';
import { IndividualMeetingsHistory } from '@/components/events/IndividualMeetingsHistory';
import { MeetingSummaryCard } from '@/components/events/MeetingSummaryCard';
import { Navigate, useSearchParams } from 'react-router-dom';

const IndividualMeetingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'book' | 'upcoming' | 'history'>('book');
  const [meetingTypeTab, setMeetingTypeTab] = useState<'tripartite' | 'consultation'>('tripartite');

  const eventId = searchParams.get('event');

  // Redirect if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCloseSummary = () => {
    setSearchParams({});
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Spotkania indywidualne
          </h1>
          <p className="text-muted-foreground mt-1">
            Umów się na spotkanie z doświadczonym partnerem
          </p>
        </div>

        {/* Meeting Summary from notification */}
        {eventId && (
          <div className="mb-6">
            <MeetingSummaryCard eventId={eventId} onClose={handleCloseSummary} />
          </div>
        )}

        {/* Main tabs: Rezerwuj / Zarezerwowane / Historia */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="book" className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Rezerwuj
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Zarezerwowane
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historia
            </TabsTrigger>
          </TabsList>

          {/* Book tab - with meeting type sub-tabs */}
          <TabsContent value="book">
            <Tabs value={meetingTypeTab} onValueChange={(v) => setMeetingTypeTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="tripartite" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Spotkanie trójstronne
                </TabsTrigger>
                <TabsTrigger value="consultation" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Konsultacje dla partnerów
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tripartite">
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-violet-500" />
                      Spotkanie trójstronne
                    </CardTitle>
                    <CardDescription>
                      Spotkanie z liderem i nowym kandydatem na partnera. Idealne dla osób, 
                      które chcą przedstawić biznes swoim kontaktom z wsparciem doświadczonego partnera.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <PartnerMeetingBooking meetingType="tripartite" />
              </TabsContent>

              <TabsContent value="consultation">
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-fuchsia-500" />
                      Konsultacje dla partnerów
                    </CardTitle>
                    <CardDescription>
                      Indywidualne konsultacje z doświadczonym partnerem. Możliwość omówienia 
                      strategii, rozwoju biznesu lub rozwiązania konkretnych problemów.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <PartnerMeetingBooking meetingType="consultation" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Upcoming meetings tab */}
          <TabsContent value="upcoming">
            <UpcomingMeetings />
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history">
            <IndividualMeetingsHistory />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default IndividualMeetingsPage;
