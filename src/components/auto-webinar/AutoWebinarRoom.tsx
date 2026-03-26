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
            <AutoWebinarEmbed category="business_opportunity" />
          </TabsContent>
          <TabsContent value="health">
            <AutoWebinarEmbed category="health_conversation" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AutoWebinarRoom;
