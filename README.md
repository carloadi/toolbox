# PumpFlow

A responsive, offline flow-rate workspace for pump engineers and quotation preparation. Built with React, TypeScript, Vite, and a generated service worker. No backend, account, database, conversion API, or external fonts.

## Setup

Use Node.js 22 or newer and npm. From the repository root:

```sh
npm ci
npm run dev
```

Vite prints the development address. Decimal precision, table input unit, and theme are stored in `localStorage` on the current browser/device. Flow values and table rows remain in memory and reset on reload. If local storage is unavailable the application still runs. Installability depends on browser support; on iOS use Share → Add to Home Screen.

## Workflow

- Type into any quick-converter input to make that unit the source. The other five fields update immediately. Clearing the source clears the converted values.
- Select a table input unit and edit multiple rows, or generate a range. Changing the input unit reinterprets existing entered values in the new unit.
- Ranges require non-negative start/end, end ≥ start, positive step, and at most 1,000 rows. The end is included when aligned with the step.
- Copy for Excel writes a tab-separated table with headers. Clipboard access requires a secure context and browser permission; CSV export is available when copying fails.
- CSV uses comma separators, CRLF line endings, and a UTF-8 BOM for Excel. Blank rows are omitted; negative values block export. Use Excel's text/CSV importer with comma delimiter if your regional settings expect semicolons.
- Precision (0–4 decimal places) affects display and exports only. Copying a rounded displayed value back into a field intentionally makes that value the new source.

## Tests and production validation

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

If Chromium is already installed, skip its installation and use:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Unit tests cover exact constants, all unit-pair round trips, invalid inputs, fractional ranges, row limits, and exported values. Browser tests run against the production build on desktop, phone, and tablet viewports and cover editing, preferences, CSV/clipboard workflows, responsive overflow, and offline reloads. Run `npm run build` before the browser suite; its runner starts and stops a production preview server automatically.

To inspect the production build manually:

```sh
npm run build
npm run preview
```

PWA caching is enabled in production, not the development server. Visit the production page online once, allow the service worker to finish caching, then reload; subsequent visits and conversions work offline. An installed app uses the same offline assets. Service workers and installation require HTTPS, with a localhost exception. Preferences persist locally, but live rows do not.

## Conversion definitions

The common calculation base is litres per second. One minute is 60 seconds; one hour is 3,600 seconds; one day is 86,400 seconds; one cubic metre is 1,000 litres. A US liquid gallon is exactly **3.785411784 litres** (231 cubic inches, with an inch defined as 0.0254 metres). An Imperial gallon is exactly **4.54609 litres**. These are liquid-flow units, not US dry gallons. Intermediate calculations use JavaScript double precision and are never rounded deliberately. Extremely large numbers can exceed floating-point limits; normal engineering flow rates are supported.

## Deployment (requires owner approval)

No deployment is performed by this project setup. After approval, run `npm ci` and `npm run build`, then serve the contents of `dist/` on any HTTPS static host. No server-side runtime or secrets are needed. The relative Vite base supports deployment at a root or subdirectory; keep the full generated directory together.

Serve `manifest.webmanifest` as `application/manifest+json`, JavaScript as JavaScript, and ensure `sw.js` is available at the app's deployment directory. Avoid long-lived caching for `index.html`, `sw.js`, and `registerSW.js`; hashed assets can have immutable caching. Test the deployed path, installation, offline reload, and an update from an earlier version. Updates activate automatically; save/export important table rows before reloading. Do not deploy publicly without approval.

### GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`, which builds and publishes the `pumpflow-pwa` branch. To activate it:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions → Publish PumpFlow to GitHub Pages**. Choose **Run workflow**, select `pumpflow-pwa`, and run it. If a run already failed before Pages was enabled, rerun it after enabling Pages.
4. Wait for the build and deployment jobs to turn green, then open the deployment URL shown in the run or Pages settings. The expected URL is `https://carloadi.github.io/toolbox/` unless a custom domain is configured.

If GitHub reports that the `github-pages` environment rejects the branch, open **Settings → Environments → github-pages** and allow `pumpflow-pwa` under deployment branches. If Actions are disabled, enable them under **Settings → Actions → General**, allowing the official GitHub actions used by this workflow.

Future pushes to `pumpflow-pwa` automatically update the website. Publishing this workflow requires repository settings access; uploading the workflow alone does not activate Pages or prove a successful deployment. The website is public and replaces any existing Pages website for this repository. It does not restrict access to team members. On an iPad or iPhone, open the published URL in Safari and choose **Share → Add to Home Screen**. Android users can use Chrome's **Install app** or **Add to Home screen** menu. Visit online once before using the app offline.
