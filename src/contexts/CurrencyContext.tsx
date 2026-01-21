import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CurrencyType = 'EUR' | 'PLN';

interface CurrencyContextValue {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  eurToPlnRate: number;
  convert: (amountEur: number) => number;
  formatAmount: (amountEur: number, showSymbol?: boolean) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: ReactNode;
  eurToPlnRate: number;
}

export function CurrencyProvider({ children, eurToPlnRate }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<CurrencyType>('EUR');

  const convert = useCallback((amountEur: number): number => {
    if (currency === 'PLN') {
      return amountEur * eurToPlnRate;
    }
    return amountEur;
  }, [currency, eurToPlnRate]);

  const formatAmount = useCallback((amountEur: number, showSymbol = true): string => {
    const value = convert(amountEur);
    const formatted = new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
    
    if (!showSymbol) return formatted;
    return currency === 'EUR' ? `${formatted} €` : `${formatted} zł`;
  }, [convert, currency]);

  const symbol = currency === 'EUR' ? '€' : 'zł';

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, eurToPlnRate, convert, formatAmount, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
