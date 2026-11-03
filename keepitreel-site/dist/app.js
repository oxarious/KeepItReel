const config = window.KIR_CONFIG || {};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let theme = null;
try { theme = localStorage.getItem('kir-site-theme'); } catch {}
const media = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  $$('.theme-button').forEach(button => {
    button.textContent = value === 'dark' ? 'Light' : 'Dark';
    button.setAttribute('aria-label', `Switch to ${value === 'dark' ? 'light' : 'dark'} theme`);
  });
}
applyTheme(theme === 'dark' || theme === 'light' ? theme : media.matches ? 'dark' : 'light');
media.addEventListener('change', event => { if (!theme) applyTheme(event.matches ? 'dark' : 'light'); });
$$('.theme-button').forEach(button => button.addEventListener('click', () => {
  theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('kir-site-theme', theme); } catch {}
  applyTheme(theme);
}));

const dialog = $('#site-dialog');
let returnFocus;
function showDialog(content) {
  if (!dialog) return;
  returnFocus = document.activeElement;
  $('#dialog-body').innerHTML = content;
  dialog.showModal();
}
if (dialog) {
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
  dialog.addEventListener('close', () => returnFocus?.focus());
}
function validUrl(value, host) {
  try { const url = new URL(value); return url.protocol === 'https:' && host.includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const storeUrl = validUrl(config.chromeStoreUrl, ['chromewebstore.google.com']);
const coffeeUrl = validUrl(config.buyMeACoffeeUrl, ['buymeacoffee.com', 'www.buymeacoffee.com']);
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.supportEmail || '') ? config.supportEmail : null;
$$('[data-install]').forEach(link => {
  if (storeUrl) { link.href = storeUrl; link.rel = 'noopener'; link.target = '_blank'; return; }
  link.addEventListener('click', event => {
    event.preventDefault();
    showDialog('<p class="eyebrow">RELEASE STATUS</p><h2 id="dialog-title">Coming to Chrome.</h2><p>KeepItReel is being prepared for its first public Chrome Web Store release. It is not available in the store yet.</p><p>Once it is approved, this button will take you directly to the official listing. The release will be free and clearly marked as early development.</p><div class="dialog-links"><a class="text-link" href="/guide.html">Read the getting-started guide ↗</a></div>');
  });
});
$$('[data-support]').forEach(link => {
  if (coffeeUrl) { link.href = coffeeUrl; link.rel = 'noopener'; link.target = '_blank'; return; }
  link.addEventListener('click', event => {
    event.preventDefault();
    showDialog('<p class="eyebrow">OPTIONAL SUPPORT</p><h2 id="dialog-title">Thank you for the thought.</h2><p>Our Buy Me a Coffee page is not connected yet. No payment is taken here.</p><p>In the meantime, an idea or a useful bug report helps too. All current features are free whether you contribute or not.</p><button class="button" id="support-feedback" type="button">Share feedback ↗</button>');
    $('#support-feedback').addEventListener('click', () => { dialog.close(); feedback(); });
  });
});
function feedback() {
  showDialog(`<p class="eyebrow">HELP SHAPE KEEPITREEL</p><h2 id="dialog-title">What would you change?</h2><form id="feedback-form"><label for="feedback-kind">I'd like to share</label><select id="feedback-kind"><option>A feature idea</option><option>A bug report</option><option>An incorrect warning</option><option>A missed warning</option><option>A privacy question</option></select><label for="feedback-message">Your message</label><textarea id="feedback-message" required minlength="5" maxlength="3000" placeholder="What happened, or what would you like KeepItReel to do?"></textarea><p class="micro">Please leave out private emails, passwords and verification codes.</p><div class="form-actions"><button class="button" type="submit">Copy feedback</button>${email ? '<button class="button outline" type="button" id="email-feedback">Open email draft ↗</button>' : ''}</div><p class="form-status" id="feedback-status" role="status"></p><p class="micro">${email ? 'Nothing is sent automatically. Review your draft in your email app before sending.' : 'Our public contact address is being set up. Copy your message to keep it or share it with the person who gave you this preview. Nothing is sent or stored by this website.'}</p></form>`);
  const form = $('#feedback-form');
  const compose = () => `KeepItReel feedback: ${$('#feedback-kind').value}\n\n${$('#feedback-message').value.trim()}`;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try { await navigator.clipboard.writeText(compose()); $('#feedback-status').textContent = 'Copied. Your feedback has not been sent.'; }
    catch { $('#feedback-status').textContent = 'Copy was blocked by your browser. Select and copy your message above.'; $('#feedback-message').select(); }
  });
  $('#email-feedback')?.addEventListener('click', () => {
    if (!form.reportValidity()) return;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`KeepItReel: ${$('#feedback-kind').value}`)}&body=${encodeURIComponent($('#feedback-message').value.trim())}`;
    $('#feedback-status').textContent = 'Opening your email app. Your message has not been sent by this site.';
  });
}
$$('[data-feedback]').forEach(button => button.addEventListener('click', feedback));

// Deliberately fictional, fixed examples. This website does not scan user content.
const state = { platform: 'youtube', toolbarOnly: false, mail: 'secret', hidden: false, blocked: false };
const mailExamples = {
  secret: { sender: 'Account support', title: 'Please send your verification code.', body: 'Please send your verification code to activate your account.', level: 'red', label: 'Strong warning', heading: 'A request for a private code', reason: 'This message asks you to share a verification code. Verify the request through a channel you already trust.', count: 1 },
  payment: { sender: 'Team coordinator', title: 'Please buy gift cards for me.', body: 'Please buy gift cards for me and send the card numbers.', level: 'amber', label: 'Possible concern', heading: 'An unusual payment request', reason: 'This message asks for gift cards and their card numbers. That wording matches an unusual-payment pattern. Check with the sender through another channel.', count: 1 },
  ordinary: { sender: 'Jamie', title: 'Our meeting is on Thursday.', body: 'Our meeting is on Thursday at 10:00. Please bring your notebook.', level: 'green', label: 'No pattern found', heading: 'No matching warning patterns', reason: 'The enabled text checks found no matching warning patterns in this opened-message example. This does not establish that an email is safe.', count: 0 }
};
function monkey(level, name) { return `<button class="item-monkey ${level}" type="button" aria-label="${name}"${state.toolbarOnly ? ' hidden' : ''}><span class="mark" aria-hidden="true"></span></button>`; }
function setAnalysis({ heading, reason, scope, level, label, actions = '' }) {
  $('#analysis-title').textContent = heading;
  $('#analysis-explanation').textContent = reason;
  $('#analysis-scope').textContent = scope;
  const badge = $('#analysis-level'); badge.className = `level ${level}`; badge.textContent = label;
  $('#analysis-actions').innerHTML = actions;
  $('#demo-status').textContent = '';
}
function analyse() {
  if (state.platform === 'youtube') {
    setAnalysis({ heading: 'AI disclosure found', reason: 'This example is labelled as AI-generated. A disclosure is useful context; it does not tell you whether the content is good or bad.', scope: 'Checked: visible title and disclosure label. Video footage and audio are not analysed.', level: 'amber', label: 'Disclosure', actions: state.hidden || state.blocked ? '<button type="button" data-demo-action="undo">Undo last action</button>' : '<button type="button" data-demo-action="hide">Hide video</button><button type="button" data-demo-action="block">Block creator</button>' });
  } else {
    const m = mailExamples[state.mail];
    setAnalysis({ ...m, scope: 'This opened-message example checks visible text. Inbox previews are limited; attachments and sender authentication are not checked.', actions: m.count ? '<button type="button" data-demo-action="dismiss">Dismiss warning</button><button type="button" data-demo-action="report">Report incorrect warning</button>' : '' });
  }
  bindActions();
}
function bindActions() {
  $$('[data-demo-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.demoAction;
    if (action === 'hide' || action === 'block') { state.hidden = action === 'hide'; state.blocked = action === 'block'; renderDemo(); $('#demo-status').textContent = action === 'hide' ? 'Video hidden in this demo. Undo is available.' : 'Creator blocked in this demo. Undo is available.'; $('#analysis-actions button')?.focus(); }
    if (action === 'undo') { state.hidden = false; state.blocked = false; renderDemo(); $('#demo-status').textContent = 'Undone. The example is visible again.'; $('#analysis-actions button')?.focus(); }
    if (action === 'dismiss') {
      $('#analysis-actions').innerHTML = '<button type="button" data-demo-action="show">Show warning again</button>';
      $('#analysis-title').textContent = 'Warning dismissed in this demo';
      $('#analysis-explanation').textContent = 'Dismissal changes how the warning is shown. It does not make the request safe or change the finding.';
      bindActions(); $('#analysis-actions button').focus();
    }
    if (action === 'show') { analyse(); $('#analysis-actions button')?.focus(); }
    if (action === 'report') $('#demo-status').textContent = 'Demo only: nothing was reported. In the extension, review and export warning-category feedback yourself.';
  }));
}
function renderDemo() {
  if (!$('#demo-content')) return;
  $('#demo-panel').setAttribute('aria-labelledby', `tab-${state.platform}`);
  $('#demo-address').textContent = state.platform === 'youtube' ? 'YouTube · fictional feed' : `${state.platform === 'gmail' ? 'Gmail' : 'Outlook'} · fictional message`;
  const content = $('#demo-content');
  let count = 1, level = 'amber';
  if (state.platform === 'youtube') {
    content.innerHTML = state.hidden || state.blocked ? `<div class="hidden-video"><span class="mark" aria-hidden="true"></span><h3>${state.blocked ? 'Example creator blocked' : 'Example video hidden'}</h3><p>This only changes the fictional demo.</p><button type="button" data-demo-action="undo">Undo</button></div>` : `<div class="demo-video"><div class="video-image" aria-label="Illustrated mountain landscape"><span class="sun"></span><span class="duration">2:48</span></div><h3 class="video-title">A mountain town that doesn't exist</h3><p class="video-meta">Imaginary Places · fictional creator</p><span class="disclosure">AI-generated content</span>${monkey('amber', 'Read the AI disclosure explanation')}</div>`;
  } else {
    const m = mailExamples[state.mail]; count = m.count; level = m.level;
    content.innerHTML = `<div class="mail-heading">${state.platform === 'gmail' ? 'Inbox' : 'Focused inbox'}<small>Fictional example</small></div><div class="mail-row"><span class="avatar">${m.sender[0]}</span><div><b>${m.sender}</b><p>${m.title}</p></div>${monkey(m.level === 'green' ? 'neutral' : m.level, 'Read the email analysis')}</div><div class="email-body"><p>${m.body}</p><p>Fictional KeepItReel test. No action needed.</p></div><label class="mail-select" for="mail-example">Try another example<select id="mail-example"><option value="secret">Private verification code</option><option value="payment">Gift card request</option><option value="ordinary">Ordinary meeting message</option></select></label>`;
    $('#mail-example').value = state.mail;
    $('#mail-example').addEventListener('change', event => { state.mail = event.target.value; renderDemo(); $('#mail-example').focus(); });
  }
  const badge = $('#demo-count'); badge.textContent = count; badge.hidden = !count; badge.style.background = `var(--${level})`;
  $('#demo-toolbar').setAttribute('aria-label', `Open toolbar warnings: ${count} warning ${count === 1 ? 'type' : 'types'}`);
  analyse();
  content.querySelector('.item-monkey')?.addEventListener('click', () => { analyse(); $('#demo-status').textContent = 'Analysis opened. Read the reason above.'; });
}
const tabs = $$('[data-platform]');
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    state.platform = tab.dataset.platform;
    tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', selected); item.tabIndex = selected ? 0 : -1; });
    renderDemo();
  });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
  });
});
$('#toolbar-only')?.addEventListener('change', event => { state.toolbarOnly = event.target.checked; renderDemo(); $('#demo-status').textContent = state.toolbarOnly ? 'Page monkeys hidden. The toolbar warning remains available.' : 'Page monkeys shown again.'; });
$('#demo-toolbar')?.addEventListener('click', () => {
  analyse();
  const count = state.platform === 'youtube' ? 1 : mailExamples[state.mail].count;
  $('#demo-status').textContent = count ? '1 distinct warning type on this fictional page. The number counts warning types, not emails or videos.' : 'No warning badge for this example. An empty badge is not a safety guarantee.';
});
renderDemo();
