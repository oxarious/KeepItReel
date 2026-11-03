import '../../lib/app-theme';
import { startFeed } from '../../lib/feed';
import './style.css';
import '../../styles/theme.css';
import '../../styles/typography.css';
void startFeed('youtube');
const example = document.createElement('button'); example.type = 'button'; example.className = 'demo-example'; example.textContent = 'Try a spam example';
let sample: HTMLElement | undefined;
example.addEventListener('click', () => {
  if (sample) { sample.remove(); sample = undefined; example.textContent = 'Try a spam example'; return; }
  sample = document.createElement('ytd-rich-item-renderer');
  const visual = document.createElement('div'); visual.className = 'visual ordinary'; visual.textContent = 'Fictional spam example';
  const metadata = document.createElement('div'); metadata.className = 'metadata';
  const title = document.createElement('a'); title.id = 'video-title'; title.href = 'https://www.youtube.com/watch?v=keepitreel_demo_spam'; title.textContent = 'Guaranteed daily returns. Message me on Telegram to invest.';
  const channel = document.createElement('ytd-channel-name'), profile = document.createElement('a'); profile.href = 'https://www.youtube.com/@keepitreel-demo-offer'; profile.textContent = '@keepitreel-demo-offer'; channel.append(profile);
  metadata.append(title, channel); sample.append(visual, metadata); document.querySelector('.cards')!.append(sample);
  example.textContent = 'Remove spam example';
});
document.querySelector('.heading')!.append(example);
