type ClassValue = string | number | null | false | undefined;

/**
 * Concatenate class names while skipping falsy values.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
