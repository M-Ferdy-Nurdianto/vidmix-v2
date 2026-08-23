const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');
const { execSync } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);

// Optional: ffprobe for video duration detection
try {
  const ffprobePath = require('@ffprobe-installer/ffprobe').path.replace('app.asar', 'app.asar.unpacked');
  ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
  console.warn('ffprobe not available, some features may be limited:', e.message);
}

let mainWindow;
let activeFFmpegCommand = null;
let isRenderCanceled = false;
let isRendering = false;
const configPath = path.join(app.getPath('userData'), 'vidmix-config.json');

// ─── License System ───────────────────────────────────────────────────────────
let licenseConfig = { GIST_ID: '', GITHUB_USERNAME: '', GIST_FILENAME: 'vidmix-licenses.json' };
try { licenseConfig = require('./license-config.js'); } catch(e) { console.warn('license-config.js not found'); }

const licensePath = path.join(app.getPath('userData'), 'vidmix-license.enc');

const LICENSE_TYPES = {
  '2w': { label: '2 Minggu', days: 14 },
  '1m': { label: '1 Bulan', days: 30 },
  'lifetime': { label: 'Lifetime', days: null },
};

/** Generate a stable hardware-based device ID */
function getDeviceId() {
  const cpus = os.cpus();
  const raw = [
    os.hostname(),
    os.platform(),
    cpus.length > 0 ? cpus[0].model : 'unknown',
    os.arch(),
    os.totalmem().toString(),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/** Encrypt data with AES-256-CBC using deviceId as key */
function encryptLicense(data, deviceId) {
  const key = crypto.createHash('sha256').update(deviceId).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/** Decrypt license data */
function decryptLicense(encStr, deviceId) {
  const [ivHex, encHex] = encStr.split(':');
  if (!ivHex || !encHex) throw new Error('Format file lisensi tidak valid');
  const key = crypto.createHash('sha256').update(deviceId).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

/** Save license to encrypted local file */
function saveLicenseLocal(licenseData) {
  const deviceId = getDeviceId();
  const encrypted = encryptLicense(licenseData, deviceId);
  fs.writeFileSync(licensePath, encrypted, 'utf8');
}

/** Load & validate local license cache */
function loadLicenseLocal() {
  try {
    if (!fs.existsSync(licensePath)) return null;
    const deviceId = getDeviceId();
    const encStr = fs.readFileSync(licensePath, 'utf8');
    const data = decryptLicense(encStr, deviceId);
    // Validate device match
    if (data.deviceId !== deviceId) return { status: 'invalid', reason: 'Device tidak cocok' };
    // Validate expiry
    if (data.expiresAt) {
      const now = new Date();
      const exp = new Date(data.expiresAt);
      if (now > exp) {
        const diffMs = now - exp;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return { status: 'expired', reason: `Lisensi expired ${diffDays} hari yang lalu`, data };
      }
    }
    return { status: 'valid', data };
  } catch (e) {
    return { status: 'invalid', reason: 'File lisensi rusak atau tidak valid: ' + e.message };
  }
}

/** Fetch license DB from GitHub Gist */
function fetchGistDB() {
  return new Promise((resolve, reject) => {
    if (!licenseConfig.GIST_ID || licenseConfig.GIST_ID === 'ISI_GIST_ID_DISINI') {
      return reject(new Error('GIST_ID belum dikonfigurasi di electron/license-config.js'));
    }
    // Use raw Gist URL (no auth needed for reading)
    const url = `https://gist.githubusercontent.com/${licenseConfig.GITHUB_USERNAME}/${licenseConfig.GIST_ID}/raw/${licenseConfig.GIST_FILENAME}`;
    const options = {
      hostname: 'gist.githubusercontent.com',
      path: `/${licenseConfig.GITHUB_USERNAME}/${licenseConfig.GIST_ID}/raw/${licenseConfig.GIST_FILENAME}`,
      method: 'GET',
      headers: { 'User-Agent': 'VidMix/2.0', 'Cache-Control': 'no-cache' },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Server error: ${res.statusCode}`));
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Response tidak valid dari server')); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout: tidak bisa terhubung ke server lisensi')); });
    req.on('error', (e) => reject(new Error('Tidak bisa terhubung ke server: ' + e.message)));
    req.end();
  });
}

/** Activate a license key (online validation + local save) */
async function activateLicense(key) {
  const trimmedKey = key.trim().toUpperCase();
  if (!trimmedKey) throw new Error('License key tidak boleh kosong');

  const db = await fetchGistDB();
  const entry = db.licenses && db.licenses[trimmedKey];
  if (!entry) throw new Error('License key tidak valid atau tidak ditemukan');

  const deviceId = getDeviceId();

  // Key sudah diaktifkan di device lain
  if (entry.deviceId && entry.deviceId !== deviceId) {
    throw new Error('License key ini sudah terdaftar di perangkat lain');
  }

  // Hitung tanggal expired
  const typeCfg = LICENSE_TYPES[entry.type];
  if (!typeCfg) throw new Error('Tipe lisensi tidak dikenali: ' + entry.type);

  let expiresAt = null;
  if (entry.expiresAt) {
    // Sudah pernah diaktifkan di device ini sebelumnya – pakai expired lama
    expiresAt = entry.expiresAt;
  } else if (typeCfg.days !== null) {
    const exp = new Date();
    exp.setDate(exp.getDate() + typeCfg.days);
    expiresAt = exp.toISOString().split('T')[0];
  }

  const licenseData = {
    key: trimmedKey,
    type: entry.type,
    label: typeCfg.label,
    deviceId,
    activatedAt: entry.activatedAt || new Date().toISOString().split('T')[0],
    expiresAt,
  };

  saveLicenseLocal(licenseData);
  return licenseData;
}

/** Compute remaining days */
function getRemainingDays(expiresAt) {
  if (!expiresAt) return null; // lifetime
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { lastVideoDir: '', lastAudioDir: '', lastOutputDir: '' };
}

function saveConfig(newConfig) {
  try {
    const current = loadConfig();
    fs.writeFileSync(configPath, JSON.stringify({ ...current, ...newConfig }));
  } catch (e) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required'
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    autoHideMenuBar: true
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.maximize();

  mainWindow.on('close', (e) => {
    if (isRendering) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Tutup Paksa', 'Batal'],
        defaultId: 1,
        cancelId: 1,
        title: 'Peringatan Render',
        message: 'Proses render masih berjalan!',
        detail: 'Apakah Anda yakin ingin menutup aplikasi? Proses render yang sedang berjalan akan terputus.'
      });
      if (choice === 1) {
        e.preventDefault(); // Batalkan penutupan jendela
      }
    }
  });
}

app.whenReady().then(createWindow);

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('open-folder', (event, folderPath) => {
  if (fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  }
});

ipcMain.handle('select-media-file', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'jpg', 'jpeg', 'png', 'webp'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    let mediaType = 'unknown';
    
    if (['.mp4', '.mov', '.mkv'].includes(ext)) {
      mediaType = 'video';
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      mediaType = 'photo';
    }

    return { path: filePath, mediaType };
  }
  return null;
});

ipcMain.handle('select-output-file', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Video Output',
    defaultPath: 'output.mp4',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('select-output-webm', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Simpan Video Transparan (WebM)',
      defaultPath: 'transparent.webm',
      filters: [
        { name: 'WebM Video (Transparan)', extensions: ['webm'] }
      ]
    });
    return canceled ? null : filePath;
});

ipcMain.handle('select-folder', async (event, type) => {
  const config = loadConfig();
  let defaultPath;
  if (type === 'video-files' && config.lastVideoDir) defaultPath = config.lastVideoDir;
  if (type === 'audio-files' && config.lastAudioDir) defaultPath = config.lastAudioDir;
  if (type === 'output' && config.lastOutputDir) defaultPath = config.lastOutputDir;
  if (type === 'watermark' && config.lastWatermarkDir) defaultPath = config.lastWatermarkDir;

  let properties = ['openDirectory'];
  let filters = [];
  
  if (type === 'video-files') {
    properties = ['openFile', 'multiSelections'];
    filters = [{ name: 'Media', extensions: ['mp4', 'mkv', 'avi', 'mov', 'jpg', 'jpeg', 'png', 'webp', 'bmp'] }];
  } else if (type === 'audio-files') {
    properties = ['openFile', 'multiSelections'];
    filters = [{ name: 'Audios', extensions: ['mp3', 'wav', 'aac', 'm4a'] }];
  } else if (type === 'watermark') {
    properties = ['openFile'];
    filters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }];
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties,
    filters,
    defaultPath
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const isFile = type === 'video-files' || type === 'audio-files' || type === 'watermark';
    const folderPath = isFile ? path.dirname(result.filePaths[0]) : result.filePaths[0];
    
    if (type === 'video-files') saveConfig({ lastVideoDir: folderPath });
    if (type === 'audio-files') saveConfig({ lastAudioDir: folderPath });
    if (type === 'output') saveConfig({ lastOutputDir: folderPath });
    if (type === 'watermark') saveConfig({ lastWatermarkDir: folderPath });
    
    return isFile ? result.filePaths : result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-gifs', async () => {
  try {
    const isDev = !app.isPackaged;
    const defaultGifsPath = isDev 
      ? path.join(__dirname, '../public/gifs')
      : path.join(process.resourcesPath, 'public/gifs');
      
    const userDataGifsPath = path.join(app.getPath('userData'), 'UserGifs');
    if (!fs.existsSync(userDataGifsPath)) {
      fs.mkdirSync(userDataGifsPath, { recursive: true });
    }
    
    let allFiles = [];
    const allowed = ['.gif', '.png', '.mp4', '.mov', '.webm'];
    
    // Load default GIFs if they exist
    if (fs.existsSync(defaultGifsPath)) {
      const files = fs.readdirSync(defaultGifsPath);
      const defaultFiles = files
        .filter(file => allowed.includes(path.extname(file).toLowerCase()))
        .map(file => path.join(defaultGifsPath, file).replace(/\\/g, '/'));
      allFiles = allFiles.concat(defaultFiles);
    }
    
    // Load user-uploaded GIFs
    if (fs.existsSync(userDataGifsPath)) {
      const files = fs.readdirSync(userDataGifsPath);
      const userFiles = files
        .filter(file => allowed.includes(path.extname(file).toLowerCase()))
        .map(file => path.join(userDataGifsPath, file).replace(/\\/g, '/'));
      allFiles = allFiles.concat(userFiles);
    }
    
    return allFiles;
  } catch (err) {
    console.error('Error reading gifs directory:', err);
    return [];
  }
});

ipcMain.handle('open-gifs-folder', () => {
  const userDataGifsPath = path.join(app.getPath('userData'), 'UserGifs');
  if (!fs.existsSync(userDataGifsPath)) {
    fs.mkdirSync(userDataGifsPath, { recursive: true });
  }
  shell.openPath(userDataGifsPath);
});

ipcMain.handle('upload-gif', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih File Media',
    filters: [{ name: 'Media Files', extensions: ['gif', 'png', 'mp4', 'mov', 'webm'] }],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const sourcePath = result.filePaths[0];
      const fileName = path.basename(sourcePath);
      
      const userDataGifsPath = path.join(app.getPath('userData'), 'UserGifs');
      if (!fs.existsSync(userDataGifsPath)) {
        fs.mkdirSync(userDataGifsPath, { recursive: true });
      }
      
      const destPath = path.join(userDataGifsPath, fileName);
      fs.copyFileSync(sourcePath, destPath);
      
      return destPath.replace(/\\/g, '/');
    } catch (error) {
      console.error('Error uploading gif:', error);
      throw new Error('Gagal mengupload GIF: ' + error.message);
    }
  }
  return null;
});

// Fungsi Shuffle Array Fisher-Yates
function shuffleArray(array) {
  let arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function detectBestEncoder() {
  try {
    let output = '';
    try {
      output = execSync('powershell "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
    } catch (cimErr) {
      output = execSync('wmic path win32_VideoController get name', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
    }
    if (output.includes('nvidia')) return 'h264_nvenc';
    if (output.includes('amd') || output.includes('radeon')) return 'h264_amf';
    if (output.includes('intel')) return 'h264_qsv';
  } catch (e) {
    console.error('Deteksi GPU gagal, kembali ke CPU:', e);
  }
  return 'libx264';
}

function getWindowsFont(fontFamily, isBold, isItalic) {
  const basePaths = {
    'Arial': 'arial',
    'Impact': 'impact',
    'Comic Sans MS': 'comic',
    'Trebuchet MS': 'trebuc',
    'Verdana': 'verdana',
    'Tahoma': 'tahoma',
    'Times New Roman': 'times',
    'Courier New': 'cour'
  };
  let base = basePaths[fontFamily] || 'arial';
  let suffix = '';
  
  if (base === 'impact') {
    suffix = '';
  } else if (isBold && isItalic) {
    if (base === 'comic' || base === 'verdana') suffix = 'z';
    else if (base === 'tahoma') suffix = 'bd';
    else suffix = 'bi';
  } else if (isBold) {
    suffix = 'bd';
  } else if (isItalic) {
    if (base === 'trebuc') suffix = 'it';
    else suffix = 'i';
  }
  
  const winDir = process.env.WINDIR || 'C:\\Windows';
  const fontsDir = path.join(winDir, 'Fonts').replace(/\\/g, '/');
  
  const exactPath = `${fontsDir}/${base}${suffix}.ttf`;
  if (fs.existsSync(exactPath)) return exactPath;
  
  const basePath = `${fontsDir}/${base}.ttf`;
  if (fs.existsSync(basePath)) return basePath;
  
  const fallbackPath = `${fontsDir}/arial.ttf`;
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  
  return null;
}

// ========== HELPER: Build spectrum filter chain (reusable for start-render & render-editor) ==========
function buildSpectrumFilter(layer, specIdx, lastOutputLabel, filterParts) {
  const specOutput = `spec_out_${specIdx}`;
  const isRainbow = layer.colorMode === 'rainbow_running' || layer.colorMode === 'rainbow_linear';
  const hexColor = isRainbow ? '0xffffff' : (layer.color && layer.color.startsWith('#') ? '0x' + layer.color.substring(1) : layer.color || '0xffffff');
  const scale = layer.scale || 1;
  const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
  const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;

  if (layer.shape === 'circular') {
    // --- CIRCULAR SPECTRUM ---
    const size = 500;
    // Gunakan showfreqs mode=bar karena tumbuh dari bawah (Y=H) ke atas (Y=0)
    filterParts.push(`[aud_spec_${specIdx}]showfreqs=size=${size}x${size}:mode=bar:fscale=log:colors=${hexColor}[wave_raw_${specIdx}]`);
    filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.01:0.3[wave_trans_${specIdx}]`);
    
    // Polar wrap menggunakan geq
    // R_inner adalah radius dalam (tempat wave dimulai). Jika ada gambar, R_inner = size/4.
    const hasCenterImage = !!layer.centerImageIndex;
    const rInnerExpr = hasCenterImage ? '(H/4)' : '(H/8)';
    
    // Rumus memetakan radius output (r) ke kordinat Y input (coordY)
    // r = R_inner -> coordY = H
    // r = H/2 -> coordY = 0
    // coordY = H * (H/2 - r) / (H/2 - R_inner)
    
    const coordX = `mod((2*W/(2*PI))*(PI+atan2(0.5*H-Y,X-W/2)),W)`;
    const rExpr = `hypot(0.5*H-Y,X-W/2)`;
    const coordY = `H*(H/2-${rExpr})/(H/2-${rInnerExpr})`;
    
    // Mapping sederhana tanpa perhitungan warna pelangi di dalam geq (jauh lebih cepat)
    filterParts.push(`[wave_trans_${specIdx}]geq=r='r(${coordX}, ${coordY})':g='g(${coordX}, ${coordY})':b='b(${coordX}, ${coordY})':a='if(lt(${rExpr},${rInnerExpr}), 0, alpha(${coordX}, ${coordY}))'[wave_circ_${specIdx}]`);
    
    let toOverlay = `wave_circ_${specIdx}`;
    
    // Rainbow coloring menggunakan hue filter (diaplikasikan setelah geq)
    if (isRainbow) {
      if (layer.colorMode === 'rainbow_running') {
        filterParts.push(`[${toOverlay}]hue=H=t*120:s=3[wave_hue_${specIdx}]`);
      } else {
        filterParts.push(`[${toOverlay}]hue=H=90:s=3[wave_hue_${specIdx}]`);
      }
      toOverlay = `wave_hue_${specIdx}`;
    }
    
    // Center image overlay
    if (layer.centerImageIndex) {
      const imgSize = Math.round(size / 2);
      filterParts.push(`[${layer.centerImageIndex}:v]scale=${imgSize}:${imgSize}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${imgSize}:${imgSize}:(ow-iw)/2:(oh-ih)/2:color=black@0.0,format=rgba[img_scaled_${specIdx}]`);
      filterParts.push(`[img_scaled_${specIdx}]vignette=PI/2:mode=backward[img_circ_${specIdx}]`);
      filterParts.push(`[${toOverlay}][img_circ_${specIdx}]overlay=(W-w)/2:(H-h)/2[wave_with_img_${specIdx}]`);
      toOverlay = `wave_with_img_${specIdx}`;
    }
    
    filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}:flags=lanczos[spec_scaled_${specIdx}]`);
    filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
    
  } else {
    // --- LINEAR SPECTRUM (mirip beat folder: elegant bars) ---
    const width = 800;
    const height = 200;
    // mode=p2p = point-to-point wave, lebih halus. rate=25 = sinkron fps
    filterParts.push(`[aud_spec_${specIdx}]showwaves=size=${width}x${height}:mode=p2p:rate=25:colors=${hexColor}:scale=sqrt[wave_raw_${specIdx}]`);
    filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.01:0.3[wave_trans_${specIdx}]`);
    
    let toOverlay = `wave_trans_${specIdx}`;
    
    // Rainbow coloring menggunakan hue filter (SANGAT ringan vs geq)
    if (isRainbow) {
      if (layer.colorMode === 'rainbow_running') {
        filterParts.push(`[${toOverlay}]hue=H=t*60:s=3[wave_hue_${specIdx}]`);
      } else {
        filterParts.push(`[${toOverlay}]hue=H=90:s=3[wave_hue_${specIdx}]`);
      }
      toOverlay = `wave_hue_${specIdx}`;
    }
    
    filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}:flags=lanczos[spec_scaled_${specIdx}]`);
    filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
  }
  
  return specOutput;
}

// ========== HELPER: Build text drawtext filter (reusable) ==========
function buildTextFilter(layer, lastOutputLabel, filterParts) {
  const safeText = (layer.content || '').replace(/[':]/g, '\\$&');
  const fontSize = parseInt(layer.fontSize) || 24;
  // Fix: properly handle hex color for FFmpeg (both # and non-# formats)
  let fontColor = layer.color || 'white';
  if (fontColor.startsWith('#')) {
    fontColor = '0x' + fontColor.substring(1);
  }
  const resolvedFont = getWindowsFont(layer.fontFamily, layer.fontWeight === 'bold', layer.fontStyle === 'italic');
  const fontFile = resolvedFont ? `fontfile='${resolvedFont.replace(/\\/g, '/')}':` : '';
  const textX = `(w*(${layer.x}/100))-text_w/2`;
  const textY = `(h*(${layer.y}/100))-text_h/2`;
  const currentOutput = `t${Math.random().toString(36).substr(2, 5)}`;
  
  filterParts.push(`[${lastOutputLabel}]drawtext=${fontFile}text='${safeText}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${textX}:y=${textY}:shadowcolor=black:shadowx=2:shadowy=2[${currentOutput}]`);
  return currentOutput;
}

// ========== HELPER: Build image/sticker/watermark overlay filter (reusable) ==========
function buildImageOverlayFilter(layer, inputObj, lastOutputLabel, filterParts) {
  const currentOutput = `v${inputObj.index}`;
  const scale = layer.scale || 1;
  const scaledOutput = `scaled_${inputObj.index}`;
  const refOut = `ref_${inputObj.index}`;

  // Menggunakan scale2ref agar kita bisa menghitung ukuran berdasarkan resolusi video utama (reference)
  // Dalam scale2ref, 'iw' merujuk pada lebar video referensi
  filterParts.push(`[${inputObj.index}:v][${lastOutputLabel}]scale2ref=w='iw*0.25*${scale}':h='-1':flags=lanczos[${scaledOutput}][${refOut}]`);
  
  const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
  const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
  let overlayFilter = `[${refOut}][${scaledOutput}]overlay=${overlayX}:${overlayY}`;
  if (path.extname(layer.src).toLowerCase() === '.gif') overlayFilter += `:shortest=1`;
  overlayFilter += `[${currentOutput}]`;
  
  filterParts.push(overlayFilter);
  return currentOutput;
}

// ========== HELPER: Get video duration using ffprobe ==========
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 10);
    });
  });
}

