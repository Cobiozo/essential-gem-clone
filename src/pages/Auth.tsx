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

const getPolishErrorMessage = (error: any): string => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  console.log('Auth error details:', error); // Debug log
  
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid_credentials')) {
    return 'Nieprawidłowy email lub hasło';
  }
  if (errorMessage.includes('email not confirmed')) {
    return 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową';
  }
  if (errorMessage.includes('user already registered') || 
      errorMessage.includes('already_registered') ||
      errorMessage.includes('user_already_exists') ||
      errorMessage.includes('email_address_already_in_use') ||
      errorMessage.includes('email address not available') ||
      errorMessage.includes('user with this email already exists')) {
    return 'Użytkownik z tym adresem email już istnieje';
  }
  if (errorMessage.includes('weak password') || errorMessage.includes('password')) {
    return 'Hasło nie spełnia wymagań bezpieczeństwa (min. 8 znaków, wielka i mała litera, cyfra, znak specjalny)';
  }
  if (errorMessage.includes('invalid email') || errorMessage.includes('email')) {
    return 'Nieprawidłowy format adresu email';
  }
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę';
  }
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Problem z połączeniem internetowym. Sprawdź połączenie i spróbuj ponownie';
  }
  if (errorMessage.includes('eq_id') || errorMessage.includes('eqid') || errorMessage.includes('profiles_eq_id_unique')) {
    return 'Użytkownik z tym numerem EQ ID już istnieje w systemie';
  }
  
  // Default fallback
  return error?.message || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie';
};

