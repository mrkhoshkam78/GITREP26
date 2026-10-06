/* Atelier UI */
const state = {
  view: "studio",
  step: 0,
  uiLang: localStorage.getItem("atelier-lang") || "en",
  theme: localStorage.getItem("atelier-theme") || "dark",
  prompts: [],
  components: [],
  profiles: [],
  editingId: null,
  draft: {
    title: "",
    category: "coding",
    role: "developer",
    customRole: "",
    profileId: "",
    goal: "",
    context: "",
    constraints: "",
    stack: "",
    quality: "",
    format: "",
    length: 15,
    customLines: 18,
    detail: "advanced",
    model: "chatgpt",
    language: "en",
    style: "professional",
    framework: "auto",
    industry: "general",
    tags: "",
    folder: "Inbox",
    notes: ""
  },
  preview: "",
  libQuery: "",
  libCat: "all",
  compType: "all",
  analyzerText: "",
  analyzerResult: null
};

const $ = (sel) => document.querySelector(sel);
const t = (key) => {
  const dict = I18N[state.uiLang] || I18N.en;
  return key.split(".").reduce((o, k) => (o ? o[k] : undefined), dict) ?? key;
};

function toast(msg) {
  const el = $("#toast");
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function applyChrome() {
  document.documentElement.lang = state.uiLang === "fa" ? "fa" : "en";
  document.documentElement.dir = state.uiLang === "fa" ? "rtl" : "ltr";
  document.documentElement.dataset.theme = state.theme;
  $("#themeBtn").textContent = state.theme === "dark" ? "☾" : "☀";
  $("#uiLang").value = state.uiLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  const page = t("pages")[state.view];
  $("#kicker").textContent = page[0];
  $("#pageTitle").textContent = page[1];
  $("#pageSub").textContent = page[2];
  $("#statCount").textContent = String(state.prompts.length);
  const nav = $("#nav");
  const items = [
    ["studio", "⌘"],
    ["library", "▤"],
    ["components", "▣"],
    ["analyzer", "◎"],
    ["settings", "⚙"]
  ];
  nav.innerHTML = items.map(([id, ic]) =>
    `<button data-view="${id}" class="${state.view === id ? "active" : ""}"><span class="ic">${ic}</span>${t("nav." + id)}</button>`
  ).join("");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#39;");
}

function choiceButtons(list, current, attr) {
  return `<div class="choice-grid">${list.map((item) => {
    const name = state.uiLang === "fa" ? item.fa : item.en;
    return `<button type="button" class="choice ${current === item.id ? "on" : ""}" data-${attr}="${item.id}"><strong>${esc(name)}</strong></button>`;
  }).join("")}</div>`;
}

function renderStudio() {
  const d = state.draft;
  const steps = t("steps");
  const f = t("fields");
  const step = state.step;
  let body = "";
  if (step === 0) {
    body = `
      <div class="section-title"><h3>${esc(f.category)}</h3></div>
      ${choiceButtons(CATEGORIES, d.category, "set-cat")}
      <div class="section-title" style="margin-top:16px"><h3>${esc(f.role)}</h3></div>
      ${choiceButtons(ROLES, d.role, "set-role")}
      <div style="height:10px"></div>
      <label class="field">${esc(t("customRole"))}<input id="f-customRole" value="${esc(d.customRole || "")}" placeholder="Staff engineer who refuses hidden coupling" /></label>
      <div class="section-title" style="margin-top:16px"><h3>Expert profiles</h3></div>
      <div class="chips">
        <button type="button" class="chip ${!d.profileId ? "on" : ""}" data-profile="">None</button>
        ${state.profiles.map((profile) => `<button type="button" class="chip ${d.profileId === profile.id ? "on" : ""}" data-profile="${profile.id}">${esc(profile.title)}</button>`).join("")}
      </div>`;
  } else if (step === 1) {
    body = `
      <label class="field">${esc(f.title)}<input id="f-title" value="${esc(d.title)}" /></label>
      <div style="height:10px"></div>
      <label class="field">${esc(f.goal)}<textarea id="f-goal">${esc(d.goal)}</textarea></label>
      <div style="height:10px"></div>
      <label class="field">${esc(f.context)}<textarea id="f-context">${esc(d.context)}</textarea></label>
      <div style="height:10px"></div>
      <label class="field">${esc(f.notes)}<input id="f-notes" value="${esc(d.notes)}" /></label>`;
  } else if (step === 2) {
    body = `
      <label class="field">${esc(f.constraints)}<textarea id="f-constraints">${esc(d.constraints)}</textarea></label>
      <div style="height:10px"></div>
      <label class="field">${esc(f.stack)}<textarea id="f-stack">${esc(d.stack)}</textarea></label>
      <div style="height:10px"></div>
      <label class="field">${esc(f.quality)}<textarea id="f-quality">${esc(d.quality)}</textarea></label>`;
  } else if (step === 3) {
    body = `
      <label class="field">${esc(f.format)}<textarea id="f-format">${esc(d.format)}</textarea></label>
      <div style="height:10px"></div>
      <div class="section-title"><h3>${esc(f.length)}</h3><span>${esc(t("lengthHelp"))}</span></div>
      <div class="chips">
        ${LENGTHS.map((n) => `<button type="button" class="chip ${String(d.length) === String(n) ? "on" : ""}" data-len="${n}">${n === "custom" ? (state.uiLang === "fa" ? "سفارشی" : "Custom") : n + " " + t("lines")}</button>`).join("")}
      </div>
      ${d.length === "custom" ? `<div style="height:10px"></div><label class="field">${esc(f.customLines)}<input id="f-custom" type="number" min="3" max="80" value="${esc(d.customLines)}" /></label>` : ""}`;
  } else if (step === 4) {
    body = `
      <div class="section-title"><h3>${esc(f.detail)}</h3><span>${esc(t("detailHelp"))}</span></div>
      ${choiceButtons(DETAILS, d.detail, "set-detail")}
      <div class="section-title" style="margin-top:16px"><h3>${esc(f.model)}</h3></div>
      ${choiceButtons(MODELS, d.model, "set-model")}
      <div class="grid-2" style="margin-top:16px">
        <div><div class="section-title"><h3>${esc(f.language)}</h3></div>${choiceButtons(LANGS, d.language, "set-lang")}</div>
        <div><div class="section-title"><h3>${esc(f.style)}</h3></div>${choiceButtons(STYLES, d.style, "set-style")}</div>
      </div>
      <div class="section-title" style="margin-top:16px"><h3>${esc(t("framework"))}</h3><span>${esc(PromptEngine.inspect(d).framework)}</span></div>
      <div class="chips">${(FRAMEWORKS[d.category] || []).map((fw) => `<button type="button" class="chip ${d.framework === fw.id ? "on" : ""}" data-fw="${fw.id}">${esc(state.uiLang === "fa" ? fw.fa : fw.en)}</button>`).join("")}</div>
      <div class="section-title" style="margin-top:16px"><h3>${esc(t("industry"))}</h3></div>
      <div class="chips">${INDUSTRIES.map((item) => `<button type="button" class="chip ${d.industry === item.id ? "on" : ""}" data-ind="${item.id}">${esc(state.uiLang === "fa" ? item.fa : item.en)}</button>`).join("")}</div>`;
  } else {
    body = `
      <div class="grid-2">
        <label class="field">${esc(f.tags)}<input id="f-tags" value="${esc(d.tags)}" /></label>
        <label class="field">${esc(t("folder"))}
          <select id="f-folder">
            ${["Inbox", "Work", "Archive"].map((folder) => `<option ${d.folder === folder ? "selected" : ""} value="${folder}">${esc(t("folders." + folder))}</option>`).join("")}
          </select>
        </label>
      </div>
      <p style="color:var(--muted);font-size:13px">${esc(state.uiLang === "fa" ? "موتور لایه‌ها را از هدف شما می‌سازد، شکاف را علامت می‌زند و قبل از خروجی بهینه می‌کند." : "The engine builds layers from your goal, flags gaps, and optimizes before output.")}</p>
      ${intelPanel()}`;
  }

  $("#view").innerHTML = `
    <div class="layout">
      <section class="card">
        <div class="stepper">${steps.map((name, i) => `<button type="button" data-step="${i}" class="${i === step ? "on" : ""}">${i + 1}. ${esc(name)}</button>`).join("")}</div>
        <div class="card-pad">${body}
          <div class="actions" style="padding:16px 0 0">
            <button class="btn" id="backBtn" ${step === 0 ? "disabled" : ""}>${esc(t("back"))}</button>
            <button class="btn" id="nextBtn" ${step === 5 ? "disabled" : ""}>${esc(t("next"))}</button>
            <button class="btn primary" id="genBtn">${esc(t("generate"))}</button>
          </div>
        </div>
      </section>
      ${previewCard()}
    </div>`;
  bindStudio();
}

function intelPanel() {
  const report = PromptEngine.inspect(state.draft);
  const lang = state.uiLang === "fa" ? "fa" : "en";
  const gaps = report.suggestions.length
    ? report.suggestions.map((gap) => `<li><strong>${esc(gap.severity)}</strong> — ${esc(lang === "fa" ? gap.fa : gap.en)} <button class="btn" data-gap="${gap.id}">${esc(t("applyGap"))}</button></li>`).join("")
    : `<li>${lang === "fa" ? "شکاف مهمی نیست." : "No major gaps. Ready to generate."}</li>`;
  return `<div class="section-title"><h3>${esc(t("gaps"))}</h3><span>${report.completeness}</span></div>
    <ul class="suggestions">${gaps}</ul>`;
}

function applyGap(id) {
  const fills = {
    goal: "Produce a finished, checkable outcome for the named audience.",
    context: "Audience, current system state, and environment limits.",
    audience: "Primary reader and the decision they must make.",
    constraints: "- Do not invent data.\n- Stay inside the named scope.\n- Mark unknowns.",
    format: "Lead with the answer, then steps, then risks, using Markdown headings.",
    quality: "Done when the next action and the definition of done are explicit.",
    stack: "Language, framework, datastore, and runtime.",
    vague: (state.draft.goal || "").replace(/\b(good|nice|better|various|thing|stuff)\b/gi, "specific"),
    ambiguous: (state.draft.goal || "Name the subject explicitly."),
    visual: ((state.draft.goal || "") + " Soft north light, 50mm lens, tangible materials.").trim()
  };
  const value = fills[id];
  if (!value) return;
  if (id === "goal" || id === "vague" || id === "ambiguous" || id === "visual") state.draft.goal = value;
  if (id === "context" || id === "audience") state.draft.context = [state.draft.context, value].filter(Boolean).join("\n");
  if (id === "constraints") state.draft.constraints = value;
  if (id === "format") state.draft.format = value;
  if (id === "quality") state.draft.quality = value;
  if (id === "stack") state.draft.stack = value;
  state.preview = composePrompt(state.draft);
  render();
}

function previewCard() {
  const text = state.preview || composePrompt(state.draft);
  state.preview = text;
  const d = state.draft;
  return `
    <aside class="card preview">
      <div class="preview-head"><h3>${esc(d.title || (state.uiLang === "fa" ? "پیش‌نمایش" : "Preview"))}</h3><span class="tag">${text.split("\n").length} ${esc(t("lines"))}</span></div>
      <div class="meta-row">
        <span class="tag">${esc(label(CATEGORIES, d.category, state.uiLang === "fa" ? "fa" : "en"))}</span>
        <span class="tag">${esc(label(ROLES, d.role, state.uiLang === "fa" ? "fa" : "en"))}</span>
        <span class="tag">${esc(label(MODELS, d.model, "en"))}</span>
        <span class="tag">${esc(d.detail)}</span>
      </div>
      <pre class="prompt-view" id="promptView">${esc(text)}</pre>
      <div class="actions">
        <button class="btn primary" id="copyBtn">${esc(t("copy"))}</button>
        <button class="btn teal" id="saveBtn">${esc(t("save"))}</button>
        <button class="btn" id="anBtn">${esc(t("analyze"))}</button>
        <button class="btn" id="impBtn">${esc(t("improve"))}</button>
        <button class="btn" id="varBtn">${esc(t("variations"))}</button>
        <button class="btn ghost" data-exp="txt">${esc(t("exportTxt"))}</button>
        <button class="btn ghost" data-exp="md">${esc(t("exportMd"))}</button>
        <button class="btn ghost" data-exp="json">${esc(t("exportJson"))}</button>
      </div>
    </aside>`;
}

function readDraftFields() {
  const map = {
    "f-title": "title", "f-goal": "goal", "f-context": "context", "f-notes": "notes",
    "f-constraints": "constraints", "f-stack": "stack", "f-quality": "quality",
    "f-format": "format", "f-tags": "tags", "f-custom": "customLines", "f-folder": "folder",
    "f-customRole": "customRole"
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) state.draft[key] = el.value;
  });
}

