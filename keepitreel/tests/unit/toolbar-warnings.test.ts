import { describe, it, expect } from 'vitest';
import { warningCodes, sanitizeWarningCodes, mergeWarnings } from '../../lib/toolbar-warnings';
describe('toolbar warning privacy and counting', () => {
  it('deduplicates equivalent warning types across scans and sources', () => {
    expect(warningCodes(['spam-secret', 'secret-request', 'secret-request', 'ai-disclosure'])).toEqual(['disclosure', 'secret']);
    expect(mergeWarnings({ codes: ['secret'], checked: true }, { codes: ['secret', 'link'], checked: true })).toEqual({ codes: ['link', 'secret'], checked: true });
  });
  it('discards unknown types, inherited keys, text and private URLs', () => {
    expect(sanitizeWarningCodes(['secret', '__proto__', 'constructor', 'private body', 'https://private.test/?token=secret', {}])).toEqual(['secret']);
    expect(sanitizeWarningCodes({ secret: true })).toEqual([]);
    expect(warningCodes(['ip-address', 'unencrypted', 'short-link', 'unknown'])).toEqual([]);
  });
  it('distinguishes no report from a completed check with no matches', () => {
    expect(mergeWarnings()).toEqual({ codes: [], checked: false });
    expect(mergeWarnings({ codes: [], checked: true }).checked).toBe(true);
  });
});
