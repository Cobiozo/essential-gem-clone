import React from 'react';

interface Props {
  config: Record<string, any>;
  partnerName?: string;
}

export const HeaderSection: React.FC<Props> = ({ config, partnerName }) => {
  const { logo_text, logo_image_url, buttons } = config;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logo_image_url ? (
            <img src={logo_image_url} alt={logo_text || ''} className="h-8 object-contain" />
          ) : (
            <span className="text-xl font-bold text-foreground tracking-tight">{logo_text || 'Logo'}</span>
          )}
          {partnerName && (
            <span className="text-sm text-muted-foreground hidden sm:inline">| {partnerName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(buttons || []).map((btn: any, i: number) => (
            <a
              key={i}
              href={btn.url || '#'}
              className={
                btn.variant === 'primary'
                  ? 'bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity'
                  : 'border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors'
              }
            >
              {btn.text}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
};
