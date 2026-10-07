/**
 * GPE V3 — Local rule-based EN→FA description translator
 * No external AI. Preserves technical terms. Caches results.
 */

const PHRASES = [
  // Longer phrases first
  [/get up and running with/gi, 'راه‌اندازی و اجرای'],
  [/large language models?/gi, 'مدل‌های زبانی بزرگ'],
  [/state[- ]of[- ]the[- ]art/gi, 'پیشرفته‌ترین'],
  [/machine learning/gi, 'یادگیری ماشین'],
  [/deep learning/gi, 'یادگیری عمیق'],
  [/open[- ]source/gi, 'متن‌باز'],
  [/self[- ]hosted/gi, 'خودمیزبان'],
  [/high performance/gi, 'با عملکرد بالا'],
  [/high[- ]performance/gi, 'با عملکرد بالا'],
  [/easy to learn/gi, 'آسان برای یادگیری'],
  [/fast to code/gi, 'سریع برای کدنویسی'],
  [/ready for production/gi, 'آماده برای محیط عملیاتی'],
  [/cross[- ]platform/gi, 'چندپلتفرمی'],
  [/multi[- ]platform/gi, 'چندپلتفرمی'],
  [/virtual whiteboard/gi, 'وایت‌برد مجازی'],
  [/hand[- ]drawn like diagrams/gi, 'نمودارهای شبیه دست‌نویس'],
  [/speech recognition/gi, 'تشخیص گفتار'],
  [/workflow automation/gi, 'اتوماسیون گردش‌کار'],
  [/native AI capabilities/gi, 'قابلیت‌های بومی هوش مصنوعی'],
  [/remote desktop/gi, 'دسکتاپ از راه دور'],
  [/designed for self-hosting/gi, 'طراحی‌شده برای میزبانی شخصی'],
  [/firebase alternative/gi, 'جایگزین Firebase'],
  [/free,?\s*open source alternative/gi, 'جایگزین رایگان و متن‌باز'],
  [/client[- ]side editor/gi, 'ویرایشگر سمت‌کلاینت'],
  [/general diagramming/gi, 'رسم نمودار عمومی'],
  [/utility[- ]first CSS framework/gi, 'چارچوب CSS مبتنی بر utility'],
  [/rapid UI development/gi, 'توسعه سریع رابط کاربری'],
  [/photo and video management/gi, 'مدیریت عکس و ویدیو'],
  [/make websites accessible for AI agents/gi, 'دسترسی‌پذیر کردن وب‌سایت‌ها برای عامل‌های هوش مصنوعی'],
  [/code at the speed of thought/gi, 'کدنویسی با سرعت فکر'],
  [/multiplayer code editor/gi, 'ویرایشگر کد چندنفره'],
  [/home automation/gi, 'اتوماسیون خانگی'],
  [/local control and privacy first/gi, 'با اولویت کنترل محلی و حریم خصوصی'],
  [/community plugins and themes/gi, 'پلاگین‌ها و پوسته‌های جامعه کاربری'],
  [/stable diffusion/gi, 'Stable Diffusion'],
  [/modular stable diffusion GUI/gi, 'رابط گرافیکی ماژولار Stable Diffusion'],
  [/design tool for design and code collaboration/gi, 'ابزار طراحی برای همکاری طراحی و کد'],
  [/user[- ]friendly AI [Ii]nterface/gi, 'رابط کاربری دوستانه هوش مصنوعی'],
  [/production[- ]ready platform/gi, 'پلتفرم آماده تولید'],
  [/agentic workflow development/gi, 'توسعه گردش‌کار عامل‌محور'],
  [/content[- ]driven websites/gi, 'وب‌سایت‌های محتوا‌محور'],
  [/web framework for/gi, 'چارچوب وب برای'],
  [/backend in 1 file/gi, 'بک‌اند در یک فایل'],
  [/secure backend server/gi, 'سرور بک‌اند امن'],
  [/build like a team of hundreds/gi, 'مثل یک تیم صد نفره بسازید'],
  [/the react framework for the web/gi, 'چارچوب React برای وب'],
  [/building applications with LLMs through composability/gi, 'ساخت برنامه‌ها با مدل‌های زبانی از طریق ترکیب‌پذیری'],
  [/robust speech recognition via large[- ]scale weak supervision/gi, 'تشخیص گفتار مقاوم با نظارت ضعیف در مقیاس بزرگ'],
  [/fair[- ]code workflow automation platform/gi, 'پلتفرم اتوماسیون گردش‌کار با مجوز fair-code'],
  [/an open[- ]source remote desktop application/gi, 'برنامه متن‌باز دسکتاپ از راه دور'],
  [/the free, open source alternative to/gi, 'جایگزین رایگان و متن‌باز برای'],
  [/draw\.io is a/gi, 'draw.io یک'],
  [/javascript, client[- ]side editor/gi, 'ویرایشگر جاوااسکریپت سمت‌کلاینت'],
  [/high performance self[- ]hosted/gi, 'خودمیزبان با عملکرد بالا'],
  [/from the creators of/gi, 'از سازندگان'],
  [/puts local control and privacy first/gi, 'کنترل محلی و حریم خصوصی را در اولویت قرار می‌دهد'],
  [/everything you need to extend/gi, 'همه آنچه برای گسترش نیاز دارید'],
  [/supports ollama, openai api/gi, 'پشتیبانی از Ollama، OpenAI API'],
  [/for web, mobile & flutter/gi, 'برای وب، موبایل و Flutter'],
  [/stable diffusion web ui/gi, 'رابط وب Stable Diffusion'],
  [/the most powerful and modular/gi, 'قدرتمندترین و ماژولارترین'],
  [/gui and backend/gi, 'رابط گرافیکی و بک‌اند'],
  [/open source backend/gi, 'بک‌اند متن‌باز'],
  [/in 1 file/gi, 'در یک فایل'],
  // Common verbs / fragments
  [/for the web/gi, 'برای وب'],
  [/for mobile and beyond/gi, 'برای موبایل و فراتر'],
  [/makes it easy and fast to build beautiful apps/gi, 'ساخت اپلیکیشن‌های زیبا را آسان و سریع می‌کند'],
  [/get up and running/gi, 'راه‌اندازی و اجرا'],
  [/with large language models locally/gi, 'مدل‌های زبانی بزرگ به‌صورت محلی'],
  [/locally\.?/gi, 'به‌صورت محلی.'],
  [/for pytorch, tensorflow, and jax/gi, 'برای Pytorch، TensorFlow و JAX'],
  [/through composability/gi, 'از طریق ترکیب‌پذیری'],
  [/easy to learn, fast to code/gi, 'آسان برای یادگیری، سریع برای کدنویسی'],
  [/2[Dd] and 3[Dd] game engine/gi, 'موتور بازی دوبعدی و سه‌بعدی'],
  [/multi[- ]platform 2[Dd] and 3[Dd]/gi, 'چندپلتفرمی دوبعدی و سه‌بعدی'],
  [/sketching hand[- ]drawn like diagrams/gi, 'رسم نمودارهای شبیه دست‌نویس'],
  [/via large[- ]scale weak supervision/gi, 'با نظارت ضعیف در مقیاس بزرگ'],
  [/with native AI capabilities/gi, 'با قابلیت‌های بومی هوش مصنوعی'],
  [/designed for self[- ]hosting/gi, 'طراحی‌شده برای میزبانی شخصی'],
  [/the open source/gi, 'متن‌باز'],
  [/alternative to openai/gi, 'جایگزین OpenAI'],
  [/self[- ]hosted and local[- ]first/gi, 'خودمیزبان و محلی‌محور'],
  [/for general diagramming/gi, 'برای رسم نمودار عمومی'],
  [/for rapid UI development/gi, 'برای توسعه سریع رابط کاربری'],
  [/photo and video management solution/gi, 'راه‌حل مدیریت عکس و ویدیو'],
  [/accessible for AI agents/gi, 'دسترسی‌پذیر برای عامل‌های هوش مصنوعی'],
  [/creators of Atom and Tree[- ]sitter/gi, 'سازندگان Atom و Tree-sitter'],
  [/that puts local control/gi, 'که کنترل محلی را'],
  [/and privacy first/gi, 'و حریم خصوصی را در اولویت قرار می‌دهد'],
  [/plugins and themes for Obsidian/gi, 'پلاگین‌ها و پوسته‌ها برای Obsidian'],
  [/for design and code collaboration/gi, 'برای همکاری طراحی و کد'],
  [/agentic workflow development/gi, 'توسعه گردش‌کار عامل‌محور'],
  [/for content[- ]driven websites/gi, 'برای وب‌سایت‌های محتوا‌محور'],
  [/backend server for web, mobile/gi, 'سرور بک‌اند برای وب، موبایل'],
];

