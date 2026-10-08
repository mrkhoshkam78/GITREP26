/**
 * GPE V2 — Internationalization (EN + FA / RTL)
 */
const T = {
  en: {
    nav_home:"Home", nav_explore:"Explore", nav_categories:"Categories", nav_favorites:"Favorites", nav_dashboard:"Dashboard", nav_compare:"Compare",
    nav_collections:"Collections", nav_settings:"Settings", nav_search:"Search repositories...",
    hero_title:"Discover GitHub Projects", hero_subtitle:"Find open-source repositories by real-world usage, technology, and rich categories",
    hero_cta:"Start Exploring", hero_cta2:"Browse Categories", hero_badge:"Premium · Offline-first · Bilingual",
    section_trending:"Trending", section_hidden:"Hidden Gems", section_recent:"Recently Updated",
    section_offline:"Offline Projects", section_lightweight:"Lightweight", section_beginner:"Beginner Friendly",
    section_popular:"Most Popular", section_maintained:"Highly Maintained", section_rising:"New & Rising",
    section_editors:"Editor's Picks", section_categories:"Explore by Category", section_all:"All Projects",
    section_favorites:"Your Favorites", section_history:"Recently Viewed",
    filter_offline:"Offline", filter_lightweight:"Lightweight", filter_beginner:"Beginner",
    filter_active:"Active", filter_clear:"Clear All", filter_language:"Language", filter_stars:"Min Stars",
    card_stars:"Stars", card_forks:"Forks", card_updated:"Updated", card_quality:"Quality",
    card_activity:"Activity", card_beginner:"Beginner", card_view:"GitHub", card_details:"Details",
    details_about:"About", details_stats:"Statistics", details_tags:"Tags", details_categories:"Categories",
    details_license:"License", details_language:"Language", details_owner:"Owner", details_scores:"Analysis Scores",
    details_topics:"Topics", details_similar:"Similar Projects", details_tech:"Technology",
    settings_title:"Settings", settings_language:"Language", settings_theme:"Theme", settings_accent:"Accent Color",
    settings_theme_dark:"Dark", settings_theme_light:"Light", settings_theme_system:"System",
    settings_token:"GitHub Personal Access Token", settings_token_ph:"ghp_xxxxxxxxxxxx",
    settings_token_help:"Stored only on this device. Used solely for GitHub API requests. Leave empty for Guest Mode.",
    settings_save:"Save Settings", settings_saved:"Settings saved", settings_guest:"Guest Mode (no token)",
    settings_rate:"API Rate Limit", settings_rate_remaining:"Remaining", settings_rate_limit:"Limit",
    settings_cache:"Cache Management", settings_clear_cache:"Clear Cache", settings_export:"Export Data",
    settings_import:"Import Data", settings_anim:"Animation Intensity", settings_anim_full:"Full",
    settings_anim_reduced:"Reduced", settings_anim_none:"None", settings_data_source:"Data Source",
    settings_local:"Local Sample Data", settings_live:"Live GitHub API",
    empty_title:"No projects found", empty_subtitle:"Try adjusting filters or search query",
    empty_favorites:"No favorites yet", empty_favorites_sub:"Heart a project to save it here",
    loading:"Loading projects...", search_results:"Search Results", search_no:"No matching projects",
    projects:"projects", show_more:"Show more", back:"Back", close:"Close",
    insight_title:"README Insight",
    insight_analyze:"Analyze README",
    insight_reanalyze:"Re-analyze",
    insight_analyzing:"Analyzing README…",
    insight_pending:"Waiting…",
    insight_done:"Analysis complete",
    insight_cached:"From cache",
    insight_error:"Analysis error",
    insight_no_readme:"README not available",
    insight_what:"What is it?",
    insight_does:"What does it do?",
    insight_who:"Who is it for?",
    insight_features:"Key features",
    insight_requirements:"Requirements",
    insight_install:"Installation",
    insight_usage:"How to use",
    insight_commands:"Important commands",
    insight_config:"Configuration",
    insight_notes:"Important notes",
    insight_summary:"Simple summary",
    insight_view_source:"View source",
    insight_original_readme:"Original README",
    insight_toggle_readme:"Show / hide",
    insight_open_github:"Open on GitHub",
    insight_copy:"Copy",
    insight_copied:"Copied",
 install:"Install App",
    offline_mode:"Offline", online_mode:"Online", guest:"Guest", authenticated:"Authenticated",
    sort_relevance:"Relevance", sort_stars:"Stars", sort_forks:"Forks", sort_updated:"Updated", sort_activity:"Activity",
    page_explore:"Explore Projects", page_categories:"Categories", page_favorites:"Favorites",
    page_settings:"Settings", page_detail:"Project Details",
    score_excellent:"Excellent", score_good:"Good", score_average:"Average", score_low:"Low",
    maintenance_active:"Actively maintained", maintenance_maintained:"Maintained", maintenance_stale:"Stale",
    toast_fav_add:"Added to favorites", toast_fav_remove:"Removed from favorites",
    toast_export:"Data exported", toast_import:"Data imported", toast_cache_cleared:"Cache cleared",
    toast_saved:"Settings saved", toast_saved:"Settings saved", toast_token_saved:"Token saved", toast_error:"Something went wrong",
    rate_unlimited:"Authenticated (higher limits)", rate_limited:"Rate limited — try later",
    collections_title:"Collections", collections_new:"New Collection", collections_empty:"No collections yet",
    collapse:"Collapse", expand:"Expand", collapse_all:"Collapse All", expand_all:"Expand All",
    show_original:"Show original", show_translated:"Show Persian",
    auth_ok:"Authenticated", auth_invalid:"Invalid token", auth_error:"Auth error", auth_guest:"Guest Mode",
    auth_checking:"Verifying token…", auth_header_ok:"Authorization header attached",
    token_cleared:"Token cleared", validate_token:"Validate & Save", clear_token:"Clear Token",
    token_status:"Authentication status"
  },
  fa: {
    nav_home:"خانه", nav_explore:"کاوش", nav_categories:"دسته‌بندی‌ها", nav_favorites:"علاقه‌مندی‌ها", nav_dashboard:"داشبورد", nav_compare:"مقایسه",
    nav_collections:"مجموعه‌ها", nav_settings:"تنظیمات", nav_search:"جستجوی مخازن...",
    hero_title:"کشف پروژه‌های گیت‌هاب", hero_subtitle:"یافتن مخازن متن‌باز بر اساس کاربرد واقعی، فناوری و دسته‌بندی‌های غنی",
    hero_cta:"شروع کاوش", hero_cta2:"مشاهده دسته‌ها", hero_badge:"پرمیوم · آفلاین · دوزبانه",
    section_trending:"پرطرفدار", section_hidden:"جواهرات پنهان", section_recent:"اخیراً به‌روز شده",
    section_offline:"پروژه‌های آفلاین", section_lightweight:"سبک", section_beginner:"مناسب مبتدیان",
    section_popular:"محبوب‌ترین‌ها", section_maintained:"به‌خوبی نگهداری‌شده", section_rising:"جدید و رو به رشد",
    section_editors:"انتخاب سردبیر", section_categories:"کاوش بر اساس دسته", section_all:"همه پروژه‌ها",
    section_favorites:"علاقه‌مندی‌های شما", section_history:"اخیراً مشاهده‌شده",
    filter_offline:"آفلاین", filter_lightweight:"سبک", filter_beginner:"مبتدی",
    filter_active:"فعال", filter_clear:"پاک کردن همه", filter_language:"زبان", filter_stars:"حداقل ستاره",
    card_stars:"ستاره", card_forks:"فورک", card_updated:"به‌روز", card_quality:"کیفیت",
    card_activity:"فعالیت", card_beginner:"مبتدی", card_view:"گیت‌هاب", card_details:"جزئیات",
    details_about:"درباره", details_stats:"آمار", details_tags:"برچسب‌ها", details_categories:"دسته‌ها",
    details_license:"مجوز", details_language:"زبان", details_owner:"مالک", details_scores:"امتیازات تحلیل",
    details_topics:"موضوعات", details_similar:"پروژه‌های مشابه", details_tech:"فناوری",
    settings_title:"تنظیمات", settings_language:"زبان", settings_theme:"تم", settings_accent:"رنگ تاکیدی",
    settings_theme_dark:"تاریک", settings_theme_light:"روشن", settings_theme_system:"سیستم",
    settings_token:"توکن دسترسی شخصی گیت‌هاب", settings_token_ph:"ghp_xxxxxxxxxxxx",
    settings_token_help:"فقط روی این دستگاه ذخیره می‌شود. صرفاً برای درخواست‌های API گیت‌هاب. برای حالت مهمان خالی بگذارید.",
    settings_save:"ذخیره تنظیمات", settings_saved:"تنظیمات ذخیره شد", settings_guest:"حالت مهمان (بدون توکن)",
    settings_rate:"محدودیت نرخ API", settings_rate_remaining:"باقی‌مانده", settings_rate_limit:"سقف",
    settings_cache:"مدیریت کش", settings_clear_cache:"پاک کردن کش", settings_export:"خروجی داده",
    settings_import:"ورود داده", settings_anim:"شدت انیمیشن", settings_anim_full:"کامل",
    settings_anim_reduced:"کاهش‌یافته", settings_anim_none:"بدون انیمیشن", settings_data_source:"منبع داده",
    settings_local:"داده نمونه محلی", settings_live:"API زنده گیت‌هاب",
    empty_title:"پروژه‌ای یافت نشد", empty_subtitle:"فیلترها یا عبارت جستجو را تنظیم کنید",
    empty_favorites:"هنوز علاقه‌مندی ندارید", empty_favorites_sub:"روی قلب پروژه کلیک کنید تا ذخیره شود",
    loading:"در حال بارگذاری...", search_results:"نتایج جستجو", search_no:"پروژه منطبقی یافت نشد",
    projects:"پروژه", show_more:"نمایش بیشتر", back:"بازگشت", close:"بستن",
    insight_title:"بینش README",
    insight_analyze:"تحلیل README",
    insight_reanalyze:"تحلیل مجدد",
    insight_analyzing:"در حال تحلیل README…",
    insight_pending:"در انتظار…",
    insight_done:"تحلیل انجام شد",
    insight_cached:"از کش",
    insight_error:"خطا در تحلیل",
    insight_no_readme:"README در دسترس نیست",
    insight_what:"این پروژه چیست؟",
    insight_does:"چه کاری انجام می‌دهد؟",
    insight_who:"برای چه کسانی است؟",
    insight_features:"ویژگی‌های کلیدی",
    insight_requirements:"نیازمندی‌ها",
    insight_install:"نصب",
    insight_usage:"نحوه استفاده",
    insight_commands:"دستورات مهم",
    insight_config:"پیکربندی",
    insight_notes:"نکات مهم",
    insight_summary:"خلاصه ساده",
    insight_view_source:"مشاهده منبع",
    insight_original_readme:"README اصلی",
    insight_toggle_readme:"نمایش / پنهان",
    insight_open_github:"باز کردن در GitHub",
    insight_copy:"کپی",
    insight_copied:"کپی شد",
 install:"نصب برنامه",
    offline_mode:"آفلاین", online_mode:"آنلاین", guest:"مهمان", authenticated:"احراز هویت شده",
    sort_relevance:"مرتبط‌ترین", sort_stars:"ستاره‌ها", sort_forks:"فورک‌ها", sort_updated:"به‌روزرسانی", sort_activity:"فعالیت",
    page_explore:"کاوش پروژه‌ها", page_categories:"دسته‌بندی‌ها", page_favorites:"علاقه‌مندی‌ها",
    page_settings:"تنظیمات", page_detail:"جزئیات پروژه",
    score_excellent:"عالی", score_good:"خوب", score_average:"متوسط", score_low:"ضعیف",
    maintenance_active:"فعالانه نگهداری می‌شود", maintenance_maintained:"نگهداری می‌شود", maintenance_stale:"راکد",
    toast_fav_add:"به علاقه‌مندی‌ها اضافه شد", toast_fav_remove:"از علاقه‌مندی‌ها حذف شد",
    toast_export:"داده خروجی گرفته شد", toast_import:"داده وارد شد", toast_cache_cleared:"کش پاک شد",
    toast_saved:"Settings saved", toast_saved:"تنظیمات ذخیره شد", toast_token_saved:"توکن ذخیره شد", toast_error:"خطایی رخ داد",
    rate_unlimited:"احراز هویت شده (سقف بالاتر)", rate_limited:"محدودیت نرخ — بعداً تلاش کنید",
    collections_title:"مجموعه‌ها", collections_new:"مجموعه جدید", collections_empty:"هنوز مجموعه‌ای ندارید",
    collapse:"بستن", expand:"باز کردن", collapse_all:"بستن همه", expand_all:"باز کردن همه",
    show_original:"نمایش اصل انگلیسی", show_translated:"نمایش فارسی",
    auth_ok:"احراز هویت شده", auth_invalid:"توکن نامعتبر", auth_error:"خطای احراز هویت", auth_guest:"حالت مهمان",
    auth_checking:"در حال بررسی توکن…", auth_header_ok:"هدر Authorization متصل است",
    token_cleared:"توکن پاک شد", validate_token:"اعتبارسنجی و ذخیره", clear_token:"پاک کردن توکن",
    token_status:"وضعیت احراز هویت"
  }
};

class I18n {
  constructor() {
    this.lang = localStorage.getItem('gpe_lang') || 'en';
  }
  t(k) { return T[this.lang]?.[k] ?? T.en[k] ?? k; }
  setLang(lang) {
    if (!T[lang]) return;
    this.lang = lang;
    localStorage.setItem('gpe_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'fa');
    this.apply();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-ph'));
    });
  }
  init() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', this.lang === 'fa');
    this.apply();
  }
}
export const i18n = new I18n();
window.i18n = i18n;
