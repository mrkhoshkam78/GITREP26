# Atelier — Prompt Engineering Studio

Offline-first prompt management studio. No network calls, no API keys.

## Open

Serve the folder (IndexedDB is more reliable over http than file://):

```bash
cd prompt-engineering-studio
python3 -m http.server 8765
```

Then open http://localhost:8765

## What it does

- Step-by-step builder across Coding, Design, AI, Business, Writing, Analysis, Marketing, and Game Development
- Role, goal, context, constraints, stack, quality bar, output format
- Length (5 / 10 / 15 / 30 / custom), detail (Basic / Advanced / Expert), model, language (English, Persian, bilingual), style
- Library with search, tags, folders, favorite, duplicate, edit
- Version history with restore
- Quality analyzer and rule-based improver
- Reusable components (role, objective, context, constraints, output)
- Export TXT, Markdown, JSON; full library import/export
- Dark / light theme, Persian RTL and English LTR
- Persistence in IndexedDB

Data never leaves the browser.
