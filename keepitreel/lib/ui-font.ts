import fontData from '../assets/fonts/atkinson-latin.woff2?inline';

// The binary source avoids network font requests and site font-src restrictions.
// A private family name prevents changes to the visited website's typography.
export function loadUiFont() {
  try {
    const family = 'KeepItReel Atkinson';
    // This expando lives in the extension's isolated world. Never load an
    // arbitrary font supplied by the website just because its name matches.
    const realm = globalThis as typeof globalThis & { keepItReelUiFont?: FontFace };
    let face = realm.keepItReelUiFont;
    if (!face) {
      const bytes = Uint8Array.from(atob(fontData.slice(fontData.indexOf(',') + 1)), char => char.charCodeAt(0));
      face = new FontFace(family, bytes, { weight: '200 800', style: 'normal', display: 'swap' });
      realm.keepItReelUiFont = face;
      document.fonts.add(face);
    }
    void face.load().catch(() => undefined);
  } catch { /* Native system fonts remain available if the font cannot be loaded. */ }
}
