# Modern Web Guidance review — through 0.3.12

Reviewed 27 October 2026 against Google's installed `modern-web-guidance` skill, version `2026_10_16-6654652b`. The `dialog` and `accessibility` guides informed the changes below. This was a focused review of the extension interface and injected protection controls, not a complete accessibility or security certification.

## Changes

1. **Native link-warning dialog.** A custom `div` overlay declared a modal role and manually cycled two controls, but it did not make the underlying page inert. The warning now uses `<dialog>` and `showModal()`. Chrome handles modal semantics, background interaction blocking, Escape dismissal and focus restoration. The safe “Go back” action has initial focus. Scroll containment is applied to the dialog and backdrop without changing the visited website's root styles. The backdrop supports light and dark appearance.
2. **Stable page-report controls.** Rebuilding the report and badge removed whichever control had keyboard focus. These controls now remain mounted while findings update. Opening the report moves focus to its first action; closing it returns focus to the badge. The badge exposes its expanded state and controlled report region.
3. **Confirmation-link exclusion.** `closest()` cannot cross a shadow root. The click interceptor now inspects the composed event path to recognize extension-owned hosts, allowing “Continue to link” to follow the captured destination without triggering another warning. An asynchronous website change cannot replace that captured address.

## Existing patterns retained

- Native buttons, selects and labeled controls already support basic keyboard interaction.
- Theme preferences already support System, Light and Dark, persist locally, follow OS changes and apply only to extension-owned surfaces.
- Injected findings are created with DOM nodes and `textContent` rather than interpreted as HTML.
- Scan scheduling already coalesces DOM updates, and content/link scans have explicit coverage limits. Performance still needs measurement on representative lower-powered devices.
- The packaged extension keeps its local script policy and optional access model. Installing development guidance does not require additional user permissions or add remote code to the extension.

## Verification and remaining work

See `VALIDATION.md` for the release check results. Regression coverage includes a real native `:modal` state, blocked background focus, keyboard navigation, Escape/Go back focus restoration, continuation to the captured destination, and report-focus persistence through dynamic findings.

Real Chrome permission prompts, signed-in webmail, screen-reader use, zoom, and lower-powered device acceptance still require the human checks in `BETA-TESTING.md`. The first beta remains desktop Chrome only. No new AI detection capability or guarantee of authorship/safety is implied by these changes.

## 0.3.6 icon-only control update

The `icons` guide informed the Thinker/question-mark corner control. The button has an accessible status name and title, while its inline SVG is decorative (`aria-hidden="true"`). SVG paths use currentColor for appearance changes and come from the approved compact hair-tufted mark. The icon is mounted once and retained during scan updates. Its 56 by 72 CSS-pixel target fits a 390px-wide window. No external image request, image filtering, sprite dependency or new web-accessible resource is introduced.

## 0.3.7 logo-only refinement

Removed the question-mark SVG group and its color rules. The existing approved logo is centered in a 56 by 64 CSS-pixel button. The decorative SVG remains aria-hidden, while the native button retains its accessible status name, title, expanded state and report association.

## 0.3.8 controls and selected typography

Applied the typography and visually-stable-font-fallbacks guides to locally bundled Atkinson Hyperlegible Next. Extension-page sizes use rem; injected interfaces use a browser-scalable small base and em descendants so their scale is independent of the visited site’s root size. Line heights are unitless and font-size-adjust:from-font normalizes fallbacks. The scoped font family does not restyle website content. FontFace receives packaged binary data rather than requesting a font URL; a strict font-src none fixture confirms local rendering without new resource permissions.

Hide uses the hidden attribute plus an explicit badge[hidden] display rule, because the badge’s inline-flex rule would otherwise override the browser’s hidden styling. Visibility changes preserve running link warnings and do not re-register scanners. Existing native buttons and the labeled switch provide keyboard semantics.

## 0.3.9 creator controls and Undo

Applied the icons guide: each native monkey button has an aria-label naming the creator and a decorative aria-hidden SVG from the approved mark. The target is 44 by 52 CSS pixels. Watch and active Shorts controls sit inside the local player. Click-time owner resolution rejects stale/recycled targets.

Applied persistent-toast-notifications: the Undo surface uses popover="manual" where supported, stays visible until explicit dismissal/replacement and has no timeout. A fixed-position fallback handles unsupported popovers. After blocking replaces the invoking control, focus moves to Undo; subsequent status messages use a status region. Native Undo/Dismiss actions remain keyboard accessible. The notification survives feed navigation and auto-skip. Undo records are stored locally for the browser session and cannot overwrite newer creator choices. No animation or remote resource was introduced.

## 0.3.10 explained post flags

