// ============================================================
//  WQFWS ARG - Stage: 直播间 (room.html)
//  4 阶段视频流 + 隐藏帧 0 + 5 秒强制踢出（失败即剧情）
// ============================================================
import { loadState, set, setMany, getScheduledLiveTime } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, initNav, gateScreen, mmss, sleep } from './ui.js';

const state = loadState();
initNav(state);

const el = {
  video: $('#stream-video'),
  container: $('#video-container'),
  frame: $('#frame-indicator'),
  badge: $('#phase-badge'),
  timer: $('#timer-display'),
  kick: $('#kick-timer'),
  chat: $('#chat-messages'),
  chatPanel: $('#chat-panel'),
  input: $('#chat-input'),
  send: $('#send-btn'),
  inputArea: $('#input-area'),
  count: $('#chat-count'),
  final: $('#enter-final-btn'),
};

// ------------------------------------------------------------
// 门禁：必须已预约；且直播已开始（或已用口令提前进入）
// ------------------------------------------------------------
function gateOpen() {
  if (!state.liveReserved) return 'no-reserve';
  if (state.liveEarlyAccess) return true;
  if (Date.now() >= getScheduledLiveTime()) return true;
  return 'not-started';
}

// NOTE: gating runs at the very bottom of this module.
// The phase/timer/message counters below are `let` bindings, so any code that
// touches them must run after their initialisation (otherwise: TDZ error).

function renderWaitingRoom() {
  const left = getScheduledLiveTime() - Date.now();
  el.container.innerHTML = `
    <div class="gate-screen" style="min-height:260px;">
      <div class="gate-icon">📡</div>
      <h2 class="gate-title">直播尚未开始</h2>
      <p class="mono" style="font-size:22px;color:var(--accent);margin:12px 0;" id="wr-clock">${mmss(left)}</p>
      <p style="color:var(--fg-muted);font-size:13px;">导播正在调试信号。请稍候。</p>
      <div class="gate-hint">如果你拿到了直播口令，可以在下方提前进入信号。</div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:center;">
        <input class="input-field" id="wr-pass" placeholder="直播口令" style="max-width:220px;">
        <button class="send-btn" id="wr-go">进入</button>
      </div>
      <div id="wr-msg" style="font-size:12px;color:var(--danger);margin-top:8px;"></div>
    </div>`;
  const tick = setInterval(() => {
    const left2 = getScheduledLiveTime() - Date.now();
    const c = $('#wr-clock');
    if (!c) return clearInterval(tick);
    c.textContent = mmss(left2);
    if (left2 <= 0) { clearInterval(tick); location.reload(); }
  }, 1000);

  $('#wr-go').addEventListener('click', () => {
    const v = $('#wr-pass').value.trim().toLowerCase();
    if (v === 'xinshijie') {
      set('liveEarlyAccess', true);
      showToast('口令通过', '已接入备用信号源。', 'success');
      location.reload();
    } else {
      $('#wr-msg').textContent = '口令错误。连续失败会被记录。';
    }
  });
}

// ------------------------------------------------------------
// 直播主流程
// ------------------------------------------------------------
const PHASES = [
  { id: 1, name: '正常帧',     color: '#58a6ff', dur: 12000 },
  { id: 2, name: '音频 / 全黑', color: '#6dff9e', dur: 9000  },
  { id: 3, name: '标识异常',   color: '#ff7b7b', dur: 9000  },
  { id: 4, name: '最终循环',   color: '#d8ffe6', dur: 0     },
];

let phase = 0;
let msgs = 0;
let wrongs = 0;
let kicked = false;
let phaseTimer = null;

function startStream() {
  el.video.style.display = 'none';           // 用纯 CSS/文本演出，避免依赖媒体文件
  el.inputArea.style.display = 'flex';
  el.send.disabled = false;
  mountFrameSeek();
  set('liveRoomEntered', true);
  set('liveRoomPhase', 1);
  addFrame('导播：信号已接入。本场为封闭内测，请勿录屏。');
  addFrame('导播：今晚流程分 4 段。第 2 段开始会有「信号异常」，属正常现象。');
  runPhase(0);
}

