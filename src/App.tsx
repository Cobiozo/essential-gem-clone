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
  const { loginTrigger, profile, user } = useAuth();
  
  // Banner display state - SIGNAL first, then INFO banners sequentially
  const [dailySignalDismissed, setDailySignalDismissed] = useState(false);
  const [currentInfoBannerIndex, setCurrentInfoBannerIndex] = useState(0);
  const [infoBannersComplete, setInfoBannersComplete] = useState(false);

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

  // Reset banner states on each new login (loginTrigger increments on SIGNED_IN)
  useEffect(() => {
    if (loginTrigger > 0) {
      setDailySignalDismissed(false);
      setCurrentInfoBannerIndex(0);
      setInfoBannersComplete(false);
    }
  }, [loginTrigger]);

  // Handle Daily Signal dismissal - then show Info banners
  const handleDailySignalDismiss = useCallback(() => {
    setDailySignalDismissed(true);
  }, []);

  // Handle Info Banner dismissal - move to next or complete
  const handleInfoBannerDismiss = useCallback(() => {
    setCurrentInfoBannerIndex(prev => prev + 1);
  }, []);

  // Mark all info banners as complete (called when no more to show)
  const handleInfoBannersComplete = useCallback(() => {
    setInfoBannersComplete(true);
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
      
      {/* Only show banners and widgets for fully approved users */}
      {isFullyApproved && (
        <>
          {/* BANNER PRIORITY ORDER:
              1. Daily Signal ALWAYS first after login
              2. Info Banners sequentially by priority (after Signal dismissed)
              3. No Info Banner can appear before Daily Signal
          */}
          {!dailySignalDismissed ? (
            <DailySignalBanner onDismiss={handleDailySignalDismiss} />
          ) : !infoBannersComplete ? (
            <ImportantInfoBanner 
              onDismiss={handleInfoBannerDismiss}
              bannerIndex={currentInfoBannerIndex}
              onComplete={handleInfoBannersComplete}
            />
          ) : null}
          
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
