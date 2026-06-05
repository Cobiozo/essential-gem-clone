import React from 'react';
import { Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NewsHubBannerConfig } from '@/hooks/useNewsHubBanner';

interface Props {
  config: NewsHubBannerConfig;
  fallback?: React.ReactNode;
  /** When true, banner renders without the outer page container (for embedding in previews/columns). */
  embedded?: boolean;
}

export const NewsHubBanner: React.FC<Props> = ({ config, fallback, embedded = false }) => {
  const Wrapper: React.FC<{ children: React.ReactNode; padding?: string }> = ({ children, padding }) =>
    embedded ? (
      <div className="w-full">{children}</div>
    ) : (
      <section className={`container max-w-7xl mx-auto px-4 ${padding ?? 'pt-6 pb-6'}`}>{children}</section>
    );

  if (!config.enabled || !config.image_url) {
    if (fallback) return <>{fallback}</>;
    return (
      <Wrapper padding="pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-3 shadow-lg">
            <Newspaper className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {config.title || 'Centrum Aktualności'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {config.subtitle || 'Ogłoszenia, artykuły, wideo, pliki i wiele więcej.'}
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  const align = config.text_align || 'left';
  const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';

  return (
    <Wrapper>
      <div
        className="relative w-full overflow-hidden rounded-2xl shadow-xl"
        style={{ height: `${config.height}px` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${config.image_url}")`,
            backgroundSize: config.fit === 'fill' ? '100% 100%' : config.fit,
            backgroundPosition: config.position,
            backgroundRepeat: 'no-repeat',
          }}
        />
        {config.overlay_gradient ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${hexToRgba(config.overlay_color, config.overlay_opacity)} 0%, ${hexToRgba(config.overlay_color, config.overlay_opacity * 0.4)} 60%, ${hexToRgba(config.overlay_color, 0)} 100%)`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: hexToRgba(config.overlay_color, config.overlay_opacity) }}
          />
        )}
        <div className={`relative h-full flex flex-col justify-end p-6 md:p-10 gap-3 ${alignClass}`}>
          {config.title && (
            <h1
              className="font-bold tracking-tight leading-tight drop-shadow-lg"
              style={{ color: config.title_color, fontSize: `${config.title_size}px` }}
            >
              {config.title}
            </h1>
          )}
          {config.subtitle && (
            <p className="text-sm md:text-base max-w-2xl drop-shadow-md" style={{ color: config.subtitle_color }}>
              {config.subtitle}
            </p>
          )}
          {config.cta_label && config.cta_url && (
            <div className="mt-2">
              <a href={config.cta_url} target={config.cta_url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                <Button size="lg">{config.cta_label}</Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
