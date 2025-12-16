import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CookieBannerSettings, CookieCategory } from '@/types/cookies';
import { cn } from '@/lib/utils';

interface CookiePreferenceCenterProps {
  bannerSettings: CookieBannerSettings;
  categories: CookieCategory[];
  currentConsents: Record<string, boolean>;
  onSave: (consents: Record<string, boolean>) => void;
  onClose: () => void;
}

export function CookiePreferenceCenter({
  bannerSettings,
  categories,
  currentConsents,
  onSave,
  onClose,
}: CookiePreferenceCenterProps) {
  const [localConsents, setLocalConsents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach(cat => {
      initial[cat.id] = currentConsents[cat.id] ?? cat.is_necessary;
    });
    return initial;
  });

  const colors = bannerSettings.colors;
  const type = bannerSettings.preference_center_type;

  const getContainerClasses = () => {
    if (type === 'sidebar') {
      return 'fixed inset-y-0 right-0 w-full max-w-md z-[9999] shadow-2xl';
    }
    if (type === 'pushdown') {
      return 'fixed top-0 left-0 right-0 z-[9999] shadow-lg';
    }
    // center
    return 'fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]';
  };

  const getPanelClasses = () => {
    if (type === 'sidebar') {
      return 'h-full flex flex-col';
    }
    if (type === 'pushdown') {
      return 'w-full';
    }
    return 'w-full max-w-lg mx-4 rounded-lg max-h-[90vh] flex flex-col';
  };

  const panelStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
  };

  const handleToggle = (categoryId: string, checked: boolean) => {
    setLocalConsents(prev => ({
      ...prev,
      [categoryId]: checked,
    }));
  };

  const handleSave = () => {
    onSave(localConsents);
  };

  const handleAcceptAll = () => {
    const allEnabled: Record<string, boolean> = {};
    categories.forEach(cat => {
      allEnabled[cat.id] = true;
    });
    onSave(allEnabled);
  };

  const handleRejectAll = () => {
    const necessaryOnly: Record<string, boolean> = {};
    categories.forEach(cat => {
      necessaryOnly[cat.id] = cat.is_necessary;
    });
    onSave(necessaryOnly);
  };

  const visibleCategories = categories.filter(c => !c.is_hidden);

  return (
    <div className={getContainerClasses()}>
      <div 
        className={cn(getPanelClasses(), 'border')}
        style={panelStyle}
      >
        {/* Custom CSS */}
        {bannerSettings.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: bannerSettings.custom_css }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <h2 className="font-semibold text-lg" style={{ color: colors.title }}>
            Ustawienia plików cookie
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: colors.text }}
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          <p className="text-sm mb-6" style={{ color: colors.text }}>
            {bannerSettings.message}
          </p>

          <div className="space-y-4">
            {visibleCategories.map(category => (
              <div 
                key={category.id}
                className="p-4 rounded-lg border"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium" style={{ color: colors.title }}>
                    {category.name}
                    {category.is_necessary && (
                      <span 
                        className="ml-2 text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: colors.buttonSecondaryBg,
                          color: colors.buttonSecondaryText,
                        }}
                      >
                        Wymagane
                      </span>
                    )}
                  </h3>
                  <Switch
                    checked={localConsents[category.id] ?? category.is_necessary}
                    disabled={category.is_necessary}
                    onCheckedChange={(checked) => handleToggle(category.id, checked)}
                    style={{
                      '--switch-on': colors.toggleOn,
                      '--switch-off': colors.toggleOff,
                    } as React.CSSProperties}
                  />
                </div>
                {category.description && (
                  <p className="text-sm" style={{ color: colors.text }}>
                    {category.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Privacy Policy Link */}
          {bannerSettings.privacy_policy_url && (
            <a
              href={bannerSettings.privacy_policy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline mt-4 inline-block"
              style={{ color: colors.link }}
            >
              {bannerSettings.read_more_text}
            </a>
          )}
        </ScrollArea>

        {/* Footer with buttons */}
        <div className="p-4 border-t flex flex-wrap gap-2" style={{ borderColor: colors.border }}>
          <Button
            onClick={handleSave}
            className="flex-1"
            style={{ 
              backgroundColor: colors.buttonPrimaryBg,
              color: colors.buttonPrimaryText,
            }}
          >
            {bannerSettings.save_preferences_text}
          </Button>
          <Button
            onClick={handleAcceptAll}
            variant="outline"
            className="flex-1"
            style={{ 
              backgroundColor: colors.buttonSecondaryBg,
              color: colors.buttonSecondaryText,
              borderColor: colors.border,
            }}
          >
            {bannerSettings.accept_all_text}
          </Button>
          <Button
            onClick={handleRejectAll}
            variant="outline"
            className="flex-1"
            style={{ 
              backgroundColor: colors.buttonSecondaryBg,
              color: colors.buttonSecondaryText,
              borderColor: colors.border,
            }}
          >
            {bannerSettings.reject_all_text}
          </Button>
        </div>
      </div>
    </div>
  );
}