function runPhase(i) {
  phase = i;
  const p = PHASES[i];
  if (!p) return;
  set('liveRoomPhase', p.id);
  el.frame.textContent = `Phase ${p.id}/4 · ${p.name}`;
  el.frame.style.color = p.color;
  el.badge.textContent = `Phase ${p.id}/4`;
  el.badge.style.color = p.color;

  clearInterval(phaseTimer);
  if (p.dur > 0) {
    let left = p.dur;
    el.timer.textContent = mmss(left);
    phaseTimer = setInterval(() => {
      left -= 1000;
      el.timer.textContent = mmss(Math.max(0, left));
      if (left <= 0) { clearInterval(phaseTimer); nextPhase(); }
    }, 1000);
  }
  PHASE_SCRIPT[i]();
}

const PHASE_SCRIPT = [
  // Phase 1 —— 正常帧：藏 875
  () => {
    el.video.className = '';
    addFrame('【画面】主播坐在信号台前，背后是 Level 0 的黄色墙纸与湿地毯。');
    setTimeout(() => addFrame('【画面】M.E.G. 制服胸牌特写，别着两段数字：<b class="cipher">73</b> / <b class="cipher">64</b>，中间没有连字符。'), 4000);
    setTimeout(() => addFrame('【画面】频谱仪只吐原始采样（二进制）：<span class="code">1101101011</span>。仪表盘上那个 <b>857</b> 是上一场的残留读数，别抄。'), 8000);
  },
  // Phase 2 —— 全黑 + 音频：藏 ALMOND / base64
  () => {
    setTimeout(() => {
      el.video.classList.add('blackout-frame');
      addFrame('<i>【画面全黑】</i> 音频仍在继续，主播读一段「居民登记流程」。');
    }, 500);
    setTimeout(() => addFrame('【音频】…信标名按字母表整体位移十三位保存，读作 <b class="cipher">NYZBAQ</b>…'), 3000);
    setTimeout(() => addFrame('【字幕文件残留】<span class="code">ODc1</span> —— 导播忘关的第二轨（Base64，解出来是别的东西）。'), 6500);
  },
  // Phase 3 —— 标识异常
  () => {
    el.video.classList.remove('blackout-frame');
    addFrame('【画面恢复】标识颜色异常：金色 → 暗红。');
    setTimeout(() => addFrame('【聊天区】检测到发言者身份标记：<span class="hidden-badge">机密</span>'), 2500);
    setTimeout(() => addFrame('【画面】制服背面印着一行规则：内部编号 = 前两位 · 后两位（完整说明在招聘邮件里）。'), 4000);
    setTimeout(() => addFrame('【系统】请勿在弹幕中直接发送完整信标。'), 5800);
  },
  // Phase 4 —— 最终循环 / 两步验证
  () => {
    clearInterval(phaseTimer);
    el.timer.textContent = '验证阶段';
    setTimeout(() => showStep1(), 1200);
  },
];

function nextPhase() {
  if (phase >= PHASES.length - 1) return;
  runPhase(phase + 1);
}

function addFrame(html, cls = 'bot') {
  const d = document.createElement('div');
  d.className = `chat-message ${cls}`;
  d.innerHTML = html;
  el.chat.appendChild(d);
  el.chat.scrollTop = el.chat.scrollHeight;
  msgs++;
  el.count.textContent = msgs;
}

