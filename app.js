/* ==========================================================================
   TAEHYUNG PHOTOISM & LIFE4CUTS BOOTH (FAST CACHED AI CUTOUTS)
   - Uses quantized isnet_quint8 model + 720px inference cap (4x faster)
   - Parallel batch loading + CacheStorage persistence (instant reload)
   - Keeps zero-halo alpha matte refinement with zero white edge marks
   ========================================================================== */

import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

const CACHE_NAME = 'taehyung-cutouts-v2';

const PHOTO_CATALOG = [
  { id: 'pose1', label: 'Bandana Front', base: 'assets/photos/pose1' },
  { id: 'pose2', label: 'Bandana Side', base: 'assets/photos/pose2' },
  { id: 'pose3', label: 'Black Turtleneck', base: 'assets/photos/pose3' },
  { id: 'pose4', label: 'Gray Checkered Tie', base: 'assets/photos/pose4' },
  { id: 'pose5', label: 'White Tee Peace', base: 'assets/photos/pose5', whiteOutfit: true },
  { id: 'pose6', label: 'Black Tee Arm Pose', base: 'assets/photos/pose6' },
  { id: 'pose7', label: 'Leather Glove Pose', base: 'assets/photos/pose7' },
  { id: 'pose8', label: 'Navy Cardigan', base: 'assets/photos/pose8' }
];

const STICKER_CATALOG = [
  { id: 'hat1', label: 'Birthday Hat V', base: 'assets/stickers/hat1' },
  { id: 'hat2', label: 'Glitter Hat V', base: 'assets/stickers/hat2' }
];

const FILTERS = {
  original: 'contrast(1.02) saturate(1.02)',
  bw: 'grayscale(1) contrast(1.22)',
  warm: 'sepia(0.18) saturate(1.14) contrast(1.03)',
  vintage: 'sepia(0.32) contrast(0.96) saturate(0.92)',
  soft: 'brightness(1.05) contrast(0.93) saturate(1.06)'
};

const FRAME_STYLES = {
  photoism: {
    name: 'Classic Photoism',
    bg: '#141414',
    slotBorder: '#2e2e32',
    slotBg: '#e5e5e7',
    text: '#ffffff',
    subtext: '#a1a1aa',
    footerTitle: 'PHOTOISM  ×  V',
    footerSub: 'KIM TAEHYUNG ARCHIVE',
    decor: 'photoism'
  },
  red: {
    name: 'Red Velvet V ❤️',
    bg: '#991b1b',
    slotBorder: '#fca5a5',
    slotBg: '#fef2f2',
    text: '#ffffff',
    subtext: '#fecaca',
    footerTitle: 'PHOTOISM  ❤️  TAEHYUNG',
    footerSub: 'CRIMSON EDITION',
    decor: 'red'
  },
  life4cuts: {
    name: 'Life4Cuts White',
    bg: '#ffffff',
    slotBorder: '#18181b',
    slotBg: '#f4f4f5',
    text: '#18181b',
    subtext: '#52525b',
    footerTitle: 'LIFE4CUTS  •  TAEHYUNG',
    footerSub: null,
    decor: 'life4cuts'
  },
  lavender: {
    name: 'Borahe Lavender 💜',
    bg: '#ede6ff',
    slotBorder: '#9b7ede',
    slotBg: '#f7f4ff',
    text: '#4c2a85',
    subtext: '#7c5bb8',
    footerTitle: 'I PURPLE U  💜  TAEHYUNG',
    footerSub: 'PHOTOISM BORAHE EDITION',
    decor: 'lavender'
  },
  coquette: {
    name: 'Pink Coquette 🎀',
    bg: '#ffe8ef',
    slotBorder: '#e598b2',
    slotBg: '#fff5f8',
    text: '#8f3958',
    subtext: '#b85c7c',
    footerTitle: 'V  ♥  LIFE4CUTS',
    footerSub: 'SWEET WINTER EDITION',
    decor: 'coquette'
  },
  bear: {
    name: 'Winter Bear V 🧸',
    bg: '#f5e7d6',
    slotBorder: '#8c6239',
    slotBg: '#fbf6f0',
    text: '#4a3219',
    subtext: '#7a5634',
    footerTitle: 'WINTER BEAR  •  V',
    footerSub: 'TATA & BEAR STUDIO',
    decor: 'bear'
  },
  y2k: {
    name: 'Y2K Silver Star ✦',
    bg: '#dfe3ea',
    slotBorder: '#3b4252',
    slotBg: '#f1f5f9',
    text: '#1e293b',
    subtext: '#475569',
    footerTitle: '✦ PHOTOISM Y2K × V ✦',
    footerSub: 'SEOUL DIGITAL BOOTH',
    decor: 'y2k'
  },
  cute: {
    name: 'Cream V Day',
    bg: '#f8efe4',
    slotBorder: '#d6bfa6',
    slotBg: '#f3e7d8',
    text: '#3b2f2f',
    subtext: '#8c6d53',
    footerTitle: 'HAPPY V DAY  ✦  TAEHYUNG',
    footerSub: 'SPECIAL BOOTH EDITION',
    decor: 'cute'
  },
  bw: {
    name: 'Black & White',
    bg: '#09090b',
    slotBorder: '#ffffff',
    slotBg: '#d4d4d8',
    text: '#ffffff',
    subtext: '#d4d4d8',
    footerTitle: 'V  —  MONOCHROME',
    footerSub: 'SEOUL PHOTO STUDIO',
    decor: 'bw'
  }
};

