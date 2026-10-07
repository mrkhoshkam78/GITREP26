/**
 * Repository Analysis Engine
 * Rule-based local analyzer (no external AI)
 */

const KEYWORD_RULES = {
  // AI & ML
  'AI Agents': ['agent', 'agents', 'autonomous', 'multi-agent', 'agentic'],
  'LLM': ['llm', 'large language', 'gpt', 'llama', 'mistral', 'claude', 'transformer', 'language model'],
  'Local AI': ['local-ai', 'local ai', 'ollama', 'offline ai', 'self-hosted ai', 'on-device'],
  'Chatbots': ['chatbot', 'chat bot', 'conversational', 'dialogue'],
  'Computer Vision': ['computer vision', 'opencv', 'object detection', 'image recognition', 'yolo', 'vision'],
  'OCR': ['ocr', 'optical character', 'text recognition', 'tesseract'],
  'Speech AI': ['speech', 'asr', 'whisper', 'speech recognition', 'voice', 'stt'],
  'Text To Speech': ['tts', 'text-to-speech', 'speech synthesis', 'voice synthesis'],
  'AI Coding': ['code generation', 'copilot', 'code assistant', 'ai coding', 'codegen'],
  'RAG': ['rag', 'retrieval augmented', 'vector store', 'embedding', 'langchain'],
  'Automation': ['automation', 'workflow', 'orchestrat', 'n8n', 'zapier'],

  // Web
  'Frontend': ['frontend', 'front-end', 'react', 'vue', 'svelte', 'angular', 'ui library'],
  'Backend': ['backend', 'back-end', 'api server', 'fastapi', 'express', 'django', 'spring'],
  'Full Stack': ['fullstack', 'full-stack', 'full stack'],
  'SaaS': ['saas', 'software as a service'],
  'CMS': ['cms', 'content management', 'wordpress', 'strapi', 'ghost'],
  'Dashboard': ['dashboard', 'admin panel', 'admin ui'],
  'E-commerce': ['ecommerce', 'e-commerce', 'shop', 'store', 'cart'],
  'Browser Extensions': ['browser extension', 'chrome extension', 'firefox addon'],
  'Web Tools': ['web tool', 'web utility', 'online tool'],

  // Desktop
  'Windows Apps': ['windows', 'win32', 'wpf', 'winui'],
  'Linux Apps': ['linux', 'gtk', 'qt'],
  'macOS Apps': ['macos', 'swiftui', 'cocoa'],
  'File Manager': ['file manager', 'file explorer', 'files'],
  'System Tools': ['system tool', 'system utility', 'sysadmin'],
  'Backup Tools': ['backup', 'restore', 'snapshot'],
  'Monitoring Tools': ['monitoring', 'observability', 'metrics', 'prometheus'],

  // Mobile
  'Android': ['android', 'kotlin', 'jetpack'],
  'iOS': ['ios', 'swift', 'uikit', 'swiftui'],
  'Flutter': ['flutter', 'dart'],
  'React Native': ['react native', 'react-native', 'expo'],
  'Mobile Utilities': ['mobile utility', 'mobile tool'],

  // Game
  '2D Games': ['2d game', '2d engine', 'sprite'],
  '3D Games': ['3d game', '3d engine', 'unity', 'unreal'],
  'Strategy': ['strategy game', 'rts', 'turn-based'],
  'Simulation': ['simulation', 'simulator'],
  'Management': ['management game', 'tycoon', 'city builder'],
  'RPG': ['rpg', 'role-playing', 'roleplaying'],
  'Game Engines': ['game engine', 'godot', 'unity', 'unreal engine', 'bevy'],
  'Game Tools': ['game tool', 'level editor', 'asset'],

  // Data
  'Data Science': ['data science', 'pandas', 'numpy', 'scikit', 'jupyter'],
  'Visualization': ['visualization', 'chart', 'd3', 'plotly', 'dashboard viz'],
  'Finance': ['finance', 'financial', 'fintech'],
  'Trading': ['trading', 'stock', 'crypto trading', 'quant'],
  'Statistics': ['statistics', 'statistical', 'statsmodels'],
  'Research Tools': ['research', 'academic', 'paper', 'arxiv'],

  // Security
  'VPN': ['vpn', 'wireguard', 'openvpn'],
  'Proxy': ['proxy', 'socks', 'http proxy'],
  'Privacy': ['privacy', 'private', 'anonymity', 'tor'],
  'Encryption': ['encryption', 'crypto', 'cryptography', 'aes'],
  'Firewall': ['firewall', 'iptables', 'nftables'],
  'Network Monitoring': ['network monitor', 'packet', 'wireshark', 'sniffer'],

  // DevTools
  'IDE': ['ide', 'integrated development'],
  'Code Editor': ['code editor', 'text editor', 'vscode', 'neovim', 'zed'],
  'Debugging': ['debug', 'debugger', 'profiling'],
  'Git Tools': ['git tool', 'git gui', 'git client'],
  'API Tools': ['api tool', 'api client', 'postman', 'insomnia', 'swagger'],
  'Testing': ['testing', 'test framework', 'jest', 'pytest', 'cypress'],
  'DevOps': ['devops', 'ci/cd', 'docker', 'kubernetes', 'terraform'],

  // Media
  'PDF Tools': ['pdf', 'pdf tool', 'pdf editor'],
  'Image Tools': ['image tool', 'image editor', 'photo', 'graphics'],
  'Video Tools': ['video tool', 'video editor', 'ffmpeg'],
  'Audio Tools': ['audio tool', 'audio editor', 'music'],
  'Compression': ['compression', 'archive', 'zip', 'rar'],
  'Conversion': ['conversion', 'converter', 'transcode'],
  'Download Managers': ['download manager', 'downloader'],

  // Productivity
  'Notes': ['notes', 'note-taking', 'markdown notes'],
  'Task Management': ['task', 'todo', 'kanban', 'project management'],
  'Knowledge Management': ['knowledge', 'pkm', 'second brain', 'obsidian', 'logseq'],
  'Calendar': ['calendar', 'scheduling'],
  'Personal Tools': ['personal tool', 'utility'],

  // Education
  'Learning Tools': ['learning', 'education', 'course', 'tutorial'],
  'Language Learning': ['language learning', 'flashcard', 'anki'],
  'Quiz': ['quiz', 'flashcard', 'spaced repetition'],
  'Documentation': ['documentation', 'docs', 'wiki'],

  // Engineering
  'CAD': ['cad', 'computer-aided', '3d modeling'],
  'Robotics': ['robotics', 'robot', 'ros'],
  'IoT': ['iot', 'internet of things', 'mqtt', 'home assistant'],
  'Electronics': ['electronics', 'arduino', 'esp32', 'pcb'],
  'Simulation': ['simulation', 'simulator', 'physics'],

  // Experimental
  'Hidden Gems': ['hidden', 'underrated', 'gem'],
  'Research Projects': ['research', 'experimental', 'prototype'],
  'New Technologies': ['new tech', 'emerging', 'cutting-edge']
};

