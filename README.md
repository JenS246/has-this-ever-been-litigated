# Has This Ever Been Litigated?

A tiny, replayable web game: enter any word or short phrase, see how often it appears in real U.S. judicial opinions, and open one matching case.

## How it works

- The static React app makes an exact-phrase browser request to CourtListener's public Legal Search API with `type=o`.
- CourtListener permits cross-origin requests from the GitHub Pages origin, so this project needs no backend, proxy, database, account, or API key.
- Opinion counts, case names, courts, dates, citations, links, and matching text all come from the live API. The app does not invent fallback cases or numbers.
- The playful percentile compares the live result count with a fixed basket of 11 real CourtListener searches collected on September 13, 2026.
- Empty, loading, upstream-error, and successful-result states are handled in the same loop.

CourtListener is operated by the nonprofit Free Law Project. This project is not affiliated with or endorsed by Free Law Project.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build and checks

```bash
npm run build
npm run lint
```

The production bundle is written to `dist/`.

## URLs and deployment

- Game: https://jens246.github.io/has-this-ever-been-litigated/
- Source: https://github.com/JenS246/has-this-ever-been-litigated
- Opinion data: https://www.courtlistener.com/api/rest/v4/search/

Pushes to `main` trigger `.github/workflows/pages.yml`, which builds the app and publishes `dist/` to GitHub Pages. Vite's base path is set to `/has-this-ever-been-litigated/` so static assets resolve correctly.

## Data and privacy

Searches go directly from the visitor's browser to CourtListener. This project stores no searches or personal data.