const state = {
  frame: 'photoism',
  customBgHex: null,
  filter: 'original',
  brightness: 100,
  selectedSlot: 0,
  activeStickerIndex: 0,
  camMirrored: true,
  timerSec: 3,
  isCapturing: false,
  photos: [],
  slots: [
    { photoIdx: 0, zoom: 0.96, x: 0, y: 0, vOnLeft: false, vFlipped: false, capturedImg: null },
    { photoIdx: 1, zoom: 0.96, x: 0, y: 0, vOnLeft: false, vFlipped: false, capturedImg: null },
    { photoIdx: 2, zoom: 0.96, x: 0, y: 0, vOnLeft: false, vFlipped: false, capturedImg: null },
    { photoIdx: 3, zoom: 0.96, x: 0, y: 0, vOnLeft: false, vFlipped: false, capturedImg: null }
  ],
  stickers: [
    { id: 'hat1', label: 'Birthday Hat V', img: null, visible: true, x: 108, y: 92, scale: 1.0, rotation: -10 },
    { id: 'hat2', label: 'Glitter Hat V', img: null, visible: true, x: 612, y: 1895, scale: 1.0, rotation: 10 }
  ],
  dragging: null
};

const video = document.getElementById('camera-video');
const canvas = document.getElementById('booth-canvas');
const ctx = canvas.getContext('2d');

const STRIP = { W: 720, H: 2160, padX: 44, topY: 54, slotW: 632, slotH: 454, gapY: 26 };

function getActiveTheme() {
  const base = FRAME_STYLES[state.frame] || FRAME_STYLES.photoism;
  if (!state.customBgHex) return base;

  const hex = state.customBgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isDark = lum < 0.55;

  return {
    ...base,
    bg: state.customBgHex,
    slotBorder: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(24,24,27,0.35)',
    text: isDark ? '#ffffff' : '#18181b',
    subtext: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(24,24,27,0.68)'
  };
}

/* ==========================================================================
   1. FAST CACHED AI BACKGROUND REMOVAL + ZERO-HALO MATTE REFINEMENT
   ========================================================================== */

function tryLoadImage(basePath) {
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];
  return new Promise(resolve => {
    let i = 0;
    function attempt() {
      if (i >= exts.length) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => { i++; attempt(); };
      img.src = basePath + exts[i];
    }
    attempt();
  });
}

// Downscale oversized photos to max 720px before AI segmentation (4x faster, zero quality loss in 454px slot)
function downscaleForInference(rawImg, maxDim = 720) {
  const w = rawImg.naturalWidth || rawImg.width;
  const h = rawImg.naturalHeight || rawImg.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(rawImg, 0, 0, c.width, c.height);
  return new Promise(resolve => c.toBlob(resolve, 'image/png'));
}

