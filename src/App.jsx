import React, { useState, useEffect } from 'react';
import { FolderOpen, Play, RefreshCw, Film, Music, CheckCircle2, AlertCircle, Settings, ChevronDown, GripVertical, Plus, Trash2, Type, Image as ImageIcon, Activity } from 'lucide-react';
import LayerCanvas from './components/Editor/LayerCanvas';
import LayerControlPanel from './components/Editor/LayerControlPanel';
import SpectrumGenerator from './components/SpectrumGenerator/SpectrumGenerator';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

export default function App() {
 // Auto-load state dari localStorage
 const [outputDir, setOutputDir] = useState(() => localStorage.getItem('vidmix_outputDir') || '');
 const [videos, setVideos] = useState(() => JSON.parse(localStorage.getItem('vidmix_videos') || '[]'));
 const [audios, setAudios] = useState(() => JSON.parse(localStorage.getItem('vidmix_audios') || '[]'));
 const [customName, setCustomName] = useState(() => localStorage.getItem('vidmix_customName') || 'joji');
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
 const [draggedItemIndex, setDraggedItemIndex] = useState(null);
 const [editingLayerNameId, setEditingLayerNameId] = useState(null);
 const [draggedLayerIndex, setDraggedLayerIndex] = useState(null);
 const [dragOverLayerIndex, setDragOverLayerIndex] = useState(null);
 const [availableGifs, setAvailableGifs] = useState([]);

 // Ambil daftar GIF saat aplikasi dimuat
 useEffect(() => {
 if (window.api && window.api.getGifs) {
 window.api.getGifs().then(gifs => setAvailableGifs(gifs));
 }
 }, []);

 // Handle Drag & Drop Layer
 const handleLayerDrop = (e, toIndex) => {
 e.preventDefault();
 if (draggedLayerIndex === null || draggedLayerIndex === toIndex) return;

 setVideos(prev => prev.map(v => {
 if (v.id === editingVideoId) {
 const sortedLayers = [...v.layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
 const itemToMove = sortedLayers.splice(draggedLayerIndex, 1)[0];
 sortedLayers.splice(toIndex, 0, itemToMove);
 
 // Re-assign zIndex
 const newLayers = sortedLayers.map((l, index) => {
 const baseZIndex = sortedLayers.length - index;
 return {
 ...l,
 zIndex: l.type === 'watermark' ? 9000 + baseZIndex : baseZIndex
 };
 });
 return { ...v, layers: newLayers };
 }
 return v;
 }));
 
 setDraggedLayerIndex(null);
 setDragOverLayerIndex(null);
 };
 const [editingVideoId, setEditingVideoId] = useState(null);
 const [selectedLayerId, setSelectedLayerId] = useState(null);

 useEffect(() => {
 window.api.getConfig().then(config => {
 // Kita tidak lagi memuat lastVideoDir/lastAudioDir ke state karena kita memilih file langsung,
 // tapi dialog electron sudah meng-handle last directory secara otomatis saat dibuka.
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
 const limitedVideos = result.slice(0, 5).map((path, i) => ({ id: Date.now().toString() + i, path, layers: [] }));
 if (result.length > 5) toast.error('Maksimal 5 Video! Sisanya diabaikan.');
 setVideos(limitedVideos);
 toast.success(`${limitedVideos.length} Video Terpilih!`);
 } else if (type === 'audio') {
 const limitedAudios = result.slice(0, 20);
 if (result.length > 20) toast.error('Maksimal 20 Musik! Sisanya diabaikan.');
 setAudios(limitedAudios);
 toast.success(`${limitedAudios.length} Musik Terpilih!`);
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

 const handleDragStart = (e, index) => {
 setDraggedItemIndex(index);
 e.dataTransfer.effectAllowed ="move";
 };

 const handleDragEnter = (e, index) => {
 e.preventDefault();
 if (draggedItemIndex === null || draggedItemIndex === index) return;
 
 const newAudios = [...audios];
 const draggedItem = newAudios[draggedItemIndex];
 newAudios.splice(draggedItemIndex, 1);
 newAudios.splice(index, 0, draggedItem);
 
 setDraggedItemIndex(index);
 setAudios(newAudios);
 };

 const handleDragEnd = () => {
 setDraggedItemIndex(null);
 };

 const moveAudio = (index, direction) => {
 const newAudios = [...audios];
 const temp = newAudios[index];
 newAudios[index] = newAudios[index + direction];
 newAudios[index + direction] = temp;
 setAudios(newAudios);
 };

 const handleDragOver = (e) => e.preventDefault();

 const handleDrop = (e, type) => {
 e.preventDefault();
 const files = Array.from(e.dataTransfer.files).map(f => f.path);
 if (!files.length) return;

 if (type === 'video') {
 const filtered = files.filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f));
 const limitedVideos = filtered.slice(0, 5).map((path, i) => ({ id: Date.now().toString() + i, path, layers: [] }));
 if (filtered.length > 5) toast.error('Maksimal 5 Video! Sisanya diabaikan.');
 if (limitedVideos.length) { setVideos(limitedVideos); toast.success(`${limitedVideos.length} Video Terpilih (Drop)!`); }
 } else if (type === 'audio') {
 const filtered = files.filter(f => /\.(mp3|wav|aac|m4a)$/i.test(f));
 const limitedAudios = filtered.slice(0, 20);
 if (filtered.length > 20) toast.error('Maksimal 20 Musik! Sisanya diabaikan.');
 if (limitedAudios.length) { setAudios(limitedAudios); toast.success(`${limitedAudios.length} Musik Terpilih (Drop)!`); }
 } else if (type === 'output') {
 // Asumsi yang di-drop adalah folder
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

      const playSuccessSound = () => {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          console.error('Failed to play sound', e);
        }
      };

      playSuccessSound();
      setIsSuccess(true);
      setLastSuccessFolder(outputDir);
 } catch (e) {
 if (e.message.includes('RENDER_CANCELED')) {
 toast.error('Proses render dibatalkan oleh pengguna.');
 } else {
 toast.error(e.message || 'Gagal melakukan render.');
 }
 } finally {
 setIsProcessing(false);
 setProgressData(null);
 setRenderStartTime(null);
 }
 };


 return (
 <div className="min-h-screen bg-[#F4F4F0] text-zinc-900 font-mono p-6 select-none relative pb-16 transition-colors duration-300">
 <Toaster 
 position="top-right"
 toastOptions={{
 success: { position: 'top-center' },
 loading: { position: 'top-center' },
 error: {
 duration: 15000,
 style: { pointerEvents: 'auto' }
 }
 }}
 >
 {(t) => {
            if (t.type === 'error') {
              const msgStr = typeof t.message === 'string' ? t.message : JSON.stringify(t.message);
              const isFileExists = msgStr.toLowerCase().includes('sudah ada') || msgStr.toLowerCase().includes('overwrite');
              
              const bgColor = isFileExists ? 'bg-orange-500' : 'bg-red-500';
              const titleText = isFileExists ? 'File Sudah Ada' : 'Terjadi Kesalahan';
              const titleIcon = isFileExists ? '📁' : '⚠️';

              return (
                <div 
                  style={{ opacity: t.visible ? 1 : 0 }}
                  className={`${bgColor} border-4 border-black text-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2 font-bold pointer-events-auto max-w-md max-h-[80vh] overflow-hidden transition-all duration-300`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{titleIcon}</span>
                      <span className="uppercase font-black tracking-wider">{titleText}</span>
                    </div>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 const textToCopy = typeof t.message === 'string' ? t.message : JSON.stringify(t.message);
 navigator.clipboard.writeText(textToCopy);
 toast.success('Pesan error disalin!', { position: 'top-center' });
 }}
 className="bg-orange-400 text-black px-3 py-1 text-xs font-black border-2 border-black hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
 >
 COPY LOG
 </button>
 </div>
 <div className="text-[10px] mt-2 font-mono whitespace-pre-wrap break-all opacity-90 overflow-y-auto pr-2 bg-black/20 p-2 border-2 border-black/30">
 {t.message}
 </div>
 </div>
 );
 }
            // Style for success, loading, or normal toasts
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
 
  {/* Global Navigation */}
  <div className="flex gap-4 mb-6 border-b-4 border-black pb-4">
    <button 
      onClick={() => setView('mixer')}
      className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${view === 'mixer' ? 'bg-[#00FF55]' : 'bg-white'}`}
    >
      🎬 VIDEO MIXER
    </button>
    <button 
      onClick={() => setView('spectrum')}
      className={`px-6 py-2 font-black border-4 border-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${view === 'spectrum' ? 'bg-[#00F0FF]' : 'bg-white'}`}
    >
      🎵 SPECTRUM MAKER
    </button>
  </div>

  {view === 'spectrum' ? (
    <SpectrumGenerator />
  ) : (
    <>
    <div style={{ display: editingVideoId ? 'none' : 'block' }}>
 {/* Full-screen Render Overlay */}
 {isProcessing && (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#FFE500] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
 <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
 <RefreshCw className="animate-spin w-8 h-8" />
 SEDANG MERENDER...
 </h2>
 <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-purple-400">
 Proses *mixing* FFmpeg sedang berjalan. Proses ini mungkin memakan waktu agak lama. Mohon jangan menutup jendela ini.
 </p>
 
 <div className="border-4 border-black bg-yellow-400 h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
  {progressData && (
  <div 
  className="absolute top-0 left-0 h-full w-full bg-[#00FF55] border-r-4 border-black animate-indeterminate" 
  />
  )}
  <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
  {progressData ? `SEDANG MEMPROSES... ${Math.round(progressData.percent)}%` : 'MENYIAPKAN RENDER...'}
  </div>
  </div>
  
  <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
  <span>STATUS: PROCESSING</span>
  {progressData ? (
  <span>Sudah berjalan: {Math.floor(elapsedMs / 60000)}m {Math.floor((elapsedMs % 60000) / 1000)}s | VIDEO {progressData.currentVideo} / {progressData.totalVideos}</span>
  ) : (
  <span>MENYIAPKAN FFmpeg...</span>
  )}
  </div>

 <button 
 onClick={() => window.api.cancelRender()}
 className="mt-4 w-full border-4 border-black bg-red-500 hover:bg-red-600 text-white font-black py-2 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
 >
 BATALKAN RENDER
 </button>
 </div>
 </div>
 )}

 {/* Full-screen Success Overlay */}
 {isSuccess && !isProcessing && (
 <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
 <div className="bg-[#00FF55] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200 relative">
 <button 
 onClick={() => setIsSuccess(false)}
 className="absolute top-4 right-4 bg-blue-400 border-2 border-black w-8 h-8 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
 >
 X
 </button>
 <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
 <CheckCircle2 className="w-10 h-10" />
 BERHASIL!
 </h2>
 <p className="font-bold text-base mb-6 border-l-4 border-black pl-3 py-2 bg-green-400">
 Semua video Anda telah selesai dirender dan dicampur (mixing) dengan aman ke dalam folder!
 </p>
 
 <button
 onClick={() => { window.api.openFolder(lastSuccessFolder); setIsSuccess(false); }}
 className="w-full py-4 font-black text-lg border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
 >
 <FolderOpen className="w-6 h-6" /> BUKA FOLDER HASIL
 </button>
 </div>
 </div>
 )}
 
 {/* Header Neo-Brutalism */}
 <div className="border-4 border-black bg-[#FFE500] dark:bg-[#E5CD00] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 flex justify-between items-center transform hover:-translate-y-0.5 transition-transform">
 <div>
 <h1 className="text-2xl font-black tracking-wider flex items-center gap-2 text-black">
 <img src="./favicon-32x32.png" className="w-8 h-8" alt="Vidmix Logo" /> VIDMIX <span className="bg-black text-white px-2 py-0.5 text-sm">v2.0</span>
 <div className="ml-3 bg-orange-400 border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black flex items-center gap-3">
 <span className="text-zinc-500">Creator:</span>
 <a href="https://instagram.com/ikifer" target="_blank" rel="noreferrer" className="hover:text-pink-600 transition-colors">
 Ig: @ikifer
 </a>
 <div className="w-1 h-1 bg-black rounded-full"></div>
 <a href="https://github.com/M-Ferdy-Nurdianto" target="_blank" rel="noreferrer" className="hover:text-[#7000FF] dark:hover:text-[#9D4EDD] transition-colors">
 Github: M-Ferdy-Nurdianto
 </a>
 </div>
 </h1>
 <p className="text-xs font-bold mt-1 text-black">High-Speed FFmpeg Automation & Random Audio Mixer Engine</p>
 </div>
 <div className="flex gap-4">
 <div className="bg-purple-400 text-black border-2 border-black px-3 py-1 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 Windows Native 🚀
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 
 {/* Kolom Kiri: Direktori & Preset */}
 <div className="space-y-6">
 
 {/* Panel Folder Sources */}
 <div className="border-4 border-black bg-yellow-400 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
 <h2 className="text-lg font-black mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
 <FolderOpen className="w-5 h-5"/> Direktori Sumber Berkelanjutan
 </h2>

 <div className="space-y-3">
 <div 
 onDragOver={handleDragOver} 
 onDrop={(e) => handleDrop(e, 'video')}
 >
 <label className="text-xs font-bold block mb-1">Pilih Video (Bisa Drag & Drop)</label>
 <div className="flex gap-2 mb-2">
 <input type="text" readOnly value={videos.length > 0 ? `${videos.length} Video Terpilih` : 'Belum dipilih...'} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder="Tarik file ke sini..." />
 <button onClick={() => handleSelectFolder('video')} className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">Pilih</button>
 </div>
 {videos.length > 0 && (
 <div className="space-y-2 mt-2">
 {videos.map((vid, idx) => (
 <div key={vid.id} className="flex items-center gap-2 bg-blue-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 <div className="font-black w-6 h-6 flex items-center justify-center text-xs bg-[#FFE500] border-2 border-black">{idx + 1}</div>
 <div className="truncate flex-1 font-bold text-xs flex items-center gap-2" title={vid.path}>
 <span className="truncate">{vid.path.split('\\').pop().split('/').pop()}</span>
 {vid.layers && vid.layers.length > 0 && (
 <span className="shrink-0 bg-[#00FF55]-black border border-black px-1 py-0.5 text-[9px] uppercase font-black" title="Sudah diedit">★ DIEDIT</span>
 )}
 </div>
 <button 
 onClick={() => setEditingVideoId(vid.id)}
 className="bg-[#FF90E8] border-2 border-black px-2 py-1 text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
 >
 EDIT
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 <div
 onDragOver={handleDragOver} 
 onDrop={(e) => handleDrop(e, 'audio')}
 >
 <label className="text-xs font-bold block mb-1">Pilih Musik (Bisa Drag & Drop)</label>
 <div className="flex gap-2">
 <input type="text" readOnly value={audios.length > 0 ? `${audios.length} Musik Terpilih` : 'Belum dipilih...'} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder="Tarik file ke sini..." />
 <button onClick={() => handleSelectFolder('audio')} className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">Pilih</button>
 </div>
 </div>

 <div
 onDragOver={handleDragOver} 
 onDrop={(e) => handleDrop(e, 'output')}
 >
 <label className="text-xs font-bold block mb-1">Folder Output Penyimpanan</label>
 <div className="flex gap-2">
 <input type="text" readOnly value={outputDir || 'Belum dipilih...'} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder="Tarik folder ke sini..." />
 <button onClick={() => handleSelectFolder('output')} className="bg-[#7000FF] text-white border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">Pilih</button>
 </div>
 </div>
 </div>
 </div>

 {/* Panel Konfigurasi Nama & Preset Loop */}
 <div className="border-4 border-black bg-green-400 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
 <h2 className="text-lg font-black mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
 <Settings className="w-5 h-5"/> Pengaturan Render
 </h2>

 <div className="space-y-4">
 <div>
 <label className="text-xs font-bold block mb-1">Kustom Nama Output (Misal: joji)</label>
 <div className="flex gap-2">
 <input 
 type="text" 
 value={customName} 
 onChange={(e) => setCustomName(e.target.value)} 
 className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-[#FFF9C4]" 
 />
 <button 
 onClick={() => setAllowOverwrite(!allowOverwrite)}
 title="Timpa file jika sudah ada"
 className={`border-2 border-black px-3 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors whitespace-nowrap ${allowOverwrite ? 'bg-red-500 text-white' : 'bg-orange-400 '}`}
 >
 {allowOverwrite ? 'TIMPA (ON)' : 'TIMPA (OFF)'}
 </button>
 </div>
 <p className="text-[10px] text-zinc-500 mt-1">Hasil nanti otomatis: <b>{customName || 'nama'} 1 - 5.mp4</b></p>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">Preset Durasi Loop</label>
 <div className="grid grid-cols-4 gap-2">
 {['15m', '30m', '1h', 'custom'].map((preset) => (
 <button
 key={preset}
 onClick={() => setLoopPreset(preset)}
 className={`border-2 border-black py-2 text-xs font-black uppercase transition-all ${loopPreset === preset ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-purple-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 {loopPreset === 'custom' && (
 <div>
 <label className="text-xs font-bold block mb-1">Custom Durasi (Menit)</label>
 <input 
 type="number" 
 value={customMinutes} 
 onChange={(e) => setCustomMinutes(Number(e.target.value))} 
 className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-yellow-400" 
 />
 </div>
 )}

 <div>
 <label className="text-xs font-bold block mb-1">Kualitas &amp; Kompresi</label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id: 'low', label: 'Kualitas Tinggi' },
 { id: 'medium', label: 'Seimbang' },
 { id: 'high', label: 'Ukuran Kecil' }
 ].map((lvl) => (
 <button
 key={lvl.id}
 onClick={() => setCompressionLevel(lvl.id)}
 className={`border-2 border-black py-2 text-[10px] font-black uppercase transition-all ${compressionLevel === lvl.id ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-blue-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 '}`}
 >
 {lvl.label}
 </button>
 ))}
 </div>
 <p className="text-[10px] text-zinc-500 mt-1">
 * Semakin kecil ukuran, semakin turun kualitas gambar.
 </p>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="relative">
 <label className="text-xs font-bold block mb-1">Hardware Acceleration</label>
 <div className="w-full bg-zinc-200 border-2 border-black px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
 <span className="text-green-700">⚡ Auto Smart-Detect (GPU/CPU)</span>
 </div>
 </div>

 <div
 onDragOver={handleDragOver} 
 onDrop={(e) => handleDrop(e, 'watermark')}
 >
 <label className="text-xs font-bold block mb-1">Pilih Watermark PNG</label>
 <div className="flex gap-2">
 <input type="text" readOnly value={watermark ? 'Ada Logo' : ''} placeholder="Drop PNG..." className="w-full bg-zinc-100 border-2 border-black px-2 py-2 text-[10px] truncate font-bold" />
 <button onClick={() => handleSelectFolder('watermark')} className="bg-orange-400 border-2 border-black px-2 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs">Pilih</button>
 </div>
 </div>
 </div>
 </div>
 </div>

 </div>

 {/* Kolom Kanan: Status, Preview Algoritma Shuffle & Eksekusi */}
 <div className="flex flex-col justify-between space-y-6">
 
 <div className="border-4 border-black bg-[#FF90E8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex-1 flex flex-col">
 <h2 className="text-lg font-black mb-3 flex items-center gap-2 border-b-4 border-black pb-2">
 <Music className="w-5 h-5"/> Pengaturan Urutan Musik
 </h2>
 
 <div className="flex gap-2 mb-4">
 <button 
 onClick={() => setAudioOrderType('random')}
 className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'random' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-green-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
 >
 ACAK (SHUFFLE)
 </button>
 <button 
 onClick={() => setAudioOrderType('custom')}
 className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'custom' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-orange-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
 >
 PILIH URUTAN
 </button>
 </div>

 {audioOrderType === 'random' ? (
 <div className="flex-1">
 <p className="text-xs font-bold mb-4">Setiap video akan memproses urutan musik yang berbeda secara otomatis (Algoritma Fisher-Yates).</p>
 <div className="space-y-2 font-mono text-xs opacity-75">
 <div className="bg-purple-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 <span className="font-black text-purple-700">{customName} 1.mp4</span> → [ Urutan Acak ]
 </div>
 <div className="bg-yellow-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 <span className="font-black text-purple-700">{customName} 2.mp4</span> → [ Urutan Acak ]
 </div>
 </div>
 </div>
 ) : (
 <div className="flex-1 flex flex-col min-h-0">
 <p className="text-xs font-bold mb-2">Urutan Musik Kustom (Berlaku sama untuk semua video):</p>
 {audios.length === 0 ? (
 <div className="text-xs italic text-zinc-600 bg-blue-400 /50 p-3 border-2 border-black border-dashed">Belum ada musik yang dipilih.</div>
 ) : (
 <div className="overflow-y-auto pr-2 space-y-3 flex-1 pb-2 max-h-87.5">
 {audios.map((audioPath, idx) => (
 <div 
 key={audioPath + idx}
 draggable
 onDragStart={(e) => handleDragStart(e, idx)}
 onDragEnter={(e) => handleDragEnter(e, idx)}
 onDragEnd={handleDragEnd}
 onDrop={handleDragEnd}
 onDragOver={(e) => e.preventDefault()}
 className={`flex items-center gap-3 bg-green-400 border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-move transition-transform hover:-translate-y-0.5 ${draggedItemIndex === idx ? 'ring-2 ring-[#FF90E8]' : ''}`}
 >
 <div className="font-black w-7 h-7 flex items-center justify-center text-sm bg-[#FFE500] border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{idx + 1}</div>
 <div className="truncate flex-1 font-black text-sm" title={audioPath}>
 {audioPath.split('\\').pop().split('/').pop()}
 </div>
 <div className="text-xl px-2 font-black cursor-grab active:cursor-grabbing">
 ≡
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 <div className="mt-4 flex flex-col gap-3">
 {isSuccess && lastSuccessFolder && (
 <button
 onClick={() => window.api.openFolder(lastSuccessFolder)}
 className="w-full py-3 font-black text-sm border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
 >
 <FolderOpen className="w-5 h-5" /> BUKA FOLDER HASIL RENDER
 </button>
 )}

 <button
 onClick={handleGenerate}
 disabled={isProcessing}
 className={`relative overflow-hidden w-full py-4 font-black text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all ${isProcessing ? 'bg-zinc-300' : 'bg-[#00FF55] hover:bg-[#00CC44]'}`}
 >
 {isProcessing && progressData && (
 <div 
 className="absolute top-0 left-0 h-full bg-[#00F0FF] z-0" 
 style={{ width: `${Math.min(Math.max(progressData.percent, 0), 100)}%` }} 
 />
 )}
 
 <div className="relative z-10 flex items-center justify-center gap-2">
 {isProcessing ? (
 <>
 <RefreshCw className="animate-spin" /> 
 {progressData ? `MERENDER VIDEO ${progressData.currentVideo}/${progressData.totalVideos} (${Math.round(progressData.percent)}%)` : 'MENYIAPKAN RENDER...'}
 </>
 ) : (
 <>
 <Play /> MULAI GENERATE VIDMIX V2
 </>
 )}
 </div>
 </button>
 </div>

 </div>

 </div>
 </div>

 {editingVideoId && (
 <div className="fixed inset-0 z-50 bg-[#F4F4F0] text-zinc-900 font-mono flex flex-col p-6">
 {/* Header */}
 <div className="h-16 border-4 border-black bg-orange-400 flex items-center justify-between px-6 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
 <div className="flex items-center gap-3 font-black text-2xl">
 <Film className="w-8 h-8 text-black" />
 <span>EDIT VIDEO #{videos.findIndex(v => v.id === editingVideoId) + 1}</span>
 </div>
 <div className="flex items-center gap-3">
 <button 
 onClick={() => { 
 setEditingVideoId(null); 
 setSelectedLayerId(null); 
 toast.success("Edit berhasil disimpan!", {
 position: 'top-center',
 style: {
 border: '2px solid black',
 padding: '16px',
 color: 'black',
 backgroundColor: '#00FF55',
 fontWeight: '900',
 boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
 },
 iconTheme: {
 primary: 'black',
 secondary: '#00FF55',
 },
 });
 }}
 className="bg-[#00FF55]-black border-4 border-black px-6 py-2 font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
 >
 SIMPAN & TUTUP EDITOR
 </button>
 </div>
 </div>
 
 {/* Main Layout: Left Tools, Center Canvas, Right Properties */}
 <div className="flex flex-1 min-h-0 gap-4">
 
 {/* Left Sidebar (Tools & Presets) */}
 <div className="w-72 flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
 {/* Tambah Element */}
 <div className="border-4 border-black bg-purple-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
 <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">Tambah Elemen</h3>
 <div className="grid grid-cols-2 gap-2">
 <button 
 onClick={() => {
 const newLayer = { id: Date.now().toString(), type: 'text', content: 'Teks Baru', color: '#ffffff', fontSize: '48px', x: 50, y: 50, scale: 1, rotation: 0, zIndex: (videos.find(v => v.id === editingVideoId)?.layers.length || 0) + 1, fontFamily: 'Arial' };
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: [...v.layers, newLayer] } : v));
 setSelectedLayerId(newLayer.id);
 }} 
 className="flex flex-col items-center justify-center gap-2 py-3 bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 font-bold"
 >
 <Type className="w-6 h-6" />
 <span className="text-xs">Teks</span>
 </button>
 <button 
 onClick={async () => {
 try {
 const result = await window.api.selectMediaFile();
 if (result && result.mediaType === 'photo') {
 const newLayer = { id: Date.now().toString(), type: result.path.toLowerCase().endsWith('.gif') ? 'sticker' : 'image', src: result.path, x: 50, y: 50, scale: 1, rotation: 0, zIndex: (videos.find(v => v.id === editingVideoId)?.layers.length || 0) + 1 };
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: [...v.layers, newLayer] } : v));
 setSelectedLayerId(newLayer.id);
 }
 } catch(e) {}
 }} 
 className="flex flex-col items-center justify-center gap-2 py-3 bg-[#FF90E8] hover:bg-[#E581D0] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 font-bold"
 >
 <ImageIcon className="w-6 h-6" />
 <span className="text-xs">Gambar</span>
 </button>
 
 <button 
 onClick={() => {
 const newLayer = { id: Date.now().toString(), type: 'spectrum', name: 'Audio Spectrum', color: '#00F0FF', style: 'line', x: 50, y: 80, scale: 1, rotation: 0, zIndex: (videos.find(v => v.id === editingVideoId)?.layers.length || 0) + 1 };
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: [...v.layers, newLayer] } : v));
 setSelectedLayerId(newLayer.id);
 }} 
 className="flex flex-col items-center justify-center gap-2 py-3 bg-[#00FF55] hover:bg-[#00CC44] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 font-bold col-span-2"
 >
 <Activity className="w-6 h-6" />
 <span className="text-xs">Audio Spectrum</span>
 </button>
 </div>
 </div>

 {/* Stiker / GIF Panel */}
 <div className="border-4 border-black bg-yellow-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 max-h-56 flex flex-col">
 <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
 <h3 className="font-black text-sm uppercase">Stiker / GIF</h3>
 <div className="flex gap-1">
 <button 
 onClick={async () => {
 if (window.api && window.api.openGifsFolder) {
 await window.api.openGifsFolder();
 }
 }}
 className="text-xs bg-blue-300 hover:bg-blue-400 border-2 border-black font-bold px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
 title="Buka Folder GIF"
 >
 📁 FOLDER
 </button>
 <button 
 onClick={async () => {
 if (window.api && window.api.getGifs) {
 const gifs = await window.api.getGifs();
 setAvailableGifs(gifs);
 }
 }}
 className="text-xs bg-yellow-300 hover:bg-yellow-400 border-2 border-black font-bold px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
 title="Refresh Daftar GIF"
 >
 🔄
 </button>
 <button 
 onClick={async () => {
 try {
 if (window.api && window.api.uploadGif) {
 const newGifPath = await window.api.uploadGif();
 if (newGifPath) {
 const gifs = await window.api.getGifs();
 setAvailableGifs(gifs);
 }
 } else {
 alert("Fitur upload tidak tersedia. Pastikan aplikasi dimuat dengan benar.");
 }
 } catch (err) {
 console.error("Upload error:", err);
 alert("Error upload:" + err.message);
 }
 }}
 className="text-xs bg-[#00FF55] hover:bg-[#00CC44] border-2 border-black font-bold px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
 >
 + UPLOAD
 </button>
 </div>
 </div>
 {availableGifs.length === 0 ? (
 <div className="text-xs font-bold text-center text-zinc-500 py-4 bg-zinc-100 border-2 border-dashed border-zinc-400">
 Kosong. Klik tombol Upload di atas!
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 pb-1">
 {availableGifs.map((gifPath, index) => {
 const fileName = gifPath.split('/').pop();
 return (
 <div 
 key={index}
 draggable
 onDragStart={(e) => {
 e.dataTransfer.setData('application/vidmix-gif', gifPath);
 e.dataTransfer.effectAllowed = 'copy';
 }}
 onClick={() => {
 const newLayer = { id: Date.now().toString(), type: 'sticker', name: fileName, src: gifPath, x: 50, y: 50, scale: 1, rotation: 0, zIndex: (videos.find(v => v.id === editingVideoId)?.layers.length || 0) + 1 };
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: [...v.layers, newLayer] } : v));
 setSelectedLayerId(newLayer.id);
 }}
 className="aspect-square bg-zinc-100 border-2 border-black hover:bg-[#00FF55] cursor-grab active:cursor-grabbing p-1 transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 group relative"
 title="Seret ke kanvas, atau klik untuk tambah"
 >
 <img src={`file://${gifPath}`} className="w-full h-full object-contain pointer-events-none" />
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Watermark Presets */}
 <div className="border-4 border-black bg-blue-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
 <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">Watermark Presets</h3>
 
 {(() => {
 const currentVideo = videos.find(v => v.id === editingVideoId);
 const wmLayer = currentVideo?.layers.find(l => l.type === 'watermark');
 
 return (
 <div className="flex flex-col gap-3">
 {wmLayer ? (
 <div className="relative border-2 border-black p-2 bg-zinc-100 flex flex-col items-center justify-center h-24 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group">
 <img src={`file://${wmLayer.src}`} className="max-h-full max-w-full object-contain" />
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
 <button 
 onClick={async () => {
 try {
 const result = await window.api.selectMediaFile();
 if (result && result.mediaType === 'photo') {
 setVideos(prev => prev.map(v => v.id === editingVideoId ? {
 ...v, layers: v.layers.map(l => l.id === wmLayer.id ? { ...l, src: result.path } : l)
 } : v));
 }
 } catch(e) {}
 }}
 className="bg-blue-500 text-white p-1 border-2 border-black hover:bg-blue-600 shadow-sm" title="Ubah Gambar"
 >
 <ImageIcon className="w-4 h-4" />
 </button>
 <button 
 onClick={() => {
 setVideos(prev => prev.map(v => v.id === editingVideoId ? {
 ...v, layers: v.layers.filter(l => l.id !== wmLayer.id)
 } : v));
 if (selectedLayerId === wmLayer.id) setSelectedLayerId(null);
 }}
 className="bg-red-500 text-white p-1 border-2 border-black hover:bg-red-600 shadow-sm" title="Hapus Watermark"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 ) : (
 <button 
 onClick={async () => {
 try {
 const result = await window.api.selectMediaFile();
 if (result && result.mediaType === 'photo') {
 const newLayer = { id: Date.now().toString(), type: 'watermark', name: `Watermark Utama`, src: result.path, x: 90, y: 10, scale: 0.3, rotation: 0, zIndex: 9000 + (currentVideo?.layers.length || 0) + 1 };
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: [...v.layers, newLayer] } : v));
 setSelectedLayerId(newLayer.id);
 }
 } catch(e) {}
 }}
 className="w-full bg-[#FFE500]-black font-bold border-2 border-black py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs"
 >
 + Tambah Watermark
 </button>
 )}

 <div className="grid grid-cols-2 gap-2">
 {[
 { label: 'Top Left', x: 10, y: 10 },
 { label: 'Top Right', x: 90, y: 10 },
 { label: 'Bottom Left', x: 10, y: 90 },
 { label: 'Bottom Right', x: 90, y: 90 }
 ].map(pos => (
 <button 
 key={pos.label}
 disabled={!wmLayer}
 onClick={() => {
 if (wmLayer) {
 setVideos(prev => prev.map(v => v.id === editingVideoId ? {
 ...v, layers: v.layers.map(l => l.id === wmLayer.id ? { ...l, x: pos.x, y: pos.y } : l)
 } : v));
 setSelectedLayerId(wmLayer.id);
 }
 }} 
 className={`p-2 text-[10px] font-bold flex items-center justify-center text-center border-2 border-black ${!wmLayer ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-60' : 'bg-zinc-100 hover:bg-[#00FF55]-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors'}`}
 >
 {pos.label}
 </button>
 ))}
 </div>
 </div>
 );
 })()}
 </div>

 {/* Layers List Panel */}
 <div className="border-4 border-black bg-green-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col shrink-0" style={{ minHeight: '300px' }}>
 <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1 flex justify-between items-center shrink-0">
 <span>Layers</span>
 <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">
 {videos.find(v => v.id === editingVideoId)?.layers?.length || 0}
 </span>
 </h3>
 <div className="flex-1 overflow-y-auto space-y-2 pr-1">
 {(() => {
 const sortedLayers = [...(videos.find(v => v.id === editingVideoId)?.layers || [])]
 .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Reverse order for UI (top layer first)
 
 return sortedLayers.map((layer, index) => {
 const isSelected = selectedLayerId === layer.id;
 const isDragOver = dragOverLayerIndex === index;
 const isDragged = draggedLayerIndex === index;
 
 return (
 <div
 key={layer.id}
 draggable
 onDragStart={(e) => {
 setDraggedLayerIndex(index);
 e.dataTransfer.effectAllowed = 'move';
 // Ghost image hack to prevent huge drag elements
 const dragIcon = document.createElement('div');
 e.dataTransfer.setDragImage(dragIcon, 0, 0);
 }}
 onDragOver={(e) => {
 e.preventDefault();
 setDragOverLayerIndex(index);
 }}
 onDragLeave={() => setDragOverLayerIndex(null)}
 onDrop={(e) => handleLayerDrop(e, index)}
 onDragEnd={() => {
 setDraggedLayerIndex(null);
 setDragOverLayerIndex(null);
 }}
 className={`w-full flex items-center gap-3 p-2 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left cursor-grab active:cursor-grabbing ${isDragged ? 'opacity-50 border-dashed border-black bg-zinc-200 ' : isSelected ? 'bg-[#00FF55] border-black' : 'bg-orange-400 border-black hover:bg-zinc-100 '} ${isDragOver ? 'border-t-4 border-t-blue-500' : ''}`}
 >
 {/* Reorder drag handle icon */}
 <div className="text-zinc-400 cursor-grab px-1" title="Drag to reorder">
 <GripVertical className="w-4 h-4 text-black" />
 </div>
 
 <div className="text-black shrink-0" onClick={() => setSelectedLayerId(layer.id)}>
 {layer.type === 'text' ? <Type className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
 </div>

 {editingLayerNameId === layer.id ? (
 <input 
 type="text"
 autoFocus
 defaultValue={layer.name || (layer.type === 'text' ? layer.content || 'Teks Element' : 'Media Element')}
 onBlur={(e) => {
 setEditingLayerNameId(null);
 setVideos(prev => prev.map(v => v.id === editingVideoId ? {
 ...v, 
 layers: v.layers.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l)
 } : v));
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.target.blur();
 }
 }}
 className="flex-1 min-w-0 text-xs font-bold text-black bg-purple-400 border-2 border-black px-1 outline-none"
 onClick={(e) => e.stopPropagation()}
 />
 ) : (
 <span 
 className="text-xs font-bold truncate flex-1 text-black cursor-pointer"
 onClick={() => setSelectedLayerId(layer.id)}
 onDoubleClick={(e) => {
 e.stopPropagation();
 setEditingLayerNameId(layer.id);
 }}
 title="Double click to rename"
 >
 {layer.name || (layer.type === 'text' ? layer.content || 'Teks Element' : 'Media Element')}
 </span>
 )}

 {/* Edit Name Button */}
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setEditingLayerNameId(layer.id);
 }}
 className="p-1 text-black opacity-50 hover:opacity-100 hover:bg-black hover:text-white border border-transparent hover:border-black rounded-sm"
 title="Rename Layer"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
 </button>
 </div>
 );
 });
 })()}
 {(!videos.find(v => v.id === editingVideoId)?.layers || videos.find(v => v.id === editingVideoId)?.layers.length === 0) && (
 <div className="text-center p-4 border-2 border-dashed border-black mt-2 text-zinc-600 text-xs font-bold">
 Belum ada elemen.
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Center Canvas */}
 <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
 <div className="w-full h-full flex items-center justify-center">
 <LayerCanvas 
 mediaPath={videos.find(v => v.id === editingVideoId)?.path}
 mediaType="video"
 layers={videos.find(v => v.id === editingVideoId)?.layers || []}
 setLayers={(newLayers) => {
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: typeof newLayers === 'function' ? newLayers(v.layers) : newLayers } : v));
 }}
 selectedLayerId={selectedLayerId}
 setSelectedLayerId={setSelectedLayerId}
 />
 </div>
 </div>
 
 {/* Right Properties Panel */}
 <div className="w-80 flex flex-col pb-2">
 {selectedLayerId ? (
 <div className="h-full border-4 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-y-auto">
 <LayerControlPanel 
 selectedLayerId={selectedLayerId}
 layers={videos.find(v => v.id === editingVideoId)?.layers || []}
 setLayers={(newLayers) => {
 setVideos(prev => prev.map(v => v.id === editingVideoId ? { ...v, layers: typeof newLayers === 'function' ? newLayers(v.layers) : newLayers } : v));
 }}
 setSelectedLayerId={setSelectedLayerId}
 />
 </div>
 ) : (
 <div className="h-full border-4 border-black bg-blue-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
 <div className="w-16 h-16 rounded-full bg-zinc-200 border-2 border-black flex items-center justify-center mb-4">
 <Settings className="w-8 h-8 text-black" />
 </div>
 <p className="text-lg font-black text-black">Pilih Elemen</p>
 <p className="text-sm font-bold mt-2 text-zinc-600">Klik sebuah teks atau gambar di kanvas untuk mengatur propertinya.</p>
 </div>
 )}
 </div>

 </div>
 </div>
 )}
 </>
 )}
 </div>
 );
}
