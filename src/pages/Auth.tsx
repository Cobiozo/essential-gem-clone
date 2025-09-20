import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, user } = useAuth();
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

      // Proceed with signup if user doesn't exist
      const { error } = await signUp(email, password);
      
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Back to home button */}
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Powrót do strony głównej
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-6 sm:mb-8">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">PURE LIFE</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">Panel administracyjny</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Logowanie</TabsTrigger>
            <TabsTrigger value="signup">Rejestracja</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Zaloguj się</CardTitle>
                <CardDescription>
                  Wprowadź swoje dane aby uzyskać dostęp do panelu
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
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
                    <Label htmlFor="password">Hasło</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
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
                    {loading ? 'Logowanie...' : 'Zaloguj się'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Zarejestruj się</CardTitle>
                <CardDescription>
                  Utwórz nowe konto administratora
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Hasło</Label>
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
                    <Label htmlFor="confirm-password">Powtórz hasło</Label>
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
                    {loading ? 'Rejestracja...' : 'Zarejestruj się'}
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