import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityDashboard } from './security/SecurityDashboard';
import { SecurityLoginHistory } from './security/SecurityLoginHistory';
import { SecurityAlerts } from './security/SecurityAlerts';
import { SecuritySettings } from './security/SecuritySettings';
import { Shield } from 'lucide-react';

export const SecurityModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Moduł Bezpieczeństwa</h2>
          <p className="text-sm text-muted-foreground">
            Monitoruj logowania, zarządzaj MFA i reaguj na anomalie
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">Historia logowań</TabsTrigger>
          <TabsTrigger value="alerts">Alerty</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard />
        </TabsContent>
        <TabsContent value="history">
          <SecurityLoginHistory />
        </TabsContent>
        <TabsContent value="alerts">
          <SecurityAlerts />
        </TabsContent>
        <TabsContent value="settings">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityModule;
