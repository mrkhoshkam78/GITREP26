/**
 * GITREP26 V6 bootstrap — installs missing landing/theme/progress methods
 */
import { installLandingHelpers } from './landingHelpers.js';

function tryInstall() {
  if (window.app && window.app.constructor) {
    installLandingHelpers(window.app.constructor.prototype);
    try {
      if (!sessionStorage.getItem('gitrep26_entered')) window.app.showLanding?.();
      window.app.updateThemeToggleIcon?.();
    } catch (_) {}
    return true;
  }
  return false;
}

if (!tryInstall()) {
  let n = 0;
  const t = setInterval(() => {
    if (tryInstall() || ++n > 60) clearInterval(t);
  }, 40);
}
