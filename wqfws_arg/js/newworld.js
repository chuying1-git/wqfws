// ============================================================
//  WQFWS ARG - 新世界服务平台 (newworld.html)
//  表层：普通招聘页  隐藏层：口令 xinshijie 之后 —— 项目的真实性质
// ============================================================
import { loadState, set } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, renderStations, esc } from './ui.js';

const state = loadState();
const root = $('#newworld-root');
renderStations($('#arg-nav'), state, 'newworld.html');

const JOBS = [
  { t: '居民登记专员', loc: 'Level 1 · 阿尔法基地', pay: '面议', tag: '全职' },
  { t: '层级巡检员', loc: 'Level 0 – Level 4', pay: '面议', tag: '轮班' },
  { t: '真菌农场技术员', loc: 'Level 1 · 农场区', pay: '面议', tag: '全职' },
  { t: '档案数字化实习生', loc: '远程', pay: '无薪', tag: '实习' },
  { t: '签约记录员（未登记档案方向）', loc: '保密', pay: '保密', tag: '内部推荐', hidden: true },
];

let revealed = state.neworldRevealed || false;

function setStatus() {
  const badge = $('#nw-badge');
  const st = $('#nw-status');
  const prog = $('#nw-prog');
  if (badge) badge.textContent = revealed ? 'INSIDER' : 'GUEST';
  if (st) st.textContent = revealed ? 'HIDDEN LAYER OPEN' : 'LINK ESTABLISHED';
  if (prog) prog.textContent = revealed ? '隐藏层已展开' : '招聘中';
}

function renderSurface() {
  root.innerHTML = `
    <div class="section-title">社会招聘 · 长期有效 · 岗位持续更新</div>

    <div class="entries">
      ${JOBS.filter(j => !j.hidden || state.awakened).map((j, i) => `
        <div class="row">
          <span class="idx">${String(i + 1).padStart(2, '0')}</span>
          <span>
            <span class="name">${esc(j.t)}</span>
            <div class="desc">工作地点：${esc(j.loc)} · 薪酬：${esc(j.pay)}</div>
          </span>
          <span class="tag">${esc(j.tag)}</span>
        </div>`).join('')}
    </div>

    <p class="stage-note" style="margin-top:14px;">
      投递方式：回信至 <span class="code">join@newworld.com</span>，主题填写你的信标名。
    </p>

    <div class="gate-card" style="margin-top:16px;">
      <div class="gate-hd"><span class="dot"></span>内推码<span class="spacer"></span><span class="ver">NEED CODE</span></div>
      <div class="gate-bd">
        <p class="stage-note" style="margin-top:0;">
          本平台仅接受内部推荐。请输入内推口令以查看完整岗位说明。
        </p>
        <div class="gate-field" id="nw-field">
          <span class="pfx">&gt;</span>
          <input id="nw-pass" type="text" autocomplete="off" spellcheck="false" placeholder="内推口令"
                 style="flex:1;background:transparent;border:0;outline:none;color:var(--g);font-family:var(--mono);font-size:13px;">
        </div>
        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
          <button class="gate-btn" id="nw-go" type="button">验证</button>
        </div>
        <div class="inline-hint" id="nw-msg"></div>
      </div>
    </div>
  `;
  $('#nw-go').addEventListener('click', tryReveal);
  $('#nw-pass').addEventListener('keydown', e => { if (e.key === 'Enter') tryReveal(); });
}

function tryReveal() {
  const v = $('#nw-pass').value.trim().toLowerCase();
  const msg = $('#nw-msg');
  const field = $('#nw-field');
  if (v === 'xinshijie') {
    set('neworldRevealed', true);
    revealed = true;
    showToast('内推口令通过', '隐藏层已展开。', 'warning');
    renderHidden();
    setStatus();
  } else {
    const fails = (state.neworldFails || 0) + 1;
    set('neworldFails', fails);
    if (field) field.classList.add('err');
    msg.className = 'inline-hint';
    msg.innerHTML = fails >= 3
      ? '<b>口令仍在被拒绝。</b>提示：它是拼音，意思是「新世界」。'
      : '<b>口令无效。</b>';
  }
}

function renderHidden() {
  const readCount = (state.mailRead || []).length;
  root.innerHTML = `
    <span class="badge">HIDDEN LAYER</span>
    <div class="section-title" style="margin-top:12px;">这一层不是招聘页面</div>

    <p class="stage-note">
      如果你读到了这里，说明你已经收集过口令、信标名、主频和记录员编号，
      并且至少成功穿越了「内部邮箱 → 终端管道」这条链路。
    </p>

    <p class="stage-note">那么按这个项目的本来面目说明白：</p>

    <p class="stage-note hi" style="border-left:2px solid rgba(109,255,158,0.45);padding-left:12px;">
      本项目是一场 ARG（Alternate Reality Game，侵入式虚拟现实游戏）。<br>
      「后室维基」「新世界服务平台」都是虚构的伪装层，
      与外部的任何机构、平台、企业都没有关系。
    </p>

    <p class="stage-note">设计上刻意保留了几处不友好：</p>
    <ul class="stage-note" style="padding-left:18px;line-height:2;margin-top:0;">
      <li><b>时间门禁</b> —— 直播预约后需要等待 20 分钟才开场（或用帧 0 里的口令提前接入）；</li>
      <li><b>失败即剧情</b> —— 验证失败不是重来，而是被踢出，并"顺手"给你一个邮箱账号；</li>
      <li><b>不可逆的脱敏</b> —— 终端里第一次输错，grep 的模式就会被 <span class="redacted">██████</span> 覆盖，只能从 trace 反推；</li>
      <li><b>分散的线索</b> —— 主频在执行页、信标名在音频轨、编号在制服胸牌上，三处分属不同阶段。</li>
    </ul>

    <p class="stage-note">所以卡住是正常的。你被卡住的地方，就是设计者希望你回头再看一遍的地方。</p>

    <div class="meta" style="margin-top:16px;flex-wrap:wrap;gap:10px 18px;">
      <span>邮件已读：${readCount} 封</span>
      <span>管道尝试：${state.pipelineAttempts || 0} 次</span>
      <span>提示使用：${state.hintsUsed || 0} 次</span>
      <span>终局失败：${state.finalFails || 0} 次</span>
      <span>觉醒：${state.awakened ? '是' : '否'}</span>
    </div>

    <p class="stage-note" style="margin-top:14px;">
      本页不含任何外部追踪脚本，所有进度只保存在你自己浏览器的 localStorage 里。
    </p>

    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
      <a class="btn ghost" href="archive.html" style="text-decoration:none;">← 回到机密档案库</a>
      <a class="btn ghost" href="index.html" style="text-decoration:none;">档案首页</a>
    </div>
  `;
}

setStatus();
if (revealed) renderHidden(); else renderSurface();

route('newworld.html', () => {});
initRouter();
