import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AiCompassWidget } from '@/components/ai-compass/AiCompassWidget';

/**
 * R2.0 — kanoniczne miejsce narzędzia AI Kompas.
 * Legacy: /my-account?tab=ai-compass.
 */
const AiCompassPage: React.FC = () => (
  <DashboardLayout title="AI Kompas">
    <AiCompassWidget />
  </DashboardLayout>
);

export default AiCompassPage;
