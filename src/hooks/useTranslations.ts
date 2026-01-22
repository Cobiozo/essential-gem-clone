import { useState, useEffect, useCallback } from 'react';
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

export interface LanguageTranslations {
  [namespace: string]: {
    [key: string]: string;
  };
}

export interface LanguageStats {
  total: number;
  translated: number;
  percentage: number;
}

// Local cache for translations - loads only needed languages
let translationsCache: TranslationsMap | null = null;
let languagesCache: I18nLanguage[] | null = null;
let cacheLoading = false;
const cacheListeners = new Set<() => void>();
let loadedLanguages: Set<string> = new Set(); // Track which languages are loaded

// Promise deduplication - prevents concurrent fetches for the same language
const pendingLanguageFetches: Map<string, Promise<I18nTranslation[]>> = new Map();

// Cache version - increment this when translation structure changes to force refresh
const CACHE_VERSION = 3;

// localStorage cache with 5-minute TTL (optimization)
const LS_CACHE_KEY = 'i18n_translations_cache';
const LS_CACHE_VERSION_KEY = 'i18n_cache_version';
const LS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface LSCacheEntry {
  data: I18nTranslation[];
  timestamp: number;
  version: number;
}

// Check and clear cache if version mismatch
const checkCacheVersion = (): void => {
  try {
    const storedVersion = localStorage.getItem(LS_CACHE_VERSION_KEY);
    if (!storedVersion || parseInt(storedVersion) !== CACHE_VERSION) {
      if (isDev) console.log(`Cache version mismatch (stored: ${storedVersion}, current: ${CACHE_VERSION}). Clearing cache...`);
      // Clear all translation caches
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_CACHE_KEY));
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(LS_CACHE_VERSION_KEY, String(CACHE_VERSION));
    }
  } catch (e) {
    console.warn('Failed to check cache version:', e);
  }
};

// Run version check on module load
checkCacheVersion();

const getLocalStorageCache = (langCode: string): I18nTranslation[] | null => {
  try {
    const cached = localStorage.getItem(`${LS_CACHE_KEY}_${langCode}`);
    if (cached) {
      const { data, timestamp, version }: LSCacheEntry = JSON.parse(cached);
      // Check both version AND TTL
      if (version === CACHE_VERSION && Date.now() - timestamp < LS_CACHE_TTL) {
        if (isDev) console.log(`Using localStorage cache for translations: ${langCode}`);
        return data;
      }
      // Clear outdated cache
      localStorage.removeItem(`${LS_CACHE_KEY}_${langCode}`);
    }
  } catch (e) {
    console.warn('Failed to read localStorage translation cache:', e);
  }
  return null;
};

const setLocalStorageCache = (langCode: string, data: I18nTranslation[]): void => {
  try {
    localStorage.setItem(`${LS_CACHE_KEY}_${langCode}`, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }));
  } catch (e) {
    console.warn('Failed to save localStorage translation cache:', e);
  }
};

