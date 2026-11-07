// ============================================================
//  WQFWS // SECRET ARCHIVE · annex 03 · 笑魇
//  smiler.png 里藏了三层。三层都必须用工具扒，页面上不给答案。
//    L1  IEND 之后的追加数据        strings / tail / xxd
//    L2  PNG tEXt 元数据            exiftool / pngcheck / PIL
//    L3  蓝色通道 LSB（偏移 875）    必须写脚本逐位读像素
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { $, esc, gateScreen, renderStations } from './ui.js';

const state = loadState();
const PAGE = 'smiler.html';
const root = $('#smiler-root');
const prog = $('#sm-prog');
const statusEl = $('#sm-status');

renderStations($('#arg-nav'), state, PAGE);

const IMG = 'assets/smiler.png';

// 三层：每层一个槽 + 判定
const LAYERS = [
  {
    id: 'smilerL1',
    key: 'L1',
    label: '文件尾',
    hint: 'IEND 之后还有东西。',
    ph: 'L1 · 尾部的 base64 解出什么？',
    // 接受任何能证明解过 base64 的写法
    test: v => /text/i.test(v) && /comment/i.test(v),
    ok: '对。这一层只是个指针，指向 PNG 的元数据。',
  },
  {
    id: 'smilerL2',
    key: 'L2',
    label: '元数据',
    hint: 'PNG 的 tEXt 块里有一句中文提示。',
    ph: 'L2 · Comment 里指向哪里？',
    test: v => (/blue|蓝/i.test(v) && /lsb|最低位|低位/i.test(v)) || /875/.test(v),
    ok: '对。第三层在蓝色通道最低位 —— 而且不是从第 0 位开始。',
  },
  {
    id: 'smilerL3',
    key: 'L3',
    label: '像素',
    hint: '长度头在 0..31 位，载荷起点由那个频率决定。',
    ph: 'L3 · 像素里藏着什么？',
    test: v => /笑脸/.test(v) || /60312219015/.test(v),
    ok: '对。这就是最深的那一层。',
  },
];

// 门禁：终端贯通之后才出现这一档
if (!state.pipelineSolved) {
  gateScreen(root, {
    title: 'annex 03 未开放',
    lines: [
      '这一档排在终端之后。',
      '先把管道贯通，档案才会把 annex 03 挂出来。',
    ],
    hint: '去 <a href="terminal.html">终端</a>。',
  });
} else {
  render();
}

function doneCount() {
  return LAYERS.filter(l => state[l.id]).length;
}

function render() {
  const done = doneCount();
  if (prog) prog.textContent = `${done} / 3`;
  if (statusEl) statusEl.textContent = state.smilerSolved ? 'annex 03 · 已解密' : 'annex 03 · 未解密';

  root.innerHTML = `
    <p class="stage-note">
      这是 annex 03。图片本身没问题，<b>问题在图片里</b>。<br>
      它藏了 <b>三层</b>：一层在文件尾巴上，一层在元数据里，最后一层在像素里。
      页面上不会给你任何一层的答案 —— 你得把图下到本地，用你自己的工具。
    </p>

    <div class="arg-shot-row">
      <img class="arg-shot" src="${IMG}" alt="annex 03" width="320" height="320">
      <a class="btn ghost" href="${IMG}" download="smiler.png">下载 smiler.png</a>
      <div class="arg-tools" style="margin-top:10px;">
        需要的工具都不特殊：<b>能看字节的</b>（xxd / hexdump / PowerShell）、
        <b>能解 base64 的</b>、<b>能读 PNG 元数据的</b>（exiftool / pngcheck / PIL）、
        以及<b>一个能逐位读像素的脚本</b>。最后那一层，光靠肉眼看是永远看不出来的。
      </div>
    </div>

    <div class="oslots">
      ${LAYERS.map(l => `
        <div class="oslot cmd ${state[l.id] ? 'filled' : ''}">
          <span class="ph">${state[l.id] ? '✔ ' + l.label + ' 已解出' : l.ph}</span>
        </div>`).join('')}
    </div>

    ${state.smilerSolved ? revealBlock() : inputBlock()}
  `;

  const input = $('#sm-input');
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    $('#sm-go').addEventListener('click', submit);
    input.focus();
  }
}

