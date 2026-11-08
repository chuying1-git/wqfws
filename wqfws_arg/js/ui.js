// ============================================================
//  WQFWS ARG - Shared UI helpers
//  toast / nav gating / small utils  (used by every page)
// ============================================================

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Toast ----------
export function showToast(title, body, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'argToastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

// ---------- Nav gating ----------
// Links are matched by href, so pages don't need ids on every <a>.
const NAV_RULES = [
  { href: 'live.html',     need: s => s.hiddenEntryUnlocked || s.liveReserved },
  { href: 'room.html',     need: s => s.liveReserved },
  { href: 'mail.html',     need: s => s.mailCreated },
  { href: 'terminal.html', need: s => s.pipelineUnlocked },
  { href: 'cipher.html',   need: s => s.cipherBookUnlocked },
  { href: 'smiler.html',   need: s => s.pipelineSolved },
  { href: 'archive.html',  need: s => s.awakened },
];

export function initNav(state) {
  const here = location.pathname.split('/').pop() || 'index.html';
  for (const rule of NAV_RULES) {
    const a = document.querySelector(`a[href="${rule.href}"]`);
    if (!a) continue;
    const onThisPage = here === rule.href;
    const ok = onThisPage || rule.need(state);
    a.style.display = ok ? 'inline-block' : 'none';
    if (onThisPage) a.classList.add('nav-current');
  }
}

// ---------- Text helpers ----------
export function esc(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function mmss(ms) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function clockText(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------- Gate screen (rendered when a page's precondition is missing) ----------
export function gateScreen(container, { title, lines = [], hint = '', back = 'index.html' }) {
  if (!container) return;
  container.innerHTML = `
    <div class="gate-screen">
      <div class="gate-icon">🔒</div>
      <h2 class="gate-title">${esc(title)}</h2>
      <ul class="gate-lines">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
      ${hint ? `<div class="gate-hint">${hint}</div>` : ''}
      <a class="back-link" href="${back}">← 返回</a>
    </div>
  `;
}

// ---------- Terminal-style typewriter for clue lines ----------
export async function typeInto(el, text, speed = 18) {
  el.textContent = '';
  for (const ch of text) {
    el.textContent += ch;
    if (speed) await sleep(speed);
  }
}

// ---------- Original-style station navigation ----------
// Mirrors the .stations / .station markup of the original WQFWS archive page.
export const ARG_PAGES = [
  { href: 'index.html',    ico: '📁', name: '00 · 档案首页', desc: '秘密档案入口',       need: () => true },
  { href: 'live.html',     ico: '📅', name: '01 · 登记',     desc: '取得直播资格',       need: s => s.hiddenEntryUnlocked || s.liveReserved },
  { href: 'room.html',     ico: '📡', name: '02 · 信号',     desc: '四段视频流 · 三步复核', need: s => s.liveReserved },
  { href: 'mail.html',     ico: '✉️', name: '03 · 内部邮箱', desc: '双账号 · 归档邮件',   need: s => s.mailCreated },
  { href: 'terminal.html', ico: '⌨️', name: '04 · 终端管道', desc: '八条命令 · 两条陷阱', need: s => s.pipelineUnlocked },
  { href: 'cipher.html',   ico: '🔑', name: '05 · 密钥本',   desc: '维吉尼亚表 · 错行',   need: s => s.cipherBookUnlocked },
  { href: 'smiler.html',   ico: '🙂', name: '06 · 笑魇档案', desc: '图里藏了三层',       need: s => s.pipelineSolved },
  { href: 'archive.html',  ico: '🗄️', name: '07 · 机密档案', desc: '觉醒之后',           need: s => s.awakened },
  // 工具台：不设门槛（哪天在图片尾巴/元数据/控制台里撞见一串字节，随时能来换算）
  { href: 'toolbox.html',  ico: '🧰', name: '工具台',        desc: 'base64 · 十六进制 · 本地运算', need: () => true },
  { href: 'level-a.html',  ico: '🚪', name: '08 · LEVEL A',  desc: '门禁 · 口令',        need: s => s.gatekeeperFound, hidden: true },
];

export function renderStations(container, state, current) {
  if (!container) return;
  // hidden 的站点在解锁前完全不出现（导航里连位置都不留）
  const pages = ARG_PAGES.filter(p => !(p.hidden && !p.need(state)));
  container.innerHTML = pages.map(p => {
    const locked = !p.need(state);
    const here = p.href === current;
    const done = !locked && !here;
    const cls = ['station', locked ? 'locked' : '', here ? 'active' : '', done ? 'done' : ''].filter(Boolean).join(' ');
    const st = locked ? '未开放' : here ? '当前' : '可进入';
    return `<button class="${cls}" id="${p.href.replace('.html', '')}-nav-link" data-href="${p.href}" type="button"${locked ? ' disabled' : ''}>
      <div class="st-ico">${p.ico}</div>
      <div class="st-name">${p.name}</div>
      <div class="st-desc">${p.desc}</div>
      <div class="st-state">${st}</div>
    </button>`;
  }).join('');
  container.onclick = e => {
    const btn = e.target.closest('.station');
    if (!btn || btn.disabled) return;
    const href = btn.dataset.href;
    if (href !== current) location.href = href;
  };
}
