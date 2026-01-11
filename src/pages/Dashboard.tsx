import React from 'react';
import { CalendarDays, Newspaper } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeWidget } from '@/components/dashboard/widgets/WelcomeWidget';
import { QuickStatsWidget } from '@/components/dashboard/widgets/QuickStatsWidget';
import { TrainingProgressWidget } from '@/components/dashboard/widgets/TrainingProgressWidget';
import { ResourcesWidget } from '@/components/dashboard/widgets/ResourcesWidget';
import { NotificationsWidget } from '@/components/dashboard/widgets/NotificationsWidget';
import { TeamContactsWidget } from '@/components/dashboard/widgets/TeamContactsWidget';
import { ReflinksWidget } from '@/components/dashboard/widgets/ReflinksWidget';
import { PlaceholderWidget } from '@/components/dashboard/widgets/PlaceholderWidget';
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

        {/* Reflinks (conditional) */}
        <ReflinksWidget />

        {/* Placeholders */}
        <PlaceholderWidget icon={CalendarDays} titleKey="dashboard.menu.calendar" />
        <PlaceholderWidget icon={Newspaper} titleKey="dashboard.menu.news" />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