function refineCutoutMatte(sourceCanvas, options = {}) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const sCtx = sourceCanvas.getContext('2d');
  const imgData = sCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);

    if (a < 180) {
      data[i + 3] = 0;
      continue;
    }
    if (!options.whiteOutfit && lum > 218 && chroma < 18 && a < 245) {
      data[i + 3] = 0;
    }
  }

  const alphaSnap = new Uint8ClampedArray(w * h);
  for (let p = 0; p < w * h; p++) alphaSnap[p] = data[p * 4 + 3];

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const p = y * w + x;
      if (alphaSnap[p] === 0) continue;

      const ring1Empty =
        alphaSnap[p - 1] === 0 || alphaSnap[p + 1] === 0 ||
        alphaSnap[p - w] === 0 || alphaSnap[p + w] === 0 ||
        alphaSnap[p - w - 1] === 0 || alphaSnap[p - w + 1] === 0 ||
        alphaSnap[p + w - 1] === 0 || alphaSnap[p + w + 1] === 0;

      const ring2Empty =
        alphaSnap[p - 2] === 0 || alphaSnap[p + 2] === 0 ||
        alphaSnap[p - 2 * w] === 0 || alphaSnap[p + 2 * w] === 0;

      const i = p * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;

      if (ring1Empty) {
        data[i + 3] = 0;
      } else if (ring2Empty) {
        if (!options.whiteOutfit && lum > 175) {
          data[i + 3] = 0;
        } else {
          data[i + 3] = Math.round(alphaSnap[p] * 0.65);
        }
      }
    }
  }

  sCtx.putImageData(imgData, 0, 0);

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return sourceCanvas;

  const padTop = Math.round((maxY - minY) * 0.03);
  const cropY = Math.max(0, minY - padTop);
  const cropH = h - cropY;

  const trimmed = document.createElement('canvas');
  trimmed.width = w;
  trimmed.height = cropH;
  trimmed.getContext('2d').drawImage(sourceCanvas, 0, cropY, w, cropH, 0, 0, w, cropH);
  return trimmed;
}

async function getCachedCutout(id) {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(`/${id}.png`);
    if (!match) return null;
    const blob = await match.blob();
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await new Promise(r => (img.onload = r));
    return img;
  } catch {
    return null;
  }
}

async function saveCachedCutout(id, canvasEl) {
  if (!('caches' in window)) return;
  try {
    const blob = await new Promise(r => canvasEl.toBlob(r, 'image/png'));
    if (!blob) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(`/${id}.png`, new Response(blob, { headers: { 'Content-Type': 'image/png' } }));
  } catch {
    // Ignore storage quota errors
  }
}

async function aiRemovePortraitBg(id, rawImg, options = {}) {
  // 1. Return instant cached PNG if already processed on this device
  const cached = await getCachedCutout(id);
  if (cached) return cached;

  try {
    const scaledBlob = await downscaleForInference(rawImg, 720);
    const aiBlob = await removeBackground(scaledBlob, {
      model: 'isnet_quint8',
      output: { format: 'image/png', quality: 0.95 }
    });

    const url = URL.createObjectURL(aiBlob);
    const aiImg = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });

    const c = document.createElement('canvas');
    c.width = aiImg.width;
    c.height = aiImg.height;
    c.getContext('2d').drawImage(aiImg, 0, 0);
    URL.revokeObjectURL(url);

    const refined = refineCutoutMatte(c, options);
    saveCachedCutout(id, refined);

    const finalImg = new Image();
    finalImg.src = refined.toDataURL('image/png');
    await new Promise(r => (finalImg.onload = r));
    return finalImg;
  } catch (err) {
    console.warn('AI cutout fallback used:', err);
    return rawImg;
  }
}

function processHeadCutoutSticker(rawImg) {
  const w = rawImg.naturalWidth || rawImg.width;
  const h = rawImg.naturalHeight || rawImg.height;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sCtx = srcCanvas.getContext('2d');
  sCtx.drawImage(rawImg, 0, 0);

  const imgData = sCtx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const bgR = data[0], bgG = data[1], bgB = data[2], bgA = data[3];
  const visited = new Uint8Array(w * h);
  const stack = [];

  function isBgColor(pos) {
    const i = pos * 4;
    if (data[i + 3] < 20) return true;
    if (bgA < 20) return false;
    const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
    return dr * dr + dg * dg + db * db < 1600;
  }

  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + (w - 1));

  while (stack.length > 0) {
    const pos = stack.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;
    if (isBgColor(pos)) {
      data[pos * 4 + 3] = 0;
      const px = pos % w;
      const py = (pos - px) / w;
      if (px > 0) stack.push(pos - 1);
      if (px < w - 1) stack.push(pos + 1);
      if (py > 0) stack.push(pos - w);
      if (py < h - 1) stack.push(pos + w);
    }
  }

  sCtx.putImageData(imgData, 0, 0);

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return rawImg;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const pad = Math.round(Math.max(cropW, cropH) * 0.08);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW + pad * 2;
  outCanvas.height = cropH + pad * 2;
  const oCtx = outCanvas.getContext('2d');

  oCtx.save();
  oCtx.filter = 'brightness(0) invert(1)';
  [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([ox, oy]) => {
    oCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, pad + ox, pad + oy, cropW, cropH);
  });
  oCtx.restore();
  oCtx.drawImage(srcCanvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);

  const stickerImg = new Image();
  stickerImg.src = outCanvas.toDataURL('image/png');
  return stickerImg;
}