// ========== HELPER: Create ping-pong (forward+reverse) video temp file ==========
function createPingPongVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `vidmix_pingpong_${Date.now()}.mp4`);
    
    let command = ffmpeg();
    command.input(videoPath);
    command.input(videoPath);
    
    // Filter: ambil video asli + versi reverse, concat keduanya
    command.complexFilter([
      '[0:v]setpts=PTS-STARTPTS[forward]',
      '[1:v]reverse,setpts=PTS-STARTPTS[backward]',
      '[forward][backward]concat=n=2:v=1:a=0[outv]'
    ]);
    
    command
      .outputOptions([
        '-map [outv]',
        '-an',  // no audio needed, audio handled separately
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 18',
        '-pix_fmt yuv420p',
        '-y'
      ])
      .save(tempFile)
      .on('end', () => resolve(tempFile))
      .on('error', (err) => reject(err));
  });
}

// ========== HELPER: Clean/prepare media for safe looping ==========
// Removes audio and remuxes container to fix Matroska 'Duplicate element' errors when stream looping
function prepareLoopableMedia(mediaPath) {
  return new Promise((resolve, reject) => {
    if (!mediaPath) return resolve(mediaPath);
    const ext = path.extname(mediaPath).toLowerCase();
    if (!['.webm', '.mp4', '.mov'].includes(ext)) {
      return resolve(mediaPath);
    }
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `vidmix_loop_${Date.now()}${ext}`);
    
    ffmpeg(mediaPath)
      .outputOptions([
        '-c copy',
        '-an',
        '-y'
      ])
      .save(tempFile)
      .on('end', () => resolve(tempFile))
      .on('error', (err) => {
        reject(new Error(`File stiker/watermark "${path.basename(mediaPath)}" rusak atau formatnya tidak didukung. Gagal diproses oleh sistem (Detail: ${err.message}). Cobalah gunakan file lain atau convert ulang file tersebut.`));
      });
  });
}

