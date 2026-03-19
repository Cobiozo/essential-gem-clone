import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getImageShapeClasses, stripShapeHash } from '@/lib/imageShapeUtils';

interface StatItem {
  icon?: string;
  icon_url?: string;
  value: string;
  label: string;
}

interface Props {
  config: Record<string, any>;
}

export const HeroSection: React.FC<Props> = ({ config }) => {
  const {
    layout, video_url, bg_image_url, hero_image_url, hero_video_url, headline, subheadline,
    description, badge_text, cta_primary, cta_secondary, bg_color, stats,
    text_color, cta_bg_color, cta_icon, overlay_opacity,
  } = config;

  const ctaBgColor = cta_bg_color || '#2d6a4f';
  const ctaIconEl = cta_icon === 'arrow' ? <ArrowRight className="w-5 h-5" /> : cta_icon ? <span>{cta_icon}</span> : <ArrowRight className="w-5 h-5" />;
  const tc = text_color || undefined;
  const ts = tc ? { color: tc } : undefined;

  if (layout === 'split') {
    return (
      <section className="relative overflow-hidden" style={{ backgroundColor: bg_color || '#0a1628' }}>
        {bg_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg_image_url})`, opacity: overlay_opacity ?? 0.3 }}
          />
        )}
        {bg_image_url && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              {badge_text && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm" style={ts || { color: 'white' }}>
                  🛡️ {badge_text}
                </div>
              )}
              {headline && (
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight whitespace-pre-line" style={ts || { color: 'white' }}>
                  {headline}
                </h1>
              )}
              {subheadline && (
                <p className="text-lg sm:text-xl font-medium" style={ts ? { color: tc, opacity: 0.9 } : { color: 'rgba(255,255,255,0.9)' }}>{subheadline}</p>
              )}
              {description && (
                <p className="text-sm sm:text-base leading-relaxed max-w-lg whitespace-pre-line" style={ts ? { color: tc, opacity: 0.8 } : { color: 'rgba(255,255,255,0.8)' }}>{description}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {cta_primary?.text && (
                  <a
                    href={cta_primary.url || '#'}
                    className="inline-flex items-center justify-center gap-2 text-white px-7 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    style={{ backgroundColor: ctaBgColor }}
                  >
                    {cta_primary.text} {ctaIconEl}
                  </a>
                )}
                {cta_secondary?.text && (
                  <a
                    href={cta_secondary.url || '#'}
                    className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white/70 px-7 py-3.5 rounded-full font-semibold text-base transition-colors"
                    style={ts || { color: 'white' }}
                  >
                    {cta_secondary.text}
                  </a>
                )}
              </div>
            </div>
            {hero_image_url && (
              <div className="flex justify-center">
                <img
                  src={stripShapeHash(hero_image_url)}
                  alt={headline || 'Hero'}
                  className={`max-h-[500px] drop-shadow-2xl ${getImageShapeClasses(hero_image_url)}`}
                />
              </div>
            )}
          </div>

          {stats && stats.length > 0 && (
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat: StatItem, i: number) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                  {stat.icon_url ? (
                    <img src={stat.icon_url} alt="" className="w-8 h-8 mx-auto mb-2 object-contain" />
                  ) : stat.icon ? (
                    <div className="text-2xl mb-2">{stat.icon}</div>
                  ) : null}
                  <div className="text-2xl sm:text-3xl font-black" style={ts || { color: 'white' }}>{stat.value}</div>
                  <div className="text-xs sm:text-sm mt-1" style={ts ? { color: tc, opacity: 0.7 } : { color: 'rgba(255,255,255,0.7)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Centered layout ───
  return (
    <section
      className="relative overflow-hidden min-h-[70vh] flex items-center justify-center"
      style={{ backgroundColor: bg_color || '#0a1628' }}
    >
      {video_url && (
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: overlay_opacity ?? 0.3 }}
          src={video_url}
        />
      )}
      {!video_url && bg_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg_image_url})`, opacity: overlay_opacity ?? 0.3 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-16">
        {headline && (
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-tight" style={ts || { color: 'white' }}>
            {headline}
          </h1>
        )}
        {subheadline && (
          <p className="text-lg sm:text-xl md:text-2xl font-medium mb-4" style={ts ? { color: tc, opacity: 0.9 } : { color: 'rgba(255,255,255,0.9)' }}>{subheadline}</p>
        )}
        {description && (
          <p className="text-sm sm:text-base max-w-2xl mx-auto mb-6 leading-relaxed" style={ts ? { color: tc, opacity: 0.8 } : { color: 'rgba(255,255,255,0.8)' }}>{description}</p>
        )}
        {badge_text && (
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm mb-8" style={ts || { color: 'white' }}>
            🛡️ {badge_text}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
          {cta_primary?.text && (
            <a
              href={cta_primary.url || '#'}
              className="inline-flex items-center gap-2 text-white px-8 py-4 rounded-full font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: ctaBgColor }}
            >
              {cta_primary.text} {ctaIconEl}
            </a>
          )}
          {cta_secondary?.text && (
            <a
              href={cta_secondary.url || '#'}
              className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white/70 px-8 py-4 rounded-full font-semibold text-base transition-colors"
              style={ts || { color: 'white' }}
            >
              {cta_secondary.text}
            </a>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat: StatItem, i: number) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                {stat.icon_url ? (
                  <img src={stat.icon_url} alt="" className="w-8 h-8 mx-auto mb-2 object-contain" />
                ) : stat.icon ? (
                  <div className="text-2xl mb-2">{stat.icon}</div>
                ) : null}
                <div className="text-2xl sm:text-3xl font-black" style={ts || { color: 'white' }}>{stat.value}</div>
                <div className="text-xs sm:text-sm mt-1" style={ts ? { color: tc, opacity: 0.7 } : { color: 'rgba(255,255,255,0.7)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
