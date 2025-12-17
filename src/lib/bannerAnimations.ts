// Banner animation utilities for Daily Signal and Important Info banners

export type AnimationType = 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'scale-in';
export type AnimationIntensity = 'off' | 'subtle' | 'enhanced';

export const ANIMATION_TYPES: { value: AnimationType; label: string }[] = [
  { value: 'none', label: 'Brak animacji' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'scale-in', label: 'Scale In (Zoom)' },
];

export const ANIMATION_INTENSITIES: { value: AnimationIntensity; label: string }[] = [
  { value: 'off', label: 'Wyłączona' },
  { value: 'subtle', label: 'Subtelna (domyślna)' },
  { value: 'enhanced', label: 'Wzmocniona' },
];

// Animation class mappings
export const BANNER_ANIMATIONS: Record<AnimationType, Record<Exclude<AnimationIntensity, 'off'>, string>> = {
  'none': {
    subtle: '',
    enhanced: '',
  },
  'fade-in': {
    subtle: 'animate-banner-fade-in-subtle',
    enhanced: 'animate-banner-fade-in-enhanced',
  },
  'slide-up': {
    subtle: 'animate-banner-slide-up-subtle',
    enhanced: 'animate-banner-slide-up-enhanced',
  },
  'slide-down': {
    subtle: 'animate-banner-slide-down-subtle',
    enhanced: 'animate-banner-slide-down-enhanced',
  },
  'scale-in': {
    subtle: 'animate-banner-scale-in-subtle',
    enhanced: 'animate-banner-scale-in-enhanced',
  },
};

export function getBannerAnimationClass(
  animationType: AnimationType = 'fade-in',
  intensity: AnimationIntensity = 'subtle'
): string {
  if (intensity === 'off' || animationType === 'none') {
    return '';
  }
  return BANNER_ANIMATIONS[animationType]?.[intensity] || '';
}

// Track banner interaction for AI statistics
export async function trackBannerInteraction(
  supabase: any,
  params: {
    bannerType: 'signal' | 'info';
    bannerId: string;
    userId: string;
    userRole: string | null | undefined;
    interactionType: 'view' | 'accept' | 'disable' | 'skip';
    reactionTimeMs?: number;
    bannerTone?: string;
    contentLength?: number;
    hasAnimation?: boolean;
    animationLevel?: string | null;
    compassStage?: string;
  }
): Promise<void> {
  try {
    const hour = new Date().getHours();
    const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const dayOfWeek = new Date().getDay();

    await supabase.from('banner_interactions').insert({
      banner_type: params.bannerType,
      banner_id: params.bannerId,
      user_id: params.userId,
      user_role: params.userRole,
      interaction_type: params.interactionType,
      time_of_day: timeOfDay,
      day_of_week: dayOfWeek,
      reaction_time_ms: params.reactionTimeMs || null,
      banner_tone: params.bannerTone || null,
      content_length: params.contentLength || null,
      has_animation: params.hasAnimation || false,
      animation_level: params.animationLevel || null,
      compass_stage: params.compassStage || null,
    });
  } catch (error) {
    console.error('Error tracking banner interaction:', error);
  }
}

// Title styling types
export interface TitleStyling {
  title_bold: boolean;
  title_large: boolean;
  title_accent_color: boolean;
  title_underline: boolean;
  title_shadow: boolean;
  title_custom_color: string | null;
}

export function getTitleClasses(styling: Partial<TitleStyling>): string {
  const classes: string[] = ['text-foreground'];
  
  if (styling.title_bold) classes.push('font-bold');
  if (styling.title_large) classes.push('text-3xl');
  else classes.push('text-2xl');
  if (styling.title_accent_color) classes.push('text-primary');
  if (styling.title_underline) classes.push('underline decoration-2');
  if (styling.title_shadow) classes.push('drop-shadow-md');
  
  return classes.join(' ');
}

export function getTitleStyle(styling: Partial<TitleStyling>): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  if (styling.title_custom_color) {
    style.color = styling.title_custom_color;
  }
  
  return style;
}
