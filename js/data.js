/* Seed catalogs, i18n, and starter library for Atelier */
const I18N = {
  en: {
    brandSub: "Prompt Engineering Studio",
    savedCount: "Saved prompts",
    offlineBadge: "Storage",
    offlineValue: "IndexedDB · offline",
    footer: "Fully offline. Nothing leaves this browser.",
    nav: { studio: "Builder", library: "Library", components: "Components", analyzer: "Analyzer", settings: "Settings" },
    pages: {
      studio: ["Compose", "Step-by-step prompt builder", "Define role, intent, constraints, and output. Atelier assembles a structured prompt you can score, improve, save, and version."],
      library: ["Library", "Prompt library", "Search, tag, duplicate, and organize every saved prompt. Each edit keeps a version history."],
      components: ["Parts", "Reusable components", "Role, objective, context, constraint, and output blocks you can insert into the builder."],
      analyzer: ["Review", "Prompt analyzer", "Paste any prompt for a quality score, gap list, and an offline improvement pass."],
      settings: ["System", "Studio settings", "Theme, language direction, and local data controls."]
    },
    steps: ["Role", "Intent", "Constraints", "Output", "Style", "Review"],
    fields: {
      category: "Category", role: "AI role", goal: "Goal", context: "Context",
      constraints: "Constraints", stack: "Technology stack", quality: "Quality requirements",
      format: "Output format", length: "Prompt length", customLines: "Custom lines",
      detail: "Detail level", model: "Target model", language: "Prompt language",
      style: "Prompt style", title: "Title", tags: "Tags (comma separated)", notes: "Builder notes"
    },
    generate: "Generate prompt", variations: "Variations", gaps: "Missing information", framework: "Framework", industry: "Industry", customRole: "Custom role", rules: "User rules", applyGap: "Apply suggestion", copy: "Copy", save: "Save", analyze: "Analyze", improve: "Improve",
    exportTxt: "TXT", exportMd: "Markdown", exportJson: "JSON", next: "Next", back: "Back",
    duplicate: "Duplicate", edit: "Edit", del: "Delete", restore: "Restore", history: "History",
    use: "Use in builder", insert: "Insert", favorite: "Favorite", search: "Search prompts…",
    all: "All", newComponent: "New component", saveComponent: "Save component",
    emptyLib: "No prompts yet. Assemble one in the builder and save it.",
    emptyComp: "No components in this filter.",
    score: "Quality score", suggestions: "Suggestions", improved: "Improved draft",
    apply: "Apply to builder", versions: "Version history", close: "Close",
    saved: "Saved to library", copied: "Copied", exported: "Exported", restored: "Version restored",
    deleted: "Deleted", imported: "Import complete", resetDone: "Local studio data cleared",
    lines: "lines", folder: "Folder",
    folders: { Inbox: "Inbox", Work: "Work", Archive: "Archive" },
    exportAll: "Export library JSON", importAll: "Import library JSON", reset: "Clear local data",
    confirmReset: "Erase all local prompts, components, and versions?",
    analyzerPh: "Paste a prompt to score…", run: "Score prompt",
    detailHelp: "Expert adds acceptance criteria, failure modes, and a verification step.",
    lengthHelp: "Targets approximate line count of the assembled prompt.",
    designTemplate: "Design template",
    designControls: "Design controls",
    templateClassic: "Classic",
    templateGlass: "Glass v2.01",
    templateClassicDesc: "Solid surfaces, crisp product look.",
    templateGlassDesc: "Frosted glass panels, deeper blur, brighter depth.",
    accentColor: "Accent color",
    accent2Color: "Secondary accent",
    radiusControl: "Corner radius",
    blurControl: "Glass blur",
    alphaControl: "Glass opacity",
    spaceControl: "Spacing density",
    elevControl: "Shadow strength",
    applyDesign: "Apply design",
    resetDesign: "Reset design",
    versionLabel: "Version"
  },
  fa: {
    brandSub: "استودیوی مهندسی پرامپت",
    savedCount: "پرامپت‌های ذخیره‌شده",
    offlineBadge: "ذخیره‌سازی",
    offlineValue: "IndexedDB · آفلاین",
    footer: "کاملاً آفلاین. هیچ داده‌ای از این مرورگر خارج نمی‌شود.",
    nav: { studio: "سازنده", library: "کتابخانه", components: "اجزا", analyzer: "تحلیل‌گر", settings: "تنظیمات" },
    pages: {
      studio: ["نگارش", "سازنده پرامپت", "نقش، هدف و محدودیت‌ها را مشخص کنید. پرامپت ساخت‌یافته در لحظه ساخته می‌شود تا ذخیره، امتیازدهی و بهبود دهید."],
      library: ["کتابخانه", "کتابخانه پرامپت", "جستجو، برچسب، تکثیر و سازمان‌دهی همه پرامپت‌ها. هر ویرایش تاریخچه نسخه دارد."],
      components: ["قطعات", "اجزای قابل استفاده مجدد", "بلوک‌های نقش، هدف، زمینه، محدودیت و خروجی که در سازنده درج می‌شوند."],
      analyzer: ["بازبینی", "تحلیل‌گر پرامپت", "هر پرامپتی را جای‌گذاری کنید تا امتیاز کیفیت، شکاف‌ها و بهبود آفلاین بگیرید."],
      settings: ["سامانه", "تنظیمات استودیو", "پوسته، جهت زبان و کنترل داده‌های محلی."]
    },
    steps: ["نقش", "نیت", "محدودیت", "خروجی", "سبک", "بازبینی"],
    fields: {
      category: "دسته", role: "نقش هوش مصنوعی", goal: "هدف", context: "زمینه",
      constraints: "محدودیت‌ها", stack: "پشته فناوری", quality: "الزامات کیفیت",
      format: "قالب خروجی", length: "طول پرامپت", customLines: "تعداد خط سفارشی",
      detail: "سطح جزئیات", model: "مدل مقصد", language: "زبان پرامپت",
      style: "سبک پرامپت", title: "عنوان", tags: "برچسب‌ها (با ویرگول)", notes: "یادداشت سازنده"
    },
    generate: "تولید پرامپت", variations: "گونه‌ها", gaps: "اطلاعات ناقص", framework: "چارچوب", industry: "صنعت", customRole: "نقش سفارشی", rules: "قواعد کاربر", applyGap: "اعمال پیشنهاد", copy: "رونوشت", save: "ذخیره", analyze: "تحلیل", improve: "بهبود",
    exportTxt: "TXT", exportMd: "مارک‌داون", exportJson: "JSON", next: "بعدی", back: "قبلی",
    duplicate: "تکثیر", edit: "ویرایش", del: "حذف", restore: "بازیابی", history: "تاریخچه",
    use: "استفاده در سازنده", insert: "درج", favorite: "علاقه‌مندی", search: "جستجوی پرامپت…",
    all: "همه", newComponent: "جزء جدید", saveComponent: "ذخیره جزء",
    emptyLib: "هنوز پرامپتی نیست. در سازنده بسازید و ذخیره کنید.",
    emptyComp: "جزئی در این فیلتر نیست.",
    score: "امتیاز کیفیت", suggestions: "پیشنهادها", improved: "پیش‌نویس بهبودیافته",
    apply: "اعمال در سازنده", versions: "تاریخچه نسخه", close: "بستن",
    saved: "در کتابخانه ذخیره شد", copied: "رونوشت شد", exported: "خروجی گرفته شد", restored: "نسخه بازیابی شد",
    deleted: "حذف شد", imported: "درون‌ریزی انجام شد", resetDone: "داده‌های محلی پاک شد",
    lines: "خط", folder: "پوشه",
    folders: { Inbox: "صندوق", Work: "کار", Archive: "بایگانی" },
    exportAll: "خروجی JSON کتابخانه", importAll: "درون‌ریزی JSON کتابخانه", reset: "پاک‌کردن داده محلی",
    confirmReset: "همه پرامپت‌ها، اجزا و نسخه‌ها پاک شوند؟",
    analyzerPh: "پرامپت را برای امتیازدهی اینجا بگذارید…", run: "امتیاز پرامپت",
    detailHelp: "سطح خبره معیار پذیرش، حالت شکست و گام راستی‌آزمایی اضافه می‌کند.",
    lengthHelp: "طول تقریبی پرامپت ساخته‌شده را هدف می‌گیرد.",
    designTemplate: "قالب طراحی",
    designControls: "کنترل‌های طراحی",
    templateClassic: "کلاسیک",
    templateGlass: "شیشه‌ای v2.01",
    templateClassicDesc: "سطوح مات و ظاهر محصولی واضح.",
    templateGlassDesc: "پنل‌های شیشه‌ای مات، بلور بیشتر و عمق روشن‌تر.",
    accentColor: "رنگ اصلی",
    accent2Color: "رنگ فرعی",
    radiusControl: "گردی گوشه‌ها",
    blurControl: "بلور شیشه",
    alphaControl: "شفافیت شیشه",
    spaceControl: "تراکم فاصله",
    elevControl: "قدرت سایه",
    applyDesign: "اعمال طراحی",
    resetDesign: "بازنشانی طراحی",
    versionLabel: "نسخه"
  }
};

