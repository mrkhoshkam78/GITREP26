/**
 * GPE V2 — Rule-based Repository Analyzer (no external AI)
 */
const RULES = {
  'AI Agents':['agent','agents','autonomous','multi-agent','agentic','browser-use'],
  'LLM':['llm','large language','gpt','llama','mistral','claude','transformer','language model'],
  'Local AI':['local-ai','local ai','ollama','offline ai','self-hosted ai','on-device','localai'],
  'Chatbots':['chatbot','chat bot','conversational','open-webui'],
  'RAG':['rag','retrieval augmented','vector store','embedding','langchain'],
  'Fine-Tuning':['fine-tun','finetun','lora','qlora','peft'],
  'Computer Vision':['computer vision','opencv','object detection','yolo','vision'],
  'OCR':['ocr','optical character','tesseract','text recognition'],
  'Speech AI':['speech','asr','whisper','voice'],
  'TTS':['tts','text-to-speech','speech synthesis'],
  'STT':['stt','speech-to-text','transcription'],
  'AI Coding':['code generation','copilot','codegen','ai coding'],
  'AI Automation':['automation','workflow','n8n','orchestrat'],
  'Image Generation':['stable diffusion','image generation','comfyui','midjourney','sdxl'],
  'Video AI':['video ai','video generation','runway'],
  'Multimodal AI':['multimodal','vision-language','vlm'],
  'ML Frameworks':['pytorch','tensorflow','jax','keras','scikit'],
  'Frontend':['frontend','react','vue','svelte','angular','next.js','astro'],
  'Backend':['backend','fastapi','express','django','spring','pocketbase'],
  'Full Stack':['fullstack','full-stack','full stack'],
  'Static Sites':['static site','ssg','astro','hugo','jekyll'],
  'SaaS':['saas','software as a service'],
  'CMS':['cms','content management','strapi','ghost'],
  'E-commerce':['ecommerce','e-commerce','shop','store'],
  'Dashboards':['dashboard','admin panel'],
  'Browser Extensions':['browser extension','chrome extension'],
  'Web Tools':['web tool','web utility'],
  'APIs':['api server','rest api','graphql'],
  'Scraping':['scraping','crawler','spider'],
  'Windows':['windows','win32','wpf'],
  'Linux':['linux','gtk'],
  'macOS':['macos','swiftui','raycast'],
  'File Managers':['file manager','file explorer'],
  'System Utilities':['system tool','system utility','remote desktop','rustdesk'],
  'Download Managers':['download manager','downloader'],
  'Launchers':['launcher','raycast','alfred'],
  'Backup Tools':['backup','restore'],
  'Monitoring':['monitoring','observability','metrics'],
  'Android':['android','kotlin'],
  'iOS':['ios','swift'],
  'Flutter':['flutter','dart'],
  'React Native':['react native','react-native','expo'],
  '2D Games':['2d game','2d engine'],
  '3D Games':['3d game','3d engine'],
  'Game Engines':['game engine','godot','unity','unreal','bevy'],
  'Game Tools':['game tool','level editor'],
  'Data Science':['data science','pandas','numpy','jupyter'],
  'Visualization':['visualization','chart','d3','plotly'],
  'Databases':['database','postgresql','sqlite','mongodb'],
  'ETL':['etl','data pipeline'],
  'Trading':['trading','stock','crypto trading'],
  'Cryptocurrency Tools':['cryptocurrency','crypto','bitcoin','ethereum'],
  'VPN':['vpn','wireguard','openvpn'],
  'Proxy':['proxy','socks'],
  'Privacy':['privacy','private','anonymity','self-hosted'],
  'Encryption':['encryption','cryptography'],
  'Security Tools':['security','firewall','auth'],
  'IDE':['ide','integrated development'],
  'Code Editors':['code editor','vscode','neovim','zed'],
  'Git Tools':['git tool','git gui'],
  'API Tools':['api tool','api client','postman','swagger'],
  'Testing':['testing','jest','pytest','cypress'],
  'DevOps':['devops','docker','kubernetes','terraform'],
  'CI/CD':['ci/cd','continuous integration','github actions'],
  'PDF Tools':['pdf'],
  'Image Tools':['image tool','image editor','photo'],
  'Video Tools':['video tool','ffmpeg'],
  'Audio Tools':['audio tool','audio editor'],
  'Compression':['compression','archive','zip'],
  'Notes':['notes','note-taking','obsidian','markdown'],
  'Tasks':['task','todo','kanban'],
  'Knowledge Management':['knowledge','pkm','second brain'],
  'Personal Wiki':['wiki','personal knowledge'],
  'Learning Tools':['learning','education','course'],
  'Language Learning':['language learning','flashcard','anki'],
  'IoT':['iot','home assistant','mqtt'],
  'Arduino':['arduino'],
  'Raspberry Pi':['raspberry pi','raspberrypi'],
  'Robotics':['robotics','ros'],
  'CAD':['cad','computer-aided'],
  'Hidden Gems':['hidden','underrated','gem'],
  'Emerging Technologies':['emerging','cutting-edge','experimental']
};

