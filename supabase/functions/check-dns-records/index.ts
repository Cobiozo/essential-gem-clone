import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DnsCheckRequest {
  domain: string;
  dkim_selector?: string;
}

interface DnsRecord {
  type: string;
  status: 'ok' | 'warning' | 'error' | 'not_found';
  found: boolean;
  records: string[];
  message: string;
  details?: string;
}

async function queryDns(name: string, type: string): Promise<string[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const resp = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.Answer) return [];
    return data.Answer.map((a: any) => a.data?.replace(/^"|"$/g, '') || '');
  } catch {
    return [];
  }
}

function checkSpf(records: string[]): DnsRecord {
  const spfRecords = records.filter(r => r.startsWith('v=spf1'));
  
  if (spfRecords.length === 0) {
    return {
      type: 'SPF',
      status: 'error',
      found: false,
      records: [],
      message: 'Brak rekordu SPF — wiadomości mogą trafiać do spamu',
      details: 'Dodaj rekord TXT dla domeny z wartością: v=spf1 include:<twój-serwer-smtp> ~all',
    };
  }
  
  if (spfRecords.length > 1) {
    return {
      type: 'SPF',
      status: 'warning',
      found: true,
      records: spfRecords,
      message: 'Znaleziono wiele rekordów SPF — powinien być tylko jeden',
      details: 'Połącz wszystkie rekordy SPF w jeden rekord TXT. Wiele rekordów SPF powoduje błędy walidacji.',
    };
  }

  const spf = spfRecords[0];
  if (spf.includes('-all')) {
    return {
      type: 'SPF',
      status: 'ok',
      found: true,
      records: spfRecords,
      message: 'Rekord SPF skonfigurowany poprawnie (strict: -all)',
    };
  }
  if (spf.includes('~all')) {
    return {
      type: 'SPF',
      status: 'ok',
      found: true,
      records: spfRecords,
      message: 'Rekord SPF skonfigurowany poprawnie (softfail: ~all)',
    };
  }
  if (spf.includes('?all') || spf.includes('+all')) {
    return {
      type: 'SPF',
      status: 'warning',
      found: true,
      records: spfRecords,
      message: 'Rekord SPF zbyt permisywny — zmień na ~all lub -all',
      details: 'Użycie ?all lub +all oznacza brak ochrony. Zmień na ~all (softfail) lub -all (hard fail).',
    };
  }

  return {
    type: 'SPF',
    status: 'ok',
    found: true,
    records: spfRecords,
    message: 'Rekord SPF znaleziony',
  };
}

function checkDkim(records: string[], selector: string): DnsRecord {
  if (records.length === 0) {
    return {
      type: 'DKIM',
      status: 'warning',
      found: false,
      records: [],
      message: `Brak rekordu DKIM dla selektora "${selector}"`,
      details: `Sprawdź u dostawcy poczty jaki selektor DKIM jest używany (np. "default", "google", "s1"). Rekord DKIM powinien znajdować się pod: ${selector}._domainkey.<domena>`,
    };
  }

  const dkimRecord = records.find(r => r.includes('v=DKIM1') || r.includes('p='));
  if (dkimRecord) {
    return {
      type: 'DKIM',
      status: 'ok',
      found: true,
      records,
      message: `Rekord DKIM znaleziony (selektor: ${selector})`,
    };
  }

  return {
    type: 'DKIM',
    status: 'warning',
    found: true,
    records,
    message: 'Znaleziono rekord DNS, ale może nie być prawidłowym DKIM',
    details: 'Rekord powinien zawierać v=DKIM1 i klucz publiczny (p=...)',
  };
}

function checkDmarc(records: string[]): DnsRecord {
  const dmarcRecords = records.filter(r => r.startsWith('v=DMARC1'));
  
  if (dmarcRecords.length === 0) {
    return {
      type: 'DMARC',
      status: 'error',
      found: false,
      records: [],
      message: 'Brak rekordu DMARC — brak ochrony przed spoofingiem',
      details: 'Dodaj rekord TXT dla _dmarc.<domena> z wartością: v=DMARC1; p=quarantine; rua=mailto:dmarc@<domena>',
    };
  }

  const dmarc = dmarcRecords[0];
  const policyMatch = dmarc.match(/;\s*p=(\w+)/);
  const policy = policyMatch ? policyMatch[1] : 'unknown';

  if (policy === 'none') {
    return {
      type: 'DMARC',
      status: 'warning',
      found: true,
      records: dmarcRecords,
      message: 'DMARC w trybie monitorowania (p=none) — brak aktywnej ochrony',
      details: 'Tryb "none" tylko monitoruje. Rozważ zmianę na p=quarantine (kwarantanna) lub p=reject (odrzucaj).',
    };
  }

  if (policy === 'quarantine' || policy === 'reject') {
    return {
      type: 'DMARC',
      status: 'ok',
      found: true,
      records: dmarcRecords,
      message: `DMARC skonfigurowany poprawnie (p=${policy})`,
    };
  }

  return {
    type: 'DMARC',
    status: 'ok',
    found: true,
    records: dmarcRecords,
    message: 'Rekord DMARC znaleziony',
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, dkim_selector = 'default' }: DnsCheckRequest = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ success: false, message: 'Brak domeny do sprawdzenia' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract domain from email if needed
    const cleanDomain = domain.includes('@') ? domain.split('@')[1] : domain;

    console.log(`[DNS-CHECK] Checking domain: ${cleanDomain}, DKIM selector: ${dkim_selector}`);

    // Run all DNS queries in parallel
    const [txtRecords, dkimRecords, dmarcRecords, mxRecords] = await Promise.all([
      queryDns(cleanDomain, 'TXT'),
      queryDns(`${dkim_selector}._domainkey.${cleanDomain}`, 'TXT'),
      queryDns(`_dmarc.${cleanDomain}`, 'TXT'),
      queryDns(cleanDomain, 'MX'),
    ]);

    // Also try common DKIM selectors if default fails
    let finalDkimRecords = dkimRecords;
    let usedSelector = dkim_selector;
    if (dkimRecords.length === 0 && dkim_selector === 'default') {
      const commonSelectors = ['google', 's1', 's2', 'selector1', 'selector2', 'k1', 'mail', 'dkim'];
      for (const sel of commonSelectors) {
        const tryRecords = await queryDns(`${sel}._domainkey.${cleanDomain}`, 'TXT');
        if (tryRecords.length > 0) {
          finalDkimRecords = tryRecords;
          usedSelector = sel;
          break;
        }
      }
    }

    const spfResult = checkSpf(txtRecords);
    const dkimResult = checkDkim(finalDkimRecords, usedSelector);
    const dmarcResult = checkDmarc(dmarcRecords);

    const allOk = spfResult.status === 'ok' && dkimResult.status === 'ok' && dmarcResult.status === 'ok';
    const hasErrors = spfResult.status === 'error' || dkimResult.status === 'error' || dmarcResult.status === 'error';

    return new Response(
      JSON.stringify({
        success: true,
        domain: cleanDomain,
        overall_status: allOk ? 'ok' : hasErrors ? 'error' : 'warning',
        overall_message: allOk
          ? 'Wszystkie rekordy uwierzytelniania e-mail są poprawnie skonfigurowane'
          : hasErrors
          ? 'Znaleziono problemy z uwierzytelnianiem e-mail — wiadomości mogą trafiać do spamu'
          : 'Konfiguracja wymaga drobnych poprawek',
        checks: {
          spf: spfResult,
          dkim: dkimResult,
          dmarc: dmarcResult,
        },
        mx_records: mxRecords,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[DNS-CHECK] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd podczas sprawdzania DNS',
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
