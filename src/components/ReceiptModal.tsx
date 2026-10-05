import React from 'react';
import { X, Printer, Share2, CheckCircle2, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate, generateWhatsAppLink } from '../services/receiptService';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    type: 'phone_sale' | 'laundry_order' | 'wakala_tx' | 'phone_repair';
    title: string;
    branchName: string;
    branchPhone: string;
    branchLocation: string;
    receiptNumber: string;
    createdAt: string;
    customerName?: string;
    customerPhone?: string;
    items?: Array<{ name: string; qty: number; price: number; total: number; imei?: string }>;
    totalAmount: number;
    discount?: number;
    paidAmount: number;
    balanceDue?: number;
    paymentMethod?: string;
    cashierName?: string;
    tagNumber?: string;
    promisedDate?: string;
    notes?: string;
  } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!data.customerPhone) {
      alert('Tafadhali weka namba ya simu ya mteja ili kutuma risiti kupitia WhatsApp.');
      return;
    }

    let message = `*${data.branchName.toUpperCase()}*\n`;
    message += `📍 ${data.branchLocation}\n`;
    message += `📞 Simu: ${data.branchPhone}\n`;
    message += `--------------------------------\n`;
    message += `Risiti: *${data.receiptNumber}*\n`;
    message += `Tarehe: ${formatDate(data.createdAt)}\n`;
    if (data.customerName) message += `Mteja: ${data.customerName}\n`;
    if (data.tagNumber) message += `Tag ya Nguo: *${data.tagNumber}*\n`;
    message += `--------------------------------\n`;

    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        message += `• ${item.name} (${item.qty}x) = ${formatCurrency(item.total)}\n`;
        if (item.imei) message += `  IMEI: ${item.imei}\n`;
      });
      message += `--------------------------------\n`;
    }

    message += `JUMLA KUU: *${formatCurrency(data.totalAmount)}*\n`;
    if (data.discount && data.discount > 0) {
      message += `Punguzo: -${formatCurrency(data.discount)}\n`;
    }
    message += `Kiasi Kilicholipwa: ${formatCurrency(data.paidAmount)}\n`;
    if (data.balanceDue && data.balanceDue > 0) {
      message += `Baki Inayodaiwa: *${formatCurrency(data.balanceDue)}*\n`;
    }
    if (data.promisedDate) {
      message += `Ahadi ya Kuchukua: ${data.promisedDate}\n`;
    }
    message += `--------------------------------\n`;
    message += `Asante kwa kufanya biashara nasi! Karibu tena.`;

    const url = generateWhatsAppLink(data.customerPhone, message);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-100">Risiti ya Malipo (POS Receipt)</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          <div 
            id="thermal-receipt"
            className="w-full bg-white text-slate-900 p-4 rounded-xl shadow-md font-mono text-[11px] leading-tight space-y-2 border border-slate-300 select-text"
          >
            {/* Header / Logo */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <div className="font-extrabold text-sm uppercase tracking-wider text-black">{data.branchName}</div>
              <div className="text-[10px] text-slate-600">{data.branchLocation}</div>
              <div className="text-[10px] text-slate-600">Simu: {data.branchPhone}</div>
            </div>

            {/* Receipt Info */}
            <div className="text-[10px] space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>Namba:</span>
                <span className="font-bold">{data.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tarehe:</span>
                <span>{formatDate(data.createdAt)}</span>
              </div>
              {data.customerName && (
                <div className="flex justify-between">
                  <span>Mteja:</span>
                  <span className="font-semibold">{data.customerName}</span>
                </div>
              )}
              {data.customerPhone && (
                <div className="flex justify-between">
                  <span>Simu ya Mteja:</span>
                  <span>{data.customerPhone}</span>
                </div>
              )}
              {data.tagNumber && (
                <div className="flex justify-between bg-slate-100 px-1 py-0.5 rounded font-bold text-xs">
                  <span>TAG YA NGUO:</span>
                  <span className="text-black underline">{data.tagNumber}</span>
                </div>
              )}
              {data.cashierName && (
                <div className="flex justify-between text-slate-500">
                  <span>Mhudumu:</span>
                  <span>{data.cashierName}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            {data.items && data.items.length > 0 && (
              <div className="border-t border-b border-dashed border-slate-400 py-1.5 my-1 space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-slate-700 pb-0.5">
                  <span>BIDHAA / HUDUMA</span>
                  <span>JUMLA</span>
                </div>
                {data.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">{it.qty}x {it.name}</span>
                      <span>{formatCurrency(it.total)}</span>
                    </div>
                    {it.imei && (
                      <div className="text-[9px] text-slate-600 pl-2">
                        IMEI: {it.imei}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Calculation Totals */}
            <div className="pt-1 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Jumla:</span>
                <span>{formatCurrency(data.totalAmount)}</span>
              </div>
              {data.discount !== undefined && data.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Punguzo:</span>
                  <span>-{formatCurrency(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>Kiasi Kilicholipwa:</span>
                <span>{formatCurrency(data.paidAmount)}</span>
              </div>
              {data.balanceDue !== undefined && data.balanceDue > 0 && (
                <div className="flex justify-between font-extrabold text-xs text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                  <span>Baki Inayodaiwa:</span>
                  <span>{formatCurrency(data.balanceDue)}</span>
                </div>
              )}
              {data.paymentMethod && (
                <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Njia ya Malipo:</span>
                  <span className="uppercase font-semibold">{data.paymentMethod}</span>
                </div>
              )}
            </div>

            {/* Promised delivery date (for laundry / repairs) */}
            {data.promisedDate && (
              <div className="p-1.5 bg-amber-50 rounded text-center border border-amber-200 text-amber-900 font-bold text-[10px]">
                Ahadi ya Kuchukua: {data.promisedDate}
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] text-slate-600 border-t border-dashed border-slate-400 space-y-0.5">
              <div>*** ASANTE KWA KUTUCHAGUA ***</div>
              <div>Bidhaa zilizouzwa hazirudishwi baada ya siku 3</div>
              <div className="text-[8px] text-slate-400">Powered by Maduka Tatu POS (Offline)</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Print & WhatsApp */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Chapa (Print)</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tuma WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
