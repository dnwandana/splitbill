// Utility to detect user locale and currency without external APIs
// Falls back gracefully to en-US / USD

export function detectUserLocale(defaultLocale: string = 'en-US'): string {
  if (typeof navigator !== 'undefined') {
    const nav = navigator as Partial<Navigator> & {
      languages?: readonly string[]
      language?: string
    }
    const primary = nav.languages?.[0] || nav.language
    return primary || defaultLocale
  }
  return defaultLocale
}

export function getRegionFromLocale(locale: string): string | null {
  try {
    // Prefer Intl.Locale when available
    type LocaleCtor = new (tag: string) => {
      maximize?: () => { region?: string } | undefined
      region?: string
    }
    type IntlWithLocale = typeof Intl & { Locale?: LocaleCtor }
    const intlWithLocale = Intl as unknown as IntlWithLocale
    if (intlWithLocale && typeof intlWithLocale.Locale === 'function') {
      const loc = new intlWithLocale.Locale(locale)
      const maximized =
        typeof loc.maximize === 'function' ? loc.maximize() : loc
      const region =
        maximized && 'region' in maximized
          ? (maximized as { region?: string }).region
          : (loc as { region?: string }).region
      return region || null
    }
  } catch {
    // Ignore and try regex fallback
  }

  // Fallback: parse BCP-47 tag for region subtag (e.g., en-US -> US)
  const match = locale.match(/-([A-Za-z]{2}|\d{3})\b/)
  if (match && match[1]) {
    return match[1].toUpperCase()
  }
  return null
}

const EUR_REGIONS = new Set<string>([
  'AT',
  'BE',
  'HR',
  'CY',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
  'ES'
])

const REGION_TO_CURRENCY: Record<string, string> = {
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',

  // South America
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  UY: 'UYU',
  PY: 'PYG',
  BO: 'BOB',
  VE: 'VES',

  // Europe (non-euro)
  GB: 'GBP',
  CH: 'CHF',
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  CZ: 'CZK',
  PL: 'PLN',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  IS: 'ISK',
  RU: 'RUB',
  UA: 'UAH',
  BY: 'BYN',
  TR: 'TRY',

  // Middle East
  IL: 'ILS',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  OM: 'OMR',
  BH: 'BHD',
  IR: 'IRR',
  IQ: 'IQD',

  // Africa
  ZA: 'ZAR',
  EG: 'EGP',
  MA: 'MAD',
  DZ: 'DZD',
  TN: 'TND',
  NG: 'NGN',
  KE: 'KES',
  TZ: 'TZS',
  UG: 'UGX',
  GH: 'GHS',
  ET: 'ETB',

  // Asia
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  TW: 'TWD',
  KR: 'KRW',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  TH: 'THB',
  PH: 'PHP',
  VN: 'VND',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  MM: 'MMK',
  KH: 'KHR',
  LA: 'LAK',

  // Oceania
  AU: 'AUD',
  NZ: 'NZD'
}

export function getCurrencyForRegion(
  region: string | null | undefined
): string {
  if (!region) return 'USD'
  if (EUR_REGIONS.has(region)) return 'EUR'
  return REGION_TO_CURRENCY[region] || 'USD'
}

export function detectUserCurrency(): { locale: string; currency: string } {
  const locale = detectUserLocale()
  const region = getRegionFromLocale(locale)
  const currency = getCurrencyForRegion(region)
  return { locale, currency }
}

export function formatCurrencyAmount(
  amount: number,
  locale: string,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol'
    }).format(amount || 0)
  } catch {
    // Fallback to USD formatting string
    const value = Number.isFinite(amount) ? amount : 0
    return `$${value.toFixed(2)}`
  }
}