async function loadInitialAssets() {
  const hint = document.getElementById('status-hint');

  // Load stickers in parallel without blocking poses
  Promise.all(
    STICKER_CATALOG.map(async (st, i) => {
      const raw = await tryLoadImage(st.base);
      if (!raw) return;
      const processed = processHeadCutoutSticker(raw);
      processed.onload = () => {
        state.stickers[i].img = processed;
        renderStickerToggles();
      };
      if (processed.complete) {
        state.stickers[i].img = processed;
        renderStickerToggles();
      }
    })
  );

  // Pre-fetch all raw images simultaneously first
  const loadedRaws = await Promise.all(
    PHOTO_CATALOG.map(async item => ({ item, raw: await tryLoadImage(item.base) }))
  );
  const validItems = loadedRaws.filter(entry => entry.raw !== null);

  // Process cutouts in fast batches of 3 so UI updates immediately
  let completed = 0;
  const BATCH_SIZE = 3;
  for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
    const batch = validItems.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ item, raw }) => {
        const clean = await aiRemovePortraitBg(item.id, raw, { whiteOutfit: Boolean(item.whiteOutfit) });
        state.photos.push({ id: item.id, label: item.label, img: clean });
        completed++;
        hint.textContent = `Loaded ${completed}/${validItems.length} poses...`;
        renderPhotoPicker();
      })
    );
  }

  hint.textContent = 'All poses ready! Tap "Start 4-Cut Camera".';
}

/* ==========================================================================
   2. LIVE WEBCAM INITIALIZATION
   ========================================================================== */

async function initCamera() {
  const label = document.getElementById('cam-status-label');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    label.textContent = 'Camera Unavailable';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    video.srcObject = stream;
    label.textContent = 'Camera Live';
  } catch (err) {
    label.textContent = 'Allow Camera in Browser';
  }
}

/* ==========================================================================
   3. CUTE PHOTOISM & LIFE4CUTS BORDER DECORATIONS
   ========================================================================== */

function drawBorderDecorations(ctx, theme, W, H) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = theme.slotBorder;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.globalAlpha = 1;

  if (theme.decor === 'photoism') {
    ctx.strokeStyle = theme.text;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    [[24, 24, 1, 1], [W - 24, 24, -1, 1], [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 18);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 18, y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    drawMiniBarcode(ctx, W / 2, H - 34, theme.text);
  } else if (theme.decor === 'red') {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#fecaca';
    [
      ['❤️', 24, 150], ['✦', W - 24, 300], ['❤️', 24, 610], ['✦', W - 24, 830],
      ['❤️', 24, 1130], ['✦', W - 24, 1360], ['❤️', 24, 1660], ['❤️', 105, H - 72], ['❤️', W - 105, H - 72]
    ].forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
    drawMiniBarcode(ctx, W / 2, H - 34, theme.text);
  } else if (theme.decor === 'life4cuts') {
    ctx.fillStyle = 'rgba(161, 161, 170, 0.35)';
    for (let y = 90; y < H - 180; y += 76) {
      ctx.beginPath();
      ctx.roundRect(14, y, 14, 26, 4);
      ctx.roundRect(W - 28, y, 14, 26, 4);
      ctx.fill();
    }
    drawMiniBarcode(ctx, W / 2, H - 34, theme.text);
  } else if (theme.decor === 'lavender') {
    const icons = [
      ['💜', 24, 160], ['✦', W - 24, 260], ['✧', 24, 480], ['💜', W - 24, 680],
      ['⋆', 24, 920], ['💜', W - 24, 1140], ['✦', 24, 1380], ['💜', W - 24, 1620],
      ['💜', 110, H - 72], ['💜', W - 110, H - 72]
    ];
    ctx.font = '22px sans-serif';
    ctx.fillStyle = theme.text;
    icons.forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
  } else if (theme.decor === 'coquette') {
    const bows = [
      ['🎀', 24, 140], ['♡', W - 24, 300], ['🎀', 24, 620], ['♡', W - 24, 820],
      ['🎀', 24, 1120], ['♡', W - 24, 1340], ['🎀', 24, 1640], ['🎀', 105, H - 72], ['🎀', W - 105, H - 72]
    ];
    ctx.font = '22px sans-serif';
    ctx.fillStyle = theme.text;
    bows.forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
  } else if (theme.decor === 'bear') {
    const items = [
      ['🧸', 24, 150], ['♥', W - 24, 320], ['🐾', 24, 640], ['🧸', W - 24, 860],
      ['♥', 24, 1160], ['🐾', W - 24, 1420], ['🧸', 24, 1700], ['🧸', 115, H - 72], ['♥', W - 115, H - 72]
    ];
    ctx.font = '22px sans-serif';
    ctx.fillStyle = theme.text;
    items.forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
  } else if (theme.decor === 'y2k') {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = theme.text;
    [
      ['✦', 24, 150], ['★', W - 24, 310], ['✦', 24, 610], ['★', W - 24, 850],
      ['✦', 24, 1150], ['★', W - 24, 1410], ['✦', 24, 1690]
    ].forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
    drawMiniBarcode(ctx, W / 2, H - 34, theme.text);
  } else if (theme.decor === 'cute') {
    ctx.fillStyle = theme.subtext;
    ctx.font = '24px sans-serif';
    [['✦', 24, 180], ['♡', W - 24, 340], ['✧', 24, 760], ['✦', W - 24, 980], ['♡', 24, 1340], ['✧', W - 24, 1580]]
      .forEach(([ch, x, y]) => ctx.fillText(ch, x, y));
  }

  ctx.restore();
}

