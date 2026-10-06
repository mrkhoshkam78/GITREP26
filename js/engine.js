/* Atelier Prompt Engine v3 — deep offline analysis & structured generation
   Pipeline: enrich → analyze → decide structure → layers → optimize → variations
   Public API: composePrompt, analyzePrompt, improvePrompt, label, heading, PromptEngine
*/

const STYLE_GUIDES = {
  professional: {
    en: "Use a calm professional register. Prefer decisions and tradeoffs over decoration.",
    fa: "لحن حرفه‌ای و آرام داشته باش. تصمیم و بده‌بستان را بر تزئین ترجیح بده."
  },
  expert: {
    en: "Write as a senior domain expert. Name invariants, rejection criteria, and what you would refuse.",
    fa: "مثل متخصص ارشد حوزه بنویس. ناوردها، معیار رد و چیزهایی که نمی‌پذیری را نام ببر."
  },
  creative: {
    en: "Offer inventive options, each anchored to a constraint so they remain shippable.",
    fa: "گزینه‌های خلاق بده؛ هر کدام را به یک محدودیت وصل کن تا قابل اجرا بمانند."
  },
  technical: {
    en: "Be precise and mechanism-first. Explicitly state interfaces, failure modes, and tradeoffs.",
    fa: "دقیق و سازوکارمحور باش. رابط‌ها، حالت‌های شکست و بده‌بستان‌ها را صریح بگو."
  },
  research: {
    en: "Separate evidence, inference, and open questions. Never invent sources or statistics.",
    fa: "شواهد، استنباط و سؤال‌های باز را جدا کن. منبع یا آمار نساز."
  },
  production: {
    en: "Optimize for production readiness: owners, rollout, rollback, and verification signals.",
    fa: "برای آمادگی تولید بهینه کن: مسئول، انتشار، بازگشت و نشانه‌های راستی‌آزمایی."
  },
  formal: {
    en: "Use formal register. Avoid slang, hype, and unearned superlatives.",
    fa: "لحن رسمی داشته باش. از عامیانه، اغراق و صفت‌های بی‌پشتوانه پرهیز کن."
  },
  educational: {
    en: "Teach the reasoning path. Define terms before using them and show one worked example when useful.",
    fa: "مسیر استدلال را آموزش بده. اصطلاح‌ها را پیش از استفاده تعریف کن و در صورت نیاز یک مثال کارشده بیاور."
  }
};

const MODEL_GUIDES = {
  chatgpt: {
    en: "Structure the answer with clear Markdown sections and an explicit definition of done.",
    fa: "پاسخ را با بخش‌های مارک‌داون روشن و تعریف صریح تمام‌شدن بنویس."
  },
  claude: {
    en: "Reason briefly, then decide. Flag uncertainty instead of padding confidence.",
    fa: "کوتاه استدلال کن، سپس تصمیم بگیر. به‌جای اعتماد جعلی، عدم‌قطعیت را علامت بزن."
  },
  gemini: {
    en: "Use checkable bullets. Prefer claims that can be verified against the given context.",
    fa: "از گلوله‌های قابل‌بررسی استفاده کن. ادعاهایی را ترجیح بده که با زمینهٔ داده‌شده قابل تأییدند."
  },
  midjourney: {
    en: "Favor concrete visual tokens: subject, setting, lighting, lens, material, mood, and negatives.",
    fa: "نشانه‌های بصری مشخص بده: سوژه، صحنه، نور، لنز، جنس، حال‌وهوا و موارد منفی."
  },
  codingai: {
    en: "Name files to touch, invariants, tests to add, and a strict do-not-change list.",
    fa: "فایل‌های درگیر، ناوردها، آزمون‌های لازم و فهرست سخت چیزهایی که نباید عوض شوند را نام ببر."
  }
};

const INDUSTRIES = [
  { id: "general", en: "General", fa: "عمومی" },
  { id: "saas", en: "SaaS", fa: "ساس" },
  { id: "fintech", en: "Fintech", fa: "فین‌تک" },
  { id: "health", en: "Health", fa: "سلامت" },
  { id: "education", en: "Education", fa: "آموزش" },
  { id: "commerce", en: "Commerce", fa: "تجارت" },
  { id: "game", en: "Games", fa: "بازی" }
];

