// ============================================================
//  WQFWS ARG - Stage: 最高机密档案库 (archive.html)
//  Level A 觉醒后进入；多条件解锁条目 + 关键词检索 + 真结局
// ============================================================
import { loadState, set, setMany } from '../state.js';
import { route, navigate, initRouter } from '../router.js';
import { $, showToast, initNav, gateScreen, esc } from './ui.js';

const state = loadState();
initNav(state);

const root = $('#archive-root');

// ------------------------------------------------------------
// 门禁：Level A
// ------------------------------------------------------------
// NOTE: gating runs at the very bottom of this module, because `render()`
// depends on the ENTRIES / KEYWORDS bindings declared below it.

// ------------------------------------------------------------
// 条目定义：每条都有解锁条件（分层）
// ------------------------------------------------------------
const ENTRIES = [
  {
    id: 'almond',
    title: 'ALMOND 信标协议',
    level: 'restricted',
    tags: ['信标', '频率', '875'],
    cond: () => true,
    body: `
      <p>信标名 <span class="cipher">ALMOND</span>，主频 <span class="freq">875 Hz</span>。</p>
      <p>信标用于在层级之间广播「可安全登记」的信号。只有完成握手的人会被记录。</p>
      <p>直播第 2 段（全黑期间）音频里嵌入了信标名；第 1 段频谱仪显示主频。字幕第二轨里残留 Base64 形式 <span class="code">ODc1</span>。</p>
    `,
  },
  {
    id: 'ellis',
    title: '签约主厨 Ellis 蒋 · 隐藏菜谱',
    level: 'restricted',
    tags: ['chef', 'Hanyu', '7364-AL'],
    cond: () => state.hiddenEntryUnlocked || state.awakened,
    body: `
      <p>内部登记代号 <span class="code">Hanyu</span>。签约编号 <span class="code">7364-AL</span>。</p>
      <p>公开菜谱 108 条；另有 6 条「隐形菜谱」，只在特定层级供应。</p>
      <p>招聘中心的编号规则是「年份后两位 + 序号」。2023 年第 64 位是 2364，因此 7364 不属于任何公开年份序列 —— 这是刻意为之。</p>
    `,
  },
  {
    id: 'pipeline',
    title: '管道执行记录 · trace 还原',
    level: 'hidden',
    tags: ['trace', 'grep', 'redacted'],
    cond: () => state.pipelineSolved,
    body: `
      <p>正确序列：<span class="code">cat | grep | cut | sort | tr | base64 | tail | head</span></p>
      <p><span class="code">sort</span> 是伪陷阱：它在字段切分之后介入完全无害。</p>
      <p><span class="code">head</span> 是真陷阱：只有放在最末尾才不会丢数据。</p>
      <p>原始 grep 模式在第一次错误后被替换成 <span class="redacted">.redacted</span>，需从 trace 的偏移报错反推。</p>
    `,
  },
  {
    id: 'frame0',
    title: '帧 0 · 导播未清除的预录',
    level: 'hidden',
    tags: ['帧 0', 'xinshijie'],
    cond: () => state.roomHiddenFrame,
    body: `
      <p>直播间的「跳转帧」输入 <span class="code">0</span> 可以取回导播忘记删除的预录帧。</p>
      <p>帧 0 内容：备用信号口令 <span class="code">xinshijie</span>。</p>
      <p>该口令可在直播未开始时提前接入信号。</p>
    `,
  },
  {
    id: 'audit',
    title: '签约审核中心 · 复核结论',
    level: 'restricted',
    tags: ['zhouyanan', '1543', '内部'],
    cond: () => state.zhouAccountUnlocked,
    body: `
      <p>员工邮箱 <span class="code">zhouyanan@mail.com</span>（口令 1543）中保存了复核结论。</p>
      <p>结论：通过。持有人具备「隐藏菜谱」权限。</p>
      <p>备注：该邮箱并非为本次内测开设，而是长期存在的内部账号 —— 它早就在那里了。</p>
    `,
  },
  {
    id: 'cipherbook',
    title: '内部密钥本 · 第 M 行事故',
    level: 'hidden',
    tags: ['vigenere', 'ROT13', '校验位'],
    cond: () => state.cipherBookUnlocked,
    body: `
      <p>密钥本是一张 26×26 的维吉尼亚表，靠两条恒等式校验：<b>行首字母必须等于行标签</b>，
      且<b>相邻两行必须整体相差一位</b>。</p>
      <p>改版时第 <span class="code">M</span> 行的位移被误写成 <span class="code">13</span>（应为 12），
      导致该行行首变成 <span class="code">N</span>；同时它与上下两行的递进关系都断裂，
      因此恒等式 2 会同时指向 <span class="code">M</span> 和 <span class="code">N</span> —— 取交集才锁定 M。</p>
      <p>用未修正的表解终端第 4 段会得到 <span class="code">HAMYU</span>；修正后才是真值。</p>
      <p>这条事故本身就是线索：一个"看起来能跑"的错误，会一直在结果里留下痕迹。</p>
    `,
  },
  {
    id: 'smiler',
    title: 'annex 03 · 笑魇档案（像素层）',
    level: 'hidden',
    tags: ['stego', 'LSB', 'annex'],
    cond: () => state.smilerSolved,
    body: `
      <p>annex 03 是一张 PNG。三层都藏在文件本身里：</p>
      <ul>
        <li><b>L1</b> 尾部：IEND 之后追加的文字，里面有一行 base64，解出指向下一层的指针；</li>
        <li><b>L2</b> 元数据：PNG 的 tEXt <span class="code">Comment</span> 块，同样是 base64；</li>
        <li><b>L3</b> 像素：蓝色通道最低位。长度头在第 0–31 位（32 位大端），
            载荷起点在第 <span class="code">875</span> 位 —— 那个数字就是频率。</li>
      </ul>
      <p>载荷：<span class="code">笑脸|60312219015|二周年快乐</span></p>
      <p>这层最脆：把图重新保存成 JPEG，像素被重采样，载荷立刻消失（可自行验证）。</p>
    `,
  },
  {
    id: 'newworld',
    title: '新世界服务平台 · 双层入口',
    level: 'hidden',
    tags: ['newworld', '双层'],
    cond: () => state.pipelineSolved && state.awakened,
    body: `
      <p>表层是一个普通的招聘页面；隐藏层需要输入口令 <span class="code">xinshijie</span>。</p>
      <p>隐藏层里写着本项目的真实性质：<b>这是一场 ARG</b>。</p>
      <p>如果你读到这一条，说明你走完了全部五段链路。</p>
      <p><a href="newworld.html">→ 前往 newworld.html</a></p>
    `,
  },
];

