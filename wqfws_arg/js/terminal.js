// ============================================================
//  WQFWS ARG - Stage: 终端管道 (terminal.html)
//  8 条命令（6 真 + 2 陷阱），带顺序约束 + trace 反推
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, renderStations, gateScreen, esc } from './ui.js';

const state = loadState();
renderStations($('#arg-nav'), state, 'terminal.html');

const el = {
  display: $('#pipeline-display'),
  form: $('#command-form'),
  input: $('#command-input'),
  submit: $('#submit-command'),
  status: $('#command-status'),
  success: $('#success-banner'),
  trap: $('#error-state'),
};

if (!state.pipelineUnlocked) {
  gateScreen(document.querySelector('.terminal-main'), {
    title: '终端权限未签发',
    lines: ['终端入口需要通过邮件系统申请。', '回信给 join@newworld.com，主题填写你的信标名。'],
    hint: '前往 <a href="mail.html">内部邮箱</a> 处理那封「会话归档说明」。',
  });
}

const REAL = ['cat', 'grep', 'cut', 'tr', 'base64', 'tail'];
const TRAPS = ['sort', 'head'];
const VALID = [...REAL, ...TRAPS];      // 多重集必须完全相等

const DESCS = {
  cat: '从 STDIN 读取', grep: '过滤匹配行', cut: '切分字段',
  tr: '字符转换', base64: 'Base64 编解码', tail: '取末尾 N 行',
  sort: '重排行序（伪陷阱）', head: '取开头 N 行（真陷阱）',
};

// ------------------------------------------------------------
// 校验规则：顺序有硬约束
// ------------------------------------------------------------
function diagnose(tokens) {
  const idx = c => tokens.indexOf(c);
  const errs = [];

  const sorted = [...tokens].sort();
  if (sorted.join(',') !== [...VALID].sort().join(',')) {
    const missing = VALID.filter(c => !tokens.includes(c));
    const extra = tokens.filter(c => !VALID.includes(c));
    if (missing.length) errs.push(`缺少命令：${missing.join(', ')}`);
    if (extra.length) errs.push(`未知命令：${extra.join(', ')}`);
    if (!missing.length && !extra.length) errs.push('命令数量或重复项不正确（每条只能用一次）');
    return errs;
  }
  if (tokens[0] !== 'cat') errs.push('偏移 0：标准输入未接入 —— cat 必须位于管道首位');
  if (idx('grep') > idx('cut')) errs.push(`偏移 ${Math.min(idx('grep'), idx('cut'))}：字段切分先于过滤，cut 作用对象为空`);
  if (idx('sort') < idx('cut')) errs.push(`偏移 ${idx('sort')}：sort 在字段切分前介入，命中行序被打乱`);
  if (idx('base64') > idx('tail')) errs.push(`偏移 ${idx('tail')}：解码发生在截断之后，尾部数据已丢失`);
  if (idx('head') !== tokens.length - 1) errs.push(`偏移 ${idx('head')}：head 过早截断，后续输出被丢弃`);
  return errs;
}

// ------------------------------------------------------------
// 渲染
// ------------------------------------------------------------
function renderPipeline() {
  el.display.style.display = 'block';
  el.display.innerHTML = `
    <div class="pipe-line">
      ${VALID.map(c => `
        <span class="command ${TRAPS.includes(c) ? 'trap' : 'real'}" data-cmd="${c}">
          <span class="name">${c}</span><span class="desc">${DESCS[c]}</span>
        </span>`).join('<span class="separator">|</span>')}
    </div>
    <div class="pipe-note">
      多重集：6 条真实指令 + 2 条陷阱指令，每条恰好使用一次。<br>
      顺序不是自由的：每条陷阱只有在正确的偏移上才无害。
    </div>
    <div class="pipe-redacted">
      grep 模式：<span class="${state.grepRedacted ? 'redacted' : 'code'}">${state.grepRedacted ? '.redacted' : 'ALMOND'}</span>
      ${state.grepRedacted ? '　<span class="warn">（已因错误输出被屏蔽）</span>' : ''}
    </div>`;
}

function renderTrace(attempts, errs) {
  const lines = errs.map((e, i) => `<div class="trace-line danger">[ERR ${i + 1}] ${esc(e)}</div>`);
  el.trap.style.display = 'block';
  el.trap.innerHTML = `
    <div class="trace-head">⚠️ 管道执行中断 · trace #${attempts}</div>
    <div class="trace-body">
      <div class="trace-line">$ echo "$INPUT" | ${el.input.value.trim().split(/\s+/).join(' | ')}</div>
      ${lines.join('')}
      <div class="trace-line dim">grep: pattern ${state.grepRedacted ? '.redacted' : 'ALMOND'} → matches 0</div>
      <div class="trace-line dim">hint: 失败不会清除进度，但每次失败都会让线索更少一条。</div>
    </div>`;
}

