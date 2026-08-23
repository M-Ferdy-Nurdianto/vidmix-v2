import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Copy, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CriticalErrorOverlay({ errorMsg, onClose }) {
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Suara cukup keras tapi tidak merusak telinga
    gainNode.gain.value = 0.3;

    osc.start();
    oscRef.current = osc;

    // Modulasi pitch layaknya sirine peringatan (Ninu Ninu)
    let isHigh = true;
    intervalRef.current = setInterval(() => {
      if (ctx.state === 'running') {
        osc.frequency.setValueAtTime(isHigh ? 800 : 600, ctx.currentTime);
        isHigh = !isHigh;
      }
    }, 400);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch(e){}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(errorMsg);
    toast.success('Pesan error disalin!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-red-600 flex items-center justify-center p-6 animate-in fade-in duration-100">
      <div className="bg-black text-red-500 border-8 border-red-500 p-8 shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] max-w-4xl w-full flex flex-col items-center text-center">
        <AlertTriangle className="w-24 h-24 mb-6 animate-pulse" />
        <h1 className="text-5xl font-black mb-4 uppercase tracking-widest text-white">Critical Error</h1>
        <p className="font-bold text-xl mb-6 text-white uppercase">Sistem mengalami kegagalan proses. Segera copy log ini atau tutup peringatan untuk menghentikan suara.</p>
        
        <div className="bg-red-950 border-4 border-red-500 p-4 w-full mb-8 overflow-y-auto max-h-64 text-left">
          <pre className="font-mono text-sm whitespace-pre-wrap break-words">{errorMsg}</pre>
        </div>
        
        <div className="flex gap-6 w-full justify-center">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-3 bg-white text-black text-2xl font-black py-6 border-4 border-black hover:bg-zinc-300 active:translate-x-1 active:translate-y-1 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] transition-transform"
          >
            <Copy className="w-8 h-8" /> COPY & CLOSE
          </button>
          <button 
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-3 bg-red-500 text-white text-2xl font-black py-6 border-4 border-white hover:bg-red-400 active:translate-x-1 active:translate-y-1 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-transform"
          >
            <XCircle className="w-8 h-8" /> CLOSE & STOP
          </button>
        </div>
      </div>
    </div>
  );
}
