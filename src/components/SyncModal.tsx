import React, { useState, useEffect } from 'react';
import { 
  X, 
  CloudUpload, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Download, 
  Upload, 
  Wifi, 
  WifiOff, 
  HardDrive,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  getPendingSyncCount, 
  performCloudSync, 
  exportDatabaseBackup, 
  importDatabaseBackup 
} from '../services/syncService';
import { db } from '../db/dexie';
import { formatDate } from '../services/receiptService';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onSyncComplete }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [syncPercent, setSyncPercent] = useState<number>(0);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncDate, setLastSyncDate] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const loadStats = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);

      const branch = await db.branches.toCollection().first();
      if (branch?.lastSyncedAt) {
        setLastSyncDate(formatDate(branch.lastSyncedAt));
      }
    };

    loadStats();
    setIsOnline(navigator.onLine);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsSyncing(true);
    setResultMessage(null);
    setSyncPercent(5);
    setSyncStatusText('Inaanza maandalizi ya kusawazisha...');

    const result = await performCloudSync((step, pct) => {
      setSyncStatusText(step);
      setSyncPercent(pct);
    });

    setIsSyncing(false);

    if (result.success) {
      setResultMessage({ type: 'success', text: result.message });
      setPendingCount(0);
      setLastSyncDate(formatDate(new Date().toISOString()));
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onSyncComplete) onSyncComplete();
    } else {
      setResultMessage({ type: 'error', text: result.message });
    }
  };

  const handleExportBackup = async () => {
    await exportDatabaseBackup();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importDatabaseBackup(content);
        if (res.success) {
          alert('Hongera! Backup imerejeshwa kikamilifu.');
          window.location.reload();
        } else {
          alert(res.message);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Kusawazisha Jioni (Evening Sync)</h2>
              <p className="text-[11px] text-slate-400">Tuma data za leo kwenye Seva Kuu ya Boss</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          
          {/* Network Status Card */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between ${
            isOnline 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {isOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
              <div>
                <div className="text-xs font-bold">{isOnline ? 'Intaneti Imepatikana (Online)' : 'Huna Bando / Offline'}</div>
                <div className="text-[10px] text-slate-400">
                  {isOnline ? 'Tayari kutuma rekodi zote kwa boss' : 'Washa hotspot au bando la jioni ili kusawazisha'}
                </div>
              </div>
            </div>
          </div>

          {/* Sync Stats Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Rekodi Zinazosubiri Kutumwa:</span>
              <span className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${
                pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700 text-slate-300'
              }`}>
                {pendingCount} records
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Mara ya Mwisho Kusawazisha:</span>
              <span className="text-slate-200 font-medium">{lastSyncDate || 'Bado'}</span>
            </div>
          </div>

          {/* Sync Progress / Animation */}
          {isSyncing && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs font-semibold text-blue-300">
                <span>{syncStatusText}</span>
                <span>{syncPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${syncPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Result Alert */}
          {resultMessage && (
            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
              resultMessage.type === 'success' 
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}>
              {resultMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs font-medium leading-relaxed">{resultMessage.text}</div>
            </div>
          )}

          {/* Sync Trigger Button */}
          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Inasawazisha...' : 'Sawazisha Sasa (Sync Now)'}</span>
          </button>

          {/* Offline Database Backup & Restore section */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Hifadhi Nakala ya Ndani (Offline JSON Backup)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Pakua Backup</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rejesha Backup</span>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportFile}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Unaweza kupakua nakala hii hata kama hakuna intaneti kabisa na kuituma kwa WhatsApp kama usalama wa ziada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
