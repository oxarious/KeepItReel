# KeepItReel website

## Public launch — 30 October 2026

The owner confirmed the extension is public and supplied https://chromewebstore.google.com/detail/bhecamledlmaagepcijeipoldlijiioi. The website now connects every Add to Chrome button to that listing, including without JavaScript. Buy Me a Coffee remains connected in the header and support section. The approved privacy text and early-development disclosures are retained.

Upload `../keepitreel-cloudflare-live.zip` to the existing Cloudflare Pages project as the new production deployment. It contains 15 website files with index.html at its root. This archive has been prepared locally; it has not been deployed by the agent. The older preview/release ZIPs mentioned below are superseded for website uploads.

Validation: 50 browser checks passed, including mobile widths, themes, demos, feedback, page routes, live link destinations and no-JavaScript links. No page errors or automatic external requests were observed. See `qa/report.json` and `qa/live-website-package.json`. The listing URL was supplied by the owner; the automated web reader could not independently read the store page.

Independent static website for a public Chrome release in early development. No beta registration, accounts, payment code, analytics, database or external fonts. Existing local extension remains 0.3.20; building this site does not publish or modify the extension.

## Local preview

Node is the only runtime dependency. Run from this directory:

```
node scripts/build.mjs
node scripts/serve.mjs
```

Open http://127.0.0.1:4178. The build generates supporting pages from `scripts/build.mjs` and the reviewed data inventory in `content/extension-privacy.md`. Edit homepage, styles and interactions directly in `dist/index.html`, `dist/style.css` and `dist/app.js`; these are not overwritten by the build.

## Connections

Edit `site.config.json`, then rebuild. All config values become public: never add tokens or passwords.

- `supportEmail`: oscar.sommerfors@gmail.com, explicitly selected by the owner as the public feedback and privacy contact on 29 October 2026. The configured address enables an unsent mailto draft. No new Gmail account is needed.
- `chromeStoreUrl`: approved official Chrome Web Store listing. Empty means installation buttons explain pre-release status; no fake store link or unpacked download is offered.
- `buyMeACoffeeUrl`: the owner's real profile URL. Empty means the support button explains that payments are not connected. No embedded payment trackers are used.
- `publicOrigin`: the public Cloudflare HTTPS origin without trailing slash. A pages.dev domain can be used before buying a custom domain. Do not put the private Sites preview here.
- `publisherName`, `effectiveDate`, `supportService`, `supportRetentionDays`, `privacyApproved`: complete and adopt with the owner before public launch. Setting approval requires confirming Cloudflare as the public host. The draft data inventory includes a proposed 90-day retention period; no policy has been adopted on the owner's behalf.

The extension's data inventory is preserved in the website policy. Re-review it whenever extension behavior changes. The website adds its own hosting, theme preference, voluntary feedback and external-payment-link details. No telemetry is added to the extension.

## Cloudflare deployment

`../keepitreel-cloudflare-preview.zip` contains only website files. It is a preview package with unconnected contacts/payments and a draft policy, not an approved public launch. Do not upload source, tools, QA screenshots, `.openai`, or configuration credentials as website assets.

After owner details are supplied:

1. Run `node scripts/build.mjs`, then `node scripts/check-launch.mjs` and resolve every failure.
2. Upload the **contents of dist** to a Cloudflare Pages Direct Upload project, or use `wrangler deploy` from this directory with the supplied static-assets configuration after authenticating your own Cloudflare account. A dashboard-upload ZIP must have `index.html` at its root.
3. Check the hosted home, guide, privacy, feedback and 404 pages; verify headers, keyboard/mobile layouts and the support destination.
4. Use the public `/privacy.html` URL and verified support details for Chrome submission. The owner-private Sites URL is not suitable as the store privacy URL.
5. After Google approves the extension, set `chromeStoreUrl`, rebuild and upload the new site.

Cloudflare Pages documentation: https://developers.cloudflare.com/pages/get-started/direct-upload/
Workers static assets: https://developers.cloudflare.com/workers/static-assets/

The optional ChatGPT Sites preview is independently owner-private. Its identity is in `.openai/hosting.json`. Do not copy it into another project or the Cloudflare upload.

## Verification

`node scripts/qa.mjs` uses the existing sibling extension's installed Playwright (development-only). It checks demo actions, toolbar-only mode, email scenarios, copy feedback, dialog keyboard behavior, themes, page loading, responsive overflow from 320–1440px, no-JavaScript content and external-request absence. Evidence is in ignored `qa/`.

Brand SVG is the existing approved KeepItReel monkey. Atkinson font and its Open Font License are in `dist/assets`. No generated artwork, third-party platform screenshots or private emails are used. Browser visuals are explicitly fictional examples.