function inputBlock() {
  const next = LAYERS.find(l => !state[l.id]);
  return `
    <p class="stage-note" style="margin-top:16px;">
      正在校验：<b>${next.key} · ${next.label}</b>　<span class="hi">${next.hint}</span>
    </p>
    <div class="gate-field" id="sm-field">
      <span class="pfx">&gt;</span>
      <input id="sm-input" type="text" autocomplete="off" spellcheck="false"
             placeholder="${esc(next.ph)}" style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;">
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button class="gate-btn" id="sm-go" type="button">校验这一层</button>
      <button class="btn ghost" id="sm-clear" type="button">重置本档进度</button>
    </div>
    <div class="inline-hint" id="sm-msg" style="margin-top:12px;"></div>
  `;
}

function revealBlock() {
  return `
    <div class="arg-reveal">
      <div style="font-size:11px;letter-spacing:0.16em;color:rgba(109,255,158,0.5);">
        三层全部解出 · 像素里的载荷
      </div>
      <div class="big" style="margin:10px 0;">${esc(state.smilerSecret || '笑脸|60312219015|二周年快乐')}</div>
      <div style="font-size:12px;color:var(--g-dim);line-height:2;">
        昵称：<b>笑脸</b>　抖音号：<b class="code">60312219015</b>　二周年快乐。<br>
        这段东西只存在于那张 PNG 的蓝色通道最低位里。重新保存一次图片，它就没了。<br>
        它同时是终局校验的第 <b>5</b> 段 —— 去 <a href="archive.html">机密档案</a> 交。
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
      <a class="btn ghost" href="archive.html">去机密档案 →</a>
      <button class="btn ghost" id="sm-clear" type="button">重置本档进度</button>
    </div>
  `;
}

function submit() {
  const input = $('#sm-input');
  const msg = $('#sm-msg');
  const raw = (input.value || '').trim();
  const next = LAYERS.find(l => !state[l.id]);
  if (!next) return;

  if (!raw) {
    msg.className = 'inline-hint';
    msg.innerHTML = '空的。先去看文件。';
    return;
  }
  if (!next.test(raw)) {
    msg.className = 'inline-hint';
    msg.innerHTML = `<b style="color:var(--red)">不对。</b> 再回去看一遍 ${next.key}。`;
    return;
  }

  // 通过：落库，进入下一层
  const patch = { [next.id]: true };
  if (next.id === 'smilerL3') {
    patch.smilerSolved = true;
    patch.smilerSecret = '笑脸|60312219015|二周年快乐';
  }
  setMany(patch);
  Object.assign(state, patch);
  renderStations($('#arg-nav'), state, PAGE);

  if (patch.smilerSolved) {
    showToastLike('三层全部解出', '像素里的载荷已经取出来了。');
  }
  render();
  const m2 = $('#sm-msg');
  if (m2) { m2.className = 'inline-hint'; m2.innerHTML = `<b style="color:var(--g)">${next.ok}</b>`; }
}

// 重置本档
document.addEventListener('click', e => {
  if (e.target.id === 'sm-clear') {
    const patch = { smilerL1: false, smilerL2: false, smilerL3: false, smilerSolved: false, smilerSecret: '' };
    setMany(patch);
    Object.assign(state, patch);
    render();
  }
});

// 轻量提示：沿用原作 .badge 的观感，不引入新组件
function showToastLike(title, body) {
  const el = document.createElement('div');
  el.className = 'badge';
  el.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:200;'
    + 'padding:10px 16px;background:rgba(2,6,4,0.96);border:1px solid rgba(109,255,158,0.55);'
    + 'border-radius:8px;color:var(--g);font-size:12px;letter-spacing:0.06em;';
  el.innerHTML = `<b>${esc(title)}</b> · ${esc(body)}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
