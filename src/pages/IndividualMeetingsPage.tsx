import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, User, CalendarCheck } from 'lucide-react';
import { PartnerMeetingBooking } from '@/components/events/PartnerMeetingBooking';
import { Navigate } from 'react-router-dom';

const IndividualMeetingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'tripartite' | 'consultation'>('tripartite');

  // Redirect if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

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

        {/* Tabs for meeting types */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
      </div>
    </DashboardLayout>
  );
};

export default IndividualMeetingsPage;
