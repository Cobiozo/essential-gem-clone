import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, RefreshCw, Clock, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CacheManagementDialogProps {
  children: React.ReactNode;
}

export const CacheManagementDialog: React.FC<CacheManagementDialogProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isClearing, setIsClearing] = useState({
    appCache: false,
    allData: false,
    session: false,
    full: false
  });

  const handleClearAppCache = async () => {
    setIsClearing(prev => ({ ...prev, appCache: true }));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    queryClient.removeQueries({ queryKey: ['cms_items'] });
    queryClient.removeQueries({ queryKey: ['cms_sections'] });
    queryClient.removeQueries({ queryKey: ['pages'] });
    queryClient.removeQueries({ queryKey: ['reflinks'] });
    queryClient.removeQueries({ queryKey: ['events'] });
    queryClient.removeQueries({ queryKey: ['training'] });
    queryClient.removeQueries({ queryKey: ['knowledge'] });
    
    setIsClearing(prev => ({ ...prev, appCache: false }));
    toast.success('Cache aplikacji wyczyszczony');
  };

  const handleRefreshAllData = async () => {
    setIsClearing(prev => ({ ...prev, allData: true }));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await queryClient.invalidateQueries();
    
    setIsClearing(prev => ({ ...prev, allData: false }));
    toast.success('Wszystkie dane odświeżone');
  };

  const handleClearSessionData = async () => {
    setIsClearing(prev => ({ ...prev, session: true }));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    sessionStorage.clear();
    
    setIsClearing(prev => ({ ...prev, session: false }));
    toast.success('Dane sesji wyczyszczone');
  };

  const handleFullCleanup = async () => {
    setIsClearing(prev => ({ ...prev, full: true }));
    
    try {
      queryClient.clear();
      sessionStorage.clear();
      
      const keysToRemove = Object.keys(localStorage).filter(key => 
        !key.includes('theme') && !key.includes('supabase')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      await signOut();
      
      window.location.reload();
    } catch (error) {
      console.error('Full cleanup error:', error);
      setIsClearing(prev => ({ ...prev, full: false }));
      toast.error('Wystąpił błąd podczas czyszczenia');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Panel narzędziowy
          </DialogTitle>
          <DialogDescription>
            Narzędzia do zarządzania cache i danymi aplikacji
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cache aplikacji */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" />
                Cache aplikacji
              </CardTitle>
              <CardDescription className="text-sm">
                Czyści zapisane dane CMS, stron i zasobów. 
                Wymusza pobranie świeżych danych z serwera przy następnym użyciu.
                Nie wpływa na Twoje dane osobiste ani ustawienia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isClearing.appCache}>
                    {isClearing.appCache ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Czyszczenie...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Wyczyść cache
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Wyczyścić cache aplikacji?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ta operacja usunie zapisane dane CMS i wymusi ich ponowne pobranie z serwera.
                      Nie usunie Twoich danych osobistych ani ustawień.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAppCache}>
                      Potwierdź
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Odśwież dane */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                Odśwież dane
              </CardTitle>
              <CardDescription className="text-sm">
                Wymusza ponowne pobranie wszystkich danych z serwera.
                Przydatne gdy widzisz nieaktualne informacje lub po zmianach w panelu administracyjnym.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isClearing.allData}>
                    {isClearing.allData ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Odświeżanie...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Odśwież wszystko
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Odświeżyć wszystkie dane?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ta operacja pobierze ponownie wszystkie dane z serwera.
                      Może chwilę potrwać w zależności od ilości danych.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefreshAllData}>
                      Potwierdź
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Dane sesji */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-orange-500" />
                Dane sesji
              </CardTitle>
              <CardDescription className="text-sm">
                Czyści tymczasowe dane sesji przeglądarki (np. rozwinięte sekcje, formularze w trakcie wypełniania).
                Nie wpływa na Twoje logowanie ani ustawienia konta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isClearing.session}>
                    {isClearing.session ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Czyszczenie...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Wyczyść sesję
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Wyczyścić dane sesji?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ta operacja usunie tymczasowe dane sesji przeglądarki.
                      Niezapisane formularze mogą zostać utracone. Twoje logowanie pozostanie aktywne.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearSessionData}>
                      Potwierdź
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Pełne czyszczenie */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <Trash2 className="h-4 w-4" />
                Pełne czyszczenie
              </CardTitle>
              <CardDescription className="text-sm">
                ⚠️ Usuwa wszystkie lokalne dane, wylogowuje i przeładowuje aplikację.
                Użyj tylko gdy masz poważne problemy z działaniem aplikacji, których nie rozwiązują powyższe opcje.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing.full}>
                    {isClearing.full ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Czyszczenie...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Pełne czyszczenie
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Wykonać pełne czyszczenie?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ta operacja:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Usunie wszystkie dane z cache</li>
                        <li>Wyczyści dane sesji</li>
                        <li>Usunie lokalne ustawienia (poza motywem)</li>
                        <li>Wyloguje Cię z aplikacji</li>
                        <li>Przeładuje stronę</li>
                      </ul>
                      <p className="mt-2 font-medium">Będziesz musiał zalogować się ponownie.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFullCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Tak, wyczyść wszystko
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
