import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Receipt, Plus, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { db, queueSync } from '../../db/dexie';
import { ExpenseCategory } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';
import { triggerBackgroundSync } from '../../services/syncService';

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'umeme_luku', label: 'Umeme / LUKU' },
  { id: 'kodi', label: 'Kodi ya Fremu' },
  { id: 'posho_mshahara', label: 'Posho / Chakula' },
  { id: 'matengenezo', label: 'Matengenezo / Usafi' },
  { id: 'mifuko_packaging', label: 'Mifuko / Vifungashio' },
  { id: 'maji', label: 'Maji' },
  { id: 'other', label: 'Mengineyo' }
];

const categoryLabel = (cat: string) =>
  EXPENSE_CATEGORIES.find(c => c.id === cat)?.label || 'Mengineyo';

export const PhoneExpenses: React.FC = () => {
  const currentBranchId = localStorage.getItem('active_branch_id') || 'branch_phone_1';
  const currentBranch = useLiveQuery(() => db.branches.get(currentBranchId), [currentBranchId]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('umeme_luku');
  const [amount, setAmount] = useState('');
  const [recordedBy, setRecordedBy] = useState(() => localStorage.getItem('staff_display_name') || '');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const expenses = useLiveQuery(
    async () => {
      const list = await db.expenses
        .where('branchId')
        .equals(currentBranchId)
        .toArray();
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [currentBranchId]
  );

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayTotal = (expenses || [])
    .filter(e => e.createdAt.startsWith(todayPrefix))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!title.trim() || Number.isNaN(numAmount) || numAmount <= 0) return;

    setIsSaving(true);
    try {
      const id = `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await db.expenses.add({
        id,
        branchId: currentBranchId,
        title: title.trim(),
        category,
        amount: numAmount,
        recordedBy: recordedBy.trim() || currentBranch?.managerName || 'Mfanyakazi',
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        isSynced: false
      });

      setTitle('');
      setAmount('');
      setNotes('');
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
      triggerBackgroundSync();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, titleText: string) => {
    if (!window.confirm(`Una uhakika unataka kufuta matumizi "${titleText}"?`)) return;
    await db.expenses.delete(id);
    await queueSync('expenses', id, 'delete', { id });
    triggerBackgroundSync();
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-gradient-to-br from-rose-950/60 to-slate-900 border border-rose-500/30 rounded-3xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-rose-300 uppercase">Matumizi ya Leo ({currentBranch?.name})</div>
          <div className="text-2xl font-black text-white mt-0.5">{formatCurrency(todayTotal)}</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <Receipt className="w-6 h-6" />
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Rekodi Matumizi ya Ofisi</h2>
          {savedToast && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Imehifadhiwa!
            </span>
          )}
        </div>

        <input
          type="text"
          required
          placeholder="Maelezo (mfano: LUKU, Posho ya chai, Nauli)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as ExpenseCategory)}
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
          >
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <input
            type="number"
            required
            min={1}
            placeholder="Kiasi (TZS)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Jina la Mhudumu (Hiari)"
            value={recordedBy}
            onChange={e => setRecordedBy(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
          />
          <input
            type="text"
            placeholder="Maelezo ya ziada (Hiari)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{isSaving ? 'Inahifadhi...' : 'Hifadhi Matumizi'}</span>
        </button>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Historia ya Matumizi ({expenses?.length || 0})</span>
        </h3>
        <div className="space-y-2">
          {(expenses || []).map(ex => (
            <div
              key={ex.id}
              className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{ex.title}</div>
                <div className="text-xs text-slate-400">
                  {categoryLabel(ex.category)} • {formatDate(ex.createdAt)}
                  {ex.recordedBy ? ` • ${ex.recordedBy}` : ''}
                </div>
                {ex.notes && <div className="text-xs text-slate-500 mt-0.5 truncate">{ex.notes}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="font-black text-sm text-rose-400">-{formatCurrency(ex.amount)}</div>
                  <div className="text-[10px] text-slate-500">{ex.isSynced ? 'Imefika kwa Boss' : 'Inasubiri mtandao'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(ex.id, ex.title)}
                  title="Futa matumizi"
                  className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {(!expenses || expenses.length === 0) && (
            <p className="text-xs text-slate-400 text-center py-6">Hakuna matumizi yaliyorekodiwa bado.</p>
          )}
        </div>
      </div>
    </div>
  );
};
