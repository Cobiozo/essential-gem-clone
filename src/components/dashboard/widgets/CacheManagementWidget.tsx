import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Database, RefreshCw, Clock, Trash2, Settings } from 'lucide-react';

export const CacheManagementWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { tf } = useLanguage();
  const [isClearing, setIsClearing] = useState(false);

  const clearApplicationCache = () => {
    queryClient.removeQueries({ queryKey: ['cms_items'] });
    queryClient.removeQueries({ queryKey: ['cms_sections'] });
    queryClient.removeQueries({ queryKey: ['pages'] });
    queryClient.removeQueries({ queryKey: ['webinars'] });
    queryClient.removeQueries({ queryKey: ['training'] });
    queryClient.removeQueries({ queryKey: ['knowledge_resources'] });
    queryClient.removeQueries({ queryKey: ['reflinks'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
    toast.success(tf('cache.appCacheCleared', 'Cache aplikacji wyczyszczony'));
  };

  const refreshAllData = () => {
    queryClient.invalidateQueries();
    toast.success(tf('cache.allDataRefreshed', 'Wszystkie dane odświeżone'));
  };

  const clearSessionData = () => {
    sessionStorage.clear();
    toast.success(tf('cache.sessionCleared', 'Dane sesji wyczyszczone'));
  };

  const fullCleanup = async () => {
    setIsClearing(true);
    try {
      queryClient.clear();
      sessionStorage.clear();
      localStorage.removeItem('dashboard_view_preference');
      localStorage.removeItem('cookie_consent');
      localStorage.removeItem('cookie_preferences');
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error(tf('cache.cleanupError', 'Wystąpił błąd podczas czyszczenia'));
      setIsClearing(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{tf('cache.toolPanel', 'Panel narzędziowy')}</CardTitle>
        </div>
        <CardDescription>
          {tf('cache.toolPanelDescription', 'Zarządzaj pamięcią podręczną i danymi sesji aplikacji')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-sm">{tf('cache.appCache', 'Cache aplikacji')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {tf('cache.appCacheShort', 'Wyczyść pamięć podręczną treści CMS, stron i zasobów')}
                  </p>
                  <Button variant="outline" size="sm" onClick={clearApplicationCache} className="w-full mt-2">
                    {tf('cache.clearCache', 'Wyczyść cache')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-sm">{tf('cache.refreshData', 'Odśwież dane')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {tf('cache.refreshDataShort', 'Pobierz najnowsze dane ze wszystkich źródeł')}
                  </p>
                  <Button variant="outline" size="sm" onClick={refreshAllData} className="w-full mt-2">
                    {tf('cache.refreshAll', 'Odśwież wszystko')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-sm">{tf('cache.sessionData', 'Dane sesji')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {tf('cache.sessionDataShort', 'Wyczyść tymczasowe dane bieżącej sesji')}
                  </p>
                  <Button variant="outline" size="sm" onClick={clearSessionData} className="w-full mt-2">
                    {tf('cache.clearSession', 'Wyczyść sesję')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-sm text-destructive">{tf('cache.fullCleanup', 'Pełne czyszczenie')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {tf('cache.fullCleanupShort', 'Wyczyść wszystko, wyloguj i przeładuj aplikację')}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full mt-2" disabled={isClearing}>
                        {isClearing ? tf('cache.clearing', 'Czyszczenie...') : tf('cache.clearAll', 'Wyczyść wszystko')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{tf('cache.fullCleanupTitle', 'Czy na pewno chcesz wyczyścić wszystko?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {tf('cache.fullCleanupConfirmDescription', 'Ta operacja wyczyści wszystkie dane lokalne, wyloguje Cię z aplikacji i przeładuje stronę. Będziesz musiał zalogować się ponownie.')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tf('common.cancel', 'Anuluj')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={fullCleanup}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {tf('cache.clearAndReload', 'Wyczyść i przeładuj')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
