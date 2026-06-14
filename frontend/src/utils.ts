import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLaunchedAt(iso: string | undefined): string {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function deliveryRate(delivered: number, sent: number): number {
  if (sent <= 0) return 0;
  return Math.round((delivered / sent) * 1000) / 10;
}

export function formatCurrency(amount: number): string {
  // INR formatting — all customer spend data is in Indian Rupees.
  // en-IN locale gives comma-separated lakhs/crores formatting (e.g. ₹1,20,000).
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
