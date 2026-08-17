import React, { useState, useEffect } from 'react';
import { Film, Play, RefreshCw, Type, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import LayerCanvas from './LayerCanvas';
import LayerControlPanel from './LayerControlPanel';

export default function EditorView() {
  const [mediaPath, setMediaPath] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(null);

  useEffect(() => {
    window.api.onEditorRenderProgress((data) => {
      setRenderProgress(data);
    });
    return () => {
      window.api.removeEditorRenderProgress();
    };
  }, []);

  const handleSelectMedia = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result) {
        setMediaPath(result.path);
        setMediaType(result.mediaType);
        toast.success(`Media ${result.mediaType.toUpperCase()} terpilih!`);
      }
    } catch (e) {
      toast.error('Gagal memilih media.');
    }
  };

  const handleAddText = () => {
    const newLayer = {
      id: Date.now().toString(),
      type: 'text',
      content: 'Teks Baru',
      color: '#ffffff',
      fontSize: '48px',
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      zIndex: layers.length + 1
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleAddImage = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result && result.mediaType === 'photo') {
        const newLayer = {
          id: Date.now().toString(),
          type: result.path.toLowerCase().endsWith('.gif') ? 'sticker' : 'watermark',
          src: result.path,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
          zIndex: layers.length + 1
        };
        setLayers([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
      } else if (result && result.mediaType === 'video') {
        toast.error('Hanya gambar/GIF yang didukung sebagai layer saat ini.');
      }
    } catch (e) {
      toast.error('Gagal memilih gambar.');
    }
  };

  const handleRender = async () => {
    if (!mediaPath) {
      toast.error('Pilih media dasar terlebih dahulu!');
      return;
    }

    try {
      const outputPath = await window.api.selectOutputFile();
      if (!outputPath) return;

      setIsRendering(true);
      setRenderProgress(null);
      toast.loading('Sedang merender video (Editor)...', { id: 'editor-render' });

      await window.api.renderEditor({
        mediaPath,
        mediaType,
        layers,
        outputPath,
        durationSec: 10
      });

      toast.success('Render Selesai! Video tersimpan.', { id: 'editor-render' });
    } catch (err) {
      if (err.message.includes('RENDER_CANCELED')) {
        toast.error('Proses render editor dibatalkan.', { id: 'editor-render' });
      } else {
        toast.error(`Render gagal: ${err.message}`, { id: 'editor-render' });
      }
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  };

  const fileName = mediaPath ? mediaPath.split('\\').pop().split('/').pop() : null;

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Full-screen Render Overlay */}
      {isRendering && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#00F0FF] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
              <RefreshCw className="animate-spin w-8 h-8" />
              SEDANG MERENDER EDITOR...
            </h2>
            <p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-white">
              FFmpeg sedang memproses susunan layer Anda menjadi video utuh.
            </p>
            
            <div className="border-4 border-black bg-white h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {renderProgress && (
                <div 
                  className="absolute top-0 left-0 h-full bg-[#FFE500] transition-all duration-300 ease-out border-r-4 border-black" 
                  style={{ width: `${Math.min(Math.max(renderProgress.percent, 0), 100)}%` }} 
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
                {renderProgress ? `${Math.round(renderProgress.percent)}%` : 'MENYIAPKAN RENDER...'}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
              <span>STATUS: PROCESSING</span>
              <span>{renderProgress?.timemark || '00:00:00.00'}</span>
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

      {/* Top Action Bar */}
      <div className="flex gap-4">
        <button 
          onClick={handleRender}
          disabled={isRendering}
          className="flex-1 bg-[#00FF55] hover:bg-[#00CC44] border-4 border-black py-3 font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" /> RENDER VIDEO (EDITOR)
        </button>
      </div>

      <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-black mb-4 flex items-center justify-between border-b-4 border-black pb-2">
          <span className="flex items-center gap-2"><Film className="w-5 h-5"/> Panel Media Dasar</span>
          
          <div className="flex gap-2">
            <button onClick={handleAddText} className="text-xs bg-zinc-200 border-2 border-black px-3 py-1 font-bold flex items-center gap-1 hover:bg-[#FFE500] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">
              <Type className="w-3 h-3" /> Tambah Teks
            </button>
            <button onClick={handleAddImage} className="text-xs bg-zinc-200 border-2 border-black px-3 py-1 font-bold flex items-center gap-1 hover:bg-[#FF90E8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5">
              <ImageIcon className="w-3 h-3" /> Tambah Gambar/GIF
            </button>
          </div>
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1">Pilih Media Utama (Video / Foto)</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-zinc-100 border-2 border-black px-3 py-2 text-sm font-bold flex items-center justify-between">
                <span className="truncate mr-2">
                  {fileName ? fileName : 'Belum ada media terpilih...'}
                </span>
                {mediaType && (
                  <span className={`text-[10px] px-2 py-0.5 border-2 border-black font-black text-white ${mediaType === 'video' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                    {mediaType === 'video' ? 'VIDEO' : 'FOTO'}
                  </span>
                )}
              </div>
              <button 
                onClick={handleSelectMedia} 
                className="bg-[#00F0FF] border-2 border-black px-4 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-6 items-start flex-col xl:flex-row">
        <div className="flex-1 w-full xl:w-auto">
          <LayerCanvas 
            mediaPath={mediaPath}
            mediaType={mediaType}
            layers={layers}
            setLayers={setLayers}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
          />
        </div>
        
        {selectedLayerId && (
          <div className="w-full xl:w-80 shrink-0">
            <LayerControlPanel 
              selectedLayerId={selectedLayerId}
              layers={layers}
              setLayers={setLayers}
              setSelectedLayerId={setSelectedLayerId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
