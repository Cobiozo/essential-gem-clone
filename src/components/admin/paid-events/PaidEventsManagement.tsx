import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Settings, Users, QrCode } from 'lucide-react';
import { PaidEventsList } from './PaidEventsList';
import { PaidEventsSettings } from './PaidEventsSettings';
import { PaidEventsOrders } from './PaidEventsOrders';
import { TicketVerification } from './TicketVerification';

export const PaidEventsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Płatne wydarzenia (Ticket Shop)
        </CardTitle>
        <CardDescription>
          Zarządzaj płatnymi wydarzeniami, biletami i zamówieniami
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              <span className="hidden sm:inline">Wydarzenia</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Zamówienia</span>
            </TabsTrigger>
            <TabsTrigger value="verify" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Weryfikacja</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ustawienia</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <PaidEventsList />
          </TabsContent>

          <TabsContent value="orders">
            <PaidEventsOrders />
          </TabsContent>

          <TabsContent value="verify">
            <TicketVerification />
          </TabsContent>

          <TabsContent value="settings">
            <PaidEventsSettings />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PaidEventsManagement;
