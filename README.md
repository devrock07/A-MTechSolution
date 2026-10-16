# A&M Tech Solutions

A static website for websites, customer tools, and workflow automation. All 23 pages are rendered to HTML during the build. Navigation, FAQs, and solution cards work without JavaScript; small browser modules enhance the mobile menu, project planner, workflow preview, and motion. No framework or third-party runtime is shipped to visitors.

## Local preview

Use Node.js **22 or later**.

```sh
npm run dev
```

Open `http://127.0.0.1:4173/`. This builds the site and serves `dist/`. After editing a source file, run `npm run build` in another terminal and refresh. `npm run preview` serves an existing build without rebuilding it.

The preview server serves only generated files, uses correct content types, redirects directory URLs to their trailing-slash version, and returns HTTP 404 for missing pages and assets. It is a local preview server, not a form backend.

## Tests

```sh
npm ci
npx playwright install chromium firefox webkit
npm run verify
```

On Linux, install browser system dependencies with `npx playwright install --with-deps chromium firefox webkit`.

- `npm run check`: syntax checks every source, build, and test module.
- `npm test`: verifies generated HTML, sitemap exclusions, metadata, all internal links/assets, root/subdirectory hosting, HTTP behavior, configuration validation, and delivery failures/timeouts.
- `npm run qa:browser`: runs Chromium, Firefox, and WebKit tests. Every route is checked at 320, 390, 768, and 1440px. Tests also cover mobile navigation, keyboard focus, native FAQs, new tabs, back/refresh, disabled JavaScript, reduced motion, and configured/unconfigured contact flows. Chromium runs axe accessibility checks on every route at mobile and desktop widths.

The browser suite starts its own three local fixtures on ports 4300–4302. Form requests are intercepted in tests; no real inquiry is delivered. Fixtures use reserved `example.test` addresses and are never included in `dist/`. Reports and screenshots are saved under `playwright-report/`, `test-results/`, and `qa-artifacts/` (all ignored by Git). To run one browser: `npm run qa:browser -- --project=chromium`.

## Content and configuration

| File | Purpose |
| --- | --- |
| `site-config.js` | Verified business details, contact delivery, and publication flags |
| `src/content.js` | Services, solutions, product concepts, and editable legal drafts |
| `src/routes.js` | Shared route metadata and publication rules |
| `src/pages.js` | HTML templates, layout, and project planner |
| `src/app.js` | Progressive mobile menu behavior |
| `src/contact.js` | Form validation, copying, and bounded delivery requests |
| `src/motion.js` | Scroll reveals, entrance cleanup, and pointer-driven 3D tilt |
| `src/motion-accents.js` | Desktop-only looping video and lightweight mobile 2D entrance |
| `src/solutions.js` | Accessible homepage concept and Solutions workflow selection |
| `src/experience.js` | Service filters and local brief completion progress |
| `src/styles.css` | Base presentation, accessible color tokens, and motion timings |
| `src/premium.css` | Shared premium surfaces, 3D illustrations, and responsive page layouts |
| `scripts/build.mjs` | Static rendering, canonical metadata, asset versions, and sitemap |

Business/contact placeholders are intentionally retained for completion later. The homepage emphasizes available service categories. Work, product, and legal drafts remain accessible at their original URLs for editing/review, but are marked `noindex, follow` and excluded from the public navigation and sitemap by default. `noindex` is not access control; preview content is still public.

Complete and approve the relevant content before enabling `publishWork`, `publishProducts`, or `publishLegal`. The case-study template and unreleased product concept remain unindexed until their explicit draft status in `src/routes.js` is changed. Publishing legal pages also requires the entity, jurisdiction, effective date, and verified contact email. Replace the draft text with reviewed content first; the flag does not approve it.

## Site design and motion

The cream, charcoal, and lime design extends across the homepage, services, service details, Solutions, About, project planner, work and product previews, policy drafts, and the 404 page. Illustrations use editable HTML/CSS, enhanced on desktop by a small Higgsfield-generated 3D video accent. No 3D model or canvas library is shipped. All concept examples are clearly labeled as illustrations.

- The homepage has three selectable concepts, a layered browser scene, floating workflow notes, expandable solution cards, and a six-step process grid.
- Inner pages use dimensional introduction cards and consistent surface, type, spacing, and call-to-action styles. Selected service, capability, principle, product, and project-preview cards respond to pointer movement.
- Services can be filtered by digital presence, connected operations, or product and support. Filters are native buttons with selected states and an announced result count.
- The planner shows completion of its four required essentials. This is local feedback only: it does not save data, imply submission, or enable unconfigured delivery. The form itself remains stable while typing.
- Policy contents are available on mobile as well as desktop, with numbered anchor links and a highlighted target section. Draft notices and publication restrictions remain intact.

Solutions retains its three selectable journeys, six expandable cards, linked service suggestions, and three-step starting guide. Shared cards and motion use the same implementation throughout the site.

The A&M brand entrance plays once per tab session (720ms); subsequent pages have a one-second arrival curtain. Both are decorative, never lock scrolling or delay navigation, and are dismissed immediately by input. CSS completes the entrance even if the app script fails. Scroll reveals play once, with content visible by default when JavaScript or motion APIs are unavailable. Without JavaScript, all homepage concepts and workflow examples remain readable, every service stays visible, and the solution-card disclosures and policy anchors still work.

