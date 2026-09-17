import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamContactsTab } from '@/components/team-contacts/TeamContactsTab';

/**
 * R2.0 — kanoniczne miejsce sekcji Kontakty.
 * Renderuje istniejący komponent bez zmiany jego logiki.
 * Legacy: /my-account?tab=team-contacts (nadal działa, przekierowuje tutaj).
 */
const ContactsPage: React.FC = () => (
  <DashboardLayout title="Pure – Kontakty">
    <TeamContactsTab />
  </DashboardLayout>
);

export default ContactsPage;
