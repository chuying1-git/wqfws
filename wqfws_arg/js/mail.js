// ============================================================
//  WQFWS ARG - Stage: 内部邮箱 (mail.html)
//  双账号 + 归档邮件链 + 回复触发下游解锁
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, initNav, gateScreen, clockText, esc } from './ui.js';

const state = loadState();
initNav(state);

const el = {
  box: $('#mail-box'),
  status: $('#account-status'),
  compose: $('#compose-form'),
  form: { to: $('#recipient-input'), subj: $('#mail-subject'), body: $('#mail-body') },
  send: $('#send-mail-btn'),
  msg: $('#mail-status'),
  suggested: $('#suggested-recipients'),
  zhouBtn: $('#zhou-account'),
  hiddenBtn: $('#hidden-account'),
  accountStatus: $('#account-status'),
};

// ------------------------------------------------------------
// 门禁
// ------------------------------------------------------------
if (!state.mailCreated) {
  gateScreen(document.querySelector('.mail-main') || el.box, {
    title: '当前会话没有邮箱凭据',
    lines: ['邮箱账号在直播间异常断开时由系统自动签发。', '完成直播身份复核，或让会话被强制断开。'],
    hint: '先前往 <a href="live.html">内测预约</a> 并接入直播信号。',
  });
}

// ------------------------------------------------------------
// 账号定义
//  1) 系统签发账号（直播间踢出 / 复核通过后自动创建）
//  2) zhouyanan@mail.com —— 内部员工邮箱，密码 1543
// ------------------------------------------------------------
const ACCOUNTS = {
  issued: () => ({
    key: 'issued',
    label: '系统签发账号',
    user: state.mailUsername || 'unknown@wqfws.local',
    pass: state.mailPassword || '',
  }),
  zhou: () => ({
    key: 'zhou',
    label: '内部员工邮箱',
    user: 'zhouyanan@mail.com',
    pass: '1543',
  }),
};

// 邮件正文：随解锁进度出现
function inboxFor(acctKey) {
  const common = [
    {
      id: 'archive-notice',
      from: '系统风控 <no-reply@wqfws.local>',
      t: '关于你的会话归档说明',
      body: `
        <p>你在内测直播间的会话已归档。归档编号 <span class="code">AF-7364</span>。</p>
        <p>需要说明的是：这次断开并不是错误。第 4 段的第 2 步校验，本就是用来筛掉没有权限的人。</p>
        <p>真正需要通过校验的，是「复核」而不是「答题」。你的信号在断开前已经完成握手。</p>
        <p style="color:var(--accent)">下一步：请回复 <span class="code">join@newworld.com</span>，
        主题写 <span class="code">ALMOND</span>，正文留下你的信标名。系统会据此开通终端权限。</p>
      `,
    },
    {
      id: 'recruit',
      from: '招聘中心 <hr@wqfws.local>',
      t: '【未读】内测岗位确认函',
      body: `
        <p>恭喜通过初筛。岗位：签约记录员（实习期）。</p>
        <p>公开编号规则：<span class="code">年份后两位 + 序号</span>。例如 2023 年第 64 位签约者是 <span class="code">2364</span>。</p>
        <p>但入选「未登记档案」方向的签约者不走公开序列，改用<b>内部编号</b>：</p>
        <p>M.E.G. 制服胸牌上别着<b>两段数字</b>（形如 <span class="code">AB / CD</span>），
           内部编号 = <span class="code">ABCD</span>，末尾追加 <span class="code">-AL</span>（记录员序列标记）。</p>
        <p>也就是说：看到两段数字就直接拼起来再加后缀，中间不要补任何符号。</p>
      `,
    },
    {
      id: 'audio-backup',
      from: '导播组 <ob@wqfws.local>',
      t: '第二轨字幕备份（误发）',
      body: `
        <p>附件是第 2 段的全黑期间字幕备份，请忽略。</p>
        <p>顺便给新同事统一说明本项目的几处编码习惯，别再逐个问我了：</p>
        <ul>
          <li>频谱仪吐的是<b>原始二进制采样</b>，别抄仪表盘读数（那是缓存，会骗人）；</li>
          <li>音频轨里的信标名做了 <b>ROT13</b>（字母表整体位移 13 位）；</li>
          <li>终端第 4 段输出是<b>维吉尼亚</b>加密，密钥就是信标名本身。</li>
        </ul>
        <p>维吉尼亚表收在内部密钥本里。密钥本我无权转发，但检索系统里留了它的影子。</p>
        <p>——请勿转发。（这条应该被撤回的。）</p>
      `,
    },
  ];

  if (acctKey === 'zhou') {
    common.push({
      id: 'zhou-internal',
      from: '签约审核中心 <audit@wqfws.local>',
      t: '内部：关于 Ellis 蒋的复核结论',
      body: `
        <p>复核结论：通过。该记录员为「未登记档案」持有人，共 108 条常规记录 + 6 条未登记记录。</p>
        <p>检索关键词：<span class="code">Hanyu</span>（内部仅用拼音代号登记）。</p>
        <p>档案库入口需要 Level A 权限。权限在维基主页连续点击标识 7 次后签发。</p>
      `,
    });
  }
  return common;
}

