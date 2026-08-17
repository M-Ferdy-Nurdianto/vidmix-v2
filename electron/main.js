const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');
const { execSync } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);

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
    const output = execSync('wmic path win32_VideoController get name', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
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
  
  const fs = require('fs');
  const pathToCheck = `C:/Windows/Fonts/${base}${suffix}.ttf`;
  if (fs.existsSync(pathToCheck)) return pathToCheck;
  return `C:/Windows/Fonts/${base}.ttf`;
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

      let currentEncoder = detectBestEncoder();

      const runFFmpeg = (encoderToUse) => {
        return new Promise((resolve, reject) => {
          let command = ffmpeg();
          activeFFmpegCommand = command;
          
          command.input(videoPath).inputOptions(['-stream_loop', '-1']);
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
          // Apply ALL Layers in Z-Index Order
          sortedLayers.forEach(layer => {
            if (['watermark', 'sticker', 'image'].includes(layer.type)) {
              const inputObj = imageInputs.find(img => img.layer.id === layer.id);
              if (!inputObj) return;
              
              const currentOutput = `v${inputObj.index}`;
              const scale = layer.scale || 1;
              filterParts.push(`[${inputObj.index}:v]scale=iw*${scale}:ih*${scale}[scaled_${inputObj.index}]`);
              
              const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
              const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
              let overlayFilter = `[${lastOutputLabel}][scaled_${inputObj.index}]overlay=${overlayX}:${overlayY}`;
              if (path.extname(layer.src).toLowerCase() === '.gif') overlayFilter += `:shortest=1`;
              overlayFilter += `[${currentOutput}]`;
              
              filterParts.push(overlayFilter);
              lastOutputLabel = currentOutput;
              
            } else if (layer.type === 'text') {
              const safeText = (layer.content || '').replace(/[':]/g, '\\$&');
              const fontSize = parseInt(layer.fontSize) || 24;
              const fontColor = (layer.color || 'white').replace('#', '0x');
              const resolvedFont = getWindowsFont(layer.fontFamily, layer.fontWeight === 'bold', layer.fontStyle === 'italic');
              const fontFile = resolvedFont ? `fontfile='${resolvedFont.replace(/\\/g, '/')}':` : '';
              const textX = `(w*(${layer.x}/100))-text_w/2`;
              const textY = `(h*(${layer.y}/100))-text_h/2`;
              const currentOutput = `t${Math.random().toString(36).substr(2, 5)}`;
              
              filterParts.push(`[${lastOutputLabel}]drawtext=${fontFile}text='${safeText}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${textX}:y=${textY}[${currentOutput}]`);
              lastOutputLabel = currentOutput;
              
            } else if (layer.type === 'spectrum') {
              const specOutput = `spec_out_${specIdx}`;
              
              // If it's rainbow mode, we generate the wave in white first, then color it with geq
              const isRainbow = layer.colorMode === 'rainbow_running' || layer.colorMode === 'rainbow_linear';
              const hexColor = isRainbow ? '0xffffff' : (layer.color && layer.color.startsWith('#') ? '0x' + layer.color.substring(1) : layer.color || 'white');
              
              if (layer.shape === 'circular') {
                const size = 600;
                filterParts.push(`[aud_spec_${specIdx}]showwaves=size=${size}x${size}:mode=cline:colors=${hexColor}[wave_raw_${specIdx}]`);
                filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.1:0.1[wave_trans_${specIdx}]`);
                
                const coordX = `mod((2*W/(2*PI))*(PI+atan2(0.5*H-Y,X-W/2)),W)`;
                const coordY = `H-2*hypot(0.5*H-Y,X-W/2)`;
                
                if (isRainbow) {
                  const phaseR = `0`;
                  const phaseG = `(2*PI/3)`;
                  const phaseB = `(4*PI/3)`;
                  const angle = `(PI+atan2(0.5*H-Y,X-W/2))`; // 0 to 2PI
                  
                  // Add time variable T to make it "run" if running mode
                  const timeOffset = layer.colorMode === 'rainbow_running' ? '-T*3' : '';
                  
                  const rExpr = `sin(${angle}+${phaseR}${timeOffset})*127+128`;
                  const gExpr = `sin(${angle}+${phaseG}${timeOffset})*127+128`;
                  const bExpr = `sin(${angle}+${phaseB}${timeOffset})*127+128`;
                  
                  filterParts.push(`[wave_trans_${specIdx}]geq=r='if(alpha(${coordX},${coordY}), ${rExpr}, 0)':g='if(alpha(${coordX},${coordY}), ${gExpr}, 0)':b='if(alpha(${coordX},${coordY}), ${bExpr}, 0)':a='alpha(${coordX}, ${coordY})'[wave_circ_${specIdx}]`);
                } else {
                  filterParts.push(`[wave_trans_${specIdx}]geq=r='r(${coordX}, ${coordY})':g='g(${coordX}, ${coordY})':b='b(${coordX}, ${coordY})':a='alpha(${coordX}, ${coordY})'[wave_circ_${specIdx}]`);
                }
                
                let toOverlay = `wave_circ_${specIdx}`;
                if (layer.centerImageIndex) {
                  const imgSize = size / 2;
                  filterParts.push(`[${layer.centerImageIndex}:v]scale=${imgSize}:${imgSize}[img_scaled_${specIdx}]`);
                  filterParts.push(`[img_scaled_${specIdx}]format=rgba,geq=r='r(X,Y)':a='if(lt(hypot(X-W/2,Y-H/2),W/2),255,0)'[img_circ_${specIdx}]`);
                  filterParts.push(`[wave_circ_${specIdx}][img_circ_${specIdx}]overlay=(W-w)/2:(H-h)/2[wave_with_img_${specIdx}]`);
                  toOverlay = `wave_with_img_${specIdx}`;
                }
                
                const scale = layer.scale || 1;
                filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
                const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
                const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
                filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
                
              } else {
                const width = 800;
                const height = 200;
                filterParts.push(`[aud_spec_${specIdx}]showwaves=size=${width}x${height}:mode=line:colors=${hexColor}[wave_raw_${specIdx}]`);
                filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.1:0.1[wave_trans_${specIdx}]`);
                
                if (isRainbow) {
                  const phaseR = `0`;
                  const phaseG = `(2*PI/3)`;
                  const phaseB = `(4*PI/3)`;
                  
                  const gradientBase = '(X/W)';
                  const timeOffset = layer.colorMode === 'rainbow_running' ? '-T*3' : '';
                  
                  const rExpr = `sin(${gradientBase}*2*PI+${phaseR}${timeOffset})*127+128`;
                  const gExpr = `sin(${gradientBase}*2*PI+${phaseG}${timeOffset})*127+128`;
                  const bExpr = `sin(${gradientBase}*2*PI+${phaseB}${timeOffset})*127+128`;
                  
                  filterParts.push(`[wave_trans_${specIdx}]geq=r='if(alpha(X,Y), ${rExpr}, 0)':g='if(alpha(X,Y), ${gExpr}, 0)':b='if(alpha(X,Y), ${bExpr}, 0)':a='alpha(X,Y)'[wave_colored_${specIdx}]`);
                  
                  const scale = layer.scale || 1;
                  filterParts.push(`[wave_colored_${specIdx}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
                } else {
                  const scale = layer.scale || 1;
                  filterParts.push(`[wave_trans_${specIdx}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
                }
                
                const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
                const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
                filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
              }
              
              lastOutputLabel = specOutput;
              specIdx++;
            }
          });

          let filterComplex = filterParts.join(';');

          let outputOpts = [
            `-map [${lastOutputLabel}]`,
            '-map [outa]',
            `-t ${totalDurationSec}`,
            `-c:v ${encoderToUse}`,
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-shortest'
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
                let percent = progress.percent || 0;
                if ((!percent || percent <= 0) && progress.timemark) {
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
                  timemark: progress.timemark
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
              fs.writeFileSync(path.join(app.getPath('userData'), 'ffmpeg-error.log'), stderr || err.message);
              console.log("Full FFmpeg error saved to:", path.join(app.getPath('userData'), 'ffmpeg-error.log'));
              if (err.message.includes('SIGKILL') || isRenderCanceled) {
                // Hapus file yang setengah jadi agar tidak corrupt
                if (fs.existsSync(outputPath)) {
                  fs.unlinkSync(outputPath);
                }
                reject(new Error('RENDER_CANCELED'));
              } else {
                reject(new Error("FFmpeg error. Cek ffmpeg-error.log untuk detailnya. \n" + (err.message)));
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
        let videoInputIndex = 0;
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
        // Build complex filter
        sortedLayers.forEach(layer => {
          if (['watermark', 'sticker', 'image'].includes(layer.type)) {
            const inputObj = imageInputs.find(img => img.layer.id === layer.id);
            if (!inputObj) return;
            
            const currentOutput = `v${inputObj.index}`;
            const scale = layer.scale || 1;
            filterParts.push(`[${inputObj.index}:v]scale=iw*${scale}:ih*${scale}[scaled_${inputObj.index}]`);
            
            const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
            const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
            let overlayFilter = `[${lastOutputLabel}][scaled_${inputObj.index}]overlay=${overlayX}:${overlayY}`;
            if (path.extname(layer.src).toLowerCase() === '.gif') overlayFilter += `:shortest=1`;
            overlayFilter += `[${currentOutput}]`;
            
            filterParts.push(overlayFilter);
            lastOutputLabel = currentOutput;
            
          } else if (layer.type === 'text') {
            const safeText = (layer.content || '').replace(/[':]/g, '\\$&');
            const fontSize = parseInt(layer.fontSize) || 24;
            const fontColor = layer.color || 'white';
            
            const textX = `(w*(${layer.x}/100))-text_w/2`;
            const textY = `(h*(${layer.y}/100))-text_h/2`;
            
            const currentOutput = `t${Math.random().toString(36).substr(2, 5)}`;
            filterParts.push(`[${lastOutputLabel}]drawtext=text='${safeText}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${textX}:y=${textY}[${currentOutput}]`);
            lastOutputLabel = currentOutput;
            
          } else if (layer.type === 'spectrum') {
            if (!finalAudioLabel) return;
            const specOutput = `spec_out_${specIdx}`;
            
            const isRainbow = layer.colorMode === 'rainbow_running' || layer.colorMode === 'rainbow_linear';
            const hexColor = isRainbow ? '0xffffff' : (layer.color && layer.color.startsWith('#') ? '0x' + layer.color.substring(1) : layer.color || 'white');
            
            if (layer.shape === 'circular') {
              const size = 600;
              filterParts.push(`[aud_spec_${specIdx}]showwaves=size=${size}x${size}:mode=cline:colors=${hexColor}[wave_raw_${specIdx}]`);
              filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.1:0.1[wave_trans_${specIdx}]`);
              
              const coordX = `mod((2*W/(2*PI))*(PI+atan2(0.5*H-Y,X-W/2)),W)`;
              const coordY = `H-2*hypot(0.5*H-Y,X-W/2)`;
              
              if (isRainbow) {
                const phaseR = `0`;
                const phaseG = `(2*PI/3)`;
                const phaseB = `(4*PI/3)`;
                const angle = `(PI+atan2(0.5*H-Y,X-W/2))`; // 0 to 2PI
                
                // Add time variable T to make it "run" if running mode
                const timeOffset = layer.colorMode === 'rainbow_running' ? '-T*3' : '';
                
                const rExpr = `sin(${angle}+${phaseR}${timeOffset})*127+128`;
                const gExpr = `sin(${angle}+${phaseG}${timeOffset})*127+128`;
                const bExpr = `sin(${angle}+${phaseB}${timeOffset})*127+128`;
                
                filterParts.push(`[wave_trans_${specIdx}]geq=r='if(alpha(${coordX},${coordY}), ${rExpr}, 0)':g='if(alpha(${coordX},${coordY}), ${gExpr}, 0)':b='if(alpha(${coordX},${coordY}), ${bExpr}, 0)':a='alpha(${coordX}, ${coordY})'[wave_circ_${specIdx}]`);
              } else {
                filterParts.push(`[wave_trans_${specIdx}]geq=r='r(${coordX}, ${coordY})':g='g(${coordX}, ${coordY})':b='b(${coordX}, ${coordY})':a='alpha(${coordX}, ${coordY})'[wave_circ_${specIdx}]`);
              }
              
              let toOverlay = `wave_circ_${specIdx}`;
              if (layer.centerImageIndex) {
                const imgSize = size / 2;
                filterParts.push(`[${layer.centerImageIndex}:v]scale=${imgSize}:${imgSize}[img_scaled_${specIdx}]`);
                filterParts.push(`[img_scaled_${specIdx}]format=rgba,geq=r='r(X,Y)':a='if(lt(hypot(X-W/2,Y-H/2),W/2),255,0)'[img_circ_${specIdx}]`);
                filterParts.push(`[wave_circ_${specIdx}][img_circ_${specIdx}]overlay=(W-w)/2:(H-h)/2[wave_with_img_${specIdx}]`);
                toOverlay = `wave_with_img_${specIdx}`;
              }
              
              const scale = layer.scale || 1;
              filterParts.push(`[${toOverlay}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
              const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
              const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
              filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
              
            } else {
              const width = 800;
              const height = 200;
              filterParts.push(`[aud_spec_${specIdx}]showwaves=size=${width}x${height}:mode=line:colors=${hexColor}[wave_raw_${specIdx}]`);
              filterParts.push(`[wave_raw_${specIdx}]format=rgba,colorkey=black:0.1:0.1[wave_trans_${specIdx}]`);
              
              if (isRainbow) {
                const phaseR = `0`;
                const phaseG = `(2*PI/3)`;
                const phaseB = `(4*PI/3)`;
                
                const gradientBase = '(X/W)';
                const timeOffset = layer.colorMode === 'rainbow_running' ? '-T*3' : '';
                
                const rExpr = `sin(${gradientBase}*2*PI+${phaseR}${timeOffset})*127+128`;
                const gExpr = `sin(${gradientBase}*2*PI+${phaseG}${timeOffset})*127+128`;
                const bExpr = `sin(${gradientBase}*2*PI+${phaseB}${timeOffset})*127+128`;
                
                filterParts.push(`[wave_trans_${specIdx}]geq=r='if(alpha(X,Y), ${rExpr}, 0)':g='if(alpha(X,Y), ${gExpr}, 0)':b='if(alpha(X,Y), ${bExpr}, 0)':a='alpha(X,Y)'[wave_colored_${specIdx}]`);
                
                const scale = layer.scale || 1;
                filterParts.push(`[wave_colored_${specIdx}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
              } else {
                const scale = layer.scale || 1;
                filterParts.push(`[wave_trans_${specIdx}]scale=iw*${scale}:ih*${scale}[spec_scaled_${specIdx}]`);
              }
              
              const overlayX = `(main_w*(${layer.x}/100))-overlay_w/2`;
              const overlayY = `(main_h*(${layer.y}/100))-overlay_h/2`;
              filterParts.push(`[${lastOutputLabel}][spec_scaled_${specIdx}]overlay=${overlayX}:${overlayY}[${specOutput}]`);
            }
            lastOutputLabel = specOutput;
            specIdx++;
          }
        });

        let outputOpts = [
          `-map [${lastOutputLabel}]`,
          `-c:v ${encoderToUse}`,
          '-pix_fmt yuv420p',
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
            if (err.message.includes('SIGKILL') || isRenderCanceled) {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              reject(new Error('RENDER_CANCELED'));
            } else {
              reject(new Error(stderr || err.message));
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
