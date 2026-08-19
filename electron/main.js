const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
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
      webSecurity: false
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
    filters = [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] }];
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
    const gifsPath = isDev 
      ? path.join(__dirname, '../public/gifs')
      : path.join(process.resourcesPath, 'public/gifs');
      
    if (!fs.existsSync(gifsPath)) {
      return [];
    }
    
    const files = fs.readdirSync(gifsPath);
    return files
      .filter(file => file.toLowerCase().endsWith('.gif'))
      .map(file => path.join(gifsPath, file).replace(/\\/g, '/'));
  } catch (err) {
    console.error('Error reading gifs:', err);
    return [];
  }
});

ipcMain.handle('open-gifs-folder', () => {
  const isDev = !app.isPackaged;
  const gifsPath = isDev 
    ? path.join(__dirname, '../public/gifs')
    : path.join(process.resourcesPath, 'public/gifs');
    
  if (fs.existsSync(gifsPath)) {
    shell.openPath(gifsPath);
  } else {
    fs.mkdirSync(gifsPath, { recursive: true });
    shell.openPath(gifsPath);
  }
});

ipcMain.handle('upload-gif', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih File GIF',
    filters: [{ name: 'Images', extensions: ['gif'] }],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const sourcePath = result.filePaths[0];
      const fileName = path.basename(sourcePath);
      
      const isDev = !app.isPackaged;
      const gifsDir = isDev 
        ? path.join(__dirname, '../public/gifs')
        : path.join(process.resourcesPath, 'public/gifs');
        
      if (!fs.existsSync(gifsDir)) {
        fs.mkdirSync(gifsDir, { recursive: true });
      }
      
      const destPath = path.join(gifsDir, fileName);
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
      filterParts.push(`[${layer.centerImageIndex}:v]scale=${imgSize}:${imgSize}:force_original_aspect_ratio=decrease,pad=${imgSize}:${imgSize}:(ow-iw)/2:(oh-ih)/2:color=black@0.0,format=rgba[img_scaled_${specIdx}]`);
      filterParts.push(`[img_scaled_${specIdx}]vignette=PI/2:mode=backward[img_circ_${specIdx}]`);
      filterParts.push(`[${toOverlay}][img_circ_${specIdx}]overlay=(W-w)/2:(H-h)/2[wave_with_img_${specIdx}]`);
      toOverlay = `wave_with_img_${specIdx}`;
    }
    
    filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
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
    
    filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
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
  filterParts.push(`[${inputObj.index}:v]scale=iw*${scale}:ih*${scale}[scaled_${inputObj.index}]`);
  
  const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
  const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
  let overlayFilter = `[${lastOutputLabel}][scaled_${inputObj.index}]overlay=${overlayX}:${overlayY}`;
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

