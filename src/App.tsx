import React, { useState, useCallback, useEffect, lazy, Suspense, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { ImportantInfoBanner } from "@/components/ImportantInfoBanner";
import { DailySignalBanner } from "@/components/DailySignalBanner";
import { ProfileCompletionGuard } from "@/components/profile/ProfileCompletionGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useDynamicMetaTags } from "@/hooks/useDynamicMetaTags";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardPreference } from "@/hooks/useDashboardPreference";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { SupportFormDialog } from "@/components/support";
import { useSecurityPreventions } from "@/hooks/useSecurityPreventions";

// Helper function for lazy loading with automatic retry on chunk errors
// Improved: More retries, cache clearing, loop detection
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 4
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        console.warn(`[LazyLoad] Attempt ${i + 1}/${retries} failed:`, error);
        
        if (i === retries - 1) {
          // Before reload - try to clear browser cache
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(name => caches.delete(name)));
              console.log('[LazyLoad] Browser cache cleared');
            } catch (e) {
              console.warn('[LazyLoad] Failed to clear cache:', e);
            }
          }
          
          // Check for reload loop (prevent infinite reloads)
          const lastReload = sessionStorage.getItem('chunk_error_reload');
          const reloadCount = parseInt(sessionStorage.getItem('chunk_reload_count') || '0');
          const now = Date.now();
          
          // If already reloaded 2+ times within 60 seconds - stop and show error
          if (reloadCount >= 2 && lastReload && now - parseInt(lastReload) < 60000) {
            console.error('[LazyLoad] Reload loop detected, stopping auto-reload');
            sessionStorage.removeItem('chunk_reload_count');
            throw new Error('CHUNK_LOAD_LOOP');
          }
          
          // Increment reload counter and trigger reload
          sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
          sessionStorage.setItem('chunk_error_reload', now.toString());
          
          // Hard reload with cache-busting query param
          console.log('[LazyLoad] All retries failed, hard reloading...');
          window.location.href = window.location.pathname + '?v=' + now;
          
          // Return a valid placeholder component to prevent React Error #306
          const PlaceholderComponent = () => {
            return React.createElement('div', { 
              className: 'min-h-screen bg-background flex items-center justify-center'
            }, React.createElement('div', {
              className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary'
            }));
          };
          return { default: PlaceholderComponent as unknown as T };
        }
        
        // Wait longer between retries (2.5s for mobile networks)
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    throw new Error('Failed to load module after retries');
  });
}

// Lazy load chat widgets - only mount when first opened
const ChatWidget = lazy(() => import("@/components/ChatWidget"));
const MedicalChatWidget = lazy(() => import("@/components/MedicalChatWidget"));

