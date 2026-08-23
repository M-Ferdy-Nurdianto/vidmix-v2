import React, { useState, useEffect } from 'react';
import { Film, Type, Image as ImageIcon, Play, RefreshCw, GripVertical, Trash2, Settings, FolderOpen, CheckCircle2 } from 'lucide-react';
import LayerCanvas from './LayerCanvas';
import LayerControlPanel from './LayerControlPanel';
import { showToast, playLoudSuccessSound } from '../../utils/toast-helper';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EditorView({ outputDir, handleSelectFolder, allowOverwrite }) {
  const { t } = useLanguage();
  const [mediaPath, setMediaPath] = useState(() => localStorage.getItem('vidmix_editor_mediaPath') || null);
  const [mediaType, setMediaType] = useState(() => localStorage.getItem('vidmix_editor_mediaType') || null);
  const [layers, setLayers] = useState(() => {
    try {
      const saved = localStorage.getItem('vidmix_editor_layers');
      return saved ? JSON.parse(saved) : [];
    } catch(e) {
      return [];
    }
  });

  useEffect(() => {
    if (mediaPath) localStorage.setItem('vidmix_editor_mediaPath', mediaPath);
    else localStorage.removeItem('vidmix_editor_mediaPath');
    
    if (mediaType) localStorage.setItem('vidmix_editor_mediaType', mediaType);
    else localStorage.removeItem('vidmix_editor_mediaType');
    
    localStorage.setItem('vidmix_editor_layers', JSON.stringify(layers));
  }, [mediaPath, mediaType, layers]);

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [editingLayerNameId, setEditingLayerNameId] = useState(null);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState(null);
  const [dragOverLayerIndex, setDragOverLayerIndex] = useState(null);
  const [availableGifs, setAvailableGifs] = useState([]);
  const [isRendering, setIsRendering] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [renderProgress, setRenderProgress] = useState(null);

  useEffect(() => {
    window.api.onEditorRenderProgress((data) => {
      setRenderProgress(data);
    });
    return () => {
      window.api.removeEditorRenderProgress();
    };
  }, []);

  useEffect(() => {
    if (window.api && window.api.getGifs) {
      window.api.getGifs().then(gifs => setAvailableGifs(gifs));
    }
  }, []);

  const handleSelectMedia = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result) {
        if (result.mediaType === 'photo') {
           showToast(t('editorPhotoNotSupported'), 'error');
           return;
        }
        setMediaPath(result.path);
        setMediaType('video');
        showToast(t('editorVideoSelected'), 'success');
      }
    } catch (e) {
      showToast('Gagal memilih media.', 'error');
    }
  };

  const handleLayerDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedLayerIndex === null || draggedLayerIndex === toIndex) return;

    const sortedLayers = [...layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const itemToMove = sortedLayers.splice(draggedLayerIndex, 1)[0];
    sortedLayers.splice(toIndex, 0, itemToMove);
    
    const newLayers = sortedLayers.map((l, index) => {
      const baseZIndex = sortedLayers.length - index;
      return {
        ...l,
        zIndex: l.type === 'watermark' ? 9000 + baseZIndex : baseZIndex
      };
    });
    setLayers(newLayers);
    
    setDraggedLayerIndex(null);
    setDragOverLayerIndex(null);
  };

  const handleRender = async () => {
    if (!mediaPath) {
      showToast(t('editorSelectMediaFirst'), 'error');
      return;
    }
    if (!outputDir) {
      showToast(t('editorSelectOutputFirst'), 'error');
      return;
    }

    try {
      const originalName = mediaPath.split(/[\\/]/).pop();
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      const suggestedFileName = `${nameWithoutExt}_edit.mp4`;
      
      const separator = outputDir.includes('\\') ? '\\' : '/';
      const outputPath = `${outputDir}${outputDir.endsWith(separator) ? '' : separator}${suggestedFileName}`;

      setIsRendering(true);
      setIsSuccess(false);
      setRenderProgress(null);

      await window.api.renderEditor({
        mediaPath,
        mediaType,
        layers,
        outputPath,
        allowOverwrite,
        durationSec: 10
      });

      playLoudSuccessSound();
      showToast(t('editorRenderSuccess') || 'Video Berhasil Dirender!', 'success');
      setIsSuccess(true);
    } catch (err) {
      if (err.message.includes('RENDER_CANCELED')) {
        showToast(t('editorRenderCanceled'), 'error');
      } else {
        showToast(`${t('editorRenderFailed')}${err.message}`, 'error');
      }
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  };

  const fileName = mediaPath ? mediaPath.split('\\').pop().split('/').pop() : null;

  return (
        <div className="flex flex-col gap-6 relative min-h-[70vh]">
      
      {/* Full-screen Render Overlay */}
      {isRendering && (
        <div className="fixed inset-0 z-99999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#FF90E8] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3 text-black">
              <RefreshCw className="animate-spin w-8 h-8" />
              {t('loadingProcessing') || 'PROCESSING...'}
            </h2>
            <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-white text-black">
              {t('loadingDesc')}
            </p>
            
            <div className="border-4 border-black bg-white h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div 
                className="absolute top-0 left-0 h-full bg-[#00F0FF] border-r-4 border-black transition-all duration-300 ease-out" 
                style={{ width: `${Math.min(Math.max(renderProgress ? renderProgress.percent : 0, 0), 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
                {renderProgress ? `${t('loadingProcessing')} ${Math.round(renderProgress.percent)}%` : t('editorPreparing')}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2 text-sm">
              <span>STATUS: FFmpeg</span>
              <span>{renderProgress?.timemark ? renderProgress.timemark : '00:00:00.00'}</span>
            </div>

            <button 
              onClick={() => window.api.cancelRender()}
              className="mt-4 w-full border-4 border-black bg-red-500 hover:bg-red-600 text-white font-black py-2 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase"
            >
              {t('cancelRender') || 'BATALKAN RENDER'}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen Success Overlay */}
      {isSuccess && !isRendering && (
        <div className="fixed inset-0 z-99999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#00FF55] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setIsSuccess(false)}
              className="absolute top-4 right-4 bg-blue-400 border-2 border-black w-8 h-8 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              X
            </button>
            <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-10 h-10" />
              {t('successTitle') || 'BERHASIL!'}
            </h2>
            <p className="font-bold text-base mb-6 border-l-4 border-black pl-3 py-2 bg-green-400">
              {t('editorRenderSuccess') || 'Video Berhasil Dirender!'}
            </p>
            
            <button
              onClick={() => { window.api.openFolder(outputDir); setIsSuccess(false); }}
              className="w-full py-4 font-black text-lg border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-6 h-6" /> {t('openFolder')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-31.25 gap-4">
        
        {/* Left Sidebar (Tools & Presets) */}
        <div className="w-72 flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
          
          {/* {t('editorAddElement')}t */}
          <div className="border-4 border-black bg-[#FF90E8] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">{t('editorAddElement')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  const newLayer = { id: Date.now().toString(), type: 'text', content: t('editorNewText'), color: '#ffffff', fontSize: '48px', fontWeight: 'normal', fontStyle: 'normal', x: 50, y: 50, scale: 1, rotation: 0, zIndex: layers.length + 1, fontFamily: 'Arial', textAlign: 'center' };
                  setLayers([...layers, newLayer]);
                  setSelectedLayerId(newLayer.id);
                }} 
                className="flex flex-col items-center justify-center gap-2 py-3 bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 font-bold"
              >
                <Type className="w-6 h-6" />
                <span className="text-xs">{t('editorText')}</span>
              </button>
              <button 
                onClick={async () => {
                  try {
                    const result = await window.api.selectMediaFile();
                    if (result) {
                      const newLayer = { id: Date.now().toString(), type: result.path.toLowerCase().endsWith('.gif') ? 'sticker' : 'image', src: result.path, x: 50, y: 50, scale: 1, rotation: 0, zIndex: layers.length + 1 };
                      setLayers([...layers, newLayer]);
                      setSelectedLayerId(newLayer.id);
                    }
                  } catch(e) {}
                }} 
                className="flex flex-col items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-200 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 font-bold"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">{t('editorImage')}</span>
              </button>
            </div>
          </div>

          {/* {t('editorStickerGif')} Panel */}
          <div className="border-4 border-black bg-yellow-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 max-h-56 flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
              <h3 className="font-black text-sm uppercase">{t('editorStickerGif')}</h3>
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
                  📁
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
              </div>
            </div>
            {availableGifs.length === 0 ? (
              <div className="text-xs font-bold text-center text-zinc-500 py-4 bg-zinc-100 border-2 border-dashed border-zinc-400">
                {t('editorEmptyFolder')}
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
                        const newLayer = { id: Date.now().toString(), type: 'sticker', name: fileName, src: gifPath, x: 50, y: 50, scale: 1, rotation: 0, zIndex: layers.length + 1 };
                        setLayers([...layers, newLayer]);
                        setSelectedLayerId(newLayer.id);
                      }}
                      className="aspect-square bg-zinc-100 border-2 border-black hover:bg-[#00FF55] cursor-pointer p-1 transition-colors flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 group relative"
                      title="Klik untuk tambah atau tarik ke canvas"
                    >
                      {gifPath.toLowerCase().match(/\.(mp4|mov|webm)$/) ? (
                        <video src={`file://${gifPath}`} autoPlay loop muted className="w-full h-full object-contain pointer-events-none" />
                      ) : (
                        <img src={`file://${gifPath}`} className="w-full h-full object-contain pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* {t('editorWatermarkPreset')}s */}
          <div className="border-4 border-black bg-blue-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">{t('editorWatermarkPreset')}</h3>
            
            {(() => {
              const wmLayer = layers.find(l => l.type === 'watermark');
              
              return (
                <div className="flex flex-col gap-3">
                  {wmLayer ? (
                    <>
                      <div className="relative border-2 border-black p-2 bg-zinc-100 flex flex-col items-center justify-center h-24 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group">
                        <img src={`file://${wmLayer.src}`} className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button 
                            onClick={async () => {
                              try {
                                const result = await window.api.selectMediaFile();
                                if (result) {
                                  setLayers(layers.map(l => l.id === wmLayer.id ? { ...l, src: result.path } : l));
                                }
                              } catch(e) {}
                            }}
                            className="bg-blue-500 text-white p-1 border-2 border-black hover:bg-blue-600 shadow-sm" title={t('editorChangeImage')}
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setLayers(layers.filter(l => l.id !== wmLayer.id));
                              if (selectedLayerId === wmLayer.id) setSelectedLayerId(null);
                            }}
                            className="bg-red-500 text-white p-1 border-2 border-black hover:bg-red-600 shadow-sm" title={t('editorDeleteWatermark')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button 
                          onClick={() => setLayers(layers.map(l => l.id === wmLayer.id ? { ...l, x: 10, y: 10 } : l))}
                          className="border-2 border-black bg-zinc-100 py-1 text-sm font-black hover:bg-[#FFE500] hover:-translate-y-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          title="Kiri Atas"
                        >
                          ↖
                        </button>
                        <button 
                          onClick={() => setLayers(layers.map(l => l.id === wmLayer.id ? { ...l, x: 90, y: 10 } : l))}
                          className="border-2 border-black bg-zinc-100 py-1 text-sm font-black hover:bg-[#FFE500] hover:-translate-y-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          title="Kanan Atas"
                        >
                          ↗
                        </button>
                        <button 
                          onClick={() => setLayers(layers.map(l => l.id === wmLayer.id ? { ...l, x: 10, y: 90 } : l))}
                          className="border-2 border-black bg-zinc-100 py-1 text-sm font-black hover:bg-[#FFE500] hover:-translate-y-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          title="Kiri Bawah"
                        >
                          ↙
                        </button>
                        <button 
                          onClick={() => setLayers(layers.map(l => l.id === wmLayer.id ? { ...l, x: 90, y: 90 } : l))}
                          className="border-2 border-black bg-zinc-100 py-1 text-sm font-black hover:bg-[#FFE500] hover:-translate-y-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          title="Kanan Bawah"
                        >
                          ↘
                        </button>
                      </div>
                    </>
                  ) : (
                    <button 
                      onClick={async () => {
                        try {
                          const result = await window.api.selectMediaFile();
                          if (result) {
                            const newLayer = { id: Date.now().toString(), type: 'watermark', name: 'Watermark Utama', src: result.path, x: 90, y: 10, scale: 1, rotation: 0, zIndex: 9000 + layers.length + 1 };
                            setLayers([...layers, newLayer]);
                            setSelectedLayerId(newLayer.id);
                          }
                        } catch(e) {}
                      }}
                      className="w-full bg-[#FFE500] text-black font-bold border-2 border-black py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs"
                    >
                      {t('editorAddWatermarkBtn')}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Layers List Panel */}
          <div className="border-4 border-black bg-green-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col shrink-0 flex-1">
            <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1 flex justify-between items-center shrink-0">
              <span>{t('editorLayers')}</span>
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">
                {layers.length}
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-37.5">
              {(() => {
                const sortedLayers = [...layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Reverse order for UI
                
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
                          defaultValue={layer.name || (layer.type === 'text' ? layer.content || t('editorText') : t('editorBaseMedia'))}
                          onBlur={(e) => {
                            setEditingLayerNameId(null);
                            setLayers(layers.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
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
                          {layer.name || (layer.type === 'text' ? layer.content || t('editorText') : t('editorBaseMedia'))}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
              {layers.length === 0 && (
                <div className="text-center p-4 border-2 border-dashed border-black mt-2 text-zinc-600 text-xs font-bold">
                  {t('editorNoElements')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Main Area (Canvas + Bottom Controls) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">
          
          {/* Center Canvas */}
          <div className="flex-1 flex items-center justify-center border-4 border-black bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <LayerCanvas 
              mediaPath={mediaPath}
              mediaType={mediaType}
              layers={layers}
              setLayers={setLayers}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={setSelectedLayerId}
            />
          </div>

          {/* Bottom Controls Panel */}
          <div className="flex gap-4 shrink-0">
            {/* {t('editorBaseMedia')} */}
            <div className="flex-1 border-4 border-black bg-purple-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">{t('editorBaseMedia')}</h3>
              <div className="flex flex-col gap-2">
                <div className="bg-zinc-100 border-2 border-black px-3 py-2 text-xs font-bold flex items-center justify-between">
                  <span className="truncate mr-2">
                    {fileName ? fileName : t('editorNoMedia')}
                  </span>
                </div>
                <button 
                  onClick={handleSelectMedia} 
                  className="w-full bg-[#00F0FF] hover:bg-[#00D0FF] border-2 border-black py-2 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs"
                >
                  {t('editorSelectBaseVideo')}
                </button>
              </div>
            </div>

            {/* Folder Output */}
            <div className="flex-1 border-4 border-black bg-orange-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black text-sm mb-3 uppercase border-b-2 border-black pb-1">{t('editorOutputDirectory')}</h3>
              <div className="flex flex-col gap-2">
                <div className="bg-zinc-100 border-2 border-black px-3 py-2 text-xs font-bold flex items-center justify-between" title={outputDir}>
                  <span className="truncate mr-2">
                    {outputDir ? (outputDir.length > 25 ? '...' + outputDir.slice(-25) : outputDir) : t('editorNoFolder')}
                  </span>
                </div>
                <button 
                  onClick={() => handleSelectFolder('output')} 
                  className="w-full bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black py-2 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs"
                >
                  {t('editorSelectOutputFolder')}
                </button>
              </div>
            </div>

            {/* Export */}
            <div className="flex-1 flex items-stretch">
              <button 
                onClick={handleRender}
                disabled={isRendering || !mediaPath}
                className="w-full h-full bg-[#00FF55] hover:bg-[#00CC44] border-4 border-black font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-8 h-8" /> 
                <span>{t('editorRenderVideoBtn')}</span>
              </button>
            </div>
          </div>

        </div>
        
        {/* Right Properties Panel */}
        <div className="w-80 flex flex-col shrink-0">
          {selectedLayerId ? (
            <div className="h-full border-4 border-black bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-y-auto">
              <LayerControlPanel 
                selectedLayerId={selectedLayerId}
                layers={layers}
                setLayers={setLayers}
                setSelectedLayerId={setSelectedLayerId}
              />
            </div>
          ) : (
            <div className="h-full border-4 border-black bg-blue-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-zinc-700 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-200 border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Settings className="w-8 h-8 text-black" />
              </div>
              <p className="text-lg font-black text-black">{t('editorSelectElement')}</p>
              <p className="text-sm font-bold mt-2 text-black">{t('editorSelectElementDesc')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