Applied search-hidden-content and html to the inline reasons. Notices use native details with summary as the first child, retain the browser disclosure marker and keep action buttons outside summary. The browser supplies keyboard expansion and state semantics; no custom accordion role, positive tabindex or animation is added. Native button actions, textContent-built reason lists and visible focus outlines remain isolated in the extension shadow root. This avoids interpreting caption text as markup or letting a card click handler treat the explanation as a video navigation. New flags do not move focus or pause playback by themselves. Hiding/blocking moves focus to persistent Undo; dismissal and successful Undo focus the notification Dismiss action after the invoking control is removed/hidden.

## 0.3.11 per-message email explanations

Applied search-hidden-content and html after retrieving their current guides. Each message uses native details/summary for its own reasons; summary is the first child, retains its marker and contains no nested action buttons. Dismiss, Show warning and Report incorrect warning remain native buttons. Dismiss/restore moves focus to the replacement control. Ordinary scan updates do not announce an alert or steal focus. Explanations are built with textContent, not parsed email HTML, and styled inside the existing themed shadow root. This keeps readable explanations and keyboard expansion without a custom accordion implementation. Email controls retain the local Atkinson font and a minimum 44px button height.

## 0.3.12 thumbnail compatibility

Searched for dynamic-content observation and checked the guide catalogue. No additional guide matched the site-specific card selectors/creator lookup. The fix reuses existing native action buttons, accessible monkey controls and persistent Undo rather than introducing a new browser API. Controls mount outside thumbnail/title anchors. Mutation observation remains filtered to relevant card/reel class changes and existing owned hosts.

## 0.3.13 compact email reports

Searched light dismiss popover and retrieved declarative-dialog-popover-control and html. Each email uses a named native button and a non-modal auto popover. Native commandfor/toggle-popover is used when commandForElement exists on HTMLButtonElement.prototype; earlier Popover implementations use popovertarget. Missing Popover support uses a manual hidden/fixed overlay with Escape/outside-click/Close and synchronized aria-expanded. Position is viewport-clamped and updates on scroll/resize; listeners are removed when closed or unmounted. No remote polyfill is loaded. Native details/summary holds optional check-limit text; warning reasons are visible immediately after opening.

## 0.3.14 inbox preview integration

Searched observe dynamic content and checked the catalog; no additional guide directly covered provider row matching. Reused the 0.3.13 native non-modal popover/feature-detection implementation. New UI uses the existing shadow DOM and approved decorative monkey geometry. Row mouse/key events are stopped at the extension host so host list handlers do not open/select mail. Existing MutationObserver scheduling and transient snapshots handle row replacement. No new library or remote script is introduced.

## 0.3.15 inbox time placement

Consulted css-layout after searching position overlay within container. Used intrinsic timestamp sizing with a fixed inline reservation and a zero block-size slot, placing the compact button absolutely inside that slot. Layout dimensions/margins use logical properties; the DOM location is actually after the time, rather than CSS order/reverse. Native popovers retain their existing viewport-aware behavior. No overflow clipping is added to conceal row growth.

## 0.3.16 Gmail hover coexistence

Searched reserve space beside overlay and reused the css-layout guidance already read in this session. A real trailing table cell reserves room instead of hiding/clipping or covering native actions. The native hover-toolbar inset is scoped only to rows carrying this extension control. Cleanup removes the slot, row marker and stylesheet, restoring native layout. Native popover behavior remains unchanged.

## 0.3.17 unclipped email hints

Retrieved interest-triggered-tooltips. Applied its hoverable, persistent and Escape-dismissible constraints. The existing event-driven email controls use manual native popovers so hint validity can be rechecked and hints closed before the analysis opens; no interestfor/polyfill dependency is added. Viewport measurements clamp the short hint outside row clipping; one active hint is retained. Browsers without Popover omit the supplemental hover text while keeping the accessible button status and click report.

## 0.3.18 Outlook row corner

Searched positioning a button inside a container, checked the catalog and retrieved css-layout. Used logical trailing/bottom positioning and a reserved inline gutter for recognised Outlook rows without semantic timestamps. No overflow clipping is added to hide layout issues. Existing top-layer reports/tooltips remain unchanged. Temporary host styles are restored individually without overwriting newer host-page changes.


## 0.3.19 video analysis launcher

Retrieved declarative-dialog-popover-control. Reused the existing native non-modal report control with a video-specific accessible name and Close label. The trigger uses commandfor/toggle-popover when commandForElement exists, popovertarget otherwise, and the existing manually positioned/keyboard-dismissed fallback if Popover is missing. Status text accompanies colour; stale identity/text is checked before opening or acting, and disposal closes popovers/listeners when a recycled player changes. The top layer avoids card clipping; no remote scripts or polyfills are added.


## 0.3.20 toolbar warning badges

Searched display status badge and checked the guidance catalog. No guide directly covered Chrome extension action badges; no unrelated visual guide was applied. Used Chrome's official action API reference for per-tab setBadgeText/background/text colour and accessible title. Existing semantic details/summary exposes popup explanations, and the established switch controls visibility. Badge states contain only fixed category IDs, with no safety guarantee when empty.
