// ============================================================
//  WQFWS // SECRET ARCHIVE · 控制台埋点
//  每页在 <script src="js/trace.js" data-page=".." data-trace=".."> 上带自己的那句话。
//  不在页面上显示，只在 DevTools 里出现 —— 这是 ARG 的"暗面"。
// ============================================================
(function () {
  var s = document.currentScript;
  var d = (s && s.dataset) || {};
  var tag = '%cWQFWS // SECRET ARCHIVE' + (d.page ? ' · ' + d.page : '');
  var box = 'color:#6dff9e;background:#020604;padding:2px 7px;border:1px solid rgba(109,255,158,0.25)';
  console.log(tag, box);
  console.log('%c' + '频率 875 · 二周年快乐 · 二〇二五', 'color:rgba(109,255,158,0.45)');
  if (d.trace) console.log('%c' + d.trace, 'color:rgba(109,255,158,0.8)');
  if (d.b64) {
    try { console.log('%c' + decodeURIComponent(escape(atob(d.b64))), 'color:#ffd27d'); } catch (e) {}
  }
  if (d.frag) {
    console.log('%c片段 ' + d.frag, 'color:#ffd27d;font-weight:bold');
  }
  // 记录"这台机器翻过哪些页面"，供 LEVEL A 的碎片进度台读取
  try {
    var k = 'wqfws-trace-v1';
    var id = location.pathname.split('/').pop() || 'index.html';
    var seen = JSON.parse(localStorage.getItem(k) || '{}');
    seen[id] = Date.now();
    localStorage.setItem(k, JSON.stringify(seen));
  } catch (e) {}
})();

/* ---------- 版本水印 ---------- */
/* build.js 由 _dev/build_upload.mjs 按"内容指纹"生成（内容没变就不动）。
   右下角一行 + 控制台一行，用来一眼确认线上跑的是哪一版。
   trace.js 是全部 12 个页面都会加载的脚本，所以放这里；取不到就静默跳过。 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.fetch) return;
  fetch('build.js', { cache: 'no-store' })
    .then(function (r) { return r && r.ok ? r.text() : ''; })
    .then(function (t) {
      if (!t) return;
      var fp = /BUILD\s*=\s*'([0-9a-f]+)'/.exec(t);
      var at = /BUILT_AT\s*=\s*'([^']+)'/.exec(t);
      if (!fp) return;
      var tag = at ? fp[1] + ' · ' + at[1] : fp[1];
      try { console.log('%cWQFWS ARG · build ' + tag, 'color:#6dff9e;font-family:monospace'); } catch (e) {}
      var put = function () {
        if (!document.body || document.getElementById('build-stamp')) return;
        var el = document.createElement('div');
        el.id = 'build-stamp';
        el.className = 'build-stamp';
        el.textContent = 'build ' + fp[1];
        el.title = 'WQFWS ARG · build ' + tag;
        document.body.appendChild(el);
      };
      if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
    })
    .catch(function () {});
})();
