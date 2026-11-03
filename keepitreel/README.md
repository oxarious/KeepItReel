# KeepItReel 0.3.20 — private Chrome beta

Version 0.3.20 adds per-tab toolbar warning badges and a Show monkeys on websites switch. Turning the switch off hides the page, inbox, opened-email and feed launchers; enabled scans, automatic filters, Undo notices and click-time link warnings remain active. The toolbar number counts distinct warning types, not videos, emails or blocked ads. Its popup explains the categories. Red is reserved for secret/prize-payment request categories; other matched categories use amber. No badge is not a safety verdict.

Version 0.3.19 replaces the separate YouTube creator and hide controls with one coloured monkey on supported cards, watch players and active Shorts. It opens local analysis, observed reasons, Hide video and Block creator (when identity is available). Existing Undo and filtering preferences remain. Green means no matching patterns in checked text, yellow means a disclosure, possible concern or limited check, and red means a concrete secret or prize-payment request. No colour certifies safety, creator reputation or AI authorship. Dismissed findings remain available in analysis.

Version 0.3.18 adds an Outlook inbox corner fallback when a recognised message row has no semantic timestamp. A small 24px target sits at the lower trailing corner, below the time in the tested layout, with reserved horizontal space. Existing timestamp placements remain supported. Row styles are restored when checks stop, and outlook.cloud.microsoft now shares the existing mail-host allowlist. No permissions or message-data storage are added.

Version 0.3.17 fixes email tooltip clipping. Hover/focus text uses the browser top layer, is positioned within the viewport and remains readable outside clipped inbox rows. It can be hovered and dismissed with Escape, hides when analysis opens or the page scrolls, and is removed with its control. Only one email hint is shown at a time. Without Popover support, the accessible button label and click report remain available.

Version 0.3.16 fixes Gmail hover actions covering the inbox monkey. Gmail indicators now occupy a separate 34px trailing cell after the received-time area. A row-scoped rule reserves that space beside Gmail’s hover toolbar; the time can hide without hiding the monkey. Row height and native Archive/Delete/Unread/Snooze actions are preserved. The added cell, row marker and stylesheet are removed when checks stop. Outlook keeps its existing compact time placement.

Version 0.3.15 places the inbox monkey after the received time. Its visible mark is smaller (15 by 20 CSS pixels), with a 24 by 24 keyboard-accessible target. The target is positioned inside a zero-height inline slot so it cannot enlarge the time line. Timestamp wrapping is temporarily prevented and the original style is restored on removal. Unknown timestamp layouts are left untouched. Opened-email buttons and analysis are unchanged.

Version 0.3.14 adds local inbox-preview monkey buttons to supported Gmail and Outlook rows. Red indicates a high-risk secret request; yellow indicates another suspicious request; grey means preview-only information, never safe. Click the monkey for reasons without opening or selecting the email. Only rendered row text is assessed, capped at 100 supported rows; hidden bodies, actual link destinations, attachments and sender authentication are not checked in the inbox. English and Swedish request patterns are supported. Opened-email analysis and its colours remain separate. No new permission, mailbox API, network service or stored message data is added.

Version 0.3.13 replaces the wide bottom-of-email notice with a 44px monkey button before each supported opened message body. Click to open a compact report with explanations, Dismiss/Show warning and incorrect-warning reporting. Green means no matching warning patterns in a complete local check; yellow means concerns, link notes or partial coverage; red means a private-code/password/recovery-phrase request. These colours are pattern indicators, not safety or malware verdicts. Dismissal does not change the colour. Escape, outside click and Close dismiss the report. No permissions, network service or persistent data types changed.

Version 0.3.11 improves experimental Gmail/Outlook opened-email checks. Each supported message has its own status and expandable reasons, Dismiss for this message / Show warning, and Report incorrect warning. Feedback is previewed and exported locally; nothing is sent automatically. Dismissal does not disable link checks or trust a sender. Inline formatting, recognised Outlook reply boundaries, conversation separation and recycled message elements have additional coverage. No mailbox API, attachment scanner, cloud upload or new permission was added.

Version 0.3.10 adds explained AI-disclosure and possible-spam flags on supported YouTube/TikTok posts. Spam checks are local and on by default; suspicious posts stay visible unless Hide suspicious posts automatically is enabled. The existing AI-disclosure filter remains a separate preference. Native expandable notices offer Hide this post and Dismiss flag, alongside the monkey creator button. Post hiding has its own Undo and does not change creator rules. No AI-origin classifier, cloud service, malware scan or extra permission was added.

