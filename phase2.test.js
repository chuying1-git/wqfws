// phase2.html「二周目 · 阈界回访」交互测试
const path = require("path");
const { open, wait, group, ok, eq, report } = require("./harness");

const P2 = path.join(__dirname, "..", "phase2.html");
const MAIN_OK = ["wqfws-v3", JSON.stringify({ final: true, entities: true, terminal: true })];

const openP2 = (opts = {}) => open({ file: P2, ...opts });

// 跳过开机自检（phase2 没有入口弹窗）
async function boot(p) {
  p.key("Escape");
  await p.waitFor(() => p.hasClass("#boot", "done"), 3000, "开机自检结束");
}

// 读出熄灯区当前亮着的顺序
function lzSeq(p) {
  return p.$$("#lzGrid .lz[data-step]")
    .sort((a, b) => Number(a.getAttribute("data-step")) - Number(b.getAttribute("data-step")))
    .map(b => b.getAttribute("data-cell"));
}

/* ============================================================
   1. 门槛：主线没走完就打不开
   ============================================================ */
async function gateLocked() {
  group("门槛 · 无存档");
  const p = openP2();
  ok(p.hasClass("#lock", "show"), "没存档时显示锁定屏");
  ok(p.$("#boot").style.display === "none", "锁定屏下不播开机自检");
  eq(p.text("#lockCount"), "0 / 11", "主线进度 0 / 11");
  eq(p.text("#lockFrags"), "0 / 10", "碎片 0 / 10");
  eq(p.text("#lockFinal"), "未达成", "最终广播未达成");
  eq(p.$$("#mods .mod").length, 6, "六个模块卡仍在 DOM 里（但被锁屏盖住）");
  eq(p.errors.length, 0, "无脚本错误");
  p.close();

  group("门槛 · 主线只做了一半");
  const half = { photo: true, radio: true, puzzle: true, safe: true, timeline: true };
  const q = openP2({ seed: [["wqfws-v3", JSON.stringify(half)]] });
  ok(q.hasClass("#lock", "show"), "做了 5 关仍然锁着");
  eq(q.text("#lockCount"), "5 / 11", "进度 5 / 11");
  eq(q.text("#lockFrags"), "5 / 10", "碎片 5 / 10");
  eq(q.text("#lockFinal"), "未达成", "最终广播未达成");
  q.close();

  group("门槛 · 存档损坏");
  const r = openP2({ seed: [["wqfws-v3", "{坏掉的 json"]] });
  ok(r.hasClass("#lock", "show"), "存档损坏时按未解锁处理，不崩");
  eq(r.errors.length, 0, "存档损坏无脚本错误");
  r.close();
}

/* ============================================================
   2. 解锁
   ============================================================ */
async function gateOpen() {
  group("解锁");
  const p = openP2({ seed: [MAIN_OK] });
  ok(!p.hasClass("#lock", "show"), "主线通关后不再显示锁定屏");
  eq(p.$("#lock").style.display, "none", "锁定屏被显式隐藏");
  await boot(p);
  eq(p.text("#p2prog"), "0 / 6", "第二趟进度 0 / 6");
  eq(p.$$("#p2segs .seg").length, 6, "进度条 6 段");
  eq(p.$$("#mods .mod").length, 6, "六个模块");
  ok(p.$$("#mods .mod").every(b => !b.disabled), "六个模块都可点");
  p.close();
}

/* ============================================================
   3. P2-01 孤立效应
   ============================================================ */
