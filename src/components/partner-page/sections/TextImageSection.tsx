import React from 'react';

interface Props {
  config: Record<string, any>;
}

export const TextImageSection: React.FC<Props> = ({ config }) => {
  const {
    heading, items, image_url, video_url, image_side,
    highlight_text, highlight_description, cta_text, cta_url, bg_color
  } = config;

  const isRight = image_side === 'right';

  return (
    <section className="py-16 sm:py-20" style={{ backgroundColor: bg_color || undefined }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${isRight ? '' : 'md:[direction:rtl]'}`}>
          {/* Text side */}
          <div className={isRight ? '' : 'md:[direction:ltr]'}>
            {heading && (
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 leading-tight">
                {heading}
              </h2>
            )}
            {items?.length > 0 && (
              <ul className="space-y-3 mb-8">
                {items.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-lg">{item.icon || '❌'}</span>
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
              <a href={cta_url || '#'} className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                {cta_text} ↓
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
              <img src={image_url} alt="" className="rounded-2xl shadow-xl w-full object-cover" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
