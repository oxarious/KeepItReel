# Validation report — 27 October 2026

## Version 0.2 additions

- Release checks: TypeScript and production build passed; 51 unit/database/gateway checks and 17 Chromium integration checks passed. Production dependency audit reported no known vulnerabilities.
- Added unit coverage for public-suffix-aware URL comparison, redirect wrappers, deceptive addresses, non-malicious international/short/IP notices, filename false positives, English message rules, scoped self-disclosures, state migration, private-content exclusions, supported webmail roots, accessible LinkedIn invitation dialogs, repeated notes and scan limits.
- Added eight Chromium integration tests for opt-in registration, existing-tab injection, dynamic page updates, site exclusions, link review/cancel/continue controls, secret URL redaction, private scope isolation, Gmail/Outlook fixtures, LinkedIn invitation fixtures, master pause, ephemeral data and responsive UI.
- Headless Chromium cannot accept its native optional-host-permission prompt through Playwright. The new integration suite uses an isolated copy of the compiled extension with pre-granted host permissions; executable code is unchanged. Production optional permissions and disabled defaults are separately asserted. Native prompt acceptance/rejection and real permission revocation remain manual release checks.
- No private user accounts were opened. Signed-in live Gmail, Outlook and LinkedIn markup is not certified by these fixtures. Platform experiments, localisation and redesigns can produce the explicit unsupported-layout state.
- The original optional cloud UI test was verified in the previous build; this release's changes do not add mailbox cloud integrations.
- Live general-web smoke checks: the page report opened on `example.com` (1 inspected link) and the public `github.com/remusao/tldts` repository (73 inspected links). Both reported origin unknown and no matching risk patterns after filename false positives were corrected. These used an isolated profile with pre-granted host access, not the user's browser. They do not measure AI/scam detection accuracy.

## Automated checks

Final suite: 29 unit/database/gateway tests, 9 local-build Chromium tests, and 1 cloud-configured Chromium test (39 total). All passed. The cloud test uses controlled responses, not a live detector account.

- Production WXT/Manifest V3 build.
- Strict TypeScript checks for the extension and the Edge Function source (local Deno host type shim).
- Unit tests for decision policy, disclosure scopes, creator/domain normalization, TTL expiry, current YouTube badge markup, current TikTok player IDs, Google result extraction, and cloud input/output boundaries.
- Database tests execute the migration in PGlite/PostgreSQL, including overlapping reservations, global/user quotas, idempotent refunds, and authenticated-role access denial.
- Gateway tests mock external authentication/provider services and cover authentication, origin rejection, validation, private submission, uncertain timeouts, duplicate requests, unavailable models, and exhausted allowances.
- Chromium tests load the actual compiled extension in isolated profiles. Fixture-based checks cover dynamic/recycled cards, reveal and allow rules, actual playing canvas-video pausing, optional skip, master switch, Google domain exceptions, cache clearing, privacy controls, the local demo, selected-text extraction, responsive layout, screenshots, and absence of UI background uploads.
- A separately configured browser test checks the email-code and text-analysis flow with controlled API responses. It is not a live paid detector call.
- Production dependency audit reported no known vulnerabilities at the time of the build.

## Live-site observations

These observations are narrower than a complete cross-account platform certification:

- **YouTube:** creator controls appeared in current desktop search results. A live watch page exposed the badge `AI: Content was made with AI`; Clearfeed detected it and covered the player. This prompted adding the current badge component rather than relying solely on older disclosure components.
- **TikTok Explore:** the extension attached creator controls to 19 cards in one observed layout. The new Explore markup was added to the adapter.
- **TikTok For You:** the extension found post IDs in `xgwrapper` player IDs when video links were absent. Creator controls appeared once profile links arrived. Labelled feed behavior is covered by representative fixtures; an actual labelled TikTok post was not independently confirmed in this session.
- **TikTok detail:** a public video-detail page using the current feed renderer received an extension control. The site emitted one unrelated `a.init is not a function` error in an early observation.
- **Google:** live search returned a bot-check page. The adapter is tested against representative result markup; live search coverage remains unconfirmed on this network.
- **Shorts/Following:** behavior is tested against supported renderer/navigation fixtures; a signed-in Following feed and all live Shorts variations were not verified.

Cookie/consent overlays and sign-in state affect what site content is available. The extension does not bypass these gates. Tests use fresh profiles and do not change the user's browser settings.

## Not measured

No universal AI-detection accuracy, video-frame classification, synthetic-voice classification, battery benchmark, multi-hour browsing endurance, paid-user retention, or full language/region coverage is claimed. Real Supabase deployment and provider calls require operator accounts. Browser store review and publication have not been performed.
