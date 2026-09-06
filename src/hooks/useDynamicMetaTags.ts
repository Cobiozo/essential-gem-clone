import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const updateMetaTag = (selector: string, attribute: string, value: string, createProps?: Record<string, string>) => {
  let element = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement;
  if (!element && createProps) {
    element = document.createElement(createProps.tagName || 'meta') as HTMLMetaElement | HTMLLinkElement;
    Object.entries(createProps).forEach(([key, val]) => {
      if (key !== 'tagName') element.setAttribute(key, val);
    });
    document.head.appendChild(element);
  }
  if (element) {
    if (attribute === 'href') {
      (element as HTMLLinkElement).href = value;
    } else if (attribute === 'content') {
      (element as HTMLMetaElement).content = value;
    }
  }
};

const CACHE_KEY = 'page_meta_settings_v1';

type MetaData = Record<string, string | null>;

const applyMeta = (data: MetaData) => {
  if (data.favicon_url) {
    updateMetaTag("link[rel~='icon']", 'href', data.favicon_url, { tagName: 'link', rel: 'icon' });
  }
  if (data.og_image_url) {
    updateMetaTag("meta[property='og:image']", 'content', data.og_image_url, { property: 'og:image' });
    updateMetaTag("meta[name='twitter:image']", 'content', data.og_image_url, { name: 'twitter:image' });
  }
  if (data.og_title) {
    updateMetaTag("meta[property='og:title']", 'content', data.og_title, { property: 'og:title' });
    updateMetaTag("meta[name='twitter:title']", 'content', data.og_title, { name: 'twitter:title' });
  }
  if (data.og_description) {
    updateMetaTag("meta[property='og:description']", 'content', data.og_description, { property: 'og:description' });
    updateMetaTag("meta[name='twitter:description']", 'content', data.og_description, { name: 'twitter:description' });
  }
  if (data.og_site_name) {
    updateMetaTag("meta[property='og:site_name']", 'content', data.og_site_name, { property: 'og:site_name' });
  }
  if (data.og_url) {
    updateMetaTag("meta[property='og:url']", 'content', data.og_url, { property: 'og:url' });
  }
};

/**
 * Etap 4 — hook pozostaje globalny (favicon/OG dotyczą każdej trasy), ale
 * request `page_settings` wykonywany jest maksymalnie RAZ na sesję karty:
 * wartości z poprzedniego pobrania są nakładane natychmiast z sessionStorage,
 * a sieć odpytujemy tylko przy pierwszym wejściu do aplikacji w danej sesji.
 */
export const useDynamicMetaTags = () => {
  useEffect(() => {
    let cached: MetaData | null = null;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as MetaData;
    } catch { /* brak/uszkodzony cache — pobierzemy z sieci */ }

    if (cached) {
      applyMeta(cached);
      return;
    }

    const loadMetaTags = async () => {
      try {
        const { data, error } = await supabase
          .from('page_settings')
          .select('favicon_url, og_image_url, og_title, og_description, og_site_name, og_url')
          .eq('page_type', 'homepage')
          .maybeSingle();
        
        if (error) {
          console.error('Error loading meta tags:', error);
          return;
        }
        
        if (data) {
          applyMeta(data as MetaData);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota */ }
        }
      } catch (error) {
        console.error('Error in loadMetaTags:', error);
      }
    };

    loadMetaTags();
  }, []);
};
