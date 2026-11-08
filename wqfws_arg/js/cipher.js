// ============================================================
//  WQFWS ARG - 密钥本 (cipher.html)
//  维吉尼亚表 + 一行被故意改错 + 校验规则要求玩家自己找出来
//  用错表解码 → 得到 HAMYU；修正后 → HANYU（终局第 4 段）
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, renderStations, gateScreen, esc } from './ui.js';

const state = loadState();
renderStations($('#arg-nav'), state, 'cipher.html');

const root = $('#cipher-root');
const A = 65;
const letter = n => String.fromCharCode(A + ((n % 26) + 26) % 26);

const CIPHER_TEXT = 'HLZMH';   // Vigenere(plaintext=HANYU, key=ALMOND)
const KEY_TEXT = 'ALMOND';
const PLAIN = 'HANYU';

let tableFixed = false;

// ------------------------------------------------------------
// 表：第 M 行的位移被改成 13（正确应为 12）
// ------------------------------------------------------------
function shiftOf(rowIdx) {
  if (rowIdx === 12 /* M */ && !tableFixed) return 13;
  return rowIdx;
}

function rowString(rowIdx) {
  const s = shiftOf(rowIdx);
  return Array.from({ length: 26 }, (_, c) => letter(c + s)).join('');
}

function prog(text) {
  const el = $('#cp-prog');
  if (el) el.textContent = text;
}

function status(text) {
  const el = $('#cp-status');
  if (el) el.textContent = text;
}

function render() {
  const gateOk = state.cipherBookUnlocked;
  if (!gateOk) {
    prog('未授权');
    gateScreen(root, {
      title: '密钥本未授权调阅',
      lines: [
        '密钥本是内部培训资料，不对外公开。',
        '它至少有两个入口：内部邮箱里「导播组」误发的那封邮件，或者维基检索里的某个词条。',
      ],
      hint: '去 <a href="mail.html">内部邮箱</a> 找那封标题带「误发」的邮件；或在维基主页搜索「密钥本」。',
    });
    return;
  }

  prog(tableFixed ? '第 M 行已修正' : '未校验');
  status(tableFixed ? 'CIPHER BOOK · 已修正' : 'CIPHER BOOK · 改版未校验');

  root.innerHTML = `
    <div class="section-title">内部密钥本 · 维吉尼亚表</div>

    <p class="stage-note">
      用于解密终端第 4 段输出。本表由培训部维护，<span class="hi">改版时未做全量校验</span>。
    </p>

    <p class="stage-note" style="margin-top:14px;">
      每一行的行首字母为 <span class="code">K</span>，该行是把字母表左移 <span class="code">K</span> 位得到的。
      维护部因此留下两条可机械校验的恒等式：
    </p>
    <ol class="stage-note" style="line-height:2;margin-top:6px;padding-left:20px;">
      <li><b>行首自明</b>：第 K 行的第一个字母必须正好是 K；</li>
      <li><b>逐行递进</b>：相邻两行必须整体相差一位，即 <span class="code">row[K][c] = row[K-1][c] + 1</span>。</li>
    </ol>
    <p class="stage-note" style="margin-top:10px;">
      维护记录显示：<b>恒等式 1 只会被一行违反，而恒等式 2 会被两行违反</b>
      —— 一行错了，它跟上一行的递进关系断裂，跟下一行的递进关系也一起断裂。
      两条规则的<b>交集</b>只有一个字母。报出它。
    </p>

    <div class="gate-field" id="vig-row-field" style="margin-top:16px;">
      <span class="pfx">&gt;</span>
      <input id="vig-row" type="text" maxlength="1" placeholder="哪一行的行首字母？（单个大写字母）"
             autocomplete="off" spellcheck="false"
             style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;text-transform:uppercase;">
    </div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button class="gate-btn" id="vig-row-go" type="button">提交</button>
      ${state.cipherRowFound && !tableFixed ? '<button class="btn ghost" id="vig-fix" type="button">按正确位移修正该行</button>' : ''}
    </div>
    <div class="inline-hint" id="vig-row-msg">${state.cipherRowFound ? '已确认错行。' : ''}</div>

    <div class="vig-wrap">${renderTable()}</div>

    <div class="gate-card" style="margin-top:20px;">
      <div class="gate-hd"><span class="dot"></span>解密器<span class="spacer"></span><span class="ver">VIGENERE</span></div>
      <div class="gate-bd">
        <p class="stage-note" style="margin-top:0;">
          终端贯通后会吐出一段密文。密钥是你在直播间复原的那个<b>信标名</b>。<br>
          注意：解密器直接读上面这张表 —— 表没修正，结果就是错的。
        </p>

        <label class="field-label" for="vig-cipher">密文</label>
        <div class="gate-field">
          <span class="pfx">&gt;</span>
          <input id="vig-cipher" type="text" value="${CIPHER_TEXT}"
                 style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;">
        </div>

        <label class="field-label" for="vig-key">密钥（信标名）</label>
        <div class="gate-field">
          <span class="pfx">&gt;</span>
          <input id="vig-key" type="text" placeholder="密钥" autocomplete="off" spellcheck="false"
                 style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;text-transform:uppercase;">
        </div>

        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
          <button class="gate-btn" id="vig-go" type="button">解密</button>
        </div>
        <div class="inline-hint" id="vig-out"></div>

        <div id="vig-confirm-wrap" style="display:none;margin-top:14px;">
          <label class="field-label" for="vig-confirm">把解出的明文填进来（终局第 4 段）</label>
          <div class="gate-field">
            <span class="pfx">&gt;</span>
            <input id="vig-confirm" type="text" placeholder="明文" autocomplete="off" spellcheck="false"
                   style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;text-transform:uppercase;">
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <button class="gate-btn" id="vig-confirm-go" type="button">确认</button>
          </div>
          <div class="inline-hint" id="vig-confirm-msg"></div>
        </div>
      </div>
    </div>
  `;

  $('#vig-row-go').addEventListener('click', checkRow);
  $('#vig-cipher').addEventListener('input', () => { /* keep manual */ });
  $('#vig-go').addEventListener('click', decode);
  const fix = $('#vig-fix');
  if (fix) fix.addEventListener('click', () => {
    tableFixed = true;
    showToast('表已修正', '第 M 行已按正确位移重建。请重新解密。', 'success');
    render();
  });
}

