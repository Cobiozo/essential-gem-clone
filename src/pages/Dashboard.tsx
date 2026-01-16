import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeWidget } from '@/components/dashboard/widgets/WelcomeWidget';
import { TrainingProgressWidget } from '@/components/dashboard/widgets/TrainingProgressWidget';
import { ResourcesWidget } from '@/components/dashboard/widgets/ResourcesWidget';
import { NotificationsWidget } from '@/components/dashboard/widgets/NotificationsWidget';
import { TeamContactsWidget } from '@/components/dashboard/widgets/TeamContactsWidget';
import { ReflinksWidget } from '@/components/dashboard/widgets/ReflinksWidget';
import { InfoLinksWidget } from '@/components/dashboard/widgets/InfoLinksWidget';
import { CalendarWidget } from '@/components/dashboard/widgets/CalendarWidget';
import { MyMeetingsWidget } from '@/components/dashboard/widgets/MyMeetingsWidget';
import { DashboardFooterSection } from '@/components/dashboard/widgets/DashboardFooterSection';
import { ActiveOtpCodesWidget } from '@/components/dashboard/widgets/ActiveOtpCodesWidget';
import { ActiveUsersWidget } from '@/components/dashboard/widgets/ActiveUsersWidget';
import { useLanguage } from '@/contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout title={t('dashboard.menu.dashboard')}>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome with digital clock - Full width */}
        <WelcomeWidget />

        {/* Three-column grid for remaining widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Column 1: Calendar */}
          <CalendarWidget />

          {/* Column 2: My Meetings - obok kalendarza */}
          <MyMeetingsWidget />

          {/* Column 3: Training Progress */}
          <TrainingProgressWidget />

          {/* Notifications */}
          <NotificationsWidget />

          {/* Active OTP Codes for partners */}
          <ActiveOtpCodesWidget />

          {/* Remaining widgets flow naturally */}
          <ResourcesWidget />
          <TeamContactsWidget />
          <ReflinksWidget />
          <InfoLinksWidget />
          
          {/* Active Users Widget - only visible to admins */}
          <ActiveUsersWidget />
        </div>
      </div>

      {/* Footer Section with quote, team features and contact */}
      <DashboardFooterSection />
    </DashboardLayout>
  );
};

export default Dashboard;
