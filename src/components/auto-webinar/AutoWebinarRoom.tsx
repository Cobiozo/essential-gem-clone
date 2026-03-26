import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AutoWebinarEmbed } from './AutoWebinarEmbed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video } from 'lucide-react';

export const AutoWebinarRoom: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <Tabs defaultValue="business" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="business">Business Opportunity</TabsTrigger>
            <TabsTrigger value="health">Health Conversation</TabsTrigger>
          </TabsList>
          <TabsContent value="business">
            <AutoWebinarEmbed />
          </TabsContent>
          <TabsContent value="health">
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <Video className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Health Conversation</h3>
              <p className="text-muted-foreground max-w-md">
                Ta sekcja jest w przygotowaniu. Wkrótce pojawią się tutaj webinary dotyczące Health Conversation.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AutoWebinarRoom;
