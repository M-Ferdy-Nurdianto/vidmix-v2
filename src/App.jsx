import React, { useState, useEffect } from 'react';
import EditorView from './components/Editor/EditorView';
import Mixer from './components/Mixer/Mixer';
import SpectrumGenerator from './components/SpectrumGenerator/SpectrumGenerator';
import RemoveBG from './components/RemoveBG/RemoveBG';
import PhotoToVideo from './components/PhotoToVideo/PhotoToVideo';
import LicenseGate from './components/License/LicenseGate';
import LicenseInfo from './components/License/LicenseInfo';
import AdminPanel from './components/Admin/AdminPanel';
import OpeningScreen from './components/OpeningScreen';
import CriticalErrorOverlay from './components/CriticalErrorOverlay';
import GuideModal from './components/GuideModal';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { Clapperboard, Music, Scissors, Globe, BookOpen, ImagePlay } from 'lucide-react';
import { playLoudSuccessSound, playErrorSound } from './utils/toast-helper';
import { useLanguage } from './contexts/LanguageContext';
import { createPortal } from 'react-dom';

const ErrorToast = ({ t }) => {
  useEffect(() => {
    if (t.visible) {
      playErrorSound();
    }
  }, [t.visible]);

  const msgStr = typeof t.message === 'string' ? t.message : JSON.stringify(t.message);
  const isFileExists = msgStr.toLowerCase().includes('sudah ada') || msgStr.toLowerCase().includes('overwrite');
  
  const bgColor = isFileExists ? 'bg-orange-500' : 'bg-red-500';
  const titleText = isFileExists ? 'File Sudah Ada' : 'Terjadi Kesalahan';
  const titleIcon = isFileExists ? '📁' : '⚠️';

  return createPortal(
    <div className={`fixed inset-0 z-999999 flex items-center justify-center p-6 transition-all duration-300 pointer-events-none ${t.visible ? 'backdrop-blur-sm bg-black/60' : 'bg-transparent'}`}>
      <div 
        style={{ 
          opacity: t.visible ? 1 : 0, 
          transform: t.visible ? 'scale(1)' : 'scale(0.9)' 
        }}
        className={`${bgColor} border-8 border-black text-white p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 font-bold pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-hidden transition-all duration-300`}
      >
        <div className="flex justify-between items-start gap-6 border-b-4 border-black pb-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{titleIcon}</span>
            <span className="text-3xl uppercase font-black tracking-wider">{titleText}</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const textToCopy = typeof t.message === 'string' ? t.message : JSON.stringify(t.message);
                navigator.clipboard.writeText(textToCopy);
                toast.success('Pesan error disalin!', { position: 'top-center' });
              }}
              className="bg-[#FFE500] text-black px-6 py-2 text-lg font-black border-4 border-black hover:bg-[#E5CD00] active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer"
            >
              COPY LOG
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="bg-black text-white px-6 py-2 text-lg font-black border-4 border-black hover:bg-zinc-800 active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer"
            >
              TUTUP
            </button>
          </div>
        </div>
        <div className="text-base mt-2 font-mono whitespace-pre-wrap break-all opacity-100 overflow-y-auto pr-4 bg-black/40 p-4 border-4 border-black text-white">
          {t.message}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function App() {
  // Auto-load state dari localStorage
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('vidmix_outputDir') || '');
  const [videos, setVideos] = useState(() => JSON.parse(localStorage.getItem('vidmix_videos') || '[]'));
  const [audios, setAudios] = useState(() => JSON.parse(localStorage.getItem('vidmix_audios') || '[]'));
  const [customName, setCustomName] = useState(() => localStorage.getItem('vidmix_customName') || '');
  const [loopPreset, setLoopPreset] = useState(() => localStorage.getItem('vidmix_loopPreset') || '15m');
  const [customMinutes, setCustomMinutes] = useState(() => Number(localStorage.getItem('vidmix_customMinutes')) || 15);
  const [watermark, setWatermark] = useState(() => localStorage.getItem('vidmix_watermark') || '');
  const [allowOverwrite, setAllowOverwrite] = useState(() => localStorage.getItem('vidmix_allowOverwrite') === 'true');
  const [audioOrderType, setAudioOrderType] = useState(() => localStorage.getItem('vidmix_audioOrderType') || 'random');
  const [compressionLevel, setCompressionLevel] = useState(() => localStorage.getItem('vidmix_compressionLevel') || 'medium');
  
  // State non-persistent
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [renderStartTime, setRenderStartTime] = useState(null);
  const [view, setView] = useState('mixer');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [hasPlayedOpening, setHasPlayedOpening] = useState(false);
  const [criticalError, setCriticalError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const { lang, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    let keySequence = '';
    const targetSequence = '10-';
    
    const handleGlobalKeyDown = (e) => {
      // Abaikan jika user sedang mengetik di input box
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      keySequence += e.key;
      // Simpan hanya 3 karakter terakhir
      if (keySequence.length > targetSequence.length) {
        keySequence = keySequence.slice(-targetSequence.length);
      }
      
      // Jika urutan sama dengan "10-"
      if (keySequence === targetSequence) {
        setShowAdminPanel(prev => !prev);
        keySequence = ''; // Reset setelah berhasil
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    let interval;
    if (isProcessing && renderStartTime) {
      interval = setInterval(() => {
        setElapsedMs(Date.now() - renderStartTime);
      }, 1000);
    } else {
      setElapsedMs(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, renderStartTime]);

  // Auto-save state ke localStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem('vidmix_outputDir', outputDir);
    localStorage.setItem('vidmix_videos', JSON.stringify(videos));
    localStorage.setItem('vidmix_audios', JSON.stringify(audios));
    localStorage.setItem('vidmix_customName', customName);
    localStorage.setItem('vidmix_loopPreset', loopPreset);
    localStorage.setItem('vidmix_customMinutes', customMinutes.toString());
    localStorage.setItem('vidmix_watermark', watermark);
    localStorage.setItem('vidmix_allowOverwrite', allowOverwrite.toString());
    localStorage.setItem('vidmix_audioOrderType', audioOrderType);
    localStorage.setItem('vidmix_compressionLevel', compressionLevel);
  }, [outputDir, videos, audios, customName, loopPreset, customMinutes, watermark, allowOverwrite, audioOrderType, compressionLevel]);

  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSuccessFolder, setLastSuccessFolder] = useState('');
  
  useEffect(() => {
    window.api.getConfig().then(config => {
      if (config.lastOutputDir) setOutputDir(config.lastOutputDir);
    });

    window.api.onRenderProgress((data) => {
      setProgressData(data);
    });

    return () => {
      window.api.removeRenderProgress();
    };
  }, []);

  const handleSelectFolder = async (type) => {
    try {
      const apiType = type === 'video' ? 'video-files' : (type === 'audio' ? 'audio-files' : type);
      const result = await window.api.selectFolder(apiType);
      
      if (result) {
        if (type === 'video') {
          setVideos(prev => {
            const currentPaths = new Set(prev.map(v => v.path));
            const newFiles = result.filter(path => !currentPaths.has(path));
            if (newFiles.length === 0) return prev;
            
            const availableSlots = 5 - prev.length;
            if (availableSlots <= 0) {
              toast.error('Maksimal 5 Video sudah tercapai!');
              return prev;
            }
            
            const limitedVideos = newFiles.slice(0, availableSlots).map((path, i) => ({ id: Date.now().toString() + i + Math.random(), path, layers: [] }));
            if (newFiles.length > availableSlots) {
              toast.error(`Hanya ${availableSlots} video yang ditambahkan (Maks 5).`);
            } else {
              toast.success(`${limitedVideos.length} Video Ditambahkan!`);
            }
            return [...prev, ...limitedVideos];
          });
        } else if (type === 'audio') {
          setAudios(prev => {
            const currentPaths = new Set(prev);
            const newFiles = result.filter(path => !currentPaths.has(path));
            if (newFiles.length === 0) return prev;
            
            const availableSlots = 50 - prev.length;
            if (availableSlots <= 0) {
              toast.error('Maksimal 50 Musik sudah tercapai!');
              return prev;
            }
            
            const limitedAudios = newFiles.slice(0, availableSlots);
            if (newFiles.length > availableSlots) {
              toast.error(`Hanya ${availableSlots} musik yang ditambahkan (Maks 50).`);
            } else {
              toast.success(`${limitedAudios.length} Musik Ditambahkan!`);
            }
            return [...prev, ...limitedAudios];
          });
        } else if (type === 'output') {
          setOutputDir(result);
          toast.success('Folder Output Diset!');
        } else if (type === 'watermark') {
          setWatermark(result[0]);
          toast.success('Watermark Diset!');
        }
      }
    } catch (e) {
      toast.error('Gagal membaca direktori/file.');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).map(f => f.path);
    if (!files.length) return;

    if (type === 'video') {
      const filtered = files.filter(f => /\.(mp4|mkv|avi|mov|jpg|jpeg|png|webp|bmp)$/i.test(f));
      setVideos(prev => {
        const currentPaths = new Set(prev.map(v => v.path));
        const newFiles = filtered.filter(path => !currentPaths.has(path));
        if (newFiles.length === 0) return prev;
        
        const availableSlots = 5 - prev.length;
        if (availableSlots <= 0) {
          toast.error('Maksimal 5 Video sudah tercapai!');
          return prev;
        }
        
        const limitedVideos = newFiles.slice(0, availableSlots).map((path, i) => ({ id: Date.now().toString() + i + Math.random(), path, layers: [] }));
        if (newFiles.length > availableSlots) {
          toast.error(`Hanya ${availableSlots} video yang ditambahkan (Maks 5).`);
        } else {
          toast.success(`${limitedVideos.length} Video Ditambahkan (Drop)!`);
        }
        return [...prev, ...limitedVideos];
      });
    } else if (type === 'audio') {
      const filtered = files.filter(f => /\.(mp3|wav|aac|m4a)$/i.test(f));
      setAudios(prev => {
        const currentPaths = new Set(prev);
        const newFiles = filtered.filter(path => !currentPaths.has(path));
        if (newFiles.length === 0) return prev;
        
        const availableSlots = 50 - prev.length;
        if (availableSlots <= 0) {
          toast.error('Maksimal 50 Musik sudah tercapai!');
          return prev;
        }
        
        const limitedAudios = newFiles.slice(0, availableSlots);
        if (newFiles.length > availableSlots) {
          toast.error(`Hanya ${availableSlots} musik yang ditambahkan (Maks 50).`);
        } else {
          toast.success(`${limitedAudios.length} Musik Ditambahkan (Drop)!`);
        }
        return [...prev, ...limitedAudios];
      });
    } else if (type === 'output') {
      setOutputDir(files[0]);
      toast.success('Folder Output Diset (Drop)!');
    } else if (type === 'watermark') {
      const filtered = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f));
      if (filtered.length) { setWatermark(filtered[0]); toast.success('Watermark Diset (Drop)!'); }
    }
  };

  const handleGenerate = async () => {
    if (videos.length === 0 || audios.length === 0 || !outputDir) {
      toast.error('Pilih video, musik, dan direktori output terlebih dahulu!');
      return;
    }
    try {
      setIsProcessing(true);
      setIsSuccess(false);
      setProgressData(null);
      setRenderStartTime(Date.now());

      let durationVal = 15;
      if (loopPreset === '30m') durationVal = 30;
      else if (loopPreset === '1h') durationVal = 60;
      else if (loopPreset === 'custom') durationVal = customMinutes;

      const result = await window.api.startRender({
        videos,
        audios,
        outputDir,
        customName,
        loopDuration: durationVal,
        watermark,
        allowOverwrite,
        audioOrderType,
        compressionLevel
      });

      playLoudSuccessSound();
      setIsSuccess(true);
      setLastSuccessFolder(outputDir);
    } catch (e) {
      const msgStr = e.message || 'Gagal melakukan render.';
      if (msgStr.includes('RENDER_CANCELED')) {
        toast.error('Proses render dibatalkan oleh pengguna.');
      } else if (msgStr.toLowerCase().includes('sudah ada') || msgStr.toLowerCase().includes('overwrite')) {
        toast.error(msgStr);
      } else if (msgStr.toLowerCase().includes('wajib diisi')) {
        toast.error(msgStr);
      } else {
        setCriticalError(msgStr);
      }
    } finally {
      setIsProcessing(false);
      setProgressData(null);
      setRenderStartTime(null);
    }
  };


  return (
    <>
      <LicenseGate>
        <div className="min-h-screen bg-[#F4F4F0] text-zinc-900 font-mono p-6 select-none relative pb-16 transition-colors duration-300">
          {/* Global Navigation */}
          <div className="flex gap-4 mb-6 border-b-4 border-black pb-4 items-center">
            <button 
              onClick={() => setView('mixer')}
              className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 ${view === 'mixer' ? 'bg-[#00FF55]' : 'bg-white'}`}
            >
              <Clapperboard className="w-6 h-6 fill-current" strokeWidth={2.5} /> {t('videoMixer')}
            </button>
            <button 
              onClick={() => setView('spectrum')}
              className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 ${view === 'spectrum' ? 'bg-[#00F0FF]' : 'bg-white'}`}
            >
              <Music className="w-6 h-6 fill-current" strokeWidth={2.5} /> {t('spectrumMaker')}
            </button>
            <button 
              onClick={() => setView('removebg')}
              className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 ${view === 'removebg' ? 'bg-[#FF3CAC] text-white' : 'bg-white'}`}
            >
              <Scissors className="w-6 h-6" strokeWidth={2.5} /> {t('removeBg')}
            </button>
            <button 
              onClick={() => setView('phototovideo')}
              className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 ${view === 'phototovideo' ? 'bg-[#FFE500]' : 'bg-white'}`}
            >
              <ImagePlay className="w-6 h-6" strokeWidth={2.5} /> {t('photoToVideo')}
            </button>
            <button 
              onClick={() => setView('editor')}
              className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 ${view === 'editor' ? 'bg-[#FF90E8]' : 'bg-white'}`}
            >
              <Clapperboard className="w-6 h-6" strokeWidth={2.5} /> {t('videoEditor')}
            </button>
            
            <button
              onClick={() => setShowGuide(true)}
              className="ml-auto px-4 py-2 font-black border-4 border-black text-xl bg-[#00F0FF] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2"
              title="Open Guide"
            >
              <BookOpen className="w-6 h-6" strokeWidth={2.5} /> GUIDE
            </button>

            <button
              onClick={toggleLanguage}
              className="px-4 py-2 font-black border-4 border-black text-xl bg-[#FFE500] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2"
              title="Toggle Language"
            >
              <Globe className="w-6 h-6" strokeWidth={2.5} /> {lang === 'en' ? '🇬🇧 EN' : '🇮🇩 ID'}
            </button>

            <LicenseInfo />
          </div>

          {view === 'phototovideo' ? (
            <PhotoToVideo />
          ) : view === 'editor' ? (
            <EditorView 
              outputDir={outputDir} 
              handleSelectFolder={handleSelectFolder} 
              allowOverwrite={allowOverwrite} 
            />
          ) : view === 'removebg' ? (
            <RemoveBG />
          ) : view === 'spectrum' ? (
            <SpectrumGenerator />
          ) : (
            <Mixer 
              videos={videos} setVideos={setVideos}
              audios={audios} setAudios={setAudios}
              outputDir={outputDir} setOutputDir={setOutputDir}
              customName={customName} setCustomName={setCustomName}
              loopPreset={loopPreset} setLoopPreset={setLoopPreset}
              customMinutes={customMinutes} setCustomMinutes={setCustomMinutes}
              watermark={watermark} setWatermark={setWatermark}
              allowOverwrite={allowOverwrite} setAllowOverwrite={setAllowOverwrite}
              audioOrderType={audioOrderType} setAudioOrderType={setAudioOrderType}
              compressionLevel={compressionLevel} setCompressionLevel={setCompressionLevel}
              isProcessing={isProcessing} progressData={progressData} elapsedMs={elapsedMs}
              isSuccess={isSuccess} setIsSuccess={setIsSuccess} lastSuccessFolder={lastSuccessFolder}
              handleSelectFolder={handleSelectFolder} handleDrop={handleDrop} handleDragOver={handleDragOver} handleGenerate={handleGenerate}
            />
          )}
          
          {/* Opening Screen (dimuat SETELAH lolos LicenseGate) */}
          {!hasPlayedOpening && (
            <OpeningScreen onComplete={() => setHasPlayedOpening(true)} />
          )}
        </div>
      </LicenseGate>

      {/* Secret Admin Panel is truly Global */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {criticalError && (
        <CriticalErrorOverlay 
          errorMsg={criticalError} 
          onClose={() => setCriticalError(null)} 
        />
      )}

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}

      {/* Global Toaster */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: { zIndex: 10000 },
          success: { position: 'top-center' },
          loading: { position: 'top-center' },
          error: {
            position: 'top-center',
            duration: 15000,
            style: { pointerEvents: 'auto', zIndex: 10000 }
          }
        }}
      >
        {(t) => {
          if (t.type === 'error') {
            return <ErrorToast t={t} />;
          }
          let bgColor = 'bg-white';
          if (t.type === 'success') bgColor = 'bg-[#00FF55]';
          else if (t.type === 'loading') bgColor = 'bg-[#FFE500]';

          return (
            <div
              style={{ opacity: t.visible ? 1 : 0, transform: t.visible ? 'translateY(0)' : 'translateY(-20px)' }}
              className={`${bgColor} border-4 border-black text-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 font-bold pointer-events-auto transition-all duration-300 cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
              onClick={() => toast.dismiss(t.id)}
            >
              <span className="text-xl shrink-0">{t.icon}</span>
              <span className="tracking-wide wrap-break-word">{t.message}</span>
            </div>
          );
        }}
      </Toaster>
    </>
  );
}
