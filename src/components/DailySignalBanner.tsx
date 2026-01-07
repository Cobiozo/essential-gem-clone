import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { getBannerAnimationClass, trackBannerInteraction, AnimationType, AnimationIntensity } from '@/lib/bannerAnimations';
import { cn } from '@/lib/utils';

interface DailySignal {
  id: string;
  main_message: string;
  explanation: string;
  signal_type?: string;
}

interface SignalSettings {
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  display_frequency: 'daily' | 'every_login';
  animation_type: AnimationType;
  animation_intensity: AnimationIntensity;
}

interface UserPreferences {
  id: string;
  user_id: string;
  show_daily_signal: boolean;
  last_signal_shown_at: string | null;
  last_signal_id: string | null;
}

interface DailySignalBannerProps {
  onDismiss?: () => void;
}

export const DailySignalBanner: React.FC<DailySignalBannerProps> = ({ onDismiss }) => {
  const { user, userRole, isClient, isPartner, isSpecjalista, isAdmin, loading: authLoading, rolesReady, loginTrigger } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [signal, setSignal] = useState<DailySignal | null>(null);
  const [settings, setSettings] = useState<SignalSettings | null>(null);
  const [checked, setChecked] = useState(false);
  const bannerShownAtRef = useRef<number>(0);

  // Reset checked state when loginTrigger changes (new login)
  useEffect(() => {
    if (loginTrigger > 0) {
      setChecked(false);
      setShowBanner(false);
      setSignal(null);
    }
  }, [loginTrigger]);

  useEffect(() => {
    let mounted = true;

    const checkAndShow = async () => {
      // Wait for auth AND roles to be fully ready
      if (authLoading || !rolesReady || !user || checked) {
        return;
      }
      
      // Mark as checked to prevent re-running
      setChecked(true);

      try {
        // CRITICAL: Check if this is a real login (not refresh/tab switch)
        // Używa WŁASNEJ flagi - niezależnie od ImportantInfoBanner
        const shouldShowBanner = sessionStorage.getItem('show_daily_signal');
        console.log('[DailySignalBanner] show_daily_signal:', shouldShowBanner);
        if (!shouldShowBanner) {
          // Not a fresh login - don't show banner
          console.log('[DailySignalBanner] No login flag - skipping');
          onDismiss?.();
          return;
        }
        // Usuń SWOJĄ flagę - ImportantInfoBanner ma własną
        sessionStorage.removeItem('show_daily_signal');

        // Check if user is fully approved (guardian + admin)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('guardian_approved, admin_approved')
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('[DailySignalBanner] Profile approval:', profileData);
        if (!profileData || !profileData.guardian_approved || !profileData.admin_approved) {
          console.log('[DailySignalBanner] User not approved - skipping');
          onDismiss?.();
          return;
        }

        // 1. Check global settings - ADMIN SETTINGS HAVE ABSOLUTE PRIORITY
        const { data: settingsData, error: settingsError } = await supabase
          .from('daily_signal_settings')
          .select('*')
          .limit(1)
          .single();

        if (!mounted) return;

        if (settingsError || !settingsData?.is_enabled) {
          onDismiss?.();
          return;
        }

        const typedSettings = settingsData as SignalSettings;
        setSettings(typedSettings);

        // 2. Check role visibility - Admin sees everything
        const isVisible = 
          isAdmin ||
          (isClient && typedSettings.visible_to_clients) ||
          (isPartner && typedSettings.visible_to_partners) ||
          (isSpecjalista && typedSettings.visible_to_specjalista);

        if (!isVisible) {
          onDismiss?.();
          return;
        }

        // 3. Check user preferences - but ADMIN display_frequency overrides local blocks
        const { data: preferences } = await supabase
          .from('user_signal_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!mounted) return;

        // If user explicitly disabled signals, respect that (unless we want to override)
        if (preferences && !(preferences as UserPreferences).show_daily_signal) {
          onDismiss?.();
          return;
        }

        // 4. CRITICAL: Admin display_frequency has ABSOLUTE PRIORITY over cache
        const displayFrequency = typedSettings.display_frequency || 'daily';
        
        if (displayFrequency === 'every_login') {
          // Admin forces every login - IGNORE all session/local storage blocks
          // Only check if already shown in THIS exact page load (via state, not storage)
          // Session storage check is removed for every_login mode
        } else {
          // daily mode - check if 24 hours passed since last shown
          if (preferences && (preferences as UserPreferences).last_signal_shown_at) {
            const lastShown = new Date((preferences as UserPreferences).last_signal_shown_at!);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
              onDismiss?.();
              return;
            }
          }
        }

        // 5. Get today's signal
        const today = new Date().toISOString().split('T')[0];
        
        // First try to get a signal scheduled for today
        let { data: todaySignal } = await supabase
          .from('daily_signals')
          .select('*')
          .eq('scheduled_date', today)
          .eq('is_approved', true)
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        // If no scheduled signal, get a random approved one
        if (!todaySignal) {
          const { data: randomSignals } = await supabase
            .from('daily_signals')
            .select('*')
            .eq('is_approved', true)
            .limit(10);

          if (!mounted) return;

          if (randomSignals && randomSignals.length > 0) {
            todaySignal = randomSignals[Math.floor(Math.random() * randomSignals.length)];
          }
        }

        if (!mounted) return;

        if (todaySignal) {
          setSignal(todaySignal as DailySignal);
          setShowBanner(true);
          bannerShownAtRef.current = Date.now();
          
          // Track view interaction
          trackBannerInteraction(supabase, {
            bannerType: 'signal',
            bannerId: todaySignal.id,
            userId: user.id,
            userRole: userRole ? String(userRole) : null,
            interactionType: 'view',
            bannerTone: todaySignal.signal_type || 'supportive',
            contentLength: todaySignal.main_message?.length || 0,
            hasAnimation: typedSettings.animation_intensity !== 'off',
            animationLevel: typedSettings.animation_intensity,
          });
        } else {
          onDismiss?.();
        }
      } catch (error) {
        console.error('Error checking daily signal:', error);
        if (mounted) {
          onDismiss?.();
        }
      }
    };

    checkAndShow();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, rolesReady, checked, isAdmin, isClient, isPartner, isSpecjalista, onDismiss, userRole]);

  const handleAcceptSignal = async () => {
    if (!user || !signal) return;

    const reactionTime = Date.now() - bannerShownAtRef.current;

    try {
      // Track accept interaction
      trackBannerInteraction(supabase, {
        bannerType: 'signal',
        bannerId: signal.id,
        userId: user.id,
        userRole: userRole ? String(userRole) : null,
        interactionType: 'accept',
        reactionTimeMs: reactionTime,
        bannerTone: signal.signal_type || 'supportive',
        contentLength: signal.main_message?.length || 0,
        hasAnimation: settings?.animation_intensity !== 'off',
        animationLevel: settings?.animation_intensity,
      });

      // Upsert user preferences with timestamp
      await supabase
        .from('user_signal_preferences')
        .upsert({
          user_id: user.id,
          show_daily_signal: true,
          last_signal_shown_at: new Date().toISOString(),
          last_signal_id: signal.id
        }, {
          onConflict: 'user_id'
        });

      setShowBanner(false);
      onDismiss?.();
    } catch (error) {
      console.error('Error accepting signal:', error);
    }
  };

  const handleDisableSignal = async () => {
    if (!user) return;

    const reactionTime = Date.now() - bannerShownAtRef.current;

    try {
      // Track disable interaction
      if (signal) {
        trackBannerInteraction(supabase, {
          bannerType: 'signal',
          bannerId: signal.id,
          userId: user.id,
          userRole: userRole ? String(userRole) : null,
          interactionType: 'disable',
          reactionTimeMs: reactionTime,
          bannerTone: signal.signal_type || 'supportive',
          contentLength: signal.main_message?.length || 0,
          hasAnimation: settings?.animation_intensity !== 'off',
          animationLevel: settings?.animation_intensity,
        });
      }

      await supabase
        .from('user_signal_preferences')
        .upsert({
          user_id: user.id,
          show_daily_signal: false,
          last_signal_shown_at: new Date().toISOString(),
          last_signal_id: signal?.id || null
        }, {
          onConflict: 'user_id'
        });

      setShowBanner(false);
      onDismiss?.();
    } catch (error) {
      console.error('Error disabling signal:', error);
    }
  };

  if (!showBanner || !signal) {
    return null;
  }

  const animationClass = getBannerAnimationClass(
    settings?.animation_type || 'fade-in',
    settings?.animation_intensity || 'subtle'
  );

  return (
    <Dialog open={showBanner} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "sm:max-w-md border-0 shadow-2xl [&>button]:hidden",
          animationClass
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Sygnał Dnia
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Main message */}
          <p className="text-xl text-center font-medium text-foreground leading-relaxed">
            "{signal.main_message}"
          </p>
          
          {/* Explanation */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center font-medium">
              Dlaczego dziś ten sygnał?
            </p>
            <p className="text-base text-center text-muted-foreground leading-relaxed">
              {signal.explanation}
            </p>
          </div>
        </div>

        <DialogDescription className="sr-only">
          Codzienny sygnał motywacyjny
        </DialogDescription>

        <div className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleAcceptSignal}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
          >
            Przyjmuję Sygnał Dnia
          </Button>
          
          <Button 
            variant="ghost"
            onClick={handleDisableSignal}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
          >
            Wyłącz Sygnał Dnia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
