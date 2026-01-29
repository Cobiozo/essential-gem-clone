import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Check, X, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MaintenanceBanner from '@/components/MaintenanceBanner';

// Password requirement indicator component
const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
    {met ? (
      <Check className="h-3 w-3" />
    ) : (
      <X className="h-3 w-3 text-destructive" />
    )}
    <span>{text}</span>
  </div>
);
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import { GuardianSearchInput, Guardian } from '@/components/auth/GuardianSearchInput';
import { PhoneCountryCodePicker } from '@/components/auth/PhoneCountryCodePicker';

// Localized error message handler
const getLocalizedErrorMessage = (error: any, t: (key: string) => string): string => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  console.log('Auth error details:', error); // Debug log
  
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid_credentials')) {
    return t('auth.errors.invalidCredentials');
  }
  if (errorMessage.includes('email not confirmed')) {
    return t('auth.errors.emailNotConfirmed');
  }
  if (errorMessage.includes('user already registered') || 
      errorMessage.includes('already_registered') ||
      errorMessage.includes('user_already_exists') ||
      errorMessage.includes('email_address_already_in_use') ||
      errorMessage.includes('email address not available') ||
      errorMessage.includes('user with this email already exists')) {
    return t('auth.errors.userExists');
  }
  if (errorMessage.includes('weak password') || errorMessage.includes('password')) {
    return t('auth.errors.weakPassword');
  }
  if (errorMessage.includes('invalid email') || errorMessage.includes('email')) {
    return t('auth.errors.invalidEmail');
  }
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return t('auth.errors.tooManyRequests');
  }
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return t('auth.errors.networkError');
  }
  if (errorMessage.includes('eq_id') || errorMessage.includes('eqid') || errorMessage.includes('profiles_eq_id_unique')) {
    return t('auth.errors.eqIdExists');
  }
  
  // Default fallback
  return error?.message || t('auth.errors.unexpected');
};

