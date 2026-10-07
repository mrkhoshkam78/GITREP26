# GITREP26 V4

Premium client-side GitHub project discovery platform.

## Critical fixes
- **PAT flow**: Validate first, save only on success, never wipe existing token on failure
- Token stored in dedicated `localStorage` key `gitrep26_pat_token`
- Input type text (not password) to avoid browser clearing on submit

## V4 features
- Live search autocomplete (categories, languages, repos, topics)
- Rich project details (README preview, files, tags, monitor, compare)
- Personal collections (local IndexedDB/localStorage)
- Project comparison (2–3 repos)
- Personal statistics dashboard
- Manual personal tags
- Update monitoring (local)
- Custom accent themes (purple, turquoise, green, blue, orange, red)
- Improved Persian translation engine
- Smart offline indicators + API result caching hooks

## Run
```bash
python -m http.server 8080
# → http://localhost:8080
```

ES modules require HTTP (not file://).
