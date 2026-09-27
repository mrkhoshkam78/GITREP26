# جستجوی هوشمند (Smart Search) v4.0

کاملاً کلاینت‌ساید · بدون سرور · بدون کلید API

## ساختار

```
smart-search/
├── index.html
├── css/style.css
├── js/app.js                 # موتور ترکیب + Fuzzy Search + لود بهبودیافته
├── data/keywords.json        # ۱۵۰۶ کلیدواژه (مخفی از UI)
├── assets/
└── README.md
```

## ویژگی‌های نسخه ۴.۰

- **۱۵۰۶ کلیدواژه** در فایل JSON (دیگر در سایت نمایش داده نمی‌شوند)
- **موتور ترکیب هوشمند**: ترکیب خودکار کلیدواژه‌های مرتبط + expansions
- **الگوریتم Fuzzy Search** (Levenshtein + token overlap) برای رتبه‌بندی و گسترش پرس‌وجو
- **لود بهبودیافته JSON**: کش در localStorage + retry + timeout
- فیلتر منبع، تعداد نتایج، تاریخچه، Dark Mode، لینک گوگل

## اجرا

```bash
python -m http.server 8000
```

سپس http://localhost:8000

یا مستقیم روی GitHub Pages آپلود کنید.
