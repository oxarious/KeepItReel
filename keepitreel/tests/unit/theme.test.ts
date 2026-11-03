import { describe, expect, it } from 'vitest';
import { freshState, hydrate, type Settings } from '../../lib/model';
import { resolvedTheme } from '../../lib/theme';

describe('appearance preferences', () => {
  it('migrates missing or invalid preferences without losing existing source rules', () => {
    const old = freshState();
    old.rules.push({ platform: 'youtube', key: '@example', name: 'Example', action: 'allow' });
    for (const value of [undefined, null, 'sepia', {}, 1]) {
      old.settings = { ...old.settings, theme: value } as Settings;
      const migrated = hydrate(old);
      expect(migrated.settings.theme).toBe('system');
      expect(migrated.rules).toEqual(old.rules);
    }
  });
  it('honours explicit choices independently of the OS and follows the OS in system mode', () => {
    for (const systemDark of [true, false]) {
      expect(resolvedTheme('dark', systemDark)).toBe('dark');
      expect(resolvedTheme('light', systemDark)).toBe('light');
      expect(resolvedTheme('system', systemDark)).toBe(systemDark ? 'dark' : 'light');
    }
    for (const theme of ['light', 'dark', 'system'] as const) {
      const state = freshState(); state.settings.theme = theme;
      expect(hydrate(state).settings.theme).toBe(theme);
    }
  });
  it('shows the page button for old or invalid settings and preserves an explicit hidden choice', () => {
    for (const value of [undefined, null, 'false', 0, {}]) {
      const old = freshState();
      old.rules.push({ platform: 'google', key: 'example.com', name: 'Example', action: 'allow' });
      old.settings = { ...old.settings, showPageButton: value } as Settings;
      expect(hydrate(old).settings.showPageButton).toBe(true);
      expect(hydrate(old).rules).toEqual(old.rules);
    }
    const hidden = freshState(); hidden.settings.showPageButton = false;
    expect(hydrate(hidden).settings.showPageButton).toBe(false);
  });
});