// Async localStorage save - prevents UI blocking on Chrome with large data
const setLocalStorageCacheAsync = (langCode: string, data: I18nTranslation[]): void => {
  const saveToStorage = () => {
    try {
      localStorage.setItem(`${LS_CACHE_KEY}_${langCode}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }));
    } catch (e) {
      console.warn('Failed to save localStorage translation cache:', e);
    }
  };
  
  // Use requestIdleCallback for Chrome/Edge optimization
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(saveToStorage, { timeout: 3000 });
  } else {
    // Fallback for Safari/Firefox - minimal delay to not block UI
    setTimeout(saveToStorage, 1);
  }
};

const isDev = process.env.NODE_ENV === 'development';

const notifyListeners = () => {
  cacheListeners.forEach(cb => cb());
};

// Fetch translations for specific languages only (optimization with localStorage cache + deduplication)
const fetchTranslationsForLanguages = async (languageCodes: string[]): Promise<I18nTranslation[]> => {
  const allData: I18nTranslation[] = [];
  const langsToFetch: string[] = [];
  
  // Check localStorage cache and pending fetches first
  for (const langCode of languageCodes) {
    // Check if fetch is already in progress for this language
    if (pendingLanguageFetches.has(langCode)) {
      if (isDev) console.log(`[i18n] Waiting for pending fetch: ${langCode}`);
      const pendingData = await pendingLanguageFetches.get(langCode)!;
      allData.push(...pendingData);
      continue;
    }
    
    // Check localStorage cache
    const cached = getLocalStorageCache(langCode);
    if (cached) {
      allData.push(...cached);
    } else {
      langsToFetch.push(langCode);
    }
  }
  
  // Fetch only non-cached languages from DB with deduplication
  for (const langCode of langsToFetch) {
    const fetchPromise = (async (): Promise<I18nTranslation[]> => {
      const langData: I18nTranslation[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('i18n_translations')
          .select('*')
          .eq('language_code', langCode)
          .range(from, from + pageSize - 1)
          .order('namespace')
          .order('key');

        if (error) throw error;
        
        if (data && data.length > 0) {
          langData.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      // Save to localStorage cache asynchronously (Chrome optimization)
      if (langData.length > 0) {
        setLocalStorageCacheAsync(langCode, langData);
      }
      
      return langData;
    })();
    
    // Register pending fetch to prevent duplicates
    pendingLanguageFetches.set(langCode, fetchPromise);
    
    try {
      const data = await fetchPromise;
      allData.push(...data);
    } finally {
      // Clean up after completion
      pendingLanguageFetches.delete(langCode);
    }
  }

  return allData;
};

// Fetch all rows with pagination (for admin panel only)
const fetchAllTranslations = async (): Promise<I18nTranslation[]> => {
  const allData: I18nTranslation[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('i18n_translations')
      .select('*')
      .range(from, from + pageSize - 1)
      .order('namespace')
      .order('key');

    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
};

// Load translations for specific language (lazy loading)
export const loadLanguageTranslations = async (langCode: string): Promise<void> => {
  if (loadedLanguages.has(langCode)) return;
  
  try {
    const translations = await fetchTranslationsForLanguages([langCode]);
    
    if (!translationsCache) translationsCache = {};
    
    for (const t of translations) {
      if (!translationsCache[t.language_code]) translationsCache[t.language_code] = {};
      if (!translationsCache[t.language_code][t.namespace]) translationsCache[t.language_code][t.namespace] = {};
      translationsCache[t.language_code][t.namespace][t.key] = t.value;
    }
    
    loadedLanguages.add(langCode);
    if (isDev) console.log(`Lazy loaded translations for: ${langCode}`);
  } catch (error) {
    console.error(`Error loading translations for ${langCode}:`, error);
  }
};

export const loadTranslationsCache = async (currentLanguage: string = 'pl'): Promise<{ translations: TranslationsMap; languages: I18nLanguage[] }> => {
  if (translationsCache && languagesCache && loadedLanguages.has('pl') && loadedLanguages.has(currentLanguage)) {
    return { translations: translationsCache, languages: languagesCache };
  }

  if (cacheLoading) {
    return new Promise((resolve) => {
      const listener = () => {
        if (translationsCache && languagesCache) {
          resolve({ translations: translationsCache, languages: languagesCache });
        }
      };
      cacheListeners.add(listener);
    });
  }

  cacheLoading = true;

  try {
    // Load languages first
    const languagesRes = await supabase
      .from('i18n_languages')
      .select('*')
      .eq('is_active', true)
      .order('position');

    if (languagesRes.error) throw languagesRes.error;
    languagesCache = languagesRes.data || [];
    
    // Load only default language (pl) + current language (optimization: ~67% less data)
    const languagesToLoad = ['pl'];
    if (currentLanguage !== 'pl') {
      languagesToLoad.push(currentLanguage);
    }
    
    const translationsData = await fetchTranslationsForLanguages(languagesToLoad);
    if (isDev) console.log(`Loaded ${translationsData.length} translations for languages: ${languagesToLoad.join(', ')}`);
    
    const map: TranslationsMap = {};
    for (const t of translationsData) {
      if (!map[t.language_code]) map[t.language_code] = {};
      if (!map[t.language_code][t.namespace]) map[t.language_code][t.namespace] = {};
      map[t.language_code][t.namespace][t.key] = t.value;
    }
    translationsCache = map;
    languagesToLoad.forEach(lang => loadedLanguages.add(lang));

    notifyListeners();
    cacheListeners.clear();

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
  loadedLanguages.clear();
  // Also clear localStorage cache
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_CACHE_KEY));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Failed to clear localStorage translation cache:', e);
  }
};

export const getTranslation = (
  languageCode: string,
  fullKey: string,
  defaultLanguageCode: string = 'pl'
): string | null => {
  if (!translationsCache) return null;
  
  const searchInLang = (langCache: { [ns: string]: { [key: string]: string } }): string | null => {
    // Strategy 1: Parse fullKey as "namespace.key" (e.g., 'auth.signIn' -> namespace='auth', key='signIn')
    const [maybeNamespace, ...keyParts] = fullKey.split('.');
    if (keyParts.length > 0) {
      const key = keyParts.join('.');
      const value = langCache[maybeNamespace]?.[key];
      if (value) return value;
    }
    
    // Strategy 2: Search fullKey directly across all namespaces (for keys stored as full strings)
    const namespaces = ['common', ...Object.keys(langCache).filter(n => n !== 'common')];
    for (const namespace of namespaces) {
      const value = langCache[namespace]?.[fullKey];
      if (value) return value;
    }
    
    // Strategy 3: Search just the last part of the key as fallback
    if (keyParts.length > 0) {
      const lastKeyPart = keyParts[keyParts.length - 1];
      for (const namespace of namespaces) {
        const value = langCache[namespace]?.[lastKeyPart];
        if (value) return value;
      }
    }
    
    return null;
  };
  
  // Search in requested language
  const langCache = translationsCache[languageCode];
  if (langCache) {
    const value = searchInLang(langCache);
    if (value) return value;
  }
  
  // Fallback to default language
  if (languageCode !== defaultLanguageCode) {
    const defaultCache = translationsCache[defaultLanguageCode];
    if (defaultCache) {
      const value = searchInLang(defaultCache);
      if (value) return value;
    }
  }
  
  return null;
};

export const useTranslations = () => {
  const [languages, setLanguages] = useState<I18nLanguage[]>(languagesCache || []);
  const [translations, setTranslations] = useState<TranslationsMap>(translationsCache || {});
  const [loading, setLoading] = useState(!translationsCache);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('pl');
  const [, forceUpdate] = useState({});

  // Register cache listener with proper cleanup to prevent memory leaks
  useEffect(() => {
    const listener = () => forceUpdate({});
    cacheListeners.add(listener);
    
    return () => {
      cacheListeners.delete(listener); // Set.delete is atomic - no race conditions
    };
  }, []);

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
    // Use pagination to fetch all translations (bypass 1000 limit)
    const data = await fetchAllTranslations();
    setTranslations(data);
    
    const ns = [...new Set(data.map(t => t.namespace))];
    setNamespaces(ns);
    
    return data;
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

  const deleteLanguage = async (id: string, code: string) => {
    // First delete all translations for this language
    await supabase
      .from('i18n_translations')
      .delete()
      .eq('language_code', code);
    
    // Then delete the language
    const { error } = await supabase
      .from('i18n_languages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await Promise.all([fetchLanguages(), fetchTranslations()]);
    invalidateTranslationsCache();
  };

  const setDefaultLanguage = async (code: string) => {
    await supabase
      .from('i18n_languages')
      .update({ is_default: false })
      .neq('code', code);
    
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

  // Per-language operations
  const exportLanguageJson = (languageCode: string): LanguageTranslations => {
    const result: LanguageTranslations = {};
    
    for (const t of translations) {
      if (t.language_code === languageCode) {
        if (!result[t.namespace]) result[t.namespace] = {};
        result[t.namespace][t.key] = t.value;
      }
    }
    
    return result;
  };

  const importLanguageJson = async (languageCode: string, data: LanguageTranslations) => {
    const inserts: { language_code: string; namespace: string; key: string; value: string }[] = [];
    
    for (const [namespace, keys] of Object.entries(data)) {
      for (const [key, value] of Object.entries(keys)) {
        inserts.push({
          language_code: languageCode,
          namespace,
          key,
          value
        });
      }
    }
    
    if (inserts.length === 0) return;
    
    const { error } = await supabase
      .from('i18n_translations')
      .upsert(inserts, { onConflict: 'language_code,namespace,key' });
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  const deleteLanguageTranslations = async (languageCode: string) => {
    const { error } = await supabase
      .from('i18n_translations')
      .delete()
      .eq('language_code', languageCode);
    
    if (error) throw error;
    await fetchTranslations();
    invalidateTranslationsCache();
  };

  const getLanguageStats = (languageCode: string, defaultCode: string = 'pl'): LanguageStats => {
    // Get all unique keys from default language
    const defaultKeys = new Set<string>();
    for (const t of translations) {
      if (t.language_code === defaultCode) {
        defaultKeys.add(`${t.namespace}.${t.key}`);
      }
    }
    
    // Count translated keys for target language
    let translated = 0;
    for (const t of translations) {
      if (t.language_code === languageCode && t.value.trim()) {
        translated++;
      }
    }
    
    const total = defaultKeys.size || translations.filter(t => t.language_code === languageCode).length;
    
    return {
      total,
      translated,
      percentage: total > 0 ? Math.round((translated / total) * 100) : 0
    };
  };

  const translateLanguageWithAI = async (
    sourceCode: string,
    targetCode: string,
    translateMode: 'all' | 'missing' = 'missing',
    onProgress?: (progress: {
      current: number;
      total: number;
      currentBatch: number;
      totalBatches: number;
      status: 'preparing' | 'translating' | 'saving' | 'done' | 'error';
      errors: number;
    }) => void
  ): Promise<{ success: boolean; translated: number; total: number; errors: number }> => {
    // Get all translations from source language
    const sourceTranslations = translations.filter(t => t.language_code === sourceCode);
    
    if (sourceTranslations.length === 0) {
      throw new Error('No translations found in source language');
    }

    // Filter keys based on mode
    let keysToTranslate = sourceTranslations;
    
    if (translateMode === 'missing') {
      // Get existing keys in target language
      const existingKeys = new Set(
        translations
          .filter(t => t.language_code === targetCode && t.value.trim())
          .map(t => `${t.namespace}.${t.key}`)
      );
      
      keysToTranslate = sourceTranslations.filter(
        t => !existingKeys.has(`${t.namespace}.${t.key}`)
      );
    }

    if (keysToTranslate.length === 0) {
      return { success: true, translated: 0, total: 0, errors: 0 };
    }

    const keys = keysToTranslate.map(t => ({
      namespace: t.namespace,
      key: t.key,
      value: t.value
    }));

    // Smaller batch size for better reliability
    const batchSize = 12;
    const parallelLimit = 3;
    const batches: typeof keys[] = [];
    
    for (let i = 0; i < keys.length; i += batchSize) {
      batches.push(keys.slice(i, i + batchSize));
    }

    let translatedCount = 0;
    let errorCount = 0;
    let processedBatches = 0;

    onProgress?.({
      current: 0,
      total: keys.length,
      currentBatch: 0,
      totalBatches: batches.length,
      status: 'translating',
      errors: 0
    });

    // Process batches in parallel (3 at a time)
    for (let i = 0; i < batches.length; i += parallelLimit) {
      const chunk = batches.slice(i, i + parallelLimit);
      
      const results = await Promise.allSettled(
        chunk.map(async (batch) => {
          const response = await supabase.functions.invoke('translate-content', {
            body: {
              mode: 'batch',
              sourceLanguage: sourceCode,
              targetLanguage: targetCode,
              keys: batch
            }
          });

          if (response.error) {
            throw new Error(response.error.message || 'Translation failed');
          }

          const result = response.data;
          
          if (result.error) {
            if (result.error === 'rate_limit') {
              throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw new Error(result.message || 'Translation failed');
          }

          return result.translated || 0;
        })
      );

      // Process results
      for (const result of results) {
        processedBatches++;
        if (result.status === 'fulfilled') {
          translatedCount += result.value;
        } else {
          errorCount++;
          console.error('Batch translation error:', result.reason);
        }
      }

      onProgress?.({
        current: translatedCount,
        total: keys.length,
        currentBatch: processedBatches,
        totalBatches: batches.length,
        status: 'translating',
        errors: errorCount
      });
    }

    onProgress?.({
      current: translatedCount,
      total: keys.length,
      currentBatch: batches.length,
      totalBatches: batches.length,
      status: 'saving',
      errors: errorCount
    });
    
    await fetchTranslations();
    invalidateTranslationsCache();

    onProgress?.({
      current: translatedCount,
      total: keys.length,
      currentBatch: batches.length,
      totalBatches: batches.length,
      status: 'done',
      errors: errorCount
    });

    return {
      success: true,
      translated: translatedCount,
      total: keys.length,
      errors: errorCount
    };
  };

  // Migrate from hardcoded translations (legacy - uses minimal fallback data)
  const migrateFromHardcoded = async (
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: boolean; migrated: number }> => {
    const hardcodedData = getHardcodedTranslations();
    const inserts: { language_code: string; namespace: string; key: string; value: string }[] = [];
    
    for (const [langCode, keys] of Object.entries(hardcodedData)) {
      for (const [fullKey, value] of Object.entries(keys as Record<string, string>)) {
        const [namespace, ...keyParts] = fullKey.split('.');
        const key = keyParts.join('.');
        if (namespace && key && value) {
          inserts.push({
            language_code: langCode,
            namespace,
            key,
            value
          });
        }
      }
    }
    
    if (inserts.length === 0) {
      throw new Error('No translations found to migrate');
    }

    onProgress?.(0, inserts.length);
    
    // Insert in batches of 100
    const batchSize = 100;
    let migrated = 0;
    
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('i18n_translations')
        .upsert(batch, { onConflict: 'language_code,namespace,key' });
      
      if (error) throw error;
      migrated += batch.length;
      onProgress?.(migrated, inserts.length);
    }
    
    await fetchTranslations();
    invalidateTranslationsCache();
    
    return { success: true, migrated };
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
      .upsert(inserts, { onConflict: 'language_code,namespace,key' });
    
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
    exportTranslations,
    // New per-language functions
    exportLanguageJson,
    importLanguageJson,
    deleteLanguageTranslations,
    getLanguageStats,
    translateLanguageWithAI,
    migrateFromHardcoded
  };
};

// Helper function with embedded hardcoded translations for migration
function getHardcodedTranslations(): Record<string, Record<string, string>> {
  return {
    pl: {
      'nav.home': 'Strona główna',
      'nav.admin': 'Panel CMS',
      'nav.myAccount': 'Moje konto',
      'nav.knowledgeCenter': 'Biblioteka',
      'nav.login': 'Zaloguj się',
      'nav.logout': 'Wyloguj się',
      'auth.signIn': 'Zaloguj się',
      'auth.email': 'Email',
      'auth.password': 'Hasło',
      'auth.confirmPassword': 'Potwierdź hasło',
      'auth.signUp': 'Zarejestruj się',
      'auth.signUpLink': 'Nie masz konta? Zarejestruj się',
      'auth.signInLink': 'Masz już konto? Zaloguj się',
      'auth.resetPassword': 'Resetuj hasło',
      'auth.eqId': 'EQ ID',
      'auth.role': 'Wybierz rolę',
      'auth.roleClient': 'Klient',
      'auth.rolePartner': 'Partner',
      'auth.roleSpecialist': 'Specjalista',
      'auth.selectRole': 'Wybierz swoją rolę',
      'auth.forgotPassword': 'Zapomniałem hasła',
      'fonts.title': 'Czcionki',
      'fonts.editor': 'Edytor czcionek',
      'fonts.description': 'Zarządzaj typografią aplikacji',
      'fonts.preview': 'Podgląd czcionki',
      'fonts.apply': 'Zastosuj zmiany',
      'fonts.cancel': 'Anuluj',
      'fonts.loading': 'Ładowanie czcionek...',
      'colors.title': 'Kolory',
      'colors.editor': 'Edytor kolorów',
      'colors.description': 'Zarządzaj paletą kolorów aplikacji',
      'colors.primary': 'Kolor główny',
      'colors.secondary': 'Kolor drugorzędny',
      'colors.accent': 'Kolor akcentu',
      'colors.background': 'Tło',
      'colors.text': 'Tekst',
      'admin.title': 'Panel administracyjny',
      'admin.sections': 'Sekcje',
      'admin.pages': 'Strony',
      'admin.users': 'Użytkownicy',
      'admin.settings': 'Ustawienia',
      'admin.save': 'Zapisz',
      'admin.cancel': 'Anuluj',
      'admin.edit': 'Edytuj',
      'admin.delete': 'Usuń',
      'admin.translations': 'Tłumaczenia',
      'admin.active': 'Aktywna',
      'admin.inactive': 'Nieaktywna',
      'action.save': 'Zapisz',
      'action.cancel': 'Anuluj',
      'action.edit': 'Edytuj',
      'action.delete': 'Usuń',
      'action.add': 'Dodaj',
      'action.create': 'Utwórz',
      'action.close': 'Zamknij',
      'action.confirm': 'Potwierdź',
      'common.loading': 'Ładowanie...',
      'common.noContent': 'Brak zawartości',
      'training.title': 'Akademia',
      'training.description': 'Ukończ wszystkie wymagane szkolenia',
      'training.progress': 'Postęp',
      'training.lessons': 'lekcji',
      'roles.admin': 'Administrator',
      'roles.partner': 'Partner',
      'roles.client': 'Klient',
      'roles.specjalista': 'Specjalista',
      'roles.user': 'Użytkownik',
      'chat.title': 'Asystent Pure Life',
      'chat.open': 'Otwórz czat',
      'chat.close': 'Zamknij czat',
      'chat.placeholder': 'Napisz wiadomość...',
      'chat.send': 'Wyślij',
      'success.saved': 'Zapisano pomyślnie',
      'success.created': 'Utworzono pomyślnie',
      'success.deleted': 'Usunięto pomyślnie',
      'error.saveFailed': 'Nie udało się zapisać',
      'error.loadFailed': 'Nie udało się załadować',
      'error.deleteFailed': 'Nie udało się usunąć',
      'ui.viewPage': 'Zobacz stronę',
      'ui.copyLink': 'Kopiuj link',
      'ui.published': 'Opublikowana',
      'ui.preview': 'Podgląd',
      'ui.title': 'Tytuł',
      'dialog.addSection': 'Dodaj nową sekcję',
      'dialog.editSection': 'Edytuj sekcję',
      'dialog.deleteSection': 'Usuń sekcję',
      'myAccount.title': 'Moje konto',
      'myAccount.profile': 'Profil',
      'myAccount.changePassword': 'Zmień hasło',
      'account.myAccount': 'Moje konto',
      'account.profile': 'Profil',
      'footer.allRightsReserved': 'Wszystkie prawa zastrzeżone.',
      'footer.privacyPolicy': 'Polityka prywatności',
      'footer.terms': 'Regulamin',
      'rolePreview.title': 'Podgląd jako rola',
      'rolePreview.real': 'Rzeczywisty widok',
      'rolePreview.admin': 'Administrator',
      'rolePreview.client': 'Klient',
      'rolePreview.partner': 'Partner',
      'rolePreview.specjalista': 'Specjalista',
      'rolePreview.anonymous': 'Niezalogowany',
      'toolbar.saving': 'Zapisywanie...',
      'toolbar.saved': 'Zapisane',
      'toolbar.errorSaving': 'Błąd zapisu',
      'toolbar.preview': 'Podgląd',
      'certificates.assignedRoles': 'Przypisane role',
      'certificates.noRolesAssigned': 'Brak przypisanych ról'
    },
    de: {
      'nav.home': 'Startseite',
      'nav.admin': 'CMS Panel',
      'nav.myAccount': 'Mein Konto',
      'nav.login': 'Anmelden',
      'nav.logout': 'Abmelden',
      'auth.signIn': 'Anmelden',
      'auth.email': 'E-Mail',
      'auth.password': 'Passwort',
      'auth.signUp': 'Registrieren',
      'admin.title': 'Administrationsbereich',
      'admin.sections': 'Bereiche',
      'admin.pages': 'Seiten',
      'admin.users': 'Benutzer',
      'admin.settings': 'Einstellungen',
      'admin.save': 'Speichern',
      'admin.cancel': 'Abbrechen',
      'admin.edit': 'Bearbeiten',
      'admin.delete': 'Löschen',
      'admin.translations': 'Übersetzungen',
      'action.save': 'Speichern',
      'action.cancel': 'Abbrechen',
      'action.edit': 'Bearbeiten',
      'action.delete': 'Löschen',
      'action.add': 'Hinzufügen',
      'action.create': 'Erstellen',
      'common.loading': 'Laden...',
      'common.noContent': 'Kein Inhalt',
      'training.title': 'Akademie',
      'roles.admin': 'Administrator',
      'roles.partner': 'Partner',
      'roles.client': 'Kunde',
      'roles.specjalista': 'Spezialist',
      'roles.user': 'Benutzer',
      'chat.title': 'Pure Life Assistent',
      'success.saved': 'Erfolgreich gespeichert',
      'error.saveFailed': 'Speichern fehlgeschlagen',
      'error.loadFailed': 'Laden fehlgeschlagen'
    },
    en: {
      'nav.home': 'Home',
      'nav.admin': 'CMS Panel',
      'nav.myAccount': 'My Account',
      'nav.login': 'Login',
      'nav.logout': 'Logout',
      'auth.signIn': 'Sign In',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.signUp': 'Sign Up',
      'admin.title': 'Admin Panel',
      'admin.sections': 'Sections',
      'admin.pages': 'Pages',
      'admin.users': 'Users',
      'admin.settings': 'Settings',
      'admin.save': 'Save',
      'admin.cancel': 'Cancel',
      'admin.edit': 'Edit',
      'admin.delete': 'Delete',
      'admin.translations': 'Translations',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.add': 'Add',
      'action.create': 'Create',
      'common.loading': 'Loading...',
      'common.noContent': 'No content',
      'training.title': 'Academy',
      'roles.admin': 'Administrator',
      'roles.partner': 'Partner',
      'roles.client': 'Client',
      'roles.specjalista': 'Specialist',
      'roles.user': 'User',
      'chat.title': 'Pure Life Assistant',
      'success.saved': 'Saved successfully',
      'error.saveFailed': 'Failed to save',
      'error.loadFailed': 'Failed to load'
    }
  };
}
