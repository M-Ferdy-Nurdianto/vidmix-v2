import React from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const TOAST_STYLES = {
  success: { bg: '#00FF55', Icon: CheckCircle2 },
  error:   { bg: '#FF4136', Icon: XCircle },
  info:    { bg: '#00F0FF', Icon: Info },
};

export function showToast(message, type = 'info') {
  const { bg, Icon } = TOAST_STYLES[type];
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-2 border-4 border-black px-4 py-2 font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          t.visible ? 'animate-toast-in' : 'animate-toast-out'
        }`}
        style={{ backgroundColor: bg, color: '#000' }}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={3} />
        <span>{message}</span>
      </div>
    ),
    { duration: type === 'error' ? 4000 : 2500 }
  );
}

export function playLoudSuccessSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    
    // Very loud level (1.0 is max unclipped, but let's use 0.8 to be safe but very loud)
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
    
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.2); // C6
    
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.2); // E6
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 1.0);
    osc2.stop(audioCtx.currentTime + 1.0);
  } catch (e) {
    console.error('Failed to play loud success sound', e);
  }
}
