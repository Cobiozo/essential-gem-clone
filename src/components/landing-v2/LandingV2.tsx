import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, Play, Check, ImagePlus } from 'lucide-react';
import { useHomepageV2Content } from '@/hooks/useHomepageConfig';
import type { HomepageV2Content, EditElementType, ElementStyle, CtaConfig } from '@/types/homepageV2';
import { EditProvider, E, useEdit } from './editor/EditContext';
import { videoMime } from '@/lib/videoMime';
import { Header } from '@/components/Header';
import { usePublishedPages } from '@/hooks/usePublishedPages';
import { useSystemTexts } from '@/hooks/useSystemTexts';
import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';
import { WidgetRenderer } from './widgets/WidgetRenderer';


/** Render a CTA link — internal <Link>, or <a> for anchors / external URLs. */
function CtaLink({ cta, fallbackUrl, children, className, style }: { cta?: CtaConfig; fallbackUrl?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const url = (cta?.url && cta.url.trim()) || fallbackUrl || '#';
  const isExternal = /^https?:\/\//i.test(url);
  const isAnchor = url.startsWith('#');
  if (isExternal) {
    return <a href={url} target="_blank" rel="noreferrer" className={className} style={style}>{children}</a>;
  }
  if (isAnchor) {
    return (
      <a
        href={url}
        className={className}
        style={style}
        onClick={(e) => {
          const id = url.slice(1);
          const el = document.getElementById(id);
          if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }}
      >
        {children}
      </a>
    );
  }
  return <Link to={url} className={className} style={style}>{children}</Link>;
}


import heroMockup from '@/assets/landing-v2/hero-mockup.png';
import communityHero from '@/assets/landing-v2/community-hero.jpg';
import logoPurelife from '@/assets/landing-v2/logo-purelife.png';
import avatarsRow from '@/assets/landing-v2/avatars-row.jpg';

interface Props {
  preferDraft?: boolean;
  overrideContent?: HomepageV2Content;
  editable?: boolean;
  selectedPath?: string | null;
  hoveredPath?: string | null;
  onSelect?: (path: string, type: EditElementType) => void;
  onHover?: (path: string | null) => void;
  onUpdateStyle?: (path: string, patch: Partial<ElementStyle>) => void;
}

/** Parse YouTube/Vimeo URL → embed URL. Returns null for direct file URLs. */
function toEmbedUrl(url: string, autoplay = false): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) {
    const id = yt[1];
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
    if (autoplay) { params.set('autoplay', '1'); params.set('mute', '1'); params.set('playsinline', '1'); }
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) {
    const params = new URLSearchParams({});
    if (autoplay) { params.set('autoplay', '1'); params.set('muted', '1'); }
    return `https://player.vimeo.com/video/${vim[1]}?${params.toString()}`;
  }
  return null;
}




const GOLD = '#B8894A';
const GOLD_SOFT = '#D4A574';
const INK = '#111111';
const SURFACE = '#FBF8F3';

function LucideIcon({ name, className, strokeWidth = 1.5, style }: { name: string; className?: string; strokeWidth?: number; style?: React.CSSProperties }) {
  const Comp = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Comp className={className} strokeWidth={strokeWidth} style={style} />;
}

/** Renders an icon with per-path style + editable wrapping. */
function EditableIcon({ path, name, className, strokeWidth }: { path: string; name: string; className?: string; strokeWidth?: number }) {
  const ctx = useEdit();
  const s = ctx.styles[path] || {};
  const wrapStyle: React.CSSProperties = {};
  const iconStyle: React.CSSProperties = {};
  if (s.backgroundColor) wrapStyle.backgroundColor = s.backgroundColor;
  if (s.borderRadius) wrapStyle.borderRadius = s.borderRadius;
  if (s.color) iconStyle.color = s.color;
  if (s.fontSize) {
    wrapStyle.width = s.fontSize;
    wrapStyle.height = s.fontSize;
  }
  return (
    <E path={path} type="icon">
      <span className={`inline-flex items-center justify-center ${wrapStyle.backgroundColor || wrapStyle.borderRadius ? 'p-3' : ''}`} style={wrapStyle}>
        <LucideIcon name={name} className={className} strokeWidth={strokeWidth} style={iconStyle} />
      </span>
    </E>
  );
}

