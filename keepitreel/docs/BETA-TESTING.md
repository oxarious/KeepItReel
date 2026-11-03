> Historical private-beta record. Superseded for the public 0.3.21 release by PUBLIC-RELEASE.md and STORE-SUBMISSION.md. Do not follow the old private-distribution instructions for this submission.

# Beta tester and acceptance guide

Desktop Chrome only. Free, with no account/card required. This cannot reliably detect all AI content or certify safety. LinkedIn and native mobile apps are excluded. English patterns and changing site layouts limit coverage.

## Installation

Owner test today: extract keepitreel-extension.zip to a stable folder. Open chrome://extensions, enable Developer mode, choose Load unpacked and select the folder containing manifest.json. Pin KeepItReel. Do not install the source ZIP. Reload after updates and refresh old tabs.

Invited store testers later: use the invited Google Account and the private store link supplied after approval. There is no store link yet. Remove an old unpacked copy first to avoid duplicate overlays.

For an existing unpacked install, update files in the same installed folder to retain the extension ID and settings. Loading a different folder creates a separate extension. Refresh tabs after reloading.

## Ten-minute introduction

1. Open Settings and the fictional demo. Try Show once, Filter again and Always allow.
2. Visit YouTube/TikTok desktop. Try a creator rule and undo it. An AI-related title alone should not cause an AI-origin verdict.
3. Use Check text locally → Try a fictional example → Check locally. Read the reasons, then Clear.
4. Optionally enable website scanning. Read the permission dialog. Visit a public article and open the badge. Ordinary content remains origin unknown, not human-certified.
5. Optionally test experimental Gmail/Outlook on a message you control. Unsupported layouts must show a coverage limitation. Use fictional content for bug reports.
6. Use Beta & feedback, preview and optionally export a report. Share with the person who invited you through your agreed contact channel. No automatic sending happens.

## New 0.3.12 YouTube Home thumbnail check

1. Reload the existing KeepItReel installation in chrome://extensions, confirm 0.3.14, then refresh YouTube Home. Keep Filtering active and YouTube enabled.
2. On an ordinary recognised video card, expect Hide this video beneath its metadata. Cards do not need an AI/spam flag or creator link to offer it. Select it, then Undo: only that video should be restored, without navigating or changing creator rules.
3. When the card exposes a supported creator profile link, the monkey should name that creator and block it. Undo should restore the previous rule. If YouTube supplies only a display name, per-video hiding still works but creator blocking is unavailable; no creator identity should be invented from a video link.
4. Scroll through newly loaded Home cards and navigate away/back. There should be one KeepItReel control group per card, without duplicates or stale actions against a replaced video.
5. Check active Shorts still show the existing monkey and Undo. Test one search result and one channel Videos-tab card if available. Controls must fit in light/dark appearance and remain keyboard reachable.

The owner's signed-in Home layout remains an acceptance check; a fresh logged-out Home page did not supply recommendations during automated live inspection. Current public channel grids and search results were used for live compatibility checks. Record H01-H04 in the acceptance CSV without sharing private feed history.

## Earlier 0.3.11 email reliability checks — Gmail and Outlook

Reload the existing unpacked installation in chrome://extensions, confirm 0.3.14, then refresh both webmail tabs. Enable Gmail & Outlook webmail (experimental) and Suspicious link checks in Web & message protection. Website scanning can stay off. Keep the extension's main switch on.

Use the fictional A/B samples in the sibling beta-acceptance/email-samples.txt file. Send them only to accounts you control, with different subjects, and repeat these checks in both providers:

1. Open A. Expect a red monkey above the body. Click it: Request for a private code or secret must explain the concern for that message only.
2. Choose Dismiss for this message. The email remains visible and Show warning restores the notice. Reload the mail tab: the temporary dismissal resets. Dismissal must not disable concerning-link click checks.
3. Switch to B, then the inbox, then A again. B should have no secret-request warning. It should show Opened message checked for a supported readable body, or an explicit unsupported/partial state if the layout cannot be checked. Unopened inbox rows are not scanned. Collapse/reopen messages in a conversation: notices must stay with their own bodies.
4. Put A's text in an unsent draft while B is open. Draft text must not cause a warning. Reply to A with ordinary text and collapse the original: recognised quoted text in the new reply must be excluded. An expanded original A may still have its own warning.
5. On A, click the monkey and then click Report incorrect warning to exercise the reporting flow. Confirm Opened webmail and A warning was wrong. Preview and optionally export the file. It must not automatically include the email body, sender, subject, message URL or account details. Nothing is sent; mark any note as a test.
6. Check light/dark, Tab/Enter/Space, 200% browser zoom and a small window. Turn email checks off: notices should disappear and not return after refresh. If any email has no notice, open the corner report to distinguish an unsupported layout or missing permission from a completed check.

