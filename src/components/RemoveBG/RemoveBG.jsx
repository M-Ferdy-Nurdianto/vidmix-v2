import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, Wand2, Pipette, RotateCcw, ZoomIn, ZoomOut, Layers, ImageIcon, CheckCircle2, Loader2, X, Video } from "lucide-react";
import { showToast, playLoudSuccessSound } from '../../utils/toast-helper';
import { useLanguage } from '../../contexts/LanguageContext';

function colorDistance(r1,g1,b1,r2,g2,b2){return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);}

function floodFill(data,width,height,startX,startY,tolerance){
  const si=(startY*width+startX)*4;
  const targetR=data[si],targetG=data[si+1],targetB=data[si+2];
  const visited=new Uint8Array(width*height);
  const stack=[[startX,startY]];const removed=[];
  while(stack.length){const[x,y]=stack.pop();if(x<0||x>=width||y<0||y>=height)continue;const vi=y*width+x;if(visited[vi])continue;visited[vi]=1;const pi=vi*4;if(colorDistance(data[pi],data[pi+1],data[pi+2],targetR,targetG,targetB)>tolerance)continue;removed.push(vi);stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
  return removed;
}

function globalColorRemove(data,width,height,targetR,targetG,targetB,tolerance){
  const removed=[];
  for(let i=0;i<width*height;i++){const pi=i*4;if(colorDistance(data[pi],data[pi+1],data[pi+2],targetR,targetG,targetB)<=tolerance)removed.push(i);}
  return removed;
}

function featherEdge(alpha,width,height,radius){
  const result=new Uint8ClampedArray(alpha);if(radius<=0)return result;
  for(let y=0;y<height;y++){for(let x=0;x<width;x++){const i=y*width+x;if(alpha[i]===0)continue;let minDist=Infinity;for(let dy=-radius;dy<=radius;dy++){for(let dx=-radius;dx<=radius;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;if(alpha[ny*width+nx]===0){const d=Math.sqrt(dx*dx+dy*dy);minDist=Math.min(minDist,d);}}}if(minDist<radius)result[i]=Math.round((minDist/radius)*255);}}
  return result;
}

export default function RemoveBG(){
  const { t } = useLanguage();
  const[image,setImage]=useState(null);
  const[originalData,setOriginalData]=useState(null);
  const[currentData,setCurrentData]=useState(null);
  const[alphaMap,setAlphaMap]=useState(null);
  const[history,setHistory]=useState([]);
  const[isDragging,setIsDragging]=useState(false);
  const[isProcessing,setIsProcessing]=useState(false);
  const[mode,setMode]=useState("fill");
  const[tolerance,setTolerance]=useState(40);
  const[feather,setFeather]=useState(2);
  const[brushSize,setBrushSize]=useState(20);
  const[zoom,setZoom]=useState(0.5);
  const[isErasing,setIsErasing]=useState(false);
  const[pickedColor,setPickedColor]=useState({r:0, g:0, b:0});
  const[checkered,setCheckered]=useState(true);
  const[isDone,setIsDone]=useState(false);
  const[savedCount,setSavedCount]=useState(0);
  const[removeMethod,setRemoveMethod]=useState("global");
  const[isVideo,setIsVideo]=useState(false);
  const[videoPath,setVideoPath]=useState(null);
  const[videoProgress,setVideoProgress]=useState(0);
  const[videoStage,setVideoStage]=useState('');
  const canvasRef=useRef(null);const hiddenRef=useRef(null);const fileInputRef=useRef(null);
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem("vidmix_removeBgOutputDir") || "");
  useEffect(() => { localStorage.setItem("vidmix_removeBgOutputDir", outputDir); }, [outputDir]);

  useEffect(() => {
    if (window.api?.onRemoveVideoBgProgress) {
      window.api.onRemoveVideoBgProgress(({ percent, timemark }) => {
        setVideoProgress(percent);
        setVideoStage(timemark);
      });
      return () => { if (window.api?.removeRemoveVideoBgProgress) window.api.removeRemoveVideoBgProgress(); };
    }
  }, []);

  const drawCanvas=useCallback((data,w,h)=>{const canvas=canvasRef.current;if(!canvas||!data)return;canvas.width=w;canvas.height=h;canvas.getContext("2d").putImageData(new ImageData(data,w,h),0,0);},[]);
  useEffect(()=>{if(currentData&&image)drawCanvas(currentData,image.width,image.height);},[currentData,image,drawCanvas]);

  const loadImage=useCallback((file)=>{
    if(!file)return;
    const isVid = file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|webm)$/i);
    const isImg = file.type.startsWith("image/");
    if(!isVid && !isImg)return;
    
    const url=URL.createObjectURL(file);
    setIsVideo(isVid);
    setVideoPath(file.path);
    
    if (isVid) {
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadeddata = () => { vid.currentTime = 1; };
      vid.onseeked = () => {
        const canvas = hiddenRef.current;
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(vid, 0, 0);
        const data = ctx.getImageData(0, 0, vid.videoWidth, vid.videoHeight).data;
        const orig = new Uint8ClampedArray(data);
        const current = new Uint8ClampedArray(data);
        const alpha = new Uint8ClampedArray(vid.videoWidth * vid.videoHeight).fill(255);
        setOriginalData(orig); setCurrentData(current); setAlphaMap(alpha);
        setHistory([]); setIsDone(false); setPickedColor({r:0, g:0, b:0});
        setImage({ src: url, width: vid.videoWidth, height: vid.videoHeight, name: file.name });
        setZoom(0.5);
      };
    } else {
      const img=new Image();
      img.onload=()=>{const canvas=hiddenRef.current;canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,img.width,img.height).data;const orig=new Uint8ClampedArray(data);const current=new Uint8ClampedArray(data);const alpha=new Uint8ClampedArray(img.width*img.height).fill(255);setOriginalData(orig);setCurrentData(current);setAlphaMap(alpha);setHistory([]);setIsDone(false);setPickedColor({r:0, g:0, b:0});setImage({src:url,width:img.width,height:img.height,name:file.name});setZoom(0.5);};
      img.src=url;
    }
  },[]);

  const handleFileDrop=useCallback((e)=>{e.preventDefault();setIsDragging(false);const file=e.dataTransfer?.files?.[0]||e.target?.files?.[0];if(file)loadImage(file);},[loadImage]);

  const applyRemoval=useCallback((indices,featherRadius,data,alpha,w,h)=>{
    const newAlpha=new Uint8ClampedArray(alpha);for(const i of indices)newAlpha[i]=0;
    const finalAlpha=featherRadius>0?featherEdge(newAlpha,w,h,featherRadius):newAlpha;
    const newData=new Uint8ClampedArray(data.length);for(let i=0;i<w*h;i++){const pi=i*4;newData[pi]=data[pi];newData[pi+1]=data[pi+1];newData[pi+2]=data[pi+2];newData[pi+3]=finalAlpha[i];}
    return{newData,finalAlpha};
  },[]);

  const pushHistory=useCallback(()=>{setHistory(h=>[...h.slice(-9),{alpha:new Uint8ClampedArray(alphaMap),data:new Uint8ClampedArray(currentData)}]);},[alphaMap,currentData]);

  const handleCanvasClick=useCallback((e)=>{
    if(!image||!currentData||isProcessing)return;
    const canvas=canvasRef.current;const rect=canvas.getBoundingClientRect();
    const x=Math.floor((e.clientX-rect.left)/zoom);const y=Math.floor((e.clientY-rect.top)/zoom);
    if(x<0||x>=image.width||y<0||y>=image.height)return;
    if(mode==="picker"){const pi=(y*image.width+x)*4;setPickedColor({r:originalData[pi],g:originalData[pi+1],b:originalData[pi+2]});return;}
    if(mode==="fill"){
      pushHistory();setIsProcessing(true);
      const pi=(y*image.width+x)*4;
      const clickedColor = {r: originalData[pi], g: originalData[pi+1], b: originalData[pi+2]};
      setPickedColor(clickedColor);
      setTimeout(()=>{
        let indices;
        if(removeMethod==="smart"){indices=floodFill(originalData,image.width,image.height,x,y,tolerance);}
        else{indices=globalColorRemove(originalData,image.width,image.height,clickedColor.r,clickedColor.g,clickedColor.b,tolerance);}
        const{newData,finalAlpha}=applyRemoval(indices,feather,originalData,alphaMap,image.width,image.height);
        setCurrentData(newData);setAlphaMap(finalAlpha);setIsProcessing(false);
      },10);
    }
  },[image,currentData,isProcessing,zoom,mode,pickedColor,removeMethod,originalData,alphaMap,tolerance,feather,applyRemoval,pushHistory]);

  const applyBrush=useCallback((e)=>{
    if(!image||!currentData||!isErasing)return;
    const canvas=canvasRef.current;const rect=canvas.getBoundingClientRect();
    const cx=Math.floor((e.clientX-rect.left)/zoom);const cy=Math.floor((e.clientY-rect.top)/zoom);
    const r=Math.ceil(brushSize/2);const newAlpha=new Uint8ClampedArray(alphaMap);const newData=new Uint8ClampedArray(currentData);
    for(let dy=-r;dy<=r;dy++){for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=image.width||ny<0||ny>=image.height)continue;const i=ny*image.width+nx;newAlpha[i]=0;newData[i*4+3]=0;}}
    setAlphaMap(newAlpha);setCurrentData(newData);
  },[image,currentData,isErasing,zoom,brushSize,alphaMap]);

  const undo=useCallback(()=>{setHistory(h=>{if(!h.length)return h;const prev=h[h.length-1];setCurrentData(prev.data);setAlphaMap(prev.alpha);return h.slice(0,-1);});},[]);

  const reset=useCallback(()=>{if(!originalData||!image)return;const alpha=new Uint8ClampedArray(image.width*image.height).fill(255);setAlphaMap(alpha);setCurrentData(new Uint8ClampedArray(originalData));setHistory([]);setIsDone(false);},[originalData,image]);

  const autoRemoveBG=useCallback(()=>{
    if(!image||!originalData)return;pushHistory();setIsProcessing(true);
    setTimeout(()=>{
      const{width,height}=image;
      const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1],[Math.floor(width/2),0],[0,Math.floor(height/2)]];
      let rS=0,gS=0,bS=0;for(const[cx,cy]of corners){const pi=(cy*width+cx)*4;rS+=originalData[pi];gS+=originalData[pi+1];bS+=originalData[pi+2];}
      const r=rS/corners.length,g=gS/corners.length,b=bS/corners.length;
      setPickedColor({r: Math.round(r), g: Math.round(g), b: Math.round(b)});
      const indices=[];for(let i=0;i<width*height;i++){const pi=i*4;if(colorDistance(originalData[pi],originalData[pi+1],originalData[pi+2],r,g,b)<=tolerance)indices.push(i);}
      const{newData,finalAlpha}=applyRemoval(indices,feather,originalData,alphaMap,width,height);
      setCurrentData(newData);setAlphaMap(finalAlpha);setIsProcessing(false);setIsDone(true);
    },30);
  },[image,originalData,alphaMap,tolerance,feather,applyRemoval,pushHistory]);

  const savePNG=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const dataUrl=canvas.toDataURL("image/png");
    const baseName = image?.name?.replace(/\.[^.]+$/, "") || "Gambar";
    const safeName = baseName.replace(/[<>:"/\\|?*]/g, ' ').trim();
    const shortCode = Date.now().toString().slice(-4);
    const fileName = `Remove BG - ${safeName} - ${shortCode}.png`;
    const link=document.createElement("a");link.download=fileName;link.href=dataUrl;link.click();
    setSavedCount(c=>c+1);
  },[image]);

  const saveVideo=useCallback(async ()=>{
    if (!videoPath || !pickedColor) {
      showToast('Pilih warna background terlebih dahulu menggunakan Color Picker!', 'error');
      return;
    }
    
    let outputPath = '';
    if (outputDir) {
      const baseName = image?.name?.replace(/\.[^.]+$/, "") || "Video";
      const safeName = baseName.replace(/[<>:"/\|?*]/g, ' ').trim();
      const shortCode = Date.now().toString().slice(-4);
      outputPath = `${outputDir}\\Remove BG - ${safeName} - ${shortCode}.webm`;
    } else {
      outputPath = await window.api.selectOutputWebm();
      if (!outputPath) return;
    }
    
    setIsProcessing(true);
    setVideoProgress(0);
    setVideoStage('Memulai FFmpeg...');
    try {
      const hex = `#${pickedColor.r.toString(16).padStart(2,'0')}${pickedColor.g.toString(16).padStart(2,'0')}${pickedColor.b.toString(16).padStart(2,'0')}`;
      await window.api.removeVideoBg({
        videoPath,
        targetColorHex: hex,
        tolerance,
        feather,
        outputPath
      });
      playLoudSuccessSound();
      showToast('Video transparan berhasil disimpan!', 'success');
      setSavedCount(c=>c+1);
      if (window.api?.openFolder) window.api.openFolder(outputPath);
    } catch (e) {
      showToast('Gagal memproses video: ' + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [videoPath, pickedColor, tolerance, feather, outputDir, image]);

  const handleMouseDown=(e)=>{if(mode==="eraser"){pushHistory();setIsErasing(true);applyBrush(e);}else handleCanvasClick(e);};
  const handleMouseMove=(e)=>{if(mode==="eraser")applyBrush(e);};
  const handleMouseUp=()=>setIsErasing(false);

  useEffect(()=>{const handler=(e)=>{if(e.ctrlKey&&e.key==="z")undo();if(!e.ctrlKey&&e.key==="e")setMode("eraser");if(!e.ctrlKey&&e.key==="p")setMode("picker");if(!e.ctrlKey&&e.key==="f")setMode("fill");};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[undo]);

  const CHECKER=`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23ccc'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23ccc'/%3E%3Crect x='10' y='0' width='10' height='10' fill='%23fff'/%3E%3Crect x='0' y='10' width='10' height='10' fill='%23fff'/%3E%3C/svg%3E")`;
  const mBtn=(m)=>`flex items-center gap-2 px-4 py-2 font-black border-4 border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer ${mode===m?"bg-[#00FF55]":"bg-white"}`;

  return(
    <div className="flex flex-col gap-6 h-full p-6 bg-[#FF8800] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <span className="bg-[#FF3CAC] border-4 border-black text-white px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">✂</span>
            REMOVE BACKGROUND
          </h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Hapus background gambar → ekspor PNG transparan</p>
        </div>
        {savedCount>0&&<div className="flex items-center gap-2 bg-[#00FF55] border-4 border-black px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><CheckCircle2 className="w-5 h-5"/>{savedCount} file disimpan!</div>}
      </div>

      {!image?(
        <div className={`flex flex-col items-center justify-center border-4 border-black transition-all cursor-pointer h-80 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isDragging?"bg-[#00FF55]":"bg-[#00F0FF] hover:bg-[#00D0FF]"}`}
          onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} onDrop={handleFileDrop} onClick={()=>fileInputRef.current?.click()}>
          <div className="text-center select-none">
            <div className={`w-24 h-24 mx-auto mb-4 border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${isDragging?"bg-white scale-110":"bg-[#FF3CAC]"}`}>
              <Upload className="w-10 h-10 text-white" strokeWidth={3}/>
            </div>
            <p className="text-3xl font-black uppercase tracking-tight">{isDragging?"Lepas di sini!":"Drop gambar/video atau klik"}</p>
            <p className="text-sm font-black mt-2 px-4 py-1 bg-white border-2 border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">PNG · JPG · WEBP · MP4 · MOV</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileDrop}/>
        </div>
      ):(
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* Kiri: Tools & Settings (Scrollable) */}
          <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pr-2 pb-2">
            <div className="bg-yellow-400 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase mb-3 tracking-widest flex items-center gap-2 border-b-4 border-black pb-2"><Wand2 className="w-4 h-4"/> Tools</p>
              <div className="flex flex-col gap-2">
                <button className={mBtn("eraser")} onClick={()=>setMode("eraser")}><Trash2 className="w-4 h-4"/>Eraser<span className="ml-auto text-[10px] opacity-50">[E]</span></button>
                <button className={mBtn("picker")} onClick={()=>setMode("picker")}><Pipette className="w-4 h-4"/>Color Picker<span className="ml-auto text-[10px] opacity-50">[P]</span></button>
                <button className={mBtn("fill")} onClick={()=>setMode("fill")}><Wand2 className="w-4 h-4"/>Magic Fill<span className="ml-auto text-[10px] opacity-50">[F]</span></button>
              </div>
              {pickedColor&&<div className="mt-3 flex items-center gap-2 border-4 border-black p-2 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-6 h-6 border-2 border-black shrink-0" style={{background:`rgb(${pickedColor.r},${pickedColor.g},${pickedColor.b})`}}/>
                <span className="text-[10px] font-black truncate">rgb({pickedColor.r},{pickedColor.g},{pickedColor.b})</span>
              </div>}
            </div>

            {mode==="eraser"&&<div className="bg-pink-400 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase mb-3 flex items-center gap-2 border-b-4 border-black pb-2">🖌 Brush: {brushSize}px</p>
              <input type="range" min={4} max={120} value={brushSize} onChange={e=>setBrushSize(+e.target.value)} className="w-full accent-black"/>
            </div>}

            <div className="bg-[#00F0FF] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase mb-3 flex items-center gap-2 border-b-4 border-black pb-2">⚙ Settings</p>
              <div className="flex flex-col gap-3">
                <div><label className="text-xs font-bold">Toleransi: {tolerance}</label><input type="range" min={5} max={150} value={tolerance} onChange={e=>setTolerance(+e.target.value)} className="w-full accent-black"/></div>
                <div><label className="text-xs font-bold">Feather: {feather}px</label><input type="range" min={0} max={10} value={feather} onChange={e=>setFeather(+e.target.value)} className="w-full accent-black"/></div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Metode Hapus</label>
                  <div className="flex gap-1">
                    {[["smart","Smart"],["global","Global"]].map(([v,l])=>(<button key={v} onClick={()=>setRemoveMethod(v)} className={`flex-1 py-1 text-xs font-black border-2 border-black cursor-pointer transition-all ${removeMethod===v?"bg-[#00F0FF]":"bg-[#FFE500] hover:bg-[#E5CD00]"}`}>{l}</button>))}
                  </div>
                  <p className="text-[10px] bg-[#FFE500] border-2 border-black p-1 mt-2 font-black leading-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{removeMethod==="smart"?"Flood fill dari titik klik":"Hapus warna mirip"}</p>
                </div>
              </div>
            </div>

            {!isVideo && (
              <button onClick={autoRemoveBG} disabled={isProcessing} className="flex items-center justify-center gap-2 px-4 py-4 font-black border-4 border-black bg-[#FF3CAC] text-white text-sm transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none disabled:opacity-50 cursor-pointer">
                {isProcessing?<Loader2 className="w-5 h-5 animate-spin"/>:<Wand2 className="w-5 h-5"/>}AUTO REMOVE BG
              </button>
            )}
          </div>

          <div className="flex-1 bg-[#FF3CAC] border-4 border-black p-2 flex flex-col justify-center items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-75 overflow-hidden">
            <div className="border-4 border-black w-full aspect-video relative overflow-hidden flex items-center justify-center bg-[#1a1a2e]" style={{backgroundImage:checkered?CHECKER:"none", cursor:mode==="eraser"?"crosshair":mode==="picker"?"cell":"pointer"}}>
            {isProcessing&&<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"><div className="bg-[#00F0FF] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200"><h2 className="text-3xl font-black mb-4 flex items-center gap-3"><Loader2 className="w-8 h-8 animate-spin"/>{isVideo ? t('loadingProcessing') : t('loadingProcessing')}</h2><p className="font-bold text-sm mb-6 border-l-4 border-black pl-3 py-1 bg-white">{t('loadingDesc')}</p>{isVideo && <div className="border-4 border-black bg-white h-14 w-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><div className="absolute top-0 left-0 h-full bg-[#FF3CAC] border-r-4 border-black transition-all duration-300" style={{width: `${videoProgress}%`}}/><div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">{t('loadingProcessing')} {Math.round(videoProgress)}%</div></div>}<div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2"><span>STATUS: {isVideo ? 'FFMPEG' : 'CANVAS'}</span><span>{isVideo ? videoStage : 'WORKING'}</span></div></div></div>}
            
            <div className="m-auto" style={{ width: image.width * zoom, height: image.height * zoom, overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{transform:`scale(${zoom})`,transformOrigin:"top left",imageRendering:zoom>2?"pixelated":"auto",display:"block"}}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}/>
            </div>
            {isDone&&<div className="absolute top-3 right-3 bg-[#00FF55] border-4 border-black px-4 py-2 font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 pointer-events-none"><CheckCircle2 className="w-4 h-4"/>BG Removed!</div>}
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-mono px-2 py-1 pointer-events-none">{image.width} x {image.height}px · zoom {Math.round(zoom*100)}%</div>
            </div>
          </div>

          {/* Kanan: Actions & Export (Scrollable) */}
          <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pl-2 pb-2">
            <div className="bg-[#00FF55] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-xs uppercase mb-3 flex items-center gap-2 border-b-4 border-black pb-2">🔍 Zoom: {Math.round(zoom*100)}%</p>
              <div className="flex gap-1">
                <button onClick={()=>setZoom(z=>Math.max(0.1,+(z-0.1).toFixed(1)))} className="flex-1 flex items-center justify-center py-1 border-2 border-black bg-[#FFE500] hover:bg-[#E5CD00] cursor-pointer"><ZoomOut className="w-4 h-4"/></button>
                <button onClick={()=>setZoom(1)} className="flex-1 py-1 text-xs border-2 border-black bg-[#FFE500] hover:bg-[#E5CD00] font-black cursor-pointer">1:1</button>
                <button onClick={()=>setZoom(z=>Math.min(6,+(z+0.1).toFixed(1)))} className="flex-1 flex items-center justify-center py-1 border-2 border-black bg-[#FFE500] hover:bg-[#E5CD00] cursor-pointer"><ZoomIn className="w-4 h-4"/></button>
              </div>
            </div>

            <button onClick={()=>setCheckered(c=>!c)} className={`flex items-center justify-center gap-2 py-3 text-xs font-black border-4 border-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${checkered?"bg-white":"bg-zinc-200"}`}>
              <Layers className="w-5 h-5"/>{checkered?"Tutup Checkered BG":"Buka Checkered BG"}
            </button>

            <div className="flex flex-col gap-3">
              <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase">📁 Output Folder:</label>
                <div className="flex gap-1">
                  <input type="text" readOnly value={outputDir || 'Belum dipilih...'} className="w-full bg-zinc-100 border-2 border-black px-2 py-1 text-[10px] truncate font-bold outline-none cursor-not-allowed" placeholder="Pilih folder..." />
                  <button onClick={async () => { const folder = await window.api.selectFolder('output'); if (folder) setOutputDir(folder); }} className="px-2 py-1 bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black font-black text-[10px] transition-all whitespace-nowrap cursor-pointer">Pilih</button>
                </div>
              </div>
              <button onClick={undo} disabled={!history.length} className="flex items-center justify-center gap-2 py-3 font-black border-4 border-black bg-white text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none disabled:opacity-40 cursor-pointer transition-all"><RotateCcw className="w-5 h-5"/>UNDO<span className="text-[10px] opacity-50 ml-1">[Ctrl+Z]</span></button>
              <button onClick={reset} className="flex items-center justify-center gap-2 py-3 font-black border-4 border-black bg-[#FFE500] text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer transition-all"><X className="w-5 h-5"/>RESET</button>
              
              {!isVideo ? (
                <button onClick={savePNG} className="flex items-center justify-center gap-2 py-4 font-black border-4 border-black bg-[#00FF55] text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer transition-all"><Download className="w-5 h-5"/>SAVE PNG</button>
              ) : (
                <button onClick={saveVideo} className="flex items-center justify-center gap-2 py-4 font-black border-4 border-black bg-[#FF90E8] text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer transition-all"><Video className="w-5 h-5"/>SAVE VIDEO</button>
              )}
              <button onClick={()=>{setImage(null);setOriginalData(null);setCurrentData(null);setAlphaMap(null);setHistory([]);setIsDone(false);setIsVideo(false);setVideoPath(null); if(fileInputRef.current) fileInputRef.current.value='';}} className="flex items-center justify-center gap-2 py-3 font-black border-4 border-black bg-red-400 text-white text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer transition-all"><ImageIcon className="w-5 h-5"/>GANTI MEDIA</button>
            </div>

          </div>
        </div>
      )}

      <canvas ref={hiddenRef} style={{display:"none"}}/>

      {!image&&<div className="bg-[#B28DFF] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-xs uppercase mb-3 tracking-widest text-zinc-900 border-b-4 border-black pb-2">💡 Cara Penggunaan</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
          {[
            ["🪄 Auto Remove","Klik AUTO REMOVE BG untuk hapus background otomatis berdasarkan warna sudut gambar"],
            ["🎨 Smart Fill","Pilih Color Picker, klik warna BG, lalu ganti ke Magic Fill dan klik area background"],
            ["➖ Eraser Brush","Gunakan brush manual untuk hapus pixel sisa yang tidak terhapus otomatis"],
            ["📦 Export PNG","Klik SAVE PNG untuk download hasil dengan background transparan (alpha channel)"]
          ].map(([t,d])=>(
            <div key={t} className="border-4 border-black p-3 bg-[#FFE500] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><p className="font-black mb-1">{t}</p><p className="text-zinc-800 leading-relaxed font-normal">{d}</p></div>
          ))}
        </div>
      </div>}
    </div>
  );
}

