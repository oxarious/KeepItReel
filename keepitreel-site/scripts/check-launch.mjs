import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('site.config.json', 'utf8'));
const missing = [];
if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.supportEmail)) missing.push('Create and verify the public support email, then set supportEmail.');
if (!config.publisherName.trim()) missing.push('Confirm the public publisher/data-controller identity in publisherName.');
if (!/^https:\/\/[^/]+$/.test(config.publicOrigin)) missing.push('Set publicOrigin to the public HTTPS website origin (no trailing slash).');
if (!/^\d{4}-\d{2}-\d{2}$/.test(config.effectiveDate)) missing.push('Set the adopted privacy policy effectiveDate (YYYY-MM-DD).');
if (!config.supportService.trim()) missing.push('Identify the support-email provider in supportService.');
if (!Number.isInteger(config.supportRetentionDays) || config.supportRetentionDays <= 0) missing.push('Adopt a support-message retention period in supportRetentionDays.');
if (config.privacyApproved !== true) missing.push('Review/adopt the policy and confirm public Cloudflare hosting, then set privacyApproved.');
if (missing.length) { console.error('Public launch is not ready:\n' + missing.map(x => '- ' + x).join('\n')); process.exitCode = 1; }
else console.log('Publisher, contact, public origin and privacy date configured. Verify ownership and hosting before launch.');
if (!config.chromeStoreUrl) console.log('Chrome listing is not connected: install buttons show release status. Connect after approval.');
if (!config.buyMeACoffeeUrl) console.log('Buy Me a Coffee is not connected: support buttons show availability.');
