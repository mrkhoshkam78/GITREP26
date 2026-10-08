/**
 * GITREP26 V4 — Natural EN→FA description translator (local, no AI API)
 */
const PHRASES = [
  [/get up and running with large language models locally\.?/gi, 'مدل‌های زبانی بزرگ را به‌صورت محلی راه‌اندازی و اجرا کنید.'],
  [/state-of-the-art machine learning for pytorch, tensorflow, and jax\.?/gi, 'یادگیری ماشین پیشرفته برای Pytorch، TensorFlow و JAX.'],
  [/building applications with llms through composability\.?/gi, 'ساخت برنامه‌ها با مدل‌های زبانی بزرگ از طریق ترکیب‌پذیری.'],
  [/the react framework for the web\.?/gi, 'چارچوب React برای وب.'],
  [/fastapi framework, high performance, easy to learn, fast to code, ready for production\.?/gi, 'چارچوب FastAPI با عملکرد بالا، آسان برای یادگیری، سریع برای کدنویسی و آماده محیط عملیاتی.'],
  [/godot engine – multi-platform 2d and 3d game engine\.?/gi, 'موتور Godot — موتور بازی چندپلتفرمی دوبعدی و سه‌بعدی.'],
  [/flutter makes it easy and fast to build beautiful apps for mobile and beyond\.?/gi, 'Flutter ساخت اپلیکیشن‌های زیبا برای موبایل و فراتر را آسان و سریع می‌کند.'],
  [/visual studio code\.?/gi, 'ویرایشگر Visual Studio Code.'],
  [/virtual whiteboard for sketching hand-drawn like diagrams\.?/gi, 'وایت‌برد مجازی برای رسم نمودارهای شبیه دست‌نویس.'],
  [/robust speech recognition via large-scale weak supervision\.?/gi, 'تشخیص گفتار مقاوم با نظارت ضعیف در مقیاس بزرگ.'],
  [/fair-code workflow automation platform with native ai capabilities\.?/gi, 'پلتفرم اتوماسیون گردش‌کار fair-code با قابلیت‌های بومی هوش مصنوعی.'],
  [/an open-source remote desktop application designed for self-hosting\.?/gi, 'برنامه متن‌باز دسکتاپ از راه دور، طراحی‌شده برای میزبانی شخصی.'],
  [/the open source firebase alternative\.?/gi, 'جایگزین متن‌باز Firebase.'],
  [/the free, open source alternative to openai\.? self-hosted and local-first\.?/gi, 'جایگزین رایگان و متن‌باز OpenAI؛ خودمیزبان و محلی‌محور.'],
  [/draw\.io is a javascript, client-side editor for general diagramming\.?/gi, 'draw.io یک ویرایشگر جاوااسکریپت سمت‌کلاینت برای رسم نمودار است.'],
  [/a utility-first css framework for rapid ui development\.?/gi, 'چارچوب CSS مبتنی بر utility برای توسعه سریع رابط کاربری.'],
  [/high performance self-hosted photo and video management solution\.?/gi, 'راه‌حل خودمیزبان و پرکارکرد برای مدیریت عکس و ویدیو.'],
  [/make websites accessible for ai agents\.?/gi, 'دسترسی‌پذیر کردن وب‌سایت‌ها برای عامل‌های هوش مصنوعی.'],
  [/code at the speed of thought – high-performance multiplayer code editor\.?/gi, 'کدنویسی با سرعت فکر — ویرایشگر کد چندنفره با عملکرد بالا.'],
  [/open source home automation that puts local control and privacy first\.?/gi, 'اتوماسیون خانگی متن‌باز با اولویت کنترل محلی و حریم خصوصی.'],
  [/community plugins and themes for obsidian\.?/gi, 'پلاگین‌ها و پوسته‌های جامعه کاربری برای Obsidian.'],
  [/the most powerful and modular stable diffusion gui and backend\.?/gi, 'قدرتمندترین و ماژولارترین رابط گرافیکی و بک‌اند Stable Diffusion.'],
  [/the open-source design tool for design and code collaboration\.?/gi, 'ابزار طراحی متن‌باز برای همکاری طراحی و کد.'],
  [/user-friendly ai interface \(supports ollama, openai api, \.\.\.\)\.?/gi, 'رابط کاربری دوستانه هوش مصنوعی (پشتیبانی از Ollama، OpenAI API و …).'],
  [/production-ready platform for agentic workflow development\.?/gi, 'پلتفرم آماده تولید برای توسعه گردش‌کار عامل‌محور.'],
  [/the web framework for content-driven websites\.?/gi, 'چارچوب وب برای وب‌سایت‌های محتوا‌محور.'],
  [/open source backend in 1 file\.?/gi, 'بک‌اند متن‌باز در یک فایل.'],
  [/build like a team of hundreds\.? secure backend server for web, mobile & flutter\.?/gi, 'مثل یک تیم صد نفره بسازید. سرور بک‌اند امن برای وب، موبایل و Flutter.'],
  [/stable diffusion web ui\.?/gi, 'رابط وب Stable Diffusion.'],
  [/everything you need to extend raycast\.?/gi, 'همه آنچه برای گسترش Raycast نیاز دارید.'],
  [/open[- ]source/gi, 'متن‌باز'],
  [/self[- ]hosted/gi, 'خودمیزبان'],
  [/high[- ]performance/gi, 'با عملکرد بالا'],
  [/machine learning/gi, 'یادگیری ماشین'],
  [/deep learning/gi, 'یادگیری عمیق'],
  [/large language models?/gi, 'مدل‌های زبانی بزرگ'],
  [/workflow automation/gi, 'اتوماسیون گردش‌کار'],
  [/remote desktop/gi, 'دسکتاپ از راه دور'],
  [/home automation/gi, 'اتوماسیون خانگی'],
  [/cross[- ]platform/gi, 'چندپلتفرمی'],
  [/ready for production/gi, 'آماده برای محیط عملیاتی'],
  [/easy to learn/gi, 'آسان برای یادگیری'],
  [/fast to code/gi, 'سریع برای کدنویسی'],
  [/for the web/gi, 'برای وب'],
  [/for mobile and beyond/gi, 'برای موبایل و فراتر از آن'],
  [/local[- ]first/gi, 'محلی‌محور'],
  [/privacy first/gi, 'با اولویت حریم خصوصی'],
  [/game engine/gi, 'موتور بازی'],
  [/code editor/gi, 'ویرایشگر کد'],
  [/web framework/gi, 'چارچوب وب'],
  [/css framework/gi, 'چارچوب CSS'],
  [/a progressive web app/gi, 'یک وب‌اپ Progressive'],
  [/command[- ]line (interface|tool)/gi, 'ابزار خط فرمان'],
  [/real[- ]time/gi, 'بلادرنگ'],
  [/end[- ]to[- ]end/gi, 'سرتاسری'],
  [/type[- ]safe/gi, 'امن از نظر نوع'],
  [/developer experience/gi, 'تجربه توسعه‌دهنده'],
  [/production[- ]ready/gi, 'آماده تولید'],
  [/zero[- ]config/gi, 'بدون نیاز به پیکربندی'],
  [/out of the box/gi, 'به‌صورت پیش‌فرض'],
  [/batteries included/gi, 'کامل و آماده استفاده'],
  [/under (the|active) development/gi, 'در حال توسعه فعال'],
  [/single binary/gi, 'باینری واحد'],
  [/no dependencies/gi, 'بدون وابستگی'],
  [/blazing fast/gi, 'فوق‌العاده سریع'],
  [/lightning fast/gi, 'سریع مثل برق'],
  [/best[- ]in[- ]class/gi, 'در کلاس خود بهترین'],
  [/cloud native/gi, 'ابری‌محور'],
  [/edge computing/gi, 'محاسبات لبه'],
  [/vector database/gi, 'پایگاه‌داده برداری'],
  [/knowledge base/gi, 'پایگاه دانش'],
  [/chat interface/gi, 'رابط گفتگو'],
  [/desktop application/gi, 'برنامه دسکتاپ'],
  [/mobile application/gi, 'برنامه موبایل'],
  [/static site generator/gi, 'تولیدکننده سایت ایستا'],
  [/headless cms/gi, 'سیستم مدیریت محتوای بدون رابط'],
  [/authentication and authorization/gi, 'احراز هویت و مجوزدهی'],
  [/rate limiting/gi, 'محدودیت نرخ'],
  [/observability/gi, 'قابلیت مشاهده و پایش'],
  [/infrastructure as code/gi, 'زیرساخت به‌عنوان کد'],
  [/continuous integration/gi, 'یکپارچه‌سازی پیوسته'],
  [/continuous deployment/gi, 'استقرار پیوسته'],
];

