# Development guide

This guide describes the local-only extension in this repository. Version 0.4.0 is a release candidate; the last owner-confirmed public release is 0.3.21. Website deployment and Chrome publication are separate operations.

## Work locally

Use Node 24+ and the pnpm version pinned in `package.json`. From `keepitreel/`:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm release:check
```

`release:check` runs TypeScript checks, unit tests, a production build, the package audit and browser tests. Browser tests load the real built extension in an isolated Chromium profile against fictional routed pages; they do not read personal accounts. Linux hosts may need Playwright's system dependencies. `pnpm dev` starts development mode; `pnpm build` produces `.output/chrome-mv3` for Load unpacked in Chrome.

Do not run the published and unpacked copies on the same pages during manual testing. They have separate storage when their extension IDs differ. The settings export is for inspection/backup; there is currently no import UI. Updating the same installed extension preserves its local preferences.

## Code map

| Area | Responsibility |
| --- | --- |
| `lib/model.ts` | State, backward-compatible hydration, creator precedence and filtering decisions |
| `lib/filter-rules.ts` | Literal phrase matching, topic validation and absolute expiry rules; no browser APIs |
| `lib/store.ts`, `entrypoints/background.ts` | Typed actions, serialized state changes and browser storage |
| `lib/creator-undo.ts` | Bounded creator Undo snapshots and stale-action protection |
| `lib/adapters.ts` | Supported platform DOM extraction and stable item/creator identities |
| `lib/feed.ts` | Mounting/restoring feed controls, applying decisions, tab-local overrides and expiry scheduling |
| `lib/post-flags.ts`, `lib/protection-policy.ts` | Explained warning patterns; independent from personal topic preferences |
| `components/TopicFilters.tsx`, `SourceRules.tsx` | Rule management UI and settings export |
| `components/SetupGuide.tsx`, `Protection.tsx` | Guided setup and optional permission controls |
| `components/RuleDuration.tsx` | Shared duration select and expiry label refresh |
| `tests/unit`, `tests/e2e` | Pure policy/DOM tests and packaged-extension browser regressions |

Legacy `supabase/` code is not connected to the public extension. The bundle audit checks for accidental cloud clients and retired integrations. Do not enable it as part of an unrelated change.

## Topics and matching

Users save up to 100 topic rules, including expired entries. Each has a random UUID, a 1–100-character phrase, a platform (`youtube`, `tiktok` or `all`), and an optional numeric `expiresAt` timestamp in milliseconds.

Topics match supported YouTube **titles** (including active Shorts) and TikTok **captions**, falling back to the extracted TikTok title. Matching normalizes Unicode with NFKC, ignores case and repeated whitespace, and examines at most 4,000 input characters. Unicode letters, numbers and underscores define word boundaries. Punctuation is literal: `.*` is not a regular expression. There is no stemming, translation or semantic topic inference. Google results, email content and arbitrary website text are outside topic filtering.

Duplicate active phrases with the same platform are rejected after normalization. A platform-specific rule and an `all` rule may overlap; the first active match supplies the explanation. Removing that rule can expose a second matching rule. Topic Undo removes the exact UUID globally; Show once affects only that item in the current tab.

Personal filters do not add spam/AI findings, change warning colours or increment toolbar warning categories. Existing optional filtering history can record the filtered item and its reason, including the matched phrase.

## Decision order

1. The global and platform switches must be enabled.
2. The applicable active creator/source rule wins: block filters the item; allow bypasses automatic filtering while observed warning reasons remain available. For Google domains, the most specific domain wins.
3. The first active matching topic filters the item.
4. Enabled disclosure filtering and optional automatic spam hiding apply.
5. The feed applies tab-local Hide video / Show once choices and the display mode: Cover, Collapse or Label only. Label only leaves the item visible. Dismissing a warning does not cancel a creator or topic rule.

Auto-skip is off by default and remains a separate user preference. Removing or expiring a block does not undo other applicable rules, restore navigation already performed, or start playback automatically.

## Expiry and Undo

Duration choices are until removed, 24 hours, 7 days and 30 days. Expiries are absolute local-clock timestamps; `expiresAt <= now` is inactive. Validate new deadlines in the background worker as well as the UI. Missing deadlines preserve old permanent rules. Malformed topic entries are discarded during hydration; valid expired entries remain visible for removal.

An open feed schedules its next relevant state deadline and refreshes after visibility changes. This works when the extension worker sleeps. Browser suspension can delay execution; returning to the tab triggers reevaluation. No alarms permission or background polling is added. Changing the device clock can change expiry behaviour.

Saving a creator replaces its previous rule. Expiry deactivates the saved block; it does not resurrect an older allow/block choice. Creator Undo explicitly restores the previous snapshot and is rejected after another edit to the same creator. Snapshots must be copies, not references to mutable current state. The existing session Undo limit is 20.

YouTube's monkey panel exposes the duration before Block creator. TikTok's existing direct block action stays permanent; use Your lists to choose a timed TikTok block. Your lists also supports timed Google source blocks.

## Setup, state and privacy

Storage schema remains version 1 with additive `topicRules: []` and `setupCompleted: false` defaults. Old preferences and permanent rules survive hydration. Completion is saved only by Finish setup. Finish later leaves it incomplete; feed/permission choices already made remain saved. Existing users can open Getting started from the sidebar; updates do not force it open. New installs open `#welcome` through the existing installation hook.

