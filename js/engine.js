/* Atelier Prompt Generation Engine
   Offline pipeline: understand -> gaps -> structure -> layers -> optimize -> variations
   Public API kept: composePrompt, analyzePrompt, improvePrompt, label, heading
*/

const STYLE_GUIDES = {
  professional: { en: "Write in a calm professional register. Prefer decisions over decoration.", fa: "لحن حرفه‌ای و آرام. تصمیم را بر تزئین ترجیح بده." },
  expert: { en: "Write as a domain expert. Name tradeoffs, invariants, and what you would reject.", fa: "مثل متخصص حوزه بنویس. بده‌بستان، ناورد و موارد ردشده را نام ببر." },
  creative: { en: "Offer inventive options, each tied to a constraint so they stay usable.", fa: "گزینه‌های خلاق بده، هر کدام وصل به یک محدودیت تا کاربردی بمانند." },
  technical: { en: "Be precise, structured, and explicit about mechanisms and tradeoffs.", fa: "دقیق و ساخت‌یافته باش و سازوکار و بده‌بستان را صریح بگو." },
  research: { en: "Separate evidence, inference, and open questions. Do not invent sources.", fa: "شواهد، استنباط و سؤال باز را جدا کن. منبع نساز." },
  production: { en: "Optimize for production readiness: risks, rollback, owners, and verification.", fa: "برای آمادگی تولید بهینه کن: ریسک، بازگشت، مسئول و راستی‌آزمایی." },
  formal: { en: "Use formal register. Avoid slang and hype.", fa: "لحن رسمی. از اغراق پرهیز کن." },
  educational: { en: "Teach the reasoning. Define terms before using them.", fa: "استدلال را آموزش بده. اصطلاح را پیش از استفاده تعریف کن." }
};

