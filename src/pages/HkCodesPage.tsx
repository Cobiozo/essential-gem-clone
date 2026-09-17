import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import MyHkCodesHistory from '@/components/healthy-knowledge/MyHkCodesHistory';

/**
 * R2.0 — kanoniczne miejsce historii kodów Zdrowej Wiedzy.
 * Legacy: /my-account?tab=hk-codes.
 */
const HkCodesPage: React.FC = () => (
  <DashboardLayout title="Kody HK">
    <MyHkCodesHistory />
  </DashboardLayout>
);

export default HkCodesPage;
