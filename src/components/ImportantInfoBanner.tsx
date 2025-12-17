import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

interface ImportantInfoBannerData {
  id: string;
  title: string;
  content: string;
  display_frequency: string;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  priority: number;
  scheduled_date: string | null;
  image_url: string | null;
}

interface ImportantInfoBannerProps {
  onDismiss: () => void;
}

export const ImportantInfoBanner: React.FC<ImportantInfoBannerProps> = ({ onDismiss }) => {
  const { user, isClient, isPartner, isSpecjalista, loading: authLoading } = useAuth();
  const [banner, setBanner] = useState<ImportantInfoBannerData | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    
    checkAndShowBanner();
  }, [user, authLoading]);

  const checkAndShowBanner = async () => {
    try {
      // Get active banners
      const { data: banners, error } = await supabase
        .from('important_info_banners')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !banners || banners.length === 0) {
        setLoading(false);
        return;
      }

      // Filter by role visibility and scheduled date
      const now = new Date();
      const visibleBanners = banners.filter((b: ImportantInfoBannerData) => {
        // Check scheduled date - only show if scheduled_date is null or in the past
        if (b.scheduled_date && new Date(b.scheduled_date) > now) {
          return false;
        }
        
        if (isClient && b.visible_to_clients) return true;
        if (isPartner && b.visible_to_partners) return true;
        if (isSpecjalista && b.visible_to_specjalista) return true;
        return false;
      });

      if (visibleBanners.length === 0) {
        setLoading(false);
        return;
      }

      // Get user's dismissed banners
      const { data: dismissedBanners } = await supabase
        .from('user_dismissed_banners')
        .select('banner_id')
        .eq('user_id', user.id);

      const dismissedIds = dismissedBanners?.map(d => d.banner_id) || [];

      // Find first banner that should be shown
      for (const b of visibleBanners) {
        const isDismissed = dismissedIds.includes(b.id);
        
        // If display_frequency is 'once' and already dismissed, skip
        if (b.display_frequency === 'once' && isDismissed) {
          continue;
        }
        
        // If display_frequency is 'every_login', check session storage
        if (b.display_frequency === 'every_login') {
          const sessionKey = `info_banner_shown_${b.id}`;
          if (sessionStorage.getItem(sessionKey)) {
            continue;
          }
        }

        setBanner(b);
        setShowBanner(true);
        break;
      }
    } catch (error) {
      console.error('Error checking info banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!user || !banner) return;

    try {
      if (banner.display_frequency === 'once') {
        // Record dismissal permanently
        await supabase
          .from('user_dismissed_banners')
          .upsert({
            user_id: user.id,
            banner_id: banner.id,
            dismissed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,banner_id'
          });
      } else {
        // Mark as shown in this session
        sessionStorage.setItem(`info_banner_shown_${banner.id}`, 'true');
      }

      setShowBanner(false);
      onDismiss();
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  if (loading || !showBanner || !banner) {
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
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-2xl font-semibold text-foreground animate-pulse">
            {banner.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {banner.image_url && (
            <div className="flex justify-center">
              <img 
                src={banner.image_url} 
                alt="" 
                className="max-h-48 rounded-lg object-contain"
              />
            </div>
          )}
          <div 
            className="text-base text-center text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: banner.content }}
          />
        </div>

        <DialogDescription className="sr-only">
          Ważna informacja od administratora
        </DialogDescription>

        <div className="flex justify-center pt-2">
          <Button 
            onClick={handleDismiss}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
          >
            Zrozumiałem/am
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
