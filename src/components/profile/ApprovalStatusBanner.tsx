import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, CheckCircle, UserCheck, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const ApprovalStatusBanner: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleLogoutAndReturn = async () => {
    await signOut();
    navigate('/');
  };
  
  if (!profile) return null;
  
  const guardianApproved = profile.guardian_approved === true;
  const adminApproved = profile.admin_approved === true;
  
  // If fully approved, don't show banner
  if (guardianApproved && adminApproved) {
    return null;
  }
  
  const guardianName = profile.upline_first_name && profile.upline_last_name 
    ? `${profile.upline_first_name} ${profile.upline_last_name}`
    : profile.guardian_name || 'Opiekun';
  
  const uplineEqId = profile.upline_eq_id;
  
  // Case 1: Waiting for guardian approval
  if (!guardianApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 text-lg font-semibold">
              Twoja rejestracja oczekuje na zatwierdzenie
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300 mt-3 space-y-3">
              <div className="flex items-center gap-2 text-base">
                <span className="font-medium">Status:</span>
                <span>Oczekiwanie na zatwierdzenie Opiekuna</span>
              </div>
              <div className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium">Opiekun:</span>
                <span>{guardianName} {uplineEqId ? `(${uplineEqId})` : ''}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-300 dark:border-amber-700">
                <p className="text-sm">
                  Po zatwierdzeniu przez Opiekuna, Twoje konto zostanie przekazane do Administratora do ostatecznej weryfikacji.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">Opiekun</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Gotowe</span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleLogoutAndReturn}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Powrót do strony głównej
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Case 2: Guardian approved, waiting for admin
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200 text-lg font-semibold">
            Opiekun zatwierdził Twoją rejestrację!
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 mt-3 space-y-3">
            <div className="flex items-center gap-2 text-base">
              <span className="font-medium">Status:</span>
              <span>Oczekiwanie na zatwierdzenie Administratora</span>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-300 dark:border-blue-700">
              <p className="text-sm">
                Twoje konto zostało zatwierdzone przez Opiekuna. Teraz Administrator musi zatwierdzić Twoje konto, abyś mógł w pełni korzystać z systemu.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Opiekun</span>
          </div>
          <div className="h-0.5 w-8 bg-green-500" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <div className="h-0.5 w-8 bg-muted" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Gotowe</span>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <Button 
            variant="outline" 
            onClick={handleLogoutAndReturn}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Powrót do strony głównej
          </Button>
        </div>
      </div>
    </div>
  );
};