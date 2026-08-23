import React from 'react';
import { BookOpen, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GuideModal({ onClose }) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#FFE500] border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white border-4 border-black w-10 h-10 flex items-center justify-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-transform"
        >
          X
        </button>

        <h2 className="text-4xl font-black mb-6 flex items-center gap-3 border-b-8 border-black pb-4 pr-12">
          <BookOpen className="w-12 h-12 flex-shrink-0" />
          {t('guideTitle') || "VIDMIX V2 COMPLETE GUIDE"}
        </h2>
        
        <div className="flex-1 overflow-y-auto bg-white border-4 border-black p-6 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] space-y-8 pr-4">
          
          <section>
            <h3 className="text-2xl font-black bg-black text-white inline-block px-3 py-1 mb-3">1. {t('videoMixer')}</h3>
            <div className="space-y-4 font-bold text-sm bg-yellow-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="border-b-2 border-black/20 pb-2">{t('guideMixerStep1')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideMixerStep2')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideMixerStep3')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideMixerStep4')}</p>
              <p className="pt-2">{t('guideMixerStep5')}</p>
            </div>
            
            <h4 className="mt-4 font-black">FAQ & Info Tambahan:</h4>
            <div className="space-y-2 font-bold text-sm mt-2">
              <p className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('info_namingTitle')}</strong>: {t('info_namingDesc')}
              </p>
              <p className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('info_compressionTitle')}</strong>: {t('info_compressionDesc')}
              </p>
              <p className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('info_musicOrderTitle')}</strong>: {t('info_musicOrderDesc')}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-black bg-black text-white inline-block px-3 py-1 mb-3">2. {t('spectrumMaker')}</h3>
            <div className="space-y-4 font-bold text-sm bg-purple-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="border-b-2 border-black/20 pb-2">{t('guideSpectrumStep1')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideSpectrumStep2')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideSpectrumStep3')}</p>
              <p className="pt-2">{t('guideSpectrumStep4')}</p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-black bg-black text-white inline-block px-3 py-1 mb-3">3. {t('removeBg')}</h3>
            <div className="space-y-4 font-bold text-sm bg-orange-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="border-b-2 border-black/20 pb-2">{t('guideRemoveBgStep1')}</p>
              <p className="border-b-2 border-black/20 pb-2">{t('guideRemoveBgStep2')}</p>
              <p className="pt-2">{t('guideRemoveBgStep3')}</p>
            </div>
          </section>

        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full py-4 font-black text-xl border-4 border-black bg-black text-white hover:bg-zinc-800 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
        >
          <XCircle className="w-6 h-6" /> {t('guideClose')}
        </button>
      </div>
    </div>
  );
}
