import { useState } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { CookiePreferenceCenter } from './CookiePreferenceCenter';
import { CookieRevisitButton } from './CookieRevisitButton';
import { cn } from '@/lib/utils';

export function CookieConsentBanner() {
  const {
    settings,
    bannerSettings,
    categories,
    consents,
    hasConsented,
    showBanner,
    showPreferences,
    isLoading,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    closePreferences,
    reopenBanner,
  } = useCookieConsent();

  const [localConsents, setLocalConsents] = useState<Record<string, boolean>>({});

  if (isLoading || !settings?.is_active || !bannerSettings) {
    return null;
  }

  const colors = bannerSettings.colors;
  const isDark = bannerSettings.theme === 'dark' || 
    (bannerSettings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const getPositionClasses = () => {
    const { layout_type, position } = bannerSettings;
    
    if (layout_type === 'popup' || position === 'center') {
      return 'fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]';
    }
    
    if (layout_type === 'banner') {
      if (position.startsWith('top')) return 'fixed top-0 left-0 right-0 z-[9999]';
      return 'fixed bottom-0 left-0 right-0 z-[9999]';
    }
    
    // Box layout
    const positionMap: Record<string, string> = {
      'bottom-left': 'fixed bottom-4 left-4 z-[9999]',
      'bottom-right': 'fixed bottom-4 right-4 z-[9999]',
      'top-left': 'fixed top-4 left-4 z-[9999]',
      'top-right': 'fixed top-4 right-4 z-[9999]',
      'top': 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999]',
      'bottom': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]',
    };
    return positionMap[position] || positionMap['bottom-left'];
  };

  const getBannerClasses = () => {
    const { layout_type } = bannerSettings;
    if (layout_type === 'banner') return 'w-full p-4 md:p-6';
    if (layout_type === 'popup') return 'w-full max-w-lg p-6 rounded-lg shadow-2xl mx-4';
    return 'w-full max-w-md p-4 rounded-lg shadow-lg'; // box
  };

  const bannerStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    '--cookie-title': colors.title,
    '--cookie-text': colors.text,
    '--cookie-btn-primary-bg': colors.buttonPrimaryBg,
    '--cookie-btn-primary-text': colors.buttonPrimaryText,
    '--cookie-btn-secondary-bg': colors.buttonSecondaryBg,
    '--cookie-btn-secondary-text': colors.buttonSecondaryText,
    '--cookie-link': colors.link,
  } as React.CSSProperties;

  // Preference Center
  if (showPreferences) {
    return (
      <CookiePreferenceCenter
        bannerSettings={bannerSettings}
        categories={categories}
        currentConsents={hasConsented ? consents : localConsents}
        onSave={savePreferences}
        onClose={closePreferences}
      />
    );
  }

  // Main Banner
  if (showBanner) {
    return (
      <>
        <div className={getPositionClasses()}>
          <div 
            className={cn(getBannerClasses(), 'border')}
            style={bannerStyle}
          >
            {/* Custom CSS */}
            {bannerSettings.custom_css && (
              <style dangerouslySetInnerHTML={{ __html: bannerSettings.custom_css }} />
            )}

            {/* Close button */}
            {bannerSettings.show_close_button && (
              <button
                onClick={rejectAll}
                className="absolute top-2 right-2 p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: colors.text }}
                aria-label="Zamknij"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Logo */}
            {bannerSettings.custom_logo_url && (
              <img 
                src={bannerSettings.custom_logo_url} 
                alt="Logo" 
                className="h-8 mb-3"
              />
            )}

            {/* Title */}
            <h3 
              className="font-semibold text-lg mb-2 pr-6"
              style={{ color: colors.title }}
            >
              {bannerSettings.title}
            </h3>

            {/* Message */}
            <p 
              className="text-sm mb-4"
              style={{ color: colors.text }}
            >
              {bannerSettings.message}
            </p>

            {/* Privacy Policy Link */}
            {bannerSettings.privacy_policy_url && (
              <a
                href={bannerSettings.privacy_policy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline mb-4 inline-block"
                style={{ color: colors.link }}
              >
                {bannerSettings.read_more_text}
              </a>
            )}

            {/* Categories on first layer */}
            {bannerSettings.categories_on_first_layer && (
              <div className="mb-4 space-y-2">
                {categories.filter(c => !c.is_hidden).map(category => (
                  <label 
                    key={category.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    style={{ color: colors.text }}
                  >
                    <input
                      type="checkbox"
                      checked={localConsents[category.id] ?? category.is_necessary}
                      disabled={category.is_necessary}
                      onChange={(e) => setLocalConsents(prev => ({
                        ...prev,
                        [category.id]: e.target.checked
                      }))}
                      className="rounded"
                      style={{ accentColor: colors.toggleOn }}
                    />
                    {category.name}
                    {category.is_necessary && (
                      <span className="text-xs opacity-60">(wymagane)</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-2">
              {bannerSettings.show_accept_all && (
                <Button
                  onClick={acceptAll}
                  className="flex-1 min-w-[120px]"
                  style={{ 
                    backgroundColor: colors.buttonPrimaryBg,
                    color: colors.buttonPrimaryText,
                  }}
                >
                  {bannerSettings.accept_all_text}
                </Button>
              )}
              
              {bannerSettings.show_reject_all && (
                <Button
                  onClick={rejectAll}
                  variant="outline"
                  className="flex-1 min-w-[120px]"
                  style={{ 
                    backgroundColor: colors.buttonSecondaryBg,
                    color: colors.buttonSecondaryText,
                    borderColor: colors.border,
                  }}
                >
                  {bannerSettings.reject_all_text}
                </Button>
              )}
              
              {bannerSettings.show_customize && (
                <Button
                  onClick={openPreferences}
                  variant="outline"
                  className="flex-1 min-w-[120px]"
                  style={{ 
                    backgroundColor: colors.buttonSecondaryBg,
                    color: colors.buttonSecondaryText,
                    borderColor: colors.border,
                  }}
                >
                  {bannerSettings.customize_text}
                </Button>
              )}
            </div>

            {/* Branding */}
            {bannerSettings.show_branding && (
              <p className="text-xs mt-3 opacity-50 text-center" style={{ color: colors.text }}>
                Powered by Pure Life CMS
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  // Revisit Button (only shown when consent already given)
  if (hasConsented && bannerSettings.revisit_button_enabled) {
    return (
      <CookieRevisitButton
        bannerSettings={bannerSettings}
        onClick={reopenBanner}
      />
    );
  }

  return null;
}
