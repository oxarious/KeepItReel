import { describe, it, expect } from 'vitest';
import { videoIndicator } from '../../lib/video-indicator';
import type { PostFlag } from '../../lib/model';
const flag = (code: PostFlag['code']): PostFlag => ({ code, kind: code === 'ai-disclosure' ? 'disclosure' : 'spam', title: 'Observed reason', detail: 'Observed detail' });
describe('video indicator evidence boundaries', () => {
  it('does not turn missing or disabled coverage green', () => {
    expect(videoIndicator([], false)).toEqual({ tone: 'yellow', label: 'Limited check' });
    expect(videoIndicator([], true)).toEqual({ tone: 'green', label: 'No warning patterns found' });
  });
  it('does not label AI disclosure as high-risk spam', () => {
    expect(videoIndicator([flag('ai-disclosure')], true)).toEqual({ tone: 'yellow', label: 'AI disclosure found' });
  });
  it('reserves red for concrete secret or prize-payment request patterns', () => {
    for (const code of ['spam-secret', 'spam-prize-fee'] as const) expect(videoIndicator([flag('ai-disclosure'), flag(code)], false).tone).toBe('red');
    for (const code of ['spam-return', 'spam-repeat'] as const) expect(videoIndicator([flag(code)], true).tone).toBe('yellow');
  });
});
