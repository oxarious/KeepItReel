# KeepItReel — Chrome Web Store listing

Release: 0.3.21 · Public · Free · Early development

## Name
KeepItReel

## Summary (also used in the manifest)
Review AI disclosures, suspicious links and email patterns. Control your feed with local checks and explained warnings.

## Description — paste into the dashboard

KeepItReel helps you review concerning content and control what stays in your feed. It shows the reasons behind its warnings and lets you decide what to hide.

ON SUPPORTED VIDEOS AND POSTS
• Read explanations for supported AI disclosure labels and local spam patterns.
• On YouTube videos and Shorts, use one monkey button to open the analysis, hide a video or block its creator.
• Undo a hide or creator block. Choose whether suspicious posts should be hidden automatically.
• Apply supported TikTok creator filters and Google search source rules.

ON WEBSITES AND EMAIL
• Opt into automatic website checks for explicit AI self-disclosures and concerning visible-link patterns.
• Separately enable experimental Gmail and Outlook webmail checks for visible inbox previews and supported opened messages.
• Review reasons such as requests for a private code, unusual payments or mismatched link labels. Dismiss a warning or prepare an incorrect-warning report.
• Use the local text checker for text you choose to paste or extract.

YOUR CHOICE OF DISPLAY
Keep the monkey controls on supported pages, or hide them and read the warning summary from Chrome’s toolbar. The badge counts distinct warning types on the current tab, not individual emails or videos. Light and dark themes are included.

LOCAL CHECKS, EXPLAINED LIMITS
Content checks run on your device. The extension has no content-analysis server, advertising, automatic telemetry or account requirement. Settings, rules, a disclosure cache and optional recent filtering history are stored locally. Recent filtering history is enabled initially and can be disabled or cleared in Privacy & data. Feedback stays local unless you choose to share it.

KeepItReel does not prove whether content is human-made or AI-generated. It does not inspect video frames, audio, attachments or malware. Email checks do not fetch full unopened messages or verify sender authentication. A green indicator means no matching warning pattern was found in that check; it is not a safety guarantee. Inbox previews have limited coverage. Platform changes can affect results.

This release is for desktop Chrome. LinkedIn and native mobile apps are not supported. General content checks use English patterns; supported email request checks include English and Swedish. The interface is English.

FREE AND IN EARLY DEVELOPMENT
All current features are free. Please send bug reports, incorrect-warning reports and feature requests to oscar.sommerfors@gmail.com. Remove private messages and personal details before sharing examples. Optional contributions through the website support development and do not unlock features.

Website: https://keepitreel.pages.dev/
Privacy: https://keepitreel.pages.dev/privacy.html

Independent software. Not affiliated with Google, Microsoft, YouTube or TikTok.

## Other dashboard fields

- Language: English.
- Category: Privacy & Security (as available in the current dashboard).
- Website: https://keepitreel.pages.dev/
- Support URL: https://keepitreel.pages.dev/#feedback
- Privacy policy: https://keepitreel.pages.dev/privacy.html
- Contact: oscar.sommerfors@gmail.com
- Distribution: Public; free. Select the regions you intend to serve.
- Assets: use the numbered PNG files in assets, plus store-icon.png. Promo files are optional if the dashboard marks them optional.
- Upload ONLY keepitreel-0.3.21-chrome.zip as the extension. The source ZIP, website ZIP and submission bundle are not extensions.
- Do not claim malware detection, guaranteed AI detection, a safe inbox, Chrome approval, or numbers of users/reviews you do not have.

The support anchor must match the live site's feedback section; see the release checklist for the final URL check.


---

# Chrome Web Store privacy practices — copy-ready explanations

## Single purpose

Help users review and control unwanted or concerning web content through local, explained checks and reversible filtering. Supported feed disclosures, spam/link/message patterns and source rules use the same local review-and-control workflow; users choose which optional website and webmail checks to enable.

## storage

