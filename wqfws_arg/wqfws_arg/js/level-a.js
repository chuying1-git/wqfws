// ============================================================
//  WQFWS // SECRET ARCHIVE · LEVEL A · 门禁
//  这一页不在任何导航里，只能靠 robots.txt / 源码 / 控制台找到。
//  进门口令由五个页面的源码注释碎片拼成（顺序写在碎片自己身上）。
//  额外机制：夜班时段（20:00–04:00）会多出一段记录。
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { $, esc } from './ui.js';

const state = loadState();
const root = $('#level-a-root');
const prog = $('#la-prog');
const statusEl = $('#la-status');

const KEYWORD = 'gatekeeper';
// 五个碎片页：id 与序号（碎片文本在各自的 HTML 注释里，这页不给）
const FRAGS = [
  { id: 'room.html', idx: 1 },
  { id: 'mail.html', idx: 2 },
  { id: 'terminal.html', idx: 3 },
  { id: 'cipher.html', idx: 4 },
  { id: 'archive.html', idx: 5 },
];

function seenPages() {
  try {
    return JSON.parse(localStorage.getItem('wqfws-trace-v1') || '{}');
  } catch (e) { return {}; }
}

function isNight() {
  const h = new Date().getHours();
  return h >= 20 || h < 4;
}

function vars() {
  const seen = seenPages();
  const got = FRAGS.filter(f => seen[f.id]).length;
  return { seen, got, night: isNight() };
}

render();

function render() {
  const { got, night } = vars();
  if (prog) prog.textContent = `${got} / 5`;
  if (statusEl) statusEl.textContent = state.gatekeeperFound ? '门禁 · 已通过' : '门禁 · 未验证';

  if (state.gatekeeperFound) return renderOpen(night);

  root.innerHTML = `
    <p class="stage-note">
      你找到这里了。这一页从来没被写进导航，也不在任何列表里。<br>
      进门要一个口令 —— <b>十个字母</b>，由五个页面源码里的碎片拼成，<b>顺序写在碎片自己身上</b>。
      碎片不在页面上，只在源码里。
    </p>

    <div class="la-sheet">
      ${FRAGS.map(f => `
        <div class="la-cell ${vars().seen[f.id] ? 'got' : ''}">
          ${f.idx}/5<br>${vars().seen[f.id] ? '已翻' : '未翻'}
        </div>`).join('')}
    </div>

    <p class="stage-note" style="margin-bottom:10px;">
      上面只统计<b>你这台机器翻过哪些页面的源码</b>；碎片本身不会显示在这页上。
      ${got < 5 ? `<span class="hi">还差 ${5 - got} 页。</span>` : '<span class="hi">五片都翻过了 —— 拼起来。</span>'}
    </p>

    <div class="gate-field" id="la-field">
      <span class="pfx">&gt;</span>
      <input id="la-input" type="text" autocomplete="off" spellcheck="false"
             placeholder="口令" style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;">
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button class="gate-btn" id="la-go" type="button">验证口令</button>
      <a class="btn ghost" href="index.html">回档案首页</a>
    </div>
    <div class="inline-hint" id="la-msg" style="margin-top:12px;"></div>

    ${night ? `
      <div class="la-night">
        <b>夜班记录 · 已生效</b><br>
        现在属于夜班时段。门禁在黑夜里会多说一句：<br>
        「口令以 <b>k</b> 开头，以 <b>r</b> 结尾。中间那段，是三个索引里最不常被提起的那个的名字。」
      </div>` : `
      <div class="la-idle">夜班记录 · 未生效（20:00 之后再来，会有额外的一句）</div>`}
  `;

  const input = $('#la-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  $('#la-go').addEventListener('click', submit);
  input.focus();
}

function renderOpen(night) {
  root.innerHTML = `
    <p class="stage-note">
      口令正确。<b>gatekeeper</b> —— 三个合作者索引里，唯一一个从没在任何页面上露过面的那个。<br>
      LEVEL A 的权限现在对你开放了。
    </p>

    <div class="arg-reveal" style="border:1px solid rgba(109,255,158,0.45);border-radius:10px;
         background:rgba(109,255,158,0.07);padding:16px 18px;font-size:13px;line-height:2;">
      <div style="font-size:11px;letter-spacing:0.16em;color:rgba(109,255,158,0.5);">LEVEL A · 摘要</div>
      <div style="margin-top:10px;">
        1. <b>wqfws</b> 是主理，<b>radio</b> 负责频率（875），<b>gatekeeper</b> 负责门。<br>
        2. 门后不是新的关卡，是<b>跳过时间锁</b>的资格 —— 登记处会直接放你进去。<br>
        3. 档案里最深的一条不在任何页面上。它在 annex 03 那张图的像素里。
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
      <a class="gate-btn" href="live.html" style="text-decoration:none;display:inline-block;">去 01 · 登记（跳过等待）</a>
      <a class="btn ghost" href="smiler.html">去 annex 03</a>
      <a class="btn ghost" href="index.html">回档案首页</a>
    </div>

    ${night ? `
      <div class="la-night">
        <b>夜班记录 · 已生效</b><br>
        你是在夜里进来的。值班的人留了一句话：<br>
        「凡是能被搜到的，都不是秘密。凡是不能的，都在 <b>robots.txt</b> 里被禁止过。」
      </div>` : `
      <div class="la-idle">夜班记录 · 未生效（20:00 之后再来，会有额外的一句）</div>`}
  `;
}

let fails = 0;

function submit() {
  const input = $('#la-input');
  const msg = $('#la-msg');
  const raw = (input.value || '').trim().toLowerCase().replace(/[\s\-_]/g, '');

  if (!raw) { msg.className = 'inline-hint'; msg.innerHTML = '空的。'; return; }

  if (raw !== KEYWORD) {
    fails++;
    set('gatekeeperFails', fails);
    msg.className = 'inline-hint';
    let extra = '';
    if (fails === 2) extra = ' 五片分别在：信号、邮箱、终端、密钥本、档案。';
    if (fails >= 4) extra = ' 提示：去看那几个页面的源码注释（Ctrl+U），注释里写着序号和两个字母。';
    msg.innerHTML = `<b style="color:var(--red)">不对。</b>${extra}`;
    return;
  }

  setMany({ gatekeeperFound: true, hiddenEntryUnlocked: true });
  state.gatekeeperFound = true;
  state.hiddenEntryUnlocked = true;
  if (isNight()) { set('nightShiftSeen', true); state.nightShiftSeen = true; }
  render();
}
