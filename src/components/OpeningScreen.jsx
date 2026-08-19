import React, { useState, useRef } from 'react';

export default function OpeningScreen({ onComplete }) {
  const [isFading, setIsFading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const videoRef = useRef(null);
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      // Mulai fade out 0.8 detik sebelum video benar-benar habis
      if (duration > 0 && duration - currentTime <= 0.8 && !isFading) {
        startFadeOut();
      }
    }
  };

  const startFadeOut = () => {
    if (isFading || isDone) return;
    setIsFading(true);
    // Tunggu 800ms sampai efek CSS fade out selesai, baru lepaskan layar
    setTimeout(() => {
      setIsDone(true);
      if (onComplete) onComplete();
    }, 800); 
  };

  const handleEnded = () => {
    startFadeOut();
  };

  // Mencegah render jika sudah selesai
  if (isDone) return null;

  return (
    <div 
      className={`fixed inset-0 z-100000 bg-black flex items-center justify-center transition-opacity duration-1000 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <video
        ref={videoRef}
        src="./final_opening.mp4"
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          // Fallback langsung masuk jika video error (misal file tidak ada)
          console.warn("Opening video failed to load or play.");
          startFadeOut();
        }}
        className="w-full h-full object-cover"
      />
      
      {/* Hint untuk skip */}
      <button 
        onClick={startFadeOut}
        className="absolute bottom-6 right-6 text-white/30 hover:text-white/80 font-mono text-xs uppercase tracking-widest transition-colors z-10"
      >
        Skip ➔
      </button>
    </div>
  );
}
