import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatWidget } from "@/components/ChatWidget";
import { MedicalChatWidget } from "@/components/MedicalChatWidget";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { ImportantInfoBanner } from "@/components/ImportantInfoBanner";
import { DailySignalBanner } from "@/components/DailySignalBanner";
import { ProfileCompletionGuard } from "@/components/profile/ProfileCompletionGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useDynamicMetaTags } from "@/hooks/useDynamicMetaTags";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

const queryClient = new QueryClient();

const AppContent = () => {
  useDynamicMetaTags();
  const { loginTrigger, profile, user } = useAuth();
  
  // Banner display state - SIGNAL first, then INFO banners sequentially
  const [dailySignalDismissed, setDailySignalDismissed] = useState(false);
  const [currentInfoBannerIndex, setCurrentInfoBannerIndex] = useState(0);
  const [infoBannersComplete, setInfoBannersComplete] = useState(false);

  // Check if user is fully approved
  const isFullyApproved = user ? (profile?.guardian_approved === true && profile?.admin_approved === true) : true;

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
          
          <MedicalChatWidget />
          <ChatWidget />
        </>
      )}
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ThemeProvider defaultTheme="system" storageKey="pure-life-theme">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
