const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');
const { execSync } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;
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
      contextIsolation: true
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

ipcMain.handle('select-folder', async (event, type) => {
  const config = loadConfig();
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

ipcMain.handle('start-render', async (event, options) => {
  const { videos, audios, outputDir, customName, loopDuration, watermark, allowOverwrite, audioOrderType } = options;
  
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
      const videoPath = videos[i];
      // Tentukan urutan lagu (acak atau sesuai urutan custom)
      const randomizedAudios = audioOrderType === 'custom' ? [...audios] : shuffleArray(audios);
      const outputFileName = `${customName} ${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);

      let currentEncoder = detectBestEncoder();

      const runFFmpeg = (encoderToUse) => {
        return new Promise((resolve, reject) => {
          let command = ffmpeg();
          
          command.input(videoPath).inputOptions(['-stream_loop', '-1']);
          if (watermark) command.input(watermark);
          randomizedAudios.forEach(audio => command.input(audio));

          const audioStartIndex = watermark ? 2 : 1;
          const audioInputs = randomizedAudios.map((_, idx) => `[${idx + audioStartIndex}:a]`).join('');
          let filterComplex = `${audioInputs}concat=n=${randomizedAudios.length}:v=0:a=1[concat_a];[concat_a]loudnorm,afade=t=in:st=0:d=2,afade=t=out:st=${totalDurationSec - 2}:d=2[outa]`;

          if (watermark) {
            filterComplex += `;[1:v]scale=150:-1[wm];[0:v][wm]overlay=W-w-20:H-h-20[outv]`;
          }

          let outputOpts = [
            watermark ? '-map [outv]' : '-map 0:v',
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
          } else if (encoderToUse === 'h264_nvenc') {
            outputOpts.push('-preset', 'fast');
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
              results.push(outputPath);
              resolve();
            })
            .on('error', (err, stdout, stderr) => {
              reject(new Error(stderr || err.message));
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