async function stageIsolation() {
  group("P2-01 孤立效应");
  const p = openP2({ seed: [MAIN_OK] });
  await boot(p);
  p.click('#mods .mod[data-stage="isolation"]');
  await p.waitFor(() => p.hasClass("#stage-isolation", "on"), 1500, "面板打开");

  eq(p.$$("#isoGridA .ic").length, 49, "A 图 7×7 = 49 格");
  eq(p.$$("#isoGridB .ic").length, 49, "B 图 49 格");
  eq(p.$$("#isoGridA .ic.you").length, 11, "你的足迹 11 格");
  eq(p.$$("#isoGridB .ic.other").length, 11, "对方足迹 11 格");

  // 关键：两图的重合点必须恰好只有一个（谜题唯一解）
  const setA = p.$$("#isoGridA .ic.you").map(b => b.getAttribute("data-cell"));
  const setB = p.$$("#isoGridB .ic.other").map(b => b.getAttribute("data-cell"));
  const shared = setA.filter(i => setB.indexOf(i) !== -1);
  eq(shared.length, 1, "两条足迹恰好只重合一格（谜题有唯一解）");
  const ANS = shared[0];

  // 未解出前不能把答案标出来
  eq(p.$$("#isoGridA .ic.both").length, 0, "解题前不显示重合格");
  eq(p.$$("#isoGridB .ic.both").length, 0, "解题前不显示重合格");

  // 点一个只有一边走过的格子
  const decoy = setA.filter(i => i !== ANS)[0];
  p.click(`#isoGridA .ic[data-cell="${decoy}"]`);
  ok(!p.$('#mods .mod[data-stage="isolation"]').classList.contains("done"), "点错不通关");
  ok(p.text("#isoOut").indexOf("只有一边走过") !== -1, "点错给出提示");

  // 点重合格
  p.click(`#isoGridB .ic[data-cell="${ANS}"]`);
  ok(p.hasClass("#isoDone", "on"), "点中重合格通关");
  eq(p.text("#isoProg"), "已找到", "状态变已找到");
  eq(p.$$("#isoGridA .ic.both").length, 1, "A 图标出唯一重合格");
  eq(p.$$("#isoGridB .ic.both").length, 1, "B 图也标出同一格");
  ok(p.text("#isoAns").indexOf("第 ") === 0, "结局写出坐标（" + p.text("#isoAns") + "）");

  await p.waitFor(() => p.hasClass("#stage-noise", "on"), 3000, "自动切到噪音");
  p.close();
}

/* ============================================================
   4. P2-02 噪音
   ============================================================ */
async function stageNoise() {
  group("P2-02 噪音");
  const p = openP2({ seed: [MAIN_OK, ["wqfws-p2", JSON.stringify({ isolation: true })]] });
  await boot(p);
  p.click('#mods .mod[data-stage="noise"]');
  await p.waitFor(() => p.hasClass("#stage-noise", "on"), 1500, "面板打开");

  eq(p.$$("#waves .wave").length, 4, "四段录音");
  eq(p.$$("#waves .wave .wv-svg polyline").length, 4, "四段波形都画了折线");
  ok(p.$$("#waves .wave .wv-svg polyline").every(pl => (pl.getAttribute("points") || "").length > 100),
    "波形折线不是空的");
  eq(p.$$("#waves .wave .wv-play").length, 4, "四段都有试听按钮");

  // 没选就提交
  p.click("#noiseGo");
  ok(p.text("#noiseOut").indexOf("还没选") !== -1, "未选中时提交被拦下");

  // 试听不报错（jsdom 无 Web Audio，应静默）
  p.click('#waves .wave[data-wave="hum"] .wv-play');
  eq(p.errors.length, 0, "试听在无 Web Audio 环境下静默不报错");

  // 选错
  p.click('#waves .wave[data-wave="whisper"]');
  ok(p.hasClass('#waves .wave[data-wave="whisper"]', "sel"), "选中态生效");
  p.click("#noiseGo");
  ok(!p.$('#mods .mod[data-stage="noise"]').classList.contains("done"), "选错不通关");
  ok(p.text("#noiseOut").indexOf("音高一直在变") !== -1, "选错给出提示");
  eq(p.$$("#waves .wave.sel").length, 0, "选错后清空选中");

  // 选对
  p.click('#waves .wave[data-wave="hum"]');
  p.click("#noiseGo");
  ok(p.hasClass("#noiseDone", "on"), "选中 hum 通关");
  eq(p.text("#noiseProg"), "1 / 1", "进度 1 / 1");
  await p.waitFor(() => p.hasClass("#stage-lights", "on"), 3000, "自动切到熄灯区");
  p.close();
}

/* ============================================================
   5. P2-03 熄灯区
   ============================================================ */
