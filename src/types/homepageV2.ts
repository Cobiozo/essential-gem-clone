export interface HeroAvatar { id: string; url: string; }
export interface TrustedLogo { id: string; url: string; alt: string; link?: string; heightPx?: number; }
export interface FeatureItem { id: string; icon: string; title: string; description: string; }
export interface StatItem { id: string; icon: string; value: string; label: string; }

/** Optional per-element style overrides (merged into inline style). */
export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontWeight?: number | string;
  textAlign?: 'left' | 'center' | 'right';
  textTransform?: 'uppercase' | 'lowercase' | 'none' | 'capitalize';
  letterSpacing?: string;
  lineHeight?: string;
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: number;
  /** Layout / free positioning (drag&drop + resize). */
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  width?: string;
  height?: string;
  zIndex?: number;
}

export interface HeaderLogo { url: string; alt: string; link?: string; heightPx?: number; }

export interface HomepageV2Content {
  header?: {
    logo?: HeaderLogo;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    titleLine3: string;
    description: string;
    primaryCtaText: string;
    primaryCtaUrl: string;
    secondaryCtaText: string;
    secondaryCtaUrl: string;
    socialProofText: string;
    avatars: HeroAvatar[];
    mockupImage: string;
  };
  features: {
    eyebrow: string;
    title: string;
    items: FeatureItem[];
  };
  stats: {
    items: StatItem[];
  };
  community: {
    eyebrow: string;
    title: string;
    bullets: string[];
    ctaText: string;
    ctaUrl: string;
    backgroundImage: string;
    overlayText: string;
    videoUrl: string;
    videoPoster?: string;
    videoAutoplay?: boolean;
    peopleCount: string;
    avatars: HeroAvatar[];
  };
  trustedBy: {
    eyebrow: string;
    logos: TrustedLogo[];
  };
  seo: {
    title: string;
    description: string;
  };
  /** Optional style overrides keyed by element path (e.g. "hero.titleLine1"). */
  styles?: Record<string, ElementStyle>;
}

export type HomepageVariant = 'v1' | 'v2';

export type EditElementType =
  | 'text' | 'heading' | 'image' | 'icon' | 'button'
  | 'card' | 'stat' | 'avatar' | 'logo' | 'video' | 'section' | 'bullet';
