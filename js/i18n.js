/**
 * Internationalization Module
 * Full bilingual support: English + Persian (RTL)
 */

const translations = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_explore: "Explore",
    nav_categories: "Categories",
    nav_trending: "Trending",
    nav_hidden: "Hidden Gems",
    nav_settings: "Settings",
    nav_search: "Search projects...",
    
    // Hero
    hero_title: "Discover GitHub Projects",
    hero_subtitle: "Explore premium open-source repositories by real-world usage categories",
    hero_cta: "Start Exploring",
    hero_cta_secondary: "Browse Categories",
    
    // Sections
    section_trending: "Trending Projects",
    section_hidden: "Hidden Gems",
    section_recent: "Recently Updated",
    section_offline: "Best Offline Projects",
    section_lightweight: "Lightweight Projects",
    section_beginner: "Beginner Friendly",
    section_categories: "Explore by Category",
    section_all: "All Projects",
    
    // Filters
    filter_all: "All",
    filter_language: "Language",
    filter_stars: "Stars",
    filter_updated: "Updated",
    filter_active: "Active Projects",
    filter_offline: "Offline Capable",
    filter_lightweight: "Lightweight",
    filter_beginner: "Beginner Friendly",
    filter_clear: "Clear Filters",
    filter_apply: "Apply",
    
    // Card labels
    card_stars: "Stars",
    card_forks: "Forks",
    card_updated: "Updated",
    card_quality: "Quality",
    card_activity: "Activity",
    card_beginner: "Beginner",
    card_view: "View on GitHub",
    card_details: "Details",
    
    // Project details
    details_about: "About",
    details_stats: "Statistics",
    details_tags: "Tags",
    details_categories: "Categories",
    details_license: "License",
    details_language: "Language",
    details_owner: "Owner",
    details_scores: "Analysis Scores",
    
    // Settings
    settings_title: "Settings",
    settings_language: "Language",
    settings_theme: "Theme",
    settings_theme_dark: "Dark",
    settings_theme_light: "Light",
    settings_theme_system: "System",
    settings_github_token: "GitHub Token (Optional)",
    settings_token_placeholder: "ghp_xxxxxxxxxxxx",
    settings_token_help: "Add a personal access token to enable live GitHub API search. Token is stored locally only.",
    settings_save: "Save Settings",
    settings_saved: "Settings saved!",
    settings_data_source: "Data Source",
    settings_local: "Local Sample Data",
    settings_live: "Live GitHub API",
    
    // Empty & Loading
    empty_title: "No projects found",
    empty_subtitle: "Try adjusting your filters or search query",
    loading: "Loading projects...",
    loading_analyze: "Analyzing repository...",
    
    // Search
    search_placeholder: "Search by name, description, tags, technology...",
    search_results: "Search Results",
    search_no_results: "No matching projects",
    
    // Misc
    projects: "projects",
    show_more: "Show More",
    back: "Back",
    close: "Close",
    install_pwa: "Install App",
    offline_mode: "Offline Mode",
    online_mode: "Online",
    
    // Scores
    score_excellent: "Excellent",
    score_good: "Good",
    score_average: "Average",
    score_low: "Low"
  },
  fa: {
    // Navigation
    nav_home: "خانه",
    nav_explore: "کاوش",
    nav_categories: "دسته‌بندی‌ها",
    nav_trending: "پرطرفدار",
    nav_hidden: "جواهرات پنهان",
    nav_settings: "تنظیمات",
    nav_search: "جستجوی پروژه‌ها...",
    
    // Hero
    hero_title: "کشف پروژه‌های گیت‌هاب",
    hero_subtitle: "کاوش مخازن متن‌باز برتر بر اساس دسته‌بندی‌های کاربرد واقعی",
    hero_cta: "شروع کاوش",
    hero_cta_secondary: "مشاهده دسته‌ها",
    
    // Sections
    section_trending: "پروژه‌های پرطرفدار",
    section_hidden: "جواهرات پنهان",
    section_recent: "اخیراً به‌روز شده",
    section_offline: "بهترین پروژه‌های آفلاین",
    section_lightweight: "پروژه‌های سبک",
    section_beginner: "مناسب مبتدیان",
    section_categories: "کاوش بر اساس دسته",
    section_all: "همه پروژه‌ها",
    
    // Filters
    filter_all: "همه",
    filter_language: "زبان",
    filter_stars: "ستاره‌ها",
    filter_updated: "به‌روزرسانی",
    filter_active: "پروژه‌های فعال",
    filter_offline: "قابلیت آفلاین",
    filter_lightweight: "سبک",
    filter_beginner: "مناسب مبتدی",
    filter_clear: "پاک کردن فیلترها",
    filter_apply: "اعمال",
    
    // Card labels
    card_stars: "ستاره",
    card_forks: "فورک",
    card_updated: "به‌روز",
    card_quality: "کیفیت",
    card_activity: "فعالیت",
    card_beginner: "مبتدی",
    card_view: "مشاهده در گیت‌هاب",
    card_details: "جزئیات",
    
    // Project details
    details_about: "درباره",
    details_stats: "آمار",
    details_tags: "برچسب‌ها",
    details_categories: "دسته‌ها",
    details_license: "مجوز",
    details_language: "زبان",
    details_owner: "مالک",
    details_scores: "امتیازات تحلیل",
    
    // Settings
    settings_title: "تنظیمات",
    settings_language: "زبان",
    settings_theme: "تم",
    settings_theme_dark: "تاریک",
    settings_theme_light: "روشن",
    settings_theme_system: "سیستم",
    settings_github_token: "توکن گیت‌هاب (اختیاری)",
    settings_token_placeholder: "ghp_xxxxxxxxxxxx",
    settings_token_help: "توکن دسترسی شخصی اضافه کنید تا جستجوی زنده API گیت‌هاب فعال شود. توکن فقط به صورت محلی ذخیره می‌شود.",
    settings_save: "ذخیره تنظیمات",
    settings_saved: "تنظیمات ذخیره شد!",
    settings_data_source: "منبع داده",
    settings_local: "داده نمونه محلی",
    settings_live: "API زنده گیت‌هاب",
    
    // Empty & Loading
    empty_title: "پروژه‌ای یافت نشد",
    empty_subtitle: "فیلترها یا عبارت جستجو را تنظیم کنید",
    loading: "در حال بارگذاری پروژه‌ها...",
    loading_analyze: "در حال تحلیل مخزن...",
    
    // Search
    search_placeholder: "جستجو بر اساس نام، توضیحات، برچسب، فناوری...",
    search_results: "نتایج جستجو",
    search_no_results: "پروژه منطبقی یافت نشد",
    
    // Misc
    projects: "پروژه",
    show_more: "نمایش بیشتر",
    back: "بازگشت",
    close: "بستن",
    install_pwa: "نصب برنامه",
    offline_mode: "حالت آفلاین",
    online_mode: "آنلاین",
    
    // Scores
    score_excellent: "عالی",
    score_good: "خوب",
    score_average: "متوسط",
    score_low: "ضعیف"
  }
};

class I18n {
  constructor() {
    this.lang = localStorage.getItem('gpe_lang') || 'en';
    this.dir = this.lang === 'fa' ? 'rtl' : 'ltr';
  }

  t(key) {
    return translations[this.lang][key] || translations.en[key] || key;
  }

  setLanguage(lang) {
    if (!translations[lang]) return;
    this.lang = lang;
    this.dir = lang === 'fa' ? 'rtl' : 'ltr';
    localStorage.setItem('gpe_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = this.dir;
    document.body.classList.toggle('rtl', lang === 'fa');
    this.updateUI();
  }

  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    // Dispatch event for dynamic content
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.lang } }));
  }

  init() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.dir;
    document.body.classList.toggle('rtl', this.lang === 'fa');
    this.updateUI();
  }
}

const i18n = new I18n();
window.i18n = i18n;
