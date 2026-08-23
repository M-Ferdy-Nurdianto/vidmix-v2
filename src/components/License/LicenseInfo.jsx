import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ShieldAlert, X, Key, CalendarDays, Monitor } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function LicenseInfo() {
  const { t, lang } = useLanguage();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    loadInfo();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowDetail(false);
      }
    }
    if (showDetail) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDetail]);

  async function loadInfo() {
    try {
      const data = await window.api.license.info();
      setInfo(data);
    } catch (e) {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !info) return null;

  const isLifetime = !info.expiresAt;
  const isExpiringSoon = !isLifetime && info.remainingDays !== null && info.remainingDays <= 3;

  const badgeBg = isExpiringSoon ? "bg-red-400" : "bg-[#00FF55]";
  const textColor = "text-black";

  return (
    <div className="relative ml-auto font-mono select-none" ref={panelRef}>
      <button
        onClick={() => setShowDetail((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${badgeBg} ${textColor}`}
        title={t("licenseInfoTooltip")}
      >
        {isExpiringSoon ? (
          <ShieldAlert className="w-5 h-5" strokeWidth={3} />
        ) : (
          <ShieldCheck className="w-5 h-5" strokeWidth={3} />
        )}
        <span className="tracking-widest">{t("licenseInfoActive")}</span>
      </button>

      {showDetail && (
        <div className="absolute top-full right-0 mt-4 w-80 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50">
          <div className={`${badgeBg} border-b-4 border-black p-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
              <ShieldCheck className="w-5 h-5" strokeWidth={3} />
              <span>{t("licenseInfoPanelTitle")}</span>
            </div>
            <button 
              onClick={() => setShowDetail(false)} 
              className="w-6 h-6 bg-white border-2 border-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors active:translate-y-0.5"
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>

          <div className="p-4 space-y-3 bg-[#F4F4F0]">
            <div className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <InfoRow icon={<Key className="w-4 h-4" />} label={t("licenseInfoVersion")} value="PREMIUM" />
              <InfoRow
                icon={<CalendarDays className="w-4 h-4" />}
                label={t("licenseInfoStatus")}
                value={isExpiringSoon ? t("licenseInfoStatusExpiringSoon") : t("licenseInfoStatusActive")}
                valueColor={isExpiringSoon ? "text-red-500" : "text-green-600"}
              />
              <InfoRow
                icon={<CalendarDays className="w-4 h-4" />}
                label={t("licenseInfoActivatedAt")}
                value={new Date(info.activatedAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
              />
            </div>

            <div className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600">
                <Monitor className="w-4 h-4" strokeWidth={3} />
                <span>{t("licenseInfoDeviceId")}</span>
              </div>
              <p className="font-mono text-xs bg-zinc-100 p-2 border-2 border-black break-all font-bold">
                {info.deviceId ? info.deviceId : "-"}
              </p>
            </div>

            {isExpiringSoon && (
              <div className="bg-red-400 border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-2 mt-2">
                <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={3} />
                <p className="text-xs font-bold leading-tight">
                  {t("licenseInfoExpiringWarning")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, valueColor = "text-black" }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-black/10 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-zinc-600">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-black uppercase ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