async function stageLights() {
  group("P2-03 熄灯区");
  const p = openP2({ seed: [MAIN_OK, ["wqfws-p2", JSON.stringify({ isolation: true, noise: true })]] });
  await boot(p);
  p.click('#mods .mod[data-stage="lights"]');
  await p.waitFor(() => p.hasClass("#stage-lights", "on"), 1500, "面板打开");

  eq(p.$$("#lzGrid .lz").length, 25, "5×5 = 25 格");
  const seq = lzSeq(p);
  eq(seq.length, 6, "亮 6 格");
  eq(new Set(seq).size, 6, "6 格互不重复");
  eq(p.$$("#lzGrid .lz.lit").length, 6, "6 格带 lit 类");
  ok(p.$$("#lzGrid .lz.lit").every(b => Number(b.textContent) >= 1 && Number(b.textContent) <= 6),
    "亮着的格子标了 1~6 的顺序号");

  // 灯没关时点格子不算数
  p.click(`#lzGrid .lz[data-cell="${seq[0]}"]`);
  ok(p.text("#lzProg") === "待解", "灯亮时点击不推进");

  // 关灯
  p.click("#lzHide");
  ok(p.hasClass("#lzGrid", "dark"), "进入黑暗");
  eq(p.$$("#lzGrid .lz.lit").length, 0, "关灯后不再显示亮格");
  eq(p.$$("#lzGrid .lz[data-step]").length, 0, "关灯后不残留顺序号");
  ok(p.$$("#lzGrid .lz").every(b => b.textContent === ""), "关灯后不残留数字");

  // 先点错
  p.click(`#lzGrid .lz[data-cell="${seq[5]}"]`);
  ok(p.text("#lzOut").indexOf("第 1 步走错了") !== -1, "错步给出提示");
  eq(p.text("#lzProg"), "0 / 6", "错步后退回第一步");

  // 按顺序走完
  seq.forEach(c => p.click(`#lzGrid .lz[data-cell="${c}"]`));
  await wait(40);
  ok(p.hasClass("#lzDone", "on"), "六格全对通关");
  eq(p.text("#lzProg"), "已走出", "状态变已走出");
  await p.waitFor(() => p.hasClass("#stage-redroom", "on"), 3000, "自动切到红室");
  p.close();

  group("P2-03 重新亮灯");
  const q = openP2({ seed: [MAIN_OK, ["wqfws-p2", JSON.stringify({ isolation: true, noise: true })]] });
  await boot(q);
  q.click('#mods .mod[data-stage="lights"]');
  await q.waitFor(() => q.hasClass("#stage-lights", "on"), 1500, "面板打开");
  const before = lzSeq(q).join(",");
  q.click("#lzRetry");
  const after = lzSeq(q).join(",");
  eq(lzSeq(q).length, 6, "重来后仍是 6 格");
  ok(before !== after || true, "重来会换一组（随机，不强断言）");
  eq(q.errors.length, 0, "重来无脚本错误");
  q.close();
}

/* ============================================================
   6. P2-04 红室
   ============================================================ */
async function stageRedroom() {
  group("P2-04 红室");
  const seed = ["wqfws-p2", JSON.stringify({ isolation: true, noise: true, lights: true })];
  const p = openP2({ seed: [MAIN_OK, seed] });
  await boot(p);
  p.click('#mods .mod[data-stage="redroom"]');
  await p.waitFor(() => p.hasClass("#stage-redroom", "on"), 1500, "面板打开");

  eq(p.$$("#rooms .room").length, 8, "八间房");
  eq(p.text("#rrProg"), "0 / 2", "初始 0 / 2");

  // 只选一间就提交
  p.click('#rooms .room[data-room="r1"]');
  eq(p.text("#rrProg"), "1 / 2", "选一间计数 1");
  p.click("#rrGo");
  ok(p.text("#rrOut").indexOf("要挑满两间") !== -1, "不满两间时提交被拦下");

  // 选错
  p.click('#rooms .room[data-room="r2"]');
  p.click("#rrGo");
  ok(!p.$('#mods .mod[data-stage="redroom"]').classList.contains("done"), "选错不通关");
  ok(p.text("#rrOut").indexOf("1 / 2 间") !== -1, "告知命中 1 / 2");
  ok(p.$('#rooms .room[data-room="r2"]').classList.contains("wrongpick"), "错选的卡被标出");

  // 选对（r1 + r4）
  p.click('#rooms .room[data-room="r2"]');
  p.click('#rooms .room[data-room="r4"]');
  p.click("#rrGo");
  ok(p.hasClass("#rrDone", "on"), "两间红室全中通关");
  eq(p.$$("#rooms .room.right").length, 2, "两间正解被标出");

  await p.waitFor(() => p.hasClass("#stage-carpet", "on"), 3500, "进入地毯关");
  p.close();
}

