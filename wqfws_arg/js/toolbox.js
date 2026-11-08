// ============================================================
//  WQFWS // SECRET ARCHIVE · 工具台
//  M.E.G. 工具台的编解码台：base64 ↔ 文本、十六进制 ↔ 文本。
//
//  设计原则（有意为之）：
//    · 只做机械换算。没有位移密码（ROT13/Caesar）、没有维吉尼亚、没有"二进制→十进制"，
//      也没有自动猜编码 —— 那些属于档案本身，得玩家自己算。
//    · 不联网。atob/btoa 都在本地，输入不会离开浏览器。
//    · 不做任何"该解哪一段"的提示。
//    · 【没有站点导航】工具台不带你走任何地方：它不渲染站点列表、不链回 ARG 主页。
//      想进 ARG，只能靠你自己把该解的东西解出来。
// ============================================================
import { $, esc, showToast } from './ui.js';

const IN = $('#tb-in');
const OUT = $('#tb-out');
const MSG = $('#tb-msg');
const ACT = $('#tb-actions');
const HIST = $('#tb-hist');
const PROG = $('#tb-prog');
const STATUS = $('#tb-status');

const history = [];   // 只在内存里，刷新即清空

/* ---------------- 字节工具 ---------------- */

function cleanB64(raw) {
  let s = String(raw || '').trim();
  const d = /^data:[^,]*base64,(.*)$/s.exec(s);        // data:image/png;base64,xxxx
  if (d) s = d[1];
  s = s.replace(/\s+/g, '');                            // 换行 / 缩进
  s = s.replace(/-/g, '+').replace(/_/g, '/');          // URL-safe 变体
  const before = s.length;
  s = s.replace(/[^A-Za-z0-9+/=]/g, '');                // 引号、逗号、尖括号、中文…
  const stripped = before - s.length;
  s = s.replace(/=+$/, '');                             // 末尾多余 padding
  if (!s) return { s: '', stripped };
  const pad = s.length % 4;
  if (pad === 1) return { s, stripped };                // 长度非法，交给调用方报错
  return { s: pad ? s + '='.repeat(4 - pad) : s, stripped };
}

function b64ToBytes(raw) {
  const { s, stripped } = cleanB64(raw);
  if (!s) return { err: '输入是空的，或者里面没有 base64 字符。' };
  if (s.length % 4 === 1) return { err: '这串东西不是合法的 base64（长度对不上 4 的倍数）。' };
  let bin;
  try { bin = atob(s); } catch (e) { return { err: '这串东西不是合法的 base64。' }; }
  return {
    bytes: Uint8Array.from(bin, c => c.charCodeAt(0)),
    warn: stripped > 0
      ? `输入里有 <b>${stripped}</b> 个字符不是 base64（引号、标点、中文之类），已经忽略 —— 确认这就是你要解的那串。`
      : '',
  };
}

function bytesToB64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// UTF-8 严格解码：成功说明是文本，失败说明是原始字节
function asText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch (e) { return null; }
}

function hexDump(bytes) {
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
    const ascii = Array.from(chunk).map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join('');
    rows.push(`${String(i).padStart(5, '0')}  ${hex}  |${ascii}|`);
  }
  return rows.join('\n');
}

function hexToBytes(raw) {
  const s = String(raw || '').replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (!s) return { err: '输入里没有十六进制字符。' };
  if (s.length % 2) return { err: '十六进制位数是奇数 —— 少了一个字符。' };
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.substr(i * 2, 2), 16);
  return { bytes };
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

/* ---------------- 渲染 ---------------- */

function setMsg(html, kind) {
  if (!MSG) return;
  MSG.className = 'tb-msg' + (kind ? ' ' + kind : '');
  MSG.innerHTML = html || '';
}

