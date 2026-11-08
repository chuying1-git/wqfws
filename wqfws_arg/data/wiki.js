// ============================================================
//  WQFWS ARG - Data: Fake Backrooms Wiki Entries
//  Some entries are "hidden" and only unlockable via specific search
// ============================================================

export const WIKI_ENTRIES = [
  // ========== SURFACE LAYER - Normal Entries ==========
  {
    id: 'level-0',
    title: 'Level 0 - 后室入口层',
    category: '层级',
    tags: ['生存难度 1', '可居住', '标准入口'],
    hidden: false,
    content: `
      <h3>描述</h3>
      <p>Level 0 是后室最常见的入口层级，表现为无限延伸的办公空间。黄色单色墙纸、潮湿的地毯、嗡嗡作响的荧光灯是其标志性特征。</p>
      <p>虽然看似安全，但长期停留会导致记忆模糊、方向感丧失。建议尽快寻找通往 Level 1 的出口（通常表现为墙面的异常裂缝或不合逻辑的门）。</p>
      <h3>实体</h3>
      <p>极少见。偶有报告称在极深处出现「徘徊者」，但未经证实。</p>
      <h3>资源</h3>
      <ul>
        <li>杏仁水（极少量，藏在吊顶上方）</li>
        <li>废弃办公用品（可制作简易工具）</li>
      </ul>
      <h3>出口</h3>
      <ul>
        <li>Level 1（最常见）</li>
        <li>Level 2（罕见，需特定仪式）</li>
        <li>The Hub（极罕见）</li>
      </ul>
    `
  },
  {
    id: 'level-1',
    title: 'Level 1 - 宜居地带',
    category: '层级',
    tags: ['生存难度 0', '安全', 'M.E.G. 基地'],
    hidden: false,
    content: `
      <h3>描述</h3>
      <p>Level 1 被广泛认为是后室中最安全、最宜居的层级。它呈现为一个巨大的、类似于仓库或地下停车场的混凝土结构，拥有相对稳定的照明、通风和温度。</p>
      <p>M.E.G.（Major Explorer Group，主要探索小组）在此建立了最大的永久基地「阿尔法基地」，人口约 2000 人。此处有可饮用的水源、可种植的真菌农场、以及相对完善的医疗设施。</p>
      <h3>主要设施</h3>
      <ul>
        <li>阿尔法基地（行政中心、交易市场、医疗站）</li>
        <li>真菌农场区（主食来源）</li>
        <li>水处理厂</li>
        <li>档案馆（存放层级情报）</li>
      </ul>
      <h3>出口</h3>
      <ul>
        <li>Level 0、Level 2、Level 4、Level 11、Level Fun</li>
        <li>部分通往 The Hub 的稳定通道</li>
      </ul>
    `
  },
  {
    id: 'entity-1',
    title: '实体 1 - 徘徊者',
    category: '实体',
    tags: ['敌对', '智力低', '视觉触发'],
    hidden: false,
    content: `
      <h3>描述</h3>
      <p>徘徊者是后室最常见的敌对实体。外形酷似人类，但皮肤苍白、四肢修长、面部五官模糊不清。它们通常成小群游荡，对视觉刺激极其敏感。</p>
      <h3>行为模式</h3>
      <ul>
        <li>巡逻固定路线，发现目标后高速追击</li>
        <li>视野范围约 30 米，听觉敏锐</li>
        <li>无法开门，但可破破损墙体</li>
      </ul>
      <h3>应对策略</h3>
      <p>切勿直视。保持安静、贴墙移动、寻找掩体。若被发现，立即奔跑并寻找可锁门的房间。</p>
    `
  },
  {
    id: 'item-almond-water',
    title: '物品 - 杏仁水',
    category: '物品',
    tags: ['消耗品', '治疗', '货币'],
    hidden: false,
    content: `
      <h3>描述</h3>
      <p>杏仁水是后室通用的货币与基础医疗物品。液体呈浅琥珀色，散发淡淡杏仁香气。饮用后可缓解疲劳、恢复理智、治疗轻度辐射病。</p>
      <h3>获取途径</h3>
      <ul>
        <li>Level 0 吊顶、Level 1 农场交易</li>
        <li>击败特定实体掉落</li>
        <li>完成 M.E.G. 任务奖励</li>
      </ul>
    `
  },
  {
    id: 'meg',
    title: '组织 - M.E.G. (主要探索小组)',
    category: '组织',
    tags: ['中立', '最大势力', '探索与生存'],
    hidden: false,
    content: `
      <h3>简介</h3>
      <p>M.E.G. 是后室规模最大、组织最完善的探索组织。宗旨：探索、记录、生存、归家。总部设于 Level 1 阿尔法基地，在 50+ 层级设有分部。</p>
      <h3>主要职能</h3>
      <ul>
        <li>层级探索与档案编纂</li>
        <li>建立安全据点与补给线</li>
        <li>新人引导与救援</li>
        <li>实体研究与威胁评级</li>
      </ul>
    `
  },
  {
    id: 'phenomenon-no-clipping',
    title: '现象 - 穿墙',
    category: '现象',
    tags: ['随机', '传送', '风险'],
    hidden: false,
    content: `
      <h3>描述</h3>
      <p>穿墙是后室核心机制之一。指人员在非自愿状态下，穿过固体表面（墙、地、顶）进入另一层级。通常伴随强烈眩晕、记忆碎片化。</p>
      <p>触发条件尚不完全明确，但与「强烈情绪波动」「长时间静止」「特定几何结构」有关。</p>
    `
  },

  // ========== HIDDEN LAYER - Unlockable Entries ==========
  {
    id: 'hidden-ellis',
    title: '【机密】Ellis 蒋 - 档案编号 7341-AL',
    category: '机密档案',
    tags: ['M.E.G. 绝密', '签约主厨', '隐藏人员'],
    hidden: true,
    chefId: 'Ellis 蒋',
    content: `
      <h3>>>> 访问权限验证通过 <<<</h3>
      <p><strong>姓名：</strong>Ellis 蒋</p>
      <p><strong>代号：</strong>「主厨」</p>
      <p><strong>身份：</strong>M.E.G. 特别顾问 / Level 1 阿尔法基地「后厨」负责人</p>
      <p><strong>备注：</strong>该人员不存在于任何公开名册中。其「菜谱」实为层级坐标加密载体。</p>
      <hr>
      <p><strong>隐藏菜谱索引：</strong></p>
      <ul>
        <li>金牌蜜汁叉烧 → 坐标: 875Hz</li>
        <li>砂锅焗鸡 → 频率锁定: 0.5s</li>
        <li>清蒸鲈鱼 → 信标: ALMOND</li>
      </ul>
      <p style="color: #6dff9e; font-family: monospace;">ODc1</p>
      <p class="hint">（提示：搜索框输入准确 Chef ID 可解锁该人员全部隐藏菜谱）</p>
    `
  },
  {
    id: 'hidden-recipe-1',
    title: '【隐藏菜谱】金牌蜜汁叉烧',
    category: '隐藏菜谱',
    tags: ['Ellis 蒋', '频率载体', '875Hz'],
    hidden: true,
    chefId: 'Ellis 蒋',
    content: `
      <h3>金牌蜜汁叉烧</h3>
      <p><strong>主厨：</strong>Ellis 蒋</p>
      <p><strong>上传时间：</strong>2026-06-13</p>
      <p><strong>食材：</strong></p>
      <ul>
        <li>五花肉 500g（对应频率基波）</li>
        <li>蜂蜜 3勺（调制深度 75%）</li>
        <li>生抽 2勺（载波幅度）</li>
        <li>料酒 1勺（相位偏移）</li>
        <li>五香粉 适量（谐波抑制）</li>
      </ul>
      <p><strong>做法：</strong></p>
      <ol>
        <li>肉切条，按 8:7:5 比例腌制 <span class="cipher">ODc1</span> 分钟</li>
        <li>200度烤 15 分钟，每 5 分钟刷一次蜜汁（模拟调频）</li>
        <li>出炉静置 0.5 秒（锁相关键）</li>
      </ol>
      <p class="hint">核心参数：<span class="freq">875</span> | <span class="lock">0.5</span> | <span class="code">ALMOND</span></p>
    `
  },
  {
    id: 'hidden-recipe-2',
    title: '【隐藏菜谱】砂锅焗鸡',
    category: '隐藏菜谱',
    tags: ['Ellis 蒋', '相位锁定', '0.5s'],
    hidden: true,
    chefId: 'Ellis 蒋',
    content: `
      <h3>砂锅焗鸡</h3>
      <p><strong>主厨：</strong>Ellis 蒋</p>
      <p><strong>上传时间：</strong>2026-06-14</p>
      <p><strong>食材：</strong></p>
      <ul>
        <li>鸡块 500g（信号源）</li>
        <li>沙姜 1块（滤波器）</li>
        <li>葱段 适量（天线阵列）</li>
        <li>生抽 2勺（增益）</li>
        <li>米酒 1勺（相位参考）</li>
      </ul>
      <p><strong>做法：</strong></p>
      <ol>
        <li>腌制 20 分钟（预热稳频）</li>
        <li>中火焗 12 分钟，盖缝有白气向外找路时补油（相位跟踪）</li>
        <li>关火焖 5 分钟，等锅盖不再抖动（锁相完成）</li>
      </ol>
      <p class="hint">关键窗口：<span class="lock">0.5s</span> 相位锁定容差</p>
    `
  },
  {
    id: 'hidden-recipe-3',
    title: '【隐藏菜谱】清蒸鲈鱼',
    category: '隐藏菜谱',
    tags: ['Ellis 蒋', '信标码', 'ALMOND'],
    hidden: true,
    chefId: 'Ellis 蒋',
    content: `
      <h3>清蒸鲈鱼</h3>
      <p><strong>主厨：</strong>Ellis 蒋</p>
      <p><strong>上传时间：</strong>2026-04-01</p>
      <p><strong>食材：</strong></p>
      <ul>
        <li>鲈鱼 1条（载体）</li>
        <li>葱 2根、姜 1块（调制参考）</li>
        <li>蒸鱼豉油 3勺（标记液）</li>
      </ul>
      <p><strong>做法：</strong></p>
      <ol>
        <li>鱼身划刀，葱姜铺底（阻抗匹配）</li>
        <li>水开上鱼，大火蒸 8 分钟，关火虚蒸 2 分钟</li>
        <li>倒掉蒸鱼水，铺新葱丝，淋热油——听到短促响声立即盖盖（信标触发）</li>
      </ol>
      <p class="hint">信标确认码：<span class="code">ALMOND</span></p>
    `
  },

  // ========== DEEP LAYER - Only accessible after awakening ==========
  {
    id: 'deep-newworld',
    title: '【最高机密】新世界服务平台 - 内部备忘录',
    category: '最高机密',
    tags: ['Level A 觉醒', '新世界', '归家计划'],
    hidden: true,
    requiresAwakened: true,
    content: `
      <h3>>>> LEVEL A CLEARANCE REQUIRED <<<</h3>
      <p><strong>项目代号：</strong>归家计划</p>
      <p><strong>平台编号：</strong>厨EMA 12609号</p>
      <p><strong>中文域名：</strong>新世界.服务</p>
      <hr>
      <p><strong>居民登记口径（2012版）：</strong></p>
      <ul>
        <li>严禁私自称呼居民原样本姓名</li>
        <li>夜间转运车辆请勿停靠居民区</li>
        <li>部分居民存在强烈回避反应</li>
        <li>请尽快完成档案转移工作</li>
      </ul>
      <p><strong>成功案例节选：</strong></p>
      <ul>
        <li>4月17日 居民已到达新世界，欢迎！</li>
        <li>5月12日 居民已到达新世界，欢迎！</li>
        <li>3月28日 居民已到达新世界，欢迎！</li>
      </ul>
      <p><strong>联系方式：</strong></p>
      <p>总站电话：022-1206-090</p>
      <p>夜间转运：022-6090-121</p>
      <p>合作审核：join@newworld.com</p>
      <hr>
      <p style="color: #8e0f19;">免责声明：本作品内容纯属虚构，文中所有角色、名称、地名、数据、事件及机构均与现实无关。如有雷同，纯属巧合。游戏内容仅供娱乐体验，请勿与现实对照。</p>
    `
  },
  {
    id: 'toolbox',
    title: 'M.E.G. 工具台 · 编解码台',
    category: '工具',
    tags: ['工具台', 'base64', '十六进制', '解码', '字节', '工具'],
    hidden: false,
    content: `
      <h3>说明</h3>
      <p>档案里偶尔会出现"不像人话"的东西：一串只有大小写字母和等号的长字符、一段十六进制、图片尾巴上多出来的几十个字节。它们大多不是加密，只是被<b>换了一种写法</b>。</p>
      <p>工具台就是拿来换算的：base64 ↔ 文本、十六进制 ↔ 文本。它<b>不联网、不上传、不记录</b>，所有字节都在你自己的机器上处理。</p>
      <h3>它不做什么</h3>
      <ul>
        <li>不告诉你该解哪一段</li>
        <li>不做位移密码（那类东西自己算）</li>
        <li>不做"智能猜测" —— 你手里的到底是什么，由你自己判断</li>
      </ul>
      <h3>入口</h3>
      <p>归档在 <span class="code">toolbox.html</span>，终端管道页底部也有直达。</p>
      <p style="color:#6dff9e;">提示：解出来的东西如果还是一串 base64，可以再来一次 —— 有人习惯套好几层。</p>
    `
  }
];

// Search function used by wiki
export function searchWiki(query, state) {
  const q = query.trim().toLowerCase();
  if (!q) return WIKI_ENTRIES.filter(e => !e.hidden);
  
  // Chef ID exact match unlocks hidden recipes
  const matchedChef = WIKI_ENTRIES.find(e => 
    e.hidden && e.chefId && e.chefId.toLowerCase() === q
  );
  
  if (matchedChef) {
    // Unlock all entries with this chefId
    return WIKI_ENTRIES.filter(e => 
      e.hidden && e.chefId && e.chefId.toLowerCase() === q
    );
  }
  
  // Normal search (excludes hidden unless awakened)
  const awakened = state?.awakened || false;
  return WIKI_ENTRIES.filter(e => {
    if (e.hidden && !awakened && !e.requiresAwakened) return false;
    if (e.requiresAwakened && !awakened) return false;
    return e.title.toLowerCase().includes(q) ||
           e.category.toLowerCase().includes(q) ||
           e.tags.some(t => t.toLowerCase().includes(q));
  });
}

// Get entry by ID
export function getEntryById(id) {
  return WIKI_ENTRIES.find(e => e.id === id);
}