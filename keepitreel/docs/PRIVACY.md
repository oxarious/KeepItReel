# KeepItReel privacy policy

Effective date: 29 October 2026. Extension release: 0.3.21.
Publisher and contact for personal-data requests: Oscar Sommerfors, Sweden.
Email: oscar.sommerfors@gmail.com
Website: https://keepitreel.pages.dev/
Policy: https://keepitreel.pages.dev/privacy.html

KeepItReel is a personal hobby project operated by Oscar Sommerfors. KeepItReel processes supported content locally in desktop Chrome to help you review concerning content and control what stays in your feed. The extension has no content-analysis server, advertising, automatic telemetry or account requirement. It does not automatically send us your emails or browsing content. This policy covers the extension, its website and information you deliberately share with us for support or contributions.

## Information used on your device

On supported YouTube, TikTok and Google pages, KeepItReel reads item titles, creator/source identifiers, URLs and disclosure labels. Local spam checks additionally inspect supported published YouTube/TikTok titles or captions for specific English solicitation patterns and repeated promotional text. They do not inspect video frames or voices, infer AI authorship, read arbitrary comment threads or connect to a platform API. Optional website checks inspect readable text and visible links. Separately enabled experimental Gmail/Outlook checks inspect visible inbox-row text and supported opened message bodies and links, plus available sender labels for opened-message mismatch checks. Inbox checks use only rendered subject/preview text (or rendered row text on supported Outlook layouts), never hidden message bodies or link destinations. Visible text may contain names, addresses or other personal information, including sensitive health, financial or authentication information. Such incidental content is checked locally; KeepItReel does not build sensitive-personal-data profiles, read password input fields or access authentication cookies. Automatic checks do not store message bodies, sender details or inspected link addresses. Detailed findings remain in page memory; fixed warning-category IDs and check status are also kept in browser session storage for the toolbar summary, as described below.

Checks skip recognised forms/editors, selected sensitive pages and excluded domains. These rules cannot identify all sensitive information. Website permission does not enable webmail checks. LinkedIn is excluded. KeepItReel does not connect to mailbox APIs, fetch full unopened mail bodies, scan attachments or automatically send, accept, reject or delete messages or requests.

## Local storage

- Preferences, including corner-logo visibility, source rules and excluded domains remain until removed/reset or uninstalled.
- Optional filtering history is enabled initially and stores up to 100 item titles, URLs, creators, reasons and timestamps. It has no time-based deletion and is not a complete browsing history. You can disable or clear it.
- Up to 500 observed disclosure records include platform/item identifiers, labels and times. Records older than 30 days are ignored and pruned on later filtering events, or removed using Forget cached disclosures. Physical deletion is not guaranteed at exactly 30 days while idle.
- Up to 20 recent creator Undo entries store the affected creator rule and any previous rule in browser session storage. Entries are consumed by Undo, invalidated by later edits to that creator, removed on reset or cleared when the browser session ends. They contain no email bodies or page text.
- Spam comparison data holds up to 200 normalized title/caption samples, at most 4,000 characters each, with item/creator identifiers in the current page memory. Samples expire from matching after 15 minutes and are pruned on later checks; closing/reloading the page or disabling spam checks clears this comparison memory. No additional caption archive or spam score is written to browser storage. Existing optional filtering history still records item titles; on TikTok the title may be derived from its caption and is limited to 250 characters.
- Up to 500 post-hide choices and 500 dismissed-flag signatures stay in page memory until reload/closure. Hiding a post does not add a creator rule. The most recent post Undo notification is also held in page memory.
- An aggregate filtered-item count stays locally.
- User-requested selection/article extraction stores at most 30,000 characters in session storage until consumed by the checker, reset, or browser session end. Pasted text remains in that screen's memory until cleared or closed.
- Email dismissal comparisons use bounded snapshots of readable text, inspected links, available sender/message metadata and the current page URL in the tab's isolated memory only. They are never copied to extension storage, exports or feedback. Reloading/closing the page or disabling checks clears dismissal memory; removed message nodes can be garbage collected. Dismissal does not create a sender allowlist.
- Up to 20 pending feedback drafts hold a random draft key, creation time, feature category and known warning codes in browser session storage until consumed by their form, pruned by later reports, reset, or session end. Keys are random and contain no message or account identifiers. Notes and previews remain in the feedback screen's memory until closed/cleared.

## Exports and support

Settings exports contain preferences and source rules. Feedback exports contain product version, category, warning codes, coarse browser/OS information, feature/permission flags and any voluntary note. They do not automatically include URLs, page/email text, screenshots, history, source lists or account identifiers. Review the exact preview and remove personal information from your note.

Nothing is sent when you preview or download feedback. If you share a file or contact support, we receive what you send plus information from that service, such as your email address. Support correspondence is handled through Gmail (Google). We delete identifiable support messages and attachments within 90 days after resolving the issue and retain non-identifying technical bug summaries as needed. A specific legal obligation or unresolved legal claim may require restricted retention for longer; only the information necessary for that purpose is retained.

Downloaded files remain where saved until you delete them. Uninstalling does not remove exports or copies shared with others.

## Control, network activity and deletion