const LANGUAGE_MAP = {
  'JavaScript': ['js', 'javascript', 'node', 'nodejs'],
  'TypeScript': ['ts', 'typescript'],
  'Python': ['python', 'py', 'django', 'flask', 'fastapi'],
  'Go': ['go', 'golang'],
  'Rust': ['rust', 'rs'],
  'C++': ['c++', 'cpp', 'cxx'],
  'Java': ['java', 'jvm'],
  'Kotlin': ['kotlin'],
  'Swift': ['swift'],
  'Dart': ['dart', 'flutter'],
  'C#': ['c#', 'csharp', 'dotnet'],
  'Ruby': ['ruby', 'rails'],
  'PHP': ['php', 'laravel'],
  'Clojure': ['clojure'],
  'Elixir': ['elixir'],
  'Scala': ['scala']
};

class RepoAnalyzer {
  analyze(repo) {
    const text = this._buildText(repo);
    const categories = this._detectCategories(text, repo);
    const tags = this._extractTags(repo, text);
    const quality = this._scoreQuality(repo);
    const activity = this._scoreActivity(repo);
    const beginner = this._scoreBeginner(repo, text);

    return {
      categories: categories.length ? categories : ['Experimental'],
      tags,
      quality_score: quality,
      activity_score: activity,
      beginner_score: beginner,
      is_offline: this._isOffline(text, repo),
      is_lightweight: this._isLightweight(repo),
      is_trending: this._isTrending(repo)
    };
  }