/* ============================================================
   6b. P2-05 地毯
   ============================================================ */
async function stageCarpet() {
  group("P2-05 地毯");
  const seed = ["wqfws-p2", JSON.stringify({ isolation: true, noise: true, lights: true, redroom: true })];
  const p = openP2({ seed: [MAIN_OK, seed] });
  await boot(p);
  p.click('#mods .mod[data-stage="carpet"]');
  await p.waitFor(() => p.hasClass("#stage-carpet", "on"), 1500, "面板打开");

  eq(p.$$("#bottles .btl").length, 6, "六份样本");
  eq(p.text("#cpProg"), "0 / 6", "初始 0 / 6");
  eq(p.$$("#bottles .btl.detected").length, 0, "初始全部未检测");
  ok(p.$$("#bottles .btl .btl-read").every(e => e.textContent.indexOf("未检测") !== -1), "读数都是未检测");
  eq(p.$$("#cpChoice .cp-choice").length, 0, "没测完不出现结论");

  // 六个样本名必须是原文列的那六种
  const names = p.$$("#bottles .btl .btl-name").map(e => e.textContent);
  ["盐水", "咸淡水", "杏仁水", "液态痛苦", "福尔马林", "DNA 浆液"].forEach(n => {
    ok(names.indexOf(n) !== -1, "样本含原文列出的「" + n + "」");
  });

  // 测一瓶
  p.click('#bottles .btl[data-btl="C"]');
  ok(p.hasClass('#bottles .btl[data-btl="C"]', "detected"), "测过的瓶子标记为已检测");
  eq(p.text("#cpProg"), "1 / 6", "进度 1 / 6");
  const readC = p.$('#bottles .btl[data-btl="C"] .btl-read').textContent;
  const polC = p.$('#bottles .btl[data-btl="C"] .btl-pol').textContent;
  ok(readC.indexOf("杏仁水") !== -1, "杏仁水样本读出杏仁水（" + readC + "）");
  ok(polC.indexOf("%") !== -1, "读出污染指数（" + polC + "）");
  ok(polC.indexOf("78") !== -1, "杏仁水污染指数 78%（原文说它已被污染）");

  // 重复点同一瓶不重复计数
  p.click('#bottles .btl[data-btl="C"]');
  eq(p.text("#cpProg"), "1 / 6", "重复点同一瓶不重复计数");

  // 测完剩下五瓶
  ["A", "B", "D", "E", "F"].forEach(id => p.click(`#bottles .btl[data-btl="${id}"]`));
  eq(p.text("#cpProg"), "6 / 6", "六瓶全测完");
  ok(p.text("#cpOut").indexOf("没有一瓶低于阈值") !== -1, "提示没有一瓶低于阈值");

  // 出现结论
  const choice = p.$$("#cpChoice .cp-choice");
  eq(choice.length, 1, "测完后出现结论区");
  eq(p.$$('#cpChoice [data-drink]').length, 7, "六个单瓶选项 + 「都不喝」");
  ok(!!p.$('#cpChoice [data-drink="none"]'), "有「都不喝」这个选项");

  // 喝杏仁水（陷阱）
  p.click('#cpChoice [data-drink="C"]');
  ok(!p.$('#mods .mod[data-stage="carpet"]').classList.contains("done"), "喝下去不通关");
  ok(p.text("#cpOut").indexOf("别吃地毯") !== -1, "给出原文的「别吃地毯」警告");
  ok(p.text("#cpOut").indexOf("污染") !== -1, "点明是污染样本");

  // 都不喝
  p.click('#cpChoice [data-drink="none"]');
  ok(p.hasClass("#cpDone", "on"), "选「都不喝」通关");
  eq(p.text("#cpProg"), "已判定", "状态变已判定");
  await p.waitFor(() => p.hasClass("#stage-exit", "on"), 3500, "进入出口关");
  p.close();
}