// ------------------------------------------------------------
// Phase 4：登录式两步验证（先频率，后信标）
// ------------------------------------------------------------
function showStep1() {
  el.inputArea.style.display = 'none';
  el.final.style.display = 'none';
  const box = document.createElement('div');
  box.id = 'verify-box';
  box.className = 'verify-box';
  box.innerHTML = `
    <div class="verify-title">身份复核 · 第 1 步 / 共 3 步</div>
    <div class="verify-sub">频谱仪只输出原始采样（二进制）。请换算成十进制主频 —— 仪表盘上那个 857 是上一场残留，别抄。</div>
    <input class="input-field" id="v1" placeholder="主频" inputmode="numeric">
    <button class="send-btn" id="v1-go" style="width:100%;margin-top:8px;">提交</button>
    <div class="verify-msg" id="v1-msg"></div>
  `;
  el.container.appendChild(box);
  const go = () => {
    const raw = $('#v1').value.trim();
    let v = raw;
    // 允许直接填二进制采样
    if (/^[01]{6,}$/.test(raw)) {
      const d = parseInt(raw, 2);
      if (!Number.isNaN(d)) v = String(d);
    }
    if (cooldownLeft() > 0) return paintCooldown(1, '');
    if (v === '875') { set('freqDecoded', true); showStep2(); }
    else if (v === '857') startCooldown(1, '那是上一场的残留读数。');
    else startCooldown(1, '频率不符。');
  };
  $('#v1-go').addEventListener('click', go);
  $('#v1').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

function showStep2() {
  const box = $('#verify-box');
  box.innerHTML = `
    <div class="verify-title">身份复核 · 第 2 步 / 共 3 步</div>
    <div class="verify-sub">请输入信标名（英文大写）。音频里读的是位移后的形式，字幕轨里有 Base64 备份。</div>
    <input class="input-field" id="v2" placeholder="信标名" style="text-transform:uppercase;">
    <button class="send-btn" id="v2-go" style="width:100%;margin-top:8px;">提交</button>
    <div class="verify-msg" id="v2-msg"></div>
  `;
  const go = () => {
    const raw = $('#v2').value.trim();
    let v = raw.toUpperCase();
    // 接受 base64(ALMOND) 形式
    if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length > 8) {
      try { const dec = atob(raw); if (/^[A-Z]+$/.test(dec)) v = dec.toUpperCase(); } catch (_) {}
    }
    if (cooldownLeft() > 0) return paintCooldown(2, '');
    if (v === 'NYZBAQ') v = 'ALMOND';            // 允许直接填位移后的形式
    if (v === 'ALMOND') { set('beaconDecoded', true); showStep3(); }
    else startCooldown(2, '信标校验失败。');
  };
  $('#v2-go').addEventListener('click', go);
  $('#v2').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// 第 3 步：编号 —— 只有两个数字 + 一条规则，必须自己拼
function showStep3() {
  const box = $('#verify-box');
  box.innerHTML = `
    <div class="verify-title">身份复核 · 第 3 步 / 共 3 步</div>
    <div class="verify-sub">请输入该记录员的内部编号。制服胸牌上只有两段数字，拼接规则见招聘邮件（内部编号 = 前两位 · 后两位，后接 -AL）。</div>
    <input class="input-field" id="v3" placeholder="内部编号" style="text-transform:uppercase;">
    <button class="send-btn" id="v3-go" style="width:100%;margin-top:8px;">提交</button>
    <div class="verify-msg" id="v3-msg"></div>
  `;
  const go = () => {
    const v = $('#v3').value.trim().toUpperCase().replace(/\s+/g, '');
    if (cooldownLeft() > 0) return paintCooldown(3, '');
    const ok = ['7364', '7364-AL', '7364AL', '73-64', '73/64'].includes(v);
    if (ok) { set('idDecoded', true); succeed(); }
    else startCooldown(3, '编号不符。');
  };
  $('#v3-go').addEventListener('click', go);
  $('#v3').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// ------------------------------------------------------------
// 「失败即剧情」：踢出后自动创建邮箱账号
// ------------------------------------------------------------
// 答错冷却：不再"错一次就踢出去"，而是冻结一小段时间（和邮箱登录同一套规矩）。
// 踢出只留给"多次不合规发言"（风控），剧情那段还在。
// ------------------------------------------------------------
let cooldownTimer = null;
function cooldownLeft() {
  return Math.max(0, Math.ceil(((state.roomCooldownUntil || 0) - Date.now()) / 1000));
}

function paintCooldown(step, reason) {
  const sec = cooldownLeft();
  const inp = $(`#v${step}`), btn = $(`#v${step}-go`), msg = $(`#v${step}-msg`);
  if (sec <= 0) {
    if (inp) inp.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = '提交'; }
    if (msg) { msg.textContent = '冷却结束，可以重新提交。'; msg.className = 'verify-msg'; }
    if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
    return;
  }
  if (inp) inp.disabled = true;
  if (btn) { btn.disabled = true; btn.textContent = `冷却中 · ${sec}s`; }
  if (msg) {
    const fails = state.roomFails || 0;
    msg.textContent = `${reason ? reason + '　' : ''}已错 ${fails} 次，${sec} 秒后可重试。`;
    msg.className = 'verify-msg error';
  }
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => paintCooldown(step, reason), 1000);
}

