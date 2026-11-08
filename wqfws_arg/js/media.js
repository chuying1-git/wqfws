// ============================================================
//  js/media.js —— 工作台的「媒体取证」模块（纯前端，无依赖，不上传任何文件）
//
//  给玩家一套等同于「xxd + exiftool + Audacity」的自助工具：
//    1) 字节视图       —— 十六进制 + ASCII，带偏移
//    2) PNG 块表       —— IHDR/tEXt/iTXt... 文本块直接解出来
//    3) IEND 之后      —— 文件尾巴里的字节（很多题就藏在这）
//    4) 频谱图         —— WAV 画成频谱（能看见画在里面的字）
//    5) 像素位读取     —— 按通道/偏移/位序抠最低位，支持 32 位大端长度头
//
//  设计原则：工具只提供**能力**，参数（偏移量、通道、长度）要玩家自己给 ——
//  这跟 Audacity / exiftool 一样，不替他做题。
// ============================================================
import { $, showToast } from './ui.js';

// ui.js 没有导出 esc，这里自带一个（别再从 ui.js 里 import 不存在的名字，
// 那会让整个模块加载失败 —— 踩过一次）
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { file: null, buf: null, report: null };

/* ---------------- 字节读取包装（大端/小端都用得上） ---------------- */
class Reader {
  constructor(bytes) {
    this.bytes = bytes;
    this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get length() { return this.bytes.length; }
  readUInt32BE(o) { return this.dv.getUint32(o, false); }
  readUInt32LE(o) { return this.dv.getUint32(o, true); }
  readUInt16LE(o) { return this.dv.getUint16(o, true); }
  readInt16LE(o) { return this.dv.getInt16(o, true); }
  subarray(a, b) { return this.bytes.subarray(a, b); }
  indexOf(v) { return this.bytes.indexOf(v); }
}

/* ---------------- 工具函数 ---------------- */
const hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, '0');
function b64decode(s) {
  try { return decodeURIComponent(escape(atob(s.trim()))); } catch (e) { return null; }
}
function looksB64(s) { return /^[A-Za-z0-9+/]{12,}={0,2}$/.test(s.trim()); }
function utf8(bytes) {
  try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (e) { return ''; }
}

/* ---------------- 字节视图 ---------------- */
function hexDump(buf, limit = 8192) {
  const n = Math.min(buf.length, limit);
  const out = [];
  for (let i = 0; i < n; i += 16) {
    const row = buf.subarray(i, i + 16);
    const hs = [...row].map(b => hex(b)).join(' ').padEnd(47, ' ');
    const as = [...row].map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    out.push(`${i.toString(16).toUpperCase().padStart(6, '0')}  ${hs}  ${as}`);
  }
  if (buf.length > n) out.push(`… 还有 ${buf.length - n} 字节（视图只显示前 ${limit} 字节）`);
  return out.join('\n');
}

/* ---------------- PNG 块 ---------------- */
function parsePNG(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  const chunks = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = String.fromCharCode(...buf.subarray(off + 4, off + 8));
    const dataStart = off + 8;
    chunks.push({ type, len, off, dataStart });
    if (type === 'IEND') break;
    off = dataStart + len + 4;
  }
  const iend = chunks.find(c => c.type === 'IEND');
  const iendEnd = iend ? iend.dataStart + iend.len + 4 : -1;
  return {
    chunks,
    iendEnd,
    tail: iendEnd > 0 && iendEnd < buf.length ? buf.subarray(iendEnd) : null,
  };
}

function pngTextOf(buf, c) {
  const raw = buf.subarray(c.dataStart, c.dataStart + c.len);
  if (c.type === 'tEXt') {
    const z = raw.indexOf(0);
    return { key: utf8(raw.subarray(0, z)), text: utf8(raw.subarray(z + 1)) };
  }
  if (c.type === 'iTXt') {
    const z = raw.indexOf(0);
    const key = utf8(raw.subarray(0, z));
    const comp = raw[z + 1];
    return { key, text: comp ? '(压缩内容，未解)' : utf8(raw.subarray(z + 3)) };
  }
  if (c.type === 'zTXt') {
    const z = raw.indexOf(0);
    return { key: utf8(raw.subarray(0, z)), text: '(zlib 压缩内容)' };
  }
  return null;
}

