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

export const useDynamicMetaTags = () => {
  useEffect(() => {
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
          // Update favicon
          if (data.favicon_url) {
            updateMetaTag("link[rel~='icon']", 'href', data.favicon_url, { tagName: 'link', rel: 'icon' });
          }
          
          // Update OG image
          if (data.og_image_url) {
            updateMetaTag("meta[property='og:image']", 'content', data.og_image_url, { property: 'og:image' });
            updateMetaTag("meta[name='twitter:image']", 'content', data.og_image_url, { name: 'twitter:image' });
          }
          
          // Update OG title
          if (data.og_title) {
            updateMetaTag("meta[property='og:title']", 'content', data.og_title, { property: 'og:title' });
            updateMetaTag("meta[name='twitter:title']", 'content', data.og_title, { name: 'twitter:title' });
          }
          
          // Update OG description
          if (data.og_description) {
            updateMetaTag("meta[property='og:description']", 'content', data.og_description, { property: 'og:description' });
            updateMetaTag("meta[name='twitter:description']", 'content', data.og_description, { name: 'twitter:description' });
          }
          
          // Update OG site name
          if (data.og_site_name) {
            updateMetaTag("meta[property='og:site_name']", 'content', data.og_site_name, { property: 'og:site_name' });
          }
          
          // Update OG URL
          if (data.og_url) {
            updateMetaTag("meta[property='og:url']", 'content', data.og_url, { property: 'og:url' });
          }
        }
      } catch (error) {
        console.error('Error in loadMetaTags:', error);
      }
    };

    loadMetaTags();
  }, []);
};
