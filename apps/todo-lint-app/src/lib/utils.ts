import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class name inputs into a single Tailwind-safe string.
 * @param inputs - Class name values to combine.
 * @returns
 * - A trimmed className string with Tailwind conflicts resolved
 * @example
 * cn('bg-white', ['text-sm', false && 'opacity-50']) // => 'bg-white text-sm'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