const Auth = () => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    
    if (user) {
      // Redirect to my-account if profile needs completion, otherwise to home
      navigate('/');
    }
    // Check if user just activated their account
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('activated') === 'true') {
      toast({
        title: 'Konto aktywowane',
        description: 'Twoje konto zostało pomyślnie aktywowane. Możesz się teraz zalogować.',
      });
    }
  }, [user, navigate, showEmailConfirmDialog]);

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
          setError('Nie znaleziono użytkownika z podanym EQ ID');
          toast({
            title: "Błąd logowania",
            description: "Nie znaleziono użytkownika z podanym EQ ID",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        loginEmail = profile.email;
      } catch (err) {
        setError('Błąd podczas wyszukiwania użytkownika');
        setLoading(false);
        return;
      }
    }

    const { error } = await signIn(loginEmail, password);
    
    if (error) {
      const polishErrorMessage = getPolishErrorMessage(error);
      setError(polishErrorMessage);
      toast({
        title: "Błąd logowania",
        description: polishErrorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Zalogowano pomyślnie",
        description: "Witaj w systemie Pure Life!",
      });
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check password requirements
    if (!isPasswordValid) {
      setError('Hasło nie spełnia wszystkich wymagań bezpieczeństwa');
      toast({
        title: "Błąd rejestracji",
        description: "Hasło nie spełnia wymagań bezpieczeństwa",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      toast({
        title: "Błąd rejestracji",
        description: "Hasła nie są identyczne",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if EQ ID is provided
    if (!eqId.trim()) {
      setError('EQ ID jest wymagane');
      toast({
        title: "Błąd rejestracji",
        description: "EQ ID jest wymagane",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if role is selected
    if (!role) {
      setError('Wybór roli jest wymagany');
      toast({
        title: "Błąd rejestracji", 
        description: "Wybór roli jest wymagany",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if phone number is provided and valid
    const phoneRegex = /^[\d\s\-+()]{9,20}$/;
    if (!phoneNumber.trim()) {
      setError('Numer telefonu jest wymagany');
      toast({
        title: "Błąd rejestracji",
        description: "Numer telefonu jest wymagany",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    if (!phoneRegex.test(phoneNumber.trim())) {
      setError('Nieprawidłowy format numeru telefonu');
      toast({
        title: "Błąd rejestracji",
        description: "Nieprawidłowy format numeru telefonu (9-20 cyfr)",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if guardian is selected
    if (!selectedGuardian) {
      setGuardianError('Musisz wybrać opiekuna z listy');
      toast({
        title: "Błąd rejestracji",
        description: "Musisz wybrać opiekuna z listy",
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
        const errorMessage = 'Użytkownik z tym adresem email już istnieje. Zaloguj się lub sprawdź skrzynkę pocztową.';
        setError(errorMessage);
        toast({
          title: "Błąd rejestracji",
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
        const errorMessage = 'Użytkownik z tym numerem EQ ID już istnieje w systemie. Sprawdź poprawność numeru.';
        setError(errorMessage);
        toast({
          title: "Błąd rejestracji",
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
            phone_number: phoneNumber.trim(),
            guardian_name: `${selectedGuardian.first_name || ''} ${selectedGuardian.last_name || ''}`.trim(),
            upline_eq_id: selectedGuardian.eq_id,
            upline_first_name: selectedGuardian.first_name,
            upline_last_name: selectedGuardian.last_name
          }
        }
      });
      
      if (error) {
        const polishErrorMessage = getPolishErrorMessage(error);
        setError(polishErrorMessage);
        toast({
          title: "Błąd rejestracji",
          description: polishErrorMessage,
          variant: "destructive",
        });
      } else {
        // Send activation email via edge function
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

        // Show success state
        setRegisteredEmail(email);
        setShowEmailConfirmDialog(true);
        
        // Clear form after successful registration
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setPhoneNumber('');
        setEqId('');
        setRole('');
        setSelectedGuardian(null);
        setError('');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Wystąpił nieoczekiwany błąd. Spróbuj ponownie');
      toast({
        title: "Błąd rejestracji",
        description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    // Check if identifier is provided
    if (!loginIdentifier.trim()) {
      toast({
        title: "Błąd",
        description: "Wprowadź adres email lub EQ ID aby zresetować hasło",
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
            title: "Błąd",
            description: "Nie znaleziono użytkownika z podanym EQ ID",
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
        title: "Sukces",
        description: `Link do resetowania hasła został wysłany na adres ${resetEmail}`,
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      const polishErrorMessage = getPolishErrorMessage(error);
      toast({
        title: "Błąd",
        description: polishErrorMessage,
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
      toast({ title: 'Sukces', description: 'E-mail aktywacyjny został wysłany ponownie.' });
    } catch (error) {
      toast({ title: 'Błąd', description: 'Nie udało się wysłać e-maila.', variant: 'destructive' });
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
            Rejestracja pomyślna!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left space-y-3">
              <p>
                Na adres <strong className="text-foreground">{registeredEmail}</strong> została wysłana 
                wiadomość z linkiem aktywacyjnym.
              </p>
              <p>
                <strong className="text-foreground">Przejdź teraz do swojej skrzynki pocztowej</strong> i kliknij 
                w link, aby potwierdzić rejestrację i aktywować konto.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Jeśli nie widzisz wiadomości w skrzynce głównej, sprawdź folder SPAM lub Niechciane.
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
            Zrozumiałem
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
            <CardTitle>Sprawdź swoją skrzynkę e-mail</CardTitle>
            <CardDescription>Wysłaliśmy link aktywacyjny na: <strong>{registeredEmail}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert><AlertDescription>Kliknij link w wiadomości, aby aktywować konto.</AlertDescription></Alert>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Nie otrzymałeś wiadomości?</p>
              <Button variant="outline" onClick={handleResendActivationEmail} disabled={resendingEmail}>
                {resendingEmail ? 'Wysyłanie...' : 'Wyślij ponownie'}
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={() => { setRegistrationSuccess(false); setEmail(''); }}>
              Powrót do logowania
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
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
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Panel administracyjny</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.signIn')}</CardTitle>
                <CardDescription>
                  Wprowadź swoje dane aby uzyskać dostęp do panelu
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginIdentifier">Email lub EQ ID</Label>
                    <Input
                      id="loginIdentifier"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Wprowadź email lub EQ ID"
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
                      Zapomniałem hasła
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
                    {loading ? `${t('common.loading')}...` : t('auth.signIn')}
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
                  Utwórz nowe konto administratora
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
                      <Label htmlFor="first-name">Imię *</Label>
                      <Input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Wprowadź imię"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Nazwisko *</Label>
                      <Input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Wprowadź nazwisko"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Numer telefonu *</Label>
                    <Input
                      id="phone-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+48 123 456 789"
                      required
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
                      placeholder="Wprowadź EQ ID"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-select">{t('auth.role')} *</Label>
                    <Select value={role} onValueChange={setRole} required disabled={loading}>
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
                  </div>

                  <GuardianSearchInput
                    value={selectedGuardian}
                    onChange={setSelectedGuardian}
                    disabled={loading}
                    error={guardianError}
                  />
                  
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
                      <p className="font-medium text-muted-foreground mb-1">Wymagania hasła:</p>
                      <PasswordRequirement met={passwordRequirements.minLength} text="Minimum 8 znaków" />
                      <PasswordRequirement met={passwordRequirements.hasUppercase} text="Minimum 1 wielka litera (A-Z)" />
                      <PasswordRequirement met={passwordRequirements.hasLowercase} text="Minimum 1 mała litera (a-z)" />
                      <PasswordRequirement met={passwordRequirements.hasNumber} text="Minimum 1 cyfra (0-9)" />
                      <PasswordRequirement met={passwordRequirements.hasSpecial} text="Minimum 1 znak specjalny (!@#$%...)" />
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
                      minLength={8}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? `${t('common.loading')}...` : t('auth.signUp')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {emailConfirmDialog}
    </div>
  );
};

export default Auth;