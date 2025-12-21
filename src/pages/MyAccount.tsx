import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home, Key, User, CheckCircle, AlertCircle, BookOpen, Compass, MapPin, Save, Sparkles, Users, Bell, Briefcase, Mail } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AiCompassWidget } from '@/components/ai-compass/AiCompassWidget';
import { TeamContactsTab } from '@/components/team-contacts/TeamContactsTab';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserNotificationCenter } from '@/components/notifications/UserNotificationCenter';
import { ProfileCompletionForm } from '@/components/profile/ProfileCompletionForm';
import { ProfileCompletionBanner } from '@/components/profile/ProfileCompletionGuard';
import { SpecialistCorrespondence } from '@/components/specialist-correspondence';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

// Preferences Tab Component
const PreferencesTab: React.FC<{ userId: string; t: (key: string) => string }> = ({ userId, t }) => {
  const [showDailySignal, setShowDailySignal] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data } = await supabase
        .from('user_signal_preferences')
        .select('show_daily_signal')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setShowDailySignal(data.show_daily_signal);
      }
      setLoading(false);
    };
    fetchPreferences();
  }, [userId]);

  const handleToggle = async (checked: boolean) => {
    setShowDailySignal(checked);
    const { error } = await supabase
      .from('user_signal_preferences')
      .upsert({ user_id: userId, show_daily_signal: checked }, { onConflict: 'user_id' });
    
    if (error) {
      toast({ title: t('toast.error'), description: t('error.saveFailed'), variant: 'destructive' });
    } else {
      toast({ title: t('toast.success'), description: checked ? t('myAccount.dailySignalEnabled') : t('myAccount.dailySignalDisabled') });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {t('myAccount.displayPreferences')}
        </CardTitle>
        <CardDescription>{t('myAccount.customizeSettings')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-4">
          <div>
            <Label className="text-base font-medium">{t('myAccount.showDailySignal')}</Label>
            <p className="text-sm text-muted-foreground">{t('myAccount.dailySignalDescription')}</p>
          </div>
          <Switch checked={showDailySignal} onCheckedChange={handleToggle} disabled={loading} />
        </div>
      </CardContent>
    </Card>
  );
};

const MyAccount = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isComplete } = useProfileCompletion();
  const { isVisible } = useFeatureVisibility();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Check if redirected due to incomplete profile
  const profileIncomplete = location.state?.profileIncomplete || false;
  const forceComplete = location.state?.forceComplete || false;
  const profileNotCompleted = !(profile as any)?.profile_completed;
  const showProfileForm = profileIncomplete || isEditingProfile || (!isComplete && profileNotCompleted);
  const mustCompleteProfile = forceComplete || (!isComplete && profileNotCompleted);
  
  // Memoized visible tabs based on feature visibility
  const visibleTabs = useMemo(() => ({
    profile: isVisible('my_account.profile'),
    teamContacts: isVisible('my_account.team_contacts'),
    correspondence: isVisible('my_account.correspondence'),
    notifications: isVisible('feature.notifications'),
    preferences: isVisible('feature.daily_signal'),
    aiCompass: isVisible('my_account.ai_compass'),
    security: true, // Always visible
  }), [isVisible]);
  
  // Count visible tabs for grid columns
  const visibleTabCount = Object.values(visibleTabs).filter(Boolean).length;
  
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
        title: t('toast.success'),
        description: t('myAccount.addressSaved'),
      });
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        title: t('toast.error'),
        description: t('myAccount.addressSaveFailed'),
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
        title: t('toast.success'),
        description: t('myAccount.addressDeleted'),
      });
    } catch (error: any) {
      console.error('Error clearing address:', error);
      toast({
        title: t('toast.error'),
        description: t('myAccount.addressDeleteFailed'),
        variant: "destructive",
      });
    } finally {
      setAddressLoading(false);
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return t('role.administrator');
      case 'partner': return t('role.partner');
      case 'specjalista': return t('role.specialist');
      case 'user':
      case 'client':
      default: return t('role.client');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentPassword) {
      setError(t('error.currentPassword'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('error.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('error.passwordLength'));
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
        setError(t('error.incorrectPassword'));
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
        title: t('toast.success'),
        description: t('success.passwordChanged'),
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || t('error.changePassword'));
      toast({
        title: t('toast.error'),
        description: t('error.changePassword'),
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
              {t('nav.training')}
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
                {t('myAccount.accountBlocked')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                {t('myAccount.accountBlockedDescription')}
              </p>
              <p className="text-sm text-red-600">
                {t('myAccount.contactAdmin')}
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
            <NotificationBell />
            <LanguageSelector />
            <ThemeSelector />
            {!mustCompleteProfile && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('nav.training')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  <Home className="w-4 h-4 mr-2" />
                  {t('nav.home')}
                </Button>
              </>
            )}
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
            <p className="text-muted-foreground">{t('myAccount.manageAccountSettings')}</p>
          </div>

          {/* Mandatory Profile Completion Alert */}
          {mustCompleteProfile && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>Uzupełnij swoje dane, aby kontynuować korzystanie z aplikacji.</strong>
                <br />
                <span className="text-sm">Przed uzyskaniem dostępu do pozostałych funkcji musisz wypełnić wszystkie wymagane pola w formularzu poniżej.</span>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${visibleTabCount}, minmax(0, 1fr))` }}>
              {visibleTabs.profile && (
                <TabsTrigger value="profile">
                  <User className="w-4 h-4 mr-2" />
                  {t('myAccount.profile')}
                </TabsTrigger>
              )}
              {visibleTabs.teamContacts && (
                <TabsTrigger value="team-contacts" disabled={mustCompleteProfile}>
                  <Users className="w-4 h-4 mr-2" />
                  Pure – Kontakty
                </TabsTrigger>
              )}
              {visibleTabs.correspondence && (
                <TabsTrigger value="correspondence" disabled={mustCompleteProfile}>
                  <Mail className="w-4 h-4 mr-2" />
                  Korespondencja
                </TabsTrigger>
              )}
              {visibleTabs.notifications && (
                <TabsTrigger value="notifications" disabled={mustCompleteProfile}>
                  <Bell className="w-4 h-4 mr-2" />
                  Powiadomienia
                </TabsTrigger>
              )}
              {visibleTabs.preferences && (
                <TabsTrigger value="preferences" disabled={mustCompleteProfile}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('myAccount.preferences')}
                </TabsTrigger>
              )}
              {visibleTabs.aiCompass && (
                <TabsTrigger value="ai-compass" disabled={mustCompleteProfile}>
                  <Compass className="w-4 h-4 mr-2" />
                  {t('admin.aiCompass')}
                </TabsTrigger>
              )}
              {visibleTabs.security && (
                <TabsTrigger value="security" disabled={mustCompleteProfile}>
                  <Key className="w-4 h-4 mr-2" />
                  {t('myAccount.security')}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              {/* Profile Completion Form for incomplete profiles */}
              {showProfileForm ? (
                <ProfileCompletionForm 
                  isEditing={isEditingProfile}
                  onCancel={() => setIsEditingProfile(false)}
                />
              ) : (
                <>
                  {/* Account Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {t('account.profile')}
                      </CardTitle>
                      <CardDescription>
                        {t('myAccount.basicAccountInfo')}
                      </CardDescription>
                    </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dane osobowe */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('auth.firstName')}</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.first_name || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">{t('auth.lastName')}</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.last_name || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
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
                      <Label className="text-sm font-medium">{t('auth.phoneNumber')}</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {profile.phone_number || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Imię i nazwisko opiekuna</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        {(profile as any).guardian_name || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Edit Profile Button */}
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Edytuj dane profilu
                    </Button>
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
                      <Label className="text-sm font-medium">{t('myAccount.accountStatus')}</Label>
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
                    <Label className="text-sm font-medium">{t('myAccount.clientId')}</Label>
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
                    {t('myAccount.addressData')}
                  </CardTitle>
                  <CardDescription>
                    {t('myAccount.addressDataDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="street-address">{t('myAccount.streetAddress')}</Label>
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
                      <Label htmlFor="postal-code">{t('myAccount.postalCode')}</Label>
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
                      <Label htmlFor="city">{t('myAccount.city')}</Label>
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
                      <Label htmlFor="country">{t('myAccount.country')}</Label>
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
                      {addressLoading ? t('ui.saving') : t('myAccount.saveAddressData')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearAddress}
                      disabled={addressLoading || (!streetAddress && !postalCode && !city && !country)}
                    >
                      {t('myAccount.deleteAddressData')}
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  {/* GDPR Notice */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>{t('myAccount.gdprNotice')}:</strong> {t('myAccount.gdprText')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Specialist Fields - Always visible for specjalista role */}
              {(userRole?.role === 'specjalista' || (profile as any)?.specialization || (profile as any)?.profile_description) && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Specjalizacje i dziedziny
                    </CardTitle>
                    <CardDescription>
                      Twoje dane specjalistyczne widoczne w wyszukiwarce
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Specjalizacje i dziedziny</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                        {(profile as any)?.specialization || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Opis profilu</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                        {(profile as any)?.profile_description || <span className="text-muted-foreground italic">{t('myAccount.notProvided')}</span>}
                      </div>
                    </div>
                    
                    {((profile as any)?.search_keywords?.length > 0) && (
                      <div>
                        <Label className="text-sm font-medium">Słowa kluczowe</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          {(profile as any)?.search_keywords?.join(', ')}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              </>
              )}
            </TabsContent>

            {visibleTabs.teamContacts && (
              <TabsContent value="team-contacts" className="mt-6">
                <TeamContactsTab />
              </TabsContent>
            )}

            {visibleTabs.correspondence && (
              <TabsContent value="correspondence" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Korespondencja ze specjalistami
                    </CardTitle>
                    <CardDescription>
                      Historia wiadomości e-mail wysłanych do specjalistów
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SpecialistCorrespondence />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {visibleTabs.notifications && (
              <TabsContent value="notifications" className="mt-6">
                <UserNotificationCenter />
              </TabsContent>
            )}

            {visibleTabs.preferences && (
              <TabsContent value="preferences" className="mt-6">
                <PreferencesTab userId={user.id} t={t} />
              </TabsContent>
            )}

            {visibleTabs.aiCompass && (
              <TabsContent value="ai-compass" className="mt-6">
                <AiCompassWidget />
              </TabsContent>
            )}

            <TabsContent value="security" className="mt-6">


          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t('auth.password')}
              </CardTitle>
              <CardDescription>
                {t('myAccount.updatePasswordDescription')}
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