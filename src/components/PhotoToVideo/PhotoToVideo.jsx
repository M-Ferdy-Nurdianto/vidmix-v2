import React, { useState, useRef, useEffect } from "react";
import { Upload, FolderOpen, ImageIcon, CheckCircle2, Loader2, X, RefreshCw } from "lucide-react";
import { showToast, playLoudSuccessSound } from '../../utils/toast-helper';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PhotoToVideo() {
  const { t } = useLanguage();
  const [photoPath, setPhotoPath] = useState(null);
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem("vidmix_ptvOutputDir") || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastOutput, setLastOutput] = useState(null);
  const [lastDuration, setLastDuration] = useState(0);

  useEffect(() => {
    localStorage.setItem("vidmix_ptvOutputDir", outputDir);
  }, [outputDir]);

  useEffect(() => {
    if (window.api?.onPhotoRenderProgress) {
      window.api.onPhotoRenderProgress(({ percent, timemark }) => {
        setProgress(percent);
        setStage(timemark);
      });
      return () => {
        if (window.api?.removePhotoRenderProgress) window.api.removePhotoRenderProgress();
      };
    }
  }, []);

  const handleSelectPhoto = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result && result.path) {
        if (!/\.(jpg|jpeg|png|webp|bmp)$/i.test(result.path)) {
          showToast('Harap pilih file gambar (JPG/PNG/WEBP)!', 'error');
          return;
        }
        setPhotoPath(result.path);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectOutput = async () => {
    try {
      const dirPath = await window.api.selectFolder('output');
      if (dirPath) setOutputDir(dirPath);
    } catch (error) {
      console.error(error);
    }
  };

  const handleProcess = async () => {
    if (!photoPath) {
      showToast('Pilih foto terlebih dahulu!', 'error');
      return;
    }
    if (!outputDir) {
      showToast('Pilih folder output terlebih dahulu!', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStage(t('loadingPreparing') || 'MENYIAPKAN...');

    try {
      const originalName = photoPath.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "");
      const finalName = `IMG TO VIDEO_${originalName}_${Date.now()}.mp4`;
      const outputPath = `${outputDir}\\${finalName}`;

      const result = await window.api.renderPhotoToVideo({
        photoPath,
        outputPath
      });

      playLoudSuccessSound();
      showToast(`Video berhasil dibuat! Durasi: ${result.duration} detik.`, 'success');
      setLastDuration(result.duration);
      setLastOutput(result.outputPath);
      setIsSuccess(true);
    } catch (error) {
      if (error.message !== 'Dibatalkan pengguna') {
        showToast('Gagal memproses foto: ' + error.message, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (window.api?.cancelRender) {
      await window.api.cancelRender();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 gap-4 animate-in fade-in duration-300">
      
      {/* KIRI - PREVIEW */}
      <div className="flex-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative min-h-[50vh]">
        <h2 className="text-xl font-black bg-black text-white p-3 uppercase flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-[#00F0FF]" />
          Preview
        </h2>

        <div className="flex-1 bg-pink-400 border-4 border-black p-2 m-4 flex flex-col justify-center items-center shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.2)] relative overflow-hidden">
          {photoPath ? (
            <img src={`file://${photoPath}`} alt="Preview" className="max-w-full max-h-full object-contain border-2 border-black" />
          ) : (
            <div className="text-center font-bold text-zinc-500 flex flex-col items-center">
              <ImageIcon className="w-16 h-16 mb-2 opacity-80" />
              <span className="bg-black text-white px-2 py-1 uppercase">{t('ptvSelectPhotoDrop')}</span>
            </div>
          )}
        </div>
      </div>

      {/* BAWAH - KONTROL NAVBAR */}
      <div className="flex flex-col sm:flex-row gap-4 shrink-0 bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Tombol Select Foto */}
        <button 
          onClick={handleSelectPhoto}
          className="flex-1 bg-[#FFE500] hover:bg-yellow-400 border-4 border-black p-4 text-sm font-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all overflow-hidden"
        >
          <Upload className="w-6 h-6 shrink-0" />
          <span className="truncate">
            {photoPath ? photoPath.split(/[\\/]/).pop() : t('ptvSelectBtn')}
          </span>
        </button>

        {/* Tombol Select Output Folder */}
        <button 
          onClick={handleSelectOutput}
          className="flex-1 bg-[#00F0FF] hover:bg-cyan-400 border-4 border-black p-4 text-sm font-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all overflow-hidden"
        >
          <FolderOpen className="w-6 h-6 shrink-0" />
          <span className="truncate">
            {outputDir ? outputDir : t('outputFolderTitle')}
          </span>
        </button>

        {/* Tombol Eksekusi */}
        <button
          onClick={handleProcess}
          disabled={!photoPath || !outputDir || isProcessing}
          className={`flex-[1.5] p-4 text-lg border-4 border-black font-black uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 overflow-hidden
            ${(!photoPath || !outputDir) 
              ? 'bg-zinc-300 text-zinc-500' 
              : 'bg-[#FF3CAC] hover:bg-[#ff1e9b] text-white active:translate-x-1 active:translate-y-1'
            }`}
        >
          <Loader2 className={`w-6 h-6 shrink-0 ${isProcessing ? 'animate-spin' : 'hidden'}`} />
          <span className="truncate">{t('ptvProcessBtn')}</span>
        </button>
      </div>

      {/* OVERLAY LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#FFE500] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
              <RefreshCw className="animate-spin w-8 h-8" />
              {t('loadingProcessing') || 'MEMPROSES...'}
            </h2>
            <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-white">
              {t('loadingDesc')}
            </p>
            
            <div className="border-4 border-black bg-white h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div 
                className="absolute top-0 left-0 h-full bg-[#00F0FF] border-r-4 border-black transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
                {t('loadingProcessing')} {Math.round(progress)}%
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
              <span>STATUS: FFmpeg</span>
              <span>{stage}</span>
            </div>

            <button 
              onClick={handleCancel}
              className="mt-4 w-full border-4 border-black bg-red-500 hover:bg-red-600 text-white font-black py-2 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              BATALKAN RENDER
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY SUCCESS */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#00FF55] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setIsSuccess(false)}
              className="absolute top-4 right-4 bg-blue-400 border-2 border-black w-8 h-8 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-10 h-10" />
              BERHASIL!
            </h2>
            <p className="font-bold text-base mb-2 border-l-4 border-black pl-3 py-2 bg-green-400">
              {t('ptvSuccessDesc')}
            </p>
            <p className="font-black text-2xl mb-6 bg-black text-white p-3 text-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              ⏱️ {lastDuration} DETIK
            </p>
            
            <button
              onClick={() => {
                if (lastOutput) {
                  const dirPath = lastOutput.substring(0, lastOutput.lastIndexOf('\\'));
                  window.api.openFolder(dirPath);
                }
                setIsSuccess(false);
              }}
              className="w-full py-4 font-black text-lg border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-6 h-6" />
              BUKA FOLDER OUTPUT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
