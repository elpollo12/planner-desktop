export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  h = h / 360;

  if (s === 0) {
    const val = Math.round(l * 255);
    return `#${val.toString(16).padStart(2, '0').repeat(3)}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generatePalette(baseHex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(baseHex);
  const palette: Record<string, string> = {};

  // Lighter shades (50-400): use fixed target lightness
  palette['50'] = hslToHex(h, Math.max(s * 0.3, 0.05), 0.96);
  palette['100'] = hslToHex(h, Math.max(s * 0.4, 0.08), 0.90);
  palette['200'] = hslToHex(h, Math.max(s * 0.5, 0.10), 0.80);
  palette['300'] = hslToHex(h, Math.max(s * 0.65, 0.15), 0.68);
  palette['400'] = hslToHex(h, Math.max(s * 0.8, 0.20), 0.55);

  // Base shade
  palette['500'] = baseHex;

  // Darker shades (600-950): reduce lightness progressively
  palette['600'] = hslToHex(h, s, Math.max(l - 0.05, 0.05));
  palette['700'] = hslToHex(h, s, Math.max(l - 0.10, 0.04));
  palette['800'] = hslToHex(h, s, Math.max(l - 0.15, 0.03));
  palette['900'] = hslToHex(h, s * 0.95, Math.max(l - 0.20, 0.02));
  palette['950'] = hslToHex(h, s * 0.9, Math.max(l - 0.25, 0.01));

  return palette;
}

export function isValidHexColor(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * Returns relative luminance (0-1) using WCAG formula.
 * Values > 0.5 are considered "light" colors.
 */
export function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Returns '#ffffff' or '#111827' depending on which contrasts better with the given color.
 */
export function getContrastColor(hex: string): string {
  return getRelativeLuminance(hex) > 0.4 ? '#111827' : '#ffffff';
}
