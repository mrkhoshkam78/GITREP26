# GitHub Project Explorer (GPE) — V1

Premium, fully client-side GitHub project discovery platform.

## Features

- **Category-based discovery** — 13 main categories with subcategories (AI, Web, Desktop, Mobile, Games, Data, Security, DevTools, Media, Productivity, Education, Engineering, Experimental)
- **Bilingual** — English + Persian with full RTL support and live language switcher
- **Offline-first** — Works from local sample data; PWA installable with service worker
- **Smart filters** — Offline, Lightweight, Beginner-friendly, Active projects + search
- **Repository analysis** — Rule-based quality, activity, and beginner scores (no external AI)
- **Special sections** — Trending, Hidden Gems, Recently Updated, Offline, Lightweight, Beginner
- **Optional live GitHub API** — Paste a personal token in Settings for live search
- **Modern 2026 UI** — Glass effects, gradients, ambient motion, card animations, responsive

## Quick Start

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
2. Or serve locally for full PWA/offline behavior:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080`.

## Project Structure

```
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── styles.css
├── js/
│   ├── i18n.js          # Translations + RTL
│   ├── storage.js       # LocalStorage + IndexedDB
│   ├── analyzer.js      # Rule-based repo analyzer
│   ├── github.js        # Optional GitHub API client
│   └── app.js           # Main application
├── data/
│   ├── sample-repos.json
│   └── categories.json
├── assets/
├── images/
└── icons/
```

## Settings

- **Language**: EN / فارسی
- **Theme**: Dark / Light / System
- **GitHub Token**: Optional personal access token (stored only in localStorage)

## Technical Notes

- Pure HTML, CSS, JavaScript — no build step, no backend
- Sample data includes 25 curated repositories with pre-computed scores
- Service worker caches app shell + data for offline use
- Designed for easy expansion in future versions

## License

MIT — free to use and extend.
