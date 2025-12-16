import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CookieConsentSettings, CookieBannerSettings, CookieCategory, CookieBannerColors } from '@/types/cookies';

const VISITOR_ID_KEY = 'cookie_visitor_id';
const CONSENT_KEY = 'cookie_consents';
const CONSENT_DATE_KEY = 'cookie_consent_date';

function generateVisitorId(): string {
  return 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function useCookieConsent() {
  const [settings, setSettings] = useState<CookieConsentSettings | null>(null);
  const [bannerSettings, setBannerSettings] = useState<CookieBannerSettings | null>(null);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings and check existing consent
  useEffect(() => {
    async function loadData() {
      try {
        // Load settings
        const [settingsRes, bannerRes, categoriesRes] = await Promise.all([
          supabase.from('cookie_consent_settings').select('*').single(),
          supabase.from('cookie_banner_settings').select('*').single(),
          supabase.from('cookie_categories').select('*').order('position'),
        ]);

        if (settingsRes.data) {
          setSettings(settingsRes.data as CookieConsentSettings);
        }
        
        if (bannerRes.data) {
          const data = bannerRes.data;
          setBannerSettings({
            ...data,
            colors: (typeof data.colors === 'string' ? JSON.parse(data.colors) : data.colors) as CookieBannerColors,
          } as CookieBannerSettings);
        }
        
        if (categoriesRes.data) {
          setCategories(categoriesRes.data as CookieCategory[]);
        }

        // Check existing consent from localStorage
        const storedConsents = localStorage.getItem(CONSENT_KEY);
        const consentDate = localStorage.getItem(CONSENT_DATE_KEY);
        
        if (storedConsents && consentDate && settingsRes.data) {
          const consentTimestamp = new Date(consentDate).getTime();
          const expirationMs = (settingsRes.data as CookieConsentSettings).consent_expiration_days * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - consentTimestamp > expirationMs;
          
          if (!isExpired) {
            setConsents(JSON.parse(storedConsents));
            setHasConsented(true);
            setShowBanner(false);
          } else {
            // Consent expired
            localStorage.removeItem(CONSENT_KEY);
            localStorage.removeItem(CONSENT_DATE_KEY);
            setShowBanner(settingsRes.data.is_active);
          }
        } else {
          // No consent yet
          setShowBanner(settingsRes.data?.is_active ?? false);
        }
      } catch (error) {
        console.error('Error loading cookie consent settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const saveConsent = useCallback(async (newConsents: Record<string, boolean>) => {
    const visitorId = getVisitorId();
    const now = new Date().toISOString();
    const expiresAt = settings 
      ? new Date(Date.now() + settings.consent_expiration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Save to localStorage
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsents));
    localStorage.setItem(CONSENT_DATE_KEY, now);

    // Save to database
    try {
      await supabase.from('user_cookie_consents').insert({
        visitor_id: visitorId,
        consents: newConsents,
        consent_given_at: now,
        expires_at: expiresAt,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }

    setConsents(newConsents);
    setHasConsented(true);
    setShowBanner(false);
    setShowPreferences(false);

    // Reload page if setting is enabled
    if (settings?.reload_on_consent) {
      window.location.reload();
    }
  }, [settings]);

  const acceptAll = useCallback(() => {
    const allConsents: Record<string, boolean> = {};
    categories.forEach(cat => {
      allConsents[cat.id] = true;
    });
    saveConsent(allConsents);
  }, [categories, saveConsent]);

  const rejectAll = useCallback(() => {
    const necessaryOnly: Record<string, boolean> = {};
    categories.forEach(cat => {
      necessaryOnly[cat.id] = cat.is_necessary;
    });
    saveConsent(necessaryOnly);
  }, [categories, saveConsent]);

  const savePreferences = useCallback((selectedConsents: Record<string, boolean>) => {
    // Ensure necessary cookies are always enabled
    const finalConsents: Record<string, boolean> = { ...selectedConsents };
    categories.forEach(cat => {
      if (cat.is_necessary) {
        finalConsents[cat.id] = true;
      }
    });
    saveConsent(finalConsents);
  }, [categories, saveConsent]);

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  const reopenBanner = useCallback(() => {
    setShowBanner(true);
  }, []);

  const hasConsentFor = useCallback((categoryId: string): boolean => {
    return consents[categoryId] ?? false;
  }, [consents]);

  return {
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
    hasConsentFor,
  };
}