Version 0.3.9 uses the approved monkey icon to block creators on regular YouTube cards, watch players and supported active Shorts. A persistent Undo notification restores the previous creator preference, including an earlier Allow rule, without overwriting a newer edit. Undo remains available after scrolling or auto-skipping; it does not restart playback or navigate back. Creator identity is checked again when clicked; ambiguous or missing owner metadata produces no block control. No permissions or network services were added.

Version 0.3.8 adds Pause/Start on this site, a persistent Hide this button action and a Show page button switch in the toolbar popup. Hiding the corner logo does not turn off checks. Atkinson Hyperlegible Next is bundled locally across extension pages and injected controls.

Version 0.3.7 shows only the tufted Thinker logo in the corner button, with a smaller, centered 56 by 64 pixel control. Its accessible status and report action are preserved.

Version 0.3.6 replaces the text badge with the tufted Thinker logo and a question mark. The compact control keeps its accessible status label, keyboard behavior and light/dark appearance.

Version 0.3.5 uses native link-review dialogs and preserves page-report keyboard focus through live scan updates. See docs/MODERN-WEB-REVIEW.md for the focused guidance review.

Version 0.3.4 adds Light, Dark and System appearance options in the popup and
settings. The choice is stored locally and applies to extension pages and
KeepItReel-owned feed controls, reports and message/link warnings. System is
the default; an explicit choice overrides the OS. Visited sites are not themed.
The Thinker retains tufted hair in both the main and compact vector logos.

A free browser extension for reviewing disclosed AI content, choosing which sources appear in your feed, and inspecting suspicious links. It cannot reliably determine whether arbitrary content was made by AI or certify anything as human-made or safe.

## Included

- YouTube and TikTok desktop: supported platform disclosures, creator block/allow lists, reversible cover/collapse/label controls.
- Explained flags and optional spam hiding: English private-secret, prize-fee, guaranteed-return and repeated-promotion patterns in supported published titles/captions. See [flag behavior and limits](docs/FLAGGED-POSTS.md).
- Google search: domain rules on the supported Google domains in the manifest.
- Optional website checks: explicit English self-disclosures and visible-link patterns, with reasons and site exclusions.
- Optional experimental Gmail/Outlook checks: visible inbox previews, supported opened message bodies and concrete English/Swedish request patterns. No inbox API, attachments or background mailbox scan.
- Local text/link checker, temporary selected-text/article extraction, and voluntary feedback export with an exact preview.
- Free beta. No login, payment, telemetry or connected cloud service.

LinkedIn is excluded from registration, existing-tab injection and manual page extraction. Native phone apps are outside this release.

## Run and verify

Use Node 24 and pnpm 11. Run `pnpm install --frozen-lockfile`, then `pnpm exec playwright install chromium` and `pnpm release:check`. Load `.output/chrome-mv3` unpacked in chrome://extensions. For development, run `pnpm dev`.

After checks pass, Windows packaging uses `powershell -ExecutionPolicy Bypass -File scripts/package-beta.ps1`. It creates extension and source ZIPs in the parent outputs directory, verifies the beta manifest and excludes generated files and environment secrets.

Required permissions: storage, activeTab and scripting, plus fixed feed-site content scripts. HTTP/HTTPS website access is optional. Website and webmail checks require separate feature opt-ins. Chrome may show broad site-access wording for automatic website scans. Extension pages use a connect-src 'none' CSP; cloud code is excluded from the bundle.

## Release materials

- [Release status and owner checklist](docs/BETA-RELEASE.md)
- [Chrome listing, permissions and reviewer notes](docs/STORE-SUBMISSION.md)
- [Privacy policy draft](docs/PRIVACY.md)
- [Tester guide](docs/BETA-TESTING.md)
- [Free and future paid tiers](docs/PRICING.md)
- [Validation evidence](docs/VALIDATION.md)
- [Protection limitations](docs/PROTECTION.md)

Supabase, Pangram and old cloud UI files remain development reference material. They are not enabled, imported into the beta UI or provisioned for this release. CLOUD-SETUP.md is historical engineering documentation.


## Rename in 0.3.1

KeepItReel was previously called Clearfeed. This release changes the product name, visible labels and export/package filenames. The internal message namespaces, DOM hooks, local storage format and script registration ID remain stable for existing installs.

For an existing unpacked install, replace the files inside its CURRENT installation folder, reload it in chrome://extensions and refresh open tabs. Keeping that folder path preserves its extension identity and local settings; loading a different path can create a separate installation.

Earlier concept images preserve the former name. The visual redesign is still at concept stage.
