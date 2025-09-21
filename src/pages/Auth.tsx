import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

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
    return 'Hasło jest za słabe. Użyj minimum 6 znaków';
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
  
  // Default fallback
  return error?.message || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie';
};

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [eqId, setEqId] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
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

      // Map display roles to database roles
      const roleMapping = {
        'client': 'client',
        'partner': 'partner',
        'specialist': 'specialist'
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
            last_name: lastName.trim()
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
        toast({
          title: "Rejestracja pomyślna",
          description: "Sprawdź swoją skrzynkę email w celu potwierdzenia konta.",
        });
        // Clear form after successful registration
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setEqId('');
        setRole('');
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
    if (!email.trim()) {
      toast({
        title: "Błąd",
        description: "Wprowadź adres email aby zresetować hasło",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Link do resetowania hasła został wysłany na adres ${email}`,
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
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
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
                      minLength={6}
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
    </div>
  );
};

export default Auth;