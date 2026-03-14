import { CompanyInfo, Settings } from '../types';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rentrix:theme';

const DEFAULT_PRIMARY_COLOR = '#1780c2';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeThemeMode = (value?: string | null): ThemeMode => (value === 'dark' ? 'dark' : 'light');

export const normalizeHexColor = (value?: string | null, fallback = DEFAULT_PRIMARY_COLOR) => {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;
  const normalized = candidate.startsWith('#') ? candidate : `#${candidate}`;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
};

export const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex).slice(1);
  const full = normalized.length === 3 ? normalized.split('').map((char) => `${char}${char}`).join('') : normalized;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export const hexToRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

export const hexToHslChannels = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
  }

  const normalizedHue = Math.round((hue * 60 + 360) % 360);
  const normalizedSaturation = Math.round(saturation * 100);
  const normalizedLightness = Math.round(lightness * 100);

  return `${normalizedHue} ${normalizedSaturation}% ${normalizedLightness}%`;
};

const getPrimaryForeground = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? '215 33% 12%' : '210 40% 98%';
};

export const resolveBrandingFromCompany = (company?: Partial<CompanyInfo>) => {
  const primaryColor = normalizeHexColor(company?.primaryColor || company?.companyPrimaryColor);
  const companyName = String(company?.companyName || company?.name || '').trim();
  const appName = String(company?.appName || companyName || 'Rentrix ERP').trim();
  const logoUrl = String(company?.logoDataUrl || company?.companyLogo || company?.logo || '').trim();
  const tagline = String(company?.tagline || company?.companyTagline || 'إدارة عقارية ومحاسبية مترابطة').trim();
  const reportHeaderText = String(company?.reportHeaderText || company?.reportHeader || appName).trim();
  const reportFooterText = String(company?.reportFooterText || company?.reportFooter || `تم الإنشاء بواسطة ${appName}`).trim();

  return {
    appName,
    companyName: companyName || appName,
    logoUrl,
    primaryColor,
    tagline,
    reportHeaderText,
    reportFooterText,
    defaultTheme: normalizeThemeMode(company?.defaultTheme || company?.themeMode),
  };
};

export const resolveBrandingFromSettings = (settings?: Partial<Settings>) => resolveBrandingFromCompany(settings?.company);

export const getStoredTheme = (fallback: ThemeMode = 'light') => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return normalizeThemeMode(stored || fallback);
};

export const setStoredTheme = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const applyBrandTheme = (theme: ThemeMode, primaryColor?: string) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const safePrimary = normalizeHexColor(primaryColor);
  const primaryHsl = hexToHslChannels(safePrimary);
  const { r, g, b } = hexToRgb(safePrimary);

  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--primary-foreground', getPrimaryForeground(safePrimary));
  root.style.setProperty('--primary-light', `${primaryHsl.split(' ')[0]} ${primaryHsl.split(' ')[1]} 95%`);
  root.style.setProperty('--brand-primary-rgb', `${r} ${g} ${b}`);
};