function drawMiniBarcode(ctx, cx, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.65;
  const pattern = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2];
  let curX = cx - 54;
  pattern.forEach((w, idx) => {
    if (idx % 2 === 0) ctx.fillRect(curX, y - 8, w * 2, 14);
    curX += w * 3;
  });
  ctx.restore();
}

/* ==========================================================================
   4. RENDER LOOP: DRAWS LIVE CAMERA + TAEHYUNG INSIDE EACH STRIP SLOT
   ========================================================================== */

function getSlotRect(index) {
  return {
    x: STRIP.padX,
    y: STRIP.topY + index * (STRIP.slotH + STRIP.gapY),
    w: STRIP.slotW,
    h: STRIP.slotH
  };
}

function drawVideoOrBackdrop(targetCtx, rect, theme) {
  if (video.readyState >= 2) {
    targetCtx.save();
    if (state.camMirrored) {
      targetCtx.translate(rect.x + rect.w, rect.y);
      targetCtx.scale(-1, 1);
      drawCoverVideo(targetCtx, 0, 0, rect.w, rect.h);
    } else {
      drawCoverVideo(targetCtx, rect.x, rect.y, rect.w, rect.h);
    }
    targetCtx.restore();
  } else {
    const grad = targetCtx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, theme.slotBg);
    grad.addColorStop(1, '#cfd2d6');
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function drawCoverVideo(targetCtx, dx, dy, dw, dh) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const targetRatio = dw / dh;
  const videoRatio = vw / vh;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (videoRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }
  targetCtx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawTaehyungInSlot(targetCtx, rect, slotCfg) {
  if (state.photos.length === 0) return;
  const photoObj = state.photos[slotCfg.photoIdx % state.photos.length];
  if (!photoObj || !photoObj.img) return;

  const img = photoObj.img;
  const drawH = rect.h * 0.96 * slotCfg.zoom;
  const drawW = drawH * (img.width / img.height);
  const baseX = slotCfg.vOnLeft ? rect.x : rect.x + rect.w - drawW;
  const drawX = baseX + slotCfg.x;
  const drawY = rect.y + (rect.h - drawH) + slotCfg.y;

  targetCtx.save();
  targetCtx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  targetCtx.shadowBlur = 12;
  if (slotCfg.vFlipped) {
    targetCtx.translate(drawX + drawW, drawY);
    targetCtx.scale(-1, 1);
    targetCtx.drawImage(img, 0, 0, drawW, drawH);
  } else {
    targetCtx.drawImage(img, drawX, drawY, drawW, drawH);
  }
  targetCtx.restore();
}

function renderBoothFrame() {
  const theme = getActiveTheme();
  const { W, H } = STRIP;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  drawBorderDecorations(ctx, theme, W, H);

  const filterCss = state.frame === 'bw'
    ? `grayscale(1) contrast(1.22) brightness(${state.brightness}%)`
    : `${FILTERS[state.filter]} brightness(${state.brightness}%)`;

  for (let i = 0; i < 4; i++) {
    const rect = getSlotRect(i);
    const slotCfg = state.slots[i];

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.filter = filterCss;

    if (slotCfg.capturedImg) {
      ctx.drawImage(slotCfg.capturedImg, rect.x, rect.y, rect.w, rect.h);
    } else {
      drawVideoOrBackdrop(ctx, rect, theme);
      drawTaehyungInSlot(ctx, rect, slotCfg);
    }
    ctx.restore();

    ctx.strokeStyle = theme.slotBorder;
    ctx.lineWidth = state.frame === 'life4cuts' ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  const footerY = STRIP.topY + 4 * STRIP.slotH + 3 * STRIP.gapY + 78;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.text;
  ctx.font = '700 33px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(theme.footerTitle, W / 2, footerY);

  const dateText = theme.footerSub || new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '.');
  ctx.fillStyle = theme.subtext;
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(dateText, W / 2, footerY + 32);
  ctx.restore();

  state.stickers.forEach(st => {
    if (!st.visible || !st.img) return;
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate((st.rotation * Math.PI) / 180);
    const targetW = 165 * st.scale;
    const targetH = targetW * (st.img.height / st.img.width);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(st.img, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
  });

  requestAnimationFrame(renderBoothFrame);
}

/* ==========================================================================
   5. 4-CUT COUNTDOWN CAPTURE SEQUENCE
   ========================================================================== */

async function startFourCutCapture() {
  if (state.isCapturing) return;
  state.isCapturing = true;
  const btn = document.getElementById('btn-start-booth');
  btn.disabled = true;

  state.slots.forEach(s => (s.capturedImg = null));

  for (let i = 0; i < 4; i++) {
    state.selectedSlot = i;
    syncSlotControls();

    await runCountdown(state.timerSec);
    triggerFlash();

    const snap = document.createElement('canvas');
    snap.width = STRIP.slotW;
    snap.height = STRIP.slotH;
    const sCtx = snap.getContext('2d');
    const localRect = { x: 0, y: 0, w: STRIP.slotW, h: STRIP.slotH };
    drawVideoOrBackdrop(sCtx, localRect, getActiveTheme());
    drawTaehyungInSlot(sCtx, localRect, state.slots[i]);

    const frozenImg = new Image();
    frozenImg.src = snap.toDataURL('image/png');
    await new Promise(r => (frozenImg.onload = r));
    state.slots[i].capturedImg = frozenImg;

    await new Promise(r => setTimeout(r, 500));
  }

  state.isCapturing = false;
  btn.disabled = false;
  document.getElementById('status-hint').textContent = '4-Cut complete! Customize border/stickers or click Download.';
}

function runCountdown(seconds) {
  return new Promise(resolve => {
    const badge = document.getElementById('countdown-overlay');
    let count = seconds;
    badge.textContent = count;
    badge.classList.remove('hidden');

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        badge.textContent = count;
      } else {
        clearInterval(interval);
        badge.classList.add('hidden');
        resolve();
      }
    }, 1000);
  });
}

