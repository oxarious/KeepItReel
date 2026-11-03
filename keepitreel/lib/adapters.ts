import { normalizeCreator, type Evidence, type Item, type Platform } from './model';

export interface FeedItem { root: HTMLElement; item: Item; postText?: string; controlsRoot?: HTMLElement; overlay?: boolean; next?: () => boolean; }
const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
// Read only supported published title/caption components, never whole cards,
// comments, editable drafts or our injected controls. This text is not an Item field.
function caption(scope: Element, selectors: string, fallback: string): string {
  const privateContent = 'form, input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], ytd-comments, clearfeed-panel, [data-clearfeed]';
  for (const node of scope.querySelectorAll(selectors)) {
    if (node.closest(privateContent) || node.querySelector(privateContent)) continue;
    const value = node.textContent?.slice(0, 8000).replace(/\s+/g, ' ').trim();
    if (value) return value.slice(0, 4000);
  }
  return fallback.slice(0, 4000);
}
export function platformFor(hostname: string): Platform | undefined {
  if (/^(www\.)?youtube\.com$/.test(hostname)) return 'youtube';
  if (/^(www\.)?tiktok\.com$/.test(hostname)) return 'tiktok';
  if (/^www\.google\.(com|se|co\.uk|de|fr|ca|com\.au)$/.test(hostname)) return 'google';
}
const ytLabels = /^(altered or synthetic content|ai-generated content|contains ai-generated content|how this content was made|made with ai|ai-generated)$/i;
const ttLabels = /^(ai-generated|ai generated|creator labeled as ai-generated|creator labelled as ai-generated|contains ai-generated content|ai-generated content)$/i;
export function disclosure(scope: Element, platform: Platform): Evidence | undefined {
  if (platform === 'google') return;
  if (platform === 'youtube') {
    // Observed on the live desktop site, October 2026. The visible text is only “AI”.
    for (const badge of scope.querySelectorAll('yt-metadata-badge-renderer badge-shape[aria-label], yt-badge-supported-renderer badge-shape[aria-label]')) {
      if (/^AI: Content was made with AI$/i.test(badge.getAttribute('aria-label') || '')) return { source: 'platform', label: 'Content was made with AI', observedAt: Date.now() };
    }
  }
  // Only platform disclosure components; never scan titles, descriptions, or comments for keywords.
  const selectors = platform === 'youtube'
    ? 'ytd-info-panel-content-renderer, ytd-info-panel-container-renderer, yt-video-attribute-view-model, ytd-video-attribute-view-model, .ytVideoAttributeViewModelHost, [class*="ytVideoAttributeViewModel"], ytd-reel-player-overlay-renderer [aria-label*="AI-generated"], ytd-reel-player-overlay-renderer [aria-label*="Altered or synthetic"]'
    : '[data-e2e="aigc-label"], [data-e2e="aigc-tag"], [data-e2e="video-aigc-label"], [data-e2e="ai-generated-label"], [data-e2e="video-ai-label"]';
  for (const component of scope.querySelectorAll(selectors)) {
    for (const node of [component, ...component.querySelectorAll('span, a, div, yt-formatted-string')]) {
      const value = text(node) || node.getAttribute('aria-label') || '';
      if ((platform === 'youtube' ? ytLabels : ttLabels).test(value)) {
        // Generic heading is insufficient unless the associated description names synthetic alteration.
        if (/how this content was made/i.test(value) && !/altered|synthetic|ai-generated/i.test(text(component))) continue;
        return { source: 'platform', label: value === 'How this content was made' ? 'Altered or synthetic content' : value, observedAt: Date.now() };
      }
    }
  }
}
function creatorFrom(scope: Element, platform: Platform, structuredOnly = false): { creator?: string; creatorName?: string } {
  if (platform === 'youtube') {
    // Creator-owned components take priority over topic, comment and related links.
    for (const selector of ['yt-reel-channel-bar-view-model', '#owner', 'ytd-video-owner-renderer', 'ytd-channel-name', '#channel-name', '.ytContentMetadataViewModelMetadataRow', '.yt-content-metadata-view-model__metadata-row', 'ytd-reel-player-overlay-renderer']) {
      for (const owner of scope.querySelectorAll(selector)) {
        const profile = profilesFrom(owner, platform);
        if (profile.length === 1) return profile[0]!;
        if (profile.length > 1) return {};
      }
    }
    if (structuredOnly) return {};
  }
  const profiles = profilesFrom(scope, platform);
  return profiles.length === 1 ? profiles[0]! : {};
}
function profilesFrom(scope: Element, platform: Platform): { creator: string; creatorName: string }[] {
  const found = new Map<string, { creator: string; creatorName: string }>();
  for (const link of scope.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    try {
      const url = new URL(link.href);
      // normalizeCreator also accepts manually entered handles; a /watch URL must
      // never become the invented handle @watch when scanning published links.
      if (platform === 'youtube' && !/^\/(?:@[^/]+|channel\/UC[\w-]+)(?:\/(?:featured|videos|shorts|streams|playlists|community|posts|about))?\/?$/.test(url.pathname)) continue;
      if (platform === 'tiktok' && url.pathname.includes('/video/')) continue;
      const creator = normalizeCreator(platform, url.href);
      if (!found.has(creator) || text(link)) found.set(creator, { creator, creatorName: text(link).slice(0, 100) || creator });
    } catch { /* Not a profile link. */ }
  }
  return [...found.values()];
}
const shortId = (path: string) => path.match(/^\/shorts\/([\w-]+)\/?$/)?.[1];
function reelId(root: HTMLElement, doc: Document): string | undefined {
  const explicit = root.getAttribute('video-id');
  if (explicit && /^[\w-]{1,100}$/.test(explicit)) return explicit;
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href*="/shorts/"]')) {
    try { const url = new URL(link.href, doc.baseURI); if (platformFor(url.hostname) === 'youtube') { const id = shortId(url.pathname); if (id) return id; } } catch { /* Not a video permalink. */ }
  }
}
function activeReel(doc: Document): { root: HTMLElement; id: string } | undefined {
  if (!/^\/shorts(?:\/|$)/.test(doc.location.pathname)) return;
  const roots = [...doc.querySelectorAll<HTMLElement>('ytd-reel-video-renderer')].filter(root => !root.closest('[hidden],[aria-hidden="true"]') && doc.defaultView?.getComputedStyle(root).display !== 'none');
  const current = shortId(doc.location.pathname);
  const marked = roots.filter(root => root.matches('[is-active]:not([is-active="false"]),[active]:not([active="false"]),.is-active'));
  const candidates = marked.length ? marked : roots;
  const matching = current ? candidates.filter(root => reelId(root, doc) === current) : [];
  let root: HTMLElement | undefined;
  if (matching.length === 1) root = matching[0];
  else if (candidates.length === 1) {
    const id = reelId(candidates[0]!, doc);
    if (!current || !id || id === current) root = candidates[0];
  }
  // Never borrow the current URL for multiple preloaded or ambiguous renderers.
  if (!root) return;
  const id = reelId(root, doc) || (roots.length === 1 ? current : undefined);
  if (id) return { root, id };
}
export function collectYoutube(doc: Document = document): FeedItem[] {
  const items: FeedItem[] = [];
  const cardSelector = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, .ytLockupViewModelHost';
  const cards = doc.querySelectorAll<HTMLElement>(cardSelector);
  for (const root of cards) {
    if (root.parentElement?.closest(cardSelector + ', ytd-reel-video-renderer')) continue;
    const link = root.querySelector<HTMLAnchorElement>('a[href*="/watch?v="], a[href*="/shorts/"]');
    if (!link) continue;
    let url: URL;
    try { url = new URL(link?.href ?? '', doc.location.href); } catch { continue; }
    if (platformFor(url.hostname) !== 'youtube') continue;
    const short = false;
    const isShortLink = !!shortId(url.pathname);
    const id = url.searchParams.get('v') || shortId(url.pathname);
    if (!id) continue;
    const item: Item = { platform: 'youtube', id, title: caption(root, '#video-title, #video-title-link, .ytLockupMetadataViewModelTitle, .yt-lockup-metadata-view-model__title, h3', link?.title || 'YouTube video'), url: `https://www.youtube.com/${isShortLink ? `shorts/${id}` : `watch?v=${id}`}`, ...creatorFrom(root, 'youtube'), evidence: disclosure(root, 'youtube'), short };
    // New lockups put their text in a nested flex column. Mount below its metadata,
    // outside the thumbnail/title links, rather than beside or beyond the clipped card.
    const controlsRoot = root.querySelector<HTMLElement>('.ytLockupMetadataViewModelTextContainer, .yt-lockup-metadata-view-model__text-container') || undefined;
    items.push({ root, item, controlsRoot, postText: caption(root, '#description-text, .metadata-snippet-text', item.title) });
  }
  const reel = activeReel(doc);
  if (reel) {
    const { root, id } = reel;
    const item: Item = { platform: 'youtube', id, title: caption(root, 'yt-shorts-video-title-view-model, #video-title, h2, h3', root.querySelector<HTMLAnchorElement>('a[href*="/shorts/"]')?.title || 'YouTube Short'), url: `https://www.youtube.com/shorts/${id}`, ...creatorFrom(root, 'youtube', true), evidence: disclosure(root, 'youtube'), short: true };
    items.push({ root, item, postText: item.title.slice(0, 4000), overlay: true, controlsRoot: root.querySelector<HTMLElement>('#shorts-player, #player-container') || root, next: () => {
      const next = doc.querySelector<HTMLButtonElement>('#navigation-button-down button, button[aria-label="Next video"]');
      if (next && !next.disabled) { next.click(); return true; } return false;
    } });
  }
  const watch = doc.querySelector<HTMLElement>('ytd-watch-flexy');
  const player = watch?.querySelector<HTMLElement>('#player-container-outer, #player-container, #player');
  const videoId = new URL(doc.location.href).searchParams.get('v');
  if (watch && player && videoId && !watch.hidden) {
    const primary = watch.querySelector('#primary-inner, #primary') ?? watch.querySelector('ytd-watch-metadata');
    if (!primary) return items;
    const title = caption(primary, 'h1', doc.title);
    items.push({ root: player, overlay: true, controlsRoot: player, postText: caption(primary, '#description-inline-expander, ytd-text-inline-expander', title), item: { platform: 'youtube', id: videoId, title, url: `https://www.youtube.com/watch?v=${videoId}`, ...creatorFrom(primary, 'youtube', true), evidence: disclosure(primary, 'youtube') } });
  }
  return items;
}
export function collectTiktok(doc: Document = document): FeedItem[] {
  const items: FeedItem[] = [];
  const roots = doc.querySelectorAll<HTMLElement>('[data-e2e="recommend-list-item-container"], [data-e2e="feed-item"], [data-e2e="search_top-item"], [data-e2e="user-post-item"], [data-e2e="explore-item"], article[data-scroll-index]');
  for (const root of roots) {
    if (root.parentElement?.closest('[data-e2e="recommend-list-item-container"], [data-e2e="feed-item"], article[data-scroll-index]')) continue;
    const link = root.querySelector<HTMLAnchorElement>('a[href*="/video/"], a[href*="/photo/"]');
    const url = link?.href ?? (roots.length === 1 ? doc.location.href : '');
    const match = url.match(/\/@([^/]+)\/(?:video|photo)\/(\d+)/);
    const playerId = root.querySelector('[id^="xgwrapper-"]')?.id.match(/-(\d{10,})$/)?.[1];
    const id = match?.[2] || playerId;
    if (!id) continue;
    const profile = creatorFrom(root, 'tiktok');
    const creator = match?.[1] ? `@${match[1].toLowerCase()}` : profile.creator;
    const item: Item = { platform: 'tiktok', id, title: caption(root, '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="explore-card-desc"]', link?.getAttribute('aria-label') || 'TikTok post'), url: creator ? `https://www.tiktok.com/${creator}/${url.includes('/photo/') ? 'photo' : 'video'}/${id}` : `https://www.tiktok.com/player/v1/${id}`, creator, creatorName: text(root.querySelector('[data-e2e="video-author-uniqueid"], [data-e2e="explore-card-user-unique-id"]')) || profile.creatorName || creator, evidence: disclosure(root, 'tiktok'), short: !root.matches('[data-e2e="explore-item"], [data-e2e="user-post-item"], [data-e2e="search_top-item"]') };
    items.push({ root, item, postText: caption(root, '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="explore-card-desc"]', item.title), next: () => {
      const button = doc.querySelector<HTMLButtonElement>('button[data-e2e="feed-navigation-next"], button[data-e2e="arrow-right"], button[data-e2e="arrow-down"], button[aria-label="Go to next video"]');
      if (button && !button.disabled) { button.click(); return true; }
      const list = [...doc.querySelectorAll<HTMLElement>('[data-e2e="recommend-list-item-container"], [data-e2e="feed-item"], article[data-scroll-index]')];
      const next = list[list.indexOf(root) + 1];
      if (next) { next.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
      return false;
    } });
  }
  return items;
}
export function collectGoogle(doc: Document = document): FeedItem[] {
  const items: FeedItem[] = [];
  const used = new Set<Element>();
  for (const heading of doc.querySelectorAll('#search h3')) {
    const anchor = heading.closest('a');
    if (!anchor) continue;
    let url: URL;
    try {
      url = new URL(anchor.href, doc.location.href);
      if (url.pathname === '/url' && url.hostname === doc.location.hostname) url = new URL(url.searchParams.get('q') ?? url.searchParams.get('url') ?? '');
      if (!['http:', 'https:'].includes(url.protocol) || url.hostname === doc.location.hostname) continue;
    } catch { continue; }
    const root = heading.closest<HTMLElement>('.MjjYud, .g, [data-snhf]') ?? anchor.parentElement;
    if (!root || used.has(root)) continue;
    used.add(root);
    const host = normalizeCreator('google', url.hostname);
    items.push({ root, item: { platform: 'google', id: url.href, title: text(heading), url: url.href, creator: host, creatorName: host } });
  }
  return items;
}
export const collectors = { youtube: collectYoutube, tiktok: collectTiktok, google: collectGoogle };
