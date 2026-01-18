import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommissionCalculator } from '@/components/calculator';
import { useCalculatorAccess } from '@/hooks/useCalculatorSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CommissionCalculatorPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: accessData, isLoading: accessLoading } = useCalculatorAccess();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!accessLoading && accessData && !accessData.hasAccess) {
      navigate('/dashboard');
    }
  }, [accessData, accessLoading, navigate]);

  if (authLoading || accessLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-80" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!accessData?.hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            {t('calculator.noAccess') || 'Brak dostępu'}
          </h2>
          <p className="text-muted-foreground">
            {t('calculator.noAccessDesc') || 'Nie masz uprawnień do korzystania z kalkulatora.'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <CommissionCalculator />
      </div>
    </DashboardLayout>
  );
}
