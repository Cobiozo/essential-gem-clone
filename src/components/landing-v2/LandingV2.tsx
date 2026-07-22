import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, Play, Check } from 'lucide-react';
import { useHomepageV2Content } from '@/hooks/useHomepageConfig';
import type { HomepageV2Content } from '@/types/homepageV2';

import heroMockup from '@/assets/landing-v2/hero-mockup.png';
import communityHero from '@/assets/landing-v2/community-hero.jpg';
import logoPurelife from '@/assets/landing-v2/logo-purelife.png';
import avatarsRow from '@/assets/landing-v2/avatars-row.jpg';

interface Props {
  preferDraft?: boolean;
  overrideContent?: HomepageV2Content;
}

const GOLD = '#B8894A';
const GOLD_SOFT = '#D4A574';
const INK = '#111111';
const SURFACE = '#FBF8F3';

function LucideIcon({ name, className, strokeWidth = 1.5 }: { name: string; className?: string; strokeWidth?: number }) {
  const Comp = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Comp className={className} strokeWidth={strokeWidth} />;
}

// Slice one horizontal 4-portrait strip into individual circular avatars via object-position.
function StripAvatar({ index, total = 4, size = 40, ring = 'ring-white' }: { index: number; total?: number; size?: number; ring?: string }) {
  const pct = total === 1 ? 50 : (index / (total - 1)) * 100;
  return (
    <div
      className={`rounded-full overflow-hidden ring-2 ${ring} shadow-sm shrink-0`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarsRow}
        alt=""
        className="h-full object-cover"
        style={{ width: `${total * 100}%`, objectPosition: `${pct}% center` }}
      />
    </div>
  );
}

