import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldX, ShieldAlert, Key, Loader2, Copy, CheckCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const STATUS_SCREENS = {
  loading: "loading",
  not_activated: "not_activated",
  valid: "valid",
  expired: "expired",
  invalid: "invalid",
};

export default function LicenseGate({ children }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState("loading");
  const [licenseData, setLicenseData] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [remainingDays, setRemainingDays] = useState(null);
  const [reason, setReason] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    setStatus("loading");

    // ─── OWNER BYPASS ────────────────────────────────────────────────────────
    const adminToken = localStorage.getItem("vidmix_admin_token");
    if (adminToken) {
      try {
        const adminRes = await window.api.admin.verifyToken(adminToken);
        if (adminRes.success) {
          setStatus("valid");
          return;
        }
      } catch (e) {
        console.warn("Owner bypass failed:", e);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const result = await window.api.license.check();
      setDeviceId(result.deviceId || "");
      if (result.status === "valid") {
        setLicenseData(result.data);
        setRemainingDays(result.remainingDays);
        setStatus("valid");
      } else if (result.status === "expired") {
        setLicenseData(result.data);
        setReason(result.reason || t("licenseExpiredFallback"));
        setStatus("expired");
      } else if (result.status === "not_activated") {
        setStatus("not_activated");
      } else {
        setReason(result.reason || t("licenseInvalidFallback"));
        setStatus("invalid");
      }
    } catch (e) {
      setReason(t("licenseCheckFailedFallback") + ": " + e.message);
      setStatus("invalid");
    }
  }

  async function handleActivate(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setIsActivating(true);
    setActivationError("");
    setActivationSuccess(false);
    try {
      const result = await window.api.license.activate(keyInput.trim());
      if (result.success) {
        setActivationSuccess(true);
        setLicenseData(result.data);
        setRemainingDays(result.remainingDays);
        setTimeout(() => {
          setStatus("valid");
        }, 1800);
      } else {
        setActivationError(result.error || t("licenseActivateFailedFallback"));
      }
    } catch (e) {
      setActivationError("Error: " + e.message);
    } finally {
      setIsActivating(false);
    }
  }

  function copyDeviceId() {
    navigator.clipboard.writeText(deviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2000);
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-black" />;
  }

  if (status === "valid") {
    return children;
  }

  const isExpired = status === "expired";
  const isInvalid = status === "invalid";

  return (
    <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center p-6 font-mono text-zinc-900 select-none transition-colors duration-300">
      <div className="w-full max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className={`w-24 h-24 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-6 transition-transform hover:-translate-y-1 overflow-hidden ${isExpired ? 'bg-orange-400' : isInvalid ? 'bg-red-400' : 'bg-[#00F0FF]'}`}>
            <img src="./android-chrome-192x192.png" alt="VidMix Logo" className="w-full h-full object-contain p-1" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
            {isExpired ? t("licenseExpiredTitle") : isInvalid ? t("licenseInvalidTitle") : t("licenseActivateTitle")}
          </h1>
          <p className="text-sm font-bold text-zinc-600">
            {isExpired
              ? t("licenseExpiredDesc").replace("{reason}", reason)
              : isInvalid
              ? reason || t("licenseInvalidDescFallback")
              : t("licenseLockedDesc")}
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-wider block">
              {t("licenseKeyLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value.toUpperCase());
                  setActivationError("");
                }}
                placeholder="VIDMIX-XX-XXXX-XXXX-XXXX"
                disabled={isActivating || activationSuccess}
                className="w-full px-4 py-3 border-4 border-black text-lg font-bold placeholder-zinc-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow disabled:opacity-50"
              />
            </div>
          </div>

          {activationError && (
            <div className="bg-red-400 border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              <ShieldX className="w-5 h-5 shrink-0" strokeWidth={2.5} />
              <p className="font-bold text-sm leading-tight">{activationError}</p>
            </div>
          )}

          {activationSuccess && (
            <div className="bg-[#00FF55] border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" strokeWidth={2.5} />
              <p className="font-bold text-sm leading-tight">{t("licenseActivateSuccessMsg")}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isActivating || activationSuccess || !keyInput.trim()}
            className={`w-full py-3 border-4 border-black font-black uppercase tracking-widest text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              activationSuccess ? "bg-[#00FF55]" : "bg-[#FFE500]"
            }`}
          >
            {isActivating ? (
              <><Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} /> {t("licenseActivatingBtn")}</>
            ) : activationSuccess ? (
              <><CheckCircle className="w-5 h-5" strokeWidth={3} /> {t("licenseSuccessBtn")}</>
            ) : (
              <><ShieldCheck className="w-5 h-5" strokeWidth={3} /> {t("licenseActivateBtn")}</>
            )}
          </button>
        </form>

        <hr className="my-8 border-2 border-black" />

        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-8 h-8 bg-black flex items-center justify-center" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-black uppercase tracking-wider text-sm">{t("licenseDeviceIdTitle")}</span>
            <button
              onClick={copyDeviceId}
              className="flex items-center gap-1 text-xs font-bold bg-black text-white px-2 py-1 hover:bg-zinc-800 transition-colors"
            >
              {copiedDeviceId ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedDeviceId ? t("licenseDeviceIdCopied") : t("licenseDeviceIdCopy")}
            </button>
          </div>
          <p className="font-mono text-xs break-all font-bold bg-zinc-100 p-2 border-2 border-black">{deviceId || t("licenseDeviceIdLoading")}</p>
          <p className="text-xs font-bold text-zinc-500 pt-1">{t("licenseDeviceIdHint")}</p>
        </div>
      </div>
    </div>
  );
}
