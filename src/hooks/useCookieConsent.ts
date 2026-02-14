import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CookieConsentSettings, CookieBannerSettings, CookieCategory, CookieBannerColors } from '@/types/cookies';

const VISITOR_ID_KEY = 'cookie_visitor_id';
const CONSENT_KEY = 'cookie_consents';
const CONSENT_DATE_KEY = 'cookie_consent_date';

// localStorage cache keys
const CACHE_SETTINGS_KEY = 'cookie_cache_settings';
const CACHE_BANNER_KEY = 'cookie_cache_banner';
const CACHE_CATEGORIES_KEY = 'cookie_cache_categories';
const CACHE_TIMESTAMP_KEY = 'cookie_cache_ts';
const CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

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

function getCachedData(): { settings: CookieConsentSettings | null; banner: CookieBannerSettings | null; categories: CookieCategory[]; isFresh: boolean } {
  try {
    const ts = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const isFresh = ts ? (Date.now() - parseInt(ts, 10)) < CACHE_MAX_AGE : false;

    const settings = localStorage.getItem(CACHE_SETTINGS_KEY);
    const banner = localStorage.getItem(CACHE_BANNER_KEY);
    const categories = localStorage.getItem(CACHE_CATEGORIES_KEY);

    return {
      settings: settings ? JSON.parse(settings) : null,
      banner: banner ? JSON.parse(banner) : null,
      categories: categories ? JSON.parse(categories) : [],
      isFresh,
    };
  } catch {
    return { settings: null, banner: null, categories: [], isFresh: false };
  }
}

function setCachedData(settings: CookieConsentSettings | null, banner: CookieBannerSettings | null, categories: CookieCategory[]) {
  try {
    if (settings) localStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(settings));
    if (banner) localStorage.setItem(CACHE_BANNER_KEY, JSON.stringify(banner));
    if (categories.length) localStorage.setItem(CACHE_CATEGORIES_KEY, JSON.stringify(categories));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch { /* quota exceeded — ignore */ }
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

  useEffect(() => {
    // 1. Load from localStorage cache instantly
    const cached = getCachedData();
    if (cached.settings) setSettings(cached.settings);
    if (cached.banner) setBannerSettings(cached.banner);
    if (cached.categories.length) setCategories(cached.categories);

    // Check existing consent
    const storedConsents = localStorage.getItem(CONSENT_KEY);
    const consentDate = localStorage.getItem(CONSENT_DATE_KEY);

    if (storedConsents && consentDate && cached.settings) {
      const consentTimestamp = new Date(consentDate).getTime();
      const expirationMs = cached.settings.consent_expiration_days * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - consentTimestamp > expirationMs;

      if (!isExpired) {
        setConsents(JSON.parse(storedConsents));
        setHasConsented(true);
        setShowBanner(false);
      } else {
        localStorage.removeItem(CONSENT_KEY);
        localStorage.removeItem(CONSENT_DATE_KEY);
        setShowBanner(cached.settings.is_active);
      }
    } else if (cached.settings) {
      setShowBanner(cached.settings.is_active);
    }

    // If cache is fresh, skip Supabase entirely
    if (cached.isFresh && cached.settings) {
      setIsLoading(false);
      return;
    }

    // 2. Background fetch from Supabase
    async function fetchFromSupabase() {
      try {
        const [settingsRes, bannerRes, categoriesRes] = await Promise.all([
          supabase.from('cookie_consent_settings').select('*').single(),
          supabase.from('cookie_banner_settings').select('*').single(),
          supabase.from('cookie_categories').select('*').order('position'),
        ]);

        const newSettings = settingsRes.data as CookieConsentSettings | null;
        let newBanner: CookieBannerSettings | null = null;
        const newCategories = (categoriesRes.data as CookieCategory[]) || [];

        if (bannerRes.data) {
          const data = bannerRes.data;
          newBanner = {
            ...data,
            colors: (typeof data.colors === 'string' ? JSON.parse(data.colors) : data.colors) as CookieBannerColors,
          } as CookieBannerSettings;
        }

        if (newSettings) setSettings(newSettings);
        if (newBanner) setBannerSettings(newBanner);
        if (newCategories.length) setCategories(newCategories);

        // Update cache
        setCachedData(newSettings, newBanner, newCategories);

        // Re-evaluate consent with fresh settings (only if no cached settings were used)
        if (!cached.settings && newSettings) {
          if (storedConsents && consentDate) {
            const consentTimestamp = new Date(consentDate).getTime();
            const expirationMs = newSettings.consent_expiration_days * 24 * 60 * 60 * 1000;
            const isExpired = Date.now() - consentTimestamp > expirationMs;
            if (!isExpired) {
              setConsents(JSON.parse(storedConsents));
              setHasConsented(true);
              setShowBanner(false);
            } else {
              localStorage.removeItem(CONSENT_KEY);
              localStorage.removeItem(CONSENT_DATE_KEY);
              setShowBanner(newSettings.is_active);
            }
          } else {
            setShowBanner(newSettings.is_active);
          }
        }
      } catch (error) {
        console.error('Error loading cookie consent settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFromSupabase();
  }, []);

  const saveConsent = useCallback(async (newConsents: Record<string, boolean>) => {
    const visitorId = getVisitorId();
    const now = new Date().toISOString();
    const expiresAt = settings
      ? new Date(Date.now() + settings.consent_expiration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsents));
    localStorage.setItem(CONSENT_DATE_KEY, now);

    try {
      const { data: existingConsent } = await supabase
        .from('user_cookie_consents')
        .select('id')
        .eq('visitor_id', visitorId)
        .maybeSingle();

      if (existingConsent) {
        await supabase
          .from('user_cookie_consents')
          .update({
            consents: newConsents,
            consent_given_at: now,
            expires_at: expiresAt,
            user_agent: navigator.userAgent,
          })
          .eq('visitor_id', visitorId);
      } else {
        await supabase.from('user_cookie_consents').insert({
          visitor_id: visitorId,
          consents: newConsents,
          consent_given_at: now,
          expires_at: expiresAt,
          user_agent: navigator.userAgent,
        });
      }
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }

    setConsents(newConsents);
    setHasConsented(true);
    setShowBanner(false);
    setShowPreferences(false);

    if (settings?.reload_on_consent) {
      window.location.reload();
    }
  }, [settings]);

  const acceptAll = useCallback(() => {
    const allConsents: Record<string, boolean> = {};
    categories.forEach(cat => { allConsents[cat.id] = true; });
    saveConsent(allConsents);
  }, [categories, saveConsent]);

  const rejectAll = useCallback(() => {
    const necessaryOnly: Record<string, boolean> = {};
    categories.forEach(cat => { necessaryOnly[cat.id] = cat.is_necessary; });
    saveConsent(necessaryOnly);
  }, [categories, saveConsent]);

  const savePreferences = useCallback((selectedConsents: Record<string, boolean>) => {
    const finalConsents: Record<string, boolean> = { ...selectedConsents };
    categories.forEach(cat => { if (cat.is_necessary) finalConsents[cat.id] = true; });
    saveConsent(finalConsents);
  }, [categories, saveConsent]);

  const openPreferences = useCallback(() => { setShowPreferences(true); }, []);
  const closePreferences = useCallback(() => { setShowPreferences(false); }, []);
  const reopenBanner = useCallback(() => { setShowBanner(true); }, []);

  const hasConsentFor = useCallback((categoryId: string): boolean => {
    return consents[categoryId] ?? false;
  }, [consents]);

  return {
    settings, bannerSettings, categories, consents, hasConsented,
    showBanner, showPreferences, isLoading,
    acceptAll, rejectAll, savePreferences,
    openPreferences, closePreferences, reopenBanner, hasConsentFor,
  };
}
