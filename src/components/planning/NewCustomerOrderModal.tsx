import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  X,
  AlertCircle,
  Building2,
  Calendar,
  Plus,
} from 'lucide-react';
import { Part, CustomerDefinition, SapcoContract } from '../../types/inventory';
import { QuickEntryModals, QuickCreateEntityType } from '../common/QuickEntryModals';

interface NewCustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const NewCustomerOrderModal: React.FC<NewCustomerOrderModalProps> = ({
  isOpen,
  onClose,
  parts: initialParts,
  onSubmit,
}) => {
  const [localParts, setLocalParts] = useState<Part[]>(initialParts);
  const [localCustomers, setLocalCustomers] = useState<CustomerDefinition[]>([]);
  const [localContracts, setLocalContracts] = useState<SapcoContract[]>([]);
  const [activeQuickModal, setActiveQuickModal] = useState<QuickCreateEntityType | null>(null);

  useEffect(() => {
    setLocalParts(initialParts);
  }, [initialParts]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/customers').then(r => r.json()).catch(() => null),
        fetch('/api/inventory/contracts').then(r => r.json()).catch(() => null),
      ]).then(([custRes, cntRes]) => {
        if (custRes?.success && Array.isArray(custRes.data)) setLocalCustomers(custRes.data);
        if (cntRes?.success && Array.isArray(cntRes.data)) setLocalContracts(cntRes.data);
      });
    }
  }, [isOpen]);

  const [customerName, setCustomerName] = useState('شرکت ساپکو');
  const [contractNumber, setContractNumber] = useState('CNT-SAPCO-1403-Q4');
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

    const part = localParts.find(p => p.id === selectedPartId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ثبت سفارش تقاضای مشتری (Customer Order)</h3>
              <p className="text-xs text-slate-400">محاسبه بلادرنگ الزام خالص تولید و ارزیابی کمبود مواد اولیه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">مشتری خودروساز</label>
                <button
                  type="button"
                  onClick={() => setActiveQuickModal('CUSTOMER')}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ مشتری جدید</span>
                </button>
              </div>
              {localCustomers.length > 0 ? (
                <select
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value={customerName}>{customerName}</option>
                  {localCustomers.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">شماره قرارداد</label>
                <button
                  type="button"
                  onClick={() => setActiveQuickModal('CONTRACT')}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ قرارداد جدید</span>
                </button>
              </div>
              {localContracts.length > 0 ? (
                <select
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value={contractNumber}>{contractNumber}</option>
                  {localContracts.map(cnt => (
                    <option key={cnt.id} value={cnt.contractNumber}>
                      {cnt.contractNumber} ({cnt.customerName})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                قطعه خودرویی مورد سفارش <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setActiveQuickModal('PART')}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ تعریف سریع قطعه جدید</span>
              </button>
            </div>
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- انتخاب قطعه از فهرست قطعات فعال --</option>
              {localParts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.carModel || 'بدنه'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                تعداد سفارش (PCS) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">موعد تحویل (Due Date)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">اولویت تولید</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>۱: فوری و بحرانی (High)</option>
                <option value={2}>۲: عادی (Normal)</option>
                <option value={3}>۳: کم‌اهمیت (Low)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">توضیحات سفارش</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تحویل خط تهران..."
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
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

      <QuickEntryModals
        activeModal={activeQuickModal}
        onClose={() => setActiveQuickModal(null)}
        defaultPartCategory="FINISHED_GOOD"
        defaultCustomerName={customerName}
        onCreated={(type, item) => {
          if (type === 'CUSTOMER') {
            setLocalCustomers(prev => [item, ...prev]);
            setCustomerName(item.name);
          } else if (type === 'CONTRACT') {
            setLocalContracts(prev => [item, ...prev]);
            setContractNumber(item.contractNumber);
            if (item.customerName) setCustomerName(item.customerName);
          } else if (type === 'PART') {
            setLocalParts(prev => [item, ...prev]);
            setSelectedPartId(item.id);
          }
        }}
      />
    </div>
  );
};
