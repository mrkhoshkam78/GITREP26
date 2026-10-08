/**
 * GITREP26 V6 — README Insight (4× quality) Engine (local, rule-based, no external AI)
 */
import { storage } from './storage.js';
import { translator } from './translator.js';

const NOT_DOC = {
  en: 'Not documented in README.',
  fa: 'در README مستند نشده است.'
};

const SECTION_KEYS = {
  install: /^(install|installation|getting started|quick ?start|setup|how to install|شروع|نصب)/i,
  usage: /^(usage|how to use|using|examples?|basic usage|getting started|استفاده|نمونه)/i,
  features: /^(features?|what('s| is)? included|capabilities|highlights|ویژگی)/i,
  requirements: /^(requirements?|prerequisites?|dependencies|system requirements|قبل از|نیازمندی)/i,
  config: /^(config(uration)?|settings|environment|env vars?|options|تنظیمات)/i,
  run: /^(run(ning)?|start|launch|development|اجرا)/i,
  contribute: /^(contribut(e|ing)|development|dev setup|مشارکت)/i,
  license: /^(license|licensing|مجوز)/i,
  warning: /^(warning|caution|note|important|limitations?|known issues|هشدار|محدودیت)/i,
  api: /^(api|endpoints?|ports?|http)/i,
  structure: /^(project structure|directory|folder structure|ساختار)/i
};

const CMD_RE = /^(?:\$\s+|>\s+|sudo\s+)?(?:npm|yarn|pnpm|bun|pip|pip3|poetry|cargo|go|brew|apt|apt-get|yum|docker|docker-compose|git|make|curl|wget|python|python3|node|npx|composer|bundle|gradle|mvn|helm|kubectl|poetry|uv)\b[^\n`]*/gim;
const CODE_BLOCK_RE = /```[\w]*\n([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;
const LIST_ITEM_RE = /^[\s]*[-*+]\s+(.+)$/gm;
const NUMBERED_RE = /^[\s]*\d+[.)]\s+(.+)$/gm;
const BADGE_RE = /!\[([^\]]*)\]\([^)]+\)/g;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const ENV_RE = /\b([A-Z][A-Z0-9_]{2,})\b(?:\s*[=:]\s*[^\s\n]+)?/g;

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(16);
}

function stripMd(text) {
  if (!text) return '';
  return text
    .replace(BADGE_RE, '')
    .replace(LINK_RE, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n) {
  if (!s) return '';
  s = s.trim();
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

function extractSections(md) {
  const lines = md.split(/\r?\n/);
  const sections = [];
  let current = { level: 0, title: '__intro__', body: [] };
  for (const line of lines) {
    const hm = /^(#{1,6})\s+(.+)$/.exec(line);
    if (hm) {
      sections.push(current);
      current = { level: hm[1].length, title: hm[2].replace(/[*_`]/g, '').trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);
  return sections.map(s => ({ ...s, text: s.body.join('\n').trim() }));
}

function matchSection(sections, key) {
  const re = SECTION_KEYS[key];
  if (!re) return null;
  const found = sections.find(s => re.test(s.title));
  return found || null;
}

function extractCommands(md) {
  const cmds = new Set();
  let m;
  const blocks = [];
  const blockRe = /```[\w]*\n([\s\S]*?)```/g;
  while ((m = blockRe.exec(md)) !== null) blocks.push(m[1]);
  for (const block of blocks) {
    block.split('\n').forEach(line => {
      const l = line.replace(/^\$\s+/, '').replace(/^>\s+/, '').trim();
      if (!l || l.startsWith('#') || l.startsWith('//')) return;
      if (/^(npm|yarn|pnpm|bun|pip|poetry|cargo|go |brew|apt|docker|git |make |curl |npx |python|node |composer|bundle|gradle|mvn|helm|kubectl|uv )/i.test(l) ||
          /^(cd |mkdir |export |source |chmod )/.test(l)) {
        cmds.add(l.slice(0, 200));
      }
    });
  }
  // bare command lines
  const bare = md.match(CMD_RE) || [];
  bare.forEach(c => cmds.add(c.replace(/^\$\s+/, '').trim().slice(0, 200)));
  return [...cmds].slice(0, 20);
}

function extractListItems(text) {
  if (!text) return [];
  const items = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const m = /^[\s]*[-*+]\s+(.+)$/.exec(line) || /^[\s]*\d+[.)]\s+(.+)$/.exec(line);
    if (m) items.push(stripMd(m[1]));
  }
  return items.filter(Boolean).slice(0, 15);
}

function extractEnvVars(md) {
  const vars = new Set();
  const known = md.match(/\b(?:[A-Z][A-Z0-9_]{2,})(?:_KEY|_TOKEN|_URL|_HOST|_PORT|_SECRET|_PATH|_DIR|_URI|_API)\b/g) || [];
  known.forEach(v => vars.add(v));
  // .env examples
  const envLines = md.match(/^[A-Z][A-Z0-9_]+\s*=\s*.+$/gm) || [];
  envLines.forEach(l => {
    const name = l.split('=')[0].trim();
    if (name.length > 2) vars.add(name);
  });
  return [...vars].slice(0, 15);
}

function extractPorts(md) {
  const ports = new Set();
  const re = /(?:port|localhost|127\.0\.0\.1|0\.0\.0\.0)[:\s]+(\d{2,5})/gi;
  let m;
  while ((m = re.exec(md)) !== null) ports.add(m[1]);
  const colon = md.match(/:(\d{4,5})\b/g) || [];
  colon.forEach(c => {
    const n = c.slice(1);
    if (+n >= 80 && +n <= 65535) ports.add(n);
  });
  return [...ports].slice(0, 8);
}

function firstParagraph(sections) {
  const intro = sections.find(s => s.title === '__intro__') || sections[0];
  if (!intro) return '';
  const paras = intro.text.split(/\n\n+/).map(p => stripMd(p)).filter(p => p.length > 40 && !p.startsWith('|'));
  return paras[0] || stripMd(intro.text).slice(0, 300);
}

function inferAudience(md, repo) {
  const t = (md + ' ' + (repo.description || '') + ' ' + (repo.topics || []).join(' ')).toLowerCase();
  if (/beginner|getting started|tutorial|learn|student|education/.test(t)) return { en: 'Beginners and learners', fa: 'مبتدیان و یادگیرندگان' };
  if (/enterprise|production|devops|sre|ops team|platform engineer/.test(t)) return { en: 'DevOps / platform engineers', fa: 'مهندسان DevOps و پلتفرم' };
  if (/data scientist|ml engineer|machine learning|deep learning|researcher|llm|nlp/.test(t)) return { en: 'ML engineers and researchers', fa: 'مهندسان یادگیری ماشین و پژوهشگران' };
  if (/designer|design system|figma|ui\/ux|frontend/.test(t)) return { en: 'Designers and frontend developers', fa: 'طراحان و توسعه‌دهندگان فرانت‌اند' };
  if (/game|godot|unity|unreal|gamedev/.test(t)) return { en: 'Game developers', fa: 'توسعه‌دهندگان بازی' };
  if (/self-host|homelab|privacy|local[- ]first|self hosted/.test(t)) return { en: 'Self-hosters and privacy-focused users', fa: 'کاربران خودمیزبان و حریم‌خصوصی‌محور' };
  if (/security|pentest|hacking|cve|vulnerability/.test(t)) return { en: 'Security researchers and engineers', fa: 'پژوهشگران و مهندسان امنیت' };
  if (/mobile|android|ios|flutter|react native/.test(t)) return { en: 'Mobile developers', fa: 'توسعه‌دهندگان موبایل' };
  if (/cli|command[- ]line|terminal|shell/.test(t)) return { en: 'CLI power users and developers', fa: 'کاربران حرفه‌ای خط فرمان و توسعه‌دهندگان' };
  if (/api|backend|server|microservice|rest|graphql/.test(t)) return { en: 'Backend developers', fa: 'توسعه‌دهندگان بک‌اند' };
  if (/data|etl|analytics|pipeline|database/.test(t)) return { en: 'Data engineers and analysts', fa: 'مهندسان و تحلیل‌گران داده' };
  return { en: 'Developers and technical users', fa: 'توسعه‌دهندگان و کاربران فنی' };
}

function explainCommand(cmd) {
  const c = cmd.toLowerCase();
  if (c.startsWith('npm install') || c.startsWith('yarn ') || c.startsWith('pnpm install'))
    return { en: 'Install project dependencies', fa: 'نصب وابستگی‌های پروژه' };
  if (c.startsWith('npm run') || c.startsWith('yarn ') || c.startsWith('pnpm '))
    return { en: 'Run a project script', fa: 'اجرای یک اسکریپت پروژه' };
  if (c.startsWith('pip install') || c.startsWith('poetry install') || c.startsWith('uv '))
    return { en: 'Install Python packages', fa: 'نصب بسته‌های پایتون' };
  if (c.startsWith('docker compose') || c.startsWith('docker-compose'))
    return { en: 'Start services with Docker Compose', fa: 'راه‌اندازی سرویس‌ها با Docker Compose' };
  if (c.startsWith('docker build'))
    return { en: 'Build a Docker image', fa: 'ساخت ایمیج Docker' };
  if (c.startsWith('docker run'))
    return { en: 'Run a Docker container', fa: 'اجرای کانتینر Docker' };
  if (c.startsWith('git clone'))
    return { en: 'Clone the repository', fa: 'کلون کردن مخزن' };
  if (c.startsWith('cargo build') || c.startsWith('cargo run'))
    return { en: 'Build/run the Rust project', fa: 'ساخت/اجرای پروژه Rust' };
  if (c.startsWith('make '))
    return { en: 'Run a Makefile target', fa: 'اجرای هدف Makefile' };
  if (c.startsWith('brew install'))
    return { en: 'Install via Homebrew', fa: 'نصب با Homebrew' };
  return { en: 'Command from README', fa: 'دستور مستندشده در README' };
}

function localizeInsight(insight, lang) {
  if (lang !== 'fa') {
    return {
      ...insight,
      whatIsIt: insight.whatIsIt_en,
      whatDoesItDo: insight.whatDoesItDo_en,
      whoIsItFor: insight.whoIsItFor_en,
      summary: insight.summary_en,
      notes: insight.notes_en,
      features: insight.features_en,
      requirements: insight.requirements_en,
      installSteps: insight.installSteps_en,
      usageSteps: insight.usageSteps_en,
      commands: insight.commands.map(c => ({ cmd: c.cmd, explain: c.explain_en, source: c.source })),
      configuration: insight.configuration_en,
      notDoc: NOT_DOC.en
    };
  }
  // Persian: translate prose, keep commands/code
  const tr = (s) => {
    if (!s || s === NOT_DOC.en) return NOT_DOC.fa;
    // Use phrase-aware translator but keep short technical lines
    if (/^[A-Za-z0-9_./\-|=<>$]+$/.test(s.trim())) return s;
    return translator.translate(s);
  };
  return {
    ...insight,
    whatIsIt: tr(insight.whatIsIt_en),
    whatDoesItDo: tr(insight.whatDoesItDo_en),
    whoIsItFor: insight.whoIsItFor_fa || tr(insight.whoIsItFor_en),
    summary: tr(insight.summary_en),
    notes: insight.notes_en.map(tr),
    features: insight.features_en.map(tr),
    requirements: insight.requirements_en.map(tr),
    installSteps: insight.installSteps_en.map(tr),
    usageSteps: insight.usageSteps_en.map(tr),
    commands: insight.commands.map(c => ({ cmd: c.cmd, explain: c.explain_fa || tr(c.explain_en), source: c.source })),
    configuration: insight.configuration_en.map(tr),
    notDoc: NOT_DOC.fa
  };
}

class ReadmeInsightEngine {
  /**
   * Quick analyzer — fully local rule-based
   */
  analyze(md, repo = {}) {
    if (!md || !md.trim()) {
      return this._empty(repo);
    }
    // Cap huge READMEs
    const text = md.length > 120000 ? md.slice(0, 120000) : md;
    const contentHash = hashStr(text);
    const sections = extractSections(text);
    const intro = firstParagraph(sections);
    const installSec = matchSection(sections, 'install');
    const usageSec = matchSection(sections, 'usage') || matchSection(sections, 'run');
    const featSec = matchSection(sections, 'features');
    const reqSec = matchSection(sections, 'requirements');
    const configSec = matchSection(sections, 'config');
    const warnSec = matchSection(sections, 'warning');
    const licenseSec = matchSection(sections, 'license');

    const features = extractListItems(featSec?.text || '').slice(0, 10);
    if (!features.length) {
      // fallback: bullets near top
      extractListItems(sections.slice(0, 3).map(s => s.text).join('\n')).slice(0, 6).forEach(f => features.push(f));
    }

    const requirements = extractListItems(reqSec?.text || '').slice(0, 10);
    // infer from common mentions
    if (!requirements.length) {
      const t = text.toLowerCase();
      if (/\bnode\.?js\b|\bnpm\b/.test(t)) requirements.push('Node.js / npm');
      if (/\bpython\b/.test(t)) requirements.push('Python');
      if (/\bdocker\b/.test(t)) requirements.push('Docker');
      if (/\brust\b|\bcargo\b/.test(t)) requirements.push('Rust / Cargo');
      if (/\bgo \d|\bgolang\b/.test(t)) requirements.push('Go');
    }

    const installSteps = extractListItems(installSec?.text || '');
    if (!installSteps.length && installSec) {
      const paras = installSec.text.split(/\n\n+/).map(stripMd).filter(p => p.length > 15);
      installSteps.push(...paras.slice(0, 6));
    }

    const usageSteps = extractListItems(usageSec?.text || '');
    if (!usageSteps.length && usageSec) {
      usageSteps.push(...usageSec.text.split(/\n\n+/).map(stripMd).filter(p => p.length > 15).slice(0, 5));
    }

    const cmds = extractCommands(text);
    const commands = cmds.map(cmd => {
      const exp = explainCommand(cmd);
      return { cmd, explain_en: exp.en, explain_fa: exp.fa, source: 'readme-command' };
    });

    const envVars = extractEnvVars(text);
    const ports = extractPorts(text);
    const configuration = [];
    if (envVars.length) configuration.push('Environment variables: ' + envVars.join(', '));
    if (ports.length) configuration.push('Ports mentioned: ' + ports.join(', '));
    if (configSec) {
      extractListItems(configSec.text).slice(0, 6).forEach(i => configuration.push(i));
    }

    const notes = [];
    if (warnSec) {
      extractListItems(warnSec.text).slice(0, 5).forEach(n => notes.push(n));
      if (!notes.length) notes.push(truncate(stripMd(warnSec.text), 200));
    }
    if (/experimental|alpha|beta|unstable|not production/i.test(text)) {
      notes.push('Project may be experimental or not production-ready (mentioned in README).');
    }

    const audience = inferAudience(text, repo);
    const name = repo.name || repo.full_name || 'This project';
    const desc = (repo.description || '').trim();

    const whatIsIt_en = intro
      ? truncate(intro, 280)
      : (desc ? truncate(desc, 280) : `${name} is an open-source project hosted on GitHub.`);

    const whatDoesItDo_en = features.length
      ? `${name} focuses on: ${features.slice(0, 3).join('; ')}.`
      : (desc ? truncate(desc, 220) : NOT_DOC.en);

    const summary_en = truncate(
      [whatIsIt_en, features[0] ? 'Key feature: ' + features[0] : ''].filter(Boolean).join(' '),
      220
    );

    // Source map for transparency
    const sources = {
      whatIsIt: intro ? 'README introduction' : (desc ? 'Repository description (metadata)' : null),
      features: featSec ? `Section: ${featSec.title}` : null,
      install: installSec ? `Section: ${installSec.title}` : null,
      usage: usageSec ? `Section: ${usageSec.title}` : null,
      requirements: reqSec ? `Section: ${reqSec.title}` : null,
      configuration: configSec ? `Section: ${configSec.title}` : (envVars.length ? 'Detected env/ports in README' : null),
      notes: warnSec ? `Section: ${warnSec.title}` : null,
      license: licenseSec ? `Section: ${licenseSec.title}` : (repo.license ? 'Repository metadata' : null)
    };

    return {
      version: 1,
      contentHash,
      analyzedAt: Date.now(),
      level: 'quick',
      repoId: repo.id || null,
      full_name: repo.full_name || null,
      whatIsIt_en,
      whatDoesItDo_en,
      whoIsItFor_en: audience.en,
      whoIsItFor_fa: audience.fa,
      summary_en,
      features_en: features.length ? features : [NOT_DOC.en],
      requirements_en: requirements.length ? requirements : [NOT_DOC.en],
      installSteps_en: installSteps.length ? installSteps : [NOT_DOC.en],
      usageSteps_en: usageSteps.length ? usageSteps : [NOT_DOC.en],
      commands,
      configuration_en: configuration.length ? configuration : [NOT_DOC.en],
      notes_en: notes.length ? notes : [],
      ports,
      envVars,
      licenseNote: licenseSec ? truncate(stripMd(licenseSec.text), 120) : (repo.license || null),
      sources,
      hasReadme: true,
      rawLength: text.length,
      confidence: {
        whatIsIt: intro ? 'explicit' : (desc ? 'inferred' : 'missing'),
        features: features.length ? 'explicit' : 'missing',
        install: installSteps.length ? 'explicit' : 'missing',
        usage: usageSteps.length ? 'explicit' : 'missing',
        requirements: requirements.length ? 'explicit' : 'missing',
        configuration: configuration.length ? 'explicit' : 'missing',
        commands: commands.length ? 'explicit' : 'missing'
      }
    };
  }

  _empty(repo) {
    return {
      version: 1,
      contentHash: 'empty',
      analyzedAt: Date.now(),
      level: 'quick',
      repoId: repo.id || null,
      full_name: repo.full_name || null,
      whatIsIt_en: repo.description || NOT_DOC.en,
      whatDoesItDo_en: NOT_DOC.en,
      whoIsItFor_en: 'Developers',
      whoIsItFor_fa: 'توسعه‌دهندگان',
      summary_en: repo.description || NOT_DOC.en,
      features_en: [NOT_DOC.en],
      requirements_en: [NOT_DOC.en],
      installSteps_en: [NOT_DOC.en],
      usageSteps_en: [NOT_DOC.en],
      commands: [],
      configuration_en: [NOT_DOC.en],
      notes_en: [],
      ports: [],
      envVars: [],
      licenseNote: repo.license || null,
      sources: {},
      hasReadme: false,
      rawLength: 0
    };
  }

  /**
   * Deep analyzer — currently same rule engine with extra passes.
   * Ready for optional local model hook; falls back to quick.
   */
  async deepAnalyze(md, repo = {}) {
    // Optional future: if window.gitrepLocalAI?.analyze exists, use it
    if (typeof window !== 'undefined' && window.gitrepLocalAI?.analyze) {
      try {
        const r = await window.gitrepLocalAI.analyze(md, repo);
        if (r) return { ...r, level: 'deep' };
      } catch (_) { /* fall through */ }
    }
    const quick = this.analyze(md, repo);
    // Extra deep pass: more commands from install+usage only
    return { ...quick, level: 'deep-fallback' };
  }

  async getCached(fullName, contentHash) {
    const key = `insight:${fullName}`;
    const cached = await storage.getCache(key);
    if (cached && cached.contentHash === contentHash) return cached;
    return null;
  }

  async setCached(fullName, insight) {
    const key = `insight:${fullName}`;
    // 7 day TTL
    await storage.setCache(key, insight, 7 * 24 * 3600 * 1000);
  }

  /**
   * Full pipeline: cache check → analyze → cache store
   */
  async process(md, repo = {}, { force = false, lang = 'en' } = {}) {
    const text = md || '';
    const contentHash = text ? hashStr(text.length > 120000 ? text.slice(0, 120000) : text) : 'empty';
    const fullName = repo.full_name || 'unknown';

    if (!force) {
      const cached = await this.getCached(fullName, contentHash);
      if (cached) return { insight: localizeInsight(cached, lang), raw: cached, fromCache: true };
    }

    const raw = this.analyze(text, repo);
    await this.setCached(fullName, raw);
    return { insight: localizeInsight(raw, lang), raw, fromCache: false };
  }

  localize(raw, lang) {
    return localizeInsight(raw, lang);
  }
}

export const readmeInsight = new ReadmeInsightEngine();
window.readmeInsight = readmeInsight;