ipcMain.handle('start-render', async (event, options) => {
  isRenderCanceled = false;
  let { videos, audios, outputDir, customName, loopDuration, watermark, allowOverwrite, audioOrderType, compressionLevel = 'medium' } = options;
  
  if (!videos.length || !audios.length || !outputDir) {
    throw new Error('Video, Musik, dan Folder Output wajib diisi!');
  }

  // Prioritaskan video yang tidak diedit (Fast Render) agar diproses lebih dulu
  videos.sort((a, b) => {
    const isAFast = !(/\.(jpg|jpeg|png|webp|bmp)$/i.test(a.path)) && !watermark && (!a.layers || a.layers.length === 0);
    const isBFast = !(/\.(jpg|jpeg|png|webp|bmp)$/i.test(b.path)) && !watermark && (!b.layers || b.layers.length === 0);
    if (isAFast && !isBFast) return -1;
    if (!isAFast && isBFast) return 1;
    return 0;
  });

  let totalDurationSec = 900; // Default 15 menit
  if (loopDuration === '30m') totalDurationSec = 1800;
  if (loopDuration === '1h') totalDurationSec = 3600;
  if (typeof loopDuration === 'number') totalDurationSec = loopDuration * 60;

  const results = [];
  const tempFiles = []; // Track temp files for cleanup

  // Pre-flight check: pastikan file output belum ada untuk mencegah overwrite tanpa sengaja
  if (!allowOverwrite) {
    for (let i = 0; i < videos.length; i++) {
      const videoObj = typeof videos[i] === 'string' ? { path: videos[i] } : videos[i];
      const originalName = path.parse(videoObj.path).name;
      const finalName = customName ? `${customName} ${i + 1}` : originalName;
      const outputFileName = `${finalName}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);
      if (fs.existsSync(outputPath)) {
        throw new Error(`File '${outputFileName}' sudah ada! Aktifkan "Timpa File (Overwrite)" atau ganti nama output.`);
      }
    }
  }

  isRendering = true;
  try {
    if (watermark) {
      watermark = await prepareLoopableMedia(watermark);
      if (watermark !== options.watermark) tempFiles.push(watermark);
    }

    for (let i = 0; i < videos.length; i++) {
      // videos can be string (path) or object { path, layers }
      const videoObj = typeof videos[i] === 'string' ? { path: videos[i], layers: [] } : videos[i];
      const videoPath = videoObj.path;
      const layers = videoObj.layers || [];
      
      // Prepare layers for safe looping
      for (let layer of layers) {
        if (['watermark', 'sticker', 'image'].includes(layer.type)) {
          const ext = path.extname(layer.src).toLowerCase();
          if (['.webm', '.mp4', '.mov'].includes(ext)) {
            const originalSrc = layer.src;
            layer.src = await prepareLoopableMedia(layer.src);
            if (layer.src !== originalSrc) tempFiles.push(layer.src);
          }
        }
      }
      
      // Tentukan urutan lagu (acak atau sesuai urutan custom)
      const randomizedAudios = audioOrderType === 'custom' ? [...audios] : shuffleArray(audios);
      
      const originalName = path.parse(videoPath).name;
      const finalName = customName ? `${customName} ${i + 1}` : originalName;
      const outputFileName = `${finalName}.mp4`;
      
      const outputPath = path.join(outputDir, outputFileName);

      if (isRenderCanceled) break;

      let loopVideoPath = videoPath;
      if (mainWindow) {
        mainWindow.webContents.send('render-progress', {
          currentVideo: i + 1,
          totalVideos: videos.length,
          percent: 0,
          timemark: '00:00:00'
        });
      }
      let currentEncoder = detectBestEncoder();

      const runFFmpeg = (encoderToUse) => {
        return new Promise((resolve, reject) => {
          let command = ffmpeg();
          activeFFmpegCommand = command;
          
          // Gunakan ping-pong video yang sudah di-preprocess atau foto dengan loop
          const isMainPhoto = /\.(jpg|jpeg|png|webp|bmp)$/i.test(loopVideoPath);
          const isFastRender = !isMainPhoto && !watermark && layers.length === 0;

          if (isMainPhoto) {
            command.input(loopVideoPath).inputOptions(['-loop', '1', '-framerate', '30']);
          } else {
            command.input(loopVideoPath).inputOptions(['-stream_loop', '-1']);
          }
          if (watermark) command.input(watermark);
          randomizedAudios.forEach(audio => command.input(audio));

          // Gather inputs from layers
          let imageInputs = [];
          let nextInputIndex = watermark ? 2 + randomizedAudios.length : 1 + randomizedAudios.length;
          
          let sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
          sortedLayers.forEach(layer => {
            if (layer.type === 'watermark' || layer.type === 'sticker' || layer.type === 'image') {
              const ext = path.extname(layer.src).toLowerCase();
              const isGif = ext === '.gif' || ext === '.mp4' || ext === '.mov' || ext === '.webm';
              if (isGif) {
                command.input(layer.src).inputOptions(['-stream_loop', '-1']);
              } else {
                command.input(layer.src).inputOptions(['-loop', '1', '-framerate', '30']);
              }
              imageInputs.push({ layer, index: nextInputIndex++ });
            } else if (layer.type === 'spectrum' && layer.shape === 'circular' && layer.centerImage) {
              command.input(layer.centerImage).inputOptions(['-loop', '1', '-framerate', '30']);
              layer.centerImageIndex = nextInputIndex++;
            }
          });

          // Mix audio first with normalization of sample rate and channels to prevent concat errors
          const audioStartIndex = watermark ? 2 : 1;
          let filterParts = [];
          
          if (randomizedAudios.length > 0) {
            let resampledLabels = [];
            randomizedAudios.forEach((_, idx) => {
              const inLabel = `[${idx + audioStartIndex}:a]`;
              const outLabel = `[a_resampled_${idx}]`;
              // Format audio menjadi 44100Hz stereo agar concat tidak error jika beda bit rate / sample rate
              filterParts.push(`${inLabel}aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo${outLabel}`);
              resampledLabels.push(outLabel);
            });
            
            const audioInputs = resampledLabels.join('');
            filterParts.push(`${audioInputs}concat=n=${randomizedAudios.length}:v=0:a=1[concat_a]`);
            filterParts.push(`[concat_a]loudnorm,afade=t=in:st=0:d=2,afade=t=out:st=${totalDurationSec - 2}:d=2[outa]`);
          } else {
            // Fallback jika tidak ada audio
            filterParts.push(`anullsrc=r=44100:cl=stereo[outa]`);
          }

          const spectrumLayers = sortedLayers.filter(l => l.type === 'spectrum');
          let finalAudioLabel = 'outa';
          if (spectrumLayers.length > 0) {
            let splits = `[outa_final]`;
            for (let s = 0; s < spectrumLayers.length; s++) {
              splits += `[aud_spec_${s}]`;
            }
            filterParts.push(`[outa]asplit=${spectrumLayers.length + 1}${splits}`);
            finalAudioLabel = 'outa_final';
          }

          let lastOutputLabel = '0:v';
          
          if (!isFastRender) {
            // Untuk foto (PNG/JPEG), konversi format ke yuv420p dulu agar alpha channel di-strip
            // Ini penting karena PNG bisa punya RGBA (4 channel) yang tidak didukung h264 encoder
            if (isMainPhoto) {
              filterParts.push(`[${lastOutputLabel}]format=yuv420p,scale=trunc(iw/2)*2:trunc(ih/2)*2[main_v_even]`);
            } else {
              // Ensure even dimensions for libx264 compatibility
              filterParts.push(`[${lastOutputLabel}]scale=trunc(iw/2)*2:trunc(ih/2)*2[main_v_even]`);
            }
            lastOutputLabel = 'main_v_even';

            // Apply Global Watermark
            if (watermark) {
              filterParts.push(`[1:v]scale=150:-1[wm]`);
              filterParts.push(`[${lastOutputLabel}][wm]overlay=W-w-20:H-h-20[out_wm]`);
              lastOutputLabel = 'out_wm';
            }

            let specIdx = 0;
            // Apply ALL Layers in Z-Index Order (menggunakan helper functions)
            sortedLayers.forEach(layer => {
              if (['watermark', 'sticker', 'image'].includes(layer.type)) {
                const inputObj = imageInputs.find(img => img.layer.id === layer.id);
                if (!inputObj) return;
                lastOutputLabel = buildImageOverlayFilter(layer, inputObj, lastOutputLabel, filterParts);
                
              } else if (layer.type === 'text') {
                lastOutputLabel = buildTextFilter(layer, lastOutputLabel, filterParts);
                
              } else if (layer.type === 'spectrum') {
                lastOutputLabel = buildSpectrumFilter(layer, specIdx, lastOutputLabel, filterParts);
                specIdx++;
              }
            });
          }

          let filterComplex = filterParts.join(';');

          let outputOpts = [
            `-map ${lastOutputLabel.includes(':') ? lastOutputLabel : `[${lastOutputLabel}]`}`,
            `-map ${finalAudioLabel.includes(':') ? finalAudioLabel : `[${finalAudioLabel}]`}`,
            `-t ${totalDurationSec}`
          ];

          if (isFastRender) {
            outputOpts.push('-c:v', 'copy');
          } else {
            outputOpts.push(
              `-c:v ${encoderToUse}`,
              '-pix_fmt yuv420p',
              '-r 30' // Tetapkan framerate ke 30fps
            );
          }

          outputOpts.push(
            '-c:a aac',
            '-shortest',
            '-threads 0'  // Gunakan semua CPU cores
          );

          if (allowOverwrite) outputOpts.push('-y');

          if (!isFastRender) {
            if (encoderToUse === 'libx264') {
              outputOpts.push('-preset', 'ultrafast');
              if (compressionLevel === 'low') outputOpts.push('-crf', '18');
              else if (compressionLevel === 'high') outputOpts.push('-crf', '28');
              else outputOpts.push('-crf', '23');
            } else {
              if (encoderToUse === 'h264_nvenc') outputOpts.push('-preset', 'p4');
              if (compressionLevel === 'low') outputOpts.push('-b:v', '8M');
              else if (compressionLevel === 'high') outputOpts.push('-b:v', '2M');
              else outputOpts.push('-b:v', '4M');
            }
          }

          command
            .complexFilter(filterComplex)
            .outputOptions(outputOpts)
            .on('progress', (progress) => {
              if (mainWindow) {
                let percent = 0;
                // Menggunakan perhitungan berbasis frame (lebih akurat & stabil karena tidak bergantung pada stream audio yang diproses duluan)
                if (progress.frames) {
                  const totalFrames = totalDurationSec * 30;
                  percent = (progress.frames / totalFrames) * 100;
                } else if (progress.timemark) {
                  // Fallback jika frames tidak tersedia
                  const parts = progress.timemark.split(':');
                  if (parts.length >= 3) {
                    const currentSecs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
                    percent = (currentSecs / totalDurationSec) * 100;
                  }
                }

                mainWindow.webContents.send('render-progress', {
                  currentVideo: i + 1,
                  totalVideos: videos.length,
                  percent: Math.min(Math.max(percent, 0), 100),
                  timemark: progress.timemark || ''
                });
              }
            })
            .save(outputPath)
            .on('end', () => {
              activeFFmpegCommand = null;
              results.push(outputPath);
              resolve();
            })
            .on('error', (err, stdout, stderr) => {
              activeFFmpegCommand = null;
              const logPath = path.join(app.getPath('userData'), 'ffmpeg-error.log');
              const logContent = stderr || err.message || '';
              fs.writeFileSync(logPath, logContent);
              console.log("Full FFmpeg error saved to:", logPath);
              if (err.message.includes('SIGKILL') || isRenderCanceled) {
                // Hapus file yang setengah jadi agar tidak corrupt
                if (fs.existsSync(outputPath)) {
                  fs.unlinkSync(outputPath);
                }
                reject(new Error('RENDER_CANCELED'));
              } else {
                const tailLog = logContent.split('\n').slice(-15).join('\n');
                reject(new Error(`FFmpeg error (log: ${logPath})\n\nDetail:\n${tailLog}`));
              }
            });
        });
      };

      try {
        await runFFmpeg(currentEncoder);
      } catch (err) {
        if (currentEncoder !== 'libx264') {
          console.log(`Render GPU (${currentEncoder}) gagal, mencoba ulang secara otomatis dengan CPU (libx264)...`);
          await runFFmpeg('libx264');
        } else {
          throw err; // Jika CPU juga gagal, throw error
        }
      }
    }
  } finally {
    isRendering = false;
    // Cleanup temp ping-pong files
    tempFiles.forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    });
  }

  return results;
});

ipcMain.handle('cancel-render', () => {
  isRenderCanceled = true;
  if (activeFFmpegCommand) {
    activeFFmpegCommand.kill('SIGKILL');
    activeFFmpegCommand = null;
    return true;
  }
  return false;
});

ipcMain.handle('render-editor', async (event, options) => {
  isRenderCanceled = false;
  const { mediaPath, mediaType, layers, outputPath, durationSec = 10 } = options;

  if (!mediaPath || !outputPath) {
    throw new Error('Media input dan output path wajib diisi!');
  }

  const tempFiles = []; // Track temp files for cleanup

  isRendering = true;
  try {
    // Prepare layers for safe looping
    for (let layer of layers) {
      if (['watermark', 'sticker', 'image'].includes(layer.type)) {
        const ext = path.extname(layer.src).toLowerCase();
        if (['.webm', '.mp4', '.mov'].includes(ext)) {
          const originalSrc = layer.src;
          layer.src = await prepareLoopableMedia(layer.src);
          if (layer.src !== originalSrc) tempFiles.push(layer.src);
        }
      }
    }

    let currentEncoder = detectBestEncoder();
    
    const runFFmpegEditor = (encoderToUse) => {
      return new Promise((resolve, reject) => {
        let command = ffmpeg();
        activeFFmpegCommand = command;
        let filterParts = [];
        let sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        let nextInputIndex = 1;
        let lastOutputLabel = '0:v';

        if (mediaType === 'photo') {
          command.input(mediaPath).inputOptions(['-loop', '1', '-framerate', '30']);
        } else {
          command.input(mediaPath);
        }

        let imageInputs = [];
        sortedLayers.forEach(layer => {
          if (layer.type === 'watermark' || layer.type === 'sticker' || layer.type === 'image') {
            const ext = path.extname(layer.src).toLowerCase();
            const isGif = ext === '.gif' || ext === '.mp4' || ext === '.mov' || ext === '.webm';
            if (isGif) {
              command.input(layer.src).inputOptions(['-stream_loop', '-1']);
            } else {
              command.input(layer.src).inputOptions(['-loop', '1', '-framerate', '30']);
            }
            imageInputs.push({ layer, index: nextInputIndex++ });
          } else if (layer.type === 'spectrum' && layer.shape === 'circular' && layer.centerImage) {
            command.input(layer.centerImage).inputOptions(['-loop', '1', '-framerate', '30']);
            layer.centerImageIndex = nextInputIndex++;
          }
        });

        const spectrumLayers = sortedLayers.filter(l => l.type === 'spectrum');
        let finalAudioLabel = mediaType === 'video' ? '0:a' : null;
        
        // If there are spectrums and it's a video with audio, split the audio
        if (spectrumLayers.length > 0 && finalAudioLabel) {
          let splits = `[outa_final]`;
          for (let s = 0; s < spectrumLayers.length; s++) {
            splits += `[aud_spec_${s}]`;
          }
          filterParts.push(`[0:a]asplit=${spectrumLayers.length + 1}${splits}`);
          finalAudioLabel = 'outa_final';
        }

        let specIdx = 0;

        // Untuk foto, konversi format ke yuv420p dan pastikan dimensi genap
        if (mediaType === 'photo') {
          filterParts.push(`[${lastOutputLabel}]format=yuv420p,scale=trunc(iw/2)*2:trunc(ih/2)*2[main_v_even]`);
          lastOutputLabel = 'main_v_even';
        }

        // Build complex filter menggunakan reusable helper functions
        sortedLayers.forEach(layer => {
          if (['watermark', 'sticker', 'image'].includes(layer.type)) {
            const inputObj = imageInputs.find(img => img.layer.id === layer.id);
            if (!inputObj) return;
            lastOutputLabel = buildImageOverlayFilter(layer, inputObj, lastOutputLabel, filterParts);
            
          } else if (layer.type === 'text') {
            // Menggunakan helper yang sudah fix fontcolor dan fontfile
            lastOutputLabel = buildTextFilter(layer, lastOutputLabel, filterParts);
            
          } else if (layer.type === 'spectrum') {
            if (!finalAudioLabel) return;
            // Menggunakan helper yang sudah tanpa geq (lebih cepat)
            lastOutputLabel = buildSpectrumFilter(layer, specIdx, lastOutputLabel, filterParts);
            specIdx++;
          }
        });

        let outputOpts = [
          `-map ${lastOutputLabel.includes(':') ? lastOutputLabel : `[${lastOutputLabel}]`}`,
          `-c:v ${encoderToUse}`,
          '-pix_fmt yuv420p',
          '-threads 0',
          '-y'
        ];
        
        // Handle audio: map audio from video if present, or add silent audio if needed
        if (finalAudioLabel) {
          outputOpts.push(`-map ${finalAudioLabel.includes(':') ? finalAudioLabel : `[${finalAudioLabel}]`}`);
          outputOpts.push('-c:a aac');
        } else if (mediaType === 'video') {
          outputOpts.push('-map 0:a?');
          outputOpts.push('-c:a aac');
        } else {
          // Photo mode: add duration
          outputOpts.push(`-t ${durationSec}`);
        }

        if (encoderToUse === 'libx264') {
          outputOpts.push('-preset', 'ultrafast');
        } else if (encoderToUse === 'h264_nvenc') {
          outputOpts.push('-preset', 'p4');
        }

        if (filterParts.length > 0) {
          command.complexFilter(filterParts.join(';'));
        }

        command
          .outputOptions(outputOpts)
          .on('progress', (progress) => {
            if (mainWindow) {
              let percent = progress.percent || 0;
              // Progress tracking logic
              if ((!percent || percent <= 0) && progress.timemark && mediaType === 'photo') {
                const parts = progress.timemark.split(':');
                if (parts.length >= 3) {
                  const currentSecs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
                  percent = (currentSecs / durationSec) * 100;
                }
              }

              mainWindow.webContents.send('editor-render-progress', {
                percent: Math.min(Math.max(percent, 0), 100),
                timemark: progress.timemark
              });
            }
          })
          .save(outputPath)
          .on('end', () => {
            activeFFmpegCommand = null;
            resolve(outputPath);
          })
          .on('error', (err, stdout, stderr) => {
            activeFFmpegCommand = null;
            const logPath = path.join(app.getPath('userData'), 'ffmpeg-error.log');
            const logContent = stderr || err.message || '';
            fs.writeFileSync(logPath, logContent);
            console.log("Full FFmpeg error saved to:", logPath);
            if (err.message.includes('SIGKILL') || isRenderCanceled) {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              reject(new Error('RENDER_CANCELED'));
            } else {
              const tailLog = logContent.split('\n').slice(-15).join('\n');
              reject(new Error(`FFmpeg error (log: ${logPath})\n\nDetail:\n${tailLog}`));
            }
          });
      });
    };

    try {
      await runFFmpegEditor(currentEncoder);
    } catch (err) {
      if (currentEncoder !== 'libx264') {
        console.log(`Render GPU (${currentEncoder}) gagal, mencoba ulang secara otomatis dengan CPU (libx264)...`);
        await runFFmpegEditor('libx264');
      } else {
        throw err;
      }
    }
    
    if (isRenderCanceled) {
      throw new Error('RENDER_CANCELED');
    }
    return outputPath;
  } finally {
    isRendering = false;
    // Cleanup temp prepared files
    tempFiles.forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    });
  }
});

// Save raw buffer from canvas MediaRecorder to disk
ipcMain.handle('save-buffer-to-file', async (event, { outputPath, buffer }) => {
  const buf = Buffer.from(buffer);
  fs.writeFileSync(outputPath, buf);
  return outputPath;
});

// Dialog to pick output .mov file for canvas capture
ipcMain.handle('select-output-mov', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Spectrum Video',
    defaultPath: `spectrum_${Date.now()}.mp4`,
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }, { name: 'MOV Video Transparan', extensions: ['mov'] }]
  });
  return result.canceled ? null : result.filePath;
});

// Encode PNG frame sequence to transparent MOV (ProRes 4444 with alpha)
ipcMain.handle('encode-frames-to-mov', async (event, { frames, fps, outputPath }) => {
  const tmpDir = path.join(os.tmpdir(), `spectrum_frames_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // Write PNG frames to temp dir
  for (let i = 0; i < frames.length; i++) {
    const buf = Buffer.from(frames[i], 'base64');
    fs.writeFileSync(path.join(tmpDir, `frame_${String(i).padStart(6, '0')}.png`), buf);
    if (mainWindow && i % 10 === 0) {
      mainWindow.webContents.send('spectrum-export-progress', {
        percent: Math.round((i / frames.length) * 40), // 0-40% for writing
        timemark: `Menulis frame ${i + 1}/${frames.length}`
      });
    }
  }

  return new Promise((resolve, reject) => {
    const inputPattern = path.join(tmpDir, 'frame_%06d.png');

    const isMov = outputPath.toLowerCase().endsWith('.mov');
    let outOpts = isMov ? [
      '-c:v', 'prores_ks',
      '-profile:v', '4444',
      '-pix_fmt', 'yuva444p10le',
      '-vendor', 'apl0',
      '-bits_per_mb', '8000',
      '-an'
    ] : [
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-an'
    ];

    ffmpeg()
      .input(inputPattern)
      .inputOptions(['-framerate', String(fps), '-start_number', '0'])
      .outputOptions(outOpts)
      .on('progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('spectrum-export-progress', {
            percent: 40 + Math.min(55, (progress.percent || 0) * 0.55),
            timemark: progress.timemark || 'Mengenkode...'
          });
        }
      })
      .save(outputPath)
      .on('end', () => {
        // Cleanup temp dir
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
        if (mainWindow) {
          mainWindow.webContents.send('spectrum-export-progress', { percent: 99, timemark: 'Selesai' });
        }
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
        reject(err);
      });
  });
});