  _buildText(repo) {
    const parts = [
      repo.name || '',
      repo.full_name || '',
      repo.description || '',
      (repo.topics || []).join(' '),
      repo.language || '',
      (repo.license && (repo.license.spdx_id || repo.license)) || ''
    ];
    return parts.join(' ').toLowerCase();
  }

  _detectCategories(text, repo) {
    const scores = {};
    for (const [cat, keywords] of Object.entries(KEYWORD_RULES)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw.toLowerCase())) score += 1;
      }
      if (score > 0) scores[cat] = score;
    }
    // Also check existing categories if present
    if (repo.categories) {
      repo.categories.forEach(c => {
        scores[c] = (scores[c] || 0) + 2;
      });
    }
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat]) => cat);
  }

  _extractTags(repo, text) {
    const tags = new Set(repo.topics || []);
    if (repo.language) tags.add(repo.language.toLowerCase());
    // Add derived tags
    if (text.includes('offline') || text.includes('local') || text.includes('self-hosted')) tags.add('offline');
    if (text.includes('privacy')) tags.add('privacy');
    if (text.includes('ai') || text.includes('ml')) tags.add('ai');
    return Array.from(tags).slice(0, 8);
  }

  _scoreQuality(repo) {
    let score = 50;
    const stars = repo.stargazers_count || 0;
    if (stars > 50000) score += 30;
    else if (stars > 10000) score += 20;
    else if (stars > 1000) score += 12;
    else if (stars > 100) score += 5;

    if (repo.license) score += 8;
    if (repo.description && repo.description.length > 40) score += 5;
    if ((repo.topics || []).length >= 3) score += 5;
    if (repo.forks_count > 500) score += 5;
    return Math.min(100, Math.max(0, score));
  }

  _scoreActivity(repo) {
    let score = 40;
    const updated = repo.updated_at ? new Date(repo.updated_at) : null;
    if (updated) {
      const days = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 7) score += 40;
      else if (days < 30) score += 30;
      else if (days < 90) score += 20;
      else if (days < 365) score += 10;
    }
    const stars = repo.stargazers_count || 0;
    if (stars > 10000) score += 15;
    else if (stars > 1000) score += 10;
    return Math.min(100, Math.max(0, score));
  }

  _scoreBeginner(repo, text) {
    let score = 50;
    if (text.includes('beginner') || text.includes('easy') || text.includes('simple') || text.includes('tutorial')) score += 20;
    if (text.includes('documentation') || text.includes('docs')) score += 10;
    if ((repo.stargazers_count || 0) > 5000) score += 10; // popular = more resources
    if (text.includes('advanced') || text.includes('complex') || text.includes('enterprise')) score -= 15;
    return Math.min(100, Math.max(0, score));
  }

  _isOffline(text, repo) {
    const offlineKeywords = ['offline', 'local', 'self-hosted', 'self hosted', 'on-device', 'desktop', 'native'];
    return offlineKeywords.some(k => text.includes(k)) || repo.is_offline === true;
  }

  _isLightweight(repo) {
    // Heuristic: fewer stars can sometimes mean smaller, but better: check name/description later
    if (repo.is_lightweight !== undefined) return repo.is_lightweight;
    const stars = repo.stargazers_count || 0;
    return stars < 20000; // rough heuristic
  }

  _isTrending(repo) {
    if (repo.is_trending !== undefined) return repo.is_trending;
    const updated = repo.updated_at ? new Date(repo.updated_at) : null;
    const days = updated ? (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24) : 999;
    return days < 14 && (repo.stargazers_count || 0) > 5000;
  }
}

const analyzer = new RepoAnalyzer();
window.analyzer = analyzer;
