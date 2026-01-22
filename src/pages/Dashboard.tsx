import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load all widgets for better mobile performance
const WelcomeWidget = lazy(() => import('@/components/dashboard/widgets/WelcomeWidget'));
const TrainingProgressWidget = lazy(() => import('@/components/dashboard/widgets/TrainingProgressWidget'));
const ResourcesWidget = lazy(() => import('@/components/dashboard/widgets/ResourcesWidget'));
const NotificationsWidget = lazy(() => import('@/components/dashboard/widgets/NotificationsWidget'));
const TeamContactsWidget = lazy(() => import('@/components/dashboard/widgets/TeamContactsWidget'));
const ReflinksWidget = lazy(() => import('@/components/dashboard/widgets/ReflinksWidget'));
const InfoLinksWidget = lazy(() => import('@/components/dashboard/widgets/InfoLinksWidget'));
const CalendarWidget = lazy(() => import('@/components/dashboard/widgets/CalendarWidget'));
const MyMeetingsWidget = lazy(() => import('@/components/dashboard/widgets/MyMeetingsWidget'));
const DashboardFooterSection = lazy(() => import('@/components/dashboard/widgets/DashboardFooterSection'));
const ActiveOtpCodesWidget = lazy(() => import('@/components/dashboard/widgets/ActiveOtpCodesWidget'));
const ActiveUsersWidget = lazy(() => import('@/components/dashboard/widgets/ActiveUsersWidget'));

// Skeleton fallback for widgets during lazy load
const WidgetSkeleton: React.FC = () => (
  <div className="rounded-lg border bg-card p-6 animate-pulse">
    <div className="h-4 bg-muted rounded w-1/3 mb-4" />
    <div className="h-20 bg-muted rounded" />
  </div>
);

// Full-width skeleton for welcome widget
const WelcomeWidgetSkeleton: React.FC = () => (
  <div className="col-span-full rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 animate-pulse">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-4 bg-muted rounded w-40" />
      </div>
      <div className="h-10 bg-muted rounded w-48" />
    </div>
  </div>
);

// Footer skeleton
const FooterSkeleton: React.FC = () => (
  <div className="mt-8 space-y-6 animate-pulse">
    <div className="h-24 bg-muted rounded" />
    <div className="h-32 bg-muted rounded" />
  </div>
);

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // BEZPIECZEŃSTWO: Przekieruj niezalogowanych na stronę logowania
  if (!loading && !user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return (
    <DashboardLayout title={t('dashboard.menu.dashboard')}>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome with digital clock - Full width */}
        <Suspense fallback={<WelcomeWidgetSkeleton />}>
          <WelcomeWidget />
        </Suspense>

        {/* Three-column grid for remaining widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Column 1: Calendar */}
          <Suspense fallback={<WidgetSkeleton />}>
            <CalendarWidget />
          </Suspense>

          {/* Column 2: My Meetings - obok kalendarza */}
          <Suspense fallback={<WidgetSkeleton />}>
            <MyMeetingsWidget />
          </Suspense>

          {/* Column 3: Training Progress */}
          <Suspense fallback={<WidgetSkeleton />}>
            <TrainingProgressWidget />
          </Suspense>

          {/* Notifications */}
          <Suspense fallback={<WidgetSkeleton />}>
            <NotificationsWidget />
          </Suspense>

          {/* Active OTP Codes for partners */}
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveOtpCodesWidget />
          </Suspense>

          {/* Remaining widgets flow naturally */}
          <Suspense fallback={<WidgetSkeleton />}>
            <ResourcesWidget />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <TeamContactsWidget />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <ReflinksWidget />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <InfoLinksWidget />
          </Suspense>
          
          {/* Active Users Widget - only visible to admins */}
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveUsersWidget />
          </Suspense>
        </div>
      </div>

      {/* Footer Section with quote, team features and contact */}
      <Suspense fallback={<FooterSkeleton />}>
        <DashboardFooterSection />
      </Suspense>
    </DashboardLayout>
  );
};

export default Dashboard;