ipcMain.handle('export-spectrum-gif', async (event, options) => {
  const { audioPath, outputPath, resolution = '1280x720', backgroundColor = 'black', shape = 'linear', colorMode = 'solid', solidColor = '#00FF55', particles = false, alignment = 'left', centerImagePath = '', advanced = {} } = options;
  const { heightScale = 1.0 } = advanced;
  if (!audioPath || !outputPath) throw new Error('Audio and Output path required');

  return new Promise((resolve, reject) => {
    const width = parseInt(resolution.split('x')[0]) || 1280;
    const height = parseInt(resolution.split('x')[1]) || 720;
    const inputs = [audioPath];
    let filterParts = [];
    
    // Apply height scale to audio via volume filter to simulate taller bars in FFmpeg
    const audioInput = heightScale !== 1.0 ? '[audio_scaled]' : '[0:a]';
    if (heightScale !== 1.0) {
      filterParts.push(`[0:a]volume=${heightScale}[audio_scaled]`);
    }
    
    let colors = solidColor.replace('#', '0x'); // default to solid
    if (colorMode === 'rgb_running' || colorMode === 'rgb_beat' || colorMode === 'gradient_cyan_purple') {
      colors = '0xFF0000|0xFF7F00|0xFFFF00|0x00FF00|0x0000FF|0x4B0082|0x9400D3';
    } else if (colorMode === 'fire') {
      colors = '0xFF0000|0xFF4500|0xFF8C00|0xFFD700|0xFFFF00';
    }

    let specLayer = '';
    
    if (shape === 'waveform') {
      filterParts.push(`${audioInput}showwaves=size=${resolution}:mode=p2p:colors=${colors}:rate=25[spec_raw]`);
      specLayer = 'spec_raw';
    } else if (shape === 'dots') {
      filterParts.push(`${audioInput}showfreqs=size=${resolution}:mode=dot:fscale=log:colors=${colors}:ascale=cbrt[spec_raw]`);
      specLayer = 'spec_raw';
    } else if (shape === 'symmetric') {
      const halfHeight = Math.floor(height / 2);
      filterParts.push(`${audioInput}showfreqs=size=${width}x${halfHeight}:mode=bar:fscale=log:colors=${colors}:ascale=cbrt[spec_half]`);
      filterParts.push(`[spec_half]split[sh1][sh2]`);
      filterParts.push(`[sh2]vflip[sh2_flip]`);
      filterParts.push(`[sh1][sh2_flip]vstack[spec_raw]`);
      specLayer = 'spec_raw';
    } else if (shape === 'circular') {
      const size = Math.min(width, height);
      filterParts.push(`${audioInput}showfreqs=size=${size}x${size}:mode=bar:fscale=log:colors=${colors}[wave_raw]`);
      filterParts.push(`[wave_raw]format=rgba,colorkey=black:0.01:0.3[wave_trans]`);
      
      const coordX = `mod((2*W/(2*PI))*(PI+atan2(0.5*H-Y,X-W/2)),W)`;
      const rExpr = `hypot(0.5*H-Y,X-W/2)`;
      const rInnerExpr = '(H/4)'; 
      const coordY = `H*(H/2-${rExpr})/(H/2-${rInnerExpr})`;
      
      filterParts.push(`[wave_trans]geq=r='r(${coordX}, ${coordY})':g='g(${coordX}, ${coordY})':b='b(${coordX}, ${coordY})':a='if(lt(${rExpr},${rInnerExpr}), 0, alpha(${coordX}, ${coordY}))'[wave_circ]`);
      
      let waveFinal = 'wave_circ';
      
      if (centerImagePath) {
        inputs.push(centerImagePath);
        const centerImgIndex = inputs.length - 1;
        const imgSize = Math.floor(size / 2);
        
        filterParts.push(`[${centerImgIndex}:v]scale=${imgSize}:${imgSize}:force_original_aspect_ratio=increase,crop=${imgSize}:${imgSize},format=rgba[img_scaled]`);
        filterParts.push(`[img_scaled]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(hypot(W/2-X, H/2-Y), W/2), 0, 255)'[img_circ]`);
        filterParts.push(`color=c=black@0:s=${size}x${size},format=rgba[wave_canvas]`);
        filterParts.push(`[wave_canvas][img_circ]overlay=(W-w)/2:(H-h)/2[wave_with_img]`);
        filterParts.push(`[wave_with_img][wave_circ]overlay=0:0[wave_combined]`);
        waveFinal = 'wave_combined';
      }
      
      filterParts.push(`[${waveFinal}]pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black@0[spec_raw]`);
      specLayer = 'spec_raw';
    } else {
      filterParts.push(`${audioInput}showfreqs=size=${resolution}:mode=bar:fscale=log:colors=${colors}:ascale=cbrt[spec_raw]`);
      specLayer = 'spec_raw';
    }

    if (alignment === 'center' && shape !== 'waveform' && shape !== 'symmetric' && shape !== 'circular') {
      filterParts.push(`[${specLayer}]split[sl1][sl2]`);
      filterParts.push(`[sl1]crop=w=iw/2:h=ih:x=0:y=0[sl1_crop]`);
      filterParts.push(`[sl2]crop=w=iw/2:h=ih:x=0:y=0,hflip[sl2_crop]`);
      filterParts.push(`[sl2_crop][sl1_crop]hstack[spec_mirrored]`);
      specLayer = 'spec_mirrored';
    } else if (alignment === 'center' && shape === 'circular') {
      // Rotate the circle by 90 degrees to put bass at bottom
      filterParts.push(`[${specLayer}]rotate=PI/2:c=black@0:ow=iw:oh=ih[spec_rotated]`);
      specLayer = 'spec_rotated';
    } else if (alignment === 'right') {
      filterParts.push(`[${specLayer}]hflip[spec_flipped]`);
      specLayer = 'spec_flipped';
    }

    if (colorMode === 'rgb_running' || colorMode === 'rgb_beat') {
      filterParts.push(`[${specLayer}]format=rgba,colorkey=black:0.01:0.3[spec_trans]`);
      // rgb_beat could theoretically be linked to beat, but hue=H=t*... is close enough for FFmpeg without complex scripting
      const speed = colorMode === 'rgb_beat' ? 't*360' : 't*120';
      filterParts.push(`[spec_trans]hue=H=${speed}:s=2[spec_hue]`);
      specLayer = 'spec_hue';
    } else {
      filterParts.push(`[${specLayer}]format=rgba,colorkey=black:0.01:0.3[spec_trans]`);
      specLayer = 'spec_trans';
    }

    filterParts.push(`[${specLayer}]format=rgba[spec_final]`);

    const ffmpegCmd = ffmpeg();
    inputs.forEach(inp => ffmpegCmd.input(inp));

    ffmpegCmd
      .outputOptions([
        '-filter_complex', filterParts.join(';'),
        '-map', '[spec_final]',
        '-t', '10',
        '-c:v', 'qtrle',
        '-pix_fmt', 'argb',
        '-an'
      ])
      .on('progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('spectrum-export-progress', {
            percent: Math.min(Math.max(progress.percent || 0, 0), 99),
            timemark: progress.timemark || ''
          });
        }
      })
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
});

