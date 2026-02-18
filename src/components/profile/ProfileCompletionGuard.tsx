import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ApprovalStatusBanner } from './ApprovalStatusBanner';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

export const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ children }) => {
  const { user, profile, loading, rolesReady } = useAuth();
  const { isComplete, missingFields, isSpecialist } = useProfileCompletion();
  const location = useLocation();
  
  // Track if profile was ever loaded - prevents spinner on tab switch
  const [hadProfile, setHadProfile] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setHadProfile(true);
    }
  }, [profile]);
  
  // Lista tras publicznych (dozwolone bez logowania)
  const PUBLIC_PATHS = [
    '/',           // Strona główna - publiczna (CMS)
    '/auth',       // Panel logowania
    '/page/',      // Strony CMS - publiczne
    '/infolink/',  // InfoLink pages are public (OTP protected)
    '/zdrowa-wiedza/', // Zdrowa Wiedza public pages (OTP protected)
    '/events/register/', // Guest registration pages
  ];
  
  // Sprawdź czy ścieżka jest publiczna
  const isPublicPath = PUBLIC_PATHS.some(path => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path);
  });

  // Detect partner pages: single-segment paths that are not known app routes
  const KNOWN_APP_ROUTES = [
    '/auth', '/admin', '/dashboard', '/my-account', '/training',
    '/knowledge', '/messages', '/calculator', '/paid-events',
    '/events', '/install', '/page', '/html', '/infolink', '/zdrowa-wiedza',
    '/meeting-room'
  ];
  const isSingleSegmentPath = /^\/[^/]+$/.test(location.pathname);
  const isKnownRoute = KNOWN_APP_ROUTES.some(r =>
    location.pathname === r || location.pathname.startsWith(r + '/')
  );
  const isPartnerPage = isSingleSegmentPath && !isKnownRoute;
  
  // Jeśli to ścieżka publiczna lub strona partnerska, przepuść bez sprawdzania
  if (isPublicPath || isPartnerPage) {
    return <>{children}</>;
  }
  
  // GUARD: Wait for roles to be ready before any navigation decisions
  // This prevents React Error #306 by ensuring auth state is complete
  if (user && !rolesReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // BEZPIECZEŃSTWO: Przekieruj niezalogowanych na stronę logowania
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  
  // Wait for profile and roles to load
  // BUT: If profile was already loaded once, keep showing children (prevents flash on tab switch)
  if (loading || !rolesReady || !profile) {
    // If we had a profile before, don't show spinner - just keep current content
    if (hadProfile) {
      return <>{children}</>;
    }
    // Only show spinner on first load
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Check approval status FIRST (before profile completion)
  const guardianApproved = profile.guardian_approved === true;
  const adminApproved = profile.admin_approved === true;
  
  // If not fully approved, show approval status banner
  if (!guardianApproved || !adminApproved) {
    return <ApprovalStatusBanner />;
  }
  
  // Check if profile_completed is true (existing users who already completed)
  const profileAny = profile as any;
  if (profileAny.profile_completed === true) {
    return <>{children}</>;
  }
  
  // FORCE redirect to my-account if profile is not complete
  // This ensures users MUST complete their profile before accessing any other page
  if (location.pathname !== '/my-account') {
    return <Navigate to="/my-account" state={{ profileIncomplete: true, forceComplete: true }} replace />;
  }
  
  return <>{children}</>;
};

// Banner component to show on MyAccount page when profile is incomplete
export const ProfileCompletionBanner: React.FC = () => {
  const { profile } = useAuth();
  const { isComplete, missingFields, isSpecialist } = useProfileCompletion();
  
  // Check if profile_completed is already true
  const profileAny = profile as any;
  if (profileAny?.profile_completed === true || isComplete) {
    return null;
  }
  
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      first_name: 'Imię',
      last_name: 'Nazwisko',
      email: 'Adres e-mail',
      phone_number: 'Numer telefonu',
      guardian_name: 'Imię i nazwisko opiekuna',
      specialization: 'Specjalizacje i dziedziny',
      profile_description: 'Opis profilu',
    };
    return labels[field] || field;
  };
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Uzupełnij dane, aby rozpocząć korzystanie z aplikacji</AlertTitle>
      <AlertDescription>
        <p className="mt-2">Brakujące dane obowiązkowe:</p>
        <ul className="list-disc list-inside mt-1">
          {missingFields.map((field) => (
            <li key={field}>{getFieldLabel(field)}</li>
          ))}
        </ul>
        {isSpecialist && (
          <p className="mt-2 text-sm">
            Jako specjalista musisz również uzupełnić swoje specjalizacje i dziedziny.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};