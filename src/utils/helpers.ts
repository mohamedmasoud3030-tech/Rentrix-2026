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
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
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
