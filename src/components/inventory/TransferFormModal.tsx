import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  Building2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
} from '../../types/inventory';
import { formatNumber, formatWeightKg } from '../../utils/formatters';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  balances,
  onSubmit,
}) => {
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('WH-FINISHED');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-RAW');
  const [sourceLocationCode, setSourceLocationCode] = useState<string>('LOC-FIN-P1');
  const [targetLocationCode, setTargetLocationCode] = useState<string>('LOC-RAW-B1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (parts.length > 0 && !selectedPartId) {
      setSelectedPartId(parts[0].id);
    }
  }, [parts, selectedPartId]);

  const sourceWh = warehouses.find(w => w.id === sourceWarehouseId);
  const targetWh = warehouses.find(w => w.id === targetWarehouseId);

  // Available stock in source warehouse
  const availableInSource = useMemo(() => {
    const list = balances.filter(b => b.partId === selectedPartId && b.warehouseId === sourceWarehouseId);
    return list.reduce((sum, b) => sum + b.availableQty, 0);
  }, [balances, selectedPartId, sourceWarehouseId]);

  const selectedPart = parts.find(p => p.id === selectedPartId);
  const requestedQty = Number(quantity) || 0;
  const isOverdraft = requestedQty > availableInSource;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (sourceWarehouseId === targetWarehouseId) {
      setErrorMessage('انبار مبدا و انبار مقصد نمی‌توانند یکسان باشند.');
      return;
    }

    if (requestedQty <= 0) {
      setErrorMessage('مقدار انتقال باید عددی مثبت و بزرگتر از صفر باشد.');
      return;
    }

    if (isOverdraft) {
      setErrorMessage(
        `خطای موجودی: مقدار انتقال (${requestedQty}) از موجودی آزاد انبار مبدا (${availableInSource}) بیشتر است.`
      );
      return;
    }

    setLoading(true);

    const payload = {
      documentType: 'TRANSFER',
      warehouseId: sourceWarehouseId,
      warehouseName: sourceWh?.name,
      targetWarehouseId,
      targetWarehouseName: targetWh?.name,
      ownership: 'COMPANY_OWNED',
      referenceType: 'INTERNAL_TRANSFER',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost: true,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          locationCode: sourceLocationCode,
          targetLocationCode,
          quantity: requestedQty,
          unit: selectedPart?.unit || 'PCS',
          qualityStatus: 'AVAILABLE',
          notes: notes.trim() || undefined,
        },
      ],
    };

    const res = await onSubmit(payload);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت انتقال');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white">
                حواله انتقال بین انبارها (Inventory Transfer)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                جابجایی اقلام بین انبارهای کارخانه و پای‌کارهای سالن بدون تغییر در مالکیت کل
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

          {/* Part Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              انتخاب کالا / قطعه <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
            >
              {parts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) - {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Source and Target Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 font-bold block mb-2">مبدا جابجایی:</span>
              <label className="block text-slate-300 mb-1">انبار مبدا</label>
              <select
                value={sourceWarehouseId}
                onChange={e => {
                  setSourceWarehouseId(e.target.value);
                  const wh = warehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setSourceLocationCode(wh.locations[0]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <label className="block text-slate-300 mt-2 mb-1">موقعیت مبدا</label>
              <select
                value={sourceLocationCode}
                onChange={e => setSourceLocationCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                {(sourceWh?.locations || ['LOC-01']).map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 font-bold block mb-2">مقصد جابجایی:</span>
              <label className="block text-slate-300 mb-1">انبار مقصد</label>
              <select
                value={targetWarehouseId}
                onChange={e => {
                  setTargetWarehouseId(e.target.value);
                  const wh = warehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setTargetLocationCode(wh.locations[0]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <label className="block text-slate-300 mt-2 mb-1">موقعیت مقصد</label>
              <select
                value={targetLocationCode}
                onChange={e => setTargetLocationCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                {(targetWh?.locations || ['LOC-01']).map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Available stock in source */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
            <span className="text-slate-400">موجودی آزاد در انبار مبدا:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatNumber(availableInSource)} {selectedPart?.unit}
            </span>
          </div>

          {/* Quantity and Ref */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                تعداد / مقدار انتقالی <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مقدار جابجایی..."
                className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sm focus:outline-none ${
                  isOverdraft ? 'border-rose-500 text-rose-400' : 'border-slate-700 focus:border-purple-500'
                }`}
              />
              {isOverdraft && (
                <span className="text-[11px] text-rose-400 mt-1 block">
                  خطا: مقدار بیش از موجودی آزاد مبدا است!
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                شماره پیگیری / مجوز جابجایی
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. TRF-PERMIT-1403"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">توضیحات</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="شرح علت جابجایی بین سالن‌ها..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Actions */}
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
              disabled={loading || isOverdraft || requestedQty <= 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'در حال انتقال...' : 'ثبت قطعی انتقال بین انبارها'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
