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

Load `keepitreel/.output/chrome-mv3` as an unpacked extension in desktop Chrome. The public release is version 0.3.21.

## Run the website

From `keepitreel-site/`, run `node scripts/build.mjs` and then `node scripts/serve.mjs`. Open `http://127.0.0.1:4178`. The site keeps its editable homepage, styles, browser scripts and static assets in `dist/` alongside generated pages.
