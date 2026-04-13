import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte una fecha (string o Date) a string ISO para date-fns
 */
export function toDateString(date: string | Date | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Convierte una fecha (string o Date) a objeto Date
 */
export function toDate(date: string | Date | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
}