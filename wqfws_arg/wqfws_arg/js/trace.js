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
