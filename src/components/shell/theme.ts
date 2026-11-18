/**
 * Theme persistence shared by the root layout's pre-paint script and the
 * client toggles. `data-theme` on <html> drives the tokens in globals.css.
 * Default follows prefers-color-scheme until the user picks a theme.
 */

export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "aceap-theme";

/**
 * Inline, render-blocking script placed in <head>. Applies the saved theme (or
 * the OS preference) before first paint, and keeps following the OS setting
 * while the user hasn't chosen one. Wrapped in try/catch for blocked storage.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var g=function(){try{return localStorage.getItem(k)}catch(e){return null}};var a=function(t){d.setAttribute("data-theme",t)};var s=g();var m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;if(s==="light"||s==="dark"){a(s)}else{a(m&&m.matches?"dark":"light")}if(m&&m.addEventListener){m.addEventListener("change",function(e){var c=g();if(c!=="light"&&c!=="dark")a(e.matches?"dark":"light")})}}catch(e){}})();`;

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode, policy): the choice lasts for this page only.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
