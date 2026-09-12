import { clsx, type ClassValue } from "clsx";                                                  // Conditional class name concatenator
import { twMerge } from "tailwind-merge";                                                       // Tailwind CSS class merge resolver

// Merges dynamic conditional class names safely resolving conflicting styling rules
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));                                                                 // Combine clsx and twMerge
}