/* ---------------- WAV + 频谱 ---------------- */
function parseWAV(buf) {
  if (buf.length < 12 || String.fromCharCode(...buf.subarray(0, 4)) !== 'RIFF') return null;
  let p = 12, fmt = null, dataOff = -1, dataLen = 0;
  while (p + 8 <= buf.length) {
    const id = String.fromCharCode(...buf.subarray(p, p + 4));
    const sz = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(p + 10), sampleRate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') { dataOff = p + 8; dataLen = Math.min(sz, buf.length - p - 8); }
    p += 8 + sz + (sz % 2);
  }
  if (!fmt || dataOff < 0) return null;
  const bps = fmt.bits / 8;
  const total = Math.floor(dataLen / bps / fmt.channels);
  const samples = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const o = dataOff + i * bps * fmt.channels;
    samples[i] = fmt.bits === 16 ? buf.readInt16LE(o) / 32768 : (buf[o] - 128) / 128;
  }
  return { fmt, samples, seconds: total / fmt.sampleRate, dataLen };
}

// 迭代 radix-2 FFT（原地）
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const SPEC = { NF: 1024, HOP: 160, TOP: 5000, W: 940, H: 320 };

function drawSpectrogram(canvas, wav) {
  const { NF, HOP, TOP, W, H } = SPEC;
  const sr = wav.fmt.sampleRate;
  const s = wav.samples;
  const frames = Math.max(1, Math.floor((s.length - NF) / HOP) + 1);
  const topBin = Math.min(NF / 2, Math.round(TOP / sr * NF));
  // 每像素列 = 该列覆盖的帧里取最大；每像素行 = 频率
  const colOf = x => Math.min(frames - 1, Math.floor(x / W * frames));
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const peakPerCol = new Float64Array(W);
  const cellMax = new Float64Array(W * H);
  for (let f = 0; f < frames; f++) {
    const start = f * HOP;
    const re = new Float64Array(NF), im = new Float64Array(NF);
    for (let i = 0; i < NF; i++) re[i] = (s[start + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (NF - 1)));
    fft(re, im);
    const x0 = Math.floor(f / frames * W);
    const x1 = Math.max(x0 + 1, Math.floor((f + 1) / frames * W));
    for (let b = 1; b < topBin; b++) {
      const v = Math.hypot(re[b], im[b]);
      const y = H - 1 - Math.round((b / topBin) * (H - 1));
      for (let x = x0; x < x1 && x < W; x++) {
        const idx = y * W + x;
        if (v > cellMax[idx]) cellMax[idx] = v;
        if (v > peakPerCol[x]) peakPerCol[x] = v;
      }
    }
  }
  let peak = 0;
  for (let i = 0; i < cellMax.length; i++) if (cellMax[i] > peak) peak = cellMax[i];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = cellMax[y * W + x] / (peak || 1);
      const g = Math.min(255, Math.round(Math.pow(v, 0.45) * 255));
      const o = (y * W + x) * 4;
      img.data[o] = Math.round(g * 0.28); img.data[o + 1] = g; img.data[o + 2] = Math.round(g * 0.5); img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { frames, topBin, sr, seconds: wav.seconds, peakPerCol };
}

/* ---------------- 像素读取 ---------------- */
async function pixelsOf(file) {
  const bmp = await createImageBitmap(file);
  const cv = document.createElement('canvas');
  cv.width = bmp.width; cv.height = bmp.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bmp, 0, 0);
  return { w: bmp.width, h: bmp.height, d: cx.getImageData(0, 0, bmp.width, bmp.height).data };
}

