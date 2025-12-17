import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import { 
  getBannerAnimationClass, 
  trackBannerInteraction, 
  getTitleClasses, 
  getTitleStyle,
  AnimationType, 
  AnimationIntensity,
  TitleStyling 
} from '@/lib/bannerAnimations';
import { cn } from '@/lib/utils';

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
  // Animation settings
  animation_type: string | null;
  animation_intensity: string | null;
  // Title styling
  title_bold: boolean | null;
  title_large: boolean | null;
  title_accent_color: boolean | null;
  title_underline: boolean | null;
  title_shadow: boolean | null;
  title_custom_color: string | null;
}

interface ImportantInfoBannerProps {
  onDismiss: () => void;
  bannerIndex: number;
  onComplete: () => void;
}

export const ImportantInfoBanner: React.FC<ImportantInfoBannerProps> = ({ 
  onDismiss, 
  bannerIndex,
  onComplete 
}) => {
  const { user, userRole, isClient, isPartner, isSpecjalista, loading: authLoading, rolesReady, loginTrigger } = useAuth();
  const [banner, setBanner] = useState<ImportantInfoBannerData | null>(null);
  const [allBanners, setAllBanners] = useState<ImportantInfoBannerData[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [checked, setChecked] = useState(false);
  const bannerShownAtRef = useRef<number>(0);

  // Reset states when loginTrigger changes (new login)
  useEffect(() => {
    if (loginTrigger > 0) {
      setChecked(false);
      setShowBanner(false);
      setBanner(null);
      setAllBanners([]);
    }
  }, [loginTrigger]);

  useEffect(() => {
    // Wait for auth AND roles to be fully ready
    if (authLoading || !rolesReady || !user || checked) {
      return;
    }
    
    // Mark as checked to prevent re-running
    setChecked(true);
    loadAllBanners();
  }, [user, authLoading, rolesReady, checked]);

  // When bannerIndex changes, show the next banner
  useEffect(() => {
    if (allBanners.length > 0 && bannerIndex < allBanners.length) {
      showBannerAtIndex(bannerIndex);
    } else if (allBanners.length > 0 && bannerIndex >= allBanners.length) {
      // All banners shown
      onComplete();
    }
  }, [bannerIndex, allBanners]);

  const loadAllBanners = async () => {
    try {
      // Get all active banners sorted by priority (highest first)
      const { data: banners, error } = await supabase
        .from('important_info_banners')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !banners || banners.length === 0) {
        onComplete();
        return;
      }

      // Filter by role visibility and scheduled date
      const now = new Date();
      const visibleBanners = (banners as ImportantInfoBannerData[]).filter((b) => {
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
        onComplete();
        return;
      }

      // Get user's dismissed banners
      const { data: dismissedBanners } = await supabase
        .from('user_dismissed_banners')
        .select('banner_id')
        .eq('user_id', user.id);

      const dismissedIds = dismissedBanners?.map(d => d.banner_id) || [];

      // Filter banners based on display frequency and dismissal status
      // ADMIN display_frequency has ABSOLUTE PRIORITY
      const bannersToShow: ImportantInfoBannerData[] = [];
      
      for (const b of visibleBanners as ImportantInfoBannerData[]) {
        const isDismissed = dismissedIds.includes(b.id);
        
        if (b.display_frequency === 'every_login') {
          // Admin forces every_login - ALWAYS show, NO session/cache blocks
          // loginTrigger reset handles preventing double-show in same login
          bannersToShow.push(b);
        } else {
          // display_frequency is 'once' - show only if not dismissed
          if (!isDismissed) {
            bannersToShow.push(b);
          }
        }
      }

      if (bannersToShow.length === 0) {
        onComplete();
        return;
      }

      setAllBanners(bannersToShow);
      // Show first banner
      showBannerAtIndex(0, bannersToShow);
    } catch (error) {
      console.error('Error loading info banners:', error);
      onComplete();
    }
  };

  const showBannerAtIndex = (index: number, bannersList?: ImportantInfoBannerData[]) => {
    const list = bannersList || allBanners;
    if (index >= list.length) {
      onComplete();
      return;
    }

    const bannerToShow = list[index];
    setBanner(bannerToShow);
    setShowBanner(true);
    bannerShownAtRef.current = Date.now();

    // Track view interaction
    trackBannerInteraction(supabase, {
      bannerType: 'info',
      bannerId: bannerToShow.id,
      userId: user!.id,
      userRole: userRole ? String(userRole) : null,
      interactionType: 'view',
      contentLength: bannerToShow.content?.length || 0,
      hasAnimation: bannerToShow.animation_intensity !== 'off',
      animationLevel: bannerToShow.animation_intensity || 'subtle',
    });
  };

  const handleDismiss = async () => {
    if (!user || !banner) return;

    const reactionTime = Date.now() - bannerShownAtRef.current;

    try {
      // Track accept interaction
      trackBannerInteraction(supabase, {
        bannerType: 'info',
        bannerId: banner.id,
        userId: user.id,
        userRole: userRole ? String(userRole) : null,
        interactionType: 'accept',
        reactionTimeMs: reactionTime,
        contentLength: banner.content?.length || 0,
        hasAnimation: banner.animation_intensity !== 'off',
        animationLevel: banner.animation_intensity || 'subtle',
      });

      if (banner.display_frequency === 'once') {
        // Record dismissal permanently for 'once' banners
        await supabase
          .from('user_dismissed_banners')
          .upsert({
            user_id: user.id,
            banner_id: banner.id,
            dismissed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,banner_id'
          });
      }
      // For every_login mode - no sessionStorage needed, loginTrigger handles reset

      setShowBanner(false);
      // Trigger parent to move to next banner
      onDismiss();
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  if (!showBanner || !banner) {
    return null;
  }

  const animationClass = getBannerAnimationClass(
    (banner.animation_type as AnimationType) || 'fade-in',
    (banner.animation_intensity as AnimationIntensity) || 'subtle'
  );

  const titleStyling: TitleStyling = {
    title_bold: banner.title_bold ?? true,
    title_large: banner.title_large ?? false,
    title_accent_color: banner.title_accent_color ?? false,
    title_underline: banner.title_underline ?? false,
    title_shadow: banner.title_shadow ?? false,
    title_custom_color: banner.title_custom_color,
  };

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
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle 
            className={cn(getTitleClasses(titleStyling))}
            style={getTitleStyle(titleStyling)}
          >
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
