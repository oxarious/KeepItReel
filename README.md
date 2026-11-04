# KeepItReel

KeepItReel is a free desktop Chrome extension for reviewing AI disclosures, suspicious links and email patterns, and controlling what appears in your feed. Its checks run locally.

[Website](https://keepitreel.pages.dev/) · [Chrome Web Store](https://chromewebstore.google.com/detail/bhecamledlmaagepcijeipoldlijiioi) · [Privacy policy](https://keepitreel.pages.dev/privacy.html)

## Build the extension

From `keepitreel/`, use Node 24 or newer and the pnpm version specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Load `keepitreel/.output/chrome-mv3` as an unpacked extension in desktop Chrome. This branch builds the 0.4.0 release candidate. The last owner-confirmed public release is 0.3.21.

## Run the website

From `keepitreel-site/`, run `node scripts/build.mjs` and then `node scripts/serve.mjs`. Open `http://127.0.0.1:4178`. The site keeps its editable homepage, styles, browser scripts and static assets in `dist/` alongside generated pages.

## Development documentation

See [the extension guide](keepitreel/docs/DEVELOPMENT.md) for architecture, code standards, migration, privacy boundaries and manual tests. [Release notes](keepitreel/docs/CHANGELOG.md) distinguish the candidate from the published version.
