import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Square, Download, Settings, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SpectrumGenerator() {
  const [audioPath, setAudioPath] = useState('');
  const [audioName, setAudioName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [shape, setShape] = useState('linear');
  const [colorMode, setColorMode] = useState('solid');
  const [solidColor, setSolidColor] = useState('#00FF55');
  const [particles, setParticles] = useState(false);
  const [alignment, setAlignment] = useState('left');
  const [centerImagePath, setCenterImagePath] = useState('');
  
  // Advanced Settings
  const [smoothing, setSmoothing] = useState(0.8);
  const [minDecibels, setMinDecibels] = useState(-90);
  const [maxDecibels, setMaxDecibels] = useState(-10);
  const [heightScale, setHeightScale] = useState(1.0);
  const [barThickness, setBarThickness] = useState(1.0);
  const [barGap, setBarGap] = useState(2);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const centerImgObjRef = useRef(null);
  const audioElementRef = useRef(null);
  
  // Refs to allow dynamic reading inside requestAnimationFrame without restart
  const shapeRef = useRef(shape);
  const colorModeRef = useRef(colorMode);
  const solidColorRef = useRef(solidColor);
  const particlesRef = useRef(particles);
  const alignmentRef = useRef(alignment);
  const smoothingRef = useRef(smoothing);
  const minDecibelsRef = useRef(minDecibels);
  const maxDecibelsRef = useRef(maxDecibels);
  const heightScaleRef = useRef(heightScale);
  const barThicknessRef = useRef(barThickness);
  const barGapRef = useRef(barGap);
  
  useEffect(() => { shapeRef.current = shape; }, [shape]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);
  useEffect(() => { solidColorRef.current = solidColor; }, [solidColor]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { alignmentRef.current = alignment; }, [alignment]);
  useEffect(() => { smoothingRef.current = smoothing; }, [smoothing]);
  useEffect(() => { minDecibelsRef.current = minDecibels; }, [minDecibels]);
  useEffect(() => { maxDecibelsRef.current = maxDecibels; }, [maxDecibels]);
  useEffect(() => { heightScaleRef.current = heightScale; }, [heightScale]);
  useEffect(() => { barThicknessRef.current = barThickness; }, [barThickness]);
  useEffect(() => { barGapRef.current = barGap; }, [barGap]);

  // Dynamically change settings if they change while playing
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = shape === 'waveform' ? 2048 : 256;
    }
  }, [shape]);
  
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = smoothing;
      analyserRef.current.minDecibels = minDecibels;
      analyserRef.current.maxDecibels = maxDecibels;
    }
  }, [smoothing, minDecibels, maxDecibels]);
  
  // Array of particles for the effect
  const particlesArrayRef = useRef([]);
  
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  useEffect(() => {
    if (centerImagePath) {
      const img = new Image();
      img.src = `file://${centerImagePath}`;
      img.onload = () => {
        centerImgObjRef.current = img;
      };
    } else {
      centerImgObjRef.current = null;
    }
  }, [centerImagePath]);

  const selectAudio = async () => {
    try {
      const result = await window.api.selectFolder('audio-files');
      if (result && result.length > 0) {
        setAudioPath(result[0]);
        setAudioName(result[0].split(/[\\/]/).pop());
        toast.success('Lagu terpilih!');
      }
    } catch (e) {
      toast.error('Gagal memilih lagu');
    }
  };

  const selectCenterImage = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result && result.mediaType === 'photo') {
        setCenterImagePath(result.path);
        toast.success('Foto terpilih!');
      }
    } catch (e) {
      toast.error('Gagal memilih foto');
    }
  };

  const initAudio = async () => {
    if (!audioPath) return;
    
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }
    
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = shape === 'waveform' ? 2048 : 256;
    analyserRef.current.smoothingTimeConstant = smoothingRef.current;
    analyserRef.current.minDecibels = minDecibelsRef.current;
    analyserRef.current.maxDecibels = maxDecibelsRef.current;
    
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }
      const audioEl = new Audio(`file://${audioPath}`);
      audioElementRef.current = audioEl;
      audioEl.crossOrigin = "anonymous";
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioEl);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      audioEl.onended = () => {
        setIsPlaying(false);
        cancelAnimationFrame(animationRef.current);
      };
      
      await audioEl.play();
      setIsPlaying(true);
      particlesArrayRef.current = []; // Reset particles
      drawSpectrum();
    } catch (e) {
      console.error(e);
      toast.error('Gagal memutar lagu');
    }
  };

  const stopAudio = () => {
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  };

  const drawSpectrum = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const currentShape = shapeRef.current;
      const currentColorMode = colorModeRef.current;
      const currentParticles = particlesRef.current;
      const currentAlignment = alignmentRef.current;
      const currentHeightScale = heightScaleRef.current;
      const currentBarThickness = barThicknessRef.current;
      const currentBarGap = barGapRef.current;
      
      if (currentShape === 'waveform') {
        analyserRef.current.getByteTimeDomainData(dataArray);
      } else {
        analyserRef.current.getByteFrequencyData(dataArray);
      }
      
      // Neo-brutalism clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Update & Draw Particles if enabled
      if (currentParticles) {
        let bassAvg = 0;
        if (currentShape !== 'waveform') {
          for (let i = 0; i < 5; i++) bassAvg += dataArray[i];
          bassAvg /= 5;
        }
        
        if (bassAvg > 210) {
          // Shoot particles from center outward
          for(let p=0; p<4; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 15;
            particlesArrayRef.current.push({
              x: width / 2,
              y: height / 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              size: 2 + Math.random() * 6,
              color: getColorForIndex(Math.random() * bufferLength, bufferLength, currentColorMode, solidColorRef.current)
            });
          }
        }
        
        if (particlesArrayRef.current.length > 200) {
          particlesArrayRef.current.splice(0, particlesArrayRef.current.length - 200);
        }
        
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particlesArrayRef.current.length - 1; i >= 0; i--) {
          const p = particlesArrayRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.03;
          
          if (p.life <= 0) {
            particlesArrayRef.current.splice(i, 1);
            continue;
          }
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      
      // Draw Shape
      if (currentShape === 'waveform') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = getColorForIndex(bufferLength/2, bufferLength, currentColorMode);
        ctx.beginPath();
        
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
          let v = dataArray[i] / 128.0;
          
          // Apply height scale to waveform
          if (currentHeightScale !== 1.0) {
            v = 1.0 + (v - 1.0) * currentHeightScale;
          }
          
          const y = v * height/2;
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();        
        
      } else if (currentShape === 'circular') {
        const cx = width / 2;
        const cy = height / 2;
        const radius = height / 4;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
        if (centerImgObjRef.current) {
          ctx.clip();
          const imgSize = radius * 2;
          ctx.drawImage(centerImgObjRef.current, cx - radius, cy - radius, imgSize, imgSize);
        } else {
          ctx.fillStyle = '#111';
          ctx.fill();
          ctx.fillStyle = '#666';
          ctx.font = '12px Courier';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('NO IMAGE', cx, cy);
        }
        ctx.restore();
        
        ctx.strokeStyle = '#00FF55';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
        ctx.stroke();
        
        const validBins = Math.floor(bufferLength * 0.75); // Cut off empty high frequencies
        
        if (currentAlignment === 'center') {
          // Mirrored data for symmetric circle
          const totalBars = 120; // Fixed number of bars
          const step = Math.max(1, Math.floor(validBins / (totalBars / 2)));
          
          // Draw Left Half (Math.PI/2 to 1.5*Math.PI)
          let barIndex = 0;
          for (let i = 0; i < validBins && barIndex < totalBars / 2; i += step) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * (height / 3) * currentHeightScale);
            const angle = Math.PI/2 + (barIndex / (totalBars / 2)) * Math.PI; // Bottom to Top Left
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            ctx.fillRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.restore();
            barIndex++;
          }
          
          // Draw Right Half (Math.PI/2 to -0.5*Math.PI)
          barIndex = 0;
          for (let i = 0; i < validBins && barIndex < totalBars / 2; i += step) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * (height / 3) * currentHeightScale);
            const angle = Math.PI/2 - (barIndex / (totalBars / 2)) * Math.PI; // Bottom to Top Right
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            ctx.fillRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.restore();
            barIndex++;
          }
        } else {
          // Normal circular (0 to 2PI)
          const step = Math.max(1, Math.floor(validBins / 120));
          for (let i = 0; i < validBins; i+=step) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * (height / 3) * currentHeightScale);
            const angle = currentAlignment === 'right'
              ? Math.PI - (i / validBins) * 2 * Math.PI
              : Math.PI + (i / validBins) * 2 * Math.PI;
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            ctx.fillRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(radius, -2, barHeight, 4 * currentBarThickness);
            ctx.restore();
          }
        }
      } else if (currentShape === 'symmetric') {
        const validBins = Math.floor(bufferLength * 0.75); // Cut off empty high frequencies
        const totalBars = 120; // Fixed number of bars
        const step = Math.max(1, Math.floor(validBins / (totalBars / 2)));
        const baseBarWidth = (width / totalBars);
        const barWidth = Math.max(1, (baseBarWidth - currentBarGap) * currentBarThickness);
        const cx = width / 2;
        const cy = height / 2;
        
        if (currentAlignment === 'center') {
          const cx = width / 2;
          let barIndex = 0;
          for (let i = 0; i < validBins && barIndex < totalBars / 2; i += step) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * (height / 2) * currentHeightScale);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            
            const offset = (barIndex * (barWidth + currentBarGap));
            // Right Side
            ctx.fillRect(cx + offset, cy - barHeight, barWidth, barHeight * 2);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx + offset, cy - barHeight, barWidth, barHeight * 2);
            
            // Left Side
            if (barIndex > 0) {
              ctx.fillRect(cx - offset - barWidth, cy - barHeight, barWidth, barHeight * 2);
              ctx.strokeRect(cx - offset - barWidth, cy - barHeight, barWidth, barHeight * 2);
            }
            barIndex++;
          }
        } else {
          let x = currentAlignment === 'right' ? width : 0;
          let barIndex = 0;
          for(let i = 0; i < validBins && barIndex < totalBars; i += step) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * (height / 2) * currentHeightScale);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            const drawX = currentAlignment === 'right' ? x - barWidth : x;
            
            ctx.fillRect(drawX, cy - barHeight, barWidth, barHeight * 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX, cy - barHeight, barWidth, barHeight * 2);
            
            if (currentAlignment === 'right') x -= barWidth + currentBarGap;
            else x += barWidth + currentBarGap;
            
            barIndex++;
          }
        }
      } else if (currentShape === 'dots') {
        const validBins = Math.floor(bufferLength * 0.75);
        const baseBarWidth = (width / validBins) * 1.5;
        const barWidth = Math.max(1, baseBarWidth * currentBarThickness);
        
        if (currentAlignment === 'center') {
          const cx = width / 2;
          let dotIndex = 0;
          for (let i = 0; i < validBins; i += 2) {
            const barHeight = (dataArray[i] / 255) * height * currentHeightScale;
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            const offset = dotIndex * (barWidth + currentBarGap + 2);
            // Right
            ctx.beginPath();
            ctx.arc(cx + offset, height - barHeight - 10, barWidth/2, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
            // Left
            if (dotIndex > 0) {
              ctx.beginPath();
              ctx.arc(cx - offset, height - barHeight - 10, barWidth/2, 0, Math.PI*2);
              ctx.fill(); ctx.stroke();
            }
            dotIndex++;
          }
        } else {
          let x = currentAlignment === 'right' ? width : 0;
          for(let i = 0; i < validBins; i+=2) {
            const barHeight = (dataArray[i] / 255) * height * currentHeightScale;
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            const drawX = currentAlignment === 'right' ? x - barWidth/2 - 10 : x;
            ctx.beginPath();
            ctx.arc(drawX, height - barHeight - 10, barWidth/2, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            if (currentAlignment === 'right') x -= (barWidth + currentBarGap + 2) * 2;
            else x += (barWidth + currentBarGap + 2) * 2;
          }
        }
      } else {
        // linear
        const validBins = Math.floor(bufferLength * 0.75);
        const baseBarWidth = (width / validBins) * 0.8;
        const barWidth = Math.max(1, (baseBarWidth - currentBarGap) * currentBarThickness);
        
        if (currentAlignment === 'center') {
          const cx = width / 2;
          let barIndex = 0;
          for (let i = 0; i < validBins; i++) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * height * currentHeightScale);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            const offset = barIndex * (barWidth + currentBarGap);
            
            // Right
            ctx.fillRect(cx + offset, height - barHeight, barWidth, barHeight);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
            ctx.strokeRect(cx + offset, height - barHeight, barWidth, barHeight);
            
            // Left
            if (barIndex > 0) {
              ctx.fillRect(cx - offset - barWidth, height - barHeight, barWidth, barHeight);
              ctx.strokeRect(cx - offset - barWidth, height - barHeight, barWidth, barHeight);
            }
            barIndex++;
          }
        } else {
          let x = currentAlignment === 'right' ? width : 0;
          for(let i = 0; i < validBins; i++) {
            const barHeight = Math.max(2, (dataArray[i] / 255) * height * currentHeightScale);
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current);
            const drawX = currentAlignment === 'right' ? x - barWidth : x;
            ctx.fillRect(drawX, height - barHeight, barWidth, barHeight);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX, height - barHeight, barWidth, barHeight);
            
            if (currentAlignment === 'right') x -= barWidth + currentBarGap;
            else x += barWidth + currentBarGap;
          }
        }
      }
    };
    
    draw();
  };

  const getColorForIndex = (index, total, mode, solidCol) => {
    if (mode === 'rgb_running') {
      return `hsl(${(index / total) * 360 + (Date.now() / 10 % 360)}, 100%, 50%)`;
    } else if (mode === 'rgb_beat') {
      return `hsl(${(Date.now() / 5 % 360)}, 100%, 50%)`;
    } else if (mode === 'fire') {
      const ratio = index / total;
      return `hsl(${60 - ratio * 60}, 100%, 50%)`;
    } else if (mode === 'gradient_cyan_purple') {
      const ratio = index / total;
      return `hsl(${180 + ratio * 100}, 100%, 50%)`;
    }
    return solidCol || '#00FF55'; 
  };

  const exportGif = async () => {
    if (!audioPath) {
      toast.error('Pilih lagu dulu sebelum export!');
      return;
    }
    
    setIsExporting(true);
    toast.success('Mulai merender GIF (Landscape)... Tunggu sebentar.', { duration: 5000 });
    
    try {
      const outputPath = await window.api.selectOutputFile();
      if (!outputPath) {
        setIsExporting(false);
        return;
      }
      
      await window.api.exportSpectrumGif({
        audioPath,
        outputPath,
        resolution: '1280x720',
        backgroundColor: '#000000',
        shape,
        colorMode,
        solidColor,
        particles,
        alignment,
        centerImagePath,
        advanced: {
          smoothing,
          minDecibels,
          maxDecibels,
          heightScale,
          barThickness,
          barGap
        }
      });
      
      toast.success('Berhasil mengekspor GIF!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full h-[85vh] flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Audio Spectrum GIF Maker</h1>
          <p className="font-bold text-xs text-zinc-500">Ubah lagumu menjadi visual animasi neon yang keren (Mode Widescreen 16:9).</p>
        </div>
        <Music className="w-10 h-10" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Kiri: Kontrol (Scrollable) */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 overflow-y-auto pr-2 pb-2">
          
          <div className="bg-yellow-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h2 className="font-black text-lg mb-2">1. Audio</h2>
            <button 
              onClick={selectAudio}
              className="w-full bg-black text-white font-black py-2 text-sm border-4 border-black hover:bg-zinc-800 active:translate-x-1 active:translate-y-1 transition-all"
            >
              BROWSE FILE (.mp3 / .wav)
            </button>
            {audioName && (
              <div className="mt-2 p-2 bg-white border-2 border-black font-bold text-xs truncate">
                🎵 {audioName}
              </div>
            )}
          </div>

          <div className="bg-[#00F0FF] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h2 className="font-black text-lg mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              2. Settings
            </h2>
            
            <div className="bg-white border-4 border-black p-3 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Bentuk (Shape)</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                  {['linear', 'circular', 'waveform', 'symmetric', 'dots'].map(s => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`py-1 text-[10px] border-2 border-black font-bold active:translate-x-0.5 active:translate-y-0.5 ${shape === s ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {shape === 'circular' && (
                <div className="pt-2 border-t-2 border-dashed border-black">
                  <label className="text-[10px] font-black uppercase block mb-1">Foto Tengah Lingkaran</label>
                  <button
                    onClick={selectCenterImage}
                    className="w-full py-1 text-xs flex items-center justify-center gap-1 border-2 border-black font-bold bg-white hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <ImageIcon className="w-3 h-3" /> PILIH FOTO
                  </button>
                </div>
              )}
              
              <div className="pt-2 border-t-2 border-dashed border-black">
                <label className="text-[10px] font-black uppercase block mb-1">Warna (Color)</label>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {[
                    {id: 'solid', label: 'SOLID COLOR'},
                    {id: 'rgb_running', label: 'RGB RUNNING'},
                    {id: 'rgb_beat', label: 'RGB BEAT'},
                    {id: 'gradient_cyan_purple', label: 'GRADIENT'},
                    {id: 'fire', label: 'FIRE LAVA'}
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setColorMode(c.id)}
                      className={`py-1 text-[10px] border-2 border-black font-bold active:translate-x-0.5 active:translate-y-0.5 ${colorMode === c.id ? 'bg-[#00FF55]' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                
                {colorMode === 'solid' && (
                  <div className="flex items-center justify-between border-2 border-black p-1 bg-zinc-100">
                    <span className="text-[10px] font-bold px-1">Pilih Warna Solid:</span>
                    <input 
                      type="color" 
                      value={solidColor}
                      onChange={(e) => setSolidColor(e.target.value)}
                      className="w-8 h-6 border border-black cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t-2 border-dashed border-black">
                <label className="text-[10px] font-black uppercase block mb-1">Opsi Tambahan</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-bold bg-zinc-100 border-2 border-black p-1 cursor-pointer hover:bg-zinc-200">
                    <input 
                      type="checkbox" 
                      checked={particles}
                      onChange={(e) => setParticles(e.target.checked)}
                      className="w-4 h-4 accent-[#00FF55] border-black"
                    />
                    AKTIFKAN BEAT PARTIKEL
                  </label>
                  
                  <div className="flex flex-col gap-1 bg-zinc-100 border-2 border-black p-2 mt-2">
                    <span className="text-[10px] font-black uppercase">Arah Spektrum (Alignment):</span>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="alignment"
                        value="left"
                        checked={alignment === 'left'}
                        onChange={(e) => setAlignment(e.target.value)}
                        className="w-4 h-4 accent-[#00FF55]"
                      />
                      Dari Kiri (Default)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="alignment"
                        value="right"
                        checked={alignment === 'right'}
                        onChange={(e) => setAlignment(e.target.value)}
                        className="w-4 h-4 accent-[#00FF55]"
                      />
                      Dari Kanan
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="alignment"
                        value="center"
                        checked={alignment === 'center'}
                        onChange={(e) => setAlignment(e.target.value)}
                        className="w-4 h-4 accent-[#00FF55]"
                      />
                      Dari Tengah (Mirrored)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {isPlaying ? (
                <button 
                  onClick={stopAudio}
                  className="flex-1 bg-red-500 text-white font-black py-2 border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 active:translate-x-1 active:translate-y-1 flex justify-center items-center gap-1 text-sm"
                >
                  <Square className="w-4 h-4" /> STOP
                </button>
              ) : (
                <button 
                  onClick={() => {
                    initAudio();
                  }}
                  disabled={!audioPath}
                  className="flex-1 bg-[#00FF55] text-black font-black py-2 border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-green-400 active:translate-x-1 active:translate-y-1 flex justify-center items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" /> PREVIEW
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-orange-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h2 className="font-black text-lg mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              3. Advanced (Rinci)
            </h2>
            <div className="bg-white border-4 border-black p-3 space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Kehalusan (Smoothing)</span>
                  <span>{smoothing.toFixed(2)}</span>
                </label>
                <input 
                  type="range" min="0" max="0.99" step="0.01" 
                  value={smoothing} onChange={e => setSmoothing(parseFloat(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Batas Bawah (Min dB)</span>
                  <span>{minDecibels} dB</span>
                </label>
                <input 
                  type="range" min="-120" max="-50" step="1" 
                  value={minDecibels} onChange={e => setMinDecibels(parseInt(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Batas Atas (Max dB)</span>
                  <span>{maxDecibels} dB</span>
                </label>
                <input 
                  type="range" min="-50" max="0" step="1" 
                  value={maxDecibels} onChange={e => setMaxDecibels(parseInt(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Skala Tinggi (Height)</span>
                  <span>{heightScale.toFixed(1)}x</span>
                </label>
                <input 
                  type="range" min="0.1" max="3.0" step="0.1" 
                  value={heightScale} onChange={e => setHeightScale(parseFloat(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Ketebalan Bar (Thickness)</span>
                  <span>{barThickness.toFixed(1)}x</span>
                </label>
                <input 
                  type="range" min="0.1" max="3.0" step="0.1" 
                  value={barThickness} onChange={e => setBarThickness(parseFloat(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Jarak Bar (Gap)</span>
                  <span>{barGap} px</span>
                </label>
                <input 
                  type="range" min="0" max="10" step="1" 
                  value={barGap} onChange={e => setBarGap(parseInt(e.target.value))}
                  className="w-full accent-black"
                />
              </div>
            </div>
          </div>

          <div className="bg-purple-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 mt-auto">
            <h2 className="font-black text-lg mb-2 text-white">4. Export 1280x720</h2>
            <button 
              onClick={exportGif}
              disabled={!audioPath || isExporting}
              className="w-full bg-white text-black font-black py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-200 active:translate-x-1 active:translate-y-1 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isExporting ? 'MEMPROSES...' : <><Download className="w-5 h-5" /> EXPORT GIF</>}
            </button>
          </div>
        </div>

        {/* Kanan: Layar Canvas (Lebar) */}
        <div className="flex-1 bg-zinc-200 border-4 border-black p-2 flex flex-col justify-center items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-[300px]">
          <div className="bg-black border-4 border-black w-full aspect-video relative overflow-hidden flex items-center justify-center">
            {!isPlaying && (
              <div className="absolute font-black text-zinc-600 text-xl md:text-3xl text-center p-6 z-10">
                TEKAN PREVIEW<br/>UNTUK MELIHAT
              </div>
            )}
            <canvas 
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