const WORDS = [
  [/\bframework\b/gi, 'چارچوب'],
  [/\blibrary\b/gi, 'کتابخانه'],
  [/\bapplication\b/gi, 'برنامه'],
  [/\bplatform\b/gi, 'پلتفرم'],
  [/\btool\b/gi, 'ابزار'],
  [/\beditor\b/gi, 'ویرایشگر'],
  [/\bengine\b/gi, 'موتور'],
  [/\bserver\b/gi, 'سرور'],
  [/\bclient\b/gi, 'کلاینت'],
  [/\binterface\b/gi, 'رابط'],
  [/\bautomation\b/gi, 'اتوماسیون'],
  [/\bmanagement\b/gi, 'مدیریت'],
  [/\bsolution\b/gi, 'راه‌حل'],
  [/\bpowerful\b/gi, 'قدرتمند'],
  [/\bmodular\b/gi, 'ماژولار'],
  [/\bbeautiful\b/gi, 'زیبا'],
  [/\bfast\b/gi, 'سریع'],
  [/\beasy\b/gi, 'آسان'],
  [/\bfree\b/gi, 'رایگان'],
  [/\bsecure\b/gi, 'امن'],
  [/\blocal\b/gi, 'محلی'],
  [/\boffline\b/gi, 'آفلاین'],
  [/\bprivacy\b/gi, 'حریم خصوصی'],
  [/\bcollaboration\b/gi, 'همکاری'],
  [/\bdevelopment\b/gi, 'توسعه'],
  [/\bproduction\b/gi, 'محیط عملیاتی'],
  [/\brepository\b/gi, 'مخزن'],
  [/\bproject\b/gi, 'پروژه'],
  [/\bsimple\b/gi, 'ساده'],
  [/\bmodern\b/gi, 'مدرن'],
  [/\blightweight\b/gi, 'سبک'],
  [/\bminimal\b/gi, 'حداقلی'],
  [/\bcomplete\b/gi, 'کامل'],
  [/\bofficial\b/gi, 'رسمی'],
  [/\balternative\b/gi, 'جایگزین'],
  [/\bbuild\b/gi, 'ساخت'],
  [/\bcreate\b/gi, 'ایجاد'],
  [/\bmanage\b/gi, 'مدیریت'],
  [/\bsupport(s)?\b/gi, 'پشتیبانی'],
  [/\binclude(s)?\b/gi, 'شامل'],
  [/\bprovide(s)?\b/gi, 'ارائه'],
  [/\benable(s)?\b/gi, 'فعال‌سازی'],
  [/\ballow(s)?\b/gi, 'اجازه'],
  [/\bbased on\b/gi, 'مبتنی بر'],
  [/\bwritten in\b/gi, 'نوشته‌شده با'],
  [/\bbuilt with\b/gi, 'ساخته‌شده با'],
  [/\bpowered by\b/gi, 'قدرت‌گرفته از'],
];