const WORDS = [
  [/\bframework\b/gi, 'چارچوب'],
  [/\blibrary\b/gi, 'کتابخانه'],
  [/\bapplication\b/gi, 'برنامه'],
  [/\bplatform\b/gi, 'پلتفرم'],
  [/\btool(s)?\b/gi, 'ابزار'],
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
  [/\balternative\b/gi, 'جایگزین'],
  [/\blightweight\b/gi, 'سبک'],
  [/\bminimal\b/gi, 'حداقلی'],
  [/\bmodern\b/gi, 'مدرن'],
  [/\bsimple\b/gi, 'ساده'],
  [/\bcomplete\b/gi, 'کامل'],
  [/\bofficial\b/gi, 'رسمی'],
  [/\bbased on\b/gi, 'مبتنی بر'],
  [/\bwritten in\b/gi, 'نوشته‌شده با'],
  [/\bbuilt with\b/gi, 'ساخته‌شده با'],
  [/\bpowered by\b/gi, 'قدرت‌گرفته از'],
  [/\bsupports?\b/gi, 'پشتیبانی می‌کند از'],
  [/\bincludes?\b/gi, 'شامل'],
  [/\bprovides?\b/gi, 'ارائه می‌دهد'],
];

const PRESERVE = [
  'react','vue','angular','svelte','next.js','nextjs','nodejs','node.js','typescript','javascript',
  'python','rust','golang','kotlin','swift','dart','flutter','pytorch','tensorflow','jax',
  'docker','kubernetes','graphql','postgresql','mongodb','sqlite','redis','nginx',
  'openai','ollama','langchain','huggingface','godot','vscode','obsidian','comfyui',
  'stable diffusion','llm','rag','api','ui','gui','css','html','sql','cli','sdk','ide',
  'ios','android','macos','linux','windows','wasm','gpu','cpu','nlp','ocr','tts','stt',
  'ci/cd','devops','etl','iot','cad','rpg','pdf','svg','png','webp','json','yaml',
  'fastapi','django','express','spring','laravel','rails','astro','tailwind','supabase',
  'firebase','appwrite','pocketbase','n8n','zapier','git','github','gitlab',
  'atom','tree-sitter','raycast','penpot','immich','rustdesk','home assistant','dify',
  'open-webui','browser-use','excalidraw','draw.io','drawio','zed','svelte'
].sort((a, b) => b.length - a.length);