function showText(text, meta, warn) {
  const urls = text.match(/https?:\/\/[^\s"'<>]+/g);
  const body = esc(text).replace(
    /(https?:\/\/[^\s"'<>]+)/g,
    u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`
  );
  OUT.innerHTML = `<pre class="tb-pre">${body}</pre>` +
    (meta ? `<div class="tb-meta">${meta}</div>` : '');
  ACT.innerHTML = `<button class="btn ghost" id="tb-copy" type="button">复制输出</button>` +
    (urls ? `<a class="btn ghost" href="${urls[0]}" target="_blank" rel="noopener" style="text-decoration:none;">打开这个地址 →</a>` : '');
  const cp = $('#tb-copy');
  if (cp) cp.addEventListener('click', () => copy(text));

  // 多层编码：解出来还是一段 base64 / 十六进制，就给一句机械提示（不解释它是什么）
  const t = text.trim();
  let hint = '';
  if (/^[A-Za-z0-9+/=_-]{16,}$/.test(t) && t.length % 4 !== 1 && /[A-Z+/=]/.test(t)) {
    hint = '这结果看着<b>还是一段 base64</b>。把它贴回上面再来一次。';
  } else if (/^[0-9a-fA-F\s]{32,}$/.test(t) && t.replace(/\s/g, '').length % 2 === 0) {
    hint = '这结果看着<b>像是十六进制</b>。用上面的「十六进制 → 文本」。';
  }
  setMsg([warn, hint].filter(Boolean).join('<br>'));
}

function showBytes(bytes, label, warn) {
  const text = asText(bytes);
  if (text !== null) {
    showText(text, `${label} · ${bytes.length} 字节 · UTF-8 文本`, warn);
    return;
  }
  OUT.innerHTML = `<pre class="tb-pre tb-hex">${esc(hexDump(bytes))}</pre>` +
    `<div class="tb-meta">${label} · ${bytes.length} 字节 · <b>不是文本</b>，所以按原始字节给你看</div>`;
  ACT.innerHTML = `<button class="btn ghost" id="tb-copy" type="button">复制十六进制</button>`;
  const cp = $('#tb-copy');
  if (cp) cp.addEventListener('click', () => copy(hexDump(bytes)));
  setMsg([warn, '这段解出来不是人能直接读的文本 —— 它是字节。先看右边的 <span class="code">|..|</span> 那一栏里有没有字。']
    .filter(Boolean).join('<br>'));
}

function copy(text) {
  const done = () => showToast('已复制', '输出已经在你的剪贴板里。', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
  ta.remove();
}

function pushHistory(label, input, summary) {
  history.unshift({ label, input, summary });
  if (history.length > 5) history.pop();
  if (!HIST) return;
  HIST.innerHTML = history.length
    ? `<div class="field-label" style="margin-top:16px;">刚才算过</div>` + history.map((h, i) =>
        `<button class="tb-hitem" data-h="${i}" type="button">
           <span class="tb-hlabel">${esc(h.label)}</span>
           <span class="tb-hsum">${esc(h.summary)}</span>
         </button>`).join('')
    : '';
  HIST.querySelectorAll('.tb-hitem').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = history[+btn.dataset.h];
      if (!h) return;
      IN.value = h.input;
      IN.focus();
    });
  });
}

/* ---------------- 动作 ---------------- */

function run(label, fn) {
  const raw = IN.value;
  PROG.textContent = label;
  const r = fn(raw);
  if (r.err) {
    OUT.innerHTML = `<span class="tb-dim">没有输出。</span>`;
    ACT.innerHTML = '';
    setMsg(`<b style="color:var(--red)">${esc(r.err)}</b>`, 'err');
    STATUS.textContent = 'ERROR';
    return;
  }
  if (r.text !== undefined) {
    showText(r.text, `${label} · ${utf8Bytes(r.text).length} 字节`, r.warn);
    STATUS.textContent = `${label} · OK`;
    pushHistory(label, raw, r.text.slice(0, 42).replace(/\s+/g, ' '));
    reward(r.text);
  } else if (r.bytes) {
    showBytes(r.bytes, label, r.warn);
    STATUS.textContent = `${label} · ${r.bytes.length} 字节`;
    pushHistory(label, raw, `${r.bytes.length} 字节`);
  }
}

// 解到最深处的那个东西时，给一句反应（不改状态、不上报）
function reward(text) {
  if (/60312219015/.test(text) || /笑脸/.test(text)) {
    showToast('你把它解出来了', '有些东西只存在于它的原始字节里 —— 重新保存一次，它就没了。', 'success');
    console.log('%c工具台：载荷确认。', 'color:#6dff9e;background:#020604;padding:2px 7px;border:1px solid rgba(109,255,158,.25)');
  }
}

$('#tb-b64d').addEventListener('click', () => run('base64 解码', raw => {
  const r = b64ToBytes(raw);
  if (r.err) return r;
  return { bytes: r.bytes, warn: r.warn };
}));

$('#tb-b64e').addEventListener('click', () => run('base64 编码', raw => {
  if (!String(raw).length) return { err: '输入是空的。' };
  return { text: bytesToB64(utf8Bytes(String(raw))) };
}));

$('#tb-hexd').addEventListener('click', () => run('十六进制 → 文本', raw => {
  const r = hexToBytes(raw);
  if (r.err) return r;
  return { bytes: r.bytes };
}));

$('#tb-hexe').addEventListener('click', () => run('文本 → 十六进制', raw => {
  if (!String(raw).length) return { err: '输入是空的。' };
  return { text: bytesToHex(utf8Bytes(String(raw))) };
}));

$('#tb-clear').addEventListener('click', () => {
  IN.value = '';
  OUT.innerHTML = '<span class="tb-dim">还没算过。</span>';
  ACT.innerHTML = '';
  setMsg('');
  PROG.textContent = 'IDLE';
  STATUS.textContent = 'LOCAL · 全部在你的浏览器里算';
  IN.focus();
});

IN.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#tb-b64d').click(); }
});

IN.focus();

// 媒体取证台（字节 / PNG 块 / 文件尾 / 频谱 / 像素位读取）。
// 用动态 import：即使这个模块缺失，编解码台也照常能用。
import('./media.js').then((m) => m.initMedia()).catch(() => {});
