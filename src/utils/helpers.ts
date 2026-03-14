const cp1252Map = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const utf8Decoder = new TextDecoder('utf-8');

const decodeCp1252 = (value: string): string => {
  const bytes: number[] = [];
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = cp1252Map.get(code);
    if (mapped === undefined) return value;
    bytes.push(mapped);
  }
  return utf8Decoder.decode(Uint8Array.from(bytes));
};

const mojibakePattern = /[ÃØÙÂâ]/;
const arabicPattern = /[\u0600-\u06FF]/;

export const fixMojibake = (value: string): string => {
  if (!value || !mojibakePattern.test(value)) return value;
  const fixed = decodeCp1252(value);
  if (fixed !== value && arabicPattern.test(fixed)) return fixed;
  return value;
};

export const fixMojibakeDeep = <T>(input: T): T => {
  if (typeof input === 'string') return fixMojibake(input) as T;
  if (Array.isArray(input)) return input.map((item) => fixMojibakeDeep(item)) as T;
  if (!input || typeof input !== 'object') return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, val]) => [key, fixMojibakeDeep(val)]),
  ) as T;
};

export const toArabicDigits = (num: number | string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, (d) => arabicDigits[parseInt(d)]);
};

export const formatDate = (date: Date | string | number): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ar-SA');
};

export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
  try {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'OMR',
    }).format(amount);
  }
};

export const formatDateTime = (date: Date | string | number): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('ar-SA');
};

export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};
