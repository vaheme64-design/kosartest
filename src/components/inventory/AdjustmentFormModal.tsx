import React, { useState } from 'react';
import {
  X,
  FileEdit,
  Building2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
} from '../../types/inventory';
import { formatNumber, formatWeightKg } from '../../utils/formatters';

interface AdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AdjustmentFormModal: React.FC<AdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  balances,
  onSubmit,
}) => {
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [locationCode, setLocationCode] = useState<string>('LOC-RAW-A1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'POSITIVE' | 'NEGATIVE'>('NEGATIVE');
  const [quantity, setQuantity] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('کسری انبارگردانی دوره‌ای طبق شمارش فیزیکی');
  const [auditNote, setAuditNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (parts.length > 0 && !selectedPartId) {
      setSelectedPartId(parts[0].id);
    }
  }, [parts, selectedPartId]);

  const currentWh = warehouses.find(w => w.id === warehouseId);
  const selectedPart = parts.find(p => p.id === selectedPartId);

  // Available stock in that warehouse
  const currentBalance = balances.find(
    b => b.partId === selectedPartId && b.warehouseId === warehouseId && (!lotNumber || b.lotNumber === lotNumber)
  );

  const rawQty = Math.abs(Number(quantity) || 0);
  const signedQty = adjustmentDirection === 'POSITIVE' ? rawQty : -rawQty;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rawQty <= 0) {
      setErrorMessage('مقدار تعدیل باید عددی بزرگتر از صفر باشد.');
      return;
    }

    if (!adjustmentReason.trim()) {
      setErrorMessage('ذکر دلیل تعدیل انبارگردانی طبق قوانین ممیزی سیستم الزامی است.');
      return;
    }

    // Negative stock check if downward adjustment
    if (adjustmentDirection === 'NEGATIVE' && currentBalance && rawQty > currentBalance.availableQty) {
      setErrorMessage(
        `خطای ممیزی: کسری تعدیل درخواستی (${rawQty}) از موجودی آزاد فعلی (${currentBalance.availableQty}) بیشتر است و منجر به موجودی منفی خواهد شد.`
      );
      return;
    }

    setLoading(true);

    const payload = {
      documentType: 'ADJUSTMENT',
      warehouseId,
      warehouseName: currentWh?.name,
      ownership: currentBalance?.ownership || 'SAPCO_SUPPLIER_OWNED',
      contractId: currentBalance?.contractId,
      contractNumber: currentBalance?.contractNumber,
      adjustmentReason: adjustmentReason.trim(),
      auditNote: auditNote.trim() || undefined,
      autoPost: true,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: lotNumber.trim() || undefined,
          heatNumber: currentBalance?.heatNumber,
          ownership: currentBalance?.ownership || 'SAPCO_SUPPLIER_OWNED',
          contractId: currentBalance?.contractId,
          contractNumber: currentBalance?.contractNumber,
          locationCode,
          quantity: signedQty,
          unit: selectedPart?.unit || 'KG',
          qualityStatus: 'AVAILABLE',
          notes: adjustmentReason.trim(),
        },
      ],
    };

    const res = await onSubmit(payload);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت سند تعدیل انبارگردانی');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-700 text-slate-200 rounded-xl border border-slate-600">
              <FileEdit className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white">
                ثبت سند تعدیل انبارگردانی و مغایرت باسکول (Inventory Adjustment)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تعدیل رسمی مقادیر با الزام درج علت و لاگ ممیزی حسابرسی صنعتی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Direction Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setAdjustmentDirection('NEGATIVE')}
              className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                adjustmentDirection === 'NEGATIVE'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              کسری انبارگردانی / افت وزنی (-)
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentDirection('POSITIVE')}
              className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                adjustmentDirection === 'POSITIVE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مازاد انبارگردانی (+)
            </button>
          </div>

          {/* Part Selection & Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                کالا / ماده اولیه <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedPartId}
                onChange={e => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                انبار مورد تعدیل <span className="text-rose-400">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={e => {
                  setWarehouseId(e.target.value);
                  const wh = warehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setLocationCode(wh.locations[0]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Stock Banner */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
            <span className="text-slate-400">موجودی فعلی در این انبار:</span>
            <span className="font-mono font-bold text-white text-sm">
              {formatNumber(currentBalance?.physicalQty || 0)} {selectedPart?.unit} (آزاد: {formatNumber(currentBalance?.availableQty || 0)})
            </span>
          </div>

          {/* Quantity and Lot Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                مقدار تعدیل ({selectedPart?.unit}) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="مقدار قدرمطلق..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
                <span className={`absolute left-3 top-2.5 font-bold font-mono text-sm ${
                  adjustmentDirection === 'POSITIVE' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {adjustmentDirection === 'POSITIVE' ? '+' : '-'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                شماره سریال رول یا بچ (اختیاری)
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="e.g. COIL-SAP-1403-0498"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              علت تعدیل انبارگردانی (الزامی) <span className="text-rose-400">*</span>
            </label>
            <select
              value={adjustmentReason}
              onChange={e => setAdjustmentReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 mb-2 font-medium"
            >
              <option value="کسری انبارگردانی دوره‌ای طبق شمارش فیزیکی">کسری انبارگردانی دوره‌ای طبق شمارش فیزیکی</option>
              <option value="مازاد انبارگردانی دوره‌ای طبق شمارش فیزیکی">مازاد انبارگردانی دوره‌ای طبق شمارش فیزیکی</option>
              <option value="اختلاف توزین باسکول و افت رطوبت کلاف ساپکو">اختلاف توزین باسکول و افت رطوبت کلاف ساپکو</option>
              <option value="ضایعات راه‌اندازی و تنظیم قالب ثبت نشده">ضایعات راه‌اندازی و تنظیم قالب ثبت نشده</option>
              <option value="اصلاح ناشی از خطای اپراتور در ثبت حواله پیشین">اصلاح ناشی از خطای اپراتور در ثبت حواله پیشین</option>
              <option value="OTHER">سایر موارد (در یادداشت ممیزی درج شود)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              توضیحات ممیزی و مجوز مدیریت
            </label>
            <input
              type="text"
              value={auditNote}
              onChange={e => setAuditNote(e.target.value)}
              placeholder="صورتجلسه انبارگردانی شماره... تایید شده توسط مدیر کارخانه"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || rawQty <= 0}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'در حال ثبت...' : 'ثبت قطعی تعدیل در دفاتر'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
