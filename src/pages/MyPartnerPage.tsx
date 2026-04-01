import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { usePartnerPageAccess } from '@/hooks/usePartnerPageAccess';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

const PartnerPageEditor = React.lazy(() => import('@/components/partner-page/PartnerPageEditor'));

const MyPartnerPage = () => {
  const { hasAccess, loading } = usePartnerPageAccess();

  if (loading) {
    return (
      <DashboardLayout backTo={{ label: 'Strona główna', path: '/dashboard' }}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout backTo={{ label: 'Strona główna', path: '/dashboard' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
          <PartnerPageEditor />
        </Suspense>
      </div>
    </DashboardLayout>
  );
};

export default MyPartnerPage;