const FRAMEWORKS = {
  coding: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "architecture", en: "Architecture", fa: "معماری" },
    { id: "stack", en: "Tech stack", fa: "پشته" },
    { id: "features", en: "Features", fa: "قابلیت‌ها" },
    { id: "security", en: "Security", fa: "امنیت" },
    { id: "performance", en: "Performance", fa: "کارایی" },
    { id: "testing", en: "Testing", fa: "آزمون" },
    { id: "deployment", en: "Deployment", fa: "استقرار" }
  ],
  design: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "critique", en: "Critique", fa: "نقد" },
    { id: "system", en: "Design system", fa: "سیستم طراحی" },
    { id: "flow", en: "Flow", fa: "جریان" }
  ],
  ai: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "system", en: "System prompt", fa: "پرامپت سیستم" },
    { id: "eval", en: "Evaluation", fa: "ارزیابی" }
  ],
  business: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "decision", en: "Decision memo", fa: "یادداشت تصمیم" },
    { id: "strategy", en: "Strategy", fa: "استراتژی" }
  ],
  writing: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "edit", en: "Editorial", fa: "ویرایش" },
    { id: "draft", en: "Draft", fa: "پیش‌نویس" }
  ],
  analysis: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "diagnosis", en: "Diagnosis", fa: "تشخیص" },
    { id: "compare", en: "Comparison", fa: "مقایسه" }
  ],
  marketing: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "positioning", en: "Positioning", fa: "جایگاه‌سازی" },
    { id: "launch", en: "Launch", fa: "عرضه" }
  ],
  gamedev: [
    { id: "auto", en: "Auto", fa: "خودکار" },
    { id: "encounter", en: "Encounter", fa: "رویارویی" },
    { id: "loop", en: "Core loop", fa: "حلقه اصلی" }
  ]
};

const INDUSTRY_RULES = {
  general: { en: "Use only the provided context. Mark unknowns explicitly.", fa: "فقط از زمینهٔ داده‌شده استفاده کن. ناشناخته‌ها را صریح علامت بزن." },
  saas: { en: "Assume multi-tenant SaaS: plan limits, audit trails, and onboarding friction matter.", fa: "ساس چندمستأجری فرض کن: محدودیت پلن، رد ممیزی و اصطکاک ورود اهمیت دارد." },
  fintech: { en: "Assume money movement. Require idempotency, reconciliation, and no invented balances.", fa: "جابه‌جایی پول فرض کن. ایدمپوتنسی، تطبیق حساب و عدم ساخت موجودی الزامی است." },
  health: { en: "Avoid diagnostic claims. Prefer privacy, consent, and clinician review where relevant.", fa: "از ادعای تشخیصی پرهیز کن. حریم خصوصی، رضایت و بازبینی بالینی را در نظر بگیر." },
  education: { en: "Teach with a worked example when useful. Define terms before jargon.", fa: "در صورت نیاز با مثال کارشده آموزش بده. پیش از اصطلاح تخصصی تعریف کن." },
  commerce: { en: "Protect checkout trust: price clarity, error recovery, and inventory honesty.", fa: "اعتماد پرداخت را حفظ کن: شفافیت قیمت، بازیابی خطا و صداقت موجودی." },
  game: { en: "Protect readability of the player verb. Name fantasy, failure state, and teaching goal.", fa: "خوانایی فعل بازیکن را حفظ کن. فانتزی، حالت شکست و هدف آموزشی را نام ببر." }
};

function label(list, id, lang) {
  const item = (list || []).find((x) => x.id === id);
  if (!item) return id || "";
  if (lang === "fa") return item.fa || item.en;
  if (lang === "bi") return item.en + " / " + item.fa;
  return item.en;
}

function heading(en, fa, lang) {
  if (lang === "fa") return fa;
  if (lang === "bi") return en + " / " + fa;
  return en;
}

