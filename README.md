# جستجوی هوشمند v5.0

کاملاً کلاینت‌ساید · Clean Code · بدون سرور

## ساختار (جداسازی کامل)

```
smart-search/
├── index.html
├── css/style.css
├── js/
│   ├── smart-engine.js      # موتور هوشمند (جدا + ۵ ارتقا)
│   ├── search-engines.js    # ۶ موتور جستجو
│   └── app.js               # UI و orchestration
├── data/keywords.json       # ۳۲۰۰ کلیدواژه
├── assets/
└── README.md
```

## موتورهای جستجو

1. ویکی‌پدیا فارسی
2. ویکی‌پدیا انگلیسی
3. DuckDuckGo Instant Answer
4. **Open Library** (جدید)
5. **Wikidata** (جدید)
6. **Hacker News Algolia** (جدید)

## ۵ ارتقای موتور هوشمند

1. نرمال‌سازی متن فارسی (ی/ک و حذف اعراب)
2. Fuzzy Score بهبودیافته (Levenshtein + token + length)
3. ترکیب وزن‌دار بر اساس گروه
4. تشخیص ساده intent
5. انتخاب متنوع variants (جلوگیری از تکراری نزدیک)

## اجرا

```bash
python -m http.server 8000
```

سپس روی GitHub Pages آپلود کنید.