function bindStudio() {
  $("#view").querySelectorAll("[data-step]").forEach((btn) => btn.onclick = () => { readDraftFields(); state.step = Number(btn.dataset.step); state.preview = composePrompt(state.draft); render(); });
  $("#backBtn").onclick = () => { readDraftFields(); state.step = Math.max(0, state.step - 1); state.preview = composePrompt(state.draft); render(); };
  $("#nextBtn").onclick = () => { readDraftFields(); state.step = Math.min(5, state.step + 1); state.preview = composePrompt(state.draft); render(); };
  $("#genBtn").onclick = () => { readDraftFields(); state.preview = composePrompt(state.draft); render(); toast(state.uiLang === "fa" ? "ساخته شد" : "Assembled"); };
  $("#view").querySelectorAll("[data-set-cat]").forEach((b) => b.onclick = () => { state.draft.category = b.dataset.setCat; refreshPreview(); });
  $("#view").querySelectorAll("[data-set-role]").forEach((b) => b.onclick = () => { state.draft.role = b.dataset.setRole; refreshPreview(); });
  $("#view").querySelectorAll("[data-set-detail]").forEach((b) => b.onclick = () => { state.draft.detail = b.dataset.setDetail; refreshPreview(); });
  $("#view").querySelectorAll("[data-set-model]").forEach((b) => b.onclick = () => { state.draft.model = b.dataset.setModel; refreshPreview(); });
  $("#view").querySelectorAll("[data-set-lang]").forEach((b) => b.onclick = () => { state.draft.language = b.dataset.setLang; refreshPreview(); });
  $("#view").querySelectorAll("[data-set-style]").forEach((b) => b.onclick = () => { state.draft.style = b.dataset.setStyle; refreshPreview(); });
  $("#view").querySelectorAll("[data-fw]").forEach((b) => b.onclick = () => { state.draft.framework = b.dataset.fw; refreshPreview(); });
  $("#view").querySelectorAll("[data-ind]").forEach((b) => b.onclick = () => { state.draft.industry = b.dataset.ind; refreshPreview(); });
  $("#view").querySelectorAll("[data-profile]").forEach((b) => b.onclick = () => {
    state.draft.profileId = b.dataset.profile;
    state.draft.profile = state.profiles.find((profile) => profile.id === b.dataset.profile) || null;
    refreshPreview();
  });
  $("#view").querySelectorAll("[data-gap]").forEach((b) => b.onclick = () => applyGap(b.dataset.gap));
  $("#view").querySelectorAll("[data-len]").forEach((b) => b.onclick = () => { state.draft.length = b.dataset.len === "custom" ? "custom" : Number(b.dataset.len); refreshPreview(); });
  $("#copyBtn").onclick = copyPreview;
  $("#saveBtn").onclick = saveCurrent;
  $("#anBtn").onclick = () => { readDraftFields(); state.preview = composePrompt(state.draft); openAnalysis(state.preview); };
  $("#impBtn").onclick = () => { readDraftFields(); state.preview = improvePrompt(composePrompt(state.draft), state.draft.language); render(); toast(state.uiLang === "fa" ? "بهبود اعمال شد" : "Improved"); };
  $("#varBtn").onclick = openVariations;
  $("#view").querySelectorAll("[data-exp]").forEach((b) => b.onclick = () => exportCurrent(b.dataset.exp));
}

