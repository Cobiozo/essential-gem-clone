import React from 'react';
import { ArrowRight } from 'lucide-react';

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
    layout, video_url, bg_image_url, hero_image_url, headline, subheadline,
    description, badge_text, cta_primary, cta_secondary, bg_color, stats,
    text_color, cta_bg_color, cta_icon, overlay_opacity,
  } = config;

  const ctaBgColor = cta_bg_color || '#2d6a4f';
  const ctaIconEl = cta_icon === 'arrow' ? <ArrowRight className="w-5 h-5" /> : cta_icon ? <span>{cta_icon}</span> : <ArrowRight className="w-5 h-5" />;
  const textColorStyle = text_color ? { color: text_color } : undefined;

  if (layout === 'split') {
    return (
      <section className="relative overflow-hidden" style={{ backgroundColor: bg_color || '#0a1628' }}>
        {/* Background image for split */}
        {bg_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg_image_url})`, opacity: overlay_opacity ?? 0.3 }}
          />
        )}
        {bg_image_url && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left — text */}
            <div className="space-y-6" style={textColorStyle}>
              {badge_text && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white">
                  🛡️ {badge_text}
                </div>
              )}
              {headline && (
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white whitespace-pre-line" style={textColorStyle}>
                  {headline}
                </h1>
              )}
              {subheadline && (
                <p className="text-lg sm:text-xl font-medium text-white/90" style={textColorStyle}>{subheadline}</p>
              )}
              {description && (
                <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-lg" style={textColorStyle}>{description}</p>
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
                    className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white/70 text-white px-7 py-3.5 rounded-full font-semibold text-base transition-colors"
                  >
                    {cta_secondary.text}
                  </a>
                )}
              </div>
            </div>
            {/* Right — image */}
            {hero_image_url && (
              <div className="flex justify-center">
                <img
                  src={hero_image_url}
                  alt={headline || 'Hero'}
                  className="max-h-[500px] object-contain drop-shadow-2xl"
                />
              </div>
            )}
          </div>

          {/* Stats bar */}
          {stats && stats.length > 0 && (
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat: StatItem, i: number) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                  {stat.icon_url ? (
                    <img src={stat.icon_url} alt="" className="w-8 h-8 mx-auto mb-2 object-contain" />
                  ) : stat.icon ? (
                    <div className="text-2xl mb-2">{stat.icon}</div>
                  ) : null}
                  <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-white/70 mt-1">{stat.label}</div>
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white py-16" style={textColorStyle}>
        {headline && (
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-tight">
            {headline}
          </h1>
        )}
        {subheadline && (
          <p className="text-lg sm:text-xl md:text-2xl font-medium opacity-90 mb-4">{subheadline}</p>
        )}
        {description && (
          <p className="text-sm sm:text-base opacity-80 max-w-2xl mx-auto mb-6 leading-relaxed">{description}</p>
        )}
        {badge_text && (
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm mb-8">
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
              className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white/70 text-white px-8 py-4 rounded-full font-semibold text-base transition-colors"
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
                <div className="text-2xl sm:text-3xl font-black">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
