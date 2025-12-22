import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility function for merging class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to check if value is empty
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Safe JSON parse with fallback
export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Sleep utility for async flows
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

// Convert mixed values to boolean
export function toBoolean(value: unknown, defaultValue = false): boolean {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return defaultValue;
}