const MODEL_GUIDES = {
  chatgpt: { en: "Use explicit sections and a definition of done.", fa: "بخش‌های صریح و تعریف تمام‌شدن بده." },
  claude: { en: "Reason briefly, then give the decision. Flag uncertainty.", fa: "کوتاه استدلال کن، بعد تصمیم را بده. عدم‌قطعیت را علامت بزن." },
  gemini: { en: "Use checkable bullets and avoid unsupported claims.", fa: "گلوله قابل بررسی بده و ادعای بی‌پشتوانه نکن." },
  midjourney: { en: "Favor visual tokens: subject, lens, light, material, mood, negatives.", fa: "نشانه‌های بصری: سوژه، لنز، نور، جنس، حال‌وهوا، منفی‌ها." },
  codingai: { en: "Name files, invariants, tests, and what must not change.", fa: "فایل، ناورد، آزمون و آنچه نباید عوض شود را نام ببر." }
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

const CODING_BLOCKS = {
  architecture: ["State boundaries and module ownership.", "Call out coupling you refuse to increase.", "Prefer reversible structure over clever abstraction."],
  stack: ["Stay inside the named stack unless a gap blocks the goal.", "Do not introduce a new dependency without a one-line reason.", "Match existing conventions."],
  features: ["Slice the goal into shippable increments.", "Each feature needs a user-visible outcome and a non-goal.", "Flag dependencies between slices."],
  security: ["Treat input as untrusted.", "Name authn/authz, secrets, and data exposure risks.", "Do not propose security-through-obscurity."],
  performance: ["Name the budget (latency, memory, or cost).", "Optimize only after identifying the hot path.", "Include how to measure the change."],
  testing: ["Add characterization tests before behavior changes.", "Cover the failure path, not only the happy path.", "State what remains untested."],
  deployment: ["Include rollout, flag, and rollback.", "Name the signal that means the change is safe.", "Avoid big-bang releases."]
};

const INDUSTRY_RULES = {
  general: "Use only the context provided. Mark unknowns.",
  saas: "Assume multi-tenant SaaS. Call out plan limits, auditability, and onboarding friction.",
  fintech: "Assume money movement. Require idempotency, reconciliation, and no invented balances.",
  health: "Avoid diagnostic claims. Prefer privacy, consent, and clinician review where relevant.",
  education: "Teach with a worked example. Do not skip the definition of terms.",
  commerce: "Protect checkout trust: price clarity, error recovery, and inventory honesty.",
  game: "Protect readability of the player verb. Name the fantasy and the failure state."
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
  const stored = draft.preferences || (typeof localStorage !== "undefined" ? safeJson(localStorage.getItem("atelier-prefs")) : null) || {};
  return { rules: stored.rules || "", banned: stored.banned || "", always: stored.always || "" };
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch (err) { return null; }
}

function blobOf(draft) {
  return [draft.goal, draft.context, draft.constraints, draft.stack, draft.quality, draft.format, draft.notes, draft.customRole].filter(Boolean).join("\n");
}

function understand(draft) {
  const blob = blobOf(draft);
  const words = blob.trim() ? blob.trim().split(/\s+/) : [];
  const goal = (draft.goal || "").trim();
  return {
    words: words.length,
    goalWords: goal ? goal.split(/\s+/).length : 0,
    deliverable: inferDeliverable(goal, draft.category),
    audience: /user|customer|executive|developer|player|student/i.test(blob),
    metrics: /\d|kpi|latency|sla/i.test(blob),
    stackKnown: !!(draft.stack && draft.stack.trim()) || /react|vue|python|node|go|rust|postgres|sql|swift|kotlin/i.test(blob),
    security: /auth|owasp|encrypt|secret/i.test(blob),
    vague: /\b(thing|stuff|good|nice|better|various|some|etc)\b/i.test(blob),
    ambiguous: /\b(it|this|that|they|something)\b/i.test(goal) && goal.split(/\s+/).length < 14,
    hasConstraint: !!(draft.constraints && draft.constraints.trim()),
    hasFormat: !!(draft.format && draft.format.trim()),
    hasContext: !!(draft.context && draft.context.trim()),
    hasQuality: !!(draft.quality && draft.quality.trim())
  };
}

function inferDeliverable(goal, category) {
  const g = (goal || "").toLowerCase();
  if (/refactor/.test(g)) return "refactor plan";
  if (/test/.test(g)) return "test plan";
  if (/design|ui|ux/.test(g)) return "design critique";
  if (/memo|decision/.test(g)) return "decision memo";
  if (/prompt/.test(g)) return "system prompt";
  if (category === "coding") return "implementation plan";
  if (category === "marketing") return "narrative";
  if (category === "analysis") return "diagnosis";
  if (category === "gamedev") return "design brief";
  return "structured answer";
}

function selectFramework(draft) {
  const list = FRAMEWORKS[draft.category] || FRAMEWORKS.coding;
  if (draft.framework && draft.framework !== "auto") return draft.framework;
  const goal = (draft.goal || "").toLowerCase();
  if (draft.category === "coding") {
    if (/secur|auth/.test(goal)) return "security";
    if (/perf|latenc|slow/.test(goal)) return "performance";
    if (/test|qa/.test(goal)) return "testing";
    if (/deploy|release/.test(goal)) return "deployment";
    if (/architect|module/.test(goal)) return "architecture";
    if (/feature|slice/.test(goal)) return "features";
    if (draft.stack) return "stack";
  }
  if (draft.category === "design" && /flow|checkout/.test(goal)) return "flow";
  if (draft.category === "business") return "decision";
  if (draft.category === "analysis") return "diagnosis";
  if (draft.category === "marketing") return "positioning";
  if (draft.category === "ai") return "system";
  if (draft.category === "gamedev") return "encounter";
  return list[1] ? list[1].id : "auto";
}

function detectGaps(draft, insight) {
  const gaps = [];
  const add = (id, en, fa, severity) => gaps.push({ id: id, en: en, fa: fa, severity: severity });
  if (insight.goalWords < 6) add("goal", "Goal is too thin to steer the model.", "هدف برای هدایت مدل نازک است.", "high");
  if (!insight.hasContext) add("context", "Context is missing: audience, system, or current state.", "زمینه نیست: مخاطب، سامانه یا وضع فعلی.", "high");
  if (!insight.audience) add("audience", "No audience is named.", "مخاطب نام برده نشده.", "medium");
  if (!insight.hasConstraint) add("constraints", "Constraints are missing, so the model may wander.", "محدودیت نیست؛ مدل ممکن است منحرف شود.", "high");
  if (!insight.hasFormat) add("format", "Output format is unspecified.", "قالب خروجی مشخص نیست.", "medium");
  if (!insight.hasQuality) add("quality", "No quality bar or acceptance check.", "میله کیفیت یا معیار پذیرش نیست.", "medium");
  if (draft.category === "coding" && !insight.stackKnown) add("stack", "Coding task has no technology stack.", "کار کدنویسی پشته فناوری ندارد.", "high");
  if (insight.vague) add("vague", "Vague filler words weaken the instruction.", "کلمات مبهم دستور را ضعیف می‌کنند.", "medium");
  if (insight.ambiguous) add("ambiguous", "Goal uses unclear references without a noun.", "هدف ارجاع مبهم دارد.", "medium");
  if (draft.model === "midjourney" && !/light|lens|style/.test(blobOf(draft))) add("visual", "Image prompt lacks lighting, lens, or medium.", "پرامپت تصویر نور، لنز یا مدیوم ندارد.", "medium");
  return gaps;
}

function suggestionsFor(draft, gaps) {
  return gaps.map((g) => ({
    id: g.id,
    en: suggestText(g.id, "en"),
    fa: suggestText(g.id, "fa"),
    severity: g.severity
  }));
}

function suggestText(id, lang) {
  const fa = lang === "fa";
  const map = {
    goal: fa ? "هدف را با فعل، شیء و نتیجه تمام‌شده بنویس." : "Rewrite the goal with a verb, an object, and a finished outcome.",
    context: fa ? "مخاطب، وضع فعلی و محدودیت محیط را در زمینه بیاور." : "Add audience, current state, and environment limits to context.",
    audience: fa ? "بگو خروجی برای چه کسی است و چه تصمیمی می‌گیرد." : "Name who reads the output and what decision they make.",
    constraints: fa ? "حداقل سه ممنوعیت مشخص اضافه کن." : "Add at least three concrete do-not rules.",
    format: fa ? "قالب را با عنوان‌ها و ترتیب مشخص کن." : "Specify headings and the order of the answer.",
    quality: fa ? "معیار پذیرش قابل بررسی اضافه کن." : "Add a checkable acceptance criterion.",
    stack: fa ? "زبان، فریم‌ورک و محل داده را نام ببر." : "Name language, framework, and where data lives.",
    vague: fa ? "کلمات مبهم را با معیار جایگزین کن." : "Replace vague words with a measurable criterion.",
    ambiguous: fa ? "ارجاع مبهم را با اسم مشخص عوض کن." : "Replace unclear references with the specific noun.",
    visual: fa ? "نور، لنز و جنس را به هدف اضافه کن." : "Add lighting, lens, and material to the goal."
  };
  return map[id] || (fa ? "این بخش را مشخص‌تر کن." : "Make this section more specific.");
}

function roleLine(draft, lang) {
  if (draft.customRole && draft.customRole.trim()) return draft.customRole.trim();
  if (draft.profile && draft.profile.body) return draft.profile.body;
  const roleName = label(ROLES, draft.role, lang);
  const catName = label(CATEGORIES, draft.category, lang);
  if (lang === "fa") return "تو یک " + roleName + " باتجربه در حوزهٔ " + catName + " هستی. فرض‌های پنهان را آشکار کن و از کلی‌گویی بپرهیز.";
  if (lang === "bi") return "You are a " + label(ROLES, draft.role, "en") + " working in " + label(CATEGORIES, draft.category, "en") + ".\nتو یک " + label(ROLES, draft.role, "fa") + " در حوزهٔ " + label(CATEGORIES, draft.category, "fa") + " هستی.";
  return "You are a " + roleName + " working in " + catName + ". Surface hidden assumptions and avoid vague advice.";
}

function frameworkBullets(draft) {
  const fw = selectFramework(draft);
  if (CODING_BLOCKS[fw]) return CODING_BLOCKS[fw];
  const packs = {
    critique: ["Rank findings by user harm.", "Separate taste from usability evidence.", "Propose one tighter flow, not a redesign essay."],
    system: ["Define tokens, states, and exceptions.", "Do not invent components the context does not need."],
    flow: ["Map steps, exits, and error recovery.", "Name the step most likely to be abandoned."],
    eval: ["Define pass/fail checks before examples.", "Include a negative case."],
    decision: ["Lead with the decision requested.", "Compare options on cost, risk, and reversibility."],
    strategy: ["Name the bet, the audience, and what would falsify it."],
    edit: ["Preserve the author's voice.", "Cut before you add."],
    draft: ["Produce a usable draft, then a short rationale for structural choices."],
    diagnosis: ["Separate tracking bugs, mix shift, and real behavior change.", "Rank hypotheses by how cheap they are to test."],
    compare: ["Use the same criteria for every option.", "End with a recommendation and a dissent."],
    positioning: ["Name the job to be done.", "No superlative without proof."],
    launch: ["Write the announcement, the objection, and the proof point."],
    encounter: ["Specify phases, tells, and what the encounter teaches."],
    loop: ["Name the verb, the reward, and the reason to return."]
  };
  return packs[fw] || ["Stay inside the stated goal.", "Separate facts from recommendations."];
}

function localizeBullets(lines, lang) {
  if (lang !== "fa") return lines;
  const map = {
    "State boundaries and module ownership.": "مرز ماژول‌ها و مالکیت را مشخص کن.",
    "Call out coupling you refuse to increase.": "هر وابستگی که نباید بیشتر شود را نام ببر.",
    "Prefer reversible structure over clever abstraction.": "ساختار برگشت‌پذیر را بر انتزاع پیچیده ترجیح بده.",
    "Stay inside the named stack unless a gap blocks the goal.": "در پشته اعلام‌شده بمان مگر مانعی جدی باشد.",
    "Do not introduce a new dependency without a one-line reason.": "بدون دلیل یک‌خطی وابستگی جدید اضافه نکن.",
    "Match existing conventions.": "از قراردادهای موجود پروژه پیروی کن.",
    "Slice the goal into shippable increments.": "هدف را به برش‌های قابل انتشار تقسیم کن.",
    "Each feature needs a user-visible outcome and a non-goal.": "هر قابلیت باید نتیجه قابل‌مشاهده و محدودهٔ خارج از هدف داشته باشد.",
    "Flag dependencies between slices.": "وابستگی بین برش‌ها را علامت بزن.",
    "Treat input as untrusted.": "ورودی را غیرقابل‌اعتماد فرض کن.",
    "Name authn/authz, secrets, and data exposure risks.": "احراز هویت، مجوزها، اسرار و ریسک افشای داده را نام ببر.",
    "Do not propose security-through-obscurity.": "امنیت از طریق پنهان‌کاری پیشنهاد نکن.",
    "Name the budget (latency, memory, or cost).": "بودجهٔ تأخیر، حافظه یا هزینه را مشخص کن.",
    "Optimize only after identifying the hot path.": "فقط پس از یافتن مسیر داغ بهینه‌سازی کن.",
    "Include how to measure the change.": "نحوهٔ اندازه‌گیری تغییر را بنویس.",
    "Add characterization tests before behavior changes.": "پیش از تغییر رفتار، آزمون توصیف‌گر اضافه کن.",
    "Cover the failure path, not only the happy path.": "مسیر شکست را هم پوشش بده، نه فقط مسیر موفق.",
    "State what remains untested.": "آنچه هنوز آزمون نشده را بنویس.",
    "Include rollout, flag, and rollback.": "انتشار تدریجی، پرچم و بازگشت را مشخص کن.",
    "Name the signal that means the change is safe.": "نشانهٔ ایمن‌بودن تغییر را نام ببر.",
    "Avoid big-bang releases.": "از انتشار یک‌باره و بزرگ پرهیز کن.",
    "Stay inside the stated goal.": "در محدودهٔ هدف اعلام‌شده بمان.",
    "Separate facts from recommendations.": "واقعیت‌ها را از پیشنهادها جدا کن."
  };
  return lines.map((line) => map[line] || line);
}

function buildLayers(draft, insight) {
  const lang = draft.language || "en";
  const fa = lang === "fa";
  const style = STYLE_GUIDES[draft.style] || STYLE_GUIDES.technical;
  const model = MODEL_GUIDES[draft.model] || MODEL_GUIDES.chatgpt;
  const industry = INDUSTRY_RULES[draft.industry] || INDUSTRY_RULES.general;
  const prefs = prefsOf(draft);
  const fw = selectFramework(draft);
  const detail = draft.detail || "advanced";

  const reqSource = localizeBullets(frameworkBullets(draft), lang);
  const requirements = reqSource.map((line) => "- " + line);
  if (draft.stack && draft.stack.trim() && draft.model !== "midjourney") {
    requirements.push(fa ? "- پشتهٔ فناوری: " + draft.stack.trim() : "- Technology stack: " + draft.stack.trim());
  }
  if (prefs.always) {
    requirements.push(fa ? "- همیشه لحاظ کن: " + prefs.always : "- Always include: " + prefs.always);
  }
  if (detail === "expert" && !insight.metrics) {
    requirements.push(fa ? "- اگر عددی مشخص نیست، حدس نزن؛ بپرس." : "- If a number is unknown, ask instead of inventing it.");
  }

  const constraints = [];
  if (draft.constraints && draft.constraints.trim()) constraints.push(draft.constraints.trim());
  constraints.push(fa ? "- چارچوب صنعت: " + industry : "- Industry context: " + industry);
  if (prefs.rules) constraints.push(fa ? "- قواعد کاربر: " + prefs.rules : "- User rules: " + prefs.rules);
  if (prefs.banned) constraints.push(fa ? "- هرگز انجام نده: " + prefs.banned : "- Never do: " + prefs.banned);
  constraints.push(fa ? "- داده، نقل‌قول یا API ساختگی تولید نکن." : "- Do not invent data, quotations, or APIs.");

  const format = (draft.format && draft.format.trim())
    ? draft.format.trim()
    : defaultFormat(draft, insight, lang);

  const quality = [];
  if (draft.quality && draft.quality.trim()) quality.push(draft.quality.trim());
  quality.push(fa ? "- هر ادعا باید قابل‌بررسی باشد یا به‌عنوان فرض علامت بخورد." : "- Every claim must be checkable or marked as an assumption.");
  if (detail === "basic") {
    quality.push(fa ? "- مستقیم به هدف پاسخ بده و بزرگ‌ترین ریسک را ذکر کن." : "- Answer the goal directly and note the single largest risk.");
  } else if (detail === "expert") {
    quality.push(fa ? "- فرض‌ها را فهرست کن، پاسخ را بساز، ناشناخته‌ها را جدا کن، و گام راستی‌آزمایی بده." : "- List assumptions, produce the deliverable, separate unknowns, and add a verification step.");
    quality.push(fa ? "- پاسخ کلی بدون اقدام بعدی پذیرفته نیست." : "- Generic advice without a next action is not acceptable.");
  } else {
    quality.push(fa ? "- فرض‌ها را بنویس، تحویل‌پذیر را تولید کن، ریسک‌ها را جدا کن." : "- List assumptions, produce the deliverable, then separate risks.");
  }
  quality.push(fa ? model.fa : model.en);

  const goalBody = (draft.goal && draft.goal.trim())
    ? draft.goal.trim()
    : (fa ? "نتیجهٔ نهایی و قابل‌تحویل را مشخص کن." : "State the finished, deliverable outcome.");
  const goalExtra = fa
    ? "تحویل‌پذیر مورد انتظار: " + insight.deliverable
    : "Expected deliverable: " + insight.deliverable;

  const contextBody = (draft.context && draft.context.trim())
    ? draft.context.trim()
    : (fa
      ? "زمینه کافی نیست. یک سؤال دقیق بپرس، سپس با فرض علامت‌خورده ادامه بده."
      : "Context is incomplete. Ask one precise question, then continue with labeled assumptions.");

  // Hierarchy: Role → Goal → Context → Requirements → Constraints → Output Format → Quality Rules
  return [
    { key: "role", title: heading("Role", "نقش", lang), body: roleLine(draft, lang) + "\n" + (fa ? style.fa : style.en) },
    { key: "goal", title: heading("Goal", "هدف", lang), body: goalBody + "\n" + goalExtra },
    { key: "context", title: heading("Context", "زمینه", lang), body: contextBody },
    { key: "requirements", title: heading("Requirements", "الزامات", lang), body: requirements.join("\n") },
    { key: "constraints", title: heading("Constraints", "محدودیت‌ها", lang), body: constraints.join("\n") },
    { key: "format", title: heading("Output Format", "قالب خروجی", lang), body: format },
    { key: "quality", title: heading("Quality Rules", "قواعد کیفیت", lang), body: quality.join("\n") }
  ];
}

function defaultFormat(draft, insight, lang) {
  const fa = lang === "fa";
  if (draft.model === "midjourney") {
    return fa
      ? "یک خط پرامپت: سوژه، صحنه، نور، لنز، جنس، حال‌وهوا، محدودیت‌های منفی. بدون توضیح اضافه."
      : "One prompt line: subject, setting, lighting, lens, material, mood, negatives. No essay.";
  }
  if (draft.model === "codingai") {
    return fa
      ? "فایل‌های درگیر، ناوردها، گام‌ها، آزمون‌ها، و فهرست چیزهایی که نباید تغییر کند."
      : "Files to touch, invariants, steps, tests, and a do-not-change list.";
  }
  if (insight.deliverable === "decision memo") {
    return fa
      ? "خلاصه پنج‌خطی، گزینه‌ها، توصیه، و آنچه نظر را عوض می‌کند."
      : "Five-line brief, options, recommendation, and what would change your mind.";
  }
  return fa
    ? "ابتدا پاسخ اصلی، سپس گام‌ها، سپس ریسک‌ها. از عناوین مارک‌داون استفاده کن."
    : "Lead with the answer. Then steps. Then risks. Use Markdown headings.";
}

function renderLayers(layers) {
  return layers.map((layer) => "## " + layer.title + "\n" + layer.body.trim()).join("\n\n") + "\n";
}

function optimize(text) {
  return String(text || "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\b(very|really|just|actually)\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n +/g, "\n")
    .trim() + "\n";
}

function fitLength(text, draft) {
  const target = draft.length === "custom" ? Number(draft.customLines) || 24 : Number(draft.length) || 24;
  const rows = text.split("\n");
  if (rows.length <= target + 4) return text;
  const kept = rows.slice(0, target);
  kept.push("…");
  return kept.join("\n");
}

const PromptEngine = {
  inspect(draft) {
    const safe = draft || {};
    const insight = understand(safe);
    const framework = selectFramework(safe);
    const gaps = detectGaps(safe, insight);
    const suggestions = suggestionsFor(safe, gaps);
    const completeness = Math.max(0, 100 - gaps.filter((g) => g.severity === "high").length * 18 - gaps.filter((g) => g.severity === "medium").length * 8);
    return { insight: insight, framework: framework, gaps: gaps, suggestions: suggestions, completeness: completeness };
  },
  generate(draft, options) {
    const safe = draft || {};
    const report = this.inspect(safe);
    let text = optimize(renderLayers(buildLayers(safe, report.insight)));
    if (!options || options.fit !== false) text = fitLength(text, safe);
    return Object.assign({ text: text, layers: buildLayers(safe, report.insight) }, report);
  },
  variations(draft) {
    const base = draft || {};
    return ["professional", "expert", "technical", "production"].map((style) => {
      const next = Object.assign({}, base, { style: style, length: style === "expert" ? 30 : 15 });
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
  const add = (id, en, fa, pass, weight, group) => checks.push({ id: id, en: en, fa: fa, pass: pass, weight: weight, group: group });
  add("role", "Role is defined", "نقش تعریف شده", /role|you are|تو |شما /i.test(raw), 12, "completeness");
  add("goal", "Objective is explicit", "هدف صریح است", /objective|goal|هدف/i.test(raw), 12, "completeness");
  add("context", "Context is present", "زمینه وجود دارد", /context|زمینه/i.test(raw), 10, "completeness");
  add("requirements", "Requirements layer exists", "لایه الزامات هست", /requirement|الزام/i.test(raw), 8, "completeness");
  add("constraints", "Constraints are stated", "محدودیت آمده", /constraint|do not|محدودیت|نکن/i.test(raw), 12, "completeness");
  add("workflow", "Workflow is specified", "گردش کار مشخص است", /workflow|گردش|working method/i.test(raw), 8, "completeness");
  add("format", "Output format is specified", "قالب خروجی مشخص است", /output format|قالب خروجی|output/i.test(raw), 10, "completeness");
  add("quality", "Quality criteria exist", "معیار کیفیت هست", /quality|acceptance|معیار/i.test(raw), 10, "completeness");
  add("structure", "Uses heading hierarchy", "سلسله‌مراتب عنوان دارد", /^## /m.test(raw), 8, "clarity");
  add("specific", "Contains concrete anchors", "لنگر مشخص دارد", /\d|api|test|user|کاربر|فایل/i.test(raw), 6, "clarity");
  add("vague", "Avoids vague filler", "از پرکننده مبهم پرهیز شده", !/\b(thing|stuff|good|nice|various)\b/i.test(raw), 6, "ambiguity");
  add("ambig", "Avoids dangling references", "ارجاع معلق ندارد", !/\b(something|stuff)\b/i.test(raw), 4, "ambiguity");
  const score = Math.round(checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0));
  const groupScore = (group) => {
    const rows = checks.filter((c) => c.group === group);
    const max = rows.reduce((s, c) => s + c.weight, 0) || 1;
    return Math.round(rows.reduce((s, c) => s + (c.pass ? c.weight : 0), 0) / max * 100);
  };
  return {
    score: score,
    checks: checks,
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
  if (!/## /.test(base) && !/^# /m.test(base)) parts.unshift(fa ? "## نقش\nتو متخصص دقیق این حوزه هستی.\n" : "## Role\nYou are a precise specialist. Surface hidden assumptions.\n");
  if (!/constraint|do not|محدودیت/i.test(base)) parts.push(fa ? "\n## محدودیت‌ها\n- داده نساز.\n- خارج از محدوده نرو." : "\n## Constraints\n- Do not invent data.\n- Stay in scope.");
  if (!/output format|قالب خروجی/i.test(base)) parts.push(fa ? "\n## قالب خروجی\nاول نتیجه، بعد گام‌ها، بعد ریسک‌ها." : "\n## Output format\nLead with the result, then steps, then risks.");
  if (!/quality|acceptance|معیار/i.test(base)) parts.push(fa ? "\n## معیار کیفیت\nاقدام بعدی و تعریف تمام‌شدن باید روشن باشد." : "\n## Quality criteria\nThe next action and the definition of done must be explicit.");
  return optimize(parts.join("\n"));
}