const KEYWORDS = [
  { k: ['ellis', '蒋', 'hanyu'], hit: 'ellis' },
  { k: ['almond', '信标'], hit: 'almond' },
  { k: ['875'], hit: 'almond' },
  { k: ['grep', 'trace', 'redacted', '管道'], hit: 'pipeline' },
  { k: ['帧 0', '帧0', 'xinshijie', '口令'], hit: 'frame0' },
  { k: ['zhouyanan', '1543', '审核'], hit: 'audit' },
  { k: ['newworld', '双层', '新世界'], hit: 'newworld' },
];

// ------------------------------------------------------------
// 渲染
// ------------------------------------------------------------
function render() {
  const visible = ENTRIES.filter(e => e.cond());
  const locked = ENTRIES.length - visible.length;

  root.innerHTML = `
    <div class="archive-head">
      <div class="awakened-badge">LEVEL A AWAKENED</div>
      <h1 class="archive-title">最高机密档案库</h1>
      <p class="archive-subtitle">已解锁 ${visible.length} / ${ENTRIES.length} 条${locked ? ` · 尚有 ${locked} 条未解锁` : ''}</p>
    </div>

    <div class="search-panel">
      <h3 style="margin-top:0;">档案检索</h3>
      <p style="font-size:12px;color:var(--fg-muted);">支持关键词：主厨代号、信标名、频率、trace 术语、内部账号。</p>
      <div class="search-input-wrapper">
        <input class="search-input" id="arch-q" placeholder="输入检索词…">
        <button class="search-btn" id="arch-go">检索</button>
      </div>
      <div id="arch-out" class="arch-out"></div>
    </div>

    <div class="archive-grid">
      ${visible.map(e => `
        <article class="archive-entry" data-id="${e.id}">
          <div class="entry-header">
            <span class="entry-title">${esc(e.title)}</span>
            <span class="entry-level ${e.level}">${e.level}</span>
          </div>
          <div class="entry-tags">${e.tags.map(t => `<span class="entry-tag">${esc(t)}</span>`).join('')}</div>
          <div class="entry-content">${e.body}</div>
        </article>`).join('')}
    </div>

    ${locked ? `<div class="locked-note">未解锁 ${locked} 条：需要更深的链路进度（终端管道 / 帧 0 / 员工邮箱）。</div>` : ''}

    <div class="final-panel" id="final-panel">
      <h3>终局校验</h3>
      <p style="font-size:13px;color:var(--fg-muted);">
        终局需要 <b>5 段</b>值，按
        <span class="code">主频 | 信标 | 内部编号 | 第4段 | 笑魇载荷</span> 的顺序，用竖线拼接提交。<br>
        第 4 段藏在密钥本里；第 5 段不在任何页面上 —— 它在一张图片的像素里（annex 03）。
      </p>
      <div class="search-input-wrapper">
        <input class="search-input" id="final-code" placeholder="875|ALMOND|…">
        <button class="search-btn" id="final-go">提交</button>
      </div>
      <div id="final-msg" class="final-msg"></div>
    </div>
  `;

  $('#arch-go').addEventListener('click', doSearch);
  $('#arch-q').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  $('#final-go').addEventListener('click', checkFinal);
  $('#final-code').addEventListener('keydown', e => { if (e.key === 'Enter') checkFinal(); });
}