The practice card uses component state and the same phrase matcher; it never writes a real rule. The separate full demo uses real local preferences, which its link explains. Website and email permissions are requested only by their explicit switches, directly within the user gesture. Do not request them when clicking Continue or Finish.

The new stored data consists of topic phrases, scope, IDs, expiry timestamps and setup completion. Settings exports include topic and source rules plus their deadlines; they do not export setup progress. There is no new network request, telemetry, permission, account or subscription. Reset removes the new fields together with existing preferences. Expired rules are ignored, not automatically deleted. Public privacy documentation must describe these additions before a 0.4.0 submission.

## Maintenance rules

- Keep policy functions pure and give public helpers explicit types. Validate data at the background boundary; TypeScript alone does not validate messages or stored data.
- Extract cohesive components instead of adding large inline branches to options. Follow the existing pine palette, Atkinson typography, light/dark themes and accessible controls.
- Explain personal preferences as preferences. Never turn keyword matches or absent warnings into claims about AI authorship or safety.
- Preserve original host styles, contain events, handle recycled DOM identities and clean up observers, timers and listeners.
- Keep state writes serialized. Avoid stale whole-state replacements from UI tabs.
- Test behaviour that can regress: migration, precedence, expiry, Undo, permissions and DOM cleanup. Use fictional fixtures; never commit real emails, credentials or browser profiles.
- Run the relevant checks after changes and the full release check before packaging. Report live-site testing separately from fixture coverage.

## Manual acceptance for 0.4.0

1. Load the candidate in an isolated Chrome profile. Finish setup with optional checks off. Try and undo the practice filter; confirm no topic was saved.
2. Add a phrase from a visible YouTube title in Topic filters. Confirm only whole-word/phrase matches are covered and the reason identifies your rule. Try Show once, reload, then Undo topic filter.
3. Repeat on a Short and a TikTok caption. Confirm an unrelated creator name or YouTube description does not trigger a title rule. Test an Always allow exception.
4. Choose 24 hours in a YouTube monkey panel and block a creator. Check the end time in Your lists, then Undo. Test a timed TikTok rule through Your lists.
5. Check Cover, Collapse and Label only, dark/light themes, keyboard access and a narrow window. Hide the monkeys and confirm personal rules still apply without becoming toolbar warnings.
6. Verify Gmail/Outlook warnings, website pause/resume and permission revocation still work. These integrations are unchanged but are part of release regression testing.

Automated short-deadline tests cover expiry without waiting a day. Real 24-hour timing and current live website layouts still need manual confirmation.

## Package and release

After `pnpm release:check` passes, run `powershell -ExecutionPolicy Bypass -File scripts/package-release.ps1`. It creates a versioned Chrome ZIP and SHA-256 file under `.output/releases/`, with `manifest.json` at the archive root. Source remains in Git. It does not submit, deploy or modify the installed extension.

Update the website privacy inventory from `docs/PRIVACY.md` and verify the live policy before submitting 0.4.0 to the **existing** Chrome store item. Review listing/reviewer notes to mention topics and setup. After approval, update website feature copy. Keep the previous release artifact for reference; a Chrome rollback requires a new, higher version.
