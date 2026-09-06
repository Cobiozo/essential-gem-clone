import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModeratorAccess } from '@/hooks/useModeratorAccess';
import { AdminPasswordGate, isAdminGateUnlocked, lockAdminGate } from '@/components/admin/AdminPasswordGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';

/**
 * Etap 2 — AdminShell.
 *
 * Ten plik jest wyłącznie cienką warstwą orkiestracji trasy /admin:
 *  - bramka autoryzacji (auth + role) i przekierowania,
 *  - bramka hasła administratora,
 *  - ErrorBoundary + Suspense,
 *  - minimalny layout ekranu ładowania.
 *
 * Cała logika modułów administracyjnych (CMS, użytkownicy, ustawienia, strony,
 * sidebar, presence) żyje w lazy-ładowanym `AdminWorkspace`, więc nie trafia do
 * critical path aplikacji ani do chunku trasy przed przejściem bramek.
 */
const AdminWorkspace = lazy(() => import('@/components/admin/workspace/AdminWorkspace'));

const AdminLoadingScreen: React.FC<{ label?: string }> = ({ label = 'Ładowanie…' }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <img src={newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  </div>
);

const Admin = () => {
  useSecurityPreventions();

  const { user, isAdmin, loading: authLoading, rolesReady } = useAuth();
  const { hasAnyAdminAccess, loading: modLoading } = useModeratorAccess();
  const navigate = useNavigate();
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(() => isAdminGateUnlocked());

  useEffect(() => {
    if (authLoading || !rolesReady) return;

    if (!user) {
      lockAdminGate();
      setGateUnlocked(false);
      navigate('/auth');
      return;
    }

    if (!isAdmin) {
      if (modLoading) return;
      if (!hasAnyAdminAccess) {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, rolesReady, isAdmin, modLoading, hasAnyAdminAccess, navigate]);

  // Czekamy na pełny stan autoryzacji przed pobraniem workspace'u.
  if (authLoading || !rolesReady || !user) {
    return <AdminLoadingScreen />;
  }
  if (!isAdmin && modLoading) {
    return <AdminLoadingScreen />;
  }
  if (!isAdmin && !hasAnyAdminAccess) {
    return <AdminLoadingScreen label="Przekierowanie…" />;
  }

  // Bramka hasła — dopiero po jej przejściu pobierany jest chunk workspace'u.
  if (!gateUnlocked) {
    return <AdminPasswordGate onUnlock={() => setGateUnlocked(true)} />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<AdminLoadingScreen label="Ładowanie panelu…" />}>
        <AdminWorkspace />
      </Suspense>
    </ErrorBoundary>
  );
};

export default Admin;