const CATEGORIES = [
  { id: "coding", en: "Coding", fa: "برنامه‌نویسی" },
  { id: "design", en: "Design", fa: "طراحی" },
  { id: "ai", en: "AI", fa: "هوش مصنوعی" },
  { id: "business", en: "Business", fa: "کسب‌وکار" },
  { id: "writing", en: "Writing", fa: "نوشتن" },
  { id: "analysis", en: "Analysis", fa: "تحلیل" },
  { id: "marketing", en: "Marketing", fa: "بازاریابی" },
  { id: "gamedev", en: "Game Development", fa: "توسعه بازی" }
];

const ROLES = [
  { id: "developer", en: "Senior Developer", fa: "توسعه‌دهنده ارشد" },
  { id: "designer", en: "Product Designer", fa: "طراح محصول" },
  { id: "analyst", en: "Analyst", fa: "تحلیل‌گر" },
  { id: "researcher", en: "Researcher", fa: "پژوهشگر" },
  { id: "pm", en: "Product Manager", fa: "مدیر محصول" },
  { id: "writer", en: "Editor & Writer", fa: "ویراستار و نویسنده" },
  { id: "architect", en: "Software Architect", fa: "معمار نرم‌افزار" },
  { id: "qa", en: "QA Engineer", fa: "مهندس کیفیت" },
  { id: "data", en: "Data Scientist", fa: "دانشمند داده" },
  { id: "gamedesigner", en: "Game Designer", fa: "طراح بازی" },
  { id: "marketer", en: "Marketing Strategist", fa: "استراتژیست بازاریابی" },
  { id: "educator", en: "Educator", fa: "مربی" }
];

