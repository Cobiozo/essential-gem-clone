import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { ImportantInfoBanner } from "@/components/ImportantInfoBanner";
import { DailySignalBanner } from "@/components/DailySignalBanner";
import { ProfileCompletionGuard } from "@/components/profile/ProfileCompletionGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useDynamicMetaTags } from "@/hooks/useDynamicMetaTags";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";

// Lazy load chat widgets - only mount when first opened
const ChatWidget = lazy(() => import("@/components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const MedicalChatWidget = lazy(() => import("@/components/MedicalChatWidget").then(m => ({ default: m.MedicalChatWidget })));

// Eager load - critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load - heavy pages
const Admin = lazy(() => import("./pages/Admin"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const Page = lazy(() => import("./pages/Page"));
const Training = lazy(() => import("./pages/Training"));
const TrainingModule = lazy(() => import("./pages/TrainingModule"));
const KnowledgeCenter = lazy(() => import("./pages/KnowledgeCenter"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent = () => {
  useDynamicMetaTags();
  const { loginTrigger, profile, user, rolesReady, isFreshLogin, setIsFreshLogin } = useAuth();
  
  // Banner display state - SIGNAL first, then INFO banners sequentially
  const [dailySignalDismissed, setDailySignalDismissed] = useState(false);
  const [currentInfoBannerIndex, setCurrentInfoBannerIndex] = useState(0);
  const [infoBannersComplete, setInfoBannersComplete] = useState(false);
  const [readyForInfoBanners, setReadyForInfoBanners] = useState(false);
  const [shouldShowBanners, setShouldShowBanners] = useState(false);

  // Log auth state changes for debugging
  useEffect(() => {
    console.log('[App] Auth state:', { user: !!user, isFreshLogin, loginTrigger, rolesReady, shouldShowBanners });
  }, [user, isFreshLogin, loginTrigger, rolesReady, shouldShowBanners]);

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
  
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProfileCompletionGuard>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/my-account" element={<MyAccount />} />
              <Route path="/training" element={<Training />} />
              <Route path="/training/:moduleId" element={<TrainingModule />} />
              <Route path="/knowledge" element={<KnowledgeCenter />} />
              <Route path="/page/:slug" element={<Page />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ProfileCompletionGuard>
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

      {/* Chat widgets - always visible for logged in users */}
      {user && (
        <>
          <Suspense fallback={null}>
            <MedicalChatWidget />
          </Suspense>
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
        </>
      )}
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
