const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
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

ipcMain.handle('select-folder', async (event, type) => {
  const config = loadConfig();
  let defaultPath = app.getPath('videos');
  if (type === 'video-files' && config.lastVideoDir) defaultPath = config.lastVideoDir;
  if (type === 'audio-files' && config.lastAudioDir) defaultPath = config.lastAudioDir;
  if (type === 'output' && config.lastOutputDir) defaultPath = config.lastOutputDir;

  let properties = ['openDirectory'];
  let filters = [];
  
  if (type === 'video-files') {
    properties = ['openFile', 'multiSelections'];
    filters = [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] }];
  } else if (type === 'audio-files') {
    properties = ['openFile', 'multiSelections'];
    filters = [{ name: 'Audios', extensions: ['mp3', 'wav', 'aac', 'm4a'] }];
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties,
    filters,
    defaultPath
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const isFile = type === 'video-files' || type === 'audio-files';
    const folderPath = isFile ? path.dirname(result.filePaths[0]) : result.filePaths[0];
    
    if (type === 'video-files') saveConfig({ lastVideoDir: folderPath });
    if (type === 'audio-files') saveConfig({ lastAudioDir: folderPath });
    if (type === 'output') saveConfig({ lastOutputDir: folderPath });
    
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

ipcMain.handle('start-render', async (event, options) => {
  const { videos, audios, outputDir, customName, loopDuration } = options;
  
  if (!videos.length || !audios.length || !outputDir) {
    throw new Error('Video, Musik, dan Folder Output wajib diisi!');
  }

  let totalDurationSec = 900; // Default 15 menit
  if (loopDuration === '30m') totalDurationSec = 1800;
  if (loopDuration === '1h') totalDurationSec = 3600;
  if (typeof loopDuration === 'number') totalDurationSec = loopDuration * 60;

  const results = [];

  // Pre-flight check: pastikan file output belum ada untuk mencegah overwrite tanpa sengaja
  for (let i = 0; i < videos.length; i++) {
    const outputFileName = `${customName} ${i + 1}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);
    if (fs.existsSync(outputPath)) {
      throw new Error(`File '${outputFileName}' sudah ada di folder output! Silakan ganti Kustom Nama Output atau hapus file tersebut.`);
    }
  }

  isRendering = true;
  try {
    for (let i = 0; i < videos.length; i++) {
      const videoPath = videos[i];
      // Acak lagu tiap video di-generate
      const randomizedAudios = shuffleArray(audios);
      const outputFileName = `${customName} ${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);

      await new Promise((resolve, reject) => {
        let command = ffmpeg();
        
        // Input Video (Looping infinitely until time runs out)
        command.input(videoPath).inputOptions(['-stream_loop', '-1']);
        
        // Input Multiple Audios
        randomizedAudios.forEach(audio => {
          command.input(audio);
        });

        // Filter Complex: Gabungkan audio dengan concat (paling aman untuk file acak), lalu beri efek fade in & fade out di ujung durasi agar tidak terpotong tiba-tiba
        const audioInputs = randomizedAudios.map((_, idx) => `[${idx + 1}:a]`).join('');
        const filterComplex = `${audioInputs}concat=n=${randomizedAudios.length}:v=0:a=1[concat_a];[concat_a]afade=t=in:st=0:d=2,afade=t=out:st=${totalDurationSec - 2}:d=2[outa]`;

        command
          .complexFilter(filterComplex)
          .outputOptions([
            '-map 0:v',
            '-map [outa]',
            `-t ${totalDurationSec}`,
            '-c:v libx264',
            '-preset ultrafast',
            '-c:a aac',
            '-shortest'
          ])
          .on('progress', (progress) => {
            if (mainWindow) {
              mainWindow.webContents.send('render-progress', {
                currentVideo: i + 1,
                totalVideos: videos.length,
                percent: progress.percent || 0,
                timemark: progress.timemark
              });
            }
          })
          .save(outputPath)
          .on('end', () => {
            results.push(outputPath);
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    }
  } finally {
    isRendering = false;
  }

  return results;
});
