import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Filter, Check } from 'lucide-react';

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom';

export interface DateFilterState {
  preset: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export const checkDateInRange = (dateStr: string, filter: DateFilterState): boolean => {
  if (!dateStr) return false;
  if (filter.preset === 'all') return true;

  const itemDate = new Date(dateStr);
  const now = new Date();
  
  // Normalized day boundaries
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (filter.preset === 'today') {
    return itemDate >= todayStart && itemDate <= todayEnd;
  }

  if (filter.preset === 'yesterday') {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    return itemDate >= yesterdayStart && itemDate <= yesterdayEnd;
  }

  if (filter.preset === 'week') {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    return itemDate >= weekStart && itemDate <= todayEnd;
  }

  if (filter.preset === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return itemDate >= monthStart && itemDate <= todayEnd;
  }

  if (filter.preset === 'last_month') {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
  }

  if (filter.preset === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return itemDate >= yearStart && itemDate <= todayEnd;
  }

  if (filter.preset === 'custom') {
    if (!filter.startDate && !filter.endDate) return true;
    if (filter.startDate) {
      const s = new Date(filter.startDate + 'T00:00:00');
      if (itemDate < s) return false;
    }
    if (filter.endDate) {
      const e = new Date(filter.endDate + 'T23:59:59');
      if (itemDate > e) return false;
    }
    return true;
  }

  return true;
};

export const getFilterDescription = (filter: DateFilterState): string => {
  switch (filter.preset) {
    case 'today': return 'Leo';
    case 'yesterday': return 'Jana';
    case 'week': return 'Siku 7 Zilizopita';
    case 'month': return 'Mwezi Huu';
    case 'last_month': return 'Mwezi Uliopita';
    case 'year': return 'Mwaka Huu';
    case 'all': return 'Muda Wote (All Time)';
    case 'custom':
      if (filter.startDate && filter.endDate) {
        return `${filter.startDate} hadi ${filter.endDate}`;
      }
      if (filter.startDate) return `Kuanzia ${filter.startDate}`;
      if (filter.endDate) return `Hadi ${filter.endDate}`;
      return 'Tarehe Maalum';
    default: return 'Muda Wote';
  }
};

interface BossDateFilterProps {
  value: DateFilterState;
  onChange: (value: DateFilterState) => void;
  className?: string;
}

export const BossDateFilter: React.FC<BossDateFilterProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(value.preset === 'custom');
  const [customStart, setCustomStart] = useState<string>(value.startDate || '');
  const [customEnd, setCustomEnd] = useState<string>(value.endDate || '');

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'Leo' },
    { id: 'yesterday', label: 'Jana' },
    { id: 'week', label: 'Siku 7' },
    { id: 'month', label: 'Mwezi Huu' },
    { id: 'last_month', label: 'Mwezi Uliopita' },
    { id: 'year', label: 'Mwaka Huu' },
    { id: 'all', label: 'Muda Wote' },
  ];

  const handleSelectPreset = (p: DatePreset) => {
    setIsCustomExpanded(false);
    onChange({ preset: p });
  };

  const handleApplyCustom = () => {
    if (!customStart && !customEnd) return;
    onChange({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd
    });
  };

  const handleClearCustom = () => {
    setCustomStart('');
    setCustomEnd('');
    onChange({ preset: 'today' });
    setIsCustomExpanded(false);
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-md ${className}`}>
      
      {/* Top Header Label & Active Description */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Chuja kwa Muda (Date Filter)</div>
            <div className="text-xs font-black text-amber-300">
              {getFilterDescription(value)}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCustomExpanded(!isCustomExpanded)}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${
            isCustomExpanded || value.preset === 'custom'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/70'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>From - To</span>
          {isCustomExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {presets.map(item => {
          const isSelected = value.preset === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectPreset(item.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-102'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Inputs (From & To) */}
      {isCustomExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Kuanzia Tarehe (From):
              </label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Hadi Tarehe (To):
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleClearCustom}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/40"
            >
              Futa (Reset)
            </button>
            <button
              onClick={handleApplyCustom}
              disabled={!customStart && !customEnd}
              className="px-3.5 py-1.5 rounded-xl text-[11px] font-black text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Chuja Kipindi Hiki</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