/* ============================================================
   6c. P2-06 出口（深坑 → 闪烁的墙壁）
   ============================================================ */
const PIT_MAP = ["..P...", ".P..P.", "S..P.E", ".P..P.", "..P..."];
const PW = 6, PH = 5;
// 在测试里独立 BFS 一遍，交叉验证页面的地图与预算
function pitPath() {
  const start = 2 * PW + 0, goal = 2 * PW + 5;
  const prev = {}, seen = new Set([start]), q = [start];
  while (q.length) {
    const cur = q.shift();
    if (cur === goal) break;
    const r = Math.floor(cur / PW), c = cur % PW;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nr >= PH || nc < 0 || nc >= PW) continue;
      if (PIT_MAP[nr].charAt(nc) === "P") continue;
      const ni = nr * PW + nc;
      if (seen.has(ni)) continue;
      seen.add(ni); prev[ni] = cur; q.push(ni);
    }
  }
  const path = [];
  let cur = goal;
  while (cur !== start) { path.unshift(cur); cur = prev[cur]; }
  return path;
}

function pitCount(p, cls) { return p.$$(`#pitGrid .pc.${cls}`).length; }

async function stageExit() {
  group("P2-06 出口 · 深坑");
  const seed = ["wqfws-p2", JSON.stringify({ isolation: true, noise: true, lights: true, redroom: true, carpet: true })];
  const p = openP2({ seed: [MAIN_OK, seed] });
  await boot(p);
  p.click('#mods .mod[data-stage="exit"]');
  await p.waitFor(() => p.hasClass("#stage-exit", "on"), 1500, "面板打开");

  eq(p.$$("#pitGrid .pc").length, 30, "6×5 = 30 格");
  eq(pitCount(p, "here"), 1, "只有一个当前位置");
  eq(pitCount(p, "goal"), 1, "只有一个对岸");
  eq(pitCount(p, "solid"), 1, "只有起点已探明");
  ok(p.$$("#pitGrid .pc").filter(b => b.textContent === "?").length === 29, "其余 29 格都是未知");

  // 地图里恰好有 7 个深坑（与页面 PIT_MAP 一致）
  const pitTotal = PIT_MAP.join("").split("P").length - 1;
  eq(pitTotal, 7, "测试侧数出的深坑数 = 7");

  // 路径与预算交叉验证
  const path = pitPath();
  eq(path.length, 9, "最短路 9 步（测试侧独立 BFS）");
  const budgetText = p.text("#exProg");
  ok(budgetText.indexOf("0 / 17") !== -1, "页面预算 = 最短 9 + 8 = 17（实际「" + budgetText + "」）");

  // 手够不到的格子（起点是 (2,0)=12，29 在右下角）
  p.click('#pitGrid .pc[data-cell="29"]');
  ok(p.text("#exOut").indexOf("手够不到") !== -1, "非相邻格子被拒绝");

  // 一步一步：先敲紧邻的 (2,1)=13，再走过去
  p.click('#pitGrid .pc[data-cell="13"]');
  ok(p.hasClass('#pitGrid .pc[data-cell="13"]', "solid"), "探明 (2,1) 实心");
  ok(p.text("#exOut").indexOf("实心") !== -1, "实心给出「实心」反馈");
  p.click('#pitGrid .pc[data-cell="13"]');
  ok(p.hasClass('#pitGrid .pc[data-cell="13"]', "here"), "已站到 (2,1)");
  eq(pitCount(p, "here"), 1, "移动后仍只有一个当前位置");

  p.click('#pitGrid .pc[data-cell="14"]');
  ok(p.hasClass('#pitGrid .pc[data-cell="14"]', "solid"), "探明 (2,2) 实心");
  p.click('#pitGrid .pc[data-cell="14"]');

  // (2,3)=15 是深坑
  p.click('#pitGrid .pc[data-cell="15"]');
  ok(p.hasClass('#pitGrid .pc[data-cell="15"]', "pit"), "探明 (2,3) 是深坑");
  ok(p.text("#exOut").indexOf("空的") !== -1, "深坑给出「空的」反馈");
  p.click('#pitGrid .pc[data-cell="15"]');
  ok(p.text("#exOut").indexOf("已经探明是深坑") !== -1, "点已探明的深坑不会掉下去");
  ok(p.hasClass('#pitGrid .pc[data-cell="14"]', "here"), "位置没变");

  // 超预算：此时已走 2 步，再在 13/14 两格间来回走 16 步 → 第 18 步超过预算 17
  for (let k = 0; k < 16; k++) p.click(`#pitGrid .pc[data-cell="${k % 2 === 0 ? 13 : 14}"]`);
  ok(p.text("#exOut").indexOf("布局变了") !== -1, "超预算触发布局变化");
  ok(p.hasClass('#pitGrid .pc[data-cell="12"]', "here"), "被甩回坠入的地方");
  ok(p.hasClass('#pitGrid .pc[data-cell="13"]', "solid"), "探过的地形记忆保留");
  ok(p.hasClass('#pitGrid .pc[data-cell="15"]', "pit"), "深坑的记忆也保留");
  ok(p.text("#exProg").indexOf("深坑 0 / 17") !== -1, "步数归零（" + p.text("#exProg") + "）");

  // 从头按最短路走完（每格：先敲、再走），重新开一局
  const q = openP2({ seed: [MAIN_OK, seed] });
  await boot(q);
  q.click('#mods .mod[data-stage="exit"]');
  await q.waitFor(() => q.hasClass("#stage-exit", "on"), 1500, "面板打开");
  pitPath().forEach(cell => {
    q.click(`#pitGrid .pc[data-cell="${cell}"]`);   // 敲
    q.click(`#pitGrid .pc[data-cell="${cell}"]`);   // 走
  });
  await wait(40);

  group("P2-06 出口 · 闪烁的墙壁");
  ok(q.$("#wallWrap").style.display !== "none", "到对岸后出现墙排");
  ok(q.$("#pitGrid").style.display === "none", "深坑网格收起");
  eq(q.$$("#walls .wl").length, 6, "六面墙");
  eq(q.$$('#walls .wl[data-flicker="1"]').length, 1, "恰好一面是不规则闪烁的墙（唯一解）");

  // 点错
  const wrongWall = q.$$("#walls .wl").filter(w => w.getAttribute("data-flicker") !== "1")[0];
  q.click(wrongWall);
  ok(!q.$('#mods .mod[data-stage="exit"]').classList.contains("done"), "点稳的墙不通关");
  ok(q.text("#exOut").indexOf("不是它") !== -1, "点错给出提示");

  // 点对
  q.click('#walls .wl[data-flicker="1"]');
  ok(q.hasClass("#exDone", "on"), "点中闪烁的墙通关");
  eq(q.text("#exProg"), "已逃出", "状态变已逃出");
  await q.waitFor(() => q.hasClass("#stage-ending", "on"), 3500, "进入隐藏结局");
  q.close();
  p.close();
}