// Eager load - critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load - heavy pages with retry
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const MyAccount = lazyWithRetry(() => import("./pages/MyAccount"));
const Page = lazyWithRetry(() => import("./pages/Page"));
const Training = lazyWithRetry(() => import("./pages/Training"));
const TrainingModule = lazyWithRetry(() => import("./pages/TrainingModule"));
const KnowledgeCenter = lazyWithRetry(() => import("./pages/KnowledgeCenter"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const IndividualMeetingsPage = lazyWithRetry(() => import("./pages/IndividualMeetingsPage"));
const InfoLinkPage = lazyWithRetry(() => import("./pages/InfoLinkPage"));
const WebinarsPage = lazyWithRetry(() => import("./pages/WebinarsPage"));
const TeamMeetingsPage = lazyWithRetry(() => import("./pages/TeamMeetingsPage"));
const EventGuestRegistration = lazyWithRetry(() => import("./pages/EventGuestRegistration"));
const CommissionCalculatorPage = lazyWithRetry(() => import("./pages/CommissionCalculator"));
const SpecialistCalculatorPage = lazyWithRetry(() => import("./pages/SpecialistCalculator"));
const HtmlPage = lazyWithRetry(() => import("./pages/HtmlPage"));
const HealthyKnowledge = lazyWithRetry(() => import("./pages/HealthyKnowledge"));
const HealthyKnowledgePlayer = lazyWithRetry(() => import("./pages/HealthyKnowledgePlayer"));
const HealthyKnowledgePublicPage = lazyWithRetry(() => import("./pages/HealthyKnowledgePublicPage"));
const MessagesPage = lazyWithRetry(() => import("./pages/MessagesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Component to handle inactivity timeout - MUST be inside BrowserRouter for useNavigate
const InactivityHandler = () => {
  const { user } = useAuth();
  useInactivityTimeout({ enabled: !!user });
  return null;
};

// Wrapper component to access location inside BrowserRouter
const ChatWidgetsWrapper = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isInfoLinkPage = location.pathname.startsWith('/infolink/');

  // Hide chat widgets on InfoLink pages
  if (!user || isInfoLinkPage) return null;

  return (
    <>
      <Suspense fallback={null}>
        <MedicalChatWidget />
      </Suspense>
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  );
};

const AppContent = () => {
  useDynamicMetaTags();
  useSecurityPreventions(false); // Global: disable right-click, allow text selection
  const { toast } = useToast();
  const { loginTrigger, profile, user, rolesReady, isFreshLogin, setIsFreshLogin, isAdmin, isClient, isPartner, isSpecjalista } = useAuth();
  const { isModern } = useDashboardPreference();
  
  // Banner display state - SIGNAL first, then INFO banners sequentially
  const [dailySignalDismissed, setDailySignalDismissed] = useState(false);
  const [currentInfoBannerIndex, setCurrentInfoBannerIndex] = useState(0);
  const [infoBannersComplete, setInfoBannersComplete] = useState(false);
  const [readyForInfoBanners, setReadyForInfoBanners] = useState(false);
  const [shouldShowBanners, setShouldShowBanners] = useState(false);
  
  // Support form dialog state
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);

  // Log auth state changes for debugging
  useEffect(() => {
    console.log('[App] Auth state:', { user: !!user, isFreshLogin, loginTrigger, rolesReady, shouldShowBanners });
  }, [user, isFreshLogin, loginTrigger, rolesReady, shouldShowBanners]);

  // Show toast after automatic chunk error reload
  useEffect(() => {
    const chunkReload = sessionStorage.getItem('chunk_error_reload');
    const reloadCount = sessionStorage.getItem('chunk_reload_count');
    
    if (chunkReload) {
      const reloadTime = parseInt(chunkReload);
      const now = Date.now();
      
      // If reload was recent (< 5s ago), show appropriate message
      if (now - reloadTime < 5000) {
        const count = parseInt(reloadCount || '1');
        
        if (count >= 2) {
          // Multiple reloads - show cache clearing hint
          toast({
            title: 'Problem z ładowaniem',
            description: 'Jeśli problem się powtarza, wyczyść cache przeglądarki (Ctrl+Shift+Delete) i odśwież stronę.',
            variant: 'destructive',
            duration: 10000,
          });
        } else {
          toast({
            title: 'Aplikacja została zaktualizowana',
            description: 'Strona została automatycznie odświeżona aby załadować nową wersję.',
          });
        }
      }
      
      sessionStorage.removeItem('chunk_error_reload');
      // Reset reload counter after 60 seconds of successful operation
      setTimeout(() => {
        sessionStorage.removeItem('chunk_reload_count');
      }, 60000);
    }
  }, []);

  // Set shouldShowBanners when both user and isFreshLogin are true
  useEffect(() => {
    if (user && isFreshLogin) {
      console.log('[App] Setting shouldShowBanners to TRUE');
      setShouldShowBanners(true);
    }
  }, [user, isFreshLogin]);

  // Check if user is fully approved - wait for profile to load before rendering banners
  const isFullyApproved = user 
    ? (profile !== null && profile.guardian_approved === true && profile.admin_approved === true) 
    : true;

  // Global cleanup for all Supabase channels on window unload and unmount
  useEffect(() => {
    const cleanupAllChannels = () => {
      const channels = supabase.getChannels();
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };

    window.addEventListener('beforeunload', cleanupAllChannels);
    
    return () => {
      window.removeEventListener('beforeunload', cleanupAllChannels);
      cleanupAllChannels(); // Also cleanup on unmount
    };
  }, []);

  // Support form dialog event listener
  useEffect(() => {
    const handleOpenSupportForm = () => setIsSupportDialogOpen(true);
    window.addEventListener('openSupportForm', handleOpenSupportForm);
    return () => window.removeEventListener('openSupportForm', handleOpenSupportForm);
  }, []);

  // Note: readyForInfoBanners is now set synchronously in handleDailySignalDismiss

  // Reset other banner states when isFreshLogin becomes true
  useEffect(() => {
    if (isFreshLogin) {
      setDailySignalDismissed(false);
      setCurrentInfoBannerIndex(0);
      setInfoBannersComplete(false);
      setReadyForInfoBanners(false);
    }
  }, [isFreshLogin]);

  // Handle Daily Signal dismissal - then show Info banners (synchronously!)
  const handleDailySignalDismiss = useCallback(() => {
    console.log('[App] Daily Signal dismissed - enabling InfoBanners');
    setDailySignalDismissed(true);
    setReadyForInfoBanners(true); // Synchronous - prevents race condition
  }, []);

  // Handle Info Banner dismissal - move to next or complete
  const handleInfoBannerDismiss = useCallback(() => {
    setCurrentInfoBannerIndex(prev => prev + 1);
  }, []);

  // Mark all info banners as complete (called when no more to show)
  const handleInfoBannersComplete = useCallback(() => {
    setInfoBannersComplete(true);
    setIsFreshLogin(false); // Banner sequence complete
  }, []);
  
  // CRITICAL: Block routing until roles are loaded to prevent race conditions
  if (user && !rolesReady) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Ładowanie...</p>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InactivityHandler />
        <ProfileCompletionGuard>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={
                // All authenticated users go to modern dashboard
                user ? <Navigate to="/dashboard" replace /> : <Index />
              } />
              <Route path="/auth" element={
                user ? <Navigate to="/dashboard" replace /> : <Auth />
              } />
              <Route path="/admin" element={<Admin />} />
              <Route path="/my-account" element={<MyAccount />} />
              <Route path="/training" element={<Training />} />
              <Route path="/training/:moduleId" element={<TrainingModule />} />
              <Route path="/knowledge" element={<KnowledgeCenter />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/events/individual-meetings" element={<IndividualMeetingsPage />} />
              <Route path="/events/webinars" element={<WebinarsPage />} />
              <Route path="/events/team-meetings" element={<TeamMeetingsPage />} />
              <Route path="/events/register/:eventId" element={<EventGuestRegistration />} />
              <Route path="/infolink/:slug" element={<InfoLinkPage />} />
              <Route path="/zdrowa-wiedza" element={<HealthyKnowledge />} />
              <Route path="/zdrowa-wiedza/player/:id" element={<HealthyKnowledgePlayer />} />
              <Route path="/zdrowa-wiedza/:slug" element={<HealthyKnowledgePublicPage />} />
              <Route path="/page/:slug" element={<Page />} />
              <Route path="/html/:slug" element={<HtmlPage />} />
              <Route path="/calculator" element={<Navigate to="/calculator/influencer" replace />} />
              <Route path="/calculator/influencer" element={<CommissionCalculatorPage />} />
              <Route path="/calculator/specialist" element={<SpecialistCalculatorPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ProfileCompletionGuard>
        
        {/* Chat widgets - inside BrowserRouter to access location */}
        <ChatWidgetsWrapper />
      </BrowserRouter>
      <CookieConsentBanner />
      
      {/* Only show banners for logged in users after FRESH login (not refresh) */}
      {shouldShowBanners && (
        <>
          {/* BANNER PRIORITY ORDER:
              1. Daily Signal ALWAYS first after login
              2. Info Banners sequentially by priority (after Signal dismissed)
              3. No Info Banner can appear before Daily Signal
          */}
          {!dailySignalDismissed ? (
            <DailySignalBanner onDismiss={handleDailySignalDismiss} />
          ) : readyForInfoBanners && !infoBannersComplete && rolesReady ? (
            <ImportantInfoBanner 
              key={`info-banner-${loginTrigger}`}
              onDismiss={handleInfoBannerDismiss}
              bannerIndex={currentInfoBannerIndex}
              onComplete={handleInfoBannersComplete}
            />
          ) : null}
        </>
      )}
      
      {/* Support Form Dialog - available for all users */}
      <SupportFormDialog 
        open={isSupportDialogOpen} 
        onOpenChange={setIsSupportDialogOpen} 
      />
    </TooltipProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider defaultTheme="system" storageKey="pure-life-theme">
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
