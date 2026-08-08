import React, { useState, useEffect } from 'react';
import { FolderOpen, Play, RefreshCw, Film, Music, CheckCircle2, AlertCircle, Settings, ChevronDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function App() {
  const [outputDir, setOutputDir] = useState('');
  
  const [videos, setVideos] = useState([]);
  const [audios, setAudios] = useState([]);
  
  const [customName, setCustomName] = useState('joji');
  const [loopPreset, setLoopPreset] = useState('15m');
  const [customMinutes, setCustomMinutes] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [renderStartTime, setRenderStartTime] = useState(null);
  const [watermark, setWatermark] = useState('');
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [audioOrderType, setAudioOrderType] = useState('random');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSuccessFolder, setLastSuccessFolder] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

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
          const limitedVideos = result.slice(0, 5);
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
    e.dataTransfer.effectAllowed = "move";
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
      const limitedVideos = filtered.slice(0, 5);
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
      toast.loading('Sedang merender & mengacak lagu (FFmpeg Engine)...', { id: 'render' });

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
        audioOrderType
      });

      setIsSuccess(true);
      setLastSuccessFolder(outputDir);
      toast.success('Render Selesai! Semua video telah disimpan.', { id: 'render' });
    } catch (e) {
      toast.error(e.message || 'Gagal melakukan render.', { id: 'render' });
    } finally {
      setIsProcessing(false);
      setProgressData(null);
      setRenderStartTime(null);
    }
  };

  const calculateETA = () => {
    if (!progressData || !renderStartTime || progressData.percent <= 0) return 'Menghitung...';
    
    // Hitung persentase keseluruhan dari semua video
    const overallPercent = ((progressData.currentVideo - 1) * 100 + progressData.percent) / progressData.totalVideos;
    if (overallPercent <= 0) return 'Menghitung...';

    const elapsedMs = Date.now() - renderStartTime;
    const totalEstMs = (elapsedMs / overallPercent) * 100;
    const remainingMs = totalEstMs - elapsedMs;

    if (remainingMs <= 0) return 'Hampir selesai...';

    const remainingMins = Math.floor(remainingMs / 60000);
    const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
    return `Estimasi Sisa Waktu: ${remainingMins}m ${remainingSecs}s`;
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-zinc-900 font-mono p-6 select-none">
      <Toaster position="top-right" />
      
      {/* Full-screen Render Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#FFE500] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
              <RefreshCw className="animate-spin w-8 h-8" />
              SEDANG MERENDER...
            </h2>
            <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-white">
              Proses *mixing* FFmpeg sedang berjalan. Proses ini mungkin memakan waktu agak lama. Mohon jangan menutup jendela ini.
            </p>
            
            <div className="border-4 border-black bg-white h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {progressData && (
                <div 
                  className="absolute top-0 left-0 h-full bg-[#00FF55] transition-all duration-300 ease-out border-r-4 border-black" 
                  style={{ width: `${Math.min(Math.max(progressData.percent, 0), 100)}%` }} 
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
                {progressData ? `${Math.round(progressData.percent)}%` : 'MENYIAPKAN RENDER...'}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
              <span>STATUS: PROCESSING</span>
              {progressData ? (
                <span>{calculateETA()} | VIDEO {progressData.currentVideo} / {progressData.totalVideos}</span>
              ) : (
                <span>MENYIAPKAN FFmpeg...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Success Overlay */}
      {isSuccess && !isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#00FF55] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setIsSuccess(false)}
              className="absolute top-4 right-4 bg-white border-2 border-black w-8 h-8 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              X
            </button>
            <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-10 h-10" />
              BERHASIL!
            </h2>
            <p className="font-bold text-base mb-6 border-l-4 border-black pl-3 py-2 bg-white">
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
      <div className="border-4 border-black bg-[#FFE500] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 flex justify-between items-center transform hover:-translate-y-0.5 transition-transform">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-2">
            <img src="/favicon-32x32.png" className="w-8 h-8" alt="Vidmix Logo" /> VIDMIX <span className="bg-black text-white px-2 py-0.5 text-sm">v2.0</span>
          </h1>
          <p className="text-xs font-bold mt-1">High-Speed FFmpeg Automation & Random Audio Mixer Engine</p>
        </div>
        <div className="bg-white border-2 border-black px-3 py-1 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Windows Native 🚀
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kolom Kiri: Direktori & Preset */}
        <div className="space-y-6">
          
          {/* Panel Folder Sources */}
          <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
              <FolderOpen className="w-5 h-5"/> Direktori Sumber Berkelanjutan
            </h2>

            <div className="space-y-3">
              <div 
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, 'video')}
              >
                <label className="text-xs font-bold block mb-1">Pilih Video (Bisa Drag & Drop)</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={videos.length > 0 ? `${videos.length} Video Terpilih` : 'Belum dipilih...'} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder="Tarik file ke sini..." />
                  <button onClick={() => handleSelectFolder('video')} className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">Pilih</button>
                </div>
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
          <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
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
                    className={`border-2 border-black px-3 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors whitespace-nowrap ${allowOverwrite ? 'bg-red-500 text-white' : 'bg-white'}`}
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
                      className={`border-2 border-black py-2 text-xs font-black uppercase transition-all ${loopPreset === preset ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
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
                    className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-white" 
                  />
                </div>
              )}

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
                className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'random' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                ACAK (SHUFFLE)
              </button>
              <button 
                onClick={() => setAudioOrderType('custom')}
                className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'custom' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                PILIH URUTAN
              </button>
            </div>

            {audioOrderType === 'random' ? (
              <div className="flex-1">
                <p className="text-xs font-bold mb-4">Setiap video akan memproses urutan musik yang berbeda secara otomatis (Algoritma Fisher-Yates).</p>
                <div className="space-y-2 font-mono text-xs opacity-75">
                  <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-purple-700">{customName} 1.mp4</span> $\rightarrow$ [ Urutan Acak ]
                  </div>
                  <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-purple-700">{customName} 2.mp4</span> $\rightarrow$ [ Urutan Acak ]
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-xs font-bold mb-2">Urutan Musik Kustom (Berlaku sama untuk semua video):</p>
                {audios.length === 0 ? (
                  <div className="text-xs italic text-zinc-600 bg-white/50 p-3 border-2 border-black border-dashed">Belum ada musik yang dipilih.</div>
                ) : (
                  <div className="overflow-y-auto pr-2 space-y-3 flex-1 pb-2 max-h-[350px]">
                    {audios.map((audioPath, idx) => (
                      <div 
                        key={audioPath + idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`flex items-center gap-3 bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-move transition-transform hover:-translate-y-0.5 ${draggedItemIndex === idx ? 'ring-2 ring-[#FF90E8]' : ''}`}
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
                    className="absolute top-0 left-0 h-full bg-[#00F0FF] z-0 transition-all duration-300 ease-out" 
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
  );
}