// 逐位读像素：**每个像素只取 1 位**（默认最低位），不是每个像素取 8 位。
// 8 个像素拼成 1 个字节 —— 这是 LSB 隐写的标准做法，也是档案里那句
// 「必须写脚本逐位读像素」的意思（这一点踩过坑：取 8 位会读出图像本身的噪声）。
async function readLSB(file, o) {
  const { w, h, d } = await pixelsOf(file);
  const ch = { r: 0, g: 1, b: 2, a: 3 }[o.channel] ?? 2;
  const plane = Math.max(0, Math.min(7, o.plane || 0));
  const bits = new Array(w * h);
  for (let i = 0; i < w * h; i++) bits[i] = (d[i * 4 + ch] >> plane) & 1;

  let need = o.count, declared = null;
  if (o.mode === 'length') {
    let v = 0;
    for (let i = 0; i < 32; i++) v = (v << 1) | bits[i];
    declared = v;
    need = o.lengthUnit === 'bytes' ? v * 8 : v;
  }
  const from = Math.max(0, o.offset || 0);
  const payload = bits.slice(from, from + need);
  const bytes = new Uint8Array(Math.floor(payload.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let b = 0;
    for (let k = 0; k < 8; k++) {
      const bit = payload[i * 8 + k];
      b = o.order === 'msb' ? ((b << 1) | bit) : (b | (bit << k));
    }
    bytes[i] = b;
  }
  return { bytes, text: utf8(bytes), declared, width: w, height: h };
}

/* ---------------- 两图差分 ---------------- */
async function renderDiff(root, second) {
  const out = root.querySelector('.diff-out');
  const cv = root.querySelector('.diff-canvas');
  const zoom = root.querySelector('.diff-zoom');
  if (!out || !cv) return;
  out.textContent = '对比中…';
  try {
    const [A, B] = await Promise.all([pixelsOf(state.file), pixelsOf(second)]);
    if (A.w !== B.w || A.h !== B.h) {
      out.textContent = `尺寸不一样（${A.w}×${A.h} vs ${B.w}×${B.h}），没法逐像素相减。`;
      return;
    }
    cv.width = A.w; cv.height = A.h;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(A.w, A.h);
    const perCh = [0, 0, 0];
    let diffPx = 0, maxd = 0;
    let x0 = A.w, y0 = A.h, x1 = -1, y1 = -1;
    for (let y = 0; y < A.h; y++) {
      for (let x = 0; x < A.w; x++) {
        const i = y * A.w + x;
        let any = 0;
        for (let c = 0; c < 3; c++) {
          const dv = Math.abs(A.d[i * 4 + c] - B.d[i * 4 + c]);
          if (dv) { perCh[c]++; any = 1; if (dv > maxd) maxd = dv; }
          img.data[i * 4 + c] = Math.min(255, dv * 8);   // 差值放大 8 倍，肉眼才看得见
        }
        img.data[i * 4 + 3] = 255;
        if (any) {
          diffPx++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    cx.putImageData(img, 0, 0);
    if (!diffPx) {
      out.textContent = '两张图逐像素完全相同 —— 换一对再试。';
      if (zoom) zoom.width = 0;
      return;
    }
    out.textContent = `尺寸 ${A.w}×${A.h} · 有差异的像素 ${diffPx}（R=${perCh[0]} G=${perCh[1]} B=${perCh[2]}）· 最大差值 ${maxd}\n差异范围：x ${x0}..${x1}, y ${y0}..${y1}（共 ${x1 - x0 + 1}×${y1 - y0 + 1}）`;
    // 差异区放大：那块通常很小，不放大根本看不清
    if (zoom) {
      const pad = 2;
      const sx = Math.max(0, x0 - pad), sy = Math.max(0, y0 - pad);
      const sw = Math.min(A.w - sx, x1 - x0 + 1 + pad * 2), sh = Math.min(A.h - sy, y1 - y0 + 1 + pad * 2);
      const z = Math.max(1, Math.min(16, Math.floor(900 / sw)));
      zoom.width = sw * z; zoom.height = sh * z;
      const zx = zoom.getContext('2d');
      zx.imageSmoothingEnabled = false;
      zx.drawImage(cv, sx, sy, sw, sh, 0, 0, sw * z, sh * z);
      out.textContent += `\n（下面那张放大了 ${z} 倍）`;
    }
  } catch (e) {
    out.textContent = '对比失败：' + e.message;
  }
}

/* ---------------- 报告渲染 ---------------- */
function section(title, body, note = '') {
  return `<div class="media-sec">
    <div class="media-sec-head"><span>${esc(title)}</span>${note ? `<span class="media-note">${esc(note)}</span>` : ''}</div>
    <div class="media-sec-body">${body}</div>
  </div>`;
}

function render() {
  const root = $('#media-report');
  if (!root) return;
  const { file, buf } = state;
  if (!file) { root.innerHTML = '<div class="media-empty">还没有载入文件。选一个文件，或直接拖进来。</div>'; return; }

  const kind = parsePNG(buf) ? 'PNG' : (parseWAV(buf) ? 'WAV' : '未知');
  const parts = [];

  parts.push(section('文件', `<div class="mono media-kv">
    <div>名称：${esc(file.name)}</div>
    <div>大小：${buf.length} 字节</div>
    <div>类型：${esc(kind)}${file.type ? ' · ' + esc(file.type) : ''}</div>
    <div>头部：${[...buf.subarray(0, 12)].map(b => hex(b)).join(' ')}</div>
  </div>`));

  // 字节视图
  parts.push(section('字节视图（十六进制 + ASCII）', `<pre class="hexdump">${esc(hexDump(buf))}</pre>`));

  // PNG
  const png = parsePNG(buf);
  if (png) {
    const rows = png.chunks.map((c) => {
      const t = pngTextOf(buf, c);
      let extra = '';
      if (t) {
        const b64 = looksB64(t.text);
        extra = `<div class="png-text"><span class="png-key">${esc(t.key)}</span> = <code>${esc(t.text)}</code>
          ${b64 ? `<button class="mini-btn" data-b64="${esc(t.text)}">解这串 base64</button>` : ''}</div>`;
      }
      return `<tr><td class="mono">${esc(c.type)}</td><td class="mono">${c.len}</td><td class="mono">${c.off}</td><td>${extra}</td></tr>`;
    }).join('');
    parts.push(section('PNG 数据块', `<table class="png-table"><thead><tr><th>类型</th><th>长度</th><th>偏移</th><th>内容</th></tr></thead><tbody>${rows}</tbody></table>`));

    if (png.tail) {
      const txt = utf8(png.tail);
      const b64s = (txt.match(/[A-Za-z0-9+/]{16,}={0,2}/g) || []);
      parts.push(section(`IEND 之后还有 ${png.tail.length} 字节`,
        `<div class="tail-box">
          <div class="media-sub">UTF-8 文本</div>
          <pre class="media-pre">${esc(txt)}</pre>
          <div class="media-sub">十六进制</div>
          <pre class="hexdump">${esc(hexDump(png.tail, 512))}</pre>
          ${b64s.length ? `<div class="media-sub">里面像 base64 的串</div>${b64s.map(s => `<div class="tail-b64"><code>${esc(s)}</code><button class="mini-btn" data-b64="${esc(s)}">解码</button></div>`).join('')}` : ''}
        </div>`, '很多题就藏在这段里'));
    } else {
      parts.push(section('IEND 之后', '<div class="media-empty">没有多余字节。</div>'));
    }

    parts.push(section('像素位读取（LSB）', `
      <div class="lsb-controls">
        <label>通道 <select class="mini-input" id="lsb-ch"><option value="b" selected>蓝 B</option><option value="r">红 R</option><option value="g">绿 G</option><option value="a">透明 A</option></select></label>
        <label>位平面 <select class="mini-input" id="lsb-plane"><option value="0" selected>第 0 位（最低位）</option><option value="1">第 1 位</option><option value="2">第 2 位</option><option value="3">第 3 位</option></select></label>
        <label>位序 <select class="mini-input" id="lsb-order"><option value="msb" selected>字节内高位在前 MSB</option><option value="lsb">低位在前 LSB</option></select></label>
        <label>模式 <select class="mini-input" id="lsb-mode"><option value="length" selected>开头 32 位大端长度头</option><option value="fixed">固定长度</option></select></label>
        <label>起始位 <input class="mini-input" id="lsb-offset" value="0" inputmode="numeric"></label>
        <label>长度 <input class="mini-input" id="lsb-count" value="256" inputmode="numeric"></label>
        <label>长度单位 <select class="mini-input" id="lsb-unit"><option value="bytes" selected>字节</option><option value="bits">位</option></select></label>
        <button class="mini-btn go" id="lsb-go">读取</button>
      </div>
      <pre class="media-pre" id="lsb-out">读法：每个像素只取 1 位（不是取 8 位），8 个像素拼 1 字节。
参数自己给：通道 / 位平面 / 起始位偏移 / 长度头怎么放 —— 工具不替你判断。</pre>`,
      '先看 PNG 注释和音频频谱，它们会告诉你通道与偏移'));

    parts.push(section('两图差分（逐像素相减）', `
      <div class="diff-controls">
        <input type="file" class="mini-input diff-file" accept="image/*" />
        <span class="media-note">再选一张图，和上面这张逐像素相减，差值放大 8 倍显示</span>
      </div>
      <canvas class="diff-canvas"></canvas>
      <canvas class="diff-zoom"></canvas>
      <pre class="media-pre diff-out">（还没对比）很多隐藏信息只改了个别像素，肉眼绝对看不出来。</pre>`,
      '两张图尺寸要一样；差异区会自动放大'));
  }

  // WAV
  const wav = parseWAV(buf);
  if (wav) {
    parts.push(section('频谱图', `
      <div class="spec-wrap">
        <canvas id="spec-canvas" width="${SPEC.W}" height="${SPEC.H}"></canvas>
        <div class="spec-axis mono">纵轴 0–${SPEC.TOP} Hz（上高下低）　横轴 0–${wav.seconds.toFixed(2)} s　<span id="spec-read">鼠标移上去读数</span></div>
      </div>`,
      `${wav.fmt.sampleRate} Hz · ${wav.fmt.channels} 声道 · ${(wav.dataLen / 1024).toFixed(1)} KB`));
  }

  root.innerHTML = parts.join('');

  // 绑定：base64 一键解
  root.querySelectorAll('[data-b64]').forEach((b) => {
    b.addEventListener('click', () => {
      const dec = b64decode(b.getAttribute('data-b64'));
      if (dec === null) return showToast('解码失败', '这不是合法的 base64。', 'error');
      const box = document.createElement('pre');
      box.className = 'media-pre b64-out';
      box.textContent = dec;
      b.parentElement.after(box);
    });
  });

  // 绑定：频谱图
  if (wav) {
    const cv = root.querySelector('#spec-canvas');
    if (cv) {
      const info = drawSpectrogram(cv, wav);
      const read = root.querySelector('#spec-read');
      cv.addEventListener('mousemove', (e) => {
        const r = cv.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        const t = x * info.seconds;
        const f = (1 - y) * SPEC.TOP;
        if (read) read.textContent = `t = ${t.toFixed(3)} s　f ≈ ${f.toFixed(0)} Hz`;
      });
    }
  }

  // 绑定：LSB 读取
  const go = root.querySelector('#lsb-go');
  if (go) {
    go.addEventListener('click', async () => {
      const out = root.querySelector('#lsb-out');
      const opts = {
        channel: root.querySelector('#lsb-ch').value,
        plane: parseInt(root.querySelector('#lsb-plane').value, 10) || 0,
        order: root.querySelector('#lsb-order').value,
        mode: root.querySelector('#lsb-mode').value,
        offset: parseInt(root.querySelector('#lsb-offset').value, 10) || 0,
        count: parseInt(root.querySelector('#lsb-count').value, 10) || 0,
        lengthUnit: root.querySelector('#lsb-unit').value,
      };
      out.textContent = '读取中…';
      try {
        const r = await readLSB(state.file, opts);
        const head = r.declared !== null ? `长度头（第 0..31 位，大端）= ${r.declared} ${opts.lengthUnit === 'bytes' ? '字节' : '位'}\n` : '';
        out.textContent = `${head}从位偏移 ${opts.offset} 读出 ${r.bytes.length} 字节：\n${r.text}\n\n十六进制：\n${[...r.bytes.slice(0, 96)].map(b => hex(b)).join(' ')}`;
      } catch (e) {
        out.textContent = '读取失败：' + e.message;
      }
    });
  }

  // 绑定：两图差分
  const diffIn = root.querySelector('.diff-file');
  if (diffIn) diffIn.addEventListener('change', () => { if (diffIn.files[0]) renderDiff(root, diffIn.files[0]); });
}

/* ---------------- 载入文件 ---------------- */
async function loadFile(f) {
  const bytes = new Uint8Array(await f.arrayBuffer());
  state.file = f;
  state.buf = new Reader(bytes);
  const info = $('#file-info');
  if (info) info.textContent = `${f.name} · ${bytes.length} 字节`;
  render();
}

export function initMedia() {
  const input = $('#file-input');
  const pick = $('#file-pick');
  const zone = $('#drop-zone');
  if (pick && input) pick.addEventListener('click', () => input.click());
  if (input) input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); });
  if (zone) {
    ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });
  }
  render();
  // 自动化/调试用：window.tbLoadFile(file)
  if (typeof window !== 'undefined') window.tbLoadFile = loadFile;
}