Privacy & data lets you clear/disable history, forget cached disclosures, export preferences or reset. Your lists lets you remove source rules. Web & message protection lets you pause checks, exclude sites or revoke optional access. Chrome extension settings lets you remove access or uninstall. Uninstall removes associated browser storage; exports/support correspondence require separate deletion. Contact oscar.sommerfors@gmail.com for requests concerning information you shared with support.

URL checks parse addresses locally using a bundled public-suffix database. No reputation lookup or redirect-following request is made. Continue to link makes an ordinary visit; intermediaries and the destination can receive that visit. Websites make their own requests independently. Media playback changes can be observable to a platform. Chrome manages distribution/updates under Google's policies.

This release has no login, payment, subscription, cloud analysis or automatic upgrade to a paid service. Future changes require updated disclosures and appropriate controls before introduction.


## Typography assets

Atkinson Hyperlegible Next is packaged with the extension under the included Open Font License. Fonts load locally; no third-party font/CDN service is contacted. The selected Latin subset includes Swedish letters; unsupported glyphs use a native fallback.


## Toolbar warning summaries

The extension stores fixed warning-category IDs and whether a scanner reported checks, grouped by browser tab/document ID and scanner type, in Chrome session storage. It does not add page URLs, titles, sender addresses, message text, link destinations or video identities to these summaries. Repeated findings are deduplicated into warning types. Summaries clear on navigation, tab removal, reset and relevant disabling/permission changes; browser-session storage supports service-worker suspension without durable browsing history. The badge and popup use these local categories; no desktop-notifications permission or remote reporting service is added. An empty badge can mean no matches, unsupported content, missing permission or disabled checks, not guaranteed safety.

## Purposes and choices

Content is processed on your device to provide the checks, explanations and filtering you choose. Feed controls and supported disclosure/spam checks start enabled. Website scanning and webmail checks start disabled and require an opt-in and the relevant Chrome site access; email has a separate feature control. Local filtering history starts enabled and can be switched off, which clears the list. There is no advertising profile, AI-model training, sale of personal data, or use of your data for creditworthiness or lending. Warnings are local pattern results, not decisions with legal or similarly significant effects. You can override filters, disable features or uninstall.

For information actually sent to us, we act as the data controller. We use voluntary support correspondence to answer requests, investigate bugs and maintain the software, relying on our legitimate interest in providing and improving the service. Technical website delivery and security rely on our legitimate interest in operating a functioning, secure website. Contribution administration relies on our legitimate interest in managing voluntary support; legally required tax records are handled to meet legal obligations. We do not use support contacts for unsolicited marketing.

## Website and service providers

The public website is hosted on Cloudflare Pages. The site contains no analytics or advertising scripts and has no feedback database. It stores your chosen theme locally under kir-site-theme until you clear the site's browser data. Its demonstrations are fictional and do not scan your browser or mailbox. Feedback text stays in page memory until reload/closure; copying it or opening a mail draft happens only when you choose, and you decide whether to send.

Cloudflare processes technical request information such as IP addresses and connection logs to deliver and secure the website. That is separate from extension content checks. Cloudflare's retention depends on the technical service and its privacy policy; we do not create an additional visitor-level analytics archive. Gmail handles correspondence sent to the public contact address. Chrome manages extension installation and updates under Google's policies. These providers may process data outside Sweden and the EEA, including in the United States, under the applicable transfer arrangements described in their policies. Contact us if you need information about the safeguards relevant to information you shared with us.

Provider notices: https://www.cloudflare.com/privacypolicy/ and https://policies.google.com/privacy

## Optional contributions

The website links to https://buymeacoffee.com/keepitreel. Following that link takes you to an external service; the extension and website do not collect card details or process payments. Buy Me a Coffee and its payment provider Stripe handle the contribution. Buy Me a Coffee makes supporter details available to the creator, including the name/display name, email address, message, amount/date and any membership tier. We use information made available to us only to administer support, respond to related questions and meet applicable tax-record obligations. Full card numbers are not made available to us.

We do not make a separate supporter marketing list. Correspondence we receive follows the support-retention period above. Transaction records required for tax reporting are retained for the applicable statutory retention period, then deleted when no longer legally required. This exception applies only to necessary tax records; other identifiable correspondence follows the 90-day support-retention period above. Records held by Buy Me a Coffee or Stripe follow their own retention policies; contact those services for rights relating to their separate processing.

Provider notices: https://buymeacoffee.com/privacy-policy and https://stripe.com/privacy

## Your rights and contacting us

For personal information you have shared with us, you can request access, correction, deletion, restriction or portability where applicable, and object to processing based on legitimate interests. Contact oscar.sommerfors@gmail.com. We may ask for only the information needed to verify and fulfil your request. Some records must be retained to meet legal obligations. We cannot remotely retrieve or delete the extension's local data; the in-product and Chrome controls described above let you manage it on your device.

You can complain to the Swedish Authority for Privacy Protection (IMY) or your local supervisory authority. Information about your rights and complaints: https://www.imy.se/en/individuals/data-protection/your-rights-as-a-data-subject/

## Changes

We will update this policy when the software or our data practices change and identify the revision date here. Material new processing requires updated disclosures and appropriate controls before introduction. The current release cannot guarantee human authorship, detect all scams or certify that content is safe.