function refreshPreview() {
  readDraftFields();
  state.draft.profile = state.profiles.find((profile) => profile.id === state.draft.profileId) || null;
  state.preview = composePrompt(state.draft);
  render();
}

function openVariations() {
  readDraftFields();
  const rows = PromptEngine.variations(state.draft);
  $("#modalRoot").innerHTML = `
    <div class="modal-back" id="modalBack">
      <div class="modal">
        <div class="section-title"><h3>${esc(t("variations"))}</h3><button class="btn ghost" id="closeModal">${esc(t("close"))}</button></div>
        ${rows.map((row) => `<section class="card card-pad" style="margin-bottom:10px"><div class="section-title"><h3>${esc(row.title)}</h3><button class="btn" data-usevar="${row.id}">${esc(t("apply"))}</button></div><pre class="prompt-view" style="max-height:180px">${esc(row.text)}</pre></section>`).join("")}
      </div>
    </div>`;
  $("#closeModal").onclick = closeModal;
  $("#modalBack").onclick = (e) => { if (e.target.id === "modalBack") closeModal(); };
  $("#modalRoot").querySelectorAll("[data-usevar]").forEach((btn) => btn.onclick = () => {
    const row = rows.find((item) => item.id === btn.dataset.usevar);
    if (!row) return;
    state.draft.style = row.id;
    state.preview = row.text;
    closeModal();
    render();
  });
}

