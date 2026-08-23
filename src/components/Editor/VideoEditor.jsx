import React, { useState, useEffect } from 'react';
import { Film, Type, Image as ImageIcon, Activity, GripVertical, Trash2, Settings } from 'lucide-react';
import LayerCanvas from './LayerCanvas';
import LayerControlPanel from './LayerControlPanel';
import { showToast } from '../../utils/toast-helper';

export default function VideoEditor({
  videos,
  setVideos,
  editingVideoId,
  setEditingVideoId,
  setView
}) {
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [editingLayerNameId, setEditingLayerNameId] = useState(null);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState(null);
  const [dragOverLayerIndex, setDragOverLayerIndex] = useState(null);
  const [availableGifs, setAvailableGifs] = useState([]);

  useEffect(() => {
    if (editingVideoId) {
      const vid = videos.find(v => v.id === editingVideoId);
      if (vid && vid.path && /\.(jpg|jpeg|png|webp|bmp)$/i.test(vid.path)) {
        showToast("Foto tidak bisa diedit di sini, gunakan menu Foto ke Video", "error");
        setEditingVideoId(null);
        if (setView) setView('phototovideo');
      }
    }
  }, [editingVideoId, videos, setEditingVideoId, setView]);

  useEffect(() => {
    if (window.api && window.api.getGifs) {
      window.api.getGifs().then(gifs => setAvailableGifs(gifs));
    }
  }, []);

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

  if (!editingVideoId) return null;

  return (
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
              showToast("Edit berhasil disimpan!", "success");
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
                  const newLayer = { id: Date.now().toString(), type: 'text', content: 'Teks Baru', color: '#ffffff', fontSize: '48px', fontWeight: 'normal', fontStyle: 'normal', x: 50, y: 50, scale: 1, rotation: 0, zIndex: (videos.find(v => v.id === editingVideoId)?.layers.length || 0) + 1, fontFamily: 'Arial', textAlign: 'center' };
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
                    if (result) {
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
                              if (result) {
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
                          if (result) {
                            const newLayer = { id: Date.now().toString(), type: 'watermark', name: `Watermark Utama`, src: result.path, x: 90, y: 10, scale: 1, rotation: 0, zIndex: 9000 + (currentVideo?.layers.length || 0) + 1 };
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
  );
}
