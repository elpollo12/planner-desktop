/**
 * Capitalize the first letter of each word.
 * "cemento portland" → "Cemento Portland"
 */
export function capitalize(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
