export interface HeroAvatar { id: string; url: string; }
export interface TrustedLogo { id: string; url: string; alt: string; link?: string; heightPx?: number; }
export interface FeatureItem { id: string; icon: string; title: string; description: string; }
export interface StatItem { id: string; icon: string; value: string; label: string; }

/** Link target kind — informational, url is always the resolved final value. */
export type CtaKind = 'external' | 'route' | 'anchor';
export interface CtaConfig { text: string; url: string; kind?: CtaKind; }

/** Hero mockup — either static image or embedded video (MP4/YouTube/Vimeo). */
export interface HeroMedia {
  kind: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  videoPoster?: string;
  videoAutoplay?: boolean;
}


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
  widgets?: Widget[];
  header?: {
    logo?: HeaderLogo;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    titleLine3: string;
    description: string;
    /** @deprecated use hero.primaryCta */ primaryCtaText?: string;
    /** @deprecated use hero.primaryCta */ primaryCtaUrl?: string;
    /** @deprecated use hero.secondaryCta */ secondaryCtaText?: string;
    /** @deprecated use hero.secondaryCta */ secondaryCtaUrl?: string;
    primaryCta?: CtaConfig;
    secondaryCta?: CtaConfig;
    socialProofText: string;
    avatars: HeroAvatar[];
    /** @deprecated use hero.media */ mockupImage?: string;
    media?: HeroMedia;
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
    /** @deprecated use community.cta */ ctaText?: string;
    /** @deprecated use community.cta */ ctaUrl?: string;
    cta?: CtaConfig;
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
  | 'card' | 'stat' | 'avatar' | 'logo' | 'video' | 'section' | 'bullet'
  | 'widget';

/** Dynamic widgets added via the palette. Rendered below the fixed sections. */
export type WidgetKind =
  | 'container' | 'grid' | 'section' | 'collapsible'
  | 'heading' | 'text' | 'image' | 'video' | 'button' | 'icon'
  | 'card' | 'stat' | 'bullet-list' | 'logo-row'
  | 'divider' | 'spacer';

export interface Widget {
  id: string;
  kind: WidgetKind;
  props: Record<string, any>;
  children?: Widget[];
  style?: ElementStyle;
}

