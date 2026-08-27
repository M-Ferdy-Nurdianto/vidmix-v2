import React from 'react';
import { BookOpen, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GuideModal({ onClose }) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#FFE500] border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white border-4 border-black w-10 h-10 flex items-center justify-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-transform"
        >
          X
        </button>

        <h2 className="text-4xl font-black mb-6 flex items-center gap-3 border-b-8 border-black pb-4 pr-12">
          <BookOpen className="w-12 h-12 shrink-0" />
          {t('guideTitle') || "VIDMIX V2 COMPLETE GUIDE"}
        </h2>
        
        <div className="flex-1 overflow-y-auto bg-white border-4 border-black p-6 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)] space-y-8 pr-4">
          
          {/* SECTION 1: CAMPUR VIDEO & KOMPRESI */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-black bg-black text-yellow-400 px-3 py-1 border-2 border-black">{t('guideFeature1')}</span>
              <h3 className="text-2xl font-black">{t('guideMixerTitle')}</h3>
            </div>

            <div className="space-y-3 font-bold text-sm bg-yellow-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">{t('guideStep')} 1</span>
                <p><strong>{t('guideMixerStep1Title')}</strong> {t('guideMixerStep1Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">{t('guideStep')} 2</span>
                <p><strong>{t('guideMixerStep2Title')}</strong> {t('guideMixerStep2Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">{t('guideStep')} 3</span>
                <p><strong>{t('guideMixerStep3Title')}</strong> {t('guideMixerStep3Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">{t('guideStep')} 4</span>
                <p><strong>{t('guideMixerStep4Title')}</strong> {t('guideMixerStep4Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">{t('guideStep')} 5</span>
                <p><strong>{t('guideMixerStep5Title')}</strong> {t('guideMixerStep5Desc')}</p>
              </div>
            </div>

            {/* TABEL PANDUAN KOMPRESI & SIZE */}
            <div className="mt-4 border-4 border-black bg-blue-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="font-black text-base flex items-center gap-2 mb-2 text-black">
                {t('guideTableTitle')}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-bold border-collapse border-2 border-black bg-white">
                  <thead>
                    <tr className="bg-black text-white text-left">
                      <th className="border-2 border-black p-2">{t('guideTableColLevel')}</th>
                      <th className="border-2 border-black p-2">{t('guideTableColBitrate')}</th>
                      <th className="border-2 border-black p-2">{t('guideTableCol15m')}</th>
                      <th className="border-2 border-black p-2">{t('guideTableCol30m')}</th>
                      <th className="border-2 border-black p-2">{t('guideTableCol1h')}</th>
                      <th className="border-2 border-black p-2">{t('guideTableColCustom')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-2 border-black p-2 bg-green-100 font-black text-green-900">{t('highQuality')}</td>
                      <td className="border-2 border-black p-2">{t('guideHighDesc')}</td>
                      <td className="border-2 border-black p-2">~600 - 800 MB</td>
                      <td className="border-2 border-black p-2">~1.2 - 1.6 GB</td>
                      <td className="border-2 border-black p-2">~2.5 - 3.5 GB</td>
                      <td className="border-2 border-black p-2">~45 MB / min</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-2 border-black p-2 bg-blue-100 font-black text-blue-900">{t('balanced')}</td>
                      <td className="border-2 border-black p-2">{t('guideBalancedDesc')}</td>
                      <td className="border-2 border-black p-2">~260 - 360 MB</td>
                      <td className="border-2 border-black p-2">~520 - 720 MB</td>
                      <td className="border-2 border-black p-2">~1.1 - 1.5 GB</td>
                      <td className="border-2 border-black p-2">~19 MB / min</td>
                    </tr>
                    <tr>
                      <td className="border-2 border-black p-2 bg-yellow-100 font-black text-amber-950">{t('smallSize')} 🔥</td>
                      <td className="border-2 border-black p-2">{t('guideUltraDesc')}</td>
                      <td className="border-2 border-black p-2 font-black text-green-700">~35 - 50 MB</td>
                      <td className="border-2 border-black p-2 font-black text-green-700">~70 - 95 MB</td>
                      <td className="border-2 border-black p-2 font-black text-green-700">~140 - 190 MB</td>
                      <td className="border-2 border-black p-2 font-black text-green-700">~2.5 - 3 MB / min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] font-bold text-zinc-700 mt-2">
                {t('guideCustomNote')}
              </p>
            </div>
          </section>

          {/* SECTION 2: AUDIO SPECTRUM */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-black bg-black text-purple-400 px-3 py-1 border-2 border-black">{t('guideFeature2')}</span>
              <h3 className="text-2xl font-black">{t('spectrumMaker')}</h3>
            </div>
            <div className="space-y-3 font-bold text-sm bg-purple-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">1</span>
                <p><strong>{t('guideSpectrumStep1Title')}</strong> {t('guideSpectrumStep1Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">2</span>
                <p><strong>{t('guideSpectrumStep2Title')}</strong> {t('guideSpectrumStep2Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">3</span>
                <p><strong>{t('guideSpectrumStep3Title')}</strong> {t('guideSpectrumStep3Desc')}</p>
              </div>
            </div>
          </section>

          {/* SECTION 3: HAPUS BACKGROUND */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-black bg-black text-orange-400 px-3 py-1 border-2 border-black">{t('guideFeature3')}</span>
              <h3 className="text-2xl font-black">{t('guideRemoveBgTitle')}</h3>
            </div>
            <div className="space-y-3 font-bold text-sm bg-orange-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">1</span>
                <p><strong>{t('guideRemoveBgStep1Title')}</strong> {t('guideRemoveBgStep1Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">2</span>
                <p><strong>{t('guideRemoveBgStep2Title')}</strong> {t('guideRemoveBgStep2Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">3</span>
                <p><strong>{t('guideRemoveBgStep3Title')}</strong> {t('guideRemoveBgStep3Desc')}</p>
              </div>
            </div>
          </section>

          {/* SECTION 4: EDITOR VIDEO & LAYER */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-black bg-black text-cyan-400 px-3 py-1 border-2 border-black">{t('guideFeature4')}</span>
              <h3 className="text-2xl font-black">{t('guideEditorMainTitle')}</h3>
            </div>
            <div className="space-y-3 font-bold text-sm bg-blue-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">1</span>
                <p><strong>{t('guideEditorStep1Title')}</strong> {t('guideEditorStep1Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">2</span>
                <p><strong>{t('guideEditorStep2Title')}</strong> {t('guideEditorStep2Desc')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black shrink-0 mt-0.5">3</span>
                <p><strong>{t('guideEditorStep3Title')}</strong> {t('guideEditorStep3Desc')}</p>
              </div>
            </div>
          </section>

          {/* FAQ & TROUBLESHOOTING */}
          <section>
            <h3 className="text-2xl font-black bg-black text-white inline-block px-3 py-1 mb-3">{t('guideTroubleshootSection')}</h3>
            <div className="space-y-2 font-bold text-sm">
              <div className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('guideTroubleshoot1Title')}</strong> {t('guideTroubleshoot1Desc')}
              </div>
              <div className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('guideTroubleshoot2Title')}</strong> {t('guideTroubleshoot2Desc')}
              </div>
              <div className="bg-zinc-100 border-l-4 border-black pl-3 py-2">
                <strong>{t('guideTroubleshoot3Title')}</strong> {t('guideTroubleshoot3Desc')}
              </div>
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
