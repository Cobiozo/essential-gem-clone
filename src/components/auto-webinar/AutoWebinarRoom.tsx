import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AutoWebinarEmbed } from './AutoWebinarEmbed';
import type { AutoWebinarCategory } from '@/hooks/useAutoWebinar';

interface AutoWebinarRoomProps {
  category: AutoWebinarCategory;
}

export const AutoWebinarRoom: React.FC<AutoWebinarRoomProps> = ({ category }) => {
  return (
    <DashboardLayout>
      <div className="p-4">
        <AutoWebinarEmbed category={category} />
      </div>
    </DashboardLayout>
  );
};

export default AutoWebinarRoom;