class Translator {
  constructor() {
    this.memCache = {};
    this.showOriginal = false;
    this._lsKey = 'gitrep26_desc_tr';
    this._loadMem();
  }

  _loadMem() {
    try {
      this.memCache = JSON.parse(localStorage.getItem(this._lsKey) || '{}');
    } catch { this.memCache = {}; }
  }

  _saveMem() {
    try {
      const keys = Object.keys(this.memCache);
      if (keys.length > 600) {
        keys.slice(0, keys.length - 500).forEach(k => delete this.memCache[k]);
      }
      localStorage.setItem(this._lsKey, JSON.stringify(this.memCache));
    } catch { /* quota */ }
  }

  translate(text) {
    if (!text || !text.trim()) return text;
    const key = text.trim();
    if (this.memCache[key]) return this.memCache[key];

    const preserved = [];
    let work = key;
    for (const term of PRESERVE) {
      const re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      work = work.replace(re, (m) => {
        const idx = preserved.length;
        preserved.push(m);
        return '__T' + idx + '__';
      });
    }

    for (const [re, fa] of PHRASES) work = work.replace(re, fa);
    for (const [re, fa] of WORDS) work = work.replace(re, fa);

    work = work.replace(/__T(\d+)__/g, (_, n) => preserved[parseInt(n, 10)] || '');
    work = work.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
    work = work.replace(/می ([^\s]+)/g, 'می‌$1');

    this.memCache[key] = work;
    this._saveMem();
    return work;
  }

  display(text, lang) {
    if (!text) return '';
    if (lang !== 'fa' || this.showOriginal) return text;
    return this.translate(text);
  }

  setShowOriginal(v) {
    this.showOriginal = !!v;
    localStorage.setItem('gitrep26_show_orig', this.showOriginal ? '1' : '0');
  }

  loadShowOriginal() {
    this.showOriginal = localStorage.getItem('gitrep26_show_orig') === '1' ||
      localStorage.getItem('gpe_show_orig_desc') === '1';
    return this.showOriginal;
  }
}

export const translator = new Translator();
window.translator = translator;