Stores preferences, source rules, excluded sites, an optional bounded recent-filtering history, a bounded disclosure cache and an aggregate filtered count on the device. Chrome session storage holds temporary extraction text, Undo records, feedback categories and per-tab toolbar warning categories. Settings offer clearing/reset controls. This permission does not upload or synchronise data to a server.

## activeTab

Allows the user's explicit action in the extension popup to extract selected text or readable article text from the active page into the local text checker. It also supports user-requested current-tab actions. It is not used for background browsing surveillance.

## scripting

Injects the packaged local extractor after an explicit user action, and registers/injects the packaged website/webmail checker after the relevant optional feature and host access are granted. It does not download or execute remote code.

## Host access / optional HTTP and HTTPS origins

The optional http://*/* and https://*/* origins enable the advertised automatic disclosure and suspicious-link checks on ordinary websites the user visits. A fixed domain list cannot provide this arbitrary-website function. The feature starts off and requires an explicit opt-in and Chrome grant. Gmail/Outlook message checks additionally require their separate setting even if broad website access was already granted. Exclusions and revoke/pause controls are available; LinkedIn is excluded. Scripts inspect supported rendered content locally, not cookies, attachments, hidden mailbox bodies or network responses. HTTPS-only webmail host subsets are requested for the email-only opt-in.

Static content scripts match supported YouTube, TikTok and Google search pages for feed/source controls. These site matches should be explained wherever the dashboard asks about host access. No tabs, history, cookies, webRequest, downloads or notifications permission is requested.

## Remote code

Select: No, I am not using remote code.

All executable JavaScript, CSS, fonts, rules and libraries are packaged. The extension-page CSP prohibits remote script and network connections. External links open only through user navigation; they do not provide executable extension code. Legacy backend source is not in the uploaded extension ZIP.

## Data-type disclosure worksheet

Do NOT select “no user data” solely because checks are local. Google's User Data FAQ explicitly requires disclosure of local processing. Use the current dashboard's definitions and include the following local handling in the data declarations:

| Data type | Why it applies / limits |
|---|---|
| Website content | Readable page text, supported titles/captions, disclosure labels and link addresses; local checks and optional history. |
| Personal communications | Rendered Gmail/Outlook previews and supported opened messages when opted in. No full unopened-mail fetch or attachment scan. |
| Personally identifiable information | Available sender names/addresses for mismatch checks, creator identifiers and any personal information in visible content or voluntary feedback. No account registration. |
| Web history | Current-page addresses, optional recently filtered item URLs/titles and cached item identifiers; not a full browsing history or a server-side log. |
| User activity | Local filtering choices, source rules, dismiss/Undo state and aggregate filtered count. No keystroke, mouse-position or cross-site analytics collection. |
| Authentication information | Visible message/page text can incidentally include a code or credential. The checker identifies secret-request language; it does not access password fields, cookies, authentication tokens or log in to accounts. |
| Financial and payment information | Visible messages/pages can incidentally contain payment details while being checked for unusual payment requests. There is no extension billing/card collection. |
| Health information | Generic page/mail text may incidentally contain health information. There is no health-specific collection, classification or profile; content remains local. |

No device location API or IP geolocation is used by the extension. A place name incidentally present in content is not a location-tracking feature. Website hosting and optional external contributions are separately explained in the public policy. If the dashboard asks for a textual explanation, use the limits above rather than implying these categories are transmitted to the developer.

## Limited-use certifications

The prepared release does not sell or transfer user data to third parties for unrelated purposes, does not use it for advertising, does not use it for creditworthiness/lending, and does not use content to train AI models. It only processes content for its disclosed checks/controls. You, as publisher, must read and certify the dashboard's exact statements. Do not tick a statement you do not understand or cannot honour.

Privacy policy URL: https://keepitreel.pages.dev/privacy.html

## Official references checked for this release

- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/register/
- https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq

The local-data categories above are our conservative mapping of this build to Google's definitions, not a Google pre-approval. The dashboard may change its labels or ask additional questions.


