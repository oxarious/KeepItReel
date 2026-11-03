import type { ThemePreference } from './model';

export const darkMediaQuery = '(prefers-color-scheme: dark)';
export function resolvedTheme(preference: ThemePreference, systemDark = matchMedia(darkMediaQuery).matches): 'light' | 'dark' {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}
// For content scripts, target only a KeepItReel host, never the website root.
export function applyTheme(target: HTMLElement, preference: ThemePreference) {
  target.dataset.theme = resolvedTheme(preference);
}

export const shadowThemeCss = `
:host{--cf-cover:#f3f5ef;color-scheme:light}
:host([data-theme="dark"]){--cf-cover:#18261f;color:#e4eee2!important;color-scheme:dark}
:host([data-theme="dark"]) button{background:#203326;border-color:#6f8773;color:#e4eee2}
:host([data-theme="dark"]) button:hover{background:#304a37}
:host([data-theme="dark"]) .panel{background:#18261f;border-color:#45604a;color:#e4eee2;box-shadow:0 8px 28px #0006}
:host([data-theme="dark"]) .bar button{background:#18261f}
:host([data-theme="dark"]) :is(.brand,.eyebrow,.detail,.muted){color:#b3c3b4}
:host([data-theme="dark"]) .notice{color:#f0ce87}
:host([data-theme="dark"]) .flag-notice{background:#302d1d;border-color:#887443;color:#f0dda9}
:host([data-theme="dark"]) summary:focus-visible{outline-color:#e3ba63}
:host([data-theme="dark"]) .primary{background:#bddc9c;border-color:#bddc9c;color:#142218}
:host([data-theme="dark"]) .primary:hover{background:#cfe9b5}
:host([data-theme="dark"]) .badge{background:#18261f;border-color:#45604a;color:#cee8ae}
:host([data-theme="dark"]) .badge:hover{background:#253a2c}
:host([data-theme="dark"]) .badge.warn{border-color:#987a3e}
:host([data-theme="dark"]) .badge.is-paused{color:#a9b9aa}
:host([data-theme="dark"]) .item{border-color:#45604a}
:host([data-theme="dark"]) .note{background:#3c301a;border-color:#75603a;color:#f0ce87}
:host([data-theme="dark"]) .destination{background:#263c2d;color:#e4eee2}
:host([data-theme="dark"]) a{color:#bddc9c}
:host([data-theme="dark"]) .dialog::backdrop{background:#050b08a8}
:host([data-theme="dark"]) :is(button,a):focus-visible{outline-color:#e3ba63}
`;
