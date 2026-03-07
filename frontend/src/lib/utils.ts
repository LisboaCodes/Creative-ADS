import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
