import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Square, Download, Settings, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { showToast, playLoudSuccessSound } from '../../utils/toast-helper';

import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

function ExportProcessingModal({ progress, stage }) {
  const { t } = useLanguage();
  return (
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
          <div 
            className="absolute top-0 left-0 h-full bg-[#00FF55] border-r-4 border-black transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-black text-xl z-10 mix-blend-difference text-white">
            {progress > 0 ? `${t('loadingProcessing')} ${Math.round(progress)}%` : t('loadingPreparing')}
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-center font-black bg-black text-white px-4 py-2">
          <span>{t('processingStatus')}</span>
          <span>{stage}</span>
        </div>
      </div>
    </div>
  );
}

function ExportSuccessModal({ onOpenFolder, onClose, lastOutputFolder }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#00FF55] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full transform animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-blue-400 border-2 border-black w-8 h-8 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
        >
          X
        </button>
        <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
          <CheckCircle2 className="w-10 h-10" />
          {t('successTitle')}
        </h2>
        <p className="font-bold text-base mb-6 border-l-4 border-black pl-3 py-2 bg-green-400">
          {t('successDescSpectrum')}
        </p>
        
        <button
          onClick={() => {
            if (lastOutputFolder) onOpenFolder(lastOutputFolder);
            onClose();
          }}
          className="w-full py-4 font-black text-lg border-4 border-black bg-[#FFE500] hover:bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
        >
          <FolderOpen className="w-6 h-6" />
          {t('openFolder')}
        </button>
      </div>
    </div>
  );
}