// ------------------------------------------------------------
// 提交
// ------------------------------------------------------------
let attempts = state.pipelineAttempts || 0;

function submit() {
  const tokens = el.input.value.trim().split(/\s+/).filter(Boolean);
  const errs = diagnose(tokens);

  if (errs.length === 0) return solve();

  attempts++;
  const firstError = !state.grepRedacted;
  setMany({
    pipelineAttempts: attempts,
    grepRedacted: true,
    ttrap: (state.ttrap || 0) + 1,
  });
  state.grepRedacted = true;
  state.ttrap = (state.ttrap || 0) + 1;

  renderTrace(attempts, errs);
  renderPipeline();
  el.status.textContent = `校验失败（第 ${attempts} 次）。trace 已输出。`;
  el.status.className = 'cmd-status error';
  if (firstError) {
    showToast('grep 模式已屏蔽', '错误输出触发了脱敏。grep 的模式变成 .redacted，请从 trace 反推。', 'error');
  }
}

function solve() {
  setMany({
    pipelineSolved: true,
    pipelineSolvedAt: Date.now(),
    archiveUnlocked: true,
  });
  el.trap.style.display = 'none';
  el.display.style.display = 'none';
  el.form.style.display = 'none';
  el.success.classList.add('visible');
  el.success.innerHTML = `
    <strong>🎉 管道贯通</strong>
    <div style="margin-top:10px;font-size:13px;line-height:2;">
      三段原始输出（Base64，需要自己解）：
      <span class="code">ODc1</span> / <span class="code">QUxNT05E</span> / <span class="code">NzM2NC1BTA==</span><br>
      第 4 段（维吉尼亚加密，密钥 = 信标名）：<span class="code">HLZMH</span>
    </div>
    <div style="margin-top:12px;font-size:13px;">
      ⚠ 密钥本那张表<b>有一行被改错过</b>。不先把错行找出来，第 4 段解出来会是一个不成词的垃圾串（六个字母，看着像词，其实不是）。
    </div>
    <div style="margin-top:12px;font-size:13px;">
      另外还需要 <b>Level A 权限</b>：回维基主页，连续点击站点标识 <b>7 次</b>。
    </div>
    <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
      <a class="btn ghost" href="cipher.html" style="text-decoration:none;">去解第 4 段 →</a>
      <a class="btn ghost" href="index.html" style="text-decoration:none;">回维基主页觉醒 →</a>
      <a class="btn ghost" href="archive.html" style="text-decoration:none;">尝试打开档案库 →</a>
    </div>`;
  showToast('管道贯通', '8 条命令全部正确。档案库权限已记录。', 'success');
  renderStations($('#arg-nav'), { ...state, pipelineSolved: true }, 'terminal.html');
}

el.submit.addEventListener('click', submit);
el.input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); });

// 提示按钮：代价是记录 hint 使用次数
const hintBar = document.createElement('div');
hintBar.className = 'hint-bar';
hintBar.innerHTML = `
  <button class="back-link" id="hint-btn">要一条提示（会记录使用次数）</button>
  <span class="mono" style="font-size:11px;color:var(--fg-dim);" id="hint-out"></span>`;
document.querySelector('.terminal-main').appendChild(hintBar);

const HINTS = [
  'cat 永远是管道的第 1 条 —— 它是 STDIN 的接入点。',
  '陷阱里有一条是「伪陷阱」：它在字段切分之后介入就完全无害。',
  'base64 必须在 tail 之前，否则你解码的是已经被截断的数据。',
  'head 是真陷阱：它一旦提前介入，后面的输出就永久丢失了。',
  '把 8 条按「接入 → 过滤 → 切分 → 无害重排 → 转换 → 解码 → 截尾 → 截头」排列。',
];
$('#hint-btn').addEventListener('click', () => {
  const used = state.hintsUsed || 0;
  set('hintsUsed', used + 1);
  const h = HINTS[Math.min(used, HINTS.length - 1)];
  $('#hint-out').textContent = `提示 ${used + 1}/${HINTS.length}：${h}`;
});

// ------------------------------------------------------------
// 启动
// ------------------------------------------------------------
if (state.pipelineUnlocked) {
  if (state.pipelineSolved) {
    el.display.style.display = 'none';
    el.form.style.display = 'none';
    solve();
  } else {
    renderPipeline();
    el.submit.disabled = false;
  }
}

route('terminal.html', () => {});
initRouter();