function StripAvatar({ index, total = 4, size = 40, ring = 'ring-white', path }: { index: number; total?: number; size?: number; ring?: string; path?: string }) {
  const pct = total === 1 ? 50 : (index / (total - 1)) * 100;
  const inner = (
    <div
      className={`rounded-full overflow-hidden ring-2 ${ring} shadow-sm shrink-0`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarsRow}
        alt=""
        className="h-full object-cover pointer-events-none"
        style={{ width: `${total * 100}%`, objectPosition: `${pct}% center` }}
      />
    </div>
  );
  if (path) return <E path={path} type="avatar">{inner}</E>;
  return inner;
}

const TrustedBadge: React.FC<{ name: string; sub?: string; variant?: 'text' | 'msc' | 'arctic' }> = ({ name, sub, variant = 'text' }) => {
  if (variant === 'msc') {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <div className="w-11 h-11 rounded-full border-2 border-current flex items-center justify-center font-black text-sm tracking-wider">MSC</div>
        <div className="text-[9px] leading-tight max-w-[80px] uppercase tracking-wide">
          <div>Fabryka</div><div>Zrównoważonego</div><div>Rybołówstwa</div>
        </div>
      </div>
    );
  }
  if (variant === 'arctic') {
    return (
      <div className="flex flex-col items-center text-neutral-500">
        <div className="flex items-end gap-0.5 leading-none">
          <div className="w-3 h-4 bg-current" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 0)' }} />
          <div className="w-4 h-5 bg-current" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 0)' }} />
          <div className="w-3 h-3 bg-current" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 0)' }} />
        </div>
        <div className="mt-1 border border-current px-2 py-0.5 text-[11px] font-bold tracking-[0.15em]">ARCTIC OIL</div>
        <div className="text-[9px] tracking-[0.3em] mt-0.5">QUALITY</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-neutral-500 font-semibold">
      <div className="tracking-tight text-xl">{name}</div>
      {sub && <div className="text-[10px] tracking-[0.2em] mt-1 uppercase">{sub}</div>}
    </div>
  );
};

