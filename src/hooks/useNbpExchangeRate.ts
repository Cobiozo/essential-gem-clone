import { useQuery } from "@tanstack/react-query";

interface NbpRateResponse {
  table: string;
  currency: string;
  code: string;
  rates: Array<{
    no: string;
    effectiveDate: string;
    mid: number;
  }>;
}

interface NbpExchangeRate {
  rate: number;
  date: string;
  tableNo: string;
}

const CACHE_KEY = 'nbp-eur-rate-cache';

function getCachedRate(): NbpExchangeRate | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function setCachedRate(rate: NbpExchangeRate): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rate));
  } catch {
    // Ignore localStorage errors
  }
}

async function fetchNbpRate(): Promise<NbpExchangeRate> {
  const response = await fetch(
    'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json'
  );

  if (!response.ok) {
    // 404 = rate not yet published (early morning)
    if (response.status === 404) {
      const cached = getCachedRate();
      if (cached) {
        return cached;
      }
      throw new Error('Kurs jeszcze nie opublikowany');
    }
    throw new Error('Błąd pobierania kursu');
  }

  const data: NbpRateResponse = await response.json();
  const rate: NbpExchangeRate = {
    rate: data.rates[0].mid,
    date: data.rates[0].effectiveDate,
    tableNo: data.rates[0].no
  };

  // Cache the rate
  setCachedRate(rate);

  return rate;
}

export function useNbpExchangeRate() {
  return useQuery({
    queryKey: ['nbp-eur-rate'],
    queryFn: fetchNbpRate,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
