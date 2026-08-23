import React from 'react';
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export default function LayerControlPanel({ selectedLayerId, layers, setLayers, setSelectedLayerId }) {
 if (!selectedLayerId) return null;

 const layer = layers.find(l => l.id === selectedLayerId);
 if (!layer) return null;

 const updateLayer = (updates) => {
 setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l));
 };

 const handleDelete = () => {
 setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
 setSelectedLayerId(null);
 };

 return (
 <div className="bg-green-400 p-5 flex-1 min-w-75 text-black">
 <h2 className="text-lg font-black mb-6 border-b-4 border-black pb-3 flex items-center justify-between">
 <span>PROPERTIES</span>
 <span className="text-[10px] bg-black px-2 py-1 text-white font-mono uppercase font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 {layer.type}
 </span>
 </h2>
 
 <div className="space-y-6">
 {/* Kontrol Khusus Text */}
 {layer.type === 'text' && (
 <>
 <div>
 <label className="text-xs font-black uppercase block mb-2">Text Content</label>
 <textarea 
 value={layer.content || ''} 
 onChange={(e) => updateLayer({ content: e.target.value })}
 className="w-full bg-zinc-100 border-4 border-black px-3 py-2 text-sm text-black font-bold focus:outline-none focus:bg-[#FFE500] min-h-15 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors" 
 />
 </div>

 <div>
 <label className="text-xs font-black uppercase block mb-2">Font Family</label>
 <select 
 value={layer.fontFamily || 'Arial'} 
 onChange={(e) => updateLayer({ fontFamily: e.target.value })}
 className="w-full bg-zinc-100 border-4 border-black px-3 py-2 text-sm text-black font-bold focus:outline-none focus:bg-[#FFE500] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors cursor-pointer appearance-none"
 >
 <option value="Arial">Arial</option>
 <option value="Calibri">Calibri</option>
 <option value="Cambria">Cambria</option>
 <option value="Comic Sans MS">Comic Sans MS</option>
 <option value="Consolas">Consolas</option>
 <option value="Courier New">Courier New</option>
 <option value="Georgia">Georgia</option>
 <option value="Impact">Impact</option>
 <option value="Lucida Console">Lucida Console</option>
 <option value="Segoe UI">Segoe UI</option>
 <option value="Tahoma">Tahoma</option>
 <option value="Times New Roman">Times New Roman</option>
 <option value="Trebuchet MS">Trebuchet MS</option>
 <option value="Verdana">Verdana</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-black uppercase block mb-2">Text Align</label>
 <div className="flex gap-2">
 <button 
 onClick={() => updateLayer({ textAlign: 'left' })}
 className={`flex-1 flex justify-center items-center py-2 border-4 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none active:bg-black active:text-white ${layer.textAlign === 'left' ? 'bg-[#FFE500]' : 'bg-zinc-100'}`}
 >
 <AlignLeft size={18} />
 </button>
 <button 
 onClick={() => updateLayer({ textAlign: 'center' })}
 className={`flex-1 flex justify-center items-center py-2 border-4 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none active:bg-black active:text-white ${(!layer.textAlign || layer.textAlign === 'center') ? 'bg-[#FFE500]' : 'bg-zinc-100'}`}
 >
 <AlignCenter size={18} />
 </button>
 <button 
 onClick={() => updateLayer({ textAlign: 'right' })}
 className={`flex-1 flex justify-center items-center py-2 border-4 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none active:bg-black active:text-white ${layer.textAlign === 'right' ? 'bg-[#FFE500]' : 'bg-zinc-100'}`}
 >
 <AlignRight size={18} />
 </button>
 <button 
 onClick={() => updateLayer({ textAlign: 'justify' })}
 className={`flex-1 flex justify-center items-center py-2 border-4 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none active:bg-black active:text-white ${layer.textAlign === 'justify' ? 'bg-[#FFE500]' : 'bg-zinc-100'}`}
 title="Justify (Rendered as Left in Video)"
 >
 <AlignJustify size={18} />
 </button>
 </div>
 </div>
 
 <div className="flex gap-4">
 <div className="flex-1">
 <label className="text-xs font-black uppercase block mb-2">Style</label>
 <div className="flex gap-2">
 <button
 onClick={() => updateLayer({ fontWeight: layer.fontWeight === 'bold' ? 'normal' : 'bold' })}
 className={`p-2 border-4 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.fontWeight === 'bold' ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 <Bold className="w-5 h-5" />
 </button>
 <button
 onClick={() => updateLayer({ fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' })}
 className={`p-2 border-4 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.fontStyle === 'italic' ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 <Italic className="w-5 h-5" />
 </button>
 </div>
 </div>
 
 <div className="flex-1">
 <label className="text-xs font-black uppercase block mb-2">Color</label>
 <div className="flex gap-2 items-center bg-zinc-100 border-4 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 <input 
 type="color" 
 value={layer.color || '#ffffff'} 
 onChange={(e) => updateLayer({ color: e.target.value })}
 className="w-8 h-8 cursor-pointer bg-transparent border-0" 
 />
 <input 
 type="text" 
 value={layer.color || '#ffffff'} 
 onChange={(e) => updateLayer({ color: e.target.value })}
 className="flex-1 bg-transparent border-0 px-1 text-xs text-black font-bold uppercase focus:outline-none w-full" 
 />
 </div>
 </div>
 </div>
 </>
 )}

 {/* Kontrol Khusus Spectrum */}
 {layer.type === 'spectrum' && (
 <>
 <div>
 <label className="text-xs font-black uppercase block mb-2">Bentuk Spektrum</label>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => updateLayer({ shape: 'linear' })}
 className={`py-2 border-4 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.shape === 'linear' || !layer.shape ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 LURUS
 </button>
 <button
 onClick={() => updateLayer({ shape: 'circular' })}
 className={`py-2 border-4 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.shape === 'circular' ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 BULAT
 </button>
 </div>
 </div>

 <div>
 <label className="text-xs font-black uppercase block mb-2">Tipe Warna (Color Mode)</label>
 <div className="grid grid-cols-3 gap-2 mb-2">
 <button
 onClick={() => updateLayer({ colorMode: 'solid' })}
 className={`py-1 text-xs border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${!layer.colorMode || layer.colorMode === 'solid' ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 SOLID
 </button>
 <button
 onClick={() => updateLayer({ colorMode: 'rainbow_running' })}
 className={`py-1 text-[10px] border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.colorMode === 'rainbow_running' ? 'bg-[#FFE500]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 RAINBOW RUNNING
 </button>
 <button
 onClick={() => updateLayer({ colorMode: 'rainbow_linear' })}
 className={`py-1 text-[10px] border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-colors ${layer.colorMode === 'rainbow_linear' ? 'bg-[#FF90E8]' : 'bg-zinc-100 hover:bg-zinc-200 '}`}
 >
 RAINBOW LINEAR
 </button>
 </div>
 </div>

 {(!layer.colorMode || layer.colorMode === 'solid') && (
 <div>
 <label className="text-xs font-black uppercase block mb-2">Warna Utama</label>
 <div className="flex gap-2 items-center bg-zinc-100 border-4 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2">
 <input 
 type="color" 
 value={layer.color || '#ffffff'} 
 onChange={(e) => updateLayer({ color: e.target.value })}
 className="w-8 h-8 cursor-pointer bg-transparent border-0" 
 />
 <input 
 type="text" 
 value={layer.color || '#ffffff'} 
 onChange={(e) => updateLayer({ color: e.target.value })}
 className="flex-1 bg-transparent border-0 px-1 text-xs text-black font-bold uppercase focus:outline-none w-full" 
 />
 </div>
 <div className="flex gap-2">
 {['#ffffff', '#00ff55', '#ff0000', '#ffe500', '#ff90e8', '#0000ff'].map(c => (
 <button 
 key={c}
 onClick={() => updateLayer({ color: c })}
 className="w-6 h-6 border-2 border-black rounded-full cursor-pointer hover:scale-110 transition-transform"
 style={{ backgroundColor: c }}
 />
 ))}
 </div>
 </div>
 )}

 {layer.shape === 'circular' && (
 <div>
 <label className="text-xs font-black uppercase block mb-2">Foto Tengah (Opsional)</label>
 {layer.centerImage ? (
 <div className="flex flex-col gap-2">
 <img src={`file://${layer.centerImage}`} alt="Center" className="w-16 h-16 object-cover rounded-full border-4 border-black mx-auto" />
 <button 
 onClick={() => updateLayer({ centerImage: null })}
 className="text-xs font-bold bg-red-500 text-white py-1 border-2 border-black"
 >
 Hapus Foto
 </button>
 </div>
 ) : (
 <button 
 onClick={async () => {
 if (window.api && window.api.selectMediaFile) {
 try {
 const res = await window.api.selectMediaFile();
 if (res && res.mediaType === 'photo') {
 updateLayer({ centerImage: res.path });
 }
 } catch (e) {}
 }
 }}
 className="w-full bg-[#FFE500]-black font-bold border-2 border-black py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs"
 >
 + PILIH FOTO
 </button>
 )}
 </div>
 )}
 </>
 )}

 {/* Kontrol Umum (Scale & Rotation) */}
 <div className="bg-zinc-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-6">
 <div className="mb-4">
 <label className="text-xs font-black uppercase flex justify-between mb-2">
 <span>Scale</span>
 <span className="text-black">{layer.scale?.toFixed(2) || '1.00'}x</span>
 </label>
 <input 
 type="range" 
 min="0.1" 
 max="3" 
 step="0.05"
 value={layer.scale || 1} 
 onChange={(e) => updateLayer({ scale: parseFloat(e.target.value) })}
 className="w-full accent-[#00FF55] h-2 bg-black appearance-none cursor-pointer border-2 border-black" 
 />
 </div>

 <div>
 <label className="text-xs font-black uppercase flex justify-between mb-2">
 <span>Rotation</span>
 <span className="text-black">{layer.rotation || 0}°</span>
 </label>
 <input 
 type="range" 
 min="-180" 
 max="180" 
 step="1"
 value={layer.rotation || 0} 
 onChange={(e) => updateLayer({ rotation: parseInt(e.target.value) })}
 className="w-full accent-[#00FF55] h-2 bg-black appearance-none cursor-pointer border-2 border-black" 
 />
 </div>
 </div>
 </div>
 
 <button 
 onClick={handleDelete}
 className="w-full mt-8 py-3 text-sm font-black bg-[#FF0000] text-white border-4 border-black hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform flex items-center justify-center gap-2"
 >
 <Trash2 className="w-5 h-5" /> HAPUS ELEMEN
 </button>
 </div>
 );
}
