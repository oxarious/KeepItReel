> Historical private-beta record. Superseded for the public 0.3.21 release by PUBLIC-RELEASE.md and STORE-SUBMISSION.md. Do not follow the old private-distribution instructions for this submission.

# Private beta release status — 0.3.20

Version 0.3.20 adds per-tab toolbar warning badges and a Show monkeys on websites switch. Turning the switch off hides the page, inbox, opened-email and feed launchers; enabled scans, automatic filters, Undo notices and click-time link warnings remain active. The toolbar number counts distinct warning types, not videos, emails or blocked ads. Its popup explains the categories. Red is reserved for secret/prize-payment request categories; other matched categories use amber. No badge is not a safety verdict.

Version 0.3.19 replaces the separate YouTube creator and hide controls with one coloured monkey on supported cards, watch players and active Shorts. It opens local analysis, observed reasons, Hide video and Block creator (when identity is available). Existing Undo and filtering preferences remain. Green means no matching patterns in checked text, yellow means a disclosure, possible concern or limited check, and red means a concrete secret or prize-payment request. No colour certifies safety, creator reputation or AI authorship. Dismissed findings remain available in analysis.

Version 0.3.18 adds an Outlook inbox corner fallback when a recognised message row has no semantic timestamp. A small 24px target sits at the lower trailing corner, below the time in the tested layout, with reserved horizontal space. Existing timestamp placements remain supported. Row styles are restored when checks stop, and outlook.cloud.microsoft now shares the existing mail-host allowlist. No permissions or message-data storage are added.

Version 0.3.17 fixes email tooltip clipping. Hover/focus text uses the browser top layer, is positioned within the viewport and remains readable outside clipped inbox rows. It can be hovered and dismissed with Escape, hides when analysis opens or the page scrolls, and is removed with its control. Only one email hint is shown at a time. Without Popover support, the accessible button label and click report remain available.

Version 0.3.16 fixes Gmail hover actions covering the inbox monkey. Gmail indicators now occupy a separate 34px trailing cell after the received-time area. A row-scoped rule reserves that space beside Gmail’s hover toolbar; the time can hide without hiding the monkey. Row height and native Archive/Delete/Unread/Snooze actions are preserved. The added cell, row marker and stylesheet are removed when checks stop. Outlook keeps its existing compact time placement.

Version 0.3.15 places the inbox monkey after the received time. Its visible mark is smaller (15 by 20 CSS pixels), with a 24 by 24 keyboard-accessible target. The target is positioned inside a zero-height inline slot so it cannot enlarge the time line. Timestamp wrapping is temporarily prevented and the original style is restored on removal. Unknown timestamp layouts are left untouched. Opened-email buttons and analysis are unchanged.

Version 0.3.14 adds local inbox-preview monkey buttons to supported Gmail and Outlook rows. Red indicates a high-risk secret request; yellow indicates another suspicious request; grey means preview-only information, never safe. Click the monkey for reasons without opening or selecting the email. Only rendered row text is assessed, capped at 100 supported rows; hidden bodies, actual link destinations, attachments and sender authentication are not checked in the inbox. English and Swedish request patterns are supported. Opened-email analysis and its colours remain separate. No new permission, mailbox API, network service or stored message data is added.

Version 0.3.13 replaces the wide bottom-of-email notice with a 44px monkey button before each supported opened message body. Click to open a compact report with explanations, Dismiss/Show warning and incorrect-warning reporting. Green means no matching warning patterns in a complete local check; yellow means concerns, link notes or partial coverage; red means a private-code/password/recovery-phrase request. These colours are pattern indicators, not safety or malware verdicts. Dismissal does not change the colour. Escape, outside click and Close dismiss the report. No permissions, network service or persistent data types changed.

Version 0.3.11 improves experimental Gmail/Outlook opened-email checks. Each supported message has its own status and expandable reasons, Dismiss for this message / Show warning, and Report incorrect warning. Feedback is previewed and exported locally; nothing is sent automatically. Dismissal does not disable link checks or trust a sender. Inline formatting, recognised Outlook reply boundaries, conversation separation and recycled message elements have additional coverage. No mailbox API, attachment scanner, cloud upload or new permission was added.

Prepared 28 October 2026. Status: release candidate prepared for owner testing; not submitted to or approved by the Chrome Web Store. Do not announce general availability.

## Engineering scope

Version 0.3.10 adds explained AI-disclosure and possible-spam flags on supported YouTube/TikTok posts. Spam checks are local and on by default; suspicious posts stay visible unless Hide suspicious posts automatically is enabled. The existing AI-disclosure filter remains a separate preference. Native expandable notices offer Hide this post and Dismiss flag, alongside the monkey creator button. Post hiding has its own Undo and does not change creator rules. No AI-origin classifier, cloud service, malware scan or extra permission was added.

