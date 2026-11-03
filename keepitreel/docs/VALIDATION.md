# Release validation — 0.3.21

Date: 29 October 2026. Environment: Windows, Node 24, pnpm 11, Chromium automated browser tests.

## Changes

- Public name KeepItReel; private-beta wording replaced by free early-development wording.
- Public feedback email and privacy-policy link available in settings. Reports remain preview/download-only; no automatic sending.
- Version increased from 0.3.20 to 0.3.21. Internal storage namespaces and the existing #beta feedback route are preserved for compatibility.
- No new permissions, detection logic, cloud service, email API or payment integration.
- Public listing, review instructions, privacy declarations and current screenshots prepared.

## Passed

- Both TypeScript projects.
- 111 unit/database/gateway tests across 12 test files. Legacy backend tests passing does not mean a backend is shipped.
- Production MV3 build and release verifier: 25 files, packaged fonts/licence, no retired cloud client or LinkedIn integration, no remote executable code, no source/test/secret files in the extension.
- All 59 browser cases in one full run. Includes creator controls/Undo, Shorts and regular-video fixtures, inbox/opened-message checks, permission revocation, partial coverage, false-positive safeguards, tooltip/popover bounds, exported feedback boundaries and toolbar-only behaviour.
- 40 website checks: responsive widths, light/dark persistence, interactive examples, feedback preview/copy behaviour, external support destination, no-JavaScript fallback, no page errors and no automatic external requests.
- Production dependency audit reported 0 known vulnerabilities in all severity categories at preparation time. This is an advisory database check, not a security certification.
- Fresh 1280×800 store screenshots captured from the compiled extension. Fictional fixture pages are labelled and contain no private mailbox information. Screenshot fixtures use disposable copies with pre-granted access; the shipping manifest keeps optional access unchanged.

Logs are in work/public-release-check.log, work/public-site-qa.log, work/public-store-capture.log and work/public-dependency-audit.json. A copy of the release evidence is included in evidence/.

## Manual evidence and limits

The owner previously reported that Gmail/Outlook test messages and hidden-monkey toolbar checks worked. YouTube toolbar testing was reported provisionally. This release's full automated browser run uses controlled fixtures; it is not exhaustive live-layout testing, macOS testing or a measurement of scam/AI-detection accuracy.

The public privacy URL returned HTTP 200 when checked, but the deployed page was still the prior publication draft. The final adopted website package must be uploaded and checked by the owner before submission. No Google developer account, trader verification, dashboard upload, review, approval or public install has been performed in this sprint.

## Residual product limits

Pattern checks can miss threats or flag legitimate material. They cannot certify human authorship or safety, scan malware/attachments, verify email authentication, read full unopened mail, inspect video/audio, or operate in native mobile apps. Unsupported platform layouts fail open. Broad optional website access and the cross-platform single-purpose explanation may receive additional reviewer scrutiny; no approval date is promised.

## Policy finalization

On 29 October 2026 the owner explicitly confirmed the publisher name and 90-day support-retention period. The policy is adopted, configuration is complete, and publication-draft language is removed from the generated policy. The final Cloudflare archive still requires owner upload; no deployment or Google submission is implied by adoption.

The adopted-policy website was rebuilt and passed all 40 website checks again. The final 15-file Cloudflare ZIP was checked for root index/privacy pages, adopted identity, date, 90-day retention wording, absence of draft placeholders and exact asset contents. See evidence/final-policy-site-qa.log and evidence/final-website-package.json. The extension bytes are unchanged from the fully tested 0.3.21 build.

Publisher clarification: the owner states KeepItReel is a personal hobby project separate from BroogDesign. Current policy copies and website configuration now identify Oscar Sommerfors as an individual. Support retention remains 90 days. Only documentation/configuration changed; the extension bytes and permissions remain unchanged. The rebuilt website passed the publication checks and ZIP content audit.
