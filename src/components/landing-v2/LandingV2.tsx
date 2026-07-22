import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, PlayCircle, CheckCircle2 } from 'lucide-react';
import { useHomepageV2Content } from '@/hooks/useHomepageConfig';
import type { HomepageV2Content } from '@/types/homepageV2';

interface Props {
  preferDraft?: boolean;
  overrideContent?: HomepageV2Content;
}

function Icon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Comp className={className} strokeWidth={1.5} />;
}

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
    return <div className="min-h-screen bg-background" />;
  }

  const { hero, features, stats, community, trustedBy } = content;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-10 pt-10 lg:pt-16 pb-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-6 lg:space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--gold-light))] to-[hsl(var(--gold-dark))]" />
                <div className="leading-tight">
                  <div className="font-bold tracking-widest text-sm">PURE LIFE</div>
                  <div className="text-[10px] tracking-[0.3em] text-muted-foreground">CENTER</div>
                </div>
              </div>

              {hero.eyebrow && (
                <div className="text-xs tracking-[0.35em] text-[hsl(var(--gold-metallic))] font-semibold">
                  {hero.eyebrow}
                </div>
              )}

              <h1 className="font-bold leading-[1.05] text-5xl md:text-6xl lg:text-7xl tracking-tight">
                <div>{hero.titleLine1}</div>
                <div>{hero.titleLine2}</div>
                <div className="text-[hsl(var(--gold-metallic))]">{hero.titleLine3}</div>
              </h1>

              {hero.description && (
                <p className="text-base lg:text-lg text-muted-foreground max-w-md leading-relaxed">
                  {hero.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                {hero.primaryCtaText && (
                  <Link
                    to={hero.primaryCtaUrl || '/auth'}
                    className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--gold-metallic))] hover:bg-[hsl(var(--gold-dark))] transition text-white font-semibold px-6 py-3.5 shadow-lg shadow-[hsl(var(--gold-metallic))]/20"
                  >
                    {hero.primaryCtaText}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {hero.secondaryCtaText && (
                  <a
                    href={hero.secondaryCtaUrl || '#'}
                    className="inline-flex items-center gap-2 text-foreground font-semibold px-4 py-3 hover:text-[hsl(var(--gold-metallic))] transition"
                  >
                    <PlayCircle className="w-5 h-5" />
                    {hero.secondaryCtaText}
                  </a>
                )}
              </div>

              {(hero.avatars?.length > 0 || hero.socialProofText) && (
                <div className="flex items-center gap-4 pt-2">
                  {hero.avatars?.length > 0 && (
                    <div className="flex -space-x-2">
                      {hero.avatars.slice(0, 5).map((a) => (
                        <img
                          key={a.id}
                          src={a.url}
                          alt=""
                          className="w-10 h-10 rounded-full border-2 border-background object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {hero.socialProofText && (
                    <p className="text-sm text-muted-foreground max-w-xs leading-snug">{hero.socialProofText}</p>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              {hero.mockupImage ? (
                <img src={hero.mockupImage} alt="" className="w-full h-auto object-contain" />
              ) : (
                <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-[hsl(var(--secondary))] to-transparent" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="text-center mb-12">
            {features.eyebrow && (
              <div className="text-xs tracking-[0.35em] text-[hsl(var(--gold-metallic))] font-semibold mb-3">
                {features.eyebrow}
              </div>
            )}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{features.title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            {features.items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl bg-card border border-border/50 p-6 lg:p-8 text-center hover:shadow-lg transition"
              >
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center mb-5">
                  <Icon name={item.icon} className="w-7 h-7 text-[hsl(var(--gold-metallic))]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="pb-16 lg:pb-24">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="rounded-3xl bg-card border border-border/50 p-8 lg:p-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.items.map((s) => (
              <div key={s.id} className="flex items-center gap-4">
                <Icon name={s.icon} className="w-10 h-10 text-[hsl(var(--gold-metallic))] shrink-0" />
                <div>
                  <div className="text-2xl lg:text-3xl font-bold">{s.value}</div>
                  <div className="text-xs lg:text-sm text-muted-foreground leading-snug">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section id="community" className="pb-16 lg:pb-24">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              {community.eyebrow && (
                <div className="text-xs tracking-[0.35em] text-[hsl(var(--gold-metallic))] font-semibold">
                  {community.eyebrow}
                </div>
              )}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{community.title}</h2>
              <ul className="space-y-3">
                {community.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 text-base">
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--gold-metallic))] shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              {community.ctaText && (
                <Link
                  to={community.ctaUrl || '/auth'}
                  className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--gold-metallic))] hover:bg-[hsl(var(--gold-dark))] transition text-white font-semibold px-6 py-3.5"
                >
                  {community.ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-muted">
              {community.backgroundImage && (
                <img src={community.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              {community.videoUrl && (
                <a
                  href={community.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Play video"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <PlayCircle className="w-10 h-10 text-[hsl(var(--gold-metallic))]" />
                  </div>
                </a>
              )}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                {community.overlayText && (
                  <p className="text-sm md:text-base font-medium mb-3 max-w-md">{community.overlayText}</p>
                )}
                <div className="flex items-center gap-3">
                  {community.avatars?.length > 0 && (
                    <div className="flex -space-x-2">
                      {community.avatars.slice(0, 5).map((a) => (
                        <img
                          key={a.id}
                          src={a.url}
                          alt=""
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {community.peopleCount && (
                    <span className="text-sm font-semibold">{community.peopleCount}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="pb-20">
        <div className="container mx-auto px-6 lg:px-10 text-center">
          {trustedBy.eyebrow && (
            <div className="text-xs tracking-[0.35em] text-muted-foreground font-semibold mb-8">
              {trustedBy.eyebrow}
            </div>
          )}
          {trustedBy.logos?.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-16 opacity-80">
              {trustedBy.logos.map((logo) => {
                const img = <img src={logo.url} alt={logo.alt} className="h-10 lg:h-12 w-auto object-contain" />;
                return (
                  <div key={logo.id}>
                    {logo.link ? (
                      <a href={logo.link} target="_blank" rel="noreferrer">{img}</a>
                    ) : img}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingV2;