---

# Reviewer instructions — KeepItReel 0.3.21

No KeepItReel login, licence key, subscription or external analysis service is needed. All checks use packaged code and local patterns. Google/Microsoft/platform accounts are needed only to test their own signed-in pages. Do not use the developer's personal mailbox; no credentials are supplied or required for KeepItReel.

## Fast test without a third-party account

1. Install the submitted package. Open its Options page from Chrome's extension menu.
2. In Overview, open the built-in demonstration. It contains fictional video cards and uses the real filtering UI. Try showing a covered item once, blocking a creator and Undo. The demonstration is clearly labelled; it is not a simulated detection service.
3. Open Check text locally. Click Try a fictional example, then Check locally. The result explains a request for a private code and a concerning address. No request goes to the example destination.
4. Replace the text with “Our meeting is Thursday at 10:00. Never share your verification code with anyone.” and clear the link input. Run the check again: it should not flag the protective advice as a request for a code.
5. Open Privacy & data to inspect/clear history and disclosures. Open Feedback to preview/export a report. No feedback is sent automatically.

## Optional website checks and permissions

1. Web & message protection → enable Automatic website scanning. Chrome requests optional HTTP/HTTPS host access to support user-selected ordinary websites. Website scanning starts only after the opt-in and access grant. Separately enable suspicious-link checks if off.
2. Visit a test HTML page containing “This article was generated using AI.” The page report should report a self-disclosure, not independently certify AI authorship.
3. A link labelled https://example.com whose href is https://example.org/ should be explained as a displayed/destination mismatch. Use an ordinary click to check the review dialog; Go back/Escape cancels it. Link inspection itself does not visit the destination.
4. Pause on this site / Start on this site should work. Revoke access in settings and reload to verify checks stop.

## Optional Gmail and Outlook checks

1. Enable Gmail & Outlook webmail separately. Supported hosts: mail.google.com, outlook.live.com, outlook.office.com, outlook.office365.com, outlook.cloud.microsoft. Open a reviewer-owned mailbox in desktop Chrome and refresh.
2. Send fictional test messages to your own account, using the same sentence as subject and first body line, followed by “Fictional KeepItReel test. No action needed.”
   A: “Please send your verification code to activate your account.”
   B: “Our meeting is Thursday at 10:00.”
   C: “Pay a processing fee to claim your prize.”
3. Visible previews with A/C should expose the matching request warning. A preview without matches remains limited/neutral; it is not a full-body safety check. Open A/C for stronger request explanations; open B for no matching warning patterns.
4. Click a monkey to read the explanation. Dismiss it, reopen the report where available, and prepare an incorrect-warning report. Export requires deliberate user action and does not send mail.
5. Hide monkeys using the extension popup's Show monkeys on websites setting. Warning types remain visible through the toolbar badge/popup when supported checks are enabled. A badge is a distinct-category count, not an email count.

## YouTube and Shorts

On a supported regular-video card or active Short, click the monkey: it opens local analysis with Hide video and Block creator when a creator identity is available. Undo reverses the action. A normal video can have no matched pattern; a supported altered/synthetic disclosure is a disclosure rather than a probabilistic model verdict. Default filtering covers supported AI-labelled items; suspicious-post hiding is a separate off-by-default setting.

## Architecture and scope

MV3 background worker, packaged content scripts, React options/popup, local Chrome storage and transient page/session state. No remotely hosted code, external AI APIs, account sync, content uploads, purchase flow or cloud configuration. LinkedIn is excluded. Page layouts that are not recognised may receive no checks. The bundled demo is local and fictional.

Website access and webmail are off initially. Feed controls, disclosure filtering, local spam patterns and bounded filtering history are on initially; users can disable them. Optional broad website host access supports the explicitly advertised arbitrary-website feature and is not required for the built-in demonstration or local text checker.

Support: oscar.sommerfors@gmail.com
Policy: https://keepitreel.pages.dev/privacy.html