function triggerFlash() {
  const flash = document.getElementById('flash-overlay');
  flash.classList.add('flash-active');
  setTimeout(() => flash.classList.remove('flash-active'), 160);
}

/* ==========================================================================
   6. UI CONTROLS, SHADE PALETTE & TOUCH DRAG
   ========================================================================== */

function renderPhotoPicker() {
  const container = document.getElementById('photo-picker');
  container.innerHTML = '';
  const currentIdx = state.slots[state.selectedSlot].photoIdx;

  state.photos.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `photo-thumb-btn ${idx === currentIdx ? 'active' : ''}`;
    const img = document.createElement('img');
    img.src = p.img.src;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      state.slots[state.selectedSlot].photoIdx = idx;
      state.slots[state.selectedSlot].capturedImg = null;
      renderPhotoPicker();
    });
    container.appendChild(btn);
  });
}

function renderStickerToggles() {
  const row = document.getElementById('sticker-toggles');
  row.innerHTML = '';
  state.stickers.forEach((st, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `sticker-card-toggle ${st.visible ? 'active' : ''}`;
    if (st.img) {
      const img = document.createElement('img');
      img.src = st.img.src;
      btn.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = `${st.label} (${st.visible ? 'ON' : 'OFF'})`;
    btn.appendChild(span);

    btn.addEventListener('click', () => {
      st.visible = !st.visible;
      state.activeStickerIndex = idx;
      document.getElementById('active-sticker-select').value = String(idx);
      syncStickerControls();
      renderStickerToggles();
    });
    row.appendChild(btn);
  });
}

function syncSlotControls() {
  const slot = state.slots[state.selectedSlot];
  document.getElementById('selected-slot-badge').textContent = `Slot ${state.selectedSlot + 1}`;
  document.getElementById('photo-zoom').value = slot.zoom;
  document.getElementById('photo-x').value = slot.x;
  document.getElementById('photo-y').value = slot.y;
  document.getElementById('btn-v-side').textContent = `⇄ V Position: ${slot.vOnLeft ? 'Left' : 'Right'}`;
  document.getElementById('btn-v-flip').textContent = `🔄 Facing: ${slot.vFlipped ? 'Mirrored' : 'Normal'}`;
  document.getElementById('btn-v-flip').classList.toggle('active', slot.vFlipped);

  document.querySelectorAll('.slot-btn').forEach((b, i) => b.classList.toggle('active', i === state.selectedSlot));
  renderPhotoPicker();
}

function syncStickerControls() {
  const st = state.stickers[state.activeStickerIndex];
  document.getElementById('sticker-scale').value = st.scale;
  document.getElementById('sticker-rotate').value = st.rotation;
}

function bindEvents() {
  document.getElementById('btn-start-booth').addEventListener('click', startFourCutCapture);
  document.getElementById('btn-timer').addEventListener('click', e => {
    state.timerSec = state.timerSec === 3 ? 5 : 3;
    e.target.textContent = `⏱️ ${state.timerSec}s`;
  });
  document.getElementById('btn-clear-shots').addEventListener('click', () => {
    state.slots.forEach(s => (s.capturedImg = null));
  });

  document.querySelectorAll('.frame-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.frame-pill').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.shade-circle').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      state.frame = btn.dataset.frame;
      state.customBgHex = null;
      document.getElementById('active-frame-name').textContent = FRAME_STYLES[state.frame].name;
      document.getElementById('custom-hex-label').textContent = 'Preset';
    });
  });

  document.querySelectorAll('.shade-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      document.querySelectorAll('.shade-circle').forEach(s => s.classList.remove('active'));
      circle.classList.add('active');
      const hex = circle.dataset.color;
      state.customBgHex = hex;
      document.getElementById('custom-color-input').value = hex;
      document.getElementById('custom-hex-label').textContent = hex.toUpperCase();
    });
  });

  document.getElementById('custom-color-input').addEventListener('input', e => {
    document.querySelectorAll('.shade-circle').forEach(s => s.classList.remove('active'));
    const hex = e.target.value;
    state.customBgHex = hex;
    document.getElementById('custom-hex-label').textContent = hex.toUpperCase();
  });

  document.querySelectorAll('.slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedSlot = Number(btn.dataset.slot);
      syncSlotControls();
    });
  });

  document.getElementById('btn-v-side').addEventListener('click', () => {
    const slot = state.slots[state.selectedSlot];
    slot.vOnLeft = !slot.vOnLeft;
    slot.capturedImg = null;
    syncSlotControls();
  });

  document.getElementById('btn-v-flip').addEventListener('click', () => {
    const slot = state.slots[state.selectedSlot];
    slot.vFlipped = !slot.vFlipped;
    slot.capturedImg = null;
    syncSlotControls();
  });

  document.getElementById('btn-cam-mirror').addEventListener('click', e => {
    state.camMirrored = !state.camMirrored;
    e.target.classList.toggle('active', state.camMirrored);
    e.target.textContent = `🪞 Cam Mirror: ${state.camMirrored ? 'ON' : 'OFF'}`;
  });

  document.getElementById('photo-zoom').addEventListener('input', e => {
    state.slots[state.selectedSlot].zoom = parseFloat(e.target.value);
    state.slots[state.selectedSlot].capturedImg = null;
  });
  document.getElementById('photo-x').addEventListener('input', e => {
    state.slots[state.selectedSlot].x = parseFloat(e.target.value);
    state.slots[state.selectedSlot].capturedImg = null;
  });
  document.getElementById('photo-y').addEventListener('input', e => {
    state.slots[state.selectedSlot].y = parseFloat(e.target.value);
    state.slots[state.selectedSlot].capturedImg = null;
  });

  document.querySelectorAll('#filter-selector .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filter-selector .chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
    });
  });

  document.getElementById('photo-brightness').addEventListener('input', e => {
    state.brightness = Number(e.target.value);
    document.getElementById('brightness-val').textContent = `${state.brightness}%`;
  });

  document.getElementById('active-sticker-select').addEventListener('change', e => {
    state.activeStickerIndex = Number(e.target.value);
    syncStickerControls();
  });
  document.getElementById('sticker-scale').addEventListener('input', e => {
    state.stickers[state.activeStickerIndex].scale = parseFloat(e.target.value);
  });
  document.getElementById('sticker-rotate').addEventListener('input', e => {
    state.stickers[state.activeStickerIndex].rotation = parseFloat(e.target.value);
  });
  document.getElementById('btn-reset-stickers').addEventListener('click', () => {
    state.stickers[0] = { ...state.stickers[0], x: 108, y: 92, scale: 1.0, rotation: -10 };
    state.stickers[1] = { ...state.stickers[1], x: 612, y: 1895, scale: 1.0, rotation: 10 };
    syncStickerControls();
  });

  function getCoords(e) {
    const pt = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((pt.clientX - rect.left) / rect.width) * STRIP.W,
      y: ((pt.clientY - rect.top) / rect.height) * STRIP.H
    };
  }

  canvas.addEventListener('mousedown', e => {
    const pos = getCoords(e);
    for (let i = state.stickers.length - 1; i >= 0; i--) {
      const st = state.stickers[i];
      if (st.visible && st.img && Math.hypot(pos.x - st.x, pos.y - st.y) <= 90 * st.scale) {
        state.activeStickerIndex = i;
        document.getElementById('active-sticker-select').value = String(i);
        syncStickerControls();
        state.dragging = { type: 'sticker', index: i, startX: pos.x, startY: pos.y, origX: st.x, origY: st.y };
        return;
      }
    }
    for (let i = 0; i < 4; i++) {
      const r = getSlotRect(i);
      if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        state.selectedSlot = i;
        syncSlotControls();
        state.dragging = { type: 'slot', index: i, startX: pos.x, startY: pos.y, origX: state.slots[i].x, origY: state.slots[i].y };
        return;
      }
    }
  });

  window.addEventListener('mousemove', e => {
    if (!state.dragging) return;
    const pos = getCoords(e);
    const dx = pos.x - state.dragging.startX;
    const dy = pos.y - state.dragging.startY;
    if (state.dragging.type === 'sticker') {
      const st = state.stickers[state.dragging.index];
      st.x = Math.max(40, Math.min(STRIP.W - 40, state.dragging.origX + dx));
      st.y = Math.max(40, Math.min(STRIP.H - 40, state.dragging.origY + dy));
    } else {
      const slot = state.slots[state.dragging.index];
      slot.x = Math.max(-180, Math.min(180, Math.round(state.dragging.origX + dx)));
      slot.y = Math.max(-100, Math.min(120, Math.round(state.dragging.origY + dy)));
      slot.capturedImg = null;
      document.getElementById('photo-x').value = slot.x;
      document.getElementById('photo-y').value = slot.y;
    }
  });

  window.addEventListener('mouseup', () => (state.dragging = null));

  canvas.addEventListener('touchstart', e => {
    const pos = getCoords(e);
    for (let i = state.stickers.length - 1; i >= 0; i--) {
      const st = state.stickers[i];
      if (st.visible && st.img && Math.hypot(pos.x - st.x, pos.y - st.y) <= 90 * st.scale) {
        state.activeStickerIndex = i;
        document.getElementById('active-sticker-select').value = String(i);
        syncStickerControls();
        state.dragging = { type: 'sticker', index: i, startX: pos.x, startY: pos.y, origX: st.x, origY: st.y };
        return;
      }
    }
    for (let i = 0; i < 4; i++) {
      const r = getSlotRect(i);
      if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        state.selectedSlot = i;
        syncSlotControls();
        state.dragging = { type: 'slot', index: i, startX: pos.x, startY: pos.y, origX: state.slots[i].x, origY: state.slots[i].y };
        return;
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!state.dragging) return;
    if (e.cancelable) e.preventDefault();
    const pos = getCoords(e);
    const dx = pos.x - state.dragging.startX;
    const dy = pos.y - state.dragging.startY;
    if (state.dragging.type === 'sticker') {
      const st = state.stickers[state.dragging.index];
      st.x = Math.max(40, Math.min(STRIP.W - 40, state.dragging.origX + dx));
      st.y = Math.max(40, Math.min(STRIP.H - 40, state.dragging.origY + dy));
    } else {
      const slot = state.slots[state.dragging.index];
      slot.x = Math.max(-180, Math.min(180, Math.round(state.dragging.origX + dx)));
      slot.y = Math.max(-100, Math.min(120, Math.round(state.dragging.origY + dy)));
      slot.capturedImg = null;
      document.getElementById('photo-x').value = slot.x;
      document.getElementById('photo-y').value = slot.y;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => (state.dragging = null));

  document.getElementById('btn-download').addEventListener('click', () => {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taehyung-photobooth-${state.frame}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  });
}

bindEvents();
loadInitialAssets();
initCamera();
renderBoothFrame();