// Terms to never translate (case-insensitive match, restore original casing from match)
const PRESERVE = new Set([
  'react','vue','angular','svelte','next.js','nextjs','nodejs','node.js','typescript','javascript',
  'python','rust','golang','kotlin','swift','dart','flutter','pytorch','tensorflow','jax',
  'docker','kubernetes','graphql','postgresql','mongodb','sqlite','redis','nginx',
  'openai','ollama','langchain','huggingface','godot','vscode','obsidian','comfyui',
  'stable diffusion','llm','rag','api','ui','gui','css','html','sql','cli','sdk','ide',
  'ios','android','macos','linux','windows','wasm','gpu','cpu','nlp','ocr','tts','stt',
  'ci/cd','devops','etl','iot','cad','rpg','pdf','svg','png','webp','json','yaml',
  'fastapi','django','express','spring','laravel','rails','astro','tailwind','supabase',
  'firebase','appwrite','pocketbase','n8n','zapier','git','github','gitlab','bitbucket',
  'atom','tree-sitter','raycast','penpot','immich','rustdesk','home assistant','dify',
  'automatic1111','open-webui','browser-use','excalidraw','draw.io','drawio'
]);

class Translator {
  constructor() {
    this.cacheKey = 'gpe_desc_translations';
    this.cache = this._loadCache();
    this.showOriginal = false; // toggle: when true, show EN even in FA mode
  }

  _loadCache() {
    try {
      return JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
    } catch { return {}; }
  }

  _saveCache() {
    try {
      // Cap cache size
      const keys = Object.keys(this.cache);
      if (keys.length > 500) {
        keys.slice(0, keys.length - 400).forEach(k => delete this.cache[k]);
      }
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch { /* quota */ }
  }

  translate(text) {
    if (!text || !text.trim()) return text;
    const key = text.trim();
    if (this.cache[key]) return this.cache[key];

    // Protect preserved terms with placeholders
    const preserved = [];
    let work = key;
    // Sort by length desc so longer multi-word terms match first
    const terms = [...PRESERVE].sort((a, b) => b.length - a.length);
    for (const term of terms) {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      work = work.replace(re, (m) => {
        const idx = preserved.length;
        preserved.push(m); // keep original casing
        return `__T${idx}__`;
      });
    }

    // Apply phrase rules
    for (const [re, fa] of PHRASES) {
      work = work.replace(re, fa);
    }
    // Apply word rules
    for (const [re, fa] of WORDS) {
      work = work.replace(re, fa);
    }

    // Restore preserved terms
    work = work.replace(/__T(\d+)__/g, (_, n) => preserved[parseInt(n, 10)] || '');

    // Light cleanup
    work = work.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();

    this.cache[key] = work;
    this._saveCache();
    return work;
  }

  /** Return display description based on current language + toggle */
  display(text, lang) {
    if (!text) return '';
    if (lang !== 'fa' || this.showOriginal) return text;
    return this.translate(text);
  }

  setShowOriginal(v) {
    this.showOriginal = !!v;
    localStorage.setItem('gpe_show_orig_desc', this.showOriginal ? '1' : '0');
  }

  loadShowOriginal() {
    this.showOriginal = localStorage.getItem('gpe_show_orig_desc') === '1';
    return this.showOriginal;
  }
}

export const translator = new Translator();
window.translator = translator;