const TrustedBadge: React.FC<{ name: string; sub?: string; variant?: 'text' | 'msc' | 'arctic' }> = ({ name, sub, variant = 'text' }) => {
  if (variant === 'msc') {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <div className="w-11 h-11 rounded-full border-2 border-current flex items-center justify-center font-black text-sm tracking-wider">
          MSC
        </div>
        <div className="text-[9px] leading-tight max-w-[80px] uppercase tracking-wide">
          <div>Fabryka</div>
          <div>Zrównoważonego</div>
          <div>Rybołówstwa</div>
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

const LandingV2: React.FC<Props> = ({ preferDraft = false, overrideContent }) => {
  const { content: fetched } = useHomepageV2Content(preferDraft);
  const content = overrideContent ?? fetched;

  useEffect(() => {
    if (content?.seo) {
      if (content.seo.title) document.title = content.seo.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta && content.seo.description) meta.setAttribute('content', content.seo.description);
    }
  }, [content?.seo]);

  if (!content) {
    return <div className="min-h-screen bg-white" />;
  }

  const { hero, features, stats, community, trustedBy } = content;
  const heroImg = hero.mockupImage || heroMockup;
  const communityImg = community.backgroundImage || communityHero;

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", "Inter", sans-serif' }}>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* Golden decorative arc */}
        <svg
          className="absolute right-0 top-0 pointer-events-none opacity-70"
          width="900" height="900" viewBox="0 0 900 900" fill="none"
          aria-hidden="true"
        >
          <circle cx="700" cy="200" r="620" stroke={GOLD_SOFT} strokeWidth="1.5" opacity="0.5" />
        </svg>

        <div className="container mx-auto px-6 lg:px-10 pt-8 lg:pt-12 pb-14 lg:pb-20 relative">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-6 items-center">
            {/* LEFT column */}
            <div className="space-y-7 lg:space-y-8 max-w-xl">
              {/* Logo */}
              <img
                src={logoPurelife}
                alt="Pure Life Center"
                className="h-14 lg:h-16 w-auto object-contain -ml-2"
              />

              {hero.eyebrow && (
                <div className="text-[11px] tracking-[0.35em] font-semibold" style={{ color: GOLD }}>
                  {hero.eyebrow}
                </div>
              )}

              <h1 className="font-bold leading-[1.02] text-[44px] md:text-6xl lg:text-[72px] tracking-tight" style={{ color: INK }}>
                <div>{hero.titleLine1}</div>
                <div>{hero.titleLine2}</div>
                <div style={{ color: GOLD }}>{hero.titleLine3}</div>
              </h1>

              {hero.description && (
                <p className="text-[15px] lg:text-base text-neutral-600 max-w-md leading-relaxed">
                  {hero.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {hero.primaryCtaText && (
                  <Link
                    to={hero.primaryCtaUrl || '/auth'}
                    className="inline-flex items-center gap-2 rounded-lg text-white font-semibold px-6 py-3.5 shadow-lg transition hover:opacity-90"
                    style={{ backgroundColor: GOLD, boxShadow: `0 10px 30px -10px ${GOLD}80` }}
                  >
                    {hero.primaryCtaText}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {hero.secondaryCtaText && (
                  <a
                    href={hero.secondaryCtaUrl || '#'}
                    className="inline-flex items-center gap-2 text-neutral-900 font-semibold px-4 py-3 hover:opacity-70 transition"
                  >
                    <span className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </span>
                    {hero.secondaryCtaText}
                  </a>
                )}
              </div>

              {(hero.avatars?.length > 0 || hero.socialProofText) && (
                <div className="flex items-center gap-4 pt-3">
                  <div className="flex -space-x-3">
                    {[0, 1, 2, 3].map((i) => (
                      <StripAvatar key={i} index={i} size={40} ring="ring-white" />
                    ))}
                  </div>
                  {hero.socialProofText && (
                    <p className="text-[13px] text-neutral-600 max-w-[220px] leading-snug">{hero.socialProofText}</p>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT column — device mockup */}
            <div className="relative lg:-mr-16">
              <img
                src={heroImg}
                alt=""
                className="w-full h-auto object-contain drop-shadow-2xl"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="text-center mb-10 lg:mb-14">
            {features.eyebrow && (
              <div className="text-[11px] tracking-[0.35em] font-semibold mb-3" style={{ color: GOLD }}>
                {features.eyebrow}
              </div>
            )}
            <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight max-w-3xl mx-auto" style={{ color: INK }}>
              {features.title}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
            {features.items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl p-6 lg:p-7 text-center transition hover:shadow-md"
                style={{ backgroundColor: SURFACE }}
              >
                <div className="mx-auto mb-5 flex items-center justify-center">
                  <LucideIcon name={item.icon} className="w-12 h-12" strokeWidth={1.25} />
                </div>
                <h3 className="font-bold text-lg mb-3" style={{ color: INK }}>{item.title}</h3>
                <p className="text-[13px] text-neutral-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="pb-16 lg:pb-20">
        <div className="container mx-auto px-6 lg:px-10">
          <div
            className="rounded-3xl px-8 lg:px-14 py-10 lg:py-12 grid grid-cols-2 md:grid-cols-4 gap-8"
            style={{ backgroundColor: SURFACE }}
          >
            {stats.items.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-5 ${i > 0 ? 'md:border-l md:border-neutral-200 md:pl-8' : ''}`}>
                <LucideIcon name={s.icon} className="w-12 h-12 shrink-0" strokeWidth={1.25} />
                <div>
                  <div className="text-3xl lg:text-[34px] font-bold leading-none" style={{ color: GOLD }}>{s.value}</div>
                  <div className="text-[12px] lg:text-[13px] text-neutral-600 leading-snug mt-2 whitespace-pre-line">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMMUNITY ================= */}
      <section id="community" className="pb-16 lg:pb-24">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-10 lg:gap-14 items-center">
            <div className="space-y-6 max-w-md">
              {community.eyebrow && (
                <div className="text-[11px] tracking-[0.35em] font-semibold" style={{ color: GOLD }}>
                  {community.eyebrow}
                </div>
              )}
              <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.1]" style={{ color: INK }}>
                {community.title}
              </h2>
              <ul className="space-y-3.5">
                {community.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px] text-neutral-800">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: GOLD }}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              {community.ctaText && (
                <Link
                  to={community.ctaUrl || '/auth'}
                  className="inline-flex items-center gap-2 rounded-lg text-white font-semibold px-6 py-3.5 mt-2 transition hover:opacity-90"
                  style={{ backgroundColor: GOLD, boxShadow: `0 10px 30px -10px ${GOLD}80` }}
                >
                  {community.ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
              <img src={communityImg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />

              {/* Play + overlay text pill */}
              {community.overlayText && (
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  {community.videoUrl ? (
                    <a
                      href={community.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl shrink-0 hover:scale-105 transition"
                      aria-label="Play video"
                    >
                      <Play className="w-6 h-6 text-neutral-900 fill-neutral-900 ml-1" />
                    </a>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl shrink-0">
                      <Play className="w-6 h-6 text-neutral-900 fill-neutral-900 ml-1" />
                    </div>
                  )}
                  <p className="text-white text-sm md:text-base font-medium max-w-xs drop-shadow-lg">
                    {community.overlayText}
                  </p>
                </div>
              )}

              {/* Bottom avatars + count */}
              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <StripAvatar key={i} index={i} size={32} ring="ring-white" />
                  ))}
                </div>
                {community.peopleCount && (
                  <span className="text-sm font-semibold text-white drop-shadow">{community.peopleCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <section className="pb-20">
        <div className="container mx-auto px-6 lg:px-10 text-center">
          {trustedBy.eyebrow && (
            <div className="text-[11px] tracking-[0.35em] text-neutral-500 font-semibold mb-10">
              {trustedBy.eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
            {/* If admin uploaded custom logos, honor them; otherwise render styled defaults */}
            {trustedBy.logos && trustedBy.logos.length > 0 ? (
              trustedBy.logos.map((logo) => {
                const img = <img src={logo.url} alt={logo.alt} className="h-10 lg:h-12 w-auto object-contain grayscale opacity-70 hover:opacity-100 transition" />;
                return (
                  <div key={logo.id}>
                    {logo.link ? <a href={logo.link} target="_blank" rel="noreferrer">{img}</a> : img}
                  </div>
                );
              })
            ) : (
              <>
                <TrustedBadge name="EQOLOGY" sub="Independent Business Partner" />
                <TrustedBadge name="GOED" sub="OMEGA-3" />
                <TrustedBadge variant="msc" name="MSC" />
                <TrustedBadge name="GMP" sub="certified" />
                <TrustedBadge variant="arctic" name="ARCTIC OIL" />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingV2;
