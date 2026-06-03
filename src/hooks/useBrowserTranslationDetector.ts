import { useEffect, useState } from 'react';

/**
 * Detects browser-level page translation (Google Translate, Edge, Safari, etc.)
 * which can break React DOM reconciliation. Uses multiple signals.
 */
export const useBrowserTranslationDetector = (): boolean => {
  const [isTranslated, setIsTranslated] = useState(false);

  useEffect(() => {
    const checkTranslated = (): boolean => {
      const html = document.documentElement;
      const body = document.body;
      if (!html || !body) return false;

      // Google Translate signals
      if (html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl')) return true;
      if (html.classList.contains('translated')) return true;
      if (document.querySelector('html[class*="translated-"]')) return true;
      if (document.querySelector('.goog-te-banner-frame, #goog-gt-tt, .skiptranslate')) return true;
      // Google injects <font> wrappers around translated text nodes
      if (body.querySelector('font[style*="vertical-align"]')) return true;

      // Microsoft Edge translator signals
      if (body.querySelector('[_msthash], [_mstmutation]')) return true;

      // Yandex / generic
      if (html.hasAttribute('xml:lang') && html.getAttribute('xml:lang') !== html.getAttribute('lang')) return true;

      return false;
    };

    const update = () => setIsTranslated(checkTranslated());

    update();

    const observer = new MutationObserver(() => {
      update();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang', 'xml:lang'],
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['_msthash', '_mstmutation'],
    });

    // Re-check periodically in case translator activates async
    const interval = window.setInterval(update, 4000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return isTranslated;
};