ipcMain.handle('start-render', async (event, options) => {
  isRenderCanceled = false;
  const { videos, audios, outputDir, customName, loopDuration, watermark, allowOverwrite, audioOrderType, compressionLevel = 'medium' } = options;
  
  if (!videos.length || !audios.length || !outputDir) {
    throw new Error('Video, Musik, dan Folder Output wajib diisi!');
  }

  let totalDurationSec = 900; // Default 15 menit
  if (loopDuration === '30m') totalDurationSec = 1800;
  if (loopDuration === '1h') totalDurationSec = 3600;
  if (typeof loopDuration === 'number') totalDurationSec = loopDuration * 60;

  const results = [];
  const tempFiles = []; // Track temp files for cleanup

  // Pre-flight check: pastikan file output belum ada untuk mencegah overwrite tanpa sengaja
  if (!allowOverwrite) {
    for (let i = 0; i < videos.length; i++) {
      const outputFileName = `${customName} ${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);
      if (fs.existsSync(outputPath)) {
        throw new Error(`File '${outputFileName}' sudah ada! Aktifkan "Timpa File (Overwrite)" atau ganti nama output.`);
      }
    }
  }

  isRendering = true;
  try {
    for (let i = 0; i < videos.length; i++) {
      // videos can be string (path) or object { path, layers }
      const videoObj = typeof videos[i] === 'string' ? { path: videos[i], layers: [] } : videos[i];
      const videoPath = videoObj.path;
      const layers = videoObj.layers || [];
      
      // Tentukan urutan lagu (acak atau sesuai urutan custom)
      const randomizedAudios = audioOrderType === 'custom' ? [...audios] : shuffleArray(audios);
      const outputFileName = `${customName} ${i + 1}.mp4`;
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
          
          // Gunakan ping-pong video yang sudah di-preprocess
          command.input(loopVideoPath).inputOptions(['-stream_loop', '-1']);
          if (watermark) command.input(watermark);
          randomizedAudios.forEach(audio => command.input(audio));

          // Gather inputs from layers
          let imageInputs = [];
          let nextInputIndex = watermark ? 2 + randomizedAudios.length : 1 + randomizedAudios.length;
          
          let sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
          sortedLayers.forEach(layer => {
            if (layer.type === 'watermark' || layer.type === 'sticker' || layer.type === 'image') {
              const ext = path.extname(layer.src).toLowerCase();
              const isGif = ext === '.gif';
              if (isGif) {
                command.input(layer.src).inputOptions(['-ignore_loop', '0']);
              } else {
                command.input(layer.src);
              }
              imageInputs.push({ layer, index: nextInputIndex++ });
            } else if (layer.type === 'spectrum' && layer.shape === 'circular' && layer.centerImage) {
              command.input(layer.centerImage);
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

          let filterComplex = filterParts.join(';');

          let outputOpts = [
            `-map [${lastOutputLabel}]`,
            `-map [${finalAudioLabel}]`,
            `-t ${totalDurationSec}`,
            `-c:v ${encoderToUse}`,
            '-pix_fmt yuv420p',
            '-r 30', // Tetapkan framerate ke 30fps untuk akurasi progress bar dan konsistensi
            '-c:a aac',
            '-shortest',
            '-threads 0'  // Gunakan semua CPU cores
          ];

          if (allowOverwrite) outputOpts.push('-y');

          if (encoderToUse === 'libx264') {
            outputOpts.push('-preset', 'ultrafast');
            if (compressionLevel === 'low') outputOpts.push('-crf', '18');
            else if (compressionLevel === 'high') outputOpts.push('-crf', '28');
            else outputOpts.push('-crf', '23');
          } else {
            if (encoderToUse === 'h264_nvenc') outputOpts.push('-preset', 'fast');
            if (compressionLevel === 'low') outputOpts.push('-b:v', '8M');
            else if (compressionLevel === 'high') outputOpts.push('-b:v', '2M');
            else outputOpts.push('-b:v', '4M');
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

  isRendering = true;
  try {
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
          command.input(mediaPath).inputOptions(['-loop', '1']);
        } else {
          command.input(mediaPath);
        }

        // Gather all image/gif inputs
        let imageInputs = [];
        sortedLayers.forEach(layer => {
          if (layer.type === 'watermark' || layer.type === 'sticker' || layer.type === 'image') {
            const ext = path.extname(layer.src).toLowerCase();
            const isGif = ext === '.gif';
            if (isGif) {
              command.input(layer.src).inputOptions(['-ignore_loop', '0']);
            } else {
              command.input(layer.src);
            }
            imageInputs.push({ layer, index: nextInputIndex++ });
          } else if (layer.type === 'spectrum' && layer.shape === 'circular' && layer.centerImage) {
            command.input(layer.centerImage);
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
          `-map [${lastOutputLabel}]`,
          `-c:v ${encoderToUse}`,
          '-pix_fmt yuv420p',
          '-threads 0',
          '-y'
        ];
        
        // Handle audio: map audio from video if present, or add silent audio if needed
        if (finalAudioLabel) {
          outputOpts.push(`-map [${finalAudioLabel}]`);
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
          outputOpts.push('-preset', 'fast');
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
        '-c:a', 'copy',
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
