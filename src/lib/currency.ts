export type SupportedCurrency = 'BOB' | 'USD' | 'EUR' | 'CLP' | string;

export interface CurrencyInfo {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  country: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  BOB: { code: 'BOB', symbol: 'Bs.', name: 'Bolivianos (Bolivia)', country: '🇧🇴' },
  USD: { code: 'USD', symbol: '$', name: 'Dólares (USD)', country: '💵' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euros (EUR)', country: '🇪🇺' },
  CLP: { code: 'CLP', symbol: '$', name: 'Pesos Chilenos (CLP)', country: '🇨🇱' },
};

/**
 * Formats a monetary amount based on currency code (default: BOB / Bs.).
 */
export function formatCurrency(amount: number | string, currencyCode: SupportedCurrency = 'BOB'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    const defaultSymbol = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()]?.symbol || 'Bs.';
    return `${defaultSymbol} 0.00`;
  }

  const code = currencyCode.toUpperCase();

  switch (code) {
    case 'BOB':
      return `Bs. ${num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'USD':
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'CLP':
      return `$${num.toLocaleString('es-CL')}`;
    default: {
      const sym = SUPPORTED_CURRENCIES[code]?.symbol || '$';
      return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
}