The existing homepage sculpture and inner-page hero graphic use `public/media/studio-sculpture-v1.mp4`, created with Higgsfield Seedance 2.5 (job `7796e97a-2f6d-4045-8a19-ec124052da27`). It is a silent, five-second, 960 × 960 3D-rendered stack in the site's palette, approximately 414 KiB. The MP4 is repackaged without re-encoding, with playback metadata first; the preview server supports byte-range requests. It loops at 0.8× speed without playback buttons. Video dimensions are set directly instead of enlarging a rasterized layer with CSS scale. Only an onscreen desktop illustration (at least 961px, fine pointer, hover, no reduced motion or data-saving preference) receives a video source. Hidden previews and background tabs pause playback automatically. Phones and touch devices receive no video request or 3D model; the original CSS artwork has a one-second 2D fade-and-rise. Failed media, blocked autoplay, and disabled JavaScript retain the original illustration.

Shared labels use plain wording without decorative slash separators or status dots. Solution cards and FAQs use 44px outlined expand controls with a 20px plus that becomes a minus when open. The native details elements work with keyboard, touch, and JavaScript disabled; their styles live under `.disclosure-icon` in `src/styles.css`.

| Customize | Where |
| --- | --- |
| Main colors | `:root` tokens `--paper`, `--ink`, `--accent`, `--accent-dark` in `src/styles.css`; `--surface`, `--surface-line`, and `--surface-shadow` in `src/premium.css` |
| Reveal timing | `--reveal-duration` and `--reveal-stagger` (milliseconds or seconds) |
| Entrance and page arrival | `--entrance-duration` and `--arrival-duration` |
| Generated desktop accent | `motionAccent()` in `src/pages.js`: replace the versioned MP4 path and adjust `data-motion-rate` (0.8 by default); layout, blending, and scale are at the end of `src/premium.css` |
| Workflow switching and tilt return | `--workflow-switch-duration` and `--tilt-reset-duration` |
| 3D depth | `--workflow-depth-step` in `src/styles.css`; `--scene-depth` in `src/premium.css`; perspective and resting angles in their scene rules |
| Tilt strength | `data-tilt` in `src/pages.js`: degrees per axis, clamped to 0–10; 0 disables pointer tilt |
| Workflow text and suggested services | `workflowPreviews` and `solutionServices` in `src/content.js` |
| Homepage concept text and illustration layers | `interfaceVisual()` in `src/pages.js`; `.studio-*` in `src/premium.css` |
| Shared hero graphic and cards | `depthMark()`, `pageHero()`, and `solutionCards()` in `src/pages.js` |
| Service filter categories | `groups` in `servicesPage()` in `src/pages.js` |

Motion targets smooth rendering through transform/opacity animation and event-driven `requestAnimationFrame` updates. Tilt has no idle render loop, reads bounds at the start of a pointer interaction rather than every move, and runs only for a fine mouse pointer. A single set of scroll/resize handlers resets only active surfaces. Touch users get the same controls without pointer tilt. The operating system's reduced-motion preference disables entrances, reveals, tilt, and animated preview switching, including when the preference changes while the page is open. Frame rate depends on the device and browser; 60fps is a design target, not a universal guarantee.

Browser tests cover all 23 routes at four widths, keyboard and touch controls, no-JavaScript and failed-script fallbacks, preference changes, tilt cleanup, filter results, brief validity/reset behavior, and configured delivery failures. Visual checkpoints include every page family on mobile and desktop in Chromium, Firefox, and WebKit; Chromium also runs axe on all routes.

## Contact delivery

The project planner works before contact details are available. It clearly explains that online enquiries are unavailable, disables sending, and lets visitors copy a brief. When clipboard permission is denied, it provides selectable text for manual copying. Without JavaScript, users can read and edit the brief, but sending/copying controls remain disabled.

Set `contactEmail` in `site-config.js` to display a real email link in the footer and contact page. Set `contactEndpoint` to a verified HTTPS JSON endpoint to enable sending. No sample address is substituted automatically.

The endpoint must:

- accept JSON `POST` requests and allow the deployed origin through CORS;
- validate all fields on the server and apply server-side spam protection/rate limiting;
- accept `name`, `email`, `company`, `service`, `budget`, `contactMethod`, and `description`;
- store or deliver the inquiry before returning a successful 2xx response;
- return a non-2xx response on failure.

Client honeypot/timing checks are only usability-level deterrents; they cannot protect an endpoint on their own. Delivery requests time out after 12 seconds, preserve the brief on failure, and prevent duplicate in-flight submissions. A timeout is reported as unconfirmed delivery because the server may have accepted the message before the connection stalled.

All browser configuration is public. **Never put provider secrets or API keys in this repository's client configuration.** Update the privacy content for the actual provider and data handling when delivery is enabled.

## GitHub Pages

In **Settings → Pages**, select **GitHub Actions** as the source. Pushes to `main` run the complete verification suite before building and deploying. Pull requests run the same checks without deployment. Browser reports are retained as workflow artifacts.

The workflow reads the verified Pages URL and repository base path from GitHub. It supports both root sites and project sites such as `/A-MTechSolution/`; all rendered links, assets, canonical URLs, and sitemap entries use the same base path. A custom domain should be configured in Pages before deployment.

Optional repository variables `CONTACT_EMAIL` and `CONTACT_ENDPOINT` can supply public contact configuration at build time. Empty variables fall back to `site-config.js`.

To emulate project hosting locally in PowerShell:

```powershell
$env:BASE_PATH = '/A-MTechSolution'
$env:SITE_URL = 'http://127.0.0.1:4173/A-MTechSolution'
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/A-MTechSolution/`. Clear those environment variables or use a fresh terminal to return to root hosting.

`public/brand-card.png` is the social preview image. Its editable source is `public/brand-card.svg`; regenerate the PNG with `npm run assets:social` after installing Chromium.
