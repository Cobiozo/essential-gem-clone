import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeWidget } from '@/components/dashboard/widgets/WelcomeWidget';
import { QuickStatsWidget } from '@/components/dashboard/widgets/QuickStatsWidget';
import { TrainingProgressWidget } from '@/components/dashboard/widgets/TrainingProgressWidget';
import { ResourcesWidget } from '@/components/dashboard/widgets/ResourcesWidget';
import { NotificationsWidget } from '@/components/dashboard/widgets/NotificationsWidget';
import { TeamContactsWidget } from '@/components/dashboard/widgets/TeamContactsWidget';
import { ReflinksWidget } from '@/components/dashboard/widgets/ReflinksWidget';
import { InfoLinksWidget } from '@/components/dashboard/widgets/InfoLinksWidget';
import { SocialMediaWidget } from '@/components/dashboard/widgets/SocialMediaWidget';
import { CalendarWidget } from '@/components/dashboard/widgets/CalendarWidget';
import { MyMeetingsWidget } from '@/components/dashboard/widgets/MyMeetingsWidget';
import { DashboardFooterSection } from '@/components/dashboard/widgets/DashboardFooterSection';
import { useLanguage } from '@/contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout title={t('dashboard.menu.dashboard')}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Welcome - Full width */}
        <WelcomeWidget />

        {/* Quick Stats */}
        <QuickStatsWidget />

        {/* Training Progress */}
        <TrainingProgressWidget />

        {/* Notifications */}
        <NotificationsWidget />

        {/* Resources */}
        <ResourcesWidget />

        {/* Team Contacts (conditional) */}
        <TeamContactsWidget />

        {/* PureLinki (conditional) */}
        <ReflinksWidget />

        {/* InfoLinki (conditional) */}
        <InfoLinksWidget />

        {/* Social Media & Community */}
        <SocialMediaWidget />

        {/* Calendar Widget */}
        <CalendarWidget />

        {/* My Meetings Widget */}
        <MyMeetingsWidget />
      </div>

      {/* Footer Section with quote, team features and contact */}
      <DashboardFooterSection />
    </DashboardLayout>
  );
};

export default Dashboard;
