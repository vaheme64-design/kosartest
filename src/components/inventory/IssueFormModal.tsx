import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  Scale,
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
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';

interface IssueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const IssueFormModal: React.FC<IssueFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  balances,
  onSubmit,
}) => {
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-WIP-STAMP');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoPost, setAutoPost] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Raw material parts only for issue
  const rawParts = useMemo(() => parts.filter(p => p.category === 'RAW_MATERIAL'), [parts]);

  React.useEffect(() => {
    if (rawParts.length > 0 && !selectedPartId) {
      setSelectedPartId(rawParts[0].id);
    }
  }, [rawParts, selectedPartId]);

  // Available lots in the selected warehouse for this part
  const availableLots = useMemo(() => {
    return balances.filter(
      b => b.partId === selectedPartId && b.warehouseId === warehouseId && b.availableQty > 0
    );
  }, [balances, selectedPartId, warehouseId]);

  // Auto-select first lot if available
  React.useEffect(() => {
    if (availableLots.length > 0) {
      setSelectedLotNumber(availableLots[0].lotNumber || '');
    } else {
      setSelectedLotNumber('');
    }
  }, [availableLots]);

  // Selected part and stock availability
  const selectedPart = parts.find(p => p.id === selectedPartId);
  const selectedLotBalance = availableLots.find(l => l.lotNumber === selectedLotNumber);

  const totalAvailableInWarehouse = useMemo(() => {
    const list = balances.filter(b => b.partId === selectedPartId && b.warehouseId === warehouseId);
    return list.reduce((sum, b) => sum + b.availableQty, 0);
  }, [balances, selectedPartId, warehouseId]);

  const requestedQty = Number(quantity) || 0;
  const isOverdraft = requestedQty > (selectedLotBalance ? selectedLotBalance.availableQty : totalAvailableInWarehouse);

  const calculatedWeightKg = useMemo(() => {
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return requestedQty;
    return Number((requestedQty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [requestedQty, selectedPart]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (requestedQty <= 0) {
      setErrorMessage('مقدار حواله باید عددی مثبت و بزرگتر از صفر باشد.');
      return;
    }

    if (isOverdraft) {
      setErrorMessage(
        `خطای کنترل موجودی: مقدار درخواستی (${requestedQty}) از موجودی آزاد قابل استفاده (${selectedLotBalance?.availableQty || totalAvailableInWarehouse}) بیشتر است. سیستم از صدور حواله منفی ممانعت می‌کند.`
      );
      return;
    }

    setLoading(true);

    const warehouse = warehouses.find(w => w.id === warehouseId);
    const targetWh = warehouses.find(w => w.id === targetWarehouseId);

    const payload = {
      documentType: 'ISSUE_RAW_MATERIAL',
      warehouseId,
      warehouseName: warehouse?.name,
      targetWarehouseId,
      targetWarehouseName: targetWh?.name,
      ownership: selectedLotBalance?.ownership || 'SAPCO_SUPPLIER_OWNED',
      contractId: selectedLotBalance?.contractId,
      contractNumber: selectedLotBalance?.contractNumber,
      referenceType: 'MANUFACTURING_ORDER',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: selectedLotNumber || undefined,
          heatNumber: selectedLotBalance?.heatNumber,
          ownership: selectedLotBalance?.ownership || 'SAPCO_SUPPLIER_OWNED',
          contractId: selectedLotBalance?.contractId,
          contractNumber: selectedLotBalance?.contractNumber,
          locationCode: selectedLotBalance?.locationCode || 'LOC-RAW-A1',
          quantity: requestedQty,
          unit: selectedPart?.unit || 'KG',
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
      setErrorMessage(res.error || 'خطا در صدور حواله مصرف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white">
                صدور حواله مصرف مواد اولیه (Material Issue)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تخصیص و خروج ورق از انبار با کنترل اتمیک عدم منفی‌شدن موجودی
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

        {/* Modal Form */}
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
              ماده اولیه مصرفی <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              {rawParts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse and Target Line */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                انبار مبدا خروج <span className="text-rose-400">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                خط تولید / ایستگاه تحویل‌گیرنده <span className="text-rose-400">*</span>
              </label>
              <select
                value={targetWarehouseId}
                onChange={e => setTargetWarehouseId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="WH-WIP-STAMP">انبار پای کار سالن پرس (WIP)</option>
                <option value="WH-WIP-WELD">انبار پای کار سالن جوشکاری</option>
                <option value="LINE-SHEAR-01">خط نواربری و برشکاری رول</option>
                <option value="LINE-PRESS-800">پرس ۸۰۰ تن کشش عمیق شولر</option>
              </select>
            </div>
          </div>

          {/* Lot Selection from Available Balances */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              انتخاب کلاف / رول ورق (با موجودی آزاد) <span className="text-rose-400">*</span>
            </label>
            {availableLots.length === 0 ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>هیچ کلاف دارای موجودی آزاد برای این ماده اولیه در انبار مبدا یافت نشد!</span>
              </div>
            ) : (
              <select
                value={selectedLotNumber}
                onChange={e => setSelectedLotNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                {availableLots.map(lot => (
                  <option key={lot.id} value={lot.lotNumber}>
                    {lot.lotNumber} | موقعیت: {lot.locationCode} | موجودی آزاد: {formatWeightKg(lot.availableKg)} (ذوب: {lot.heatNumber || '—'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Real-Time Available Stock Banner */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <span className="text-slate-400">موجودی آزاد قابل صدور این کلاف:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatWeightKg(selectedLotBalance ? selectedLotBalance.availableKg : totalAvailableInWarehouse)}
            </span>
          </div>

          {/* Quantity & MO Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                مقدار خروج ({selectedPart?.unit || 'KG'}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مقدار حواله..."
                className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sm focus:outline-none ${
                  isOverdraft
                    ? 'border-rose-500 text-rose-400'
                    : 'border-slate-700 focus:border-amber-500'
                }`}
              />
              {isOverdraft && (
                <span className="text-[11px] text-rose-400 mt-1 block">
                  خطا: مقدار بیش از موجودی آزاد است!
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                شماره کارت ساخت / دستور کار (MO)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. MO-1403-1082"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              یادداشت و مجوز خروج
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="شرح حواله، نام سرپرست متقاضی خط پرس..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Post option */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPost}
                onChange={e => setAutoPost(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="text-slate-200 font-medium">
                ثبت قطعی فوری و کسر از کاردکس رسمی انبار
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || isOverdraft || requestedQty <= 0}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'در حال پردازش...' : 'تایید و صدور حواله مصرف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
