import React, { useState, useEffect } from "react";
import { Key, Trash2, X, Plus, ShieldCheck, ShieldAlert, Loader2, Copy, EyeOff, Eye, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPanel({ onClose }) {
  const [token, setToken] = useState(() => localStorage.getItem("vidmix_admin_token") || "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [keys, setKeys] = useState({});
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State untuk modal konfirmasi hapus
  const [revokeConfirmKey, setRevokeConfirmKey] = useState(null);
  
  // State untuk pembuatan kunci baru
  const [pendingKeyType, setPendingKeyType] = useState(null);
  const [targetDeviceId, setTargetDeviceId] = useState("");

  useEffect(() => {
    if (token && !isAuthenticated) {
      handleLogin(new Event("submit"));
    }
  }, []);

  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!token.trim()) {
      toast.error("Masukkan GitHub Token Anda!");
      return;
    }
    
    setIsAuthenticating(true);
    try {
      const res = await window.api.admin.verifyToken(token.trim());
      if (res.success) {
        setIsAuthenticated(true);
        localStorage.setItem("vidmix_admin_token", token.trim());
        toast.success("Login Master berhasil!");
        fetchKeys();
      } else {
        toast.error("Token tidak valid: " + res.error);
        localStorage.removeItem("vidmix_admin_token");
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setToken("");
    setKeys({});
    localStorage.removeItem("vidmix_admin_token");
    toast.success("Logout berhasil");
  }

  async function fetchKeys() {
    setIsLoadingKeys(true);
    try {
      const res = await window.api.admin.listKeys(token.trim());
      if (res.success) {
        setKeys(res.licenses || {});
      } else {
        toast.error("Gagal mengambil daftar lisensi: " + res.error);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setIsLoadingKeys(false);
    }
  }

  function initiateGenerateKey(type) {
    setPendingKeyType(type);
    setTargetDeviceId(""); // Reset isian
  }

  async function executeGenerateKey(e) {
    e.preventDefault();
    if (!targetDeviceId.trim()) {
      toast.error("Device ID pelanggan wajib diisi!");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await window.api.admin.generateKey(token.trim(), pendingKeyType, targetDeviceId.trim());
      if (res.success) {
        toast.success(`Key ${pendingKeyType} berhasil dibuat!`);
        setPendingKeyType(null); // Tutup modal
        fetchKeys(); // refresh
      } else {
        toast.error("Gagal membuat key: " + res.error);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function confirmRevoke(key) {
    setRevokeConfirmKey(key);
  }

  async function executeRevoke(key) {
    setRevokeConfirmKey(null);
    try {
      const res = await window.api.admin.revokeKey(token.trim(), key);
      if (res.success) {
        toast.success(`Key ${key} berhasil dihapus.`);
        fetchKeys();
      } else {
        toast.error("Gagal menghapus key: " + res.error);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard!");
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-9999 flex items-center justify-center p-6 font-mono select-none overflow-hidden text-zinc-900">
      
      {/* Main Container */}
      <div className="w-full max-w-5xl bg-[#F4F4F0] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-black border-b-4 border-black p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#00FF55]" strokeWidth={3} />
            <h1 className="font-black text-xl uppercase tracking-widest text-[#00FF55]">Master Control Panel</h1>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white text-black border-4 border-white flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors hover:border-red-500"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5 font-black" strokeWidth={4} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 relative">
          
          {!isAuthenticated ? (
            // --- LOGIN SCREEN ---
            <div className="max-w-md mx-auto mt-10 bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-black flex items-center justify-center rounded-xl rotate-3">
                  <Key className="w-8 h-8 text-[#FFE500]" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="font-black text-3xl uppercase mb-2 text-center tracking-tighter">Login Master</h2>
              <p className="text-sm font-bold text-zinc-500 mb-8 text-center leading-relaxed">
                Masukkan GitHub Token Anda untuk mengakses generator lisensi.
              </p>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-wider block">
                    GitHub Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 border-4 border-black text-sm font-bold placeholder-zinc-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 border-2 border-transparent hover:border-black transition-colors"
                    >
                      {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating || !token.trim()}
                  className="w-full py-4 bg-[#FFE500] border-4 border-black font-black uppercase tracking-widest hover:bg-[#00FF55] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isAuthenticating ? <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} /> : <Key className="w-6 h-6" strokeWidth={3} />}
                  {isAuthenticating ? "VERIFYING..." : "ENTER CONSOLE"}
                </button>
              </form>
            </div>
          ) : (
            // --- DASHBOARD ---
            <div className="flex flex-col gap-6">
              
              {/* Top Controls */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => initiateGenerateKey('2w')}
                    disabled={isGenerating}
                    className="px-4 py-3 bg-[#00F0FF] border-4 border-black font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} /> 2 Minggu
                  </button>
                  <button
                    onClick={() => initiateGenerateKey('1m')}
                    disabled={isGenerating}
                    className="px-4 py-3 bg-[#FF3CAC] text-white border-4 border-black font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} /> 1 Bulan
                  </button>
                  <button
                    onClick={() => initiateGenerateKey('lifetime')}
                    disabled={isGenerating}
                    className="px-4 py-3 bg-[#00FF55] border-4 border-black font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} /> Lifetime
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={fetchKeys}
                    disabled={isLoadingKeys}
                    className="px-4 py-3 bg-white border-4 border-black font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-5 h-5 ${isLoadingKeys ? 'animate-spin' : ''}`} strokeWidth={3} />
                    REFRESH
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-3 bg-black text-white border-4 border-black font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:border-red-500 active:translate-y-1 active:shadow-none transition-all"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black text-white border-b-4 border-black uppercase text-xs font-black tracking-widest">
                        <th className="p-4 border-r-4 border-white/20 whitespace-nowrap">License Key</th>
                        <th className="p-4 border-r-4 border-white/20 text-center">Type</th>
                        <th className="p-4 border-r-4 border-white/20 text-center">Status</th>
                        <th className="p-4 border-r-4 border-white/20">Device ID</th>
                        <th className="p-4 w-20 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-bold bg-white">
                      {Object.keys(keys).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-12 text-center text-zinc-500 font-bold uppercase tracking-widest text-lg">
                            {isLoadingKeys ? "MEMUAT DATA..." : "BELUM ADA LISENSI"}
                          </td>
                        </tr>
                      ) : (
                        Object.entries(keys).reverse().map(([keyStr, data]) => {
                          const isExpired = data.expiresAt && new Date(data.expiresAt) < new Date();
                          const isUsed = !!data.activatedAt;
                          
                          let statusColor = "bg-zinc-200 border-zinc-400";
                          let statusText = "BELUM DIPAKAI";
                          if (isExpired) {
                            statusColor = "bg-red-400 border-red-600 text-white";
                            statusText = "EXPIRED";
                          } else if (isUsed) {
                            statusColor = "bg-[#00FF55] border-green-600";
                            statusText = "AKTIF";
                          }

                          let typeColor = "";
                          if (data.type === '2w') typeColor = "text-[#00c0cc]";
                          if (data.type === '1m') typeColor = "text-[#FF3CAC]";
                          if (data.type === 'lifetime') typeColor = "text-[#00cc44]";

                          return (
                            <tr key={keyStr} className="border-b-4 border-black last:border-b-0 hover:bg-zinc-100 transition-colors">
                              <td className="p-4 border-r-4 border-black font-mono">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg bg-zinc-100 px-2 py-1 border-2 border-black">{keyStr}</span>
                                  <button onClick={() => copyToClipboard(keyStr)} className="p-2 bg-black text-white hover:bg-zinc-700 active:scale-95 border-2 border-black rounded-lg" title="Copy Key">
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2 font-bold uppercase tracking-wider">Issued: {data.issuedAt}</div>
                              </td>
                              <td className={`p-4 border-r-4 border-black text-center font-black uppercase text-base ${typeColor}`}>
                                {data.label}
                              </td>
                              <td className="p-4 border-r-4 border-black text-center">
                                <span className={`inline-block px-3 py-1.5 border-4 font-black text-xs uppercase tracking-widest ${statusColor} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                                  {statusText}
                                </span>
                                {isUsed && !isExpired && (
                                  <div className="text-xs text-zinc-600 mt-3 font-bold uppercase tracking-wider">
                                    Exp: {data.expiresAt || "Selamanya"}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 border-r-4 border-black text-xs font-mono break-all min-w-50">
                                {data.deviceId ? (
                                  <div className="flex flex-col gap-2">
                                    <span className="bg-zinc-100 p-2 border-2 border-black">{data.deviceId}</span>
                                    <button onClick={() => copyToClipboard(data.deviceId)} className="self-start px-2 py-1 bg-black text-white text-[10px] font-bold uppercase hover:bg-zinc-800 border-2 border-black">Copy ID</button>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 font-bold uppercase tracking-widest">NONE</span>
                                )}
                              </td>
                              <td className="p-4 align-middle">
                                <div className="min-w-12.5">
                                  <button
                                    onClick={() => confirmRevoke(keyStr)}
                                    className="p-3 bg-white border-4 border-black hover:bg-red-500 hover:text-white transition-colors active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none mx-auto block"
                                    title="Hapus Lisensi"
                                  >
                                    <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
        
      </div>

      {/* Modal Konfirmasi Hapus */}
      {revokeConfirmKey && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10000 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500 border-2 border-black flex items-center justify-center rotate-3">
                <Trash2 className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tighter">Hapus Lisensi?</h3>
            </div>
            
            <p className="text-sm font-bold text-zinc-600 mb-6 leading-relaxed">
              Yakin menghapus <span className="bg-zinc-200 px-1 border border-black text-black">{revokeConfirmKey}</span>? Akses pelanggan akan langsung terblokir!
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setRevokeConfirmKey(null)}
                className="flex-1 py-3 bg-white border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => executeRevoke(revokeConfirmKey)}
                className="flex-1 py-3 bg-red-500 text-white border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
              >
                Ya, Hapus!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Device ID saat buat kunci */}
      {pendingKeyType && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10000 flex items-center justify-center p-4">
          <form onSubmit={executeGenerateKey} className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FFE500] border-2 border-black flex items-center justify-center -rotate-3">
                <Key className="w-5 h-5 text-black" strokeWidth={3} />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tighter">Ikat Device ID</h3>
            </div>
            
            <p className="text-sm font-bold text-zinc-600 mb-4 leading-relaxed">
              Masukkan <span className="bg-zinc-200 px-1 border border-black text-black">Device ID</span> pelanggan Anda. Kunci lisensi yang dibuat akan terkunci secara permanen HANYA untuk komputer tersebut!
            </p>

            <div className="mb-6">
              <input
                type="text"
                autoFocus
                value={targetDeviceId}
                onChange={(e) => setTargetDeviceId(e.target.value)}
                placeholder="Paste Device ID di sini..."
                className="w-full px-4 py-3 border-4 border-black font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-yellow-50 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setPendingKeyType(null)}
                className="flex-1 py-3 bg-white border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={isGenerating || !targetDeviceId.trim()}
                className="flex-1 py-3 bg-[#00FF55] text-black border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                BUAT KUNCI
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
