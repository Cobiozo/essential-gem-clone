import React from 'react';

interface StatItem {
  icon?: string;
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
  } = config;

  if (layout === 'split') {
    return (
      <section className="relative overflow-hidden bg-[#0a1628]" style={{ backgroundColor: bg_color || '#0a1628' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left — text */}
            <div className="text-white space-y-6">
              {badge_text && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm">
                  🛡️ {badge_text}
                </div>
              )}
              {headline && (
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  {headline}
                </h1>
              )}
              {subheadline && (
                <p className="text-lg sm:text-xl font-medium opacity-90">{subheadline}</p>
              )}
              {description && (
                <p className="text-sm sm:text-base opacity-80 leading-relaxed max-w-lg">{description}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {cta_primary?.text && (
                  <a
                    href={cta_primary.url || '#'}
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-colors shadow-lg shadow-orange-500/30"
                  >
                    🛒 {cta_primary.text}
                  </a>
                )}
                {cta_secondary?.text && (
                  <a
                    href={cta_secondary.url || '#'}
                    className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white/70 text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-colors"
                  >
                    📝 {cta_secondary.text}
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
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-8">
              {stats.map((stat: StatItem, i: number) => (
                <div key={i} className="text-center text-white">
                  {stat.icon && <div className="text-2xl mb-1">{stat.icon}</div>}
                  <div className="text-2xl sm:text-3xl font-black">{stat.value}</div>
                  <div className="text-xs sm:text-sm opacity-70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Centered layout (original) ───
  return (
    <section
      className="relative overflow-hidden min-h-[70vh] flex items-center justify-center"
      style={{ backgroundColor: bg_color || '#0a1628' }}
    >
      {video_url && (
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          src={video_url}
        />
      )}
      {!video_url && bg_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${bg_image_url})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white py-16">
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
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors shadow-lg shadow-orange-500/30"
            >
              🛒 {cta_primary.text}
            </a>
          )}
          {cta_secondary?.text && (
            <a
              href={cta_secondary.url || '#'}
              className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white/70 text-white px-8 py-4 rounded-xl font-semibold text-base transition-colors"
            >
              📝 {cta_secondary.text}
            </a>
          )}
        </div>

        {/* Stats bar for centered layout */}
        {stats && stats.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-8">
            {stats.map((stat: StatItem, i: number) => (
              <div key={i} className="text-center text-white">
                {stat.icon && <div className="text-2xl mb-1">{stat.icon}</div>}
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