ipcMain.handle('remove-video-bg', async (event, options) => {
  const { videoPath, targetColorHex, tolerance, feather, outputPath } = options;
  const hex = targetColorHex.startsWith('#') ? targetColorHex.substring(1) : targetColorHex;
  const sim = (tolerance / 255).toFixed(2);
  const blend = Math.min(1.0, feather / 10).toFixed(2);
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath);
    const ext = path.extname(outputPath).toLowerCase();
    
    let outputOpts = [];
    if (ext === '.mov') {
      outputOpts = [
        '-c:v', 'prores_ks',
        '-profile:v', '4444',
        '-pix_fmt', 'yuva444p10le',
        '-vendor', 'apl0',
        '-bits_per_mb', '8000'
      ];
    } else if (ext === '.webm') {
      outputOpts = ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0'];
    } else {
      outputOpts = ['-c:v', 'qtrle', '-pix_fmt', 'argb'];
    }
    
    let audioCodec = 'copy';
    if (ext === '.webm') {
      audioCodec = 'libvorbis';
    } else if (ext === '.mov') {
      audioCodec = 'aac';
    } else {
      audioCodec = 'aac';
    }
    
    command
      .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
      })
      .complexFilter([
        `[0:v]colorkey=0x${hex}:${sim}:${blend},format=rgba,scale=trunc(iw/2)*2:trunc(ih/2)*2[out]`
      ])
      .outputOptions([
        '-map', '[out]',
        '-map', '0:a?',
        ...outputOpts,
        '-c:a', audioCodec,
        '-y'
      ])
      .on('progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('remove-video-bg-progress', {
            percent: progress.percent || 0,
            timemark: progress.timemark || ''
          });
        }
      })
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error('Gagal proses video: ' + err.message)));
  });
});