function prefsOf(draft) {
  const stored = (draft && draft.preferences) || (typeof localStorage !== "undefined" ? safeJson(localStorage.getItem("atelier-prefs")) : null) || {};
  return { rules: stored.rules || "", banned: stored.banned || "", always: stored.always || "" };
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function blobOf(draft) {
  return [draft.goal, draft.context, draft.constraints, draft.stack, draft.quality, draft.format, draft.notes, draft.customRole]
    .filter(Boolean).join("\n");
}

/* ---------- Deep analysis ---------- */

function extractSignals(text) {
  const t = String(text || "").toLowerCase();
  return {
    verbs: {
      build: /\b(build|create|implement|develop|بساز|پیاده‌سازی|توسعه)\b/.test(t),
      refactor: /\b(refactor|rewrite|migrate|بازنویسی|مهاجرت)\b/.test(t),
      review: /\b(review|critique|audit|بازبینی|نقد)\b/.test(t),
      design: /\b(design|ux|ui|wireframe|طراحی)\b/.test(t),
      analyze: /\b(analyze|diagnose|investigate|تحلیل|تشخیص)\b/.test(t),
      write: /\b(write|draft|edit|copy|بنویس|ویرایش)\b/.test(t),
      plan: /\b(plan|roadmap|strategy|برنامه|نقشه|استراتژی)\b/.test(t),
      test: /\b(test|qa|verify|آزمون|تست)\b/.test(t),
      secure: /\b(secur|auth|oauth|encrypt|امن|احراز)\b/.test(t),
      deploy: /\b(deploy|release|rollout|استقرار|انتشار)\b/.test(t),
      optimize: /\b(optim|performance|latency|بهینه|کارایی|تأخیر)\b/.test(t)
    },
    tech: {
      frontend: /\b(react|vue|angular|next\.?js|svelte|css|html|frontend)\b/.test(t),
      backend: /\b(node|express|django|fastapi|spring|go|rust|backend|api)\b/.test(t),
      data: /\b(sql|postgres|mysql|mongo|redis|kafka|etl)\b/.test(t),
      mobile: /\b(ios|android|swift|kotlin|flutter|react native)\b/.test(t),
      cloud: /\b(aws|gcp|azure|kubernetes|docker|serverless)\b/.test(t)
    },
    audience: /\b(user|customer|executive|developer|player|student|کاربر|مشتری|مدیر|بازیکن|دانشجو)\b/.test(t),
    metrics: /\d|%\b|kpi|sla|latency|throughput|درصد|میلی‌ثانیه/.test(t),
    scope: /\b(must not|do not|without|نباید|ممنوع|بدون)\b/.test(t)
  };
}

function inferDeliverable(goal, category, signals) {
  const g = (goal || "").toLowerCase();
  if (signals.verbs.refactor) return { en: "behavior-preserving refactor plan", fa: "برنامه بازنویسی با حفظ رفتار" };
  if (signals.verbs.test) return { en: "test strategy and cases", fa: "استراتژی و موارد آزمون" };
  if (signals.verbs.secure) return { en: "security review with prioritized findings", fa: "بازبینی امنیتی با یافته‌های اولویت‌دار" };
  if (signals.verbs.deploy) return { en: "rollout and rollback plan", fa: "برنامه انتشار و بازگشت" };
  if (signals.verbs.design) return { en: "design critique with revised flow", fa: "نقد طراحی با جریان اصلاح‌شده" };
  if (signals.verbs.analyze) return { en: "ranked diagnosis with next measurements", fa: "تشخیص رتبه‌بندی‌شده با اندازه‌گیری بعدی" };
  if (signals.verbs.plan) return { en: "decision-ready plan", fa: "برنامه آماده تصمیم" };
  if (signals.verbs.write) return { en: "polished draft with rationale", fa: "پیش‌نویس پرداخته با استدلال" };
  const byCat = {
    coding: { en: "implementation plan with tests", fa: "برنامه پیاده‌سازی همراه آزمون" },
    design: { en: "UX findings and recommendations", fa: "یافته‌ها و توصیه‌های تجربه کاربری" },
    ai: { en: "system prompt or evaluation rubric", fa: "پرامپت سیستم یا چارچوب ارزیابی" },
    business: { en: "executive decision memo", fa: "یادداشت تصمیم مدیریتی" },
    writing: { en: "edited draft", fa: "پیش‌نویس ویرایش‌شده" },
    analysis: { en: "analytical brief", fa: "خلاصه تحلیلی" },
    marketing: { en: "positioning and launch narrative", fa: "جایگاه‌سازی و روایت عرضه" },
    gamedev: { en: "game design brief", fa: "خلاصه طراحی بازی" }
  };
  return byCat[category] || { en: "structured professional answer", fa: "پاسخ حرفه‌ای ساخت‌یافته" };
}

function scoreComplexity(draft, signals) {
  let score = 1;
  const goal = (draft.goal || "").trim();
  if (goal.split(/\s+/).length > 20) score += 1;
  if (draft.stack) score += 1;
  if (draft.constraints) score += 1;
  if (signals.verbs.refactor || signals.verbs.secure || signals.verbs.deploy) score += 1;
  if (draft.detail === "expert") score += 2;
  if (draft.detail === "basic") score = Math.max(1, score - 1);
  return Math.min(5, score);
}

function enrichGoal(goal, category, lang) {
  const g = (goal || "").trim();
  if (!g) {
    return lang === "fa"
      ? "یک نتیجهٔ نهایی مشخص، قابل‌بررسی و قابل‌تحویل برای مخاطب نام‌برده تولید کن."
      : "Produce a specific, checkable, finished deliverable for the named audience.";
  }
  if (g.split(/\s+/).length >= 8) return g;
  const boost = {
    coding: lang === "fa"
      ? " با حفظ رفتار بیرونی، آزمون‌های لازم و فهرست چیزهایی که نباید تغییر کنند."
      : " Preserve external behavior, include required tests, and list what must not change.",
    design: lang === "fa"
      ? " یافته‌ها را بر اساس آسیب کاربر رتبه‌بندی کن و یک جریان جایگزین فشرده پیشنهاد بده."
      : " Rank findings by user harm and propose one tighter alternative flow.",
    business: lang === "fa"
      ? " گزینه‌ها را با هزینه، ریسک و برگشت‌پذیری مقایسه کن و توصیه را اول بنویس."
      : " Compare options on cost, risk, and reversibility; lead with the recommendation.",
    analysis: lang === "fa"
      ? " فرضیه‌ها را بر اساس هزینهٔ آزمون رتبه‌بندی کن و آستانهٔ تصمیم را مشخص کن."
      : " Rank hypotheses by cost to test and state a decision threshold.",
    marketing: lang === "fa"
      ? " مخاطب، شغل‌به‌انجام و سه نقطهٔ اثبات را بدون اغراق مشخص کن."
      : " Name the audience, job-to-be-done, and three proof points without hype."
  };
  return g + (boost[category] || (lang === "fa"
    ? " نتیجه را قابل اقدام و قابل‌بررسی تحویل بده."
    : " Deliver an actionable, checkable outcome."));
}

function understand(draft) {
  const blob = blobOf(draft);
  const goal = (draft.goal || "").trim();
  const signals = extractSignals(blob);
  const complexity = scoreComplexity(draft, signals);
  const deliverable = inferDeliverable(goal, draft.category, signals);
  return {
    words: blob.trim() ? blob.trim().split(/\s+/).length : 0,
    goalWords: goal ? goal.split(/\s+/).length : 0,
    signals,
    complexity,
    deliverable,
    audience: signals.audience,
    metrics: signals.metrics,
    stackKnown: !!(draft.stack && draft.stack.trim()) || Object.values(signals.tech).some(Boolean),
    hasConstraint: !!(draft.constraints && draft.constraints.trim()) || signals.scope,
    hasFormat: !!(draft.format && draft.format.trim()),
    hasContext: !!(draft.context && draft.context.trim()),
    hasQuality: !!(draft.quality && draft.quality.trim()),
    vague: /\b(thing|stuff|good|nice|better|various|some|etc|چیز|خوب|مختلف)\b/i.test(blob),
    ambiguous: /\b(it|this|that|they|something|این|آن)\b/i.test(goal) && goal.split(/\s+/).length < 12
  };
}

function selectFramework(draft) {
  const list = FRAMEWORKS[draft.category] || FRAMEWORKS.coding;
  if (draft.framework && draft.framework !== "auto") return draft.framework;
  const s = extractSignals(blobOf(draft)).verbs;
  if (draft.category === "coding") {
    if (s.secure) return "security";
    if (s.optimize) return "performance";
    if (s.test) return "testing";
    if (s.deploy) return "deployment";
    if (s.refactor) return "architecture";
    if (s.build) return "features";
    if (draft.stack) return "stack";
  }
  if (draft.category === "design") return s.design ? "flow" : "critique";
  if (draft.category === "business") return "decision";
  if (draft.category === "analysis") return "diagnosis";
  if (draft.category === "marketing") return s.plan ? "launch" : "positioning";
  if (draft.category === "ai") return "system";
  if (draft.category === "gamedev") return "encounter";
  if (draft.category === "writing") return "edit";
  return list[1] ? list[1].id : "auto";
}

function detectGaps(draft, insight) {
  const gaps = [];
  const add = (id, en, fa, severity) => gaps.push({ id, en, fa, severity });
  if (insight.goalWords < 5) add("goal", "Goal is too thin to steer a strong prompt.", "هدف برای هدایت پرامپت قوی کافی نیست.", "high");
  if (!insight.hasContext) add("context", "Context is missing (audience, system state, or environment).", "زمینه نیست (مخاطب، وضعیت سامانه یا محیط).", "high");
  if (!insight.audience) add("audience", "No audience is named for the output.", "مخاطب خروجی نام برده نشده.", "medium");
  if (!insight.hasConstraint) add("constraints", "Constraints are missing; the model may wander.", "محدودیت نیست؛ مدل ممکن است منحرف شود.", "high");
  if (!insight.hasFormat) add("format", "Output format is unspecified.", "قالب خروجی مشخص نیست.", "medium");
  if (!insight.hasQuality) add("quality", "No quality bar or acceptance criteria.", "میله کیفیت یا معیار پذیرش نیست.", "medium");
  if (draft.category === "coding" && !insight.stackKnown) add("stack", "Coding task has no technology stack.", "کار کدنویسی پشته فناوری ندارد.", "high");
  if (insight.vague) add("vague", "Vague filler weakens the instruction.", "کلمات مبهم دستور را ضعیف می‌کنند.", "medium");
  if (insight.ambiguous) add("ambiguous", "Goal uses unclear references without a concrete noun.", "هدف ارجاع مبهم دارد.", "medium");
  if (draft.model === "midjourney" && !/light|lens|style|نور|لنز/.test(blobOf(draft))) {
    add("visual", "Image prompt lacks lighting, lens, or medium cues.", "پرامپت تصویر نور، لنز یا مدیوم ندارد.", "medium");
  }
  return gaps;
}

function suggestionsFor(gaps) {
  const map = {
    goal: { en: "Rewrite the goal with a verb, object, and finished outcome.", fa: "هدف را با فعل، شیء و نتیجه تمام‌شده بنویس." },
    context: { en: "Add audience, current state, and environment limits.", fa: "مخاطب، وضع فعلی و محدودیت محیط را اضافه کن." },
    audience: { en: "Name who reads the output and what decision they make.", fa: "بگو چه کسی می‌خواند و چه تصمیمی می‌گیرد." },
    constraints: { en: "Add at least three concrete do-not rules.", fa: "حداقل سه ممنوعیت مشخص اضافه کن." },
    format: { en: "Specify headings and answer order.", fa: "عناوین و ترتیب پاسخ را مشخص کن." },
    quality: { en: "Add a checkable acceptance criterion.", fa: "معیار پذیرش قابل‌بررسی اضافه کن." },
    stack: { en: "Name language, framework, and datastore.", fa: "زبان، فریم‌ورک و محل داده را نام ببر." },
    vague: { en: "Replace vague words with measurable criteria.", fa: "کلمات مبهم را با معیار قابل‌اندازه‌گیری عوض کن." },
    ambiguous: { en: "Replace this/it with the specific noun.", fa: "ارجاع مبهم را با اسم مشخص عوض کن." },
    visual: { en: "Add lighting, lens, and material to the goal.", fa: "نور، لنز و جنس را به هدف اضافه کن." }
  };
  return gaps.map((g) => ({
    id: g.id,
    en: (map[g.id] || { en: "Make this more specific." }).en,
    fa: (map[g.id] || { fa: "این بخش را مشخص‌تر کن." }).fa,
    severity: g.severity
  }));
}

/* ---------- Category intelligence packs ---------- */

function technicalRequirements(draft, insight, lang) {
  const fa = lang === "fa";
  const fw = selectFramework(draft);
  const lines = [];
  const packs = {
    architecture: fa
      ? ["مرز ماژول‌ها و مالکیت کد را مشخص کن.", "وابستگی‌هایی که نباید افزایش یابند را نام ببر.", "ساختار برگشت‌پذیر را بر انتزاع پیچیده ترجیح بده."]
      : ["State module boundaries and ownership.", "Name coupling you refuse to increase.", "Prefer reversible structure over clever abstraction."],
    stack: fa
      ? ["در پشتهٔ اعلام‌شده بمان مگر مانعی جدی باشد.", "بدون دلیل یک‌خطی وابستگی جدید اضافه نکن.", "از قراردادهای موجود پروژه پیروی کن."]
      : ["Stay inside the named stack unless blocked.", "Do not add a dependency without a one-line reason.", "Match existing project conventions."],
    features: fa
      ? ["هدف را به برش‌های قابل انتشار تقسیم کن.", "هر قابلیت باید نتیجهٔ قابل‌مشاهده و محدودهٔ خارج از هدف داشته باشد.", "وابستگی بین برش‌ها را علامت بزن."]
      : ["Slice into shippable increments.", "Each feature needs a user-visible outcome and a non-goal.", "Flag cross-slice dependencies."],
    security: fa
      ? ["ورودی را غیرقابل‌اعتماد فرض کن.", "احراز هویت، مجوز، اسرار و ریسک افشا را نام ببر.", "امنیت از طریق پنهان‌کاری پیشنهاد نکن."]
      : ["Treat all input as untrusted.", "Name authn/authz, secrets, and exposure risks.", "Reject security-through-obscurity."],
    performance: fa
      ? ["بودجهٔ تأخیر، حافظه یا هزینه را مشخص کن.", "فقط پس از یافتن مسیر داغ بهینه کن.", "نحوهٔ اندازه‌گیری را بنویس."]
      : ["Name the latency, memory, or cost budget.", "Optimize only after identifying the hot path.", "State how success will be measured."],
    testing: fa
      ? ["پیش از تغییر رفتار، آزمون توصیف‌گر بنویس.", "مسیر شکست را هم پوشش بده.", "آنچه هنوز آزمون نشده را اعلام کن."]
      : ["Add characterization tests before behavior change.", "Cover failure paths, not only the happy path.", "State what remains untested."],
    deployment: fa
      ? ["انتشار تدریجی، پرچم ویژگی و بازگشت را مشخص کن.", "نشانهٔ ایمن‌بودن تغییر را نام ببر.", "از انتشار یک‌باره بزرگ پرهیز کن."]
      : ["Specify progressive rollout, feature flag, and rollback.", "Name the signal that proves safety.", "Avoid big-bang releases."]
  };
  if (packs[fw]) lines.push(...packs[fw]);
  else {
    lines.push(fa ? "در محدودهٔ هدف بمان و واقعیت را از توصیه جدا کن." : "Stay inside the stated goal; separate facts from recommendations.");
  }
  if (draft.stack && draft.stack.trim() && draft.model !== "midjourney") {
    lines.push(fa ? "پشتهٔ فناوری الزامی: " + draft.stack.trim() : "Required technology stack: " + draft.stack.trim());
  }
  Object.entries(insight.signals.tech).forEach(([k, on]) => {
    if (on) lines.push(fa ? "حوزهٔ فنی تشخیص‌داده‌شده: " + k : "Detected technical domain: " + k);
  });
  return uniqueLines(lines);
}

function featureLines(draft, insight, lang) {
  const fa = lang === "fa";
  const goal = (draft.goal || "").trim();
  const lines = [];
  if (!goal) {
    return [fa ? "قابلیت‌ها پس از تکمیل هدف استخراج می‌شوند." : "Features will be derived once the goal is complete."];
  }
  // Derive feature-like slices from goal clauses
  const parts = goal.split(/[.;،]|\band\b|\bو\b/i).map((s) => s.trim()).filter((s) => s.length > 8);
  if (parts.length > 1) {
    parts.slice(0, 5).forEach((p, i) => {
      lines.push(fa ? (i + 1) + ". " + p : (i + 1) + ". " + p);
    });
  } else {
    lines.push(fa ? "1. تحویل نتیجهٔ اصلی هدف" : "1. Deliver the primary goal outcome");
    if (insight.signals.verbs.test || draft.category === "coding") {
      lines.push(fa ? "2. پوشش آزمون برای مسیر موفق و شکست" : "2. Test coverage for success and failure paths");
    }
    if (insight.signals.verbs.secure || selectFramework(draft) === "security") {
      lines.push(fa ? "3. بررسی مرز اعتماد و داده‌های حساس" : "3. Review trust boundaries and sensitive data");
    }
    if (insight.complexity >= 3) {
      lines.push(fa ? "4. مستندسازی ریسک‌ها و فرض‌ها" : "4. Document risks and assumptions");
    }
  }
  return uniqueLines(lines);
}

function workflowLines(detail, lang) {
  const fa = lang === "fa";
  if (detail === "basic") {
    return fa
      ? ["1. مستقیماً به هدف پاسخ بده.", "2. بزرگ‌ترین ریسک را در یک جمله بنویس."]
      : ["1. Answer the goal directly.", "2. State the single largest risk in one sentence."];
  }
  if (detail === "expert") {
    return fa
      ? [
        "1. هدف را در یک خط بازنویسی کن و فرض‌ها را فهرست کن.",
        "2. تحویل‌پذیر را بساز.",
        "3. ناشناخته‌ها را از توصیه‌ها جدا کن.",
        "4. گام راستی‌آزمایی و مسیر بازگشت یا مخالفت را اضافه کن.",
        "5. وقتی معیار پذیرش برآورده شد متوقف شو."
      ]
      : [
        "1. Restate the goal in one line and list assumptions.",
        "2. Produce the deliverable.",
        "3. Separate unknowns from recommendations.",
        "4. Add verification and a rollback or dissent path.",
        "5. Stop when acceptance criteria are met."
      ];
  }
  return fa
    ? ["1. فرض‌ها را فهرست کن.", "2. تحویل‌پذیر را تولید کن.", "3. ریسک‌ها و ناشناخته‌ها را جدا کن."]
    : ["1. List assumptions.", "2. Produce the deliverable.", "3. Separate risks and unknowns."];
}

function uniqueLines(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function roleLine(draft, lang) {
  if (draft.customRole && draft.customRole.trim()) return draft.customRole.trim();
  if (draft.profile && draft.profile.body) return draft.profile.body;
  const roleName = label(ROLES, draft.role, lang);
  const catName = label(CATEGORIES, draft.category, lang);
  if (lang === "fa") {
    return "تو یک " + roleName + " باتجربه در حوزهٔ " + catName + " هستی. فرض‌های پنهان را آشکار کن، کلی‌گویی را رد کن، و فقط بر اساس زمینهٔ داده‌شده تصمیم بگیر.";
  }
  if (lang === "bi") {
    return "You are a " + label(ROLES, draft.role, "en") + " in " + label(CATEGORIES, draft.category, "en") + ".\nتو یک " + label(ROLES, draft.role, "fa") + " در حوزهٔ " + label(CATEGORIES, draft.category, "fa") + " هستی.";
  }
  return "You are a " + roleName + " working in " + catName + ". Surface hidden assumptions, reject vague advice, and decide only from the given context.";
}

function defaultFormat(draft, insight, lang) {
  const fa = lang === "fa";
  if (draft.model === "midjourney") {
    return fa
      ? "یک خط پرامپت بصری: سوژه، صحنه، نور، لنز، جنس، حال‌وهوا، محدودیت‌های منفی. بدون توضیح اضافه."
      : "One visual prompt line: subject, setting, lighting, lens, material, mood, negatives. No essay.";
  }
  if (draft.model === "codingai") {
    return fa
      ? "فایل‌های درگیر → ناوردها → گام‌های تغییر → آزمون‌ها → فهرست عدم‌تغییر."
      : "Files to touch → invariants → change steps → tests → do-not-change list.";
  }
  const d = insight.deliverable;
  if (d && /decision|memo|تصمیم/.test(d.en + d.fa)) {
    return fa
      ? "خلاصهٔ پنج‌خطی، گزینه‌ها با هزینه/ریسک، توصیه، و آنچه نظر را عوض می‌کند."
      : "Five-line brief, options with cost/risk, recommendation, and what would change your mind.";
  }
  return fa
    ? "ابتدا پاسخ اصلی، سپس گام‌ها، سپس ریسک‌ها و فرض‌ها. از عناوین مارک‌داون استفاده کن."
    : "Lead with the answer, then steps, then risks and assumptions. Use Markdown headings.";
}

function buildLayers(draft, insight) {
  const lang = draft.language || "en";
  const fa = lang === "fa";
  const style = STYLE_GUIDES[draft.style] || STYLE_GUIDES.professional;
  const model = MODEL_GUIDES[draft.model] || MODEL_GUIDES.chatgpt;
  const industry = INDUSTRY_RULES[draft.industry] || INDUSTRY_RULES.general;
  const prefs = prefsOf(draft);
  const detail = draft.detail || "advanced";
  const enrichedGoal = enrichGoal(draft.goal, draft.category, lang);
  const deliv = insight.deliverable;

  const tech = technicalRequirements(draft, insight, lang).map((l) => "- " + l);
  if (prefs.always) tech.push(fa ? "- همیشه لحاظ کن: " + prefs.always : "- Always include: " + prefs.always);

  const features = featureLines(draft, insight, lang).map((l) => (l.startsWith("-") || /^\d/.test(l) ? l : "- " + l));

  const constraints = [];
  if (draft.constraints && draft.constraints.trim()) constraints.push(draft.constraints.trim());
  constraints.push(fa ? "- چارچوب صنعت: " + industry.fa : "- Industry frame: " + industry.en);
  if (prefs.rules) constraints.push(fa ? "- قواعد کاربر: " + prefs.rules : "- User rules: " + prefs.rules);
  if (prefs.banned) constraints.push(fa ? "- هرگز: " + prefs.banned : "- Never: " + prefs.banned);
  constraints.push(fa ? "- داده، نقل‌قول، آمار یا API ساختگی تولید نکن." : "- Do not invent data, quotations, statistics, or APIs.");
  if (insight.complexity >= 4) {
    constraints.push(fa ? "- اگر اطلاعات حیاتی کم است، حداکثر دو سؤال دقیق بپرس سپس با فرض علامت‌خورده ادامه بده." : "- If critical information is missing, ask at most two precise questions, then continue with labeled assumptions.");
  }

  const workflow = workflowLines(detail, lang);
  const format = (draft.format && draft.format.trim()) ? draft.format.trim() : defaultFormat(draft, insight, lang);

  const quality = [];
  if (draft.quality && draft.quality.trim()) quality.push(draft.quality.trim());
  quality.push(fa ? "- هر ادعا یا قابل‌بررسی است یا به‌عنوان فرض علامت خورده است." : "- Every claim is checkable or explicitly marked as an assumption.");
  quality.push(fa ? "- پاسخ کلی بدون اقدام بعدی مردود است." : "- Generic advice without a next action fails the bar.");
  if (detail === "expert") {
    quality.push(fa ? "- معیار پذیرش و مسیر راستی‌آزمایی باید در پاسخ بیاید." : "- Acceptance criteria and a verification path must appear in the answer.");
  }
  quality.push(fa ? model.fa : model.en);

  const contextBody = (draft.context && draft.context.trim())
    ? draft.context.trim()
    : (fa
      ? "زمینه کافی نیست. مخاطب، وضعیت فعلی سامانه و محدودیت محیط نامشخص است. یک سؤال دقیق بپرس و سپس با فرض علامت‌خورده ادامه بده."
      : "Context is incomplete. Audience, current system state, and environment limits are unclear. Ask one precise question, then continue with labeled assumptions.");

  // Role → Objective → Context → Technical Requirements → Features → Constraints → Workflow → Quality Standards → Expected Output
  return [
    { key: "role", title: heading("Role", "نقش", lang), body: roleLine(draft, lang) + "\n" + (fa ? style.fa : style.en) },
    { key: "objective", title: heading("Objective", "هدف", lang), body: enrichedGoal + "\n" + (fa ? "تحویل‌پذیر مورد انتظار: " + deliv.fa : "Expected deliverable: " + deliv.en) },
    { key: "context", title: heading("Context", "زمینه", lang), body: contextBody },
    { key: "technical", title: heading("Technical Requirements", "الزامات فنی", lang), body: tech.join("\n") },
    { key: "features", title: heading("Features", "قابلیت‌ها", lang), body: features.join("\n") },
    { key: "constraints", title: heading("Constraints", "محدودیت‌ها", lang), body: constraints.join("\n") },
    { key: "workflow", title: heading("Workflow", "گردش کار", lang), body: workflow.join("\n") },
    { key: "quality", title: heading("Quality Standards", "استانداردهای کیفیت", lang), body: quality.join("\n") },
    { key: "output", title: heading("Expected Output", "خروجی مورد انتظار", lang), body: format }
  ];
}

function renderLayers(layers) {
  return layers.map((layer) => "## " + layer.title + "\n" + String(layer.body || "").trim()).join("\n\n") + "\n";
}

function optimize(text) {
  return String(text || "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\b(very|really|just|actually|literally)\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n +/g, "\n")
    .trim() + "\n";
}

function fitLength(text, draft) {
  const target = draft.length === "custom" ? Number(draft.customLines) || 60 : Number(draft.length) || 60;
  const minKeep = 52;
  const effective = Math.max(target, minKeep);
  const rows = text.split("\n");
  if (rows.length <= effective + 8) return text;
  let cut = effective;
  for (let i = effective; i > effective - 8 && i > 0; i--) {
    if (rows[i] === "") { cut = i; break; }
  }
  return rows.slice(0, cut).concat(["…"]).join("\n");
}

const PromptEngine = {
  inspect(draft) {
    const safe = draft || {};
    const insight = understand(safe);
    const framework = selectFramework(safe);
    const gaps = detectGaps(safe, insight);
    const suggestions = suggestionsFor(gaps);
    const completeness = Math.max(0, 100 - gaps.filter((g) => g.severity === "high").length * 16 - gaps.filter((g) => g.severity === "medium").length * 7);
    return {
      insight,
      framework,
      gaps,
      suggestions,
      completeness,
      complexity: insight.complexity,
      deliverable: insight.deliverable
    };
  },
  generate(draft, options) {
    const safe = draft || {};
    const report = this.inspect(safe);
    let text = optimize(renderLayers(buildLayers(safe, report.insight)));
    if (!options || options.fit !== false) text = fitLength(text, safe);
    return Object.assign({ text, layers: buildLayers(safe, report.insight) }, report);
  },
  variations(draft) {
    const base = draft || {};
    return ["professional", "expert", "technical", "production"].map((style) => {
      const next = Object.assign({}, base, { style, length: style === "expert" ? 30 : 18 });
      return { id: style, title: style, text: this.generate(next, { fit: true }).text };
    });
  },
  refine(text, lang) {
    return improvePrompt(text, lang);
  }
};

function composePrompt(draft) {
  return PromptEngine.generate(draft).text;
}

function analyzePrompt(text) {
  const raw = (text || "").trim();
  const checks = [];
  const add = (id, en, fa, pass, weight, group) => checks.push({ id, en, fa, pass, weight, group });
  add("role", "Role is defined", "نقش تعریف شده", /role|you are|نقش|تو /i.test(raw), 10, "completeness");
  add("goal", "Objective is explicit", "هدف صریح است", /objective|goal|هدف/i.test(raw), 12, "completeness");
  add("context", "Context is present", "زمینه وجود دارد", /context|زمینه/i.test(raw), 10, "completeness");
  add("technical", "Technical requirements exist", "الزامات فنی هست", /technical|الزامات فنی|requirements/i.test(raw), 10, "completeness");
  add("features", "Features section exists", "بخش قابلیت‌ها هست", /features|قابلیت/i.test(raw), 8, "completeness");
  add("constraints", "Constraints are stated", "محدودیت آمده", /constraint|do not|محدودیت|نکن|هرگز/i.test(raw), 12, "completeness");
  add("workflow", "Workflow is specified", "گردش کار مشخص است", /workflow|گردش کار/i.test(raw), 8, "completeness");
  add("quality", "Quality standards exist", "استاندارد کیفیت هست", /quality|acceptance|استاندارد|معیار/i.test(raw), 10, "completeness");
  add("output", "Expected output is specified", "خروجی مورد انتظار مشخص است", /expected output|خروجی مورد انتظار|output format|قالب/i.test(raw), 8, "completeness");
  add("structure", "Uses heading hierarchy", "سلسله‌مراتب عنوان دارد", /^## /m.test(raw), 8, "clarity");
  add("specific", "Contains concrete anchors", "لنگر مشخص دارد", /\d|api|test|user|کاربر|فایل|stack/i.test(raw), 6, "clarity");
  add("vague", "Avoids vague filler", "از پرکننده مبهم پرهیز شده", !/\b(thing|stuff|good|nice|various)\b/i.test(raw), 6, "ambiguity");
  const score = Math.round(checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0));
  const groupScore = (group) => {
    const rows = checks.filter((c) => c.group === group);
    const max = rows.reduce((s, c) => s + c.weight, 0) || 1;
    return Math.round(rows.reduce((s, c) => s + (c.pass ? c.weight : 0), 0) / max * 100);
  };
  return {
    score,
    checks,
    suggestions: checks.filter((c) => !c.pass),
    words: raw ? raw.split(/\s+/).length : 0,
    lines: raw ? raw.split("\n").length : 0,
    completeness: groupScore("completeness"),
    clarity: groupScore("clarity"),
    ambiguity: 100 - groupScore("ambiguity")
  };
}

function improvePrompt(text, lang) {
  const base = (text || "").trim();
  const fa = lang === "fa";
  const parts = [base];
  if (!/^## /m.test(base) && !/^# /m.test(base)) {
    parts.unshift(fa
      ? "## نقش\nتو متخصص دقیق این حوزه هستی. فرض پنهان را آشکار کن.\n"
      : "## Role\nYou are a precise specialist. Surface hidden assumptions.\n");
  }
  if (!/constraint|محدودیت|do not|هرگز/i.test(base)) {
    parts.push(fa
      ? "\n## محدودیت‌ها\n- داده نساز.\n- خارج از محدوده نرو.\n- ناشناخته را علامت بزن."
      : "\n## Constraints\n- Do not invent data.\n- Stay in scope.\n- Mark unknowns.");
  }
  if (!/expected output|خروجی مورد انتظار|output format|قالب/i.test(base)) {
    parts.push(fa
      ? "\n## خروجی مورد انتظار\nابتدا نتیجه، سپس گام‌ها، سپس ریسک‌ها."
      : "\n## Expected Output\nLead with the result, then steps, then risks.");
  }
  if (!/quality|acceptance|استاندارد|معیار/i.test(base)) {
    parts.push(fa
      ? "\n## استانداردهای کیفیت\nاقدام بعدی و تعریف تمام‌شدن باید روشن باشد."
      : "\n## Quality Standards\nThe next action and definition of done must be explicit.");
  }
  return optimize(parts.join("\n"));
}