Record M01–M08 in the acceptance CSV, along with provider (Gmail, Outlook personal or Outlook work), Chrome version and a non-sensitive note. Screenshots should use these fictional messages only. No mailbox credentials, recovery codes or private messages are needed. Native Chrome consent and signed-in provider layouts still require owner verification; automated fixtures cannot certify them.

## Earlier 0.3.10 flags and spam checks

1. Reload KeepItReel in chrome://extensions and refresh YouTube/TikTok tabs. In Filter settings, Check posts for spam patterns should be on and Hide suspicious posts automatically should be off. Existing AI-disclosure filter choices should be preserved.
2. In the fictional demo, select Try a spam example. Its Possible spam flag should keep the post visible. Expand the notice by keyboard and read the actual reason. The monkey must remain usable.
3. Choose Hide this post, then Undo. Only that post should be restored; creator lists must be unchanged. Playback must not restart automatically. Dismiss flag should remove the notice for this page, while leaving the monkey available. Reloading resets these temporary choices.
4. Turn on Hide suspicious posts automatically. The demo spam example should use the selected display mode. Label only keeps content visible. Turn the setting off and confirm normal visibility returns. An Always allow creator rule should override automatic hiding while allowing the explained notice to remain.
5. Turn off Filter platform AI disclosures. A supported disclosed item should show an AI disclosure notice without a cover. No notice should assert that an unlabelled post is human-made or AI-generated.
6. Check a supported Short and TikTok caption. Open the flag, hide only the post, move on, and Undo. The page must stay at the current post and retain creator rules. Missing or recycled owner metadata must not cause a stale action against another post.
7. Try light/dark appearance, keyboard navigation and enlarged text. Real signed-in layouts remain an owner acceptance task; controlled browser fixtures do not certify those layouts.

## Earlier 0.3.9 creator controls

1. Reload KeepItReel in chrome://extensions and refresh YouTube tabs. On a regular video card, focus/hover the monkey and check the creator name. Block it, then use Undo; any earlier Allow rule should return.
2. Open a watch page. Check that its player monkey targets the video owner rather than a commenter.
3. Open Shorts. The monkey should appear at the top right of the active player when its creator is available. Block a creator, move to the next Short and use the persistent Undo action. The old creator block should be removed without jumping back or starting playback.
4. With auto-skip enabled, block a Short and confirm Undo remains available after the next Short appears. Dismiss should close only the notification.
5. Scroll through several Shorts and navigate back. Confirm the control follows the current creator. If owner metadata is unavailable or ambiguous, no creator-block control is expected.
6. Check keyboard operation, light/dark mode and enlarged text. The monkey and Undo notification must fit without covering essential controls.

These cases have controlled automated coverage. Record the normal-Chrome results before inviting testers.

## Earlier 0.3.8 controls

On the local test page, open the logo report and choose Pause on this site. Check that it becomes Start on this site; refresh and start it again. Confirm findings return. Choose Hide this button, refresh and confirm the logo stays hidden. A concerning link should still open its review dialog. Restore the logo with Show page button in the toolbar popup. These tests have automated coverage but still need owner confirmation on the updated normal Chrome install.

Atkinson Hyperlegible Next now supplies interface text. Check popup fit, report readability, light/dark and enlarged text. Unsupported characters use native fallback fonts.

## Human acceptance checks

Record version, Chrome version, OS, date, result and a non-sensitive note. Fixtures do not replace these checks.

