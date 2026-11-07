// ============================================================
//  WQFWS ARG - 新世界服务平台 (newworld.html)
//  表层：普通招聘页  隐藏层：口令 xinshijie 之后 —— 项目的真实性质
// ============================================================
import { loadState, set } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, initNav, esc } from './ui.js';

const state = loadState();
initNav(state);
const root = $('#newworld-root');

const JOBS = [
  { t: '居民登记专员', loc: 'Level 1 · 阿尔法基地', pay: '面议', tag: '全职' },
  { t: '层级巡检员', loc: 'Level 0 – Level 4', pay: '面议', tag: '轮班' },
  { t: '真菌农场技术员', loc: 'Level 1 · 农场区', pay: '面议', tag: '全职' },
  { t: '档案数字化实习生', loc: '远程', pay: '无薪', tag: '实习' },
  { t: '签约主厨（隐藏菜谱方向）', loc: '保密', pay: '保密', tag: '内部推荐', hidden: true },
];

let revealed = state.neworldRevealed || false;

function renderSurface() {
  root.innerHTML = `
    <div class="archive-head">
      <h1 class="archive-title">新世界服务平台</h1>
      <p class="archive-subtitle">社会招聘 · 长期有效 · 岗位持续更新</p>
    </div>

    <div class="archive-grid">
      ${JOBS.filter(j => !j.hidden || state.awakened).map(j => `
        <article class="archive-entry">
          <div class="entry-header">
            <span class="entry-title">${esc(j.t)}</span>
            <span class="entry-level ${j.hidden ? 'hidden' : ''}">${esc(j.tag)}</span>
          </div>
          <div class="entry-content">
            <p>工作地点：${esc(j.loc)}</p>
            <p>薪酬：${esc(j.pay)}</p>
            <p style="color:var(--fg-dim);font-size:12px;">投递方式：回信至 join@newworld.com，主题填写你的信标名。</p>
          </div>
        </article>`).join('')}
    </div>

    <div class="final-panel">
      <h3>内推码</h3>
      <p style="font-size:13px;color:var(--fg-muted);">
        本平台仅接受内部推荐。请输入内推口令以查看完整岗位说明。
      </p>
      <div class="search-input-wrapper">
        <input class="search-input" id="nw-pass" placeholder="内推口令" autocomplete="off">
        <button class="search-btn" id="nw-go">验证</button>
      </div>
      <div class="final-msg" id="nw-msg"></div>
    </div>
  `;
  $('#nw-go').addEventListener('click', tryReveal);
  $('#nw-pass').addEventListener('keydown', e => { if (e.key === 'Enter') tryReveal(); });
}

function tryReveal() {
  const v = $('#nw-pass').value.trim().toLowerCase();
  const msg = $('#nw-msg');
  if (v === 'xinshijie') {
    set('neworldRevealed', true);
    revealed = true;
    showToast('内推口令通过', '隐藏层已展开。', 'warning');
    renderHidden();
  } else {
    const fails = (state.neworldFails || 0) + 1;
    set('neworldFails', fails);
    msg.className = 'final-msg error';
    msg.textContent = fails >= 3
      ? '口令仍在被拒绝。提示：它是拼音，意思是「新世界」。'
      : '口令无效。';
  }
}

function renderHidden() {
  const readCount = (state.mailRead || []).length;
  root.innerHTML = `
    <div class="ending">
      <div class="ending-badge">HIDDEN LAYER</div>
      <h1>这一层不是招聘页面</h1>
      <div class="ending-body">
        <p>如果你读到了这里，说明你已经收集过口令、信标名、主频和主厨编号，
        并且至少成功穿越了「内部邮箱 → 终端管道」这条链路。</p>

        <p>那么按这个项目的本来面目说明白：</p>

        <p class="ending-quote">
          本项目是一场 ARG（Alternate Reality Game，侵入式虚拟现实游戏）。<br>
          「后室维基」「厨得快」「新世界服务平台」都是虚构的伪装层，
          与外部的任何机构、平台、企业都没有关系。
        </p>

        <p>设计上刻意保留了几处不友好：</p>
        <ul>
          <li><b>时间门禁</b> —— 直播预约后需要等待 20 分钟才开场（或用帧 0 里的口令提前接入）；</li>
          <li><b>失败即剧情</b> —— 验证失败不是重来，而是被踢出，并"顺手"给你一个邮箱账号；</li>
          <li><b>不可逆的脱敏</b> —— 终端里第一次输错，grep 的模式就会被 <span class="code">.redacted</span> 覆盖，只能从 trace 反推；</li>
          <li><b>分散的线索</b> —— 主频在执行页、信标名在音频轨、编号在厨师服胸前，三处分属不同阶段。</li>
        </ul>

        <p>所以卡住是正常的。你被卡住的地方，就是设计者希望你回头再看一遍的地方。</p>

        <div class="ending-stats">
          <span>邮件已读：${readCount} 封</span>
          <span>管道尝试：${state.pipelineAttempts || 0} 次</span>
          <span>提示使用：${state.hintsUsed || 0} 次</span>
          <span>终局失败：${state.finalFails || 0} 次</span>
          <span>觉醒：${state.awakened ? '是' : '否'}</span>
        </div>

        <p style="color:var(--fg-dim);font-size:12px;">
          本页不含任何外部追踪脚本，所有进度只保存在你自己浏览器的 localStorage 里。
        </p>
      </div>
      <div class="ending-actions">
        <a class="back-link" href="archive.html">← 回到机密档案库</a>
        <a class="back-link" href="index.html">维基主页</a>
      </div>
    </div>
  `;
}

if (revealed) renderHidden(); else renderSurface();

route('newworld.html', () => {});
initRouter();
