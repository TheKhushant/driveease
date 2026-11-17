const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (rgb, target, amount) => rgb.map((c, i) => Math.round(c + (target[i] - c) * amount));

/** Apply brand colours to CSS variables consumed by Tailwind. */
export function applyBrandColors(primary, secondary) {
  const root = document.documentElement;
  const p = hexToRgb(primary);
  if (p) {
    root.style.setProperty('--c-primary', p.join(' '));
    root.style.setProperty('--c-primary-dark', mix(p, [0, 0, 0], 0.18).join(' '));
    root.style.setProperty('--c-primary-light', mix(p, [255, 255, 255], 0.92).join(' '));
  }
  const s = hexToRgb(secondary);
  if (s) {
    root.style.setProperty('--c-secondary', s.join(' '));
    root.style.setProperty('--c-secondary-dark', mix(s, [0, 0, 0], 0.15).join(' '));
  }
}