const MODELS = [
  { id: "chatgpt", en: "ChatGPT", fa: "ChatGPT" },
  { id: "claude", en: "Claude", fa: "Claude" },
  { id: "gemini", en: "Gemini", fa: "Gemini" },
  { id: "midjourney", en: "Midjourney", fa: "Midjourney" },
  { id: "codingai", en: "Coding AI", fa: "هوش مصنوعی کدنویسی" }
];

const DETAILS = [
  { id: "basic", en: "Basic", fa: "پایه" },
  { id: "advanced", en: "Advanced", fa: "پیشرفته" },
  { id: "expert", en: "Expert", fa: "خبره" }
];

const STYLES = [
  { id: "professional", en: "Professional", fa: "حرفه‌ای" },
  { id: "expert", en: "Expert", fa: "خبره" },
  { id: "creative", en: "Creative", fa: "خلاق" },
  { id: "technical", en: "Technical", fa: "فنی" },
  { id: "research", en: "Research", fa: "پژوهشی" },
  { id: "production", en: "Production Ready", fa: "آماده تولید" },
  { id: "formal", en: "Formal", fa: "رسمی" },
  { id: "educational", en: "Educational", fa: "آموزشی" }
];

function seedProfiles() {
  return [
    { title: "Staff backend", body: "You are a staff backend engineer. You protect data contracts, operability, and reversible migrations.", domain: "coding" },
    { title: "Security reviewer", body: "You are an application security reviewer. You look for trust boundaries, auth gaps, and data exposure.", domain: "coding" },
    { title: "Product researcher", body: "You are a product researcher. You separate observation from interpretation and refuse invented quotes.", domain: "analysis" },
    { title: "Launch editor", body: "You are a launch editor. You cut hype, keep proof, and write for a named audience.", domain: "marketing" }
  ];
}

const LANGS = [
  { id: "en", en: "English", fa: "انگلیسی" },
  { id: "fa", en: "Persian", fa: "فارسی" },
  { id: "bi", en: "Bilingual", fa: "دوزبانه" }
];

const LENGTHS = [5, 10, 15, 30, "custom"];

const COMPONENT_TYPES = ["role", "objective", "context", "constraints", "output"];

