import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface I18nLanguage {
  id: string;
  code: string;
  name: string;
  native_name: string | null;
  flag_emoji: string;
  is_default: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface I18nTranslation {
  id: string;
  language_code: string;
  namespace: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface TranslationsMap {
  [languageCode: string]: {
    [namespace: string]: {
      [key: string]: string;
    };
  };
}

// Local cache for translations - loads once on app start
let translationsCache: TranslationsMap | null = null;
let languagesCache: I18nLanguage[] | null = null;
let cacheLoading = false;
let cacheListeners: (() => void)[] = [];

const notifyListeners = () => {
  cacheListeners.forEach(cb => cb());
};

export const loadTranslationsCache = async (): Promise<{ translations: TranslationsMap; languages: I18nLanguage[] }> => {
  // If already cached, return immediately
  if (translationsCache && languagesCache) {
    return { translations: translationsCache, languages: languagesCache };
  }

  // If loading in progress, wait for it
  if (cacheLoading) {
    return new Promise((resolve) => {
      const listener = () => {
        if (translationsCache && languagesCache) {
          resolve({ translations: translationsCache, languages: languagesCache });
        }
      };
      cacheListeners.push(listener);
    });
  }

  cacheLoading = true;

  try {
    // Fetch languages and translations in parallel
    const [languagesRes, translationsRes] = await Promise.all([
      supabase.from('i18n_languages').select('*').eq('is_active', true).order('position'),
      supabase.from('i18n_translations').select('*')
    ]);

    if (languagesRes.error) throw languagesRes.error;
    if (translationsRes.error) throw translationsRes.error;

    languagesCache = languagesRes.data || [];
    
    // Build translations map
    const map: TranslationsMap = {};
    for (const t of translationsRes.data || []) {
      if (!map[t.language_code]) map[t.language_code] = {};
      if (!map[t.language_code][t.namespace]) map[t.language_code][t.namespace] = {};
      map[t.language_code][t.namespace][t.key] = t.value;
    }
    translationsCache = map;

    notifyListeners();
    cacheListeners = [];

    return { translations: translationsCache, languages: languagesCache };
  } catch (error) {
    console.error('Error loading translations cache:', error);
    translationsCache = {};
    languagesCache = [];
    return { translations: {}, languages: [] };
  } finally {
    cacheLoading = false;
  }
};

export const invalidateTranslationsCache = () => {
  translationsCache = null;
  languagesCache = null;
};

export const getTranslation = (
  languageCode: string,
  fullKey: string,
  defaultLanguageCode: string = 'pl'
): string | null => {
  if (!translationsCache) return null;
  
  // Parse namespace.key format
  const [namespace, ...keyParts] = fullKey.split('.');
  const key = keyParts.join('.');
  
  // Try current language
  const value = translationsCache[languageCode]?.[namespace]?.[key];
  if (value) return value;
  
  // Fallback to default language
  if (languageCode !== defaultLanguageCode) {
    const fallback = translationsCache[defaultLanguageCode]?.[namespace]?.[key];
    if (fallback) return fallback;
  }
  
  return null;
};

export const useTranslations = () => {
  const [languages, setLanguages] = useState<I18nLanguage[]>(languagesCache || []);
  const [translations, setTranslations] = useState<TranslationsMap>(translationsCache || {});
  const [loading, setLoading] = useState(!translationsCache);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('pl');

  useEffect(() => {
    const load = async () => {
      if (translationsCache && languagesCache) {
        setLanguages(languagesCache);
        setTranslations(translationsCache);
        const def = languagesCache.find(l => l.is_default);
        if (def) setDefaultLanguage(def.code);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const { translations: t, languages: l } = await loadTranslationsCache();
      setLanguages(l);
      setTranslations(t);
      const def = l.find(lang => lang.is_default);
      if (def) setDefaultLanguage(def.code);
      setLoading(false);
    };
    load();
  }, []);

  const t = useCallback((key: string, languageCode?: string): string => {
    const lang = languageCode || defaultLanguage;
    const result = getTranslation(lang, key, defaultLanguage);
    return result ?? key;
  }, [defaultLanguage]);

  const refreshCache = useCallback(async () => {
    invalidateTranslationsCache();
    setLoading(true);
    const { translations: t, languages: l } = await loadTranslationsCache();
    setLanguages(l);
    setTranslations(t);
    setLoading(false);
  }, []);

  return {
    languages,
    translations,
    loading,
    defaultLanguage,
    t,
    refreshCache
  };
};

// Admin-only hooks for managing translations
export const useTranslationsAdmin = () => {
  const [languages, setLanguages] = useState<I18nLanguage[]>([]);
  const [translations, setTranslations] = useState<I18nTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [namespaces, setNamespaces] = useState<string[]>([]);

  const fetchLanguages = useCallback(async () => {
    const { data, error } = await supabase
      .from('i18n_languages')
      .select('*')
      .order('position');
    
    if (error) throw error;
    setLanguages(data || []);
    return data || [];
  }, []);

  const fetchTranslations = useCallback(async () => {
    const { data, error } = await supabase
      .from('i18n_translations')
      .select('*')
      .order('namespace')
      .order('key');
    
    if (error) throw error;
    setTranslations(data || []);
    
    // Extract unique namespaces
    const ns = [...new Set((data || []).map(t => t.namespace))];
    setNamespaces(ns);
    
    return data || [];
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchLanguages(), fetchTranslations()]);
    } catch (error) {
      console.error('Error loading translations admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchLanguages, fetchTranslations]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Language CRUD
  const createLanguage = async (language: { code: string; name: string; native_name?: string; flag_emoji?: string; is_active?: boolean; position?: number }) => {
    const { data, error } = await supabase
      .from('i18n_languages')
      .insert([{
        code: language.code,
        name: language.name,
        native_name: language.native_name || null,
        flag_emoji: language.flag_emoji || '🏳️',
        is_active: language.is_active ?? true,
        position: language.position ?? 0
      }])
      .select()
      .single();
    
    if (error) throw error;
    await fetchLanguages();
    invalidateTranslationsCache();
    return data;
  };

  const updateLanguage = async (id: string, updates: Partial<I18nLanguage>) => {
    const { error } = await supabase
      .from('i18n_languages')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    await fetchLanguages();
    invalidateTranslationsCache();
  };

  const deleteLanguage = async (id: string) => {
    const { error } = await supabase
      .from('i18n_languages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchLanguages();
    invalidateTranslationsCache();
  };

  const setDefaultLanguage = async (code: string) => {
    // First, unset all defaults
    await supabase
      .from('i18n_languages')
      .update({ is_default: false })
      .neq('code', code);
    
    // Then set the new default
    const { error } = await supabase
      .from('i18n_languages')
      .update({ is_default: true })
      .eq('code', code);
    
    if (error) throw error;
    await fetchLanguages();
    invalidateTranslationsCache();
  };

  // Translation CRUD
  const upsertTranslation = async (
    languageCode: string,
    namespace: string,
    key: string,
    value: string
  ) => {
    const { error } = await supabase
      .from('i18n_translations')
      .upsert({
        language_code: languageCode,
        namespace,
        key,
        value
      }, {
        onConflict: 'language_code,namespace,key'
      });
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  const deleteTranslation = async (id: string) => {
    const { error } = await supabase
      .from('i18n_translations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  const deleteTranslationKey = async (namespace: string, key: string) => {
    const { error } = await supabase
      .from('i18n_translations')
      .delete()
      .eq('namespace', namespace)
      .eq('key', key);
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  // Bulk operations
  const importTranslations = async (data: TranslationsMap) => {
    const inserts: { language_code: string; namespace: string; key: string; value: string }[] = [];
    
    for (const [langCode, namespaces] of Object.entries(data)) {
      for (const [namespace, keys] of Object.entries(namespaces)) {
        for (const [key, value] of Object.entries(keys)) {
          inserts.push({
            language_code: langCode,
            namespace,
            key,
            value
          });
        }
      }
    }
    
    if (inserts.length === 0) return;
    
    const { error } = await supabase
      .from('i18n_translations')
      .upsert(inserts, {
        onConflict: 'language_code,namespace,key'
      });
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  const exportTranslations = (): TranslationsMap => {
    const result: TranslationsMap = {};
    
    for (const t of translations) {
      if (!result[t.language_code]) result[t.language_code] = {};
      if (!result[t.language_code][t.namespace]) result[t.language_code][t.namespace] = {};
      result[t.language_code][t.namespace][t.key] = t.value;
    }
    
    return result;
  };

  return {
    languages,
    translations,
    namespaces,
    loading,
    refresh: loadAll,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    setDefaultLanguage,
    upsertTranslation,
    deleteTranslation,
    deleteTranslationKey,
    importTranslations,
    exportTranslations
  };
};
