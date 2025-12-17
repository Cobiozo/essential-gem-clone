import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';

interface DailySignal {
  id: string;
  main_message: string;
  explanation: string;
}

interface SignalSettings {
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
}

interface UserPreferences {
  id: string;
  user_id: string;
  show_daily_signal: boolean;
  last_signal_shown_at: string | null;
  last_signal_id: string | null;
}

export const DailySignalBanner: React.FC = () => {
  const { user, userRole, isClient, isPartner, isSpecjalista, loading: authLoading } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [signal, setSignal] = useState<DailySignal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    
    checkAndShowSignal();
  }, [user, authLoading]);

  const checkAndShowSignal = async () => {
    try {
      // 1. Check global settings
      const { data: settings, error: settingsError } = await supabase
        .from('daily_signal_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError || !settings?.is_enabled) {
        setLoading(false);
        return;
      }

      // 2. Check role visibility
      const typedSettings = settings as SignalSettings;
      const isVisible = 
        (isClient && typedSettings.visible_to_clients) ||
        (isPartner && typedSettings.visible_to_partners) ||
        (isSpecjalista && typedSettings.visible_to_specjalista);

      if (!isVisible) {
        setLoading(false);
        return;
      }

      // 3. Check user preferences
      const { data: preferences, error: prefError } = await supabase
        .from('user_signal_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If preferences exist and user disabled signals, don't show
      if (preferences && !(preferences as UserPreferences).show_daily_signal) {
        setLoading(false);
        return;
      }

      // 4. Check if 24 hours passed since last shown
      if (preferences && (preferences as UserPreferences).last_signal_shown_at) {
        const lastShown = new Date((preferences as UserPreferences).last_signal_shown_at!);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setLoading(false);
          return;
        }
      }

      // 5. Get today's signal
      const today = new Date().toISOString().split('T')[0];
      
      // First try to get a signal scheduled for today
      let { data: todaySignal, error: signalError } = await supabase
        .from('daily_signals')
        .select('*')
        .eq('scheduled_date', today)
        .eq('is_approved', true)
        .limit(1)
        .maybeSingle();

      // If no scheduled signal, get a random approved one
      if (!todaySignal) {
        const { data: randomSignals } = await supabase
          .from('daily_signals')
          .select('*')
          .eq('is_approved', true)
          .limit(10);

        if (randomSignals && randomSignals.length > 0) {
          todaySignal = randomSignals[Math.floor(Math.random() * randomSignals.length)];
        }
      }

      if (todaySignal) {
        setSignal(todaySignal as DailySignal);
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking daily signal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSignal = async () => {
    if (!user || !signal) return;

    try {
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
    } catch (error) {
      console.error('Error accepting signal:', error);
    }
  };

  const handleDisableSignal = async () => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Error disabling signal:', error);
    }
  };

  if (loading || !showBanner || !signal) {
    return null;
  }

  return (
    <Dialog open={showBanner} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md border-0 shadow-2xl [&>button]:hidden"
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
