import React, { useState } from 'react';
import {
  FilePlus,
  X,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { Part } from '../../types/inventory';

interface NewCustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const NewCustomerOrderModal: React.FC<NewCustomerOrderModalProps> = ({
  isOpen,
  onClose,
  parts,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState('شرکت ساپکو (تأمین قطعات ایران‌خودرو)');
  const [contractNumber, setContractNumber] = useState('CNT-SAP-2026-001');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) {
      setErrorMsg('لطفاً قطعه مورد تقاضا را انتخاب کنید.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('تعداد سفارش باید یک عدد مثبت باشد.');
      return;
    }

    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onSubmit({
        customerName: customerName.trim(),
        contractNumber: contractNumber.trim(),
        dueDate,
        priority,
        notes: notes.trim(),
        lines: [
          {
            partId: part.id,
            partCode: part.code,
            partName: part.name,
            orderedQuantity: qty,
            deliveredQuantity: 0,
            remainingQuantity: qty,
            dueDate,
          },
        ],
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'خطا در ثبت سفارش');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ثبت سفارش تقاضای مشتری (Customer Order)</h3>
              <p className="text-xs text-slate-400">محاسبه بلادرنگ الزام خالص تولید و ارزیابی کمبود مواد اولیه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">مشتری خودروساز</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">شماره قرارداد / تفاهم‌نامه</label>
              <input
                type="text"
                value={contractNumber}
                onChange={e => setContractNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              قطعه خودرویی مورد سفارش <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- انتخاب قطعه از فهرست قطعات فعال --</option>
              {parts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.carModel || 'بدنه'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                تعداد سفارش (PCS) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">موعد تحویل (Due Date)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">اولویت تولید</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>۱: فوری و بحرانی (High)</option>
                <option value={2}>۲: عادی (Normal)</option>
                <option value={3}>۳: کم‌اهمیت (Low)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">توضیحات سفارش</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تحویل خط تهران..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPartId}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/40 cursor-pointer disabled:opacity-50"
            >
              <FilePlus className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>ثبت سفارش و موازنه نیاز تولید</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