export default function SpectrumGenerator() {
  const { t } = useLanguage();
  const [audioPath, setAudioPath] = useState('');
  const [audioName, setAudioName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('Menyiapkan...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSuccessFolder, setLastSuccessFolder] = useState('');
  const progressIntervalRef = useRef(null);
  
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('vidmix_spectrumOutputDir') || '');
  
  const [shape, setShape] = useState('linear');
  const [colorMode, setColorMode] = useState('solid');
  const [solidColor, setSolidColor] = useState('#00FF55');
  const [particles, setParticles] = useState(false);
  const [alignment, setAlignment] = useState('left');
  const [centerImagePath, setCenterImagePath] = useState('');
  const [roundedBars, setRoundedBars] = useState(false);
  const [gradientStart, setGradientStart] = useState('#00FFFF');
  const [gradientEnd, setGradientEnd] = useState('#9D00FF');
  
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
  const forceDrawRef = useRef(null);
  
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
  const gradientStartRef = useRef(gradientStart);
  const gradientEndRef = useRef(gradientEnd);
  const roundedBarsRef = useRef(roundedBars);
  
  useEffect(() => {
    shapeRef.current = shape;
    colorModeRef.current = colorMode;
    solidColorRef.current = solidColor;
    particlesRef.current = particles;
    alignmentRef.current = alignment;
    smoothingRef.current = smoothing;
    minDecibelsRef.current = minDecibels;
    maxDecibelsRef.current = maxDecibels;
    heightScaleRef.current = heightScale;
    barThicknessRef.current = barThickness;
    barGapRef.current = barGap;
    gradientStartRef.current = gradientStart;
    gradientEndRef.current = gradientEnd;
    roundedBarsRef.current = roundedBars;
  }, [shape, colorMode, solidColor, particles, alignment, smoothing, minDecibels, maxDecibels, heightScale, barThickness, barGap, gradientStart, gradientEnd, roundedBars]);

  useEffect(() => {
    localStorage.setItem('vidmix_spectrumOutputDir', outputDir);
  }, [outputDir]);

  useEffect(() => {
    if (typeof window.api?.onExportProgress === 'function') {
      const unsubscribe = window.api.onExportProgress(({ percent, stage }) => {
        if (typeof percent === 'number') setExportProgress(percent);
        if (stage) setExportStage(stage);
      });
      return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }
  }, []);

  const startSimulatedProgress = (estimatedMs) => {
    const start = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / estimatedMs) * 100);
      setExportProgress(pct);
      if (pct > 30 && pct <= 60) setExportStage(t('loadingRenderingFrame'));
      else if (pct > 60) setExportStage(t('loadingMerging'));
    }, 150);
  };

  const stopSimulatedProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

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
        showToast('Lagu terpilih!', 'success');
      }
    } catch (e) {
      showToast('Gagal memilih lagu', 'error');
    }
  };

  const selectOutputFolder = async () => {
    try {
      const result = await window.api.selectFolder('output');
      if (result) {
        setOutputDir(result);
        showToast('Folder Output diset!', 'success');
      }
    } catch (e) {
      showToast('Gagal memilih folder', 'error');
    }
  };

  const selectCenterImage = async () => {
    try {
      const result = await window.api.selectMediaFile();
      if (result && result.mediaType === 'photo') {
        setCenterImagePath(result.path);
        showToast('Foto terpilih!', 'success');
      }
    } catch (e) {
      showToast('Gagal memilih foto', 'error');
    }
  };

  const applyPreset = (smooth, min, max, height, thick, gap) => {
    setSmoothing(smooth);
    setMinDecibels(min);
    setMaxDecibels(max);
    setHeightScale(height);
    setBarThickness(thick);
    setBarGap(gap);
    showToast('Preset pengaturan diterapkan!', 'success');
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
      showToast('Gagal memutar lagu', 'error');
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
    
    const draw = (force = false) => {
      const drawBar = (ctx, x, y, w, h) => {
        ctx.beginPath();
        if (roundedBarsRef.current) {
          ctx.roundRect(x, y, w, h, Math.min(w/2, h/2, 5));
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.stroke();
      };
      
      if (!force) {
        animationRef.current = requestAnimationFrame(() => draw(false));
      }
      
      // Jika audio context suspended → resume dan SKIP frame ini
      // (jangan clearRect, biarkan canvas tetap tampil frame terakhir)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
        return; // skip render frame ini, tunggu sampai context aktif
      }
      if (!analyserRef.current) return;
      
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
      
      // Cek apakah data benar-benar kosong semua (context baru resume / belum ada sinyal)
      // Untuk frequency: nilai 0 = diam. Untuk waveform: nilai 128 = diam.
      // Jika ya, skip clear supaya canvas tidak blank
      const hasSignal = currentShape === 'waveform'
        ? dataArray.some(v => v !== 128)
        : dataArray.some(v => v > 0);
      if (!hasSignal) return;

      
      // Transparent clear (no background)
      ctx.clearRect(0, 0, width, height);

      
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
              color: getColorForIndex(Math.random() * bufferLength, bufferLength, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current)
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, radius, -2, barHeight, 4 * currentBarThickness);
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, radius, -2, barHeight, 4 * currentBarThickness);
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, radius, -2, barHeight, 4 * currentBarThickness);
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            
            const offset = (barIndex * (barWidth + currentBarGap));
            // Right Side
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, cx + offset, cy - barHeight, barWidth, barHeight * 2);
            
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            const drawX = currentAlignment === 'right' ? x - barWidth : x;
            
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, drawX, cy - barHeight, barWidth, barHeight * 2);
            
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            const offset = barIndex * (barWidth + currentBarGap);
            
            // Right
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, cx + offset, height - barHeight, barWidth, barHeight);
            
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
            ctx.fillStyle = getColorForIndex(i, validBins, currentColorMode, solidColorRef.current, gradientStartRef.current, gradientEndRef.current);
            const drawX = currentAlignment === 'right' ? x - barWidth : x;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; drawBar(ctx, drawX, height - barHeight, barWidth, barHeight);
            
            if (currentAlignment === 'right') x -= barWidth + currentBarGap;
            else x += barWidth + currentBarGap;
          }
        }
      }
    };
    
    forceDrawRef.current = draw;
    draw();
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : {r: 0, g: 255, b: 255};
  };

  const getColorForIndex = (index, total, mode, solidCol, gradStart = '#00FFFF', gradEnd = '#9D00FF') => {
    if (mode === 'rgb_running') {
      return `hsl(${(index / total) * 360 + (Date.now() / 10 % 360)}, 100%, 50%)`;
    } else if (mode === 'rgb_beat') {
      return `hsl(${(Date.now() / 5 % 360)}, 100%, 50%)`;
    } else if (mode === 'fire') {
      const ratio = index / total;
      return `hsl(${60 - ratio * 60}, 100%, 50%)`;
    } else if (mode === 'gradient_cyan_purple' || mode === 'gradient') {
      const ratio = index / total;
      const c1 = hexToRgb(gradStart);
      const c2 = hexToRgb(gradEnd);
      const r = Math.floor(c1.r + ratio * (c2.r - c1.r));
      const g = Math.floor(c1.g + ratio * (c2.g - c1.g));
      const b = Math.floor(c1.b + ratio * (c2.b - c1.b));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return solidCol || '#00FF55'; 
  };

  const exportGif = async () => {
    if (!audioPath) {
      showToast('Pilih lagu dulu sebelum export!', 'error');
      return;
    }

    // Determine output path
    let outputPath = '';
    if (outputDir) {
      const cleanAudioName = audioName ? audioName.replace(/\.[^/.]+$/, "") : "Audio";
      const safeName = cleanAudioName.replace(/[<>:"/\\|?*]/g, ' ').trim();
      const shortCode = Date.now().toString().slice(-4);
      outputPath = `${outputDir}\\Spectrum - ${safeName} - ${shortCode}.mp4`;
    } else {
      outputPath = await window.api.selectOutputMov();
      if (!outputPath) return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStage(t('loadingPreparing'));

    try {
      // Stop any existing playback first
      stopAudio();
      await new Promise(r => setTimeout(r, 200));

      // Re-init audio context + analyser
      if (audioContextRef.current) await audioContextRef.current.close();
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = shape === 'waveform' ? 2048 : 256;
      analyserRef.current.smoothingTimeConstant = smoothingRef.current;
      analyserRef.current.minDecibels = minDecibelsRef.current;
      analyserRef.current.maxDecibels = maxDecibelsRef.current;

      const audioEl = new Audio(`file://${audioPath}`);
      audioElementRef.current = audioEl;
      audioEl.crossOrigin = 'anonymous';

      // Wait for metadata so we can read duration
      await new Promise(resolve => {
        if (audioEl.readyState >= 1) resolve();
        else audioEl.addEventListener('loadedmetadata', resolve, {once: true});
      });

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioEl);
      sourceRef.current.connect(analyserRef.current);
      // NOT connecting to destination — silent during export

      // Start canvas animation
      particlesArrayRef.current = [];
      drawSpectrum();

      // Wait a few frames for canvas to warm up
      await new Promise(r => setTimeout(r, 100));

      // Seek audio to 10 seconds (skip fade-in), fallback to 0 if song is very short
      audioEl.currentTime = Math.min(10, Math.max(0, audioEl.duration - 2) || 0);

      // Start audio (drives the analyser)
      await audioEl.play();

      // Capture PNG frames at 24fps for 10 seconds = 240 frames
      const FPS = 24;
      const DURATION_S = 10;
      const totalFrames = FPS * DURATION_S;
      const frameInterval = Math.round(1000 / FPS);
      const frames = [];
      const canvas = canvasRef.current;

      setExportStage(`Merekam frame canvas... (0/${totalFrames})`);

      await new Promise((resolve) => {
        let captured = 0;
        const captureTimer = setInterval(() => {
          if (captured >= totalFrames || audioEl.ended) {
            clearInterval(captureTimer);
            resolve();
            return;
          }
          // Force draw if requestAnimationFrame is throttled
          if (forceDrawRef.current) forceDrawRef.current(true);
          
          // Capture current canvas as PNG base64 (preserves alpha)
          const dataUrl = canvas.toDataURL('image/png');
          frames.push(dataUrl.split(',')[1]); // base64 only
          captured++;

          const pct = Math.min(45, (captured / totalFrames) * 45);
          setExportProgress(pct);
          setExportStage(`Merekam frame ${captured}/${totalFrames}...`);
        }, frameInterval);
      });

      // Stop audio + canvas
      audioEl.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      setExportStage('Mengirim frame ke FFmpeg...');
      setExportProgress(50);

      // Subscribe to FFmpeg progress
      if (window.api?.onSpectrumExportProgress) {
        window.api.onSpectrumExportProgress((data) => {
          if (data.percent) setExportProgress(50 + (data.percent / 100) * 48);
          if (data.timemark) setExportStage(`Mengenkode: ${data.timemark}`);
        });
      }

      // Encode frames → transparent MOV via FFmpeg ProRes 4444
      await window.api.encodeFramesToMov(frames, FPS, outputPath);

      if (window.api?.removeSpectrumExportProgress) window.api.removeSpectrumExportProgress();

      setExportProgress(100);
      setExportStage('Selesai!');
      playLoudSuccessSound();
      setIsSuccess(true);
      setLastSuccessFolder(outputDir);
      setIsPlaying(false);

    } catch (e) {
      console.error(e);
      if (window.api?.removeSpectrumExportProgress) window.api.removeSpectrumExportProgress();
      showToast('Gagal mengekspor: ' + (e.message || e), 'error');
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };


  return (
    <>
      {isExporting && <ExportProcessingModal progress={exportProgress} stage={exportStage} />}
      {isSuccess && !isExporting && (
        <ExportSuccessModal 
          lastOutputFolder={lastSuccessFolder}
          onClose={() => setIsSuccess(false)}
          onOpenFolder={(folder) => window.api.openFolder(folder)}
        />
      )}
      <div className="bg-[#B28DFF] border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full h-[85vh] flex flex-col">
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
            <h2 className="font-black text-lg mb-2">1. Sumber & Tujuan</h2>
            
            <label className="text-[10px] font-black uppercase block mb-1">Pilih Lagu</label>
            <button 
              onClick={selectAudio}
              className="w-full bg-black text-white font-black py-2 text-sm border-4 border-black hover:bg-zinc-800 active:translate-x-1 active:translate-y-1 transition-all"
            >
              BROWSE FILE (.mp3 / .wav)
            </button>
            {audioName && (
              <div className="mt-2 p-2 bg-[#00FF55] border-2 border-black font-bold text-xs truncate">
                🎵 {audioName}
              </div>
            )}

            <label className="text-[10px] font-black uppercase block mb-1 mt-3">Folder Output</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={outputDir || 'Belum dipilih...'} className="w-full bg-white border-2 border-black px-2 py-1 text-xs truncate font-bold" placeholder="Pilih folder..." />
              <button onClick={selectOutputFolder} className="bg-[#00F0FF] border-2 border-black px-3 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 text-xs">Pilih</button>
            </div>
            <p className="text-[9px] font-bold text-zinc-600 mt-1">*Jika kosong, akan ditanya saat klik Export</p>
          </div>

          <div className="bg-[#00F0FF] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h2 className="font-black text-lg mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              2. Settings
            </h2>
            
            <div className="bg-[#FFE500] border-4 border-black p-3 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">{t('spectrumShapeTitle')}</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                  {['linear', 'circular', 'waveform', 'symmetric', 'dots'].map(s => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`py-1 text-[10px] border-2 border-black font-bold active:translate-x-0.5 active:translate-y-0.5 ${shape === s ? 'bg-[#00FF55]' : 'bg-[#FF90E8] hover:bg-[#E581D0]'}`}
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
                    className="w-full py-1 text-xs flex items-center justify-center gap-1 border-2 border-black font-bold bg-[#FFE500] hover:bg-[#E5CD00] active:translate-x-0.5 active:translate-y-0.5"
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
                    {id: 'gradient', label: 'GRADIENT'},
                    {id: 'fire', label: 'FIRE LAVA'}
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setColorMode(c.id)}
                      className={`py-1 text-[10px] border-2 border-black font-bold active:translate-x-0.5 active:translate-y-0.5 ${colorMode === c.id ? 'bg-[#00FF55]' : 'bg-[#FF90E8] hover:bg-[#E581D0]'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                
                {colorMode === 'solid' && (
                  <div className="flex items-center justify-between border-2 border-black p-1 bg-white">
                    <span className="text-[10px] font-bold px-1">Pilih Warna Solid:</span>
                    <input 
                      type="color" 
                      value={solidColor}
                      onChange={(e) => setSolidColor(e.target.value)}
                      className="w-8 h-6 border border-black cursor-pointer"
                    />
                  </div>
                )}
                {colorMode === 'gradient' && (
                  <div className="flex flex-col gap-1 border-2 border-black p-1 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1">Warna Awal:</span>
                      <input 
                        type="color" 
                        value={gradientStart}
                        onChange={(e) => setGradientStart(e.target.value)}
                        className="w-8 h-6 border border-black cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1">Warna Akhir:</span>
                      <input 
                        type="color" 
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        className="w-8 h-6 border border-black cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t-2 border-dashed border-black">
                <label className="text-[10px] font-black uppercase block mb-1">Opsi Tambahan</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-bold bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black p-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={roundedBars}
                      onChange={(e) => setRoundedBars(e.target.checked)}
                      className="w-4 h-4 accent-[#00FF55] border-black"
                    />
                    UJUNG BAR MEMBULAT
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold bg-[#FFE500] hover:bg-[#E5CD00] border-2 border-black p-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={particles}
                      onChange={(e) => setParticles(e.target.checked)}
                      className="w-4 h-4 accent-[#00FF55] border-black"
                    />
                    AKTIFKAN BEAT PARTIKEL
                  </label>
                  
                  <div className="flex flex-col gap-1 bg-[#FF90E8] border-2 border-black p-2 mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="alignment"
                        value="left_mirror"
                        checked={alignment === 'left_mirror'}
                        onChange={(e) => setAlignment(e.target.value)}
                        className="w-4 h-4 accent-[#00FF55]"
                      />
                      Mirrored (Kiri)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="alignment"
                        value="right_mirror"
                        checked={alignment === 'right_mirror'}
                        onChange={(e) => setAlignment(e.target.value)}
                        className="w-4 h-4 accent-[#00FF55]"
                      />
                      Mirrored (Kanan)
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
          
          <div className="bg-[#FF6B00] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <h2 className="font-black text-lg mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              3. Advanced
            </h2>
            <div className="bg-[#00FF55] border-4 border-black p-3 space-y-3">
              <div className="mb-1 pb-3 border-b-2 border-dashed border-black">
                <span className="text-[10px] font-black uppercase mb-2 block bg-[#FFE500] px-2 py-1 border-2 border-black w-fit">Preset Rekomendasi:</span>
                <div className="grid grid-cols-4 gap-1">
                <button onClick={() => applyPreset(0.8, -90, -10, 1.5, 1.2, 2)} className="py-1 text-[8px] font-black border-2 border-black bg-[#FF90E8] hover:bg-[#E581D0] active:translate-x-0.5 active:translate-y-0.5" title="Responsif & Bass-heavy">BASSY</button>
                <button onClick={() => applyPreset(0.95, -100, 0, 0.8, 0.8, 4)} className="py-1 text-[8px] font-black border-2 border-black bg-[#00F0FF] hover:bg-[#00D0FF] active:translate-x-0.5 active:translate-y-0.5" title="Santai & Mulus">CHILL</button>
                <button onClick={() => applyPreset(0.6, -80, -20, 1.2, 1.0, 1)} className="py-1 text-[8px] font-black border-2 border-black bg-[#FFE500] hover:bg-[#E5CD00] active:translate-x-0.5 active:translate-y-0.5" title="Sensitivitas Tinggi">DETAIL</button>
                <button onClick={() => applyPreset(0.8, -90, -10, 1.0, 1.0, 2)} className="py-1 text-[8px] font-black border-2 border-black bg-zinc-100 hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5" title="Kembali ke awal">RESET</button>
              </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase flex justify-between">
                  <span>Smoothing</span>
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
                  <span>Min dB</span>
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
                  <span>Max dB</span>
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
                  <span>Height Scale</span>
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
                  <span>Bar Thickness</span>
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
                  <span>Bar Gap</span>
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
              className="w-full bg-[#FFE500] text-black font-black py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#E5CD00] active:translate-x-1 active:translate-y-1 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isExporting ? 'MEMPROSES...' : <><Download className="w-5 h-5" /> EXPORT VIDEO (.MP4)</>}
            </button>
          </div>
        </div>

        {/* Kanan: Layar Canvas (Lebar) */}
        <div className="flex-1 bg-[#FF3CAC] border-4 border-black p-2 flex flex-col justify-center items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-75">
          <div className="border-4 border-black w-full aspect-video relative overflow-hidden flex items-center justify-center bg-zinc-900">
            {!isPlaying && (
              <div className="absolute font-black text-white text-xl md:text-3xl text-center p-6 z-10">
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
    </>
  );
}

