import React, { useState } from 'react';
import { FolderOpen, Play, RefreshCw, CheckCircle2, Settings, Music } from 'lucide-react';
import { showToast } from '../../utils/toast-helper';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Mixer({
  videos, setVideos,
  audios, setAudios,
  outputDir, setOutputDir,
  customName, setCustomName,
  loopPreset, setLoopPreset,
  customMinutes, setCustomMinutes,
  watermark, setWatermark,
  allowOverwrite, setAllowOverwrite,
  audioOrderType, setAudioOrderType,
  compressionLevel, setCompressionLevel,
  isProcessing, progressData, elapsedMs,
  isSuccess, setIsSuccess, lastSuccessFolder,
  handleSelectFolder, handleDrop, handleDragOver, handleGenerate
}) {
  const { t } = useLanguage();
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

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

  return (
    <>
      {/* Full-screen Render Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#FFE500] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
              <RefreshCw className="animate-spin w-8 h-8" />
              {t('renderingVideo')}
            </h2>
            <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-purple-400">
              {t('loadingDesc')}
            </p>
            
            <div className="border-4 border-black bg-yellow-400 h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {progressData && (
                <div 
                  className="absolute top-0 left-0 h-full w-full bg-[#00FF55] border-r-4 border-black animate-indeterminate" 
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
                {progressData ? `${t('loadingProcessing')} ${Math.round(progressData.percent)}%` : t('loadingPreparing')}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
              <span>{t('processingStatus')}</span>
              {progressData ? (
                <span>{t('runningTime')} {Math.floor(elapsedMs / 60000)}m {Math.floor((elapsedMs % 60000) / 1000)}s | VIDEO {progressData.currentVideo} / {progressData.totalVideos}</span>
              ) : (
                <span>{t('loadingPreparing')}</span>
              )}
            </div>

            <button 
              onClick={() => window.api.cancelRender()}
              className="mt-4 w-full border-4 border-black bg-red-500 hover:bg-red-600 text-white font-black py-2 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {t('cancelRender')}
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
              {t('successTitle')}
            </h2>
            <p className="font-bold text-base mb-6 border-l-4 border-black pl-3 py-2 bg-green-400">
              {t('successDesc')}
            </p>
            
            <button
              onClick={() => { window.api.openFolder(lastSuccessFolder); setIsSuccess(false); }}
              className="w-full py-4 font-black text-lg border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-6 h-6" /> {t('openFolder')}
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
            <h2 className="text-lg font-black mb-4 flex items-center justify-between border-b-4 border-black pb-2">
              <span className="flex items-center gap-2"><FolderOpen className="w-5 h-5"/> {t('sourceDirTitle')}</span>
              <button 
                onClick={() => {
                  setVideos([]);
                  setAudios([]);
                  showToast('Semua media berhasil dihapus!', 'success');
                }}
                className="bg-red-500 hover:bg-red-600 text-white border-2 border-black px-3 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                title={t('clearMediaTitle')}
              >
                {t('clearAllMedia')}
              </button>
            </h2>

            <div className="space-y-3">
              <div 
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, 'video')}
              >
                <label className="text-xs font-bold block mb-1">{t('selectVideoDrop')}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" readOnly value={videos.length > 0 ? `${videos.length} ${t('selectedMedia')}` : t('notSelected')} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder={t('dropFile')} />
                  <button onClick={() => handleSelectFolder('video')} className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">{t('selectBtn')}</button>
                </div>
                {videos.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {videos.map((vid, idx) => (
                      <div key={vid.id} className="flex items-center gap-2 bg-blue-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-black w-6 h-6 flex items-center justify-center text-xs bg-[#FFE500] border-2 border-black">{idx + 1}</div>
                        <div className="truncate flex-1 font-bold text-xs flex items-center gap-2" title={vid.path}>
                          <span className="truncate">{vid.path.split('\\').pop().split('/').pop()}</span>
                          {vid.layers && vid.layers.length > 0 && (
                            <span className="shrink-0 bg-[#00FF55]-black border border-black px-1 py-0.5 text-[9px] uppercase font-black" title="Sudah diedit">★ {t('edited')}</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setVideos(prev => prev.filter(v => v.id !== vid.id));
                            }}
                            title="Hapus Media"
                            className="bg-red-500 border-2 border-black px-2 py-1 text-xs font-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 hover:bg-red-600"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, 'audio')}
              >
                <label className="text-xs font-bold block mb-1">{t('selectAudioDrop')}</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={audios.length > 0 ? `${audios.length} ${t('selectedAudio')}` : t('notSelected')} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder={t('dropFile')} />
                  <button onClick={() => handleSelectFolder('audio')} className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">{t('selectBtn')}</button>
                </div>
              </div>

              <div
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, 'output')}
              >
                <label className="text-xs font-bold block mb-1">{t('outputFolderTitle')}</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={outputDir || t('notSelected')} className="w-full bg-zinc-100 border-2 border-black px-3 py-2 text-xs truncate font-bold" placeholder={t('dropFolder')} />
                  <button onClick={() => handleSelectFolder('output')} className="bg-[#7000FF] text-white border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">{t('selectBtn')}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Konfigurasi Nama & Preset Loop */}
          <div className="border-4 border-black bg-green-400 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
              <Settings className="w-5 h-5"/> {t('renderSettings')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold flex items-center gap-2 mb-1">
                  {t('outputNaming')}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customName} 
                    onChange={(e) => setCustomName(e.target.value)} 
                    className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-[#FFF9C4]" 
                  />
                  <button 
                    onClick={() => setAllowOverwrite(!allowOverwrite)}
                    title={t('overwriteTitle')}
                    className={`border-2 border-black px-3 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors whitespace-nowrap ${allowOverwrite ? 'bg-red-500 text-white' : 'bg-orange-400 '}`}
                  >
                    {allowOverwrite ? t('overwriteOn') : t('overwriteOff')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{t('loopPreset')}</label>
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
                  <label className="text-xs font-bold block mb-1">{t('customDuration')}</label>
                  <input 
                    type="number" 
                    value={customMinutes} 
                    onChange={(e) => setCustomMinutes(Number(e.target.value))} 
                    className="w-full border-2 border-black px-3 py-2 text-sm font-bold bg-yellow-400" 
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold flex items-center gap-2 mb-1">
                  {t('qualityCompression')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: t('highQuality'), desc: '~2-3 GB/jam' },
                    { id: 'medium', label: t('balanced'), desc: '~1-1.5 GB/jam' },
                    { id: 'high', label: t('smallSize'), desc: '~110-150 MB/jam' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCompressionLevel(lvl.id)}
                      className={`border-2 border-black py-2 px-1 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center ${compressionLevel === lvl.id ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-blue-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100'}`}
                    >
                      <span>{lvl.label}</span>
                      <span className={`text-[8px] font-bold mt-0.5 ${compressionLevel === lvl.id ? 'text-yellow-400' : 'text-zinc-900'}`}>{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-xs font-bold flex items-center gap-2 mb-1">
                    {t('hwAccel')}
                  </label>
                  <div className="w-full bg-zinc-200 border-2 border-black px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                    <span className="text-green-700">{t('autoDetect')}</span>
                  </div>
                </div>

                <div
                  onDragOver={handleDragOver} 
                  onDrop={(e) => handleDrop(e, 'watermark')}
                >
                  <label className="text-xs font-bold block mb-1">{t('selectWatermark')}</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={watermark ? t('logoPresent') : ''} placeholder={t('dropPng')} className="w-full bg-zinc-100 border-2 border-black px-2 py-2 text-[10px] truncate font-bold" />
                    <button onClick={() => handleSelectFolder('watermark')} className="bg-orange-400 border-2 border-black px-2 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs">{t('selectBtn')}</button>
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
              <Music className="w-5 h-5"/> {t('musicOrderSettings')}
            </h2>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setAudioOrderType('random')}
                className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'random' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-green-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                {t('shuffle')}
              </button>
              <button 
                onClick={() => setAudioOrderType('custom')}
                className={`flex-1 border-2 border-black py-2 text-xs font-black transition-all ${audioOrderType === 'custom' ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-orange-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                {t('customOrder')}
              </button>
            </div>

            {audioOrderType === 'random' ? (
              <div className="flex-1 mt-2">
                <div className="space-y-2 font-mono text-xs opacity-75">
                  <div className="bg-purple-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-purple-700">{customName} 1.mp4</span> → [ {t('randomOrder')} ]
                  </div>
                  <div className="bg-yellow-400 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-purple-700">{customName} 2.mp4</span> → [ {t('randomOrder')} ]
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 mt-2">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <p className="text-xs font-bold text-transparent select-none">-</p>
                  {audios.length > 0 && (
                    <button 
                      onClick={() => setAudios([])}
                      title={t('clearAllMusicTitle')}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 whitespace-nowrap font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                    >
                      {t('clearAll')}
                    </button>
                  )}
                </div>
                {audios.length === 0 ? (
                  <div className="text-xs italic text-zinc-600 bg-blue-400 /50 p-3 border-2 border-black border-dashed">{t('noMusic')}</div>
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
                        <div className="flex gap-2 items-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAudios(prev => prev.filter((_, i) => i !== idx));
                            }}
                            title="Hapus Musik"
                            className="bg-red-500 border-2 border-black w-6 h-6 flex items-center justify-center text-xs font-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 hover:bg-red-600"
                          >
                            X
                          </button>
                          <div className="text-xl px-2 font-black cursor-grab active:cursor-grabbing">
                            ≡
                          </div>
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
                <FolderOpen className="w-5 h-5" /> {t('openFolder')}
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
                    {progressData ? `${t('renderingVideo')} ${progressData.currentVideo}/${progressData.totalVideos} (${Math.round(progressData.percent)}%)` : t('preparing')}
                  </>
                ) : (
                  <>
                    <Play /> {t('startGenerate')}
                  </>
                )}
              </div>
            </button>
          </div>

        </div>

      </div>
    </>
  );
}
