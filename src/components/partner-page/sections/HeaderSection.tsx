import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { InnerElementRenderer } from '@/components/admin/template-sections/InnerElementRenderer';
import { isExternalUrl } from '@/lib/urlUtils';

interface Props {
  config: Record<string, any>;
  partnerName?: string;
  disableSticky?: boolean;
  onSurveyOpen?: () => void;
  formKeys?: string[];
  onFormOpen?: (key: string) => void;
}

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
};

export const HeaderSection: React.FC<Props> = ({ config, partnerName, disableSticky, onSurveyOpen, formKeys, onFormOpen }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    logo_text, logo_image_url, buttons, nav_style,
    bg_color, text_color, border_color, hide_border,
    bg_opacity, padding_y,
    logo_font, logo_font_size, logo_font_weight, logo_height,
    nav_align, nav_text_color, nav_hover_color,
    nav_font, nav_font_size, nav_font_weight,
    show_partner_badge, partner_badge_style,
    inner_elements,
  } = config;

  const isLinks = nav_style === 'links';
  const opacity = bg_opacity ?? 1;

  const bgWithOpacity = bg_color
    ? (() => {
        const hex = bg_color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${opacity})`;
      })()
    : undefined;

  const navJustify = nav_align === 'left' ? 'flex-start' : nav_align === 'center' ? 'center' : 'flex-end';
  const navFontSizePx = FONT_SIZE_MAP[nav_font_size || 'sm'] || '14px';

  const handleNavClick = (e: React.MouseEvent, btn: any) => {
    const url = btn.url || '#';
    const external = isExternalUrl(url);
    const isAnchor = url.startsWith('#') && url.length > 1;

    if (isAnchor && url === '#ankieta' && onSurveyOpen) {
      e.preventDefault();
      onSurveyOpen();
      setMobileMenuOpen(false);
      return;
    }
    if (isAnchor && formKeys && onFormOpen) {
      const anchor = url.substring(1);
      if (formKeys.includes(anchor)) {
        e.preventDefault();
        onFormOpen(anchor);
        setMobileMenuOpen(false);
        return;
      }
    }
    if (isAnchor) {
      e.preventDefault();
      const anchor = url.substring(1);
      const el = document.getElementById(anchor)
        || Array.from(document.querySelectorAll('[id]')).find(n => n.id.toLowerCase() === anchor.toLowerCase());
      if (el) {
        const headerOffset = 80;
        const top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
    } else if (external) {
      e.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
      setMobileMenuOpen(false);
    }
  };

  const renderNavItem = (btn: any, i: number, mobile = false) => {
    const btnStyle: React.CSSProperties = {
      fontFamily: nav_font || undefined,
      fontSize: mobile ? '16px' : navFontSizePx,
      fontWeight: nav_font_weight || '500',
    };

    const url = btn.url || '#';
    const external = isExternalUrl(url);

    if (isLinks) {
      return (
        <a
          key={i}
          href={url}
          onClick={(e) => handleNavClick(e, btn)}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={`${mobile ? 'block w-full py-3 px-4' : 'px-3 py-2'} transition-colors cursor-pointer`}
          style={{
            ...btnStyle,
            color: nav_text_color || text_color || undefined,
          }}
          onMouseEnter={e => {
            if (nav_hover_color) (e.currentTarget as HTMLElement).style.color = nav_hover_color;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = nav_text_color || text_color || '';
          }}
        >
          {btn.text}
        </a>
      );
    }

    const isPrimary = btn.variant === 'primary';
    const btnBg = btn.bg_color || (isPrimary ? undefined : 'transparent');
    const btnText = btn.text_color || undefined;
    const btnBorder = btn.border_color || (isPrimary ? 'transparent' : undefined);
    const btnRadius = btn.border_radius != null ? `${btn.border_radius}px` : '8px';

    return (
      <a
        key={i}
        href={url}
        onClick={(e) => handleNavClick(e, btn)}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={
          mobile
            ? `block w-full text-center py-3 px-4 ${isPrimary && !btn.bg_color ? 'bg-primary text-primary-foreground' : ''} transition-all cursor-pointer`
            : isPrimary && !btn.bg_color
            ? 'bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90 transition-opacity cursor-pointer'
            : !isPrimary && !btn.bg_color
            ? 'border border-border text-foreground px-4 py-2 text-sm hover:bg-muted transition-colors cursor-pointer'
            : 'px-4 py-2 text-sm transition-all hover:opacity-90 cursor-pointer'
        }
        style={{
          ...btnStyle,
          backgroundColor: btnBg || undefined,
          color: btnText || undefined,
          borderColor: btnBorder || undefined,
          borderWidth: !isPrimary || btn.border_color ? '1px' : undefined,
          borderStyle: !isPrimary || btn.border_color ? 'solid' : undefined,
          borderRadius: btnRadius,
        }}
      >
        {btn.text}
      </a>
    );
  };

  return (
    <header
      className={`${disableSticky ? 'relative' : 'sticky top-0 z-50'} transition-all`}
      style={{
        backgroundColor: bgWithOpacity || '#ffffff',
        color: text_color || undefined,
        borderBottom: hide_border ? 'none' : `1px solid ${border_color || '#f3f4f6'}`,
        paddingBlock: `${padding_y ?? 12}px`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo + Partner Badge */}
        <div className="flex items-center gap-3 min-w-0">
          {logo_image_url ? (
            <img
              src={logo_image_url}
              alt={logo_text || ''}
              className="object-contain flex-shrink-0"
              style={{ height: `${logo_height || 40}px` }}
            />
          ) : (
            <span
              className="tracking-tight truncate"
              style={{
                fontSize: `${logo_font_size || 20}px`,
                fontWeight: logo_font_weight || '700',
                fontFamily: logo_font || undefined,
                color: text_color || undefined,
              }}
            >
              {logo_text || 'Logo'}
            </span>
          )}

          {/* Partner badge - hidden on mobile (shown in Hero) */}
          {show_partner_badge && config.partner_badge && (config.partner_badge.text || config.partner_badge.subtitle) ? (
            <div className="hidden md:flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl max-w-fit shadow-sm">
              {config.partner_badge.avatar_url && (
                <img src={config.partner_badge.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0" />
              )}
              <div>
                {config.partner_badge.text && (
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight" style={{ whiteSpace: 'pre-line' }}>{config.partner_badge.text}</p>
                )}
                {config.partner_badge.subtitle && (
                  <p className="text-xs font-semibold text-foreground leading-tight" style={{ whiteSpace: 'pre-line' }}>{config.partner_badge.subtitle}</p>
                )}
              </div>
            </div>
          ) : partnerName ? (
            <span className="text-sm hidden sm:inline text-muted-foreground" style={{ opacity: 0.6 }}>
              | {partnerName}
            </span>
          ) : null}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" style={{ justifyContent: navJustify }}>
          {(buttons || []).map((btn: any, i: number) => renderNavItem(btn, i))}
        </nav>

        {/* Mobile Hamburger */}
        {(buttons || []).length > 0 && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-border"
          style={{ backgroundColor: bgWithOpacity || '#ffffff' }}
        >
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
            {(buttons || []).map((btn: any, i: number) => renderNavItem(btn, i, true))}
          </div>
        </div>
      )}

      {/* Inner elements */}
      {inner_elements?.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {inner_elements.map((el: any) => (
            <InnerElementRenderer key={el.id} element={el} />
          ))}
        </div>
      )}
    </header>
  );
};