function startCooldown(step, reason) {
  const until = Date.now() + 30000;
  const fails = (state.roomFails || 0) + 1;
  setMany({ roomCooldownUntil: until, roomFails: fails });
  state.roomCooldownUntil = until;
  state.roomFails = fails;
  showToast('信号冷却', `复核未通过，${30} 秒后可重试。`, 'warning');
  paintCooldown(step, reason);
}

// 进入某一步时，如果冷却还没结束，直接把按钮冻上
function applyCooldown(step) {
  if (cooldownLeft() > 0) paintCooldown(step, '上一次复核未通过。');
}

// ------------------------------------------------------------
async function failVerify(reason) {
  if (kicked) return;
  kicked = true;
  set('liveKicked', true);
  el.kick.style.display = 'block';
  for (let i = 5; i > 0; i--) {
    el.kick.textContent = `会话异常 · ${i} 秒后强制断开`;
    await sleep(1000);
  }
  // 剧情：系统"顺手"给你开了个内部邮箱
  const uname = `obs_${Math.random().toString(36).slice(2, 7)}@wqfws.local`;
  const pwd = `${Math.floor(1000 + Math.random() * 9000)}`;
  setMany({
    mailCreated: true,
    mailUsername: uname,
    mailPassword: pwd,
    mailViaKick: true,
  });
  el.container.innerHTML = `
    <div class="gate-screen" style="min-height:260px;">
      <div class="gate-icon">⛔</div>
      <h2 class="gate-title">你已被移出直播间</h2>
      <p style="color:var(--fg-muted);font-size:13px;">${reason}</p>
      <div class="gate-hint" style="text-align:left;">
        断开前，系统为你自动创建了内部邮箱账号：<br>
        <span class="code">${uname}</span> / <span class="code">${pwd}</span><br>
        <small style="color:var(--fg-dim);">（异常断开的会话会被归档，并收到一封说明邮件。）</small>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="send-btn" id="copy-cred" style="padding:10px 18px;background:var(--bg-elevated);color:var(--fg);border:1px solid var(--border);">复制账号密码</button>
        <button class="send-btn" id="to-mail" style="padding:10px 18px;">前往内部邮箱 →</button>
      </div>
    </div>`;
  // 跨页：router 会退化成整页跳转
  $('#to-mail').addEventListener('click', () => navigate('mail.html'));
  // 这串账号是随机的（obs_xxxxx），手抄很容易错，给个一键复制
  $('#copy-cred').addEventListener('click', async () => {
    const cred = `${uname} / ${pwd}`;
    try {
      await navigator.clipboard.writeText(cred);
      showToast('已复制', '账号与密码已复制到剪贴板。', 'success');
    } catch (e) {
      showToast('请手动复制', cred, 'info');
    }
  });
  showToast('会话已断开', '系统已为你创建内部邮箱账号，请前往邮箱查看归档说明。', 'error');
  initNav({ ...state, mailCreated: true });
}