// ─── License IPC Handlers ─────────────────────────────────────────────────────

/** Check current license status (called on app startup) */
ipcMain.handle('license:check', async () => {
  const result = loadLicenseLocal();
  if (!result) {
    return { status: 'not_activated', deviceId: getDeviceId() };
  }
  if (result.status === 'valid') {
    const remaining = getRemainingDays(result.data.expiresAt);
    return { status: 'valid', data: result.data, remainingDays: remaining, deviceId: getDeviceId() };
  }
  return { status: result.status, reason: result.reason, deviceId: getDeviceId(), data: result.data };
});

/** Activate a license key */
ipcMain.handle('license:activate', async (event, key) => {
  try {
    const licenseData = await activateLicense(key);
    const remaining = getRemainingDays(licenseData.expiresAt);
    return { success: true, data: licenseData, remainingDays: remaining };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** Get current license info */
ipcMain.handle('license:info', async () => {
  const result = loadLicenseLocal();
  if (!result || result.status === 'not_activated') return null;
  if (result.status === 'valid') {
    return { ...result.data, remainingDays: getRemainingDays(result.data.expiresAt) };
  }
  return null;
});

/** Get device ID */
ipcMain.handle('license:deviceId', async () => getDeviceId());

// ─── Admin IPC Handlers ────────────────────────────────────────────────────────

async function fetchGistWithToken(token) {
  return new Promise((resolve, reject) => {
    if (!licenseConfig.GIST_ID || licenseConfig.GIST_ID === 'ISI_GIST_ID_DISINI') {
      return reject(new Error('GIST_ID belum dikonfigurasi di electron/license-config.js'));
    }
    const options = {
      hostname: 'api.github.com',
      path: `/gists/${licenseConfig.GIST_ID}`,
      method: 'GET',
      headers: {
        'User-Agent': 'VidMix/2.0',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GitHub API Error: ${res.statusCode}`));
        try { resolve(JSON.parse(raw)); } catch(e) { reject(new Error('Invalid response')); }
      });
    });
    req.on('error', (e) => reject(new Error(e.message)));
    req.end();
  });
}

async function updateGistWithToken(token, db) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      files: {
        [licenseConfig.GIST_FILENAME]: {
          content: JSON.stringify(db, null, 2)
        }
      }
    });
    const options = {
      hostname: 'api.github.com',
      path: `/gists/${licenseConfig.GIST_ID}`,
      method: 'PATCH',
      headers: {
        'User-Agent': 'VidMix/2.0',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GitHub API Error: ${res.statusCode}`));
        resolve(true);
      });
    });
    req.on('error', (e) => reject(new Error(e.message)));
    req.write(data);
    req.end();
  });
}