function doSearch() {
  const q = $('#arch-q').value.trim().toLowerCase();
  const out = $('#arch-out');
  if (!q) { out.innerHTML = ''; return; }

  const hits = KEYWORDS.filter(g => g.k.some(k => q.includes(k)));
  if (!hits.length) {
    out.innerHTML = `<div class="search-result-item dim">无匹配档案。试试：主厨代号 / 信标名 / 频率 / trace 术语 / 内部账号。</div>`;
    return;
  }
  const ids = [...new Set(hits.map(h => h.hit))];
  out.innerHTML = ids.map(id => {
    const e = ENTRIES.find(x => x.id === id);
    const ok = e.cond();
    return `<div class="search-result-item ${ok ? '' : 'dim'}">
      <b>${esc(e.title)}</b>
      <span class="mono" style="font-size:11px;color:var(--fg-dim);">${ok ? '已解锁' : '进度不足，无法展开'}</span>
    </div>`;
  }).join('');
  set('archiveSearches', (state.archiveSearches || 0) + 1);
}

function checkFinal() {
  const raw = $('#final-code').value.trim();
  const norm = raw.toUpperCase().replace(/\s+/g, '');
  const msg = $('#final-msg');

  // 5 段：主频 | 信标 | 内部编号 | 维吉尼亚第 4 段 | 笑魇像素载荷
  if (!state.smilerSolved) {
    msg.className = 'final-msg error';
    msg.textContent = '第 5 段还没扒出来 —— annex 03 那张图还锁着。';
    return;
  }
  const ok = /^875\|ALMOND\|7364-AL\|HANYU\|60312219015$/.test(norm);
  if (!ok) {
    const fails = (state.finalFails || 0) + 1;
    set('finalFails', fails);

    if (fails >= 3) return showBadEnding(norm);

    const parts = norm.split('|').filter(Boolean);
    const hints = [];
    if (parts.length !== 5) hints.push(`段数不对（你交了 ${parts.length} 段，需要 5 段）`);
    if (parts[0] && parts[0] !== '875') hints.push('第 1 段不是仪表盘上那个缓存读数');
    if (parts[2] && !/^7364(-?AL)?$/.test(parts[2])) hints.push('第 3 段是两段数字拼接 + -AL 后缀');
    if (parts[4] && !/60312219015/.test(parts[4])) hints.push('第 5 段是那串 11 位数字');
    msg.className = 'final-msg error';
    msg.textContent = `校验失败（第 ${fails}/3 次）${hints.length ? '：' + hints.join('；') : '。'}`;
    return;
  }
  setMany({ finalCodeEntered: true, endingReached: true, endingReachedAt: Date.now() });
  showEnding();
}

// ------------------------------------------------------------
// BAD ENDING：连续三次失败 → 登记为普通居民，解码进度被清空（可重做）
// ------------------------------------------------------------
function showBadEnding(submitted) {
  setMany({
    badEndings: (state.badEndings || 0) + 1,
    // 惩罚：三段解码成果与第 4 段作废，必须回到对应页面重做
    freqDecoded: false,
    beaconDecoded: false,
    idDecoded: false,
    vigenere4th: false,
    finalFails: 0,
  });

  root.innerHTML = `
    <div class="ending bad">
      <div class="ending-badge bad">BAD ENDING</div>
      <h1>你被登记为普通居民</h1>
      <div class="ending-body">
        <p>你提交的是：<span class="code">${esc(submitted) || '（空）'}</span></p>
        <p>校验连续失败三次。系统不再把它当作输入错误，而是按<b>未通过身份核验</b>处理：
        你的三段解码成果已被回收，档案标记为「普通居民 · 无权限」。</p>
        <p>这不是死局。被回收的只有<b>解码结果</b>，不是你的进度：</p>
        <ul>
          <li>回 <a href="room.html">直播间</a> 重新走一遍三步复核（二进制 → ROT13 → 编号拼接）；</li>
          <li>回 <a href="cipher.html">密钥本</a> 重新解第 4 段。</li>
        </ul>
        <p class="ending-quote">在这一层，「失败」不是重来，是被降级。</p>
        <div class="ending-stats">
          <span>BAD ENDING 次数：${(state.badEndings || 0)}</span>
          <span>累计终局失败：${state.finalFails || 0}</span>
        </div>
      </div>
      <div class="ending-actions">
        <a class="back-link" href="room.html">← 回到直播间重做复核</a>
        <a class="back-link" href="cipher.html">去密钥本</a>
      </div>
    </div>`;
  showToast('BAD ENDING', '连续三次校验失败。三段解码成果已被回收。', 'error');
}

function showEnding() {
  const readCount = (state.mailRead || []).length;
  root.innerHTML = `
    <div class="ending">
      <div class="ending-badge">TRUE ENDING</div>
      <h1>新世界服务平台</h1>
      <div class="ending-body">
        <p>校验通过。你提交的五段值，对应的是同一件事的五张外壳：</p>
        <ul>
          <li><span class="code">875</span> —— 信号主频，它是「听得见」的那一层；</li>
          <li><span class="code">ALMOND</span> —— 信标名，它是「被登记」的那一层；</li>
          <li><span class="code">7364-AL</span> —— 主厨编号，它是「有身份」的那一层；</li>
          <li><span class="code">HANYU</span> —— 内部代号，它是「有名字」的那一层（只能用密钥本那张表解出来）；</li>
          <li><span class="code">60312219015</span> —— <b>笑脸</b>的抖音号，它是「真实存在」的那一层 ——
              这一层不在任何页面上，只在那张笑魇 PNG 的蓝色通道最低位里。</li>
        </ul>
        <p>五层合起来，才是完整的入职凭据。</p>
        <p class="ending-quote">你已读到 ${readCount} 封内部邮件，提交过若干次失败校验。<br>
        这些失败都没有被丢弃 —— 它们全部记录在档案里，构成了你的访问轨迹。</p>
        <p>本项目到此结束。这不是招聘页面，也不是维基条目。<br>
        这是一场 <b>ARG</b>。感谢你走完全程。</p>
        <div class="ending-stats">
          <span>管道尝试：${state.pipelineAttempts || 0} 次</span>
          <span>提示使用：${state.hintsUsed || 0} 次</span>
          <span>终局失败：${state.finalFails || 0} 次</span>
          <span>邮件已读：${readCount} 封</span>
        </div>
      </div>
      <div class="ending-actions">
        <a class="back-link" href="index.html">← 回到维基主页</a>
        <button class="back-link" id="reset-run">清除本轮记录，重新开始</button>
      </div>
    </div>`;

  showToast('TRUE ENDING', '你已抵达终局。感谢游玩。', 'success');
  $('#reset-run').addEventListener('click', () => {
    if (confirm('确定要清除全部进度吗？')) {
      localStorage.removeItem('wqfws-arg-state-v1');
      location.href = 'index.html';
    }
  });
}

// ------------------------------------------------------------
// 启动门禁（必须在 ENTRIES / KEYWORDS 初始化之后）
// ------------------------------------------------------------
if (!state.awakened) {
  gateScreen(root, {
    title: 'LEVEL A 权限缺失',
    lines: [
      '本档案库仅对通过觉醒流程的访问者开放。',
      '觉醒条件：在维基主页连续点击站点标识 7 次。',
      '完整访问链路：搜索隐藏主厨 → 预约直播 → 通过复核 → 回复归档邮件 → 贯通终端管道。',
    ],
    hint: '回到 <a href="index.html">维基主页</a>，点击左上角标识 7 次。',
  });
} else {
  render();
}

route('archive.html', () => {});
initRouter();