function seedPrompts() {
  return [
    {
      title: "Refactor a legacy module safely",
      category: "coding",
      tags: ["refactor", "tests", "risk"],
      folder: "Work",
      favorite: true,
      body: `# Role
You are a staff engineer reviewing a legacy module before a behavior-preserving refactor.

# Objective
Propose a refactor plan that keeps external behavior identical while reducing coupling.

# Context
The module mixes I/O, domain rules, and presentation. Tests are thin. Deployment is weekly.

# Constraints
- Do not change public API signatures.
- Prefer small commits with characterization tests first.
- Call out any behavior you cannot prove.

# Output
1. Risk map
2. Characterization tests to add
3. Ordered refactor steps
4. Rollback note`
    },
    {
      title: "Design critique for a checkout flow",
      category: "design",
      tags: ["ux", "checkout", "critique"],
      folder: "Work",
      favorite: false,
      body: `# Role
You are a product designer reviewing a checkout flow.

# Objective
Identify friction, trust gaps, and accessibility issues, then propose a tighter flow.

# Output
- Findings ranked by severity
- Revised step sequence
- Copy suggestions for error states
- What not to change`
    },
    {
      title: "System prompt for a research assistant",
      category: "ai",
      tags: ["system-prompt", "citations"],
      folder: "Inbox",
      favorite: true,
      body: `# Role
You are a careful research assistant. Distinguish evidence from inference.

# Rules
- Cite the source of every non-obvious claim.
- If sources conflict, show both.
- Never invent quotations or statistics.
- End with open questions.`
    },
    {
      title: "One-page decision memo",
      category: "business",
      tags: ["memo", "decision"],
      folder: "Work",
      favorite: false,
      body: `# Role
You are a chief of staff drafting a decision memo for an executive.

# Output
- Decision requested
- Options with costs, risks, and reversibility
- Recommendation and what would change your mind
- 5-line brief at the top`
    },
    {
      title: "Editorial pass on a technical essay",
      category: "writing",
      tags: ["edit", "clarity"],
      folder: "Inbox",
      favorite: false,
      body: `# Role
You are an editor who respects the author's voice.

# Objective
Improve clarity, structure, and rhythm without inflating the tone.

# Output
Revised draft, then a short list of cuts and why.`
    },
    {
      title: "Metric autopsy",
      category: "analysis",
      tags: ["metrics", "diagnosis"],
      folder: "Work",
      favorite: false,
      body: `# Role
You are an analyst investigating a metric move.

# Objective
Separate seasonality, mix shift, tracking bugs, and real behavior change.

# Output
Hypotheses ranked, data needed to confirm each, and a decision threshold.`
    },
    {
      title: "Launch narrative",
      category: "marketing",
      tags: ["launch", "positioning"],
      folder: "Inbox",
      favorite: false,
      body: `# Role
You are a marketing strategist writing a launch narrative.

# Constraints
No superlatives without proof. Name the audience and the job to be done.

# Output
Positioning line, three proof points, objection handling, and a 80-word announcement.`
    },
    {
      title: "Encounter design brief",
      category: "gamedev",
      tags: ["encounter", "pacing"],
      folder: "Work",
      favorite: true,
      body: `# Role
You are a game designer balancing a boss encounter.

# Objective
Specify phases, tells, failure states, and a readable difficulty curve.

# Output
Phase table, player verbs used, and what the encounter teaches.`
    }
  ];
}

function seedComponents() {
  return [
    { type: "role", title: "Staff engineer", body: "You are a staff software engineer. You optimize for maintainability, explicit tradeoffs, and reversible decisions." },
    { type: "role", title: "Skeptical reviewer", body: "You are a skeptical reviewer. You look for hidden assumptions, missing edge cases, and claims that outrun evidence." },
    { type: "objective", title: "Behavior-preserving change", body: "Deliver a plan that preserves observable behavior while improving structure. Prove preservation with tests or a diff rationale." },
    { type: "objective", title: "Decision-ready brief", body: "Produce a brief a busy decision-maker can act on in under three minutes, with the recommendation first." },
    { type: "context", title: "Legacy constraints", body: "The system is in production, releases weekly, and public contracts cannot break. Observability is partial." },
    { type: "context", title: "Early-stage product", body: "The product has a small team, incomplete analytics, and users who abandon on friction rather than missing features." },
    { type: "constraints", title: "No invention", body: "Do not invent metrics, citations, APIs, or user quotes. Mark unknowns explicitly." },
    { type: "constraints", title: "Scope lock", body: "Stay inside the stated scope. List out-of-scope ideas in a separate parking lot, max five items." },
    { type: "output", title: "Structured report", body: "Use headings, then bullets. Lead with the answer. Close with risks and a verification step." },
    { type: "output", title: "Midjourney frame", body: "Output a single prompt line: subject, setting, lighting, lens, material, mood, and negative constraints. No explanation." }
  ];
}
