// ============================================================
//  WQFWS ARG - Simple SPA Router
//  Handles navigation without full page reloads, preserves state
// ============================================================

const routes = new Map();
let currentRoute = null;
let beforeNavigateHooks = [];

export function route(path, handler) {
  routes.set(path, handler);
}

export function beforeNavigate(hook) {
  beforeNavigateHooks.push(hook);
}

export function navigate(path, pushState = true) {
  // Run beforeNavigate hooks
  for (const hook of beforeNavigateHooks) {
    const result = hook(path, currentRoute);
    if (result === false) return; // Cancel navigation
  }
  
  const handler = routes.get(path);
  if (!handler) {
    // 这是多页站点：每个页面各自 import 本模块，routes 里只会有"自己那一条"。
    // 跨页目标（live.html / room.html / mail.html …）永远查不到 handler，
    // 以前这里只 warn 一句就 return —— 按钮就变成了死的。
    // 现在退化成整页跳转：SPA 的 pushState 只在同页路由（有 handler）时使用。
    if (/\.html($|[?#])/.test(path)) {
      window.location.href = path;
      return;
    }
    console.warn('No route for:', path);
    return;
  }
  
  if (pushState) {
    history.pushState({ path }, '', path);
  }
  
  currentRoute = path;
  handler();
  
  // Scroll to top
  window.scrollTo(0, 0);
}

export function getCurrentRoute() {
  return currentRoute;
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.path) {
    currentRoute = e.state.path;
    const handler = routes.get(currentRoute);
    if (handler) handler();
  }
});

// Initialize from current URL
export function initRouter() {
  const path = location.pathname.split('/').pop() || 'index.html';
  currentRoute = path;
  const handler = routes.get(path);
  if (handler) handler();
}

// Helper: create a link that uses SPA navigation
export function createLink(text, path, className = '') {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = text;
  a.className = className;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(path);
  });
  return a;
}