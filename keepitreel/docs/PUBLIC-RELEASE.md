# Release status

## 0.4.0 candidate — 4 November 2026

The candidate adds topic filters, timed rules and guided setup. It is not submitted or published. The owner confirmed 0.3.21 was published on 30 October 2026; its existing listing is https://chromewebstore.google.com/detail/bhecamledlmaagepcijeipoldlijiioi.

Before updating that listing:

1. Run the full release check and the manual acceptance steps in DEVELOPMENT.md, especially current YouTube/Shorts/TikTok layouts and email regressions.
2. Publish the new local-storage/topic-filter disclosures from PRIVACY.md to the website's privacy page. Keep the confirmed publisher identity and support retention unchanged. The website source remains on 0.3.21 until this coordinated update.
3. Package with scripts/package-release.ps1. Upload the versioned extension ZIP to the existing store item. Do not upload a website ZIP or create a second listing.
4. Update listing/reviewer instructions for Topic filters, Your lists durations and Getting started. There are no new permissions or cloud services.
5. Submit after reviewing the candidate. Only describe it as live after Chrome approval/publication. Test a same-ID update preserves preferences and new expiry dates.

## Historical 0.3.21 submission instructions

The following preparation record predates approval. Its statements that the item is not yet published and that links are unconnected are historical, not the current public status.

# Submit KeepItReel 0.3.21 to Chrome

Prepared 29 October 2026. This is a free public early-development release. It has not been submitted, reviewed or approved by Google.

## Before you submit

1. The owner adopted the policy on 29 October 2026: Oscar Sommerfors, Sweden; identifiable support correspondence is deleted within 90 days of issue resolution. Required tax records have a separate retention rule. The final text is in PRIVACY-POLICY.md.
2. Download keepitreel-cloudflare-release.zip. In Cloudflare, open Workers & Pages → the existing keepitreel project → Create a new deployment. Choose Production, upload the website ZIP and deploy. Its archive has index.html at the root. Do not create a second project or upload the extension ZIP to Cloudflare.
3. Open https://keepitreel.pages.dev/privacy.html in a signed-out/incognito window. It must show the confirmed publisher, contact, effective date and version 0.3.21, with no “Publication draft” notice or placeholders. The live page was still the old draft when this package was prepared. Publishing the final privacy policy is required before store submission; the Chrome install link can be connected after approval.
4. Confirm https://keepitreel.pages.dev/#feedback exposes the contact route and the Buy Me a Coffee link goes to https://buymeacoffee.com/keepitreel. Do not enter a made-up Chrome store URL.

## Create the developer account

1. Open https://chrome.google.com/webstore/devconsole and sign in with the Google account you intend to keep as the publisher. You previously said you did not have a developer account; skip registration only if you have since completed it.
2. Accept Google's developer agreement and pay the one-time registration fee shown by Google. Payment and agreement acceptance must be completed by you.
3. Enable Google 2-Step Verification. Verify the developer contact email when prompted. Use an account/email you monitor for review and policy notices.
4. Complete the Trader / Non-Trader declaration accurately. Oscar has clarified that KeepItReel is a personal hobby project separate from BroogDesign and his enskilda firma. If operated outside trade, business, craft or professional purposes as described, Non-Trader matches Google's definition. The publisher makes this declaration; reassess if the project becomes a business/professional activity. This declaration does not determine the tax treatment of contributions. Complete any requested account verification directly in Google's dashboard.

## Upload and fill in the listing

1. Choose New item / Add new item. Upload keepitreel-0.3.21-chrome.zip from this folder. The manifest must show KeepItReel, version 0.3.21, Manifest V3.
2. Store listing: paste the text from STORE-LISTING.md. Use English, a relevant productivity category, the website/support URLs and free availability.
3. Add assets/store-icon.png. Add the five numbered store screenshots in order. They are 1280×800 PNGs from the running extension; demo content is explicitly fictional. Optional promo images are included at 440×280 and 1400×560. Do not upload dark-theme-reference.png as a sixth store screenshot.
4. Privacy practices: use PRIVACY-FORM.md for the single purpose, each permission, data categories, no-remote-code answer and limited-use certification. Read the exact dashboard statements before certifying them. Local processing must be disclosed; do not say “no data” just because nothing is uploaded.
5. Privacy-policy URL: https://keepitreel.pages.dev/privacy.html
6. Test instructions: paste REVIEWER-NOTES.md. There is no KeepItReel login; the built-in demo and text checker work without credentials. Reviewers can use their own accounts for Gmail/Outlook/platform checks.
7. Distribution: Public, Free, and the countries you intend to serve. This is not a trusted-testers release.
8. Save all sections. Address any dashboard validation messages. Review the item preview, then choose Submit for review. You can choose automatic publication after approval or deferred publication if you want to coordinate the website update. Review duration is controlled by Google; submission does not mean it is live.

## After approval

1. Send the actual Chrome Web Store listing URL so the website install buttons can be connected and a final Cloudflare ZIP prepared.
2. Install from the public store in a clean Chrome profile and check the popup, website permission grant, a fictional email and one YouTube card/Short. Google assigns a store extension ID; it may differ from your unpacked install, with separate storage. Avoid running two copies on the same pages. Export preferences from the old copy first if you want to transfer them.
3. Keep the source, checksums and this package. Make future submissions to the same store item with a higher version number; do not create another listing for each update.
4. Monitor the public support inbox and Chrome review emails. Follow the adopted retention policy when issues close. The free release needs no Stripe API key, billing server, mailbox API credentials or cloud AI key.

## What to send back

- Confirmation that the final Cloudflare policy is published.
- Any dashboard validation/review message you need help with, with personal/payment information removed.
- The approved store listing URL when available.

## Evidence

See VALIDATION.md for the automated tests, package audit and limits of the verification. These are readiness checks, not a guarantee of approval or detection accuracy.

Official references:
- https://developer.chrome.com/docs/webstore/register/
- https://developer.chrome.com/docs/webstore/program-policies/two-step-verification
- https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq
- https://developer.chrome.com/docs/webstore/publish

## Website link timing

The privacy page must be public before submitting the extension for review. This ZIP deliberately leaves chromeStoreUrl empty and displays an honest coming-to-Chrome message. After Google creates the item, its ID can be available before approval, but a public install link should only be advertised once the listing is live. After approval, update the one chromeStoreUrl configuration value and upload a second website ZIP to the same Cloudflare project; the domain and privacy URL stay the same. This website-only update does not require a new extension submission.