ipcMain.handle('admin:verifyToken', async (event, token) => {
  try {
    await fetchGistWithToken(token);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('admin:listKeys', async (event, token) => {
  try {
    const gist = await fetchGistWithToken(token);
    const content = gist.files[licenseConfig.GIST_FILENAME]?.content;
    if (!content) throw new Error('File DB tidak ditemukan di Gist');
    const db = JSON.parse(content);
    return { success: true, licenses: db.licenses || {} };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('admin:generateKey', async (event, { token, type, deviceId }) => {
  try {
    const gist = await fetchGistWithToken(token);
    const content = gist.files[licenseConfig.GIST_FILENAME]?.content;
    const db = JSON.parse(content);
    
    const typeCode = type === 'lifetime' ? 'LT' : type.toUpperCase();
    const randomBytes = crypto.randomBytes(6).toString('hex').toUpperCase();
    const seg1 = randomBytes.slice(0, 4);
    const seg2 = randomBytes.slice(4, 8);
    const checksum = crypto.createHash('md5').update(`${typeCode}-${seg1}-${seg2}`).digest('hex').slice(0, 4).toUpperCase();
    const key = `VIDMIX-${typeCode}-${seg1}-${seg2}-${checksum}`;
    
    const issuedAt = new Date().toISOString().split('T')[0];
    let expiresAt = null;
    const typeCfg = LICENSE_TYPES[type];
    if (typeCfg && typeCfg.days !== null) {
      const exp = new Date();
      exp.setDate(exp.getDate() + typeCfg.days);
      expiresAt = exp.toISOString().split('T')[0];
    }
    
    db.licenses[key] = {
      type,
      label: typeCfg?.label || type,
      issuedAt: issuedAt,
      activatedBy: null,
      activatedAt: issuedAt,
      deviceId: deviceId ? deviceId.trim() : null,
      expiresAt: expiresAt
    };
    
    await updateGistWithToken(token, db);
    return { success: true, key };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('admin:revokeKey', async (event, { token, key }) => {
  try {
    const gist = await fetchGistWithToken(token);
    const content = gist.files[licenseConfig.GIST_FILENAME]?.content;
    const db = JSON.parse(content);
    
    if (db.licenses[key]) {
      delete db.licenses[key];
      await updateGistWithToken(token, db);
      return { success: true };
    }
    throw new Error('Key tidak ditemukan');
  } catch (e) {
    return { success: false, error: e.message };
  }
});
