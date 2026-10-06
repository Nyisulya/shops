import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, DollarSign, Plus, Trash2, Receipt, Calendar, Tag, Check, AlertCircle } from 'lucide-react';
import { db, generateUniqueId, queueSync } from '../../db/dexie';
import type { Expense, ExpenseCategory } from '../../types';
import { formatCurrency, formatDate } from '../../services/receiptService';

interface LaundryExpenseModalProps {
  branchId: string;
  branchName: string;
  onClose: () => void;
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'sabuni_kemikali', label: 'Sabuni, Omo, Jik & Downy', icon: '🧼' },
  { id: 'umeme_luku', label: 'Umeme wa LUKU (Pasi & Mashine)', icon: '⚡' },
  { id: 'maji', label: 'Maji (Madumu / Bili)', icon: '💧' },
  { id: 'mkaa_pasi', label: 'Mkaa / Pasi', icon: '♨️' },
  { id: 'mifuko_packaging', label: 'Mifuko ya Nailoni (Packaging)', icon: '🛍️' },
  { id: 'posho_mshahara', label: 'Posho / Mshahara wa Mfanyakazi', icon: '💰' },
  { id: 'matengenezo', label: 'Matengenezo ya Mashine / Pasi', icon: '🔧' },
  { id: 'kodi', label: 'Kodi ya Kibanda / Pango', icon: '🏠' },
  { id: 'other', label: 'Matumizi Mengineyo', icon: '📝' },
];

export const LaundryExpenseModal: React.FC<LaundryExpenseModalProps> = ({
  branchId,
  branchName,
  onClose
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('sabuni_kemikali');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load recent expenses for this branch
  const expenses = useLiveQuery(
    async () => db.expenses.where('branchId').equals(branchId).reverse().sortBy('createdAt'),
    [branchId]
  ) || [];

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Tafadhali weka kiasi halali cha fedha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = EXPENSE_CATEGORIES.find(c => c.id === category);
      const expenseTitle = title.trim() || selectedCat?.label || 'Matumizi ya Duka';

      const newExpense: Expense = {
        id: generateUniqueId('exp'),
        branchId,
        title: expenseTitle,
        category,
        amount: Number(amount),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        isSynced: false
      };

      await db.expenses.put(newExpense);
      await queueSync('expenses', newExpense.id, 'create', newExpense);

      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Imeshindwa kurekodi matumizi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Je, una uhakika unataka kufuta rekodi hii ya matumizi?')) {
      await db.expenses.delete(id);
      await queueSync('expenses', id, 'delete', null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <span>Rekodi Matumizi — {branchName}</span>
            </h2>
            <div className="text-[11px] text-slate-400">
              Sabuni, Umeme (Luku), Maji, Mifuko & Gharama nyingine
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* New Expense Form */}
          <form onSubmit={handleSubmit} className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Ingiza Matumizi Mapya</span>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Aina ya Matumizi:</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-medium"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title / Description */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Maelezo ya Matumizi (Hiari):</label>
              <input
                type="text"
                placeholder="mfano: Sabuni ya Omo kilo 5 & Jik ndogo"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Kiasi Kilichotumika (TZS) *:</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  placeholder="mfano: 15000"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-black text-amber-400 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-md shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Hifadhi Matumizi Haya</span>
            </button>
          </form>

          {/* List of Previous Expenses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Historia ya Matumizi ({expenses.length})
              </div>
              <div className="text-xs font-black text-rose-400">
                Jumla: -{formatCurrency(totalExpenses)}
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="p-4 bg-slate-850 rounded-xl text-center text-xs text-slate-400 border border-slate-800">
                Hakuna matumizi yaliyorekodiwa bado kwa tawi hili.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                {expenses.map(exp => (
                  <div key={exp.id} className="p-2.5 bg-slate-850 border border-slate-700/60 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{exp.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {formatDate(exp.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="font-black text-rose-400">-{formatCurrency(exp.amount)}</div>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Futa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
