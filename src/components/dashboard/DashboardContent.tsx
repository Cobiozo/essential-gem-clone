import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WelcomeWidget } from './widgets/WelcomeWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { TrainingProgressWidget } from './widgets/TrainingProgressWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { ResourcesWidget } from './widgets/ResourcesWidget';
import { TeamContactsWidget } from './widgets/TeamContactsWidget';
import { AiCompassWidget } from './widgets/AiCompassWidget';
import { ReflinkStatsWidget } from './widgets/ReflinkStatsWidget';
import { CMSContentWidget } from './widgets/CMSContentWidget';

export const DashboardContent: React.FC = () => {
  const { isAdmin, isPartner, isSpecjalista, isClient } = useAuth();
  
  const showTeamContacts = isAdmin || isPartner || isSpecjalista;
  const showAiCompass = isAdmin || isPartner || isSpecjalista;
  const showReflinkStats = isAdmin || isPartner || isSpecjalista;

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Row 1: Welcome + Quick Actions */}
      <div className="col-span-12 lg:col-span-8">
        <WelcomeWidget />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <QuickActionsWidget />
      </div>

      {/* Row 2: Training Progress + Recent Activity */}
      <div className="col-span-12 md:col-span-6">
        <TrainingProgressWidget />
      </div>
      <div className="col-span-12 md:col-span-6">
        <RecentActivityWidget />
      </div>

      {/* Row 3: Resources + Team/AI Compass + Reflinks */}
      <div className="col-span-12 md:col-span-4">
        <ResourcesWidget />
      </div>
      
      {showTeamContacts && (
        <div className="col-span-12 md:col-span-4">
          <TeamContactsWidget />
        </div>
      )}
      
      {showAiCompass && (
        <div className="col-span-12 md:col-span-4">
          <AiCompassWidget />
        </div>
      )}

      {/* Row 4: Reflink Stats (for partners/specjalista) */}
      {showReflinkStats && (
        <div className="col-span-12 md:col-span-6">
          <ReflinkStatsWidget />
        </div>
      )}

      {/* CMS Content - News/Announcements */}
      <div className="col-span-12">
        <CMSContentWidget />
      </div>
    </div>
  );
};
