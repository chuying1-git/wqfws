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