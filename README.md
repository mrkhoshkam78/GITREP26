# GitHub Project Explorer (GPE) — V2

Premium, fully client-side GitHub project discovery platform.

## What's New in V2

- **Custom SVG icons only** — no emoji, no icon fonts
- **14 rich category trees** with 100+ subcategories
- **30 curated sample repositories** with full analysis scores
- **Guest Mode + optional GitHub PAT** with live rate-limit display
- **Favorites, search history, recently viewed**
- **Import / export** local data as JSON
- **Animation intensity** control (Full / Reduced / None)
- **10 discovery sections**: Trending, Hidden Gems, Recent, Offline, Lightweight, Beginner, Popular, Maintained, Rising, Editor's Picks
- **Modular ES modules** architecture
- **PWA** installable + offline via service worker

## Quick Start

Open `index.html` in a modern browser, or serve locally:

```bash
python -m http.server 8080
# → http://localhost:8080
```

> **Note:** ES modules require HTTP (not `file://`) for full functionality. Use a local server.

## Structure

```
├── index.html
├── manifest.json
├── sw.js
├── css/styles.css
├── js/modules/
│   ├── i18n.js
│   ├── storage.js
│   ├── analyzer.js
│   ├── github.js
│   └── app.js
├── data/
│   ├── categories.json
│   └── sample-repos.json
└── assets/svg/
```

## Settings

| Setting | Description |
|---------|-------------|
| Language | English / فارسی (RTL) |
| Theme | Dark / Light / System |
| Animation | Full / Reduced / None |
| GitHub PAT | Optional; stored locally only |
| Rate Limit | Live remaining/limit display |
| Cache | Clear, Export, Import |

## License

MIT