| Check | Expected | Result |
| --- | --- | --- |
| New normal-Chrome install | Welcome; no login/paywall; website/mail checks off | PENDING |
| Deny website permission | Explanation, switch off, no scanner | PENDING |
| Grant permission | New and already-open supported tabs work | PARTIAL: owner observed newly opened real Chrome tab on 0.3.5; already-open case pending |
| Revoke in app and Chrome settings | No ongoing scans; permission status updates | PARTIAL: owner passed in-app revoke and refresh on 0.3.5; Chrome-settings restriction pending |
| Link dialog cancellation and continuation | Escape/Go back cancel; Continue opens captured local destination | PASS: owner report, 0.3.5, 27 October 2026 |
| Toolbar selected text | Local checker gets selection, page unchanged | PENDING |
| Upgrade from 0.2 and refresh | Lists retained; LinkedIn feature absent | PENDING |
| Gmail open/collapse/change/compose | Opened bodies only; no draft/quote or stale notices | PENDING |
| Outlook personal and work accounts | Supported body or explicit coverage limit | PENDING |
| Real YouTube/TikTok disclosed items | Scoped, reversible controls; ordinary videos unaffected | PENDING |
| Google real results | Domain rules and allow exceptions work | PENDING |
| Keyboard, 200% zoom, small laptop | Usable controls and focus return | PENDING |
| Windows/macOS and busy pages for 10 min | No persistent high CPU, stutter or unbounded memory | PENDING |
| Uninstall and refresh | Extension controls gone | PENDING |

Pause immediately if a page breaks. Screenshots should contain fictional or redacted content.

## Pilot measures without telemetry

Manually tally installation success, permission completion/denial, weekly usefulness, false warnings, broken pages, whether the extension stays enabled and support time after consented tester conversations. Never request history exports. Start with 5–10 people.

Suggested expansion gates, not achieved results: everyone can install/pause; no unresolved privacy, navigation or page-breakage issue; warnings are explained and reversible; recurring false positives have fixes/exclusions; at least 7 of 10 testers would keep it enabled. These targets do not establish detection accuracy.


## Compact email indicator acceptance (0.3.13)

Use the existing A/B/C emails: A red, B green, C yellow. The monkey must be above the body, including a long email. Click it to read reasons; Escape/outside click/Close must close it. Dismiss and restore the warning without changing its risk colour. Check keyboard, narrow windows, light/dark and message switching. Partial or image-only messages and disabled link checking must not appear green. Repeat in Gmail and Outlook. Real-layout acceptance of this replacement UI is pending.

## Inbox preview acceptance (0.3.14)

Follow ../beta-acceptance/inbox-tests.txt in the outputs folder. Check supported Gmail/Outlook list rows, grey/yellow/red state meanings, click without opening/marking mail read, keyboard/Close/outside click, normal row navigation, recycled rows and disabling email checks. Actual destinations are checked only in opened messages, so the C link-mismatch sample can be grey in the inbox. Real list-layout acceptance is pending.


## YouTube single monkey acceptance (0.3.19)

1. Reload the existing unpacked extension and refresh YouTube Home. A supported visible card has one monkey, with no separate Hide video or Block creator button outside its panel. Missing creator links must not remove the monkey or Hide video action.
2. Click the monkey. Read Video analysis, the status, observed reasons and scope. Check green for ordinary checked text, yellow for an AI disclosure/possible spam/limited check, red for a fictional explicit secret or prize-payment request. Colours are pattern indicators, not a safety or AI-authorship verdict. Turn spam checks off: an otherwise unflagged card should show yellow Limited check.
3. Hide video, then Undo: only that video is affected. Block creator, then Undo: the previous creator preference returns. No action should navigate to the video accidentally. If an automatic cover is present, its Show once/Next video controls still work.
4. Repeat on an active Short and a watch player. Change videos with a panel open: it must close or update, and old actions must not target the replacement creator. A missing creator identity leaves Hide video available.
5. Test Tab/Enter, Escape, Close and outside click. Use light/dark and a narrow window. The panel and reasons must remain readable, with no duplicate monkeys after navigation. Disable filtering and confirm all feed controls are removed.


## Toolbar-only mode (0.3.20)

1. Reload KeepItReel and refresh your test tabs. Pin its toolbar icon using Chrome's Extensions menu if needed.
2. Open its popup and turn Show monkeys on websites off. Page, video, inbox and opened-message monkeys should disappear without disabling enabled checks. Automatic filter covers and Undo remain; suspicious link clicks still open their review dialog.
3. On a fictional disclosure/link test page, expect two warning types. Multiple matching links must not multiply the link category count. On a secret-request test email, expect a red 1. Click the toolbar icon, then View warnings for explanations. The switch restores all launchers without changing protection settings.
4. Switch between a flagged tab and an ordinary tab: each has its own count. Navigate to a clean page, close the flagged tab, or disable checks: old counts must clear. No badge is not a safety verdict.
5. Repeat on YouTube, Gmail and Outlook. Confirm native page interactions still work and no message content is added to feedback or toolbar storage. Badge/UI checks use local categories only.
