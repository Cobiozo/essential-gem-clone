import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home, Key, User, CheckCircle, AlertCircle, BookOpen, Compass, MapPin, Save } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AiCompassWidget } from '@/components/ai-compass/AiCompassWidget';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

const MyAccount = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Address fields state
  const [streetAddress, setStreetAddress] = useState(profile?.street_address || '');
  const [postalCode, setPostalCode] = useState(profile?.postal_code || '');
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [addressLoading, setAddressLoading] = useState(false);

  // Update address state when profile loads
  React.useEffect(() => {
    if (profile) {
      setStreetAddress(profile.street_address || '');
      setPostalCode(profile.postal_code || '');
      setCity(profile.city || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  const handleSaveAddress = async () => {
    if (!user) return;
    
    setAddressLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          street_address: streetAddress.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Dane adresowe zostały zapisane.",
      });
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać danych adresowych.",
        variant: "destructive",
      });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleClearAddress = async () => {
    if (!user) return;
    
    setAddressLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          street_address: null,
          postal_code: null,
          city: null,
          country: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setStreetAddress('');
      setPostalCode('');
      setCity('');
      setCountry('');

      toast({
        title: "Sukces",
        description: "Dane adresowe zostały usunięte.",
      });
    } catch (error: any) {
      console.error('Error clearing address:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć danych adresowych.",
        variant: "destructive",
      });
    } finally {
      setAddressLoading(false);
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'partner': return 'Partner';
      case 'specjalista': return 'Specjalista';
      case 'user':
      case 'client':
      default: return 'Klient';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentPassword) {
      setError('Podaj aktualne hasło');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nowe hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 6) {
      setError('Nowe hasło musi mieć minimum 6 znaków');
      return;
    }

    setLoading(true);
    
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        setError('Aktualne hasło jest nieprawidłowe');
        return;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Sukces",
        description: "Hasło zostało pomyślnie zmienione.",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || 'Wystąpił błąd podczas zmiany hasła');
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić hasła.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if account is deactivated
  if (profile.is_active === false) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={newPureLifeLogo} alt="Pure Life" className="w-8 h-8" />
              <h1 className="text-xl font-bold">PURE LIFE</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeSelector />
              <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Akademia
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />
                {t('nav.home')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </header>

        {/* Blocked Account Content */}
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Konto zablokowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                Twoje konto zostało dezaktywowane przez administratora. Nie masz dostępu do funkcji aplikacji.
              </p>
              <p className="text-sm text-red-600">
                Jeśli uważasz, że to pomyłka, skontaktuj się z administratorem systemu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={newPureLifeLogo} alt="Pure Life" className="w-8 h-8" />
            <h1 className="text-xl font-bold">PURE LIFE</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeSelector />
            <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Akademia
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              {t('nav.home')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('account.myAccount')}</h2>
            <p className="text-muted-foreground">Zarządzaj swoim kontem i ustawieniami</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="ai-compass">
                <Compass className="w-4 h-4 mr-2" />
                AI-Compass
              </TabsTrigger>
              <TabsTrigger value="security">
                <Key className="w-4 h-4 mr-2" />
                Bezpieczeństwo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('account.profile')}
                  </CardTitle>
                  <CardDescription>
                    Podstawowe informacje o Twoim koncie
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dane osobowe */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Imię</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.first_name || <span className="text-muted-foreground italic">Nie podano</span>}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Nazwisko</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.last_name || <span className="text-muted-foreground italic">Nie podano</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('auth.email')}</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.email}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Numer telefonu</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.phone_number || <span className="text-muted-foreground italic">Nie podano</span>}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Informacje o koncie */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('admin.userRole')}</Label>
                      <div className="mt-1">
                        <Badge variant={
                          userRole?.role === 'admin' ? 'default' : 
                          userRole?.role === 'partner' ? 'outline' : 
                          userRole?.role === 'specjalista' ? 'outline' : 
                          'secondary'
                        }>
                          {getRoleDisplayName(userRole?.role || 'user')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Status konta</Label>
                      <div className="mt-1">
                        {profile.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('admin.active')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('admin.inactive')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('admin.created')}</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                        {new Date(profile.created_at).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {profile.eq_id && (
                      <div>
                        <Label className="text-sm font-medium">EQ ID</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md font-mono text-sm">
                          {profile.eq_id}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">ID klienta</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md font-mono text-xs">
                      {profile.user_id}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information - Editable */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Dane adresowe
                  </CardTitle>
                  <CardDescription>
                    Opcjonalne dane adresowe – możesz je edytować w dowolnym momencie
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="street-address">Ulica i numer domu</Label>
                      <Input
                        id="street-address"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="np. ul. Kwiatowa 15/3"
                        disabled={addressLoading}
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal-code">Kod pocztowy</Label>
                      <Input
                        id="postal-code"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="np. 00-001"
                        disabled={addressLoading}
                        maxLength={20}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">Miasto</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="np. Warszawa"
                        disabled={addressLoading}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Kraj</Label>
                      <Input
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="np. Polska"
                        disabled={addressLoading}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      onClick={handleSaveAddress} 
                      disabled={addressLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {addressLoading ? 'Zapisywanie...' : 'Zapisz dane adresowe'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearAddress}
                      disabled={addressLoading || (!streetAddress && !postalCode && !city && !country)}
                    >
                      Usuń dane adresowe
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  {/* GDPR Notice */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Informacja RODO:</strong> Podane dane osobowe są przetwarzane zgodnie z obowiązującymi 
                      przepisami RODO i wykorzystywane wyłącznie w celach związanych z funkcjonowaniem konta użytkownika. 
                      Masz prawo wglądu, edycji oraz usunięcia swoich danych.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-compass" className="mt-6">
              <AiCompassWidget />
            </TabsContent>

            <TabsContent value="security" className="mt-6">


          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t('auth.password')}
              </CardTitle>
              <CardDescription>
                Zaktualizuj swoje hasło, aby utrzymać bezpieczeństwo konta
              </CardDescription>
            </CardHeader>
            <CardContent>
               <form onSubmit={handlePasswordChange} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="current-password">{t('auth.password')}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Wprowadź aktualne hasło"
                    required
                    disabled={loading}
                  />
                </div>

                 <div className="space-y-2">
                   <Label htmlFor="new-password">{t('auth.password')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Wprowadź nowe hasło"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                 <div className="space-y-2">
                   <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Powtórz nowe hasło"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                 <div className="flex gap-3">
                   <Button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
                     {loading ? `${t('common.loading')}...` : t('admin.save')}
                   </Button>
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => {
                       setCurrentPassword('');
                       setNewPassword('');
                       setConfirmPassword('');
                       setError('');
                     }}
                     disabled={loading}
                   >
                     {t('admin.cancel')}
                   </Button>
                  </div>
              </form>
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;