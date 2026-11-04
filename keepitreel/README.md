# KeepItReel 0.4.0 — release candidate

A desktop Chrome extension for reviewing disclosed AI content, suspicious links and email patterns, and choosing what appears in your feed. Checks run locally. It cannot reliably determine arbitrary AI authorship or certify content as human-made or safe.

The last owner-confirmed public version is 0.3.21. Building or packaging this candidate does not update the Chrome Web Store.

## New in this candidate

- **Topic filters:** literal words or phrases in supported YouTube titles/Shorts and TikTok captions, with an explanation, Show once and Undo.
- **Timed rules:** keep a creator/source or topic blocked until removed, for 24 hours, 7 days or 30 days. Expired rules stop applying automatically and remain listed until removed.
- **Getting started:** choose feed integrations, optionally grant website/email access, and try a fictional filter without saving a real rule.

Use Topic filters for phrases and Your lists for creator/source rules. YouTube's monkey panel also offers a duration before Block creator. TikTok's direct block remains permanent; choose a timed TikTok rule in Your lists. Topic matches are personal preferences, not AI/spam verdicts.

## Existing features

- YouTube and TikTok: supported platform disclosures, explained local spam flags, creator block/allow rules and reversible cover/collapse/label controls. Automatic spam hiding is optional.
- Google search: source-domain rules on supported domains.
- Optional website checks: explicit English AI self-disclosures and visible-link patterns with reasons and exclusions.
- Optional experimental Gmail/Outlook checks: visible inbox previews, supported opened messages and English/Swedish suspicious-request patterns. No mailbox API, hidden-message fetch or attachment scanning.
- Toolbar warning summaries, optional page monkeys, local text/link checker, filtering history and voluntary feedback exports.
- Pine light/dark themes and locally packaged Atkinson typography. No login, subscription, advertising, automatic telemetry or connected cloud service.

LinkedIn and native phone apps are outside this release.

## Develop and verify

Use Node 24+ and the pnpm version pinned in package.json:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm release:check
```

Load `.output/chrome-mv3` using Load unpacked in Chrome. Use a separate profile for candidate testing. Run `pnpm dev` for development.

After the full checks pass, run `powershell -ExecutionPolicy Bypass -File scripts/package-release.ps1`. Versioned packages are written to `.output/releases/` with a root manifest and SHA-256 checksum. The older package-beta script is retained for historical workflows; use package-release for this candidate.

## Documentation

- [Development guide](docs/DEVELOPMENT.md): code map, rule precedence, expiry, migration, permissions, coding standards and manual acceptance.
- [Release history](docs/CHANGELOG.md): feature changes and earlier implementation notes.
- [Privacy inventory](docs/PRIVACY.md): candidate data handling and publication requirements.
- [Public release record](docs/PUBLIC-RELEASE.md): candidate checklist and historical submission instructions.
- [Flag behaviour](docs/FLAGGED-POSTS.md), [protection checks](docs/PROTECTION.md) and [brand assets](docs/BRAND.md).

Some older documents describe earlier beta or unused cloud experiments. They are historical context; this README and DEVELOPMENT.md describe the current local-only build. The package audit rejects accidentally bundled cloud clients and retired integrations.
