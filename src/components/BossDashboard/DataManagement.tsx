import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Cloud, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { exportDatabaseBackup, importDatabaseBackup } from '../../services/syncService';
import { db } from '../../db/dexie';
import { initializeDatabaseData } from '../../db/initialData';

export const DataManagement: React.FC = () => {
  const [cloudApiUrl, setCloudApiUrl] = useState('https://api.madukatatu.pos/v1/sync');

  const handleResetData = async () => {
    if (confirm('Je, una uhakika unataka kufuta data zote na kurudisha data za mwanzo za mfano?')) {
      await db.delete();
      await db.open();
      await initializeDatabaseData();
      alert('Data zote zimewekwa upya!');
      window.location.reload();
    }
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
    <div className="space-y-4 pb-24">
      
      {/* Backup & Restore Card */}
      <div className="p-4 bg-slate-800/90 border border-slate-700/80 rounded-3xl space-y-3 shadow-md">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span>Hifadhi Nakala (Offline JSON Backup)</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Unaweza kupakua faili la nakala (backup) la data zote za ofisi 3 wakati wowote. Hata simu ikipotea au kuharibika, ukiweka faili hili data zote zinarudi papo hapo.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => exportDatabaseBackup()}
            className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Pakua JSON Backup</span>
          </button>

          <label className="py-3 px-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-600 transition-all active:scale-95 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Rejesha Backup</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>
        </div>
      </div>

      {/* Cloud Server Settings */}
      <div className="p-4 bg-slate-800/90 border border-slate-700/80 rounded-3xl space-y-3 shadow-md">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Cloud className="w-4 h-4 text-emerald-400" />
          <span>Mipangilio ya Seva Kuu (Cloud Server)</span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Seva ya Kusawazisha Jioni (Sync URL):</label>
          <input
            type="url"
            value={cloudApiUrl}
            onChange={e => setCloudApiUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
        <p className="text-[10px] text-slate-400">
          * Mfumo huu unafanya kazi 100% offline. Seva hii inatumika jioni pekee wakati wafanyakazi wanapowasha bando kusawazisha.
        </p>
      </div>

      {/* Reset Demo Data */}
      <div className="p-4 bg-slate-800/60 border border-rose-500/30 rounded-3xl space-y-2.5">
        <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Weka Upya Data za Majaribio (Reset Demo)</span>
        </div>
        <p className="text-xs text-slate-400">
          Ukibonyeza hapa, data zote zitafutwa na kurudisha sampuli za mwanzo za bidhaa za simu, nguo za kufuliwa na miamala ya mfano.
        </p>
        <button
          onClick={handleResetData}
          className="py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rudisha Data za Awali</span>
        </button>
      </div>
    </div>
  );
};
