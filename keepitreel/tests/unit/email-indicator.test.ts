import { describe, expect, it } from 'vitest';
import { emailIndicator } from '../../lib/email-indicator';
import { assessMessage, assessLink } from '../../lib/protection-policy';

describe('opened email indicator meaning', () => {
  const body = { findings: [], textAvailable: true, truncated: false };
  it('reserves green for complete checks with no matching patterns', () => {
    expect(emailIndicator(body, true)).toEqual({ tone: 'green', label: 'No warning patterns found' });
    for (const partial of [{ ...body, textAvailable: false }, { ...body, truncated: true }]) {
      expect(emailIndicator(partial, true).tone).toBe('yellow');
    }
    expect(emailIndicator(body, false).tone).toBe('yellow');
  });
  it('distinguishes a high-risk secret request from link mismatch or fee concerns', () => {
    expect(emailIndicator({ ...body, findings: assessMessage('Please send your verification code.') }, true).tone).toBe('red');
    expect(emailIndicator({ ...body, findings: assessMessage('Never share your verification code.') }, true).tone).toBe('green');
    expect(emailIndicator({ ...body, findings: assessLink('https://example.org', 'https://example.com').findings }, true).tone).toBe('yellow');
    expect(emailIndicator({ ...body, findings: assessMessage('Please pay the activation fee.') }, true).tone).toBe('yellow');
  });
  it('keeps a detected high-risk request red even when coverage is partial', () => {
    expect(emailIndicator({ ...body, truncated: true, findings: assessMessage('Send your password.') }, false).tone).toBe('red');
    expect(emailIndicator({ ...body, findings: assessLink('https://bit.ly/example').findings }, true).tone).toBe('yellow');
  });
});
