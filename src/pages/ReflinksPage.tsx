import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { UserReflinksPanel } from '@/components/user-reflinks';

/**
 * R2.0 — kanoniczne miejsce reflinków użytkownika.
 * Legacy: /my-account?tab=reflinks.
 */
const ReflinksPage: React.FC = () => (
  <DashboardLayout title="Pure – Linki">
    <UserReflinksPanel />
  </DashboardLayout>
);

export default ReflinksPage;