const LandingV2Inner: React.FC<Omit<Props, 'preferDraft' | 'overrideContent'> & { content: HomepageV2Content }> = ({ content, editable = false }) => {
  useEffect(() => {
    if (content?.seo) {
      if (content.seo.title) document.title = content.seo.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta && content.seo.description) meta.setAttribute('content', content.seo.description);
    }
  }, [content?.seo]);

  const { hero, features, stats, community, trustedBy } = content;
  const heroMedia = hero.media || { kind: 'image' as const, imageUrl: hero.mockupImage };
  const heroImg = heroMedia.imageUrl || hero.mockupImage || heroMockup;
  const communityImg = community.backgroundImage || communityHero;

  const primaryCta: CtaConfig = hero.primaryCta || { text: hero.primaryCtaText || '', url: hero.primaryCtaUrl || '' };
  const secondaryCta: CtaConfig = hero.secondaryCta || { text: hero.secondaryCtaText || '', url: hero.secondaryCtaUrl || '' };
  const communityCta: CtaConfig = community.cta || { text: community.ctaText || '', url: community.ctaUrl || '' };

  const { data: publishedPages = [] } = usePublishedPages();
  const { data: systemTextsData = [] } = useSystemTexts();
  const siteLogo = useMemo(() => {
    const logoText = systemTextsData.find((i: any) => i.type === 'site_logo');
    return logoText?.content || newPureLifeLogo;
  }, [systemTextsData]);

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", "Inter", sans-serif' }}>
      {/* ================= TOP BAR (identical to V1) — only on the public page, not in the editor ================= */}
      {!editable && <Header siteLogo={siteLogo} publishedPages={publishedPages} />}

      {/* ================= HERO ================= */}
      <section id="hero" className="relative overflow-hidden">

        <svg className="absolute right-0 top-0 pointer-events-none opacity-70 hidden md:block" width="900" height="900" viewBox="0 0 900 900" fill="none" aria-hidden="true">
          <circle cx="700" cy="200" r="620" stroke={GOLD_SOFT} strokeWidth="1.5" opacity="0.5" />
        </svg>

        <div className="container mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-12 pb-10 sm:pb-14 lg:pb-20 relative">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 lg:gap-6 items-center">
            <div className="space-y-5 sm:space-y-7 lg:space-y-8 max-w-xl">
              {(() => {
                const logo = content.header?.logo;
                const logoUrl = logo?.url || logoPurelife;
                const heightStyle = logo?.heightPx ? { height: logo.heightPx } : undefined;
                const img = (
                  <img
                    src={logoUrl}
                    alt={logo?.alt || 'Pure Life Center'}
                    className={heightStyle ? 'w-auto object-contain -ml-2' : 'h-12 sm:h-14 lg:h-16 w-auto object-contain -ml-2'}
                    style={heightStyle}
                  />
                );
                return <E path="header.logo" type="logo">{img}</E>;
              })()}

              {hero.eyebrow && (
                <E path="hero.eyebrow" type="text">
                  <div className="text-[11px] tracking-[0.35em] font-semibold" style={{ color: GOLD }}>{hero.eyebrow}</div>
                </E>
              )}

              <h1 className="font-bold leading-[1.05] text-[34px] sm:text-5xl md:text-6xl lg:text-[72px] tracking-tight" style={{ color: INK }}>
                <E path="hero.titleLine1" type="heading"><div>{hero.titleLine1}</div></E>
                <E path="hero.titleLine2" type="heading"><div>{hero.titleLine2}</div></E>
                <E path="hero.titleLine3" type="heading"><div style={{ color: GOLD }}>{hero.titleLine3}</div></E>
              </h1>

              {hero.description && (
                <E path="hero.description" type="text">
                  <p className="text-[14px] sm:text-[15px] lg:text-base text-neutral-600 max-w-md leading-relaxed">{hero.description}</p>
                </E>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {primaryCta.text && (
                  <E path="hero.primaryCta" type="button">
                    <CtaLink
                      cta={primaryCta}
                      fallbackUrl="/auth"
                      className="inline-flex items-center gap-2 rounded-lg text-white font-semibold px-5 sm:px-6 py-3 sm:py-3.5 shadow-lg transition hover:opacity-90"
                      style={{ backgroundColor: GOLD, boxShadow: `0 10px 30px -10px ${GOLD}80` }}
                    >
                      {primaryCta.text}
                      <ArrowRight className="w-4 h-4" />
                    </CtaLink>
                  </E>
                )}
                {secondaryCta.text && (
                  <E path="hero.secondaryCta" type="button">
                    <CtaLink cta={secondaryCta} fallbackUrl="#community" className="inline-flex items-center gap-2 text-neutral-900 font-semibold px-3 sm:px-4 py-3 hover:opacity-70 transition">
                      <span className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                      </span>
                      {secondaryCta.text}
                    </CtaLink>
                  </E>
                )}
              </div>

              {(hero.avatars?.length > 0 || hero.socialProofText) && (
                <div className="flex items-center gap-4 pt-3 flex-wrap">
                  <div className="flex -space-x-3">
                    {[0, 1, 2, 3].map((i) => (
                      <StripAvatar key={i} index={i} size={40} ring="ring-white" path={hero.avatars?.[i] ? `hero.avatars[${i}]` : undefined} />
                    ))}
                  </div>
                  {hero.socialProofText && (
                    <E path="hero.socialProofText" type="text">
                      <p className="text-[12px] sm:text-[13px] text-neutral-600 max-w-[220px] leading-snug">{hero.socialProofText}</p>
                    </E>
                  )}
                </div>
              )}
            </div>

            <div className="relative lg:-mr-16 mt-4 lg:mt-0">
              {heroMedia.kind === 'video' && heroMedia.videoUrl ? (() => {
                const url = heroMedia.videoUrl;
                const embed = toEmbedUrl(url, !!heroMedia.videoAutoplay);
                const isFile = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url);
                if (isFile) {
                  return (
                    <E path="hero.media" type="video">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={heroMedia.videoPoster || heroImg}
                        autoPlay={!!heroMedia.videoAutoplay}
                        muted={!!heroMedia.videoAutoplay}
                        className="w-full h-auto rounded-2xl bg-black shadow-2xl aspect-video object-cover"
                      >
                        <source src={url} type={videoMime(url)} />
                      </video>
                    </E>
                  );
                }
                if (embed) {
                  return (
                    <E path="hero.media" type="video">
                      <iframe
                        src={embed}
                        title="Hero wideo"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video rounded-2xl shadow-2xl"
                        style={{ border: 0 }}
                      />
                    </E>
                  );
                }
                return (
                  <E path="hero.media" type="image">
                    <img src={heroImg} alt="" className="w-full h-auto object-contain drop-shadow-2xl" loading="eager" />
                  </E>
                );
              })() : (
                <E path="hero.media" type="image">
                  <img src={heroImg} alt="" className="w-full h-auto object-contain drop-shadow-2xl" loading="eager" />
                </E>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* ================= FEATURES ================= */}
      <section id="features" className="py-12 sm:py-14 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center mb-8 sm:mb-10 lg:mb-14">
            {features.eyebrow && (
              <E path="features.eyebrow" type="text">
                <div className="text-[11px] tracking-[0.35em] font-semibold mb-3" style={{ color: GOLD }}>{features.eyebrow}</div>
              </E>
            )}
            <E path="features.title" type="heading">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight max-w-3xl mx-auto" style={{ color: INK }}>{features.title}</h2>
            </E>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {features.items.map((item, i) => (
              <E key={item.id} path={`features.items[${i}]`} type="card">
                <div className="rounded-3xl p-5 sm:p-6 lg:p-7 text-center transition hover:shadow-md h-full" style={{ backgroundColor: SURFACE }}>
                  <div className="mx-auto mb-4 sm:mb-5 flex items-center justify-center">
                    <EditableIcon path={`features.items[${i}].icon`} name={item.icon} className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.25} />
                  </div>
                  <E path={`features.items[${i}].title`} type="heading">
                    <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3" style={{ color: INK }}>{item.title}</h3>
                  </E>
                  <E path={`features.items[${i}].description`} type="text">
                    <p className="text-[13px] text-neutral-600 leading-relaxed">{item.description}</p>
                  </E>
                </div>
              </E>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section id="stats" className="pb-14 sm:pb-16 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-3xl px-6 sm:px-8 lg:px-14 py-8 sm:py-10 lg:py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8" style={{ backgroundColor: SURFACE }}>
            {stats.items.map((s, i) => (
              <E key={s.id} path={`stats.items[${i}]`} type="stat">
                <div className={`flex items-center gap-4 sm:gap-5 ${i > 0 ? 'md:border-l md:border-neutral-200 md:pl-6 lg:pl-8' : ''}`}>
                  <EditableIcon path={`stats.items[${i}].icon`} name={s.icon} className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" strokeWidth={1.25} />
                  <div>
                    <E path={`stats.items[${i}].value`} type="heading">
                      <div className="text-2xl sm:text-3xl lg:text-[34px] font-bold leading-none" style={{ color: GOLD }}>{s.value}</div>
                    </E>
                    <E path={`stats.items[${i}].label`} type="text">
                      <div className="text-[12px] lg:text-[13px] text-neutral-600 leading-snug mt-1.5 sm:mt-2 whitespace-pre-line">{s.label}</div>
                    </E>
                  </div>
                </div>
              </E>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMMUNITY ================= */}
      <section id="community" className="pb-14 sm:pb-16 lg:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-8 sm:gap-10 lg:gap-14 items-center">
            <div className="space-y-5 sm:space-y-6 max-w-md">
              {community.eyebrow && (
                <E path="community.eyebrow" type="text">
                  <div className="text-[11px] tracking-[0.35em] font-semibold" style={{ color: GOLD }}>{community.eyebrow}</div>
                </E>
              )}
              <E path="community.title" type="heading">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.15]" style={{ color: INK }}>{community.title}</h2>
              </E>
              <ul className="space-y-3 sm:space-y-3.5">
                {community.bullets.map((b, i) => (
                  <E key={i} path={`community.bullets[${i}]`} type="bullet">
                    <li className="flex items-center gap-3 text-[14px] sm:text-[15px] text-neutral-800">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: GOLD }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  </E>
                ))}
              </ul>
              {communityCta.text && (
                <E path="community.cta" type="button">
                  <CtaLink
                    cta={communityCta}
                    fallbackUrl="/auth"
                    className="inline-flex items-center gap-2 rounded-lg text-white font-semibold px-5 sm:px-6 py-3 sm:py-3.5 mt-2 transition hover:opacity-90"
                    style={{ backgroundColor: GOLD, boxShadow: `0 10px 30px -10px ${GOLD}80` }}
                  >
                    {communityCta.text}
                    <ArrowRight className="w-4 h-4" />
                  </CtaLink>
                </E>
              )}
            </div>


            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-neutral-100">
              {(() => {
                const url = community.videoUrl || '';
                const embed = toEmbedUrl(url, !!community.videoAutoplay);
                const isFile = url && /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url);
                const poster = community.videoPoster || communityImg;

                if (isFile) {
                  return (
                    <E path="community.video" type="video">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={poster}
                        autoPlay={!!community.videoAutoplay}
                        muted={!!community.videoAutoplay}
                        className="absolute inset-0 w-full h-full object-cover bg-black"
                      >
                        <source src={url} type={videoMime(url)} />
                      </video>
                    </E>
                  );
                }
                if (embed) {
                  return (
                    <E path="community.video" type="video">
                      <iframe
                        src={embed}
                        title="Wideo społeczności"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        style={{ border: 0 }}
                      />
                    </E>
                  );
                }
                // Fallback: image + play icon overlay (also acts as "add video" spot in editor)
                return (
                  <>
                    <E path="community.backgroundImage" type="image">
                      <img src={communityImg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    </E>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <E path="community.video" type="video">
                        <button type="button" className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl hover:scale-105 transition" aria-label="Dodaj wideo">
                          <Play className="w-8 h-8 text-neutral-900 fill-neutral-900 ml-1" />
                        </button>
                      </E>
                    </div>
                    {community.overlayText && (
                      <E path="community.overlayText" type="text">
                        <p className="absolute left-6 right-6 bottom-16 text-white text-sm md:text-base font-medium max-w-xs drop-shadow-lg">{community.overlayText}</p>
                      </E>
                    )}
                  </>
                );
              })()}

              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 pointer-events-none">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <StripAvatar key={i} index={i} size={32} ring="ring-white" />
                  ))}
                </div>
                {community.peopleCount && (
                  <E path="community.peopleCount" type="text">
                    <span className="text-sm font-semibold text-white drop-shadow pointer-events-auto">{community.peopleCount}</span>
                  </E>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <section id="trusted-by" className="pb-14 sm:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 text-center">
          {trustedBy.eyebrow && (
            <E path="trustedBy.eyebrow" type="text">
              <div className="text-[11px] tracking-[0.35em] text-neutral-500 font-semibold mb-8 sm:mb-10">{trustedBy.eyebrow}</div>
            </E>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-14 gap-y-6 sm:gap-y-8">

            {(trustedBy.logos || []).map((logo, i) => {
              const h = logo.heightPx || 48;
              const inner = logo.url ? (
                <img
                  src={logo.url}
                  alt={logo.alt}
                  className="w-auto object-contain grayscale opacity-70 hover:opacity-100 transition"
                  style={{ height: h }}
                />
              ) : (
                <div
                  className="flex items-center justify-center border-2 border-dashed border-neutral-300 text-neutral-400 text-[10px] uppercase tracking-widest px-4 rounded"
                  style={{ height: h, minWidth: 120 }}
                >
                  <ImagePlus className="w-4 h-4 mr-1.5" /> {logo.alt || 'Logo'}
                </div>
              );
              return (
                <E key={logo.id || i} path={`trustedBy.logos[${i}]`} type="logo">
                  <div className="inline-flex">
                    {logo.link && logo.url ? (
                      <a href={logo.link} target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()}>{inner}</a>
                    ) : (
                      inner
                    )}
                  </div>
                </E>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= DYNAMIC WIDGETS (from palette) ================= */}
      <WidgetRenderer widgets={content.widgets || []} />
    </div>

  );
};

const LandingV2: React.FC<Props> = ({ preferDraft = false, overrideContent, editable = false, selectedPath = null, hoveredPath = null, onSelect, onHover, onUpdateStyle }) => {
  const { content: fetched } = useHomepageV2Content(preferDraft);
  const content = overrideContent ?? fetched;
  const [innerHover, setInnerHover] = useState<string | null>(null);

  if (!content) return <div className="min-h-screen bg-white" />;

  return (
    <EditProvider
      value={{
        editable,
        styles: content.styles || {},
        selectedPath,
        hoveredPath: onHover ? hoveredPath : innerHover,
        onSelect: onSelect || (() => {}),
        onHover: onHover || setInnerHover,
        onUpdateStyle,
      }}
    >
      <LandingV2Inner content={content} editable={editable} />
    </EditProvider>
  );
};

export default LandingV2;