class Analyzer {
  analyze(repo) {
    const text = this._text(repo);
    const cats = this._cats(text, repo);
    const tags = this._tags(repo, text);
    return {
      categories: cats.length ? cats : ['Experimental'],
      tags,
      quality_score: this._quality(repo),
      activity_score: this._activity(repo),
      beginner_score: this._beginner(repo, text),
      popularity_score: this._popularity(repo),
      is_offline: this._offline(text, repo),
      is_lightweight: this._light(repo, text),
      is_trending: this._trending(repo),
      maintenance: this._maint(repo)
    };
  }
  _text(r) {
    return [r.name, r.full_name, r.description, (r.topics||[]).join(' '), r.language, r.license]
      .filter(Boolean).join(' ').toLowerCase();
  }
  _cats(text, repo) {
    const scores = {};
    for (const [cat, kws] of Object.entries(RULES)) {
      let s = 0;
      for (const k of kws) if (text.includes(k.toLowerCase())) s++;
      if (s) scores[cat] = s;
    }
    (repo.categories||[]).forEach(c => { scores[c] = (scores[c]||0)+3; });
    return Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c])=>c);
  }
  _tags(repo, text) {
    const t = new Set(repo.topics||[]);
    if (repo.language) t.add(repo.language.toLowerCase());
    if (/offline|local|self-hosted|self hosted|on-device/.test(text)) t.add('offline');
    if (/privacy/.test(text)) t.add('privacy');
    if (/\bai\b|machine.?learning|\bml\b/.test(text)) t.add('ai');
    return [...t].slice(0,10);
  }
  _quality(r) {
    let s = 50;
    const stars = r.stargazers_count||0;
    if (stars>50000) s+=30; else if (stars>10000) s+=20; else if (stars>1000) s+=12; else if (stars>100) s+=5;
    if (r.license) s+=8;
    if (r.description&&r.description.length>40) s+=5;
    if ((r.topics||[]).length>=3) s+=5;
    if ((r.forks_count||0)>500) s+=5;
    return Math.min(100, Math.max(0,s));
  }
  _activity(r) {
    let s = 40;
    if (r.updated_at) {
      const d = (Date.now()-new Date(r.updated_at).getTime())/(864e5);
      if (d<7) s+=40; else if (d<30) s+=30; else if (d<90) s+=20; else if (d<365) s+=10;
    }
    if ((r.stargazers_count||0)>10000) s+=15; else if ((r.stargazers_count||0)>1000) s+=10;
    return Math.min(100, Math.max(0,s));
  }
  _beginner(r, text) {
    let s = 50;
    if (/beginner|easy|simple|tutorial|getting.started/.test(text)) s+=20;
    if (/documentation|docs|readme/.test(text)) s+=10;
    if ((r.stargazers_count||0)>5000) s+=10;
    if (/advanced|complex|enterprise|low-level/.test(text)) s-=15;
    return Math.min(100, Math.max(0,s));
  }
  _popularity(r) {
    const stars = r.stargazers_count||0;
    if (stars>100000) return 99;
    if (stars>50000) return 95;
    if (stars>20000) return 88;
    if (stars>5000) return 75;
    if (stars>1000) return 60;
    return Math.min(50, Math.round(stars/20));
  }
  _offline(text, r) {
    if (r.is_offline!==undefined) return r.is_offline;
    return /offline|local|self-hosted|self hosted|on-device|desktop|native/.test(text);
  }
  _light(r, text) {
    if (r.is_lightweight!==undefined) return r.is_lightweight;
    return /lightweight|minimal|tiny|single.file|zero.dependency/.test(text) || (r.stargazers_count||0)<25000;
  }
  _trending(r) {
    if (r.is_trending!==undefined) return r.is_trending;
    if (!r.updated_at) return false;
    const d = (Date.now()-new Date(r.updated_at).getTime())/(864e5);
    return d<14 && (r.stargazers_count||0)>5000;
  }
  _maint(r) {
    if (r.maintenance) return r.maintenance;
    if (!r.updated_at) return 'stale';
    const d = (Date.now()-new Date(r.updated_at).getTime())/(864e5);
    if (d<30) return 'active';
    if (d<180) return 'maintained';
    return 'stale';
  }
}
export const analyzer = new Analyzer();
window.analyzer = analyzer;
