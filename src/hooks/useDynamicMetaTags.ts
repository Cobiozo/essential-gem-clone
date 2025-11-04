import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDynamicMetaTags = () => {
  useEffect(() => {
    const loadMetaTags = async () => {
      try {
        const { data, error } = await supabase
          .from('page_settings')
          .select('favicon_url, og_image_url')
          .eq('page_type', 'homepage')
          .maybeSingle();
        
        if (error) {
          console.error('Error loading meta tags:', error);
          return;
        }
        
        if (data) {
          // Update favicon
          if (data.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.favicon_url;
          }
          
          // Update OG image
          if (data.og_image_url) {
            // Update og:image
            let ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
            if (!ogImage) {
              ogImage = document.createElement('meta');
              ogImage.setAttribute('property', 'og:image');
              document.head.appendChild(ogImage);
            }
            ogImage.content = data.og_image_url;
            
            // Update twitter:image
            let twitterImage = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
            if (!twitterImage) {
              twitterImage = document.createElement('meta');
              twitterImage.setAttribute('name', 'twitter:image');
              document.head.appendChild(twitterImage);
            }
            twitterImage.content = data.og_image_url;
          }
        }
      } catch (error) {
        console.error('Error in loadMetaTags:', error);
      }
    };

    loadMetaTags();
  }, []);
};
