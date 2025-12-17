import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatWidget } from "@/components/ChatWidget";
import { MedicalChatWidget } from "@/components/MedicalChatWidget";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { ImportantInfoBanner } from "@/components/ImportantInfoBanner";
import { DailySignalBanner } from "@/components/DailySignalBanner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useDynamicMetaTags } from "@/hooks/useDynamicMetaTags";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MyAccount from "./pages/MyAccount";
import Page from "./pages/Page";
import Training from "./pages/Training";
import TrainingModule from "./pages/TrainingModule";
import KnowledgeCenter from "./pages/KnowledgeCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useDynamicMetaTags();
  
  // Banner display state - SIGNAL first, then INFO banners sequentially
  const [dailySignalDismissed, setDailySignalDismissed] = useState(false);
  const [currentInfoBannerIndex, setCurrentInfoBannerIndex] = useState(0);
  const [infoBannersComplete, setInfoBannersComplete] = useState(false);

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
      </BrowserRouter>
      <CookieConsentBanner />
      
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