// ------------------------------------------------------------
// 渲染
// ------------------------------------------------------------
let currentAccount = state.mailLoggedInAccount || null;
let freezeTimer = null;

function renderLogin() {
  el.accountStatus.textContent = '未登录';
  el.compose.style.display = 'none';
  el.box.innerHTML = `
    <div class="login-panel">
      <h3 style="margin-top:0;">凭据登录</h3>
      <label class="field-label">邮箱地址</label>
      <input class="input-field" id="lg-user" value="${esc(state.mailUsername || '')}" placeholder="user@wqfws.local">
      <label class="field-label">密码</label>
      <input class="input-field" id="lg-pass" type="password" placeholder="密码">
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="send-btn" id="lg-go" style="flex:1;">登录</button>
        <button class="send-btn" id="lg-zhou" style="flex:1;background:var(--bg-elevated);color:var(--fg);border:1px solid var(--border);">用员工邮箱</button>
      </div>
      <div class="login-msg" id="lg-msg"></div>
      <div class="gate-hint" style="margin-top:14px;">
        系统签发账号的密码在直播间断开时给出；员工邮箱 <span class="code">zhouyanan@mail.com</span> 的密码是 4 位数字。
      </div>
    </div>`;

  $('#lg-zhou').addEventListener('click', () => {
    $('#lg-user').value = 'zhouyanan@mail.com';
    $('#lg-pass').focus();
  });
  $('#lg-go').addEventListener('click', tryLogin);
  $('#lg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
}

function freezeLeft() {
  return Math.max(0, Math.ceil(((state.mailFrozenUntil || 0) - Date.now()) / 1000));
}

function showFreeze(sec) {
  const m = $('#lg-msg');
  if (m) {
    m.textContent = sec > 0 ? `账号已被临时冻结 · ${sec} 秒后可重试` : '冻结已解除，可以重新登录。';
    m.className = sec > 0 ? 'login-msg error' : 'login-msg';
  }
  if (freezeTimer) clearTimeout(freezeTimer);
  if (sec <= 0) return;
  freezeTimer = setTimeout(() => showFreeze(freezeLeft()), 1000);
}

function tryLogin() {
  // 连错 3 次会临时冻结 —— 和直播间"三振出局"一致，不能无限试。
  const frozen = freezeLeft();
  if (frozen > 0) { showFreeze(frozen); return; }
  const u = $('#lg-user').value.trim().toLowerCase();
  const p = $('#lg-pass').value.trim();
  const issued = ACCOUNTS.issued();
  const zhou = ACCOUNTS.zhou();

  if (u === zhou.user && p === zhou.pass) return loginOk('zhou');
  if (u === issued.user.toLowerCase() && p === issued.pass && issued.pass) return loginOk('issued');
  if (u === 'zhouyanan@mail.com') return loginFail('密码错误（提示：4 位数字，与内部员工编号规则无关）。');
  if (issued.pass === '') return loginFail('系统尚未为该地址签发密码。');
  loginFail('账号或密码不正确。');
}

function loginFail(msg) {
  const fails = (state.mailLoginFails || 0) + 1;
  set('mailLoginFails', fails);
  state.mailLoginFails = fails;      // 内存同步：state 是加载时的快照
  if (fails >= 3) {
    const until = Date.now() + 30000;
    setMany({ mailFrozenUntil: until, mailLoginFails: 0 });
    state.mailFrozenUntil = until;
    state.mailLoginFails = 0;
    showFreeze(30);
    showToast('账号临时冻结', '连续 3 次凭据错误，30 秒后可重试。', 'error');
    return;
  }
  const m = $('#lg-msg');
  if (m) { m.textContent = `${msg}（再错 ${3 - fails} 次将临时冻结）`; m.className = 'login-msg error'; }
}

function loginOk(key) {
  currentAccount = key;
  setMany({
    mailLoggedInAccount: key,
    zhouAccountUnlocked: key === 'zhou' ? true : state.zhouAccountUnlocked,
    mailLoginFails: 0,          // 登录成功清零
    mailFrozenUntil: 0,
  });
  state.mailLoginFails = 0;
  state.mailFrozenUntil = 0;
  if (freezeTimer) { clearTimeout(freezeTimer); freezeTimer = null; }
  showToast('登录成功', key === 'zhou' ? '已登录内部员工邮箱。' : '已登录系统签发账号。', 'success');
  renderInbox();
}

function renderInbox() {
  const acct = currentAccount === 'zhou' ? ACCOUNTS.zhou() : ACCOUNTS.issued();
  const mails = inboxFor(currentAccount);
  const read = state.mailRead || [];

  el.accountStatus.innerHTML = `已登录：<span class="code">${esc(acct.user)}</span>（${acct.label}）`;
  el.compose.style.display = 'block';

  el.box.innerHTML = `
    <div class="inbox-head">
      <span>收件箱</span>
      <span class="mono" style="font-size:11px;color:var(--fg-dim);">${mails.length} 封 · 未读 ${mails.filter(m => !read.includes(m.id)).length}</span>
    </div>
    ${mails.map(m => `
      <div class="mail-item ${read.includes(m.id) ? '' : 'unread'}" data-id="${m.id}">
        <div class="mail-item-head">
          <span class="mail-from">${esc(m.from)}</span>
          <span class="mail-time">${clockText(Date.now() - 3600e3 * (mails.indexOf(m) + 1))}</span>
        </div>
        <div class="mail-subject">${esc(m.t)}</div>
      </div>
    `).join('')}
    <div id="mail-reader" class="mail-reader" style="display:none;"></div>
  `;

  el.box.querySelectorAll('.mail-item').forEach(node => {
    node.addEventListener('click', () => openMail(node.dataset.id, mails));
  });
}

function openMail(id, mails) {
  const m = mails.find(x => x.id === id);
  if (!m) return;
  const read = new Set(state.mailRead || []);
  read.add(id);
  set('mailRead', Array.from(read));

  const reader = $('#mail-reader');
  reader.style.display = 'block';
  reader.innerHTML = `
    <div class="reader-head">
      <div class="reader-subject">${esc(m.t)}</div>
      <div class="reader-from">${esc(m.from)}</div>
    </div>
    <div class="reader-body">${m.body}</div>
  `;
  reader.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 读完归档说明 → 提示去回信
  if (id === 'archive-notice' && !state.archiveNoticeRead) {
    set('archiveNoticeRead', true);
    showToast('任务更新', '需要回复 join@newworld.com 才能开通终端权限。', 'warning');
  }
  // 读完导播组误发的邮件 → 密钥本授权
  if (id === 'audio-backup' && !state.cipherBookUnlocked) {
    set('cipherBookUnlocked', true);
    showToast('密钥本已授权', '导播组邮件里提到了维吉尼亚表。密钥本入口已开启。', 'warning');
    initNav({ ...state, cipherBookUnlocked: true });
  }
  renderInbox();
  const r2 = $('#mail-reader');
  r2.style.display = 'block';
  r2.innerHTML = `
    <div class="reader-head">
      <div class="reader-subject">${esc(m.t)}</div>
      <div class="reader-from">${esc(m.from)}</div>
    </div>
    <div class="reader-body">${m.body}</div>`;
}

// ------------------------------------------------------------
// 写信 / 触发下游
// ------------------------------------------------------------
const SUGGESTED = ['join@newworld.com', 'hr@wqfws.local', 'no-reply@wqfws.local'];

el.form.to.addEventListener('focus', () => {
  el.suggested.style.display = 'block';
  el.suggested.innerHTML = SUGGESTED.map(s => `<span class="recipient-chip">${s}</span>`).join('');
});
el.suggested.addEventListener('click', e => {
  const chip = e.target.closest('.recipient-chip');
  if (chip) { el.form.to.value = chip.textContent; el.suggested.style.display = 'none'; }
});

el.send.addEventListener('click', () => {
  const to = el.form.to.value.trim().toLowerCase();
  const subj = el.form.subj.value.trim();
  const body = el.form.body.value.trim();
  if (!to || !subj || !body) {
    el.msg.textContent = '收件人 / 主题 / 正文都不能为空。';
    return;
  }
  set('mailSentCount', (state.mailSentCount || 0) + 1);
  el.msg.textContent = '已投递。等待系统回执…';
  el.msg.style.color = '';

  // 关键：回信给 join@newworld.com 且主题含 ALMOND
  if (to === 'join@newworld.com' && /almond/i.test(subj)) {
    setTimeout(() => {
      set('pipelineUnlocked', true);
      el.msg.textContent = '回执：终端权限已开通。';
      el.msg.style.color = 'var(--success)';
      showToast('终端权限已开通', '导航栏出现「终端」入口。', 'success');
      initNav({ ...state, pipelineUnlocked: true });
      el.box.insertAdjacentHTML('afterbegin', `
        <div class="mail-item unread">
          <div class="mail-item-head">
            <span class="mail-from">新世界服务平台 &lt;join@newworld.com&gt;</span>
            <span class="mail-time">刚刚</span>
          </div>
          <div class="mail-subject">回执：终端已开通（附管道要求）</div>
        </div>
        <div class="mail-reader" style="display:block;">
          <div class="reader-body">
            <p>信标确认。终端权限已签发。</p>
            <p>终端里有一条管道，共需 <span class="code">8</span> 条命令：
            其中 <span class="code">6</span> 条是真实指令，<span class="code">2</span> 条是陷阱。</p>
            <p>注意：任何一次错误输出都会让 <span class="code">grep</span> 的模式被替换成 <span class="code">.redacted</span>，
            你只能从 trace 反推。</p>
            <p><a href="terminal.html">→ 打开终端</a></p>
          </div>
        </div>`);
    }, 900);
  } else if (to === 'join@newworld.com') {
    setTimeout(() => {
      el.msg.textContent = '回执：主题校验失败，不予受理。';
      el.msg.style.color = 'var(--danger)';
    }, 700);
  } else {
    setTimeout(() => { el.msg.textContent = '已投递（无自动回执）。'; }, 600);
  }
  el.form.subj.value = '';
  el.form.body.value = '';
});

// 退出登录
document.addEventListener('click', e => {
  if (e.target.id === 'logout-btn') {
    set('mailLoggedInAccount', '');
    currentAccount = null;
    renderLogin();
  }
});

// ------------------------------------------------------------
// 启动
// ------------------------------------------------------------
if (state.mailCreated) {
  renderLogin();
  if (currentAccount) renderInbox();
}

route('mail.html', () => {});
initRouter();
