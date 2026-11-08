// ============================================================
//  WQFWS // SECRET ARCHIVE · annex 03 · 笑魇
//  annex 03 不是一张图，是一条跨媒体链。五层分别藏在五种东西里，
//  顺序 L1 → L2 → L4 → L3 → L5，页面上一句答案都不给。
//    L1  IEND 之后的追加数据        strings / tail / xxd
//    L2  PNG tEXt / Comment         exiftool / pngcheck / PIL
//    L4  intercept.wav 频谱图        Audacity / numpy + STFT   ← 给出偏移量
//    L3  蓝色通道 LSB（偏移来自 L4）  必须写脚本逐位读像素
//    L5  frame-a / frame-b 差分      ImageMagick compare / PIL
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { $, esc, showToast, gateScreen, renderStations } from './ui.js';

const state = loadState();
const PAGE = 'smiler.html';
const root = $('#smiler-root');
const prog = $('#sm-prog');
const statusEl = $('#sm-status');

renderStations($('#arg-nav'), state, PAGE);

const IMG = 'assets/smiler.png';
const WAV = 'assets/intercept.wav';
const FRA = 'assets/frame-a.png';
const FRB = 'assets/frame-b.png';

// 五层：每层一个槽 + 判定。顺序即依赖顺序。
const LAYERS = [
  {
    id: 'smilerL1',
    key: 'L1',
    label: '文件尾',
    hint: 'IEND 之后还有东西 —— 用能看字节的工具。',
    ph: 'L1 · 尾部那行 base64 解出什么？',
    test: v => /tEXt/i.test(v) || (/comment/i.test(v) && /base64|png|元数据/i.test(v)),
    ok: '对。它只是个指针：下一层在 PNG 的 tEXt（Comment）里。',
  },
  {
    id: 'smilerL2',
    key: 'L2',
    label: '元数据',
    hint: 'PNG 的 tEXt / Comment 块，内容是 base64。',
    ph: 'L2 · Comment 指向哪里？',
    test: v => (/blue|蓝/i.test(v) && /lsb|最低位|低位/i.test(v))
      || /spectrogram|频谱|audio|wav|音频/i.test(v)
      || /offset=/i.test(v),
    ok: '对。它说在蓝色通道最低位 —— 但故意不给偏移量，偏移量在另一段媒体里。',
  },
  {
    id: 'smilerL4',
    key: 'L4',
    label: '音频',
    hint: '随图一起给了那段 wav。把它画成频谱图。',
    ph: 'L4 · 频谱图上写着一个三位数',
    test: v => /875/.test(v),
    ok: '对。875 既是主频，也是像素层的起始位偏移。',
  },
  {
    id: 'smilerL3',
    key: 'L3',
    label: '像素',
    hint: '长度头占第 0..31 位（32 位大端），载荷从那个偏移开始。',
    ph: 'L3 · 像素里读出的前半段？',
    test: v => /6031/.test(v) || /笑脸/.test(v),
    ok: '对。前半段到手：笑脸|6031',
  },
  {
    id: 'smilerL5',
    key: 'L5',
    label: '差分',
    hint: '另外两帧图只有红色通道不同 —— 逐像素相减。',
    ph: 'L5 · 差分行出的后半段？',
    test: v => /2219015/.test(v) || /60312219015/.test(v),
    ok: '对。后半段 2219015。两半拼起来才是完整载荷。',
  },
];

const SECRET = '笑脸|60312219015';

function doneCount() {
  return LAYERS.filter(l => state[l.id]).length;
}

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

function render() {
  const done = doneCount();
  if (prog) prog.textContent = `${done} / ${LAYERS.length}`;
  if (statusEl) statusEl.textContent = state.smilerSolved ? 'annex 03 · 已解密' : 'annex 03 · 未解密';

  root.innerHTML = `
    <p class="stage-note">
      这是 annex 03。图片本身没问题，<b>问题在图片里</b>。<br>
      它藏了 <b>五层</b>，而且刻意跨了三种媒体：一层在文件尾巴上，一层在元数据里，
      一个数字在一段<b>音频</b>的频谱图上，然后才是像素，最后还有两帧图的差分。
      页面上不会给你任何一层的答案 —— 你得把文件下到本地，用你自己的工具。
    </p>

    <div class="arg-shot-row">
      <img class="arg-shot" src="${IMG}" alt="annex 03" width="320" height="320">
      <div class="arg-tools" style="margin-top:10px;">
        配套素材：<a href="${WAV}" download="intercept.wav">intercept.wav</a> ·
        <a href="${FRA}" download="frame-a.png">frame-a.png</a> ·
        <a href="${FRB}" download="frame-b.png">frame-b.png</a>
      </div>
      <div class="arg-tools" style="margin-top:8px;">
        需要的工具都不特殊：<b>能看字节的</b>（xxd / hexdump / PowerShell）、
        <b>能解 base64 的</b>、<b>能读 PNG 元数据的</b>（exiftool / pngcheck / PIL）、
        <b>能看频谱的</b>（Audacity 或 numpy + STFT）、
        以及<b>一个能逐位读像素的脚本</b>。最后一层，光靠肉眼看是永远看不出来的。
      </div>
    </div>

    <div class="oslots">
      ${LAYERS.map(l => `
        <div class="oslot cmd ${state[l.id] ? 'filled' : ''}">
          <span class="ph">${state[l.id] ? '✔ ' + l.key + ' · ' + l.label + ' 已解出' : l.ph}</span>
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
        五层全部解出 · 拼起来的完整载荷
      </div>
      <div class="big" style="margin:10px 0;">${esc(state.smilerSecret || SECRET)}</div>
      <div style="font-size:12px;color:var(--g-dim);line-height:2;">
        L3 给出前半段 <span class="code">笑脸|6031</span>，
        L5 给出后半段 <span class="code">2219015</span>，合起来才是：
        昵称 <b>笑脸</b>　抖音号 <b class="code">60312219015</b>。<br>
        这串东西只存在于那张 PNG 的蓝色通道最低位里 —— 重新保存一次图片，它就没了。<br>
        它同时是终局校验的第 <b>5</b> 段 —— 去 <a href="archive.html">机密档案</a> 交。
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
      <a class="btn ghost" href="archive.html" style="text-decoration:none;">去机密档案 →</a>
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
  if (next.id === 'smilerL5') {
    patch.smilerSolved = true;
    patch.smilerSecret = SECRET;
  }
  setMany(patch);
  Object.assign(state, patch);
  renderStations($('#arg-nav'), state, PAGE);

  const finished = !!patch.smilerSolved;
  if (finished) showToast('五层全部解出', '像素里的载荷已经拼出来了。', 'success');

  render();
  const m2 = $('#sm-msg');
  if (m2) { m2.className = 'inline-hint'; m2.innerHTML = `<b style="color:var(--g)">${next.ok}</b>`; }
}

// 重置本档
document.addEventListener('click', e => {
  if (e.target.id === 'sm-clear') {
    const patch = {
      smilerL1: false, smilerL2: false, smilerL3: false,
      smilerL4: false, smilerL5: false,
      smilerSolved: false, smilerSecret: '',
    };
    setMany(patch);
    Object.assign(state, patch);
    render();
  }
});
