/**
 * GITREP26 V6 — Landing & theme helpers (extracted to fix missing methods)
 */
import { i18n } from './i18n.js';
import { storage } from './storage.js';

export function installLandingHelpers(AppProto) {
  AppProto.showLanding = function showLanding() {
    const el = document.getElementById('landing');
    if (!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('landing-active');
    this.fillLandingCats();
    requestAnimationFrame(() => {
      document.getElementById('landing-search')?.focus();
    });
  };

  AppProto.hideLanding = function hideLanding() {
    const el = document.getElementById('landing');
    if (!el) return;
    el.classList.add('hidden');
    document.body.classList.remove('landing-active');
  };

  AppProto.enterAppFromLanding = function enterAppFromLanding() {
    sessionStorage.setItem('gitrep26_entered', '1');
    this.hideLanding();
    this.navigate('home');
  };

  AppProto.submitLanding = function submitLanding() {
    const inp = document.getElementById('landing-search');
    const q = (inp?.value || '').trim();
    sessionStorage.setItem('gitrep26_entered', '1');
    this.hideLanding();
    if (q) {
      this.filters.q = q;
      const headerInp = document.getElementById('search-input');
      if (headerInp) headerInp.value = q;
      storage.addSearch(q);
      this.liveSearch(1);
    } else {
      this.navigate('explore');
    }
  };

  AppProto.fillLandingCats = function fillLandingCats() {
    const box = document.getElementById('landing-cats');
    if (!box || !this.categories?.length) return;
    const top = this.categories.slice(0, 8);
    box.innerHTML = top.map(c => {
      const name = i18n.lang === 'fa' ? (c.name_fa || c.name_en) : c.name_en;
      return `<button type="button" class="landing-cat" data-cat="${this.esc(c.id)}">${this.esc(name)}</button>`;
    }).join('');
    box.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('gitrep26_entered', '1');
        this.hideLanding();
        this.openCat(btn.dataset.cat);
      });
    });
  };

  AppProto.updateThemeToggleIcon = function updateThemeToggleIcon() {
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    if (!darkIcon || !lightIcon) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.body.classList.add('theme-switching');
    darkIcon.hidden = isLight;
    lightIcon.hidden = !isLight;
    setTimeout(() => document.body.classList.remove('theme-switching'), 450);
  };

  AppProto.setSearchProgress = function setSearchProgress(pct, label) {
    const wrap = document.getElementById('search-progress');
    const bar = document.getElementById('search-progress-bar');
    const lab = document.getElementById('search-progress-label');
    if (!wrap) return;
    if (pct == null || pct < 0) {
      wrap.setAttribute('hidden', '');
      wrap.hidden = true;
      if (bar) {
        bar.style.width = '0%';
        bar.style.setProperty('width', '0%');
      }
      this.searching = false;
      return;
    }
    wrap.removeAttribute('hidden');
    wrap.hidden = false;
    this.searching = true;
    const w = Math.min(100, Math.max(0, Number(pct) || 0));
    if (bar) {
      bar.style.width = w + '%';
      bar.style.setProperty('width', w + '%');
    }
    if (lab) lab.textContent = label || i18n.t('search_progress');
  };
}