// ------------------------------------------------------------
// 聊天输入：/d 开头的弹幕；乱输计入错误
// ------------------------------------------------------------
function sendChat() {
  const text = el.input.value.trim();
  if (!text || kicked) return;
  el.input.value = '';
  const isDanmu = text.startsWith('/d ');
  const body = isDanmu ? text.slice(3).trim() : text;

  const d = document.createElement('div');
  d.className = 'chat-message user';
  d.textContent = isDanmu ? body : `（直接发言）${body}`;
  el.chat.appendChild(d);
  el.chat.scrollTop = el.chat.scrollHeight;
  msgs++;
  el.count.textContent = msgs;

  // 提示性判定：完整信标不该直接发
  if (/almond/i.test(body) && /875/.test(body)) {
    addFrame('【系统】检测到完整信标，已在公共频道屏蔽。', 'bot');
    wrongs++;
  } else if (!isDanmu && body.length > 0) {
    wrongs++;
    if (wrongs >= 3) {
      addFrame('【系统】多次违规发言，已移交风控。');
      failVerify('多次不合规发言，风控已介入。');
    }
  }
}

el.send.addEventListener('click', sendChat);
el.input.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

function succeed() {
  setMany({ roomSolved: true, liveKicked: false, mailCreated: true });
  el.container.innerHTML = `
    <div class="gate-screen" style="min-height:260px;">
      <div class="gate-icon">✅</div>
      <h2 class="gate-title">身份复核通过</h2>
      <p style="color:var(--fg-muted);font-size:13px;">签约记录员 Ellis 蒋（编号 7364-AL）身份确认。</p>
      <div class="gate-hint" style="text-align:left;">
        直播结束。你的会话被保留，并收到一封内部归档邮件。<br>
        下一步：打开内部邮箱，处理那封「归档说明」。
      </div>
      <div style="margin-top:16px;">
        <button class="send-btn" id="to-mail2" style="padding:10px 18px;">前往内部邮箱 →</button>
      </div>
    </div>`;
  $('#to-mail2').addEventListener('click', () => navigate('mail.html'));
  if (!state.mailUsername) {
    setMany({ mailUsername: 'ellis_guest@wqfws.local', mailPassword: '7364' });
  }
  showToast('复核通过', '记录员身份已确认。请前往内部邮箱处理归档邮件。', 'success');
  initNav({ ...state, mailCreated: true });
}

// ------------------------------------------------------------
// 隐藏帧 0：搜索「帧」输入 0 可回看导播忘删的第一帧
// ------------------------------------------------------------
function mountFrameSeek() {
  if ($('#frame-seek')) return;   // only mount once, and only on a live stream
  const bar = document.createElement('div');
  bar.className = 'frame-seek';
  bar.innerHTML = `
    <span class="mono" style="font-size:11px;color:var(--fg-dim);">跳转帧</span>
    <input class="input-field" id="frame-seek" placeholder="#" style="max-width:70px;padding:4px 8px;">
    <button class="send-btn" id="frame-go" style="padding:4px 10px;">跳</button>
    <span id="frame-msg" style="font-size:11px;color:var(--danger);"></span>`;
  el.container.parentNode.insertBefore(bar, el.container.nextSibling);
  const go = () => {
    const v = $('#frame-seek').value.trim();
    if (v === '0' || v === '00') {
      set('roomHiddenFrame', true);
      addFrame('【帧 0 · 未被清除】导播预录：<span class="code">xinshijie</span> —— 备用信号口令。', 'bot');
      $('#frame-msg').textContent = '';
      showToast('发现隐藏帧', '帧 0 被恢复。你获得了备用信号口令。', 'warning');
    } else {
      $('#frame-msg').textContent = '无此帧';
    }
  };
  $('#frame-go').addEventListener('click', go);
  $('#frame-seek').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// ------------------------------------------------------------
// 启动门禁（必须在所有 let/const 初始化之后）
// ------------------------------------------------------------
const gate = gateOpen();
if (gate === 'no-reserve') {
  gateScreen(el.container, {
    title: '直播间未授权访问',
    lines: ['你还没有预约本场内测直播。', '直播链接只发放给已登记的观众。'],
    hint: '前往 <a href="live.html">内测预约</a> 完成登记（已开播也可以补登记，登记后马上就能进）。',
  });
} else if (gate === 'not-started') {
  renderWaitingRoom();
} else {
  startStream();
}

route('room.html', () => {});
initRouter();
