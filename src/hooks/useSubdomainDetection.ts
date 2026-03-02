import { useMemo } from 'react';

const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api', 'mail', 'purelife'];

interface SubdomainResult {
  eqId: string | null;
  isSubdomain: boolean;
}

export function useSubdomainDetection(): SubdomainResult {
  return useMemo(() => {
    const hostname = window.location.hostname;

    // Production: check for *.purelife.info.pl
    if (hostname.endsWith('.purelife.info.pl')) {
      const parts = hostname.split('.');
      const subdomain = parts[0]?.toLowerCase();
      if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
        return { eqId: subdomain.toUpperCase(), isSubdomain: true };
      }
    }

    // Preview fallback: ?eqid=ABC123
    const params = new URLSearchParams(window.location.search);
    const eqidParam = params.get('eqid');
    if (eqidParam) {
      return { eqId: eqidParam.toUpperCase(), isSubdomain: true };
    }

    return { eqId: null, isSubdomain: false };
  }, []);
}
