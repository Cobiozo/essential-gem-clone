import React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TicketVerificationPanel } from '@/components/ticket-verification/TicketVerificationPanel';
import { useTicketVerifierAccess } from '@/hooks/useTicketVerifierAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, QrCode } from 'lucide-react';

const TicketVerificationPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { canAccess, loading } = useTicketVerifierAccess();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccess) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout title="Weryfikacja biletów">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 sm:p-8 backdrop-blur-sm">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Weryfikacja biletów
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Zeskanuj kod QR aparatem, wpisz kod ręcznie lub odznacz uczestnika z listy.
                Wszystkie akcje check-in i check-out są synchronizowane z panelem Eventy w czasie rzeczywistym.
              </p>
            </div>
          </div>
        </div>

        <TicketVerificationPanel />
      </div>
    </DashboardLayout>
  );
};

export default TicketVerificationPage;
