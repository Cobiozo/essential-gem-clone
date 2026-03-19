import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface Props {
  config: Record<string, any>;
}

export const TextImageSection: React.FC<Props> = ({ config }) => {
  const {
    heading, items, image_url, video_url, image_side,
    highlight_text, highlight_description, cta_text, cta_url, bg_color,
    bg_image_url, partner_name, partner_subtitle,
    item_icon_color, cta_bg_color, text_color, overlay_opacity,
  } = config;

  const isRight = image_side === 'right';
  const iconColor = item_icon_color || '#2d6a4f';
  const ctaBg = cta_bg_color || '#2d6a4f';

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: bg_color || undefined }}>
      {/* Background image */}
      {bg_image_url && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg_image_url})`, opacity: overlay_opacity ?? 0.15 }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 to-white/40" />
        </>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${isRight ? '' : 'md:[direction:rtl]'}`}>
          {/* Text side */}
          <div className={isRight ? '' : 'md:[direction:ltr]'} style={text_color ? { color: text_color } : undefined}>
            {(partner_name || partner_subtitle) && (
              <div className="mb-4">
                {partner_subtitle && (
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{partner_subtitle}</p>
                )}
                {partner_name && (
                  <p className="text-xl font-bold text-foreground">{partner_name}</p>
                )}
              </div>
            )}
            {heading && (
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 leading-tight">
                {heading}
              </h2>
            )}
            {items?.length > 0 && (
              <ul className="space-y-3 mb-8">
                {items.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    {item.icon === '✔️' || item.icon === '✓' || item.icon === 'check' ? (
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: iconColor }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    ) : (
                      <span className="text-lg flex-shrink-0">{item.icon || '✔️'}</span>
                    )}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {(highlight_text || highlight_description) && (
              <div className="bg-muted rounded-xl p-6 mb-6">
                {highlight_text && (
                  <p className="text-3xl font-black text-foreground mb-1">{highlight_text}</p>
                )}
                {highlight_description && (
                  <p className="text-sm text-muted-foreground">{highlight_description}</p>
                )}
              </div>
            )}
            {cta_text && (
              <a
                href={cta_url || '#'}
                className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:scale-105"
                style={{ backgroundColor: ctaBg }}
              >
                {cta_text} <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Image/video side */}
          <div className={isRight ? '' : 'md:[direction:ltr]'}>
            {video_url ? (
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <video controls className="w-full" src={video_url} />
              </div>
            ) : image_url ? (
              <img src={image_url} alt="" className="w-full h-full object-cover shadow-xl max-h-[500px]" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