Version 0.3.9 uses the approved monkey icon to block creators on regular YouTube cards, watch players and supported active Shorts. A persistent Undo notification restores the previous creator preference, including an earlier Allow rule, without overwriting a newer edit. Undo remains available after scrolling or auto-skipping; it does not restart playback or navigate back. Creator identity is checked again when clicked; ambiguous or missing owner metadata produces no block control. No permissions or network services were added.

Version 0.3.8 makes the corner report site pause reversible with Start on this site. Hide this button stores a global display preference; Show page button in the toolbar popup restores the logo. Checks and native link warnings continue while the logo is hidden. Exact site pauses are updated atomically without discarding other exclusions; an inherited private-site exclusion remains in settings.

Atkinson Hyperlegible Next is the selected UI family for popup, settings, demo, feed controls, reports and message/link warnings. Its Latin variable WOFF2 and OFL licence are bundled. Injected controls load the packaged binary through FontFace under an extension-specific family name. There are no extra permissions, web-accessible resources or remote font requests.

Version 0.3.7 removes the question mark and centers the approved Thinker logo in a compact page button. Its report action, accessible status and theme support remain.

Version 0.3.6 uses a compact vector Thinker-and-question-mark page button. Status is available via its accessible name and hover description; the report remains unchanged. The control keeps the approved hair geometry and is right-aligned below the report.

Version 0.3.5 replaces the custom link-warning overlay with a native modal dialog, preserves page-report controls during scan updates, and excludes extension-owned shadow links from interception. No permissions or detection claims were expanded.

Version 0.3.4 adds persistent Light/Dark/System appearance across the popup, settings, demo, feed controls, page reports and email/link warnings. Only KeepItReel surfaces are themed. The compact logo now keeps the main Thinker’s hair tufts.

Version 0.3.3 includes the finished Thinker SVG logo, with browser icons rendered from its compact vector variant. Decorative slogans, oversized display headings and the overview illustration are removed. The separate logo kit includes horizontal, stacked, emblem and wordmark files in pine, white and black, with transparent PNG exports. The broader Pine UI concept remains separate.

The beta is free and account-free. LinkedIn integration code is removed from the distributed scanner; the domain and its subdomains are excluded. Old integration flags are discarded during settings migration. Cloud authentication and analysis are excluded from the bundle. All executable code is packaged locally.

Testers can preview and export a feedback JSON containing coarse browser/OS information, feature/permission flags, known warning codes and an optional note. It does not automatically copy URLs, page/email text, account identifiers, history or source lists. Nothing is sent automatically.

## What the owner needs to do

1. Register a Chrome Web Store developer account you control. Google requires a one-time fee; confirm the amount in the dashboard. Complete its account security and verification requirements. Do not share passwords or recovery codes.
2. Choose a public publisher identity, support email and public website/privacy-policy URL. Complete PRIVACY.md and adopt or revise its support retention proposal before publishing. A static public page is sufficient; no application server is needed.
3. Run the human acceptance checks in BETA-TESTING.md, especially real Chrome permission grant/denial/revocation and signed-in webmail if offered. Record browser, OS, date and result against the packaged artifact.
4. Add 5–10 invited testers directly in the dashboard using Google Account addresses or a Google Group you control. Keep the tester list out of this repository and public documents.
5. Upload keepitreel-extension.zip. Use STORE-SUBMISSION.md and the screenshots in the sibling private-beta folder. Choose Private visibility and submit after checks and publisher fields are complete.
6. After approval, invite the pilot. Expand to 20–30 testers only after installation, permission and page-breakage issues are resolved. Do not enable billing during the pilot.

Registration: https://developer.chrome.com/docs/webstore/register
Private visibility: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution

## Release gates

| Gate | Current status |
| --- | --- |
| Automated type/unit/browser fixture checks | Executed results in VALIDATION.md |
| Manifest, excluded integration and cloud checks | Automated release verifier |
| Real Chrome permissions and toolbar workflow | Partial: owner confirmed 0.3.5 page report, link cancel/continue and in-app revoke/refresh. Other checks pending; see acceptance results. |
| Signed-in Gmail and Outlook layouts | Pending; clearly experimental |
| Real TikTok disclosed posts and Google results | Expanded live coverage pending |
| macOS Chrome / slower-device performance | Pending |
| Public privacy URL, support contact and publisher identity | Owner input pending |
| Chrome account and store approval | Not done |

## Operating the pilot

Assign one owner to triage reports. Prioritise broken page controls, private-content handling and unintended navigation. Request a fictional reproduction and optional feedback export, not private mailbox exports.

If an update breaks pages, tell testers to pause KeepItReel, then disable the extension if needed. Pause invitations, reproduce and ship a corrected higher version after checks. Store updates need review and cannot be assumed instantaneous. There is no remote kill switch. For unpacked installations, replace the extracted folder, reload the extension and refresh tabs. Do not promise a store downgrade.

Refresh previously open tabs after upgrading from 0.2 so old injected scripts disappear. Source and extension backups were preserved before this sprint.

