import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx and tailwind-merge for conflict-free class merging.
 * Mirrors the `cn` utility expected by shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
