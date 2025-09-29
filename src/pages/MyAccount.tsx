import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home, Key, User, CheckCircle, Clock, AlertCircle, BookOpen, Play } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

const MyAccount = () => {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trainings, setTrainings] = useState<any[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(true);

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

  // Fetch assigned trainings
  React.useEffect(() => {
    if (user) {
      fetchTrainings();
    }
  }, [user]);

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          module:training_modules!inner(
            id,
            title,
            description,
            icon_name
          )
        `)
        .eq('user_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Get progress for each training
      const trainingsWithProgress = await Promise.all(
        (data || []).map(async (assignment) => {
          const { data: progressData } = await supabase
            .from('training_progress')
            .select('*')
            .eq('user_id', user?.id)
            .eq('lesson_id', assignment.module.id);

          const { count: totalLessons } = await supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', assignment.module.id)
            .eq('is_active', true);

          const completedLessons = progressData?.filter(p => p.is_completed).length || 0;

          return {
            ...assignment,
            total_lessons: totalLessons || 0,
            completed_lessons: completedLessons,
            progress_percentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
          };
        })
      );

      setTrainings(trainingsWithProgress);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setTrainingsLoading(false);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('auth.email')}</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    {profile.email}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">{t('admin.userRole')}</Label>
                  <div className="mt-1">
                    <Badge variant={
                      profile.role === 'admin' ? 'default' : 
                      profile.role === 'partner' ? 'outline' : 
                      profile.role === 'specjalista' ? 'outline' : 
                      'secondary'
                    }>
                      {getRoleDisplayName(profile.role)}
                    </Badge>
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

              <div>
                <Label className="text-sm font-medium">ID klienta</Label>
                <div className="mt-1 p-3 bg-muted rounded-md font-mono text-xs">
                  {profile.user_id}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Moje szkolenia
              </CardTitle>
              <CardDescription>
                Szkolenia przypisane do Twojego konta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trainingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : trainings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nie masz przypisanych żadnych szkoleń</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trainings.map((training) => (
                    <div key={training.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{training.module.title}</h4>
                        <Badge variant={
                          training.is_completed ? "default" : 
                          training.progress_percentage > 0 ? "secondary" : "outline"
                        }>
                          {training.is_completed ? "Ukończone" : 
                           training.progress_percentage > 0 ? "W trakcie" : "Do rozpoczęcia"}
                        </Badge>
                      </div>
                      
                      {training.module.description && (
                        <p className="text-sm text-muted-foreground">
                          {training.module.description}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Postęp</span>
                          <span>{training.completed_lessons}/{training.total_lessons} lekcji</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${training.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-muted-foreground">
                          Przypisane: {new Date(training.assigned_at).toLocaleDateString('pl-PL')}
                          {training.due_date && (
                            <span className="ml-2">
                              • Termin: {new Date(training.due_date).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => navigate(`/training/${training.module.id}`)}
                          variant={training.is_completed ? "outline" : "default"}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {training.is_completed ? "Przejrzyj" : 
                           training.progress_percentage > 0 ? "Kontynuuj" : "Rozpocznij"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
};

export default MyAccount;