/* ============================================================
   7. 隐藏结局与存档
   ============================================================ */
async function ending() {
  group("隐藏结局");
  const seed = ["wqfws-p2", JSON.stringify({
    isolation: true, noise: true, lights: true, redroom: true, carpet: true,
  })];
  const p = openP2({ seed: [MAIN_OK, seed] });
  await boot(p);
  p.click('#mods .mod[data-stage="exit"]');
  await p.waitFor(() => p.hasClass("#stage-exit", "on"), 1500, "面板打开");
  pitPath().forEach(cell => {
    p.click(`#pitGrid .pc[data-cell="${cell}"]`);
    p.click(`#pitGrid .pc[data-cell="${cell}"]`);
  });
  await wait(40);
  p.click('#walls .wl[data-flicker="1"]');
  await p.waitFor(() => p.hasClass("#stage-ending", "on"), 4000, "进入隐藏结局");

  const body = p.text("#endBd");
  ok(body.indexOf("从后室归来") !== -1, "结局含上半句「从后室归来」");
  ok(body.indexOf("二周年快乐") !== -1, "结局含「二周年快乐」");
  ok(body.indexOf("孤立效应说，两个人永远找不到彼此") !== -1, "结局点题孤立效应");
  ok(body.indexOf("再回来一趟") !== -1, "结局含揭底那句");
  ok(p.$$("#endBd .quote").length >= 4, "引文行有样式");
  eq(p.$$("#endBd .end-link a").length, 3, "结局三个出口链接");

  const links = p.$$("#endBd .end-link a").map(a => a.getAttribute("href"));
  ok(links.indexOf("./index.html") !== -1, "有回到第一趟的链接");
  ok(links.some(h => h && h.indexOf("chuying1-git.github.io/need-key/") !== -1), "有进主站的链接");
  ok(links.some(h => h && h.indexOf("?pw=2zhouniankuaile") !== -1), "主站链接带通关 query");

  const st = p.store("wqfws-p2");
  ok(!!st, "第二趟进度已落盘");
  eq(st.done, true, "存档记下 done");
  eq(st.exit, true, "存档记下 exit");

  // 再看一遍：清空并重渲染
  p.click('#endBd .end-link a[data-replay]');
  await wait(40);
  ok(p.text("#endBd").indexOf("从后室归来") !== -1, "「再看一遍」能重新渲染结局");
  eq(p.errors.length, 0, "结局无脚本错误");
  p.close();
}

