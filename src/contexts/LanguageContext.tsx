import React, { useEffect, useState, useCallback } from 'react';
import { loadTranslationsCache, getTranslation, invalidateTranslationsCache, loadLanguageTranslations, TranslationsMap } from '@/hooks/useTranslations';

export type Language = 'pl' | 'de' | 'en' | string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  refreshTranslations: () => Promise<void>;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

// Default context value to prevent undefined errors during hot reload
const defaultContextValue: LanguageContextType = {
  language: 'pl' as Language,
  setLanguage: () => {},
  t: (key: string) => key,
  refreshTranslations: async () => {}
};

// Track missing keys to avoid duplicate warnings
const missingKeysWarned = new Set<string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('pure-life-language');
      return (saved as Language) || 'pl';
    } catch (error) {
      console.warn('Failed to get language from localStorage, using default');
      return 'pl';
    }
  });

  const [dbTranslations, setDbTranslations] = useState<TranslationsMap | null>(null);
  const [defaultLang, setDefaultLang] = useState<string>('pl');
  const [translationVersion, setTranslationVersion] = useState(0);

  // Load database translations on mount
  useEffect(() => {
    loadTranslationsCache().then(({ translations: t, languages }) => {
      setDbTranslations(t);
      const def = languages.find(l => l.is_default);
      if (def) setDefaultLang(def.code);
    }).catch(err => {
      console.warn('Failed to load translations from database:', err);
    });
  }, []);

  // Lazy load translations when language changes
  useEffect(() => {
    const loadLangTranslations = async () => {
      // Lazy load translations for new language if not already loaded
      // loadLanguageTranslations updates translationsCache internally
      await loadLanguageTranslations(language);
      
      // Get translations from memory cache (no additional fetch)
      // loadTranslationsCache returns cached data if already loaded
      const { translations: t } = await loadTranslationsCache(language);
      setDbTranslations(t);
      
      // KLUCZOWE: Wymuszenie re-rendera t() nawet gdy dbTranslations się nie zmienia
      setTranslationVersion(v => v + 1);
    };
    loadLangTranslations();
    
    try {
      localStorage.setItem('pure-life-language', language);
      document.documentElement.lang = language;
    } catch (error) {
      console.warn('Failed to save language to localStorage');
    }
  }, [language]);

  const refreshTranslations = useCallback(async () => {
    invalidateTranslationsCache();
    const { translations: t, languages } = await loadTranslationsCache(language);
    setDbTranslations(t);
    const def = languages.find(l => l.is_default);
    if (def) setDefaultLang(def.code);
  }, [language]);

  const t = useCallback((key: string): string => {
    // Get translation from database
    const dbValue = getTranslation(language, key, defaultLang);
    if (dbValue) return dbValue;
    
    // Log missing keys in development (once per key)
    if (process.env.NODE_ENV === 'development' && !missingKeysWarned.has(key)) {
      missingKeysWarned.add(key);
      console.warn(`[i18n] Missing translation: "${key}" for language "${language}"`);
    }
    
    // Return key as fallback
    return key;
  }, [language, defaultLang, dbTranslations, translationVersion]);

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
    refreshTranslations
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    console.warn('useLanguage must be used within a LanguageProvider, using default values');
    return defaultContextValue;
  }
  return context;
};
