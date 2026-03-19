import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

interface Props {
  config: Record<string, any>;
}

export const HeroSection: React.FC<Props> = ({ config }) => {
  const {
    video_url, bg_image_url, headline, subheadline, description,
    badge_text, cta_primary, cta_secondary, bg_color
  } = config;

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
          <p className="text-lg sm:text-xl md:text-2xl font-medium opacity-90 mb-4">
            {subheadline}
          </p>
        )}
        {description && (
          <p className="text-sm sm:text-base opacity-80 max-w-2xl mx-auto mb-6 leading-relaxed">
            {description}
          </p>
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
      </div>
    </section>
  );
};