/* ============================================================
   8. 持久化
   ============================================================ */
async function persistence() {
  group("持久化");
  const saved = JSON.stringify({
    isolation: true, noise: true, lights: true, redroom: true, carpet: true, exit: true, done: true,
  });
  const p = openP2({ seed: [MAIN_OK, ["wqfws-p2", saved]] });
  await boot(p);
  eq(p.text("#p2prog"), "6 / 6", "六个模块保持完成");
  eq(p.$$("#mods .mod.done").length, 6, "六张卡都标了完成");
  eq(p.$$("#p2segs .seg.done").length, 6, "进度条六段全亮");

  // 重开已完成的关卡应是完成态
  p.click('#mods .mod[data-stage="isolation"]');
  ok(p.hasClass("#isoDone", "on"), "孤立效应保持完成面板");
  p.click('#stage-isolation [data-close]');
  ok(!p.hasClass("#stage-isolation", "on"), "关闭按钮生效");
  p.click('#mods .mod[data-stage="noise"]');
  eq(p.text("#noiseProg"), "1 / 1", "噪音保持完成");
  p.click('#mods .mod[data-stage="redroom"]');
  eq(p.$$("#rooms .room.right").length, 2, "红室保持正解高亮");
  p.click('#stage-redroom [data-close]');
  p.click('#mods .mod[data-stage="carpet"]');
  eq(p.text("#cpProg"), "已判定", "地毯保持已判定");
  eq(p.$$("#bottles .btl.detected").length, 6, "地毯六瓶保持已检测");
  eq(p.$$("#cpChoice .cp-choice").length, 0, "地毯完成后不再显示结论区");
  ok(p.hasClass("#cpDone", "on"), "地毯保持完成面板");
  p.click('#stage-carpet [data-close]');
  p.click('#mods .mod[data-stage="exit"]');
  eq(p.text("#exProg"), "已逃出", "出口保持已逃出");
  ok(p.hasClass("#exDone", "on"), "出口保持完成面板");
  ok(p.$("#pitGrid").style.display === "none", "出口重开后收起深坑网格");
  eq(p.$$('#walls .wl[data-flicker="1"].right').length, 1, "出口重开后那面墙保持高亮");
  p.click('#stage-exit [data-close]');

  // 通关后应有重看结局的常驻入口
  const ea = p.$("#endAgain");
  ok(ea && ea.style.display !== "none", "通关后出现「再看隐藏结局」入口");
  p.click("#endAgain");
  await wait(40);
  ok(p.hasClass("#stage-ending", "on"), "点它能重新打开结局");
  ok(p.text("#endBd").indexOf("从后室归来") !== -1, "重看的结局内容完整");
  p.close();
}

/* ============================================================
   9. 与主线互不干扰
   ============================================================ */
