import React, { useState } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  Smartphone, 
  MessageSquare, 
  Copy, 
  X, 
  Lock,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { 
  checkLicenseStatus, 
  activateLicenseWithCode, 
  generateLicenseCode, 
  getDeviceId,
  type LicenseInfo 
} from '../../services/licenseService';
import { formatDate } from '../../services/receiptService';
import confetti from 'canvas-confetti';

interface LicenseModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isEnforcedLock?: boolean; // When true, modal cannot be dismissed until valid code is entered
  onSuccess?: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  isEnforcedLock = false,
  onSuccess
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => checkLicenseStatus());
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDevGenerator, setShowDevGenerator] = useState(false);
  const [devTargetId, setDevTargetId] = useState('');
  const [devDays, setDevDays] = useState(30);
  const [generatedDevKey, setGeneratedDevKey] = useState('');

  if (!isOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setErrorMsg('Tafadhali weka msimbo wa leseni uliotumiwa.');
      return;
    }

    const res = activateLicenseWithCode(inputCode.trim());
    if (res.success) {
      setErrorMsg(null);
      setSuccessMsg(res.message);
      setLicenseInfo(checkLicenseStatus());
      setInputCode('');

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1500);
    } else {
      setErrorMsg(res.message);
      setSuccessMsg(null);
    }
  };

  const handleGenerateDevKey = () => {
    const target = devTargetId.trim() || licenseInfo.deviceId;
    const key = generateLicenseCode(target, devDays);
    setGeneratedDevKey(key);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Imenakiliwa kwenye clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          licenseInfo.isExpired 
            ? 'bg-rose-950/70 border-rose-500/40 text-rose-300' 
            : 'bg-slate-800/80 border-slate-700 text-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black ${
              licenseInfo.isExpired ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {licenseInfo.isExpired ? <Lock className="w-5 h-5 text-rose-400" /> : <KeyRound className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {licenseInfo.isExpired ? 'Muda wa Leseni Umekwisha' : 'Leseni ya Mfumo (Subscription)'}
              </div>
              <div className="text-[11px] text-slate-400">
                {licenseInfo.isExpired ? 'Fungua kwa kuingiza Code ya Mwezi' : `${licenseInfo.daysRemaining} siku zimebaki`}
              </div>
            </div>
          </div>

          {!isEnforcedLock && onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          
          {/* Current Device / Shop Details */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Device / Shop ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-white text-sm bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                  {licenseInfo.deviceId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(licenseInfo.deviceId)}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Nakili ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hali ya Leseni:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                licenseInfo.isExpired 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : licenseInfo.isExpiringSoon
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {licenseInfo.isExpired ? 'Imefungwa (Expired)' : `Hai (${licenseInfo.daysRemaining} siku)`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tarehe ya Mwisho:</span>
              <span className="font-medium text-slate-200">{formatDate(licenseInfo.expiresAt)}</span>
            </div>
          </div>

          {/* Form to Enter License Key */}
          <form onSubmit={handleActivate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-200 mb-1">
                Weka Msimbo wa Leseni (License Code) *:
              </label>
              <input
                type="text"
                required
                placeholder="mfano: LIC-30-W8Y2"
                value={inputCode}
                onChange={e => {
                  setInputCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-black text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-[11px] font-bold animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-[11px] font-bold animate-in fade-in flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs"
            >
              Washa / Ongeza Leseni Sasa
            </button>
          </form>

          {/* WhatsApp Payment & Request Button */}
          <div className="p-3 bg-slate-800/70 border border-slate-700/70 rounded-2xl space-y-2 text-center">
            <div className="text-[11px] text-slate-300">
              Je, unahitaji kulipia au kuongeza leseni ya mwezi mpya?
            </div>
            <a
              href={`https://wa.me/255712345678?text=${encodeURIComponent(`Habari, nahitaji kulipia leseni ya mwezi mpya kwa duka langu. Device ID yangu ni: ${licenseInfo.deviceId}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Omba Code ya Leseni WhatsApp</span>
            </a>
          </div>

          {/* Developer / Master Tool Toggle */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
            <span>Usimamizi wa Leseni (SaaS)</span>
            <button
              type="button"
              onClick={() => setShowDevGenerator(!showDevGenerator)}
              className="hover:text-slate-300 underline"
            >
              {showDevGenerator ? 'Ficha Generator' : 'Tengeneza Code (Admin)'}
            </button>
          </div>

          {/* Developer Generator Tool */}
          {showDevGenerator && (
            <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-2 animate-in fade-in">
              <div className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>Admin License Generator:</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div>
                  <label className="block text-slate-400 mb-0.5">Device ID ya Mteja:</label>
                  <input
                    type="text"
                    placeholder={licenseInfo.deviceId}
                    value={devTargetId}
                    onChange={e => setDevTargetId(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-0.5">Muda wa Leseni (Siku):</label>
                  <select
                    value={devDays}
                    onChange={e => setDevDays(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value={30}>Siku 30 (Mwezi 1)</option>
                    <option value={60}>Siku 60 (Miezi 2)</option>
                    <option value={90}>Siku 90 (Miezi 3)</option>
                    <option value={180}>Siku 180 (Miezi 6)</option>
                    <option value={365}>Siku 365 (Mwaka 1)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateDevKey}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-xs mt-1"
                >
                  Tengeneza Code ya Mteja
                </button>

                {generatedDevKey && (
                  <div className="p-2 bg-slate-900 border border-amber-500/30 rounded-lg flex items-center justify-between mt-1">
                    <span className="font-mono font-black text-amber-300 text-xs">{generatedDevKey}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedDevKey)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
                    >
                      Nakili
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
