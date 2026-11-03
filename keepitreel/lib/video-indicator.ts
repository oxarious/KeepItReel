import type { PostFlag } from './model';

/** A local evidence indicator, never a video-authorship or creator reputation score. */
export function videoIndicator(flags: PostFlag[], textChecked: boolean) {
  if (flags.some(flag => flag.code === 'spam-secret' || flag.code === 'spam-prize-fee')) {
    return { tone: 'red', label: 'High-concern request found' };
  }
  if (flags.some(flag => flag.kind === 'spam')) return { tone: 'yellow', label: 'Possible spam patterns' };
  if (flags.some(flag => flag.kind === 'disclosure')) return { tone: 'yellow', label: 'AI disclosure found' };
  if (!textChecked) return { tone: 'yellow', label: 'Limited check' };
  return { tone: 'green', label: 'No warning patterns found' };
}
