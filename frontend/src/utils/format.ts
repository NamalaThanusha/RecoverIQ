import { format, parseISO } from 'date-fns';

export function formatMoney(amountMinor: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amountMinor / 100);
}

export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM d, yyyy HH:mm');
  } catch (e) {
    return isoString;
  }
}
