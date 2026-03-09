import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AutoWebinarEmbed } from './AutoWebinarEmbed';

export const AutoWebinarRoom: React.FC = () => {
  return (
    <DashboardLayout>
      <AutoWebinarEmbed />
    </DashboardLayout>
  );
};

export default AutoWebinarRoom;