const Auth = () => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+48');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [eqId, setEqId] = useState('');
  const [role, setRole] = useState('');
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [guardianError, setGuardianError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const [reflinkCode, setReflinkCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('signin');
  const [reflinkRole, setReflinkRole] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<{
    title: string;
    message: string;
    planned_end_time: string | null;
  } | null>(null);
  const { signIn, signUp, user, loginComplete, rolesReady } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Sprawdź czy użytkownik został wylogowany z powodu braku aktywności
  useEffect(() => {
    const sessionExpired = sessionStorage.getItem('session_expired_message');
    if (sessionExpired) {
      sessionStorage.removeItem('session_expired_message');
      toast({
        title: 'Sesja wygasła',
        description: 'Zostałeś wylogowany z powodu braku aktywności.',
      });
    }
  }, [toast]);
  
  // Check maintenance mode status with bypass support
  useEffect(() => {
    const checkMaintenance = async () => {
      // Check for bypass key in URL
      const urlParams = new URLSearchParams(window.location.search);
      const bypassKeyFromUrl = urlParams.get('admin');
      
      const { data, error } = await supabase
        .from('maintenance_mode')
        .select('is_enabled, title, message, planned_end_time, bypass_key')
        .single();
      
      // Show maintenance banner ONLY if enabled AND bypass key doesn't match
      if (!error && data?.is_enabled) {
        const hasValidBypass = bypassKeyFromUrl && data.bypass_key === bypassKeyFromUrl;
        
        if (!hasValidBypass) {
          setMaintenanceMode({
            title: data.title,
            message: data.message,
            planned_end_time: data.planned_end_time
          });
        } else {
          // Valid bypass key - allow access
          setMaintenanceMode(null);
        }
      } else {
        setMaintenanceMode(null);
      }
    };
    
    checkMaintenance();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('maintenance_mode_auth')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'maintenance_mode' },
        () => checkMaintenance()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Detect reflink code from URL on mount and track clicks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReflinkCode(ref);
      // Fetch reflink info using RPC to bypass RLS issues with JOINs for unauthenticated users
      supabase
        .rpc('get_reflink_with_creator', { reflink_code_param: ref })
        .maybeSingle()
        .then(async ({ data, error }) => {
          if (error) {
            console.error('Error fetching reflink:', error);
            return;
          }
          if (data) {
            // Automatycznie przełącz na zakładkę rejestracji przy reflinku
            setActiveTab('signup');
            
            // Set role from reflink
            if (data.target_role) {
              setReflinkRole(data.target_role);
              setRole(data.target_role);
            }
            
            // Set guardian from reflink creator (flat structure from RPC)
            if (data.creator_user_id) {
              setSelectedGuardian({
                user_id: data.creator_user_id,
                first_name: data.creator_first_name,
                last_name: data.creator_last_name,
                eq_id: data.creator_eq_id,
                email: data.creator_email
              });
            }
            
            // Increment click count via RPC (safe for anonymous users, doesn't block flow)
            supabase.rpc('increment_reflink_click', { 
              reflink_id_param: data.id 
            }).then(({ error: rpcError }) => {
              if (rpcError) console.warn('Could not increment click count:', rpcError);
            });
            
            // Log click event to reflink_events (doesn't block flow)
            supabase
              .from('reflink_events')
              .insert({
                reflink_id: data.id,
                event_type: 'click',
                target_role: data.target_role
              } as any)
              .then(({ error: eventError }) => {
                if (eventError) console.warn('Could not log click event:', eventError);
              });
          }
        });
    }
  }, []);

  // Validate password and update requirements state
  const validatePassword = (pwd: string) => {
    setPasswordRequirements({
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
    });
  };

  // Check if all password requirements are met
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    // NIE przekierowuj gdy dialog potwierdzenia email jest otwarty
    if (showEmailConfirmDialog) {
      return;
    }
    
    // Check if user just activated their account via email link
    const urlParams = new URLSearchParams(window.location.search);
    const isActivated = urlParams.get('activated') === 'true';
    const returnTo = urlParams.get('returnTo');
    
    if (isActivated) {
      toast({
        title: t('auth.toast.accountActivated'),
        description: t('auth.toast.welcomeToPureLife'),
      });
      // Clear the URL parameter but keep returnTo if present
      const newUrl = returnTo 
        ? `${window.location.pathname}?returnTo=${encodeURIComponent(returnTo)}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Determine redirect destination (returnTo parameter or default /)
    const redirectPath = returnTo || '/';
    
    // SAFE NAVIGATION: Only redirect when BOTH user exists AND rolesReady is true
    // This prevents navigation before roles are fully loaded, avoiding React Error #306
    if (user && rolesReady) {
      console.log('[Auth] user + rolesReady, navigating to:', redirectPath);
      navigate(redirectPath);
    }
  }, [user, navigate, showEmailConfirmDialog, toast, rolesReady, t]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Determine if identifier is email or eq_id
    const isEmail = loginIdentifier.includes('@');
    let loginEmail = loginIdentifier;
    
    // If it's an eq_id, look up the email
    if (!isEmail) {
      try {
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('eq_id', loginIdentifier)
          .single();
        
        if (lookupError || !profile) {
          const errorMsg = t('auth.errors.eqIdNotFound');
          setError(errorMsg);
          toast({
            title: t('auth.toast.loginError'),
            description: errorMsg,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        loginEmail = profile.email;
      } catch (err) {
        setError(t('auth.errors.userLookupError'));
        setLoading(false);
        return;
      }
    }

    const { error } = await signIn(loginEmail, password);
    
    if (error) {
      const localizedErrorMessage = getLocalizedErrorMessage(error, t);
      setError(localizedErrorMessage);
      toast({
        title: t('auth.toast.loginError'),
        description: localizedErrorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.toast.loginSuccess'),
        description: t('auth.toast.welcomeToPureLife'),
      });
      // DON'T navigate here - let useEffect handle it when loginComplete becomes true
      // This ensures auth state change event is fully processed before navigation
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check password requirements
    if (!isPasswordValid) {
      const errorMsg = t('auth.errors.weakPassword');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'),
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      const errorMsg = t('auth.errors.passwordsMismatch');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'),
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if EQ ID is provided
    if (!eqId.trim()) {
      const errorMsg = t('auth.errors.eqIdRequired');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'),
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if role is selected
    if (!role) {
      const errorMsg = t('auth.errors.roleRequired');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'), 
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if phone number is provided and valid
    const phoneRegex = /^[\d\s\-()]{6,15}$/;
    if (!localPhoneNumber.trim()) {
      const errorMsg = t('auth.errors.phoneRequired');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'),
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    if (!phoneRegex.test(localPhoneNumber.trim())) {
      const errorMsg = t('auth.errors.phoneInvalid');
      setError(errorMsg);
      toast({
        title: t('auth.toast.registrationError'),
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Combine country code and local phone number
    const fullPhoneNumber = `${countryCode} ${localPhoneNumber.trim()}`;

    // Check if guardian is selected
    if (!selectedGuardian) {
      setGuardianError(t('auth.errors.guardianRequired'));
      toast({
        title: t('auth.toast.registrationError'),
        description: t('auth.errors.guardianRequired'),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    setGuardianError('');

    try {
      // Check if user already exists using RPC (bypasses RLS safely)
      const { data: emailExists, error: existsError } = await supabase.rpc('email_exists', {
        email_param: email,
      });

      if (existsError) {
        console.error('Error checking existing email via RPC:', existsError);
      }

      if (emailExists) {
        const errorMessage = t('auth.errors.emailExistsLogin');
        setError(errorMessage);
        toast({
          title: t('auth.toast.registrationError'),
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if EQ ID already exists using RPC
      const { data: eqIdExists, error: eqIdError } = await supabase.rpc('eq_id_exists', {
        eq_id_param: eqId.trim(),
      });

      if (eqIdError) {
        console.error('Error checking existing EQ ID via RPC:', eqIdError);
      }

      if (eqIdExists) {
        const errorMessage = t('auth.errors.eqIdExists');
        setError(errorMessage);
        toast({
          title: t('auth.toast.registrationError'),
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Map display roles to database roles - MUST match app_role enum in database
      const roleMapping: Record<string, string> = {
        'client': 'client',
        'partner': 'partner',
        'specjalista': 'specjalista'  // Database uses 'specjalista' not 'specialist'
      };

      // Proceed with signup if user doesn't exist
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            eq_id: eqId.trim(),
            role: roleMapping[role] || 'client',
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone_number: fullPhoneNumber,
            guardian_name: `${selectedGuardian.first_name || ''} ${selectedGuardian.last_name || ''}`.trim(),
            upline_eq_id: selectedGuardian.eq_id,
            upline_first_name: selectedGuardian.first_name,
            upline_last_name: selectedGuardian.last_name,
            reflink_code: reflinkCode || undefined
          }
        }
      });
      
      if (error) {
        const localizedErrorMessage = getLocalizedErrorMessage(error, t);
        setError(localizedErrorMessage);
        toast({
          title: t('auth.toast.registrationError'),
          description: localizedErrorMessage,
          variant: "destructive",
        });
      } else {
        // Track reflink registration if applicable
        if (reflinkCode) {
          try {
            // Fetch current count and increment
            const { data: reflink } = await supabase
              .from('user_reflinks')
              .select('registration_count')
              .eq('reflink_code', reflinkCode)
              .single();
            if (reflink) {
              await supabase
                .from('user_reflinks')
                .update({ registration_count: (reflink.registration_count || 0) + 1 } as any)
                .eq('reflink_code', reflinkCode);
            }
          } catch (reflinkError) {
            console.error('Error tracking reflink registration:', reflinkError);
          }
        }
        
        // NATYCHMIAST pokaż dialog - PRZED jakimkolwiek await!
        // To blokuje useEffect przed przekierowaniem
        setRegisteredEmail(email);
        setShowEmailConfirmDialog(true);
        
        // Clear form after successful registration
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setLocalPhoneNumber('');
        setEqId('');
        setRole('');
        setSelectedGuardian(null);
        setError('');

        // Send activation email via edge function (w tle)
        try {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.functions.invoke('send-activation-email', {
            body: {
              userId: userData?.user?.id || '',
              email: email,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role: roleMapping[role] || 'client',
            },
          });
        } catch (emailError) {
          console.error('Error sending activation email:', emailError);
          // Don't block registration if email fails
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(t('auth.errors.unexpected'));
      toast({
        title: t('auth.toast.registrationError'),
        description: t('auth.errors.unexpected'),
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    // Check if identifier is provided
    if (!loginIdentifier.trim()) {
      toast({
        title: t('toast.error'),
        description: t('auth.errors.enterEmailOrEqId'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Determine if identifier is email or eq_id
      const isEmail = loginIdentifier.includes('@');
      let resetEmail = loginIdentifier;
      
      if (!isEmail) {
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('eq_id', loginIdentifier)
          .single();
        
        if (lookupError || !profile) {
          toast({
            title: t('toast.error'),
            description: t('auth.errors.eqIdNotFound'),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        resetEmail = profile.email;
      }

      // Use edge function to send password reset via SMTP
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Failed to send reset email');

      toast({
        title: t('toast.success'),
        description: t('auth.toast.resetEmailSent'),
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      const localizedErrorMessage = getLocalizedErrorMessage(error, t);
      toast({
        title: t('toast.error'),
        description: localizedErrorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendActivationEmail = async () => {
    if (!registeredEmail) return;
    setResendingEmail(true);
    try {
      await supabase.functions.invoke('send-activation-email', {
        body: { userId: '', email: registeredEmail, resend: true },
      });
      toast({ title: t('toast.success'), description: t('auth.toast.activationResent') });
    } catch (error) {
      toast({ title: t('toast.error'), description: t('auth.toast.activationResendError'), variant: 'destructive' });
    } finally {
      setResendingEmail(false);
    }
  };

  // Email Confirmation Dialog - must be rendered before early returns
  const emailConfirmDialog = (
    <AlertDialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            {t('auth.registrationSuccess')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left space-y-3">
              <p>
                {t('auth.activationLinkSent').replace('{email}', registeredEmail)}
              </p>
              <p>
                <strong className="text-foreground">{t('auth.checkEmailTitle')}</strong>
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ {t('auth.checkSpam')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={() => {
              setShowEmailConfirmDialog(false);
              navigate('/');
            }}
            className="w-full"
          >
            {t('auth.understood')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {emailConfirmDialog}
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t('auth.checkEmailTitle')}</CardTitle>
            <CardDescription>{t('auth.activationLinkSent').replace('{email}', registeredEmail)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert><AlertDescription>{t('auth.clickLinkToActivate')}</AlertDescription></Alert>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">{t('auth.noEmailReceived')}</p>
              <Button variant="outline" onClick={handleResendActivationEmail} disabled={resendingEmail}>
                {resendingEmail ? t('auth.sending') : t('auth.resendEmail')}
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={() => { setRegistrationSuccess(false); setEmail(''); }}>
              {t('auth.backToLogin')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show maintenance banner if enabled
  if (maintenanceMode) {
    return <MaintenanceBanner maintenance={maintenanceMode} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Language & Back to home button */}
        <div className="flex justify-between items-center mb-4">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {t('nav.home')}
            </Button>
          </Link>
          <LanguageSelector />
        </div>
        
        <div className="text-center mb-6 sm:mb-8">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">PURE LIFE</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t('auth.adminPanel')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.signIn')}</CardTitle>
                <CardDescription>
                  {t('auth.enterCredentials')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginIdentifier">{t('auth.emailOrEqId')}</Label>
                    <Input
                      id="loginIdentifier"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder={t('auth.enterEmailOrEqId')}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="p-0 h-auto text-xs text-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.loggingIn') : t('auth.signIn')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.signUp')}</CardTitle>
                <CardDescription>
                  {t('auth.createAccountDesc')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">{t('auth.firstName')} *</Label>
                      <Input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t('auth.enterFirstName')}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">{t('auth.lastName')} *</Label>
                      <Input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t('auth.enterLastName')}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-number">{t('auth.phoneNumber')} *</Label>
                    <PhoneCountryCodePicker
                      selectedCode={countryCode}
                      onCodeChange={setCountryCode}
                      phoneNumber={localPhoneNumber}
                      onPhoneChange={setLocalPhoneNumber}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="eq-id">{t('auth.eqId')} *</Label>
                    <Input
                      id="eq-id"
                      type="text"
                      value={eqId}
                      onChange={(e) => setEqId(e.target.value)}
                      placeholder={t('auth.enterEqId')}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-select">{t('auth.role')} *</Label>
                    <Select value={role} onValueChange={setRole} required disabled={loading || !!reflinkRole}>
                      <SelectTrigger className="w-full bg-background border border-input hover:bg-accent hover:text-accent-foreground z-50">
                        <SelectValue placeholder={t('auth.selectRole')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-md z-50 max-h-96 overflow-y-auto">
                        <SelectItem value="client" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">
                          {t('auth.roleClient')}
                        </SelectItem>
                        <SelectItem value="partner" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">
                          {t('auth.rolePartner')}
                        </SelectItem>
                        <SelectItem value="specjalista" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">
                          {t('auth.roleSpecialist')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {reflinkRole && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('auth.roleSetByReflink')}
                      </p>
                    )}
                  </div>

                  <GuardianSearchInput
                    value={selectedGuardian}
                    onChange={setSelectedGuardian}
                    disabled={loading || !!reflinkRole}
                    error={guardianError}
                  />
                  {reflinkRole && selectedGuardian && (
                    <p className="text-xs text-muted-foreground -mt-1">
                      {t('auth.guardianSetByReflink')}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      required
                      disabled={loading}
                      minLength={8}
                    />
                    {/* Password requirements checklist */}
                    <div className="text-xs space-y-0.5 mt-2 p-2 bg-muted/50 rounded-md">
                      <p className="font-medium text-muted-foreground mb-1">{t('auth.requirements.title')}</p>
                      <PasswordRequirement met={passwordRequirements.minLength} text={t('auth.requirements.minLength')} />
                      <PasswordRequirement met={passwordRequirements.hasUppercase} text={t('auth.requirements.uppercase')} />
                      <PasswordRequirement met={passwordRequirements.hasLowercase} text={t('auth.requirements.lowercase')} />
                      <PasswordRequirement met={passwordRequirements.hasNumber} text={t('auth.requirements.number')} />
                      <PasswordRequirement met={passwordRequirements.hasSpecial} text={t('auth.requirements.special')} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">{t('auth.errors.passwordsMismatch')}</p>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading || !isPasswordValid || password !== confirmPassword}>
                    {loading ? t('auth.registering') : t('auth.signUp')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Render email dialog */}
      {emailConfirmDialog}
    </div>
  );
};

export default Auth;