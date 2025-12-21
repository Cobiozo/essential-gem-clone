import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

export const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ children }) => {
  const { user, profile, loading, rolesReady } = useAuth();
  const { isComplete, missingFields, isSpecialist } = useProfileCompletion();
  const location = useLocation();
  
  // Allow auth page to render without restrictions
  if (location.pathname === '/auth') {
    return <>{children}</>;
  }
  
  // Don't guard if not logged in
  if (!user) {
    return <>{children}</>;
  }
  
  // Wait for profile and roles to load
  if (loading || !rolesReady || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