function renderTable() {
  const rows = Array.from({ length: 26 }, (_, r) => {
    const bad = r === 12 && !tableFixed;
    const cells = Array.from({ length: 26 }, (_, c) => {
      const isDiag = c === r;
      const broken = bad && c === 0;            // 该行行首不是它自己的标签
      return `<td class="${isDiag ? 'diag' : ''}${broken ? ' broken' : ''}">${letter(c + shiftOf(r))}</td>`;
    }).join('');
    return `<tr class="${bad ? 'badrow' : ''}"><th>${letter(r)}</th>${cells}</tr>`;
  }).join('');
  const head = `<tr><th></th>${Array.from({ length: 26 }, (_, c) => `<th>${letter(c)}</th>`).join('')}</tr>`;
  return `<table class="vig-table">${head}${rows}</table>`;
}

function checkRow() {
  const v = ($('#vig-row').value || '').trim().toUpperCase();
  const msg = $('#vig-row-msg');
  if (v === 'M') {
    set('cipherRowFound', true);
    msg.className = 'inline-hint';
    msg.textContent = '正确：第 M 行不满足对角线自校验。';
    showToast('找到错行', '第 M 行的位移被改成了 13。', 'success');
    render();
  } else {
    msg.className = 'inline-hint error';
    msg.textContent = v ? `${v} 行满足自校验，不是它。` : '请输入一个大写字母。';
  }
}

function decode() {
  const ct = ($('#vig-cipher').value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const key = ($('#vig-key').value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const out = $('#vig-out');
  if (!ct || !key) { out.className = 'inline-hint error'; out.textContent = '密文和密钥都不能为空。'; return; }

  let plain = '';
  for (let i = 0; i < ct.length; i++) {
    const rowIdx = key.charCodeAt(i % key.length) - A;
    const s = shiftOf(rowIdx);
    const c = ct.charCodeAt(i) - A;
    // 读表：在 row 行里找密文字母，列头即明文
    const col = ((c - s) % 26 + 26) % 26;
    plain += letter(col);
  }

  const solved = plain === PLAIN;
  out.className = solved ? 'inline-hint' : 'inline-hint error';
  out.textContent = `明文：${plain}${solved ? '  ✔' : tableFixed ? '  ✘ 仍不对' : '  ✘ 结果不成词 —— 表可能还是错的'}`;

  if (solved) {
    set('vigenere4th', true);
    $('#vig-confirm-wrap').style.display = 'block';
    showToast('解出第 4 段', `终局第 4 段 = ${PLAIN}`, 'success');
  }
}

document.addEventListener('click', e => {
  if (e.target.id === 'vig-confirm-go') {
    const v = ($('#vig-confirm').value || '').trim().toUpperCase();
    const msg = $('#vig-confirm-msg');
    if (v === PLAIN) {
      setMany({ vigenere4th: true, cipherBookDone: true });
      msg.className = 'inline-hint';
      msg.textContent = '已登记。终局提交格式：875|ALMOND|7364-AL|HANYU';
      showToast('第 4 段已登记', '现在可以去做终局校验了。', 'success');
    } else {
      msg.className = 'inline-hint error';
      msg.textContent = '还不是这个。';
    }
  }
});

// ------------------------------------------------------------
// 启动门禁（在表函数之后执行）
// ------------------------------------------------------------
render();

route('cipher.html', () => {});
initRouter();
