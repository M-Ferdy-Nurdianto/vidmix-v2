import React, { useState, useRef } from 'react';

export default function LayerCanvas({ mediaPath, mediaType, layers, setLayers, selectedLayerId, setSelectedLayerId }) {
 const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
 const [draggingId, setDraggingId] = useState(null);

 const videoRef = useRef(null);
 const imageRef = useRef(null);
 const canvasRef = useRef(null);

 const handleVideoLoad = () => {
 if (videoRef.current) {
 setOriginalSize({
 width: videoRef.current.videoWidth,
 height: videoRef.current.videoHeight
 });
 }
 };

 const handleImageLoad = () => {
 if (imageRef.current) {
 setOriginalSize({
 width: imageRef.current.naturalWidth,
 height: imageRef.current.naturalHeight
 });
 }
 };

 const handlePointerDown = (e, layerId) => {
 e.stopPropagation();
 setSelectedLayerId(layerId);
 
 const layer = layers.find(l => l.id === layerId);
 if (!layer) return;

 // Watermark tidak boleh digeser-geser posisinya
 if (layer.type === 'watermark') return;

 setDraggingId(layerId);
 const startX = e.clientX;
 const startY = e.clientY;
 
 // Temukan nilai posisi (persen) awal
 const initialX = layer.x;
 const initialY = layer.y;
 
 const canvasRect = canvasRef.current.getBoundingClientRect();

 const handlePointerMove = (moveEvent) => {
 const deltaX = moveEvent.clientX - startX;
 const deltaY = moveEvent.clientY - startY;
 
 const deltaPercentX = (deltaX / canvasRect.width) * 100;
 const deltaPercentY = (deltaY / canvasRect.height) * 100;
 
 setLayers(prev => prev.map(l => {
 if (l.id === layerId) {
 return {
 ...l,
 x: initialX + deltaPercentX,
 y: initialY + deltaPercentY
 };
 }
 return l;
 }));
 };

 const handlePointerUp = () => {
 setDraggingId(null);
 window.removeEventListener('pointermove', handlePointerMove);
 window.removeEventListener('pointerup', handlePointerUp);
 };

 window.addEventListener('pointermove', handlePointerMove);
 window.addEventListener('pointerup', handlePointerUp);
 };

 const handleResizeDown = (e, layerId) => {
 e.stopPropagation();
 setSelectedLayerId(layerId);
 
 const layer = layers.find(l => l.id === layerId);
 if (!layer) return;
 const initialScale = layer.scale || 1;
 const startX = e.clientX;
 const startY = e.clientY;

 const handlePointerMove = (moveEvent) => {
 const deltaX = moveEvent.clientX - startX;
 const deltaY = moveEvent.clientY - startY; 
 // Rata-rata pergerakan ke bawah dan kanan menambah ukuran
 const scaleDelta = (deltaX + deltaY) * 0.005;
 const newScale = Math.max(0.1, Math.min(3, initialScale + scaleDelta));
 
 setLayers(prev => prev.map(l => l.id === layerId ? { ...l, scale: newScale } : l));
 };

 const handlePointerUp = () => {
 window.removeEventListener('pointermove', handlePointerMove);
 window.removeEventListener('pointerup', handlePointerUp);
 };

 window.addEventListener('pointermove', handlePointerMove);
 window.addEventListener('pointerup', handlePointerUp);
 };

 const handleDeleteLayer = (e, layerId) => {
 e.stopPropagation();
 setLayers(prev => prev.filter(l => l.id !== layerId));
 if (selectedLayerId === layerId) {
 setSelectedLayerId(null);
 }
 };

 const handleCanvasClick = (e) => {
 // Only deselect if the click is directly on the canvas, not on its children (layers)
 if (e.target === canvasRef.current || e.target === videoRef.current || e.target === imageRef.current) {
 setSelectedLayerId(null);
 }
 };

 const handleDuplicate = (e, layerId) => {
 e.stopPropagation();
 const layer = layers.find(l => l.id === layerId);
 if (layer) {
 const newLayer = { ...layer, id: Date.now().toString(), x: layer.x + 5, y: layer.y + 5, zIndex: layers.length + 1 };
 setLayers(prev => [...prev, newLayer]);
 setSelectedLayerId(newLayer.id);
 }
 };

 const handleReorder = (e, layerId, direction) => {
 e.stopPropagation();
 setLayers(prev => {
 const sorted = [...prev].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
 const index = sorted.findIndex(l => l.id === layerId);
 if (index === -1) return prev;

 if (direction === 'up' && index < sorted.length - 1) {
 const temp = sorted[index];
 sorted[index] = sorted[index + 1];
 sorted[index + 1] = temp;
 } else if (direction === 'down' && index > 0) {
 const temp = sorted[index];
 sorted[index] = sorted[index - 1];
 sorted[index - 1] = temp;
 } else {
 return prev;
 }

 return sorted.map((l, idx) => ({
 ...l,
 zIndex: l.type === 'watermark' ? 9000 + idx + 1 : idx + 1
 }));
 });
 };

 return (
 <div className="border-4 border-black bg-yellow-400 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-1 flex flex-col justify-center">
 <div 
 ref={canvasRef}
 onPointerDown={handleCanvasClick}
 onDragOver={(e) => {
 e.preventDefault(); // Diperlukan untuk mengizinkan drop
 }}
 onDrop={(e) => {
 e.preventDefault();
 const gifPath = e.dataTransfer.getData('application/vidmix-gif');
 if (gifPath && canvasRef.current) {
 const rect = canvasRef.current.getBoundingClientRect();
 // Hitung koordinat X dan Y dalam persentase (0-100) terhadap ukuran canvas
 const xPos = ((e.clientX - rect.left) / rect.width) * 100;
 const yPos = ((e.clientY - rect.top) / rect.height) * 100;
 
 const fileName = gifPath.split('/').pop();
 const newLayer = {
 id: Date.now().toString(),
 type: 'sticker',
 name: fileName,
 src: gifPath,
 x: xPos,
 y: yPos,
 scale: 1,
 rotation: 0,
 zIndex: (layers.length || 0) + 1
 };
 setLayers(prev => [...prev, newLayer]);
 setSelectedLayerId(newLayer.id);
 }
 }}
 className="w-full aspect-video bg-black relative flex items-center justify-center overflow-hidden border-4 border-black"
 >
 {!mediaPath ? (
 <div className="flex flex-col items-center font-bold">
 <span className="text-lg text-white">Belum ada media yang dipilih</span>
 </div>
 ) : (
 <>
 {mediaType === 'video' && (
 <video
 ref={videoRef}
 src={`file://${mediaPath}`}
 controls
 muted
 onLoadedMetadata={handleVideoLoad}
 className="w-full h-full object-contain"
 />
 )}
 {mediaType === 'photo' && (
 <img
 ref={imageRef}
 src={`file://${mediaPath}`}
 onLoad={handleImageLoad}
 className="w-full h-full object-contain"
 alt="Preview"
 />
 )}
 
 {/* Layers Rendering */}
 {layers && layers.map((layer) => {
 const isSelected = selectedLayerId === layer.id;
 const isDragging = draggingId === layer.id;
 const isHoveredClass = !isSelected && !isDragging ? 'hover:outline hover:outline-2 hover:outline-dashed hover:outline-yellow-400 hover:outline-offset-4' : '';
 const isDraggingClass = isDragging ? 'outline outline-2 outline-dashed outline-yellow-400 outline-offset-4' : '';
 const isSelectedClass = isSelected ? 'outline outline-4 outline-solid outline-[#00FF55] outline-offset-4' : '';
 
 return (
 <div
 key={layer.id}
 onPointerDown={(e) => handlePointerDown(e, layer.id)}
 style={{
 position: 'absolute',
 left: `${layer.x}%`,
 top: `${layer.y}%`,
 transform: `translate(-50%, -50%) scale(${layer.scale || 1}) rotate(${layer.rotation || 0}deg)`,
 zIndex: layer.zIndex || 10,
 }}
 className={`${layer.type !== 'watermark' ? 'cursor-move' : 'cursor-default'} select-none ${isSelectedClass} ${isDraggingClass} ${isHoveredClass}`}
 >
 {/* Floating Toolbar */}
 {isSelected && (
 <div 
 className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-blue-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1 z-50 pointer-events-auto"
 onPointerDown={(e) => e.stopPropagation()}
 >
 <button onClick={(e) => handleDuplicate(e, layer.id)} className="p-1.5 hover:bg-[#FFE500]-black active:translate-x-0.5 active:translate-y-0.5" title="Duplicate">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
 </button>
 <button onClick={(e) => handleReorder(e, layer.id, 'up')} className="p-1.5 hover:bg-[#00FF55]-black active:translate-x-0.5 active:translate-y-0.5" title="Bring Forward">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
 </button>
 <button onClick={(e) => handleReorder(e, layer.id, 'down')} className="p-1.5 hover:bg-[#00FF55]-black active:translate-x-0.5 active:translate-y-0.5" title="Send Backward">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
 </button>
 <div className="w-px h-6 bg-black mx-1"></div>
 <button onClick={(e) => handleDeleteLayer(e, layer.id)} className="p-1.5 bg-[#FF0000] hover:bg-red-600 border-2 border-transparent hover:border-black rounded-none text-white active:translate-x-0.5 active:translate-y-0.5" title="Delete">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
 </button>
 </div>
 )}

 {/* Resize Handle */}
 {isSelected && (
 <div
 onPointerDown={(e) => handleResizeDown(e, layer.id)}
 className="absolute -bottom-3 -right-3 w-5 h-5 bg-[#FFE500] border-4 border-black cursor-nwse-resize z-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
 />
 )}

 {/* Render Content Berdasarkan Tipe */}
 {layer.type === 'text' && (
 <div style={{ 
 color: layer.color || '#00F0FF', 
 fontSize: layer.fontSize || '24px', 
 fontWeight: layer.fontWeight || 'bold', 
 fontFamily: layer.fontFamily || 'Arial',
 fontStyle: layer.fontStyle || 'normal',
 textShadow: '2px 2px 0px rgba(0,0,0,1)', 
 whiteSpace: 'nowrap' 
 }}>
 {layer.content}
 </div>
 )}
 
 {['watermark', 'sticker', 'image'].includes(layer.type) && (
 <img 
 src={`file://${layer.src}`} 
 alt={layer.type} 
 className="pointer-events-none"
 style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'contain' }}
 draggable="false"
 />
 )}
 
 {layer.type === 'spectrum' && (
 <div className="opacity-90 pointer-events-none relative flex items-center justify-center">
 {layer.shape === 'circular' ? (
 <div className="relative" style={{ width: '160px', height: '160px' }}>
 {/* Circular spectrum ring */}
 <div 
 className={`absolute inset-0 rounded-full border-4 ${layer.colorMode === 'rainbow_running' ? 'animate-[spin_3s_linear_infinite]' : ''}`}
 style={{ 
 borderColor: 'transparent',
 background: layer.colorMode?.startsWith('rainbow')
 ? 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0088, #ff0000)'
 : `conic-gradient(from 0deg, ${layer.color || '#00F0FF'} 0%, transparent 30%, ${layer.color || '#00F0FF'} 50%, transparent 70%, ${layer.color || '#00F0FF'} 100%)`,
 WebkitMaskImage: 'radial-gradient(circle, transparent 55%, black 60%, black 95%, transparent 100%)',
 maskImage: 'radial-gradient(circle, transparent 55%, black 60%, black 95%, transparent 100%)'
 }}
 />
 {/* Animated bars around the circle */}
 {[...Array(24)].map((_, idx) => {
 const angle = (idx / 24) * 360;
 const barHeight = 10 + Math.random() * 25;
 return (
 <div
 key={idx}
 style={{
 position: 'absolute',
 left: 'calc(50% - 1.5px)',
 bottom: '50%',
 width: '3px',
 height: `${barHeight}px`,
 backgroundColor: layer.colorMode?.startsWith('rainbow')
 ? `hsl(${(idx / 24) * 360}, 100%, 60%)`
 : (layer.color || '#00F0FF'),
 transformOrigin: '50% 100%',
 transform: `rotate(${angle}deg) translateY(-38px)`,
 borderRadius: '2px',
 opacity: 0.8,
 animation: `pulse ${0.3 + Math.random() * 0.5}s infinite alternate`
 }}
 />
 );
 })}
 {/* Center image */}
 {layer.centerImage && (
 <div className="absolute inset-0 flex items-center justify-center z-10">
 <img 
 src={`file://${layer.centerImage}`} 
 alt="Center" 
 className="w-19 h-19 object-cover rounded-full border-2 border-white/30"
 />
 </div>
 )}
 </div>
 ) : (
 <div 
 className="flex items-end gap-0.5 overflow-hidden relative"
 style={{ height: '80px', width: '220px', justifyContent: 'center' }}
 >
 {/* More bars for a better representation of the actual spectrum */}
 {[...Array(24)].map((_, idx) => {
 const barColor = layer.colorMode?.startsWith('rainbow')
 ? `hsl(${(idx / 24) * 360}, 100%, 60%)`
 : (layer.color || '#00F0FF');
 return (
 <div 
 key={idx}
 style={{
 width: '4px',
 backgroundColor: barColor,
 height: `${Math.max(8, Math.random() * 100)}%`,
 borderRadius: '2px 2px 0 0',
 animation: `pulse ${0.3 + Math.random() * 0.7}s infinite alternate`,
 opacity: 0.9,
 boxShadow: `0 0 4px ${barColor}`
 }}
 />
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </>
 )}
 </div>
 
 {/* Dev preview for dimensions */}
 {mediaPath && (
 <div className="mt-4 text-xs font-black text-black bg-[#FFE500] border-2 border-black inline-block px-3 py-1 self-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
 UKURAN ASLI SUMBER: {originalSize.width}x{originalSize.height}
 </div>
 )}
 </div>
 );
}
