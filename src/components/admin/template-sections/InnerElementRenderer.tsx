import React from 'react';
import type { InnerElement } from './InnerElementEditor';
import { Check } from 'lucide-react';

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
  xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem',
};

const FONT_WEIGHT_MAP: Record<string, number> = {
  normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};

const BORDER_RADIUS_MAP: Record<string, string> = {
  none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px',
};

const MAX_WIDTH_MAP: Record<string, string> = {
  full: '100%', lg: '1024px', md: '768px', sm: '640px',
};

const PADDING_MAP: Record<string, string> = {
  '0': '0', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem',
};

const getCommonStyles = (style: Record<string, any> = {}): React.CSSProperties => ({
  marginTop: style.margin_top && style.margin_top !== '0' ? `${parseInt(style.margin_top) * 0.25}rem` : undefined,
  marginBottom: style.margin_bottom && style.margin_bottom !== '0' ? `${parseInt(style.margin_bottom) * 0.25}rem` : undefined,
  padding: PADDING_MAP[style.padding] || undefined,
  opacity: style.opacity != null && style.opacity !== 1 ? style.opacity : undefined,
  backgroundColor: style.bg_color || undefined,
});

interface Props {
  element: InnerElement;
}

export const InnerElementRenderer: React.FC<Props> = ({ element }) => {
  const { type, content: c, style: s } = element;
  const common = getCommonStyles(s);

  switch (type) {
    case 'heading':
      return (
        <div style={{
          ...common,
          fontFamily: s?.font_family || undefined,
          fontSize: FONT_SIZE_MAP[s?.font_size || '2xl'],
          fontWeight: FONT_WEIGHT_MAP[s?.font_weight || 'bold'],
          textAlign: (s?.text_align as any) || 'left',
          color: s?.text_color || undefined,
        }}>
          {c?.text || ''}
        </div>
      );

    case 'text':
      return (
        <div style={{
          ...common,
          fontFamily: s?.font_family || undefined,
          fontSize: FONT_SIZE_MAP[s?.font_size || 'base'],
          textAlign: (s?.text_align as any) || 'left',
          color: s?.text_color || undefined,
          maxWidth: MAX_WIDTH_MAP[s?.max_width || 'full'],
          whiteSpace: 'pre-line',
        }}>
          {c?.text || ''}
        </div>
      );

    case 'image':
      if (!c?.url) return null;
      return (
        <div style={{ ...common, maxWidth: MAX_WIDTH_MAP[s?.max_width || 'full'] }}>
          <img
            src={c.url}
            alt={c.alt || ''}
            style={{ borderRadius: BORDER_RADIUS_MAP[s?.border_radius || 'md'], width: '100%', height: 'auto' }}
          />
        </div>
      );

    case 'button':
      return (
        <div style={{ ...common, textAlign: (s?.text_align as any) || 'left' }}>
          <a
            href={c?.url || '#'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 transition-all hover:opacity-90 shadow-md"
            style={{
              backgroundColor: s?.bg_color || '#2d6a4f',
              color: s?.text_color || '#ffffff',
              borderRadius: BORDER_RADIUS_MAP[s?.border_radius || 'full'],
              fontWeight: FONT_WEIGHT_MAP[s?.font_weight || 'bold'],
            }}
          >
            {c?.text || 'Kliknij'}
          </a>
        </div>
      );

    case 'badge':
      return (
        <div style={{ ...common, textAlign: (s?.text_align as any) || 'left' }}>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: s?.bg_color || '#f0fdf4',
              color: s?.text_color || '#166534',
              borderRadius: BORDER_RADIUS_MAP[s?.border_radius || 'full'],
            }}
          >
            {c?.icon && <span>{c.icon}</span>}
            {c?.text || ''}
          </span>
        </div>
      );

    case 'divider':
      return (
        <div style={{ ...common, maxWidth: MAX_WIDTH_MAP[s?.max_width || 'full'] }}>
          <hr style={{
            borderColor: c?.color || '#e5e7eb',
            borderWidth: `${c?.thickness || 1}px 0 0 0`,
            borderStyle: c?.style || 'solid',
          }} />
        </div>
      );

    case 'spacer':
      return <div style={{ ...common, height: `${c?.height || 32}px` }} />;

    case 'icon_list': {
      const items: Array<{ icon: string; text: string }> = c?.items || [];
      const iconColor = c?.icon_color || '#2d6a4f';
      return (
        <ul style={common} className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              {item.icon === '✓' || item.icon === '✔️' || item.icon === 'check' ? (
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: iconColor }}>
                  <Check className="w-3 h-3 text-white" />
                </span>
              ) : (
                <span className="flex-shrink-0 text-base" style={{ color: iconColor }}>{item.icon}</span>
              )}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'video':
      if (!c?.url) return null;
      return (
        <div style={common}>
          <video
            controls
            className="w-full"
            src={c.url}
            style={{ borderRadius: BORDER_RADIUS_MAP[s?.border_radius || 'lg'] }}
          />
        </div>
      );

    default:
      return null;
  }
};