async function copyPreview() {
  try {
    await navigator.clipboard.writeText(state.preview);
    toast(t("copied"));
  } catch {
    const ta = document.createElement("textarea");
    ta.value = state.preview;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(t("copied"));
  }
}

async function saveCurrent() {
  readDraftFields();
  state.preview = state.preview || composePrompt(state.draft);
  const now = Date.now();
  const tags = state.draft.tags.split(",").map((s) => s.trim()).filter(Boolean);
  const title = state.draft.title.trim() || (state.draft.goal || "Untitled").slice(0, 64);
  if (state.editingId) {
    const existing = state.prompts.find((p) => p.id === state.editingId);
    const versions = existing ? existing.versions.slice() : [];
    versions.push({ id: uid(), body: state.preview, note: "Edit", createdAt: now });
    const next = {
      ...(existing || {}),
      id: state.editingId,
      title,
      category: state.draft.category,
      tags,
      folder: state.draft.folder,
      favorite: existing ? existing.favorite : false,
      body: state.preview,
      meta: { ...state.draft },
      versions,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    await Store.put("prompts", next);
  } else {
    const id = uid();
    await Store.put("prompts", {
      id,
      title,
      category: state.draft.category,
      tags,
      folder: state.draft.folder,
      favorite: false,
      body: state.preview,
      meta: { ...state.draft },
      versions: [{ id: uid(), body: state.preview, note: "Initial", createdAt: now }],
      createdAt: now,
      updatedAt: now
    });
    state.editingId = id;
    state.draft.title = title;
  }
  await reload();
  toast(t("saved"));
  render();
}

function exportCurrent(kind) {
  readDraftFields();
  const text = state.preview || composePrompt(state.draft);
  const title = (state.draft.title || "prompt").replace(/\s+/g, "-").toLowerCase();
  if (kind === "txt") download(`${title}.txt`, text, "text/plain");
  if (kind === "md") download(`${title}.md`, text, "text/markdown");
  if (kind === "json") {
    download(`${title}.json`, JSON.stringify({ title: state.draft.title, draft: state.draft, body: text, exportedAt: new Date().toISOString() }, null, 2), "application/json");
  }
  toast(t("exported"));
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderLibrary() {
  const q = state.libQuery.toLowerCase();
  const items = state.prompts
    .filter((p) => state.libCat === "all" || p.category === state.libCat)
    .filter((p) => !q || `${p.title} ${(p.tags || []).join(" ")} ${p.body}`.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  $("#view").innerHTML = `
    <div class="library-tools">
      <input type="search" id="libSearch" placeholder="${esc(t("search"))}" value="${esc(state.libQuery)}" />
      <div class="chips">
        <button class="chip ${state.libCat === "all" ? "on" : ""}" data-cat="all">${esc(t("all"))}</button>
        ${CATEGORIES.map((c) => `<button class="chip ${state.libCat === c.id ? "on" : ""}" data-cat="${c.id}">${esc(state.uiLang === "fa" ? c.fa : c.en)}</button>`).join("")}
      </div>
    </div>
    ${items.length ? `<div class="cards">${items.map(cardHtml).join("")}</div>` : `<div class="empty">${esc(t("emptyLib"))}</div>`}`;
  $("#libSearch").oninput = (e) => { state.libQuery = e.target.value; renderLibrary(); };
  $("#view").querySelectorAll("[data-cat]").forEach((b) => b.onclick = () => { state.libCat = b.dataset.cat; renderLibrary(); });
  bindCards();
}

function cardHtml(p) {
  const cat = CATEGORIES.find((c) => c.id === p.category);
  return `<article class="card prompt-card">
    <div class="meta-row" style="padding:0">
      <span class="tag">${esc(cat ? (state.uiLang === "fa" ? cat.fa : cat.en) : p.category)}</span>
      <span class="tag">${esc(t("folders." + (p.folder || "Inbox")))}</span>
      ${p.favorite ? `<span class="tag">★</span>` : ""}
      <span class="tag">v${(p.versions || []).length}</span>
    </div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.body)}</p>
    <div class="chips">${(p.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div>
    <div class="card-actions">
      <button class="btn" data-act="edit" data-id="${p.id}">${esc(t("edit"))}</button>
      <button class="btn" data-act="dup" data-id="${p.id}">${esc(t("duplicate"))}</button>
      <button class="btn" data-act="hist" data-id="${p.id}">${esc(t("history"))}</button>
      <button class="btn" data-act="fav" data-id="${p.id}">${esc(t("favorite"))}</button>
      <button class="btn danger" data-act="del" data-id="${p.id}">${esc(t("del"))}</button>
    </div>
  </article>`;
}

function bindCards() {
  $("#view").querySelectorAll("[data-act]").forEach((btn) => {
    btn.onclick = () => onCard(btn.dataset.act, btn.dataset.id);
  });
}

async function onCard(act, id) {
  const p = state.prompts.find((x) => x.id === id);
  if (!p) return;
  if (act === "edit") {
    state.editingId = p.id;
    state.draft = {
      ...state.draft,
      ...(p.meta || {}),
      title: p.title,
      category: p.category,
      tags: (p.tags || []).join(", "),
      folder: p.folder || "Inbox"
    };
    state.preview = p.body;
    state.view = "studio";
    state.step = 5;
    render();
  }
  if (act === "dup") {
    const now = Date.now();
    const copy = { ...p, id: uid(), title: p.title + " (copy)", favorite: false, createdAt: now, updatedAt: now, versions: [{ id: uid(), body: p.body, note: "Duplicated", createdAt: now }] };
    delete copy.meta;
    copy.meta = p.meta || {};
    await Store.put("prompts", copy);
    await reload();
    toast(t("saved"));
    render();
  }
  if (act === "fav") {
    await Store.put("prompts", { ...p, favorite: !p.favorite, updatedAt: Date.now() });
    await reload();
    render();
  }
  if (act === "del") {
    await Store.del("prompts", id);
    if (state.editingId === id) state.editingId = null;
    await reload();
    toast(t("deleted"));
    render();
  }
  if (act === "hist") openHistory(p);
}

function openHistory(p) {
  const rows = (p.versions || []).slice().reverse().map((v) => `
    <tr>
      <td>${new Date(v.createdAt).toLocaleString()}</td>
      <td>${esc(v.note || "")}</td>
      <td><button class="btn" data-restore="${v.id}">${esc(t("restore"))}</button></td>
    </tr>`).join("");
  $("#modalRoot").innerHTML = `
    <div class="modal-back" id="modalBack">
      <div class="modal">
        <div class="section-title"><h3>${esc(t("versions"))} — ${esc(p.title)}</h3><button class="btn ghost" id="closeModal">${esc(t("close"))}</button></div>
        <table class="table"><thead><tr><th>When</th><th>Note</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>`;
  $("#closeModal").onclick = closeModal;
  $("#modalBack").onclick = (e) => { if (e.target.id === "modalBack") closeModal(); };
  $("#modalRoot").querySelectorAll("[data-restore]").forEach((btn) => btn.onclick = async () => {
    const v = p.versions.find((x) => x.id === btn.dataset.restore);
    if (!v) return;
    const now = Date.now();
    const versions = p.versions.concat([{ id: uid(), body: v.body, note: "Restored", createdAt: now }]);
    await Store.put("prompts", { ...p, body: v.body, versions, updatedAt: now });
    await reload();
    closeModal();
    toast(t("restored"));
    render();
  });
}

function openAnalysis(text) {
  const result = analyzePrompt(text);
  const improved = improvePrompt(text, state.uiLang);
  const lang = state.uiLang;
  $("#modalRoot").innerHTML = `
    <div class="modal-back" id="modalBack">
      <div class="modal">
        <div class="section-title"><h3>${esc(t("score"))}</h3><button class="btn ghost" id="closeModal">${esc(t("close"))}</button></div>
        <div class="score-wrap">
          <div class="score-ring" style="--p:${result.score}"><span>${result.score}</span></div>
          <div class="bars">
            ${result.checks.map((c) => `<div class="bar-row"><span>${esc(lang === "fa" ? c.fa : c.en)}</span><div class="bar"><i style="width:${c.pass ? 100 : 18}%"></i></div><span>${c.pass ? "✓" : "–"}</span></div>`).join("")}
          </div>
        </div>
        <h3 style="font-family:var(--serif)">${esc(t("suggestions"))}</h3>
        <ul class="suggestions">${result.suggestions.length ? result.suggestions.map((s) => `<li>${esc(lang === "fa" ? s.fa : s.en)}</li>`).join("") : `<li>${lang === "fa" ? "شکاف مهمی دیده نشد." : "No major gaps detected."}</li>`}</ul>
        <h3 style="font-family:var(--serif)">${esc(t("improved"))}</h3>
        <pre class="prompt-view" style="max-height:220px;border:1px solid var(--line);border-radius:12px">${esc(improved)}</pre>
        <div class="actions" style="padding-left:0">
          <button class="btn primary" id="applyImp">${esc(t("apply"))}</button>
        </div>
      </div>
    </div>`;
  $("#closeModal").onclick = closeModal;
  $("#modalBack").onclick = (e) => { if (e.target.id === "modalBack") closeModal(); };
  $("#applyImp").onclick = () => {
    state.preview = improved;
    state.view = "studio";
    state.step = 5;
    closeModal();
    render();
  };
}

function closeModal() { $("#modalRoot").innerHTML = ""; }

function renderComponents() {
  const items = state.components.filter((c) => state.compType === "all" || c.type === state.compType);
  $("#view").innerHTML = `
    <div class="library-tools">
      <div class="chips">
        <button class="chip ${state.compType === "all" ? "on" : ""}" data-ctype="all">${esc(t("all"))}</button>
        ${COMPONENT_TYPES.map((type) => `<button class="chip ${state.compType === type ? "on" : ""}" data-ctype="${type}">${esc(type)}</button>`).join("")}
      </div>
      <button class="btn primary" id="newComp">${esc(t("newComponent"))}</button>
    </div>
    ${items.length ? `<div class="cards">${items.map((c) => `
      <article class="card prompt-card">
        <span class="tag">${esc(c.type)}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.body)}</p>
        <div class="card-actions">
          <button class="btn" data-use="${c.id}">${esc(t("use"))}</button>
          <button class="btn danger" data-cdel="${c.id}">${esc(t("del"))}</button>
        </div>
      </article>`).join("")}</div>` : `<div class="empty">${esc(t("emptyComp"))}</div>`}
    <section class="card card-pad" style="margin-top:14px" id="compForm">
      <div class="section-title"><h3>${esc(t("newComponent"))}</h3></div>
      <div class="grid-2">
        <label class="field">${esc(t("fields.title"))}<input id="c-title" /></label>
        <label class="field">Type
          <select id="c-type">${COMPONENT_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}</select>
        </label>
      </div>
      <div style="height:10px"></div>
      <label class="field">Body<textarea id="c-body"></textarea></label>
      <div class="actions" style="padding-left:0"><button class="btn teal" id="saveComp">${esc(t("saveComponent"))}</button></div>
    </section>`;
  $("#view").querySelectorAll("[data-ctype]").forEach((b) => b.onclick = () => { state.compType = b.dataset.ctype; renderComponents(); });
  $("#newComp").onclick = () => $("#compForm").scrollIntoView({ behavior: "smooth" });
  $("#saveComp").onclick = async () => {
    const title = $("#c-title").value.trim();
    const body = $("#c-body").value.trim();
    if (!title || !body) return;
    await Store.put("components", { id: uid(), title, body, type: $("#c-type").value, createdAt: Date.now() });
    await reload();
    toast(t("saved"));
    render();
  };
  $("#view").querySelectorAll("[data-use]").forEach((b) => b.onclick = () => {
    const c = state.components.find((x) => x.id === b.dataset.use);
    if (!c) return;
    const map = { role: null, objective: "goal", context: "context", constraints: "constraints", output: "format" };
    if (c.type === "role") state.draft.notes = c.body;
    else if (map[c.type]) state.draft[map[c.type]] = c.body;
    state.preview = composePrompt(state.draft);
    state.view = "studio";
    state.step = c.type === "output" ? 3 : 1;
    toast(t("use"));
    render();
  });
  $("#view").querySelectorAll("[data-cdel]").forEach((b) => b.onclick = async () => {
    await Store.del("components", b.dataset.cdel);
    await reload();
    toast(t("deleted"));
    render();
  });
}

function renderAnalyzer() {
  const r = state.analyzerResult;
  $("#view").innerHTML = `
    <div class="layout">
      <section class="card card-pad">
        <label class="field">${esc(t("analyzerPh"))}<textarea id="anText" style="min-height:280px">${esc(state.analyzerText)}</textarea></label>
        <div class="actions" style="padding-left:0">
          <button class="btn primary" id="runAn">${esc(t("run"))}</button>
          <button class="btn" id="impAn">${esc(t("improve"))}</button>
        </div>
      </section>
      <section class="card card-pad">
        ${r ? `
          <div class="score-wrap">
            <div class="score-ring" style="--p:${r.score}"><span>${r.score}</span></div>
            <div>
              <strong>${r.words}</strong> words · <strong>${r.lines}</strong> ${esc(t("lines"))}
              <div class="meta-row" style="padding:8px 0">
                <span class="tag">Completeness ${r.completeness || 0}</span>
                <span class="tag">Clarity ${r.clarity || 0}</span>
                <span class="tag">Ambiguity ${r.ambiguity || 0}</span>
              </div>
              <div class="bars" style="margin-top:10px">
                ${r.checks.map((c) => `<div class="bar-row"><span>${esc(state.uiLang === "fa" ? c.fa : c.en)}</span><div class="bar"><i style="width:${c.pass ? 100 : 16}%"></i></div><span>${c.pass ? "✓" : "–"}</span></div>`).join("")}
              </div>
            </div>
          </div>
          <ul class="suggestions">${r.suggestions.map((s) => `<li>${esc(state.uiLang === "fa" ? s.fa : s.en)}</li>`).join("") || `<li>${state.uiLang === "fa" ? "آماده است." : "Looks solid."}</li>`}</ul>
        ` : `<div class="empty">${esc(t("analyzerPh"))}</div>`}
      </section>
    </div>`;
  $("#runAn").onclick = () => {
    state.analyzerText = $("#anText").value;
    state.analyzerResult = analyzePrompt(state.analyzerText);
    renderAnalyzer();
  };
  $("#impAn").onclick = () => {
    state.analyzerText = improvePrompt($("#anText").value, state.uiLang);
    state.analyzerResult = analyzePrompt(state.analyzerText);
    renderAnalyzer();
  };
}

function renderSettings() {
  $("#view").innerHTML = `
    <section class="card card-pad" style="max-width:720px">
      <div class="section-title"><h3>${esc(t("pages.settings")[1])}</h3></div>
      <p style="color:var(--muted)">${state.prompts.length} prompts · ${state.components.length} components · ${state.profiles.length} profiles · IndexedDB (${DB_NAME})</p>
      <label class="field">${esc(t("rules"))}<textarea id="pref-rules">${esc((safeJson(localStorage.getItem("atelier-prefs")) || {}).rules || "")}</textarea></label>
      <div style="height:8px"></div>
      <label class="field">Never do<textarea id="pref-banned">${esc((safeJson(localStorage.getItem("atelier-prefs")) || {}).banned || "")}</textarea></label>
      <div style="height:8px"></div>
      <label class="field">Always include<input id="pref-always" value="${esc((safeJson(localStorage.getItem("atelier-prefs")) || {}).always || "")}" /></label>
      <div class="actions" style="padding-left:0">
        <button class="btn teal" id="savePrefs">Save preferences</button>
        <button class="btn" id="expAll">${esc(t("exportAll"))}</button>
        <button class="btn" id="impAll">${esc(t("importAll"))}</button>
        <button class="btn danger" id="resetBtn">${esc(t("reset"))}</button>
      </div>
      <input id="impFile" type="file" accept="application/json" hidden />
    </section>`;
  $("#savePrefs").onclick = () => {
    const prefs = { rules: $("#pref-rules").value.trim(), banned: $("#pref-banned").value.trim(), always: $("#pref-always").value.trim() };
    localStorage.setItem("atelier-prefs", JSON.stringify(prefs));
    state.preview = composePrompt(state.draft);
    toast(t("saved"));
  };
  $("#expAll").onclick = () => {
    download("atelier-library.json", JSON.stringify({ prompts: state.prompts, components: state.components, exportedAt: new Date().toISOString() }, null, 2), "application/json");
    toast(t("exported"));
  };
  $("#impAll").onclick = () => $("#impFile").click();
  $("#impFile").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    for (const p of data.prompts || []) await Store.put("prompts", p);
    for (const c of data.components || []) await Store.put("components", c);
    await reload();
    toast(t("imported"));
    render();
  };
  $("#resetBtn").onclick = async () => {
    if (!confirm(t("confirmReset"))) return;
    await Store.clearAll();
    await Store.setMeta("seeded", true);
    state.prompts = [];
    state.components = [];
    toast(t("resetDone"));
    render();
  };
}

function render() {
  applyChrome();
  if (state.view === "studio") renderStudio();
  if (state.view === "library") renderLibrary();
  if (state.view === "components") renderComponents();
  if (state.view === "analyzer") renderAnalyzer();
  if (state.view === "settings") renderSettings();
}

async function reload() {
  state.prompts = await Store.all("prompts");
  state.components = await Store.all("components");
  state.profiles = await Store.all("profiles");
}

async function boot() {
  await ensureSeed();
  await ensureProfiles();
  await reload();
  if (!state.preview) state.preview = composePrompt(state.draft);
  $("#themeBtn").onclick = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("atelier-theme", state.theme);
    render();
  };
  $("#uiLang").onchange = (e) => {
    state.uiLang = e.target.value;
    localStorage.setItem("atelier-lang", state.uiLang);
    render();
  };
  $("#nav").onclick = (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.dataset.view;
    render();
  };
  render();
}

boot().catch((err) => {
  console.error(err);
  $("#view").innerHTML = `<div class="empty">IndexedDB unavailable in this browser context. Open via a local server if file access blocks storage.<br>${esc(err.message)}</div>`;
});
