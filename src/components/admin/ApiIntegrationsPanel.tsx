import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InboundApiKeys } from './InboundApiKeys';
import { OutboundIntegrations } from './OutboundIntegrations';
import { IntegrationDocsBlock } from './IntegrationDocsBlock';

export const ApiIntegrationsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">API / Integracje</h2>
        <p className="text-sm text-muted-foreground">
          Zarządzaj kluczami dla zewnętrznych aplikacji oraz konfiguracją integracji wychodzących.
        </p>
      </div>

      <Tabs defaultValue="inbound" className="w-full">
        <TabsList>
          <TabsTrigger value="inbound">Klucze API (przychodzące)</TabsTrigger>
          <TabsTrigger value="outbound">Integracje wychodzące</TabsTrigger>
          <TabsTrigger value="docs">Dokumentacja</TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="mt-4">
          <InboundApiKeys />
        </TabsContent>
        <TabsContent value="outbound" className="mt-4">
          <OutboundIntegrations />
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          <IntegrationDocsBlock />
        </TabsContent>
      </Tabs>
    </div>
  );
};