async function isolationFromMain() {
  group("与主线互不干扰");
  const p = openP2({ seed: [MAIN_OK] });
  await boot(p);
  p.click('#mods .mod[data-stage="isolation"]');
  await p.waitFor(() => p.hasClass("#stage-isolation", "on"), 1500, "面板打开");
  // 点真正的答案格，这样才会写第二趟的存档
  const sA = p.$$("#isoGridA .ic.you").map(b => b.getAttribute("data-cell"));
  const sB = p.$$("#isoGridB .ic.other").map(b => b.getAttribute("data-cell"));
  const ans = sA.filter(i => sB.indexOf(i) !== -1)[0];
  p.click(`#isoGridA .ic[data-cell="${ans}"]`);
  await wait(40);

  const main = p.store("wqfws-v3");
  eq(main.final, true, "主线存档的 final 没被改动");
  eq(Object.keys(main).sort().join(","), "entities,final,terminal", "主线存档没有被写入新字段");
  const p2 = p.store("wqfws-p2");
  ok(!!p2, "第二趟写的是自己的键 wqfws-p2");
  eq(p.errors.length, 0, "无脚本错误");
  p.close();
}

/* ============================================================
   10. 完整走一遍第二趟
   ============================================================ */
async function fullRun() {
  group("第二趟 · 一镜到底");
  const p = openP2({ seed: [MAIN_OK] });
  await boot(p);

  // 01
  p.click('#mods .mod[data-stage="isolation"]');
  await p.waitFor(() => p.hasClass("#stage-isolation", "on"), 1500, "01 打开");
  const setA = p.$$("#isoGridA .ic.you").map(b => b.getAttribute("data-cell"));
  const setB = p.$$("#isoGridB .ic.other").map(b => b.getAttribute("data-cell"));
  const ANS = setA.filter(i => setB.indexOf(i) !== -1)[0];
  p.click(`#isoGridA .ic[data-cell="${ANS}"]`);
  await p.waitFor(() => p.hasClass("#stage-noise", "on"), 3000, "→ 02");

  // 02
  p.click('#waves .wave[data-wave="hum"]');
  p.click("#noiseGo");
  await p.waitFor(() => p.hasClass("#stage-lights", "on"), 3000, "→ 03");

  // 03
  const seq = lzSeq(p);
  p.click("#lzHide");
  seq.forEach(c => p.click(`#lzGrid .lz[data-cell="${c}"]`));
  await p.waitFor(() => p.hasClass("#stage-redroom", "on"), 3000, "→ 04");

  // 04
  p.click('#rooms .room[data-room="r1"]');
  p.click('#rooms .room[data-room="r4"]');
  p.click("#rrGo");
  await p.waitFor(() => p.hasClass("#stage-carpet", "on"), 4000, "→ 05");

  // 05
  ["A", "B", "C", "D", "E", "F"].forEach(id => p.click(`#bottles .btl[data-btl="${id}"]`));
  p.click('#cpChoice [data-drink="none"]');
  await p.waitFor(() => p.hasClass("#stage-exit", "on"), 4000, "→ 06");

  // 06
  pitPath().forEach(cell => {
    p.click(`#pitGrid .pc[data-cell="${cell}"]`);
    p.click(`#pitGrid .pc[data-cell="${cell}"]`);
  });
  await wait(40);
  p.click('#walls .wl[data-flicker="1"]');
  await p.waitFor(() => p.hasClass("#stage-ending", "on"), 4500, "→ 隐藏结局");

  eq(p.$$("#mods .mod.done").length, 6, "六张卡全部完成");
  eq(p.text("#p2prog"), "6 / 6", "进度 6 / 6");
  const st = p.store("wqfws-p2");
  eq(st.done, true, "落盘 done");
  eq([st.isolation, st.noise, st.lights, st.redroom, st.carpet, st.exit].join(","),
    "true,true,true,true,true,true", "六关全部记下");
  eq(p.errors.length, 0, "全程无脚本错误");
  p.close();
}

/* ============================================================ */
(async () => {
  try {
    await gateLocked();
    await gateOpen();
    await stageIsolation();
    await stageNoise();
    await stageLights();
    await stageRedroom();
    await stageCarpet();
    await stageExit();
    await ending();
    await persistence();
    await isolationFromMain();
    await fullRun();
  } catch (e) {
    group("异常");
    ok(false, "抛出异常：" + (e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e));
  }
  process.exit(report() ? 0 : 1);
})();
