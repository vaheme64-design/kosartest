import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowDownLeft,
  Scale,
  Building2,
  ScrollText,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  SapcoContract,
  StockOwnership,
  StockQualityStatus,
  InventoryDocType,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  contracts: SapcoContract[];
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  contracts,
  onSubmit,
}) => {
  const [docType, setDocType] = useState<InventoryDocType>('RECEIPT_RAW_MATERIAL');
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [locationCode, setLocationCode] = useState<string>('LOC-RAW-A1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');
  const [heatNumber, setHeatNumber] = useState<string>('');
  const [contractId, setContractId] = useState<string>('CNT-SAPCO-1403-Q3');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [ownership, setOwnership] = useState<StockOwnership>('SAPCO_SUPPLIER_OWNED');
  const [qualityStatus, setQualityStatus] = useState<StockQualityStatus>('AVAILABLE');
  const [notes, setNotes] = useState<string>('');
  const [autoPost, setAutoPost] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected warehouse locations
  const currentWarehouse = useMemo(() => warehouses.find(w => w.id === warehouseId), [warehouses, warehouseId]);
  const availableLocations = currentWarehouse ? currentWarehouse.locations : ['LOC-01'];

  // Filter parts based on receipt type
  const eligibleParts = useMemo(() => {
    if (docType === 'RECEIPT_RAW_MATERIAL') {
      return parts.filter(p => p.category === 'RAW_MATERIAL');
    }
    return parts.filter(p => p.category === 'FINISHED_GOOD');
  }, [parts, docType]);

  // Set default part when list changes
  React.useEffect(() => {
    if (eligibleParts.length > 0 && (!selectedPartId || !eligibleParts.some(p => p.id === selectedPartId))) {
      setSelectedPartId(eligibleParts[0].id);
    }
  }, [eligibleParts, selectedPartId]);

  // Auto adjust warehouse when docType changes
  React.useEffect(() => {
    if (docType === 'RECEIPT_RAW_MATERIAL') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('SAPCO_SUPPLIER_OWNED');
    } else {
      setWarehouseId('WH-FINISHED');
      setLocationCode('LOC-FIN-P1');
      setOwnership('COMPANY_OWNED');
    }
  }, [docType]);

  const selectedPart = parts.find(p => p.id === selectedPartId);
  const calculatedWeightKg = useMemo(() => {
    const qty = Number(quantity) || 0;
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return qty;
    return Number((qty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [quantity, selectedPart]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('مقدار ورودی باید عددی مثبت و بزرگتر از صفر باشد.');
      return;
    }

    if (!selectedPartId) {
      setErrorMessage('انتخاب قطعه یا ماده اولیه الزامی است.');
      return;
    }

    if (docType === 'RECEIPT_RAW_MATERIAL' && !lotNumber.trim()) {
      setErrorMessage('برای ورود کلاف یا رول ورق ساپکو، درج شماره سریال رول الزامی است.');
      return;
    }

    setLoading(true);

    const selectedContract = contracts.find(c => c.id === contractId);

    const payload = {
      documentType: docType,
      warehouseId,
      ownership,
      contractId: ownership === 'SAPCO_SUPPLIER_OWNED' ? contractId : undefined,
      contractNumber: ownership === 'SAPCO_SUPPLIER_OWNED' ? selectedContract?.contractNumber : undefined,
      referenceType: docType === 'RECEIPT_RAW_MATERIAL' ? 'SAPCO_WAYBILL' : 'PRODUCTION_REPORT',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: lotNumber.trim() || undefined,
          heatNumber: heatNumber.trim() || undefined,
          ownership,
          contractId: ownership === 'SAPCO_SUPPLIER_OWNED' ? contractId : undefined,
          contractNumber: ownership === 'SAPCO_SUPPLIER_OWNED' ? selectedContract?.contractNumber : undefined,
          locationCode,
          quantity: qty,
          unit: selectedPart?.unit || 'KG',
          qualityStatus,
          notes: notes.trim() || undefined,
        },
      ],
    };

    const res = await onSubmit(payload);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت سند رسید کالا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white">
                ثبت رسید کالا و مواد اولیه (Goods Receipt)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ورود رسمی مواد خام ورق ساپکو با پلاک ذوب، یا رسید قطعات محصول نهایی
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

          {/* Receipt Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setDocType('RECEIPT_RAW_MATERIAL')}
              className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                docType === 'RECEIPT_RAW_MATERIAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ورود مواد اولیه (کویل ورق / شیت ساپکو)
            </button>
            <button
              type="button"
              onClick={() => setDocType('RECEIPT_FINISHED_GOODS')}
              className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                docType === 'RECEIPT_FINISHED_GOODS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              رسید محصول نهایی سالن مونتاژ
            </button>
          </div>

          {/* Part Selection & Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                انتخاب قطعه یا گرید ورق <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedPartId}
                onChange={e => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {eligibleParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - {p.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                انبار مقصد تحویل <span className="text-rose-400">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={e => {
                  setWarehouseId(e.target.value);
                  const wh = warehouses.find(w => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) setLocationCode(wh.locations[0]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Ownership */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                جایگاه / پالت انبارش
              </label>
              <select
                value={locationCode}
                onChange={e => setLocationCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                نوع مالکیت متریال <span className="text-rose-400">*</span>
              </label>
              <select
                value={ownership}
                onChange={e => setOwnership(e.target.value as StockOwnership)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="SAPCO_SUPPLIER_OWNED">امانی ساپکو (تامین‌کننده خودروساز)</option>
                <option value="COMPANY_OWNED">مالکیت قطعی شرکت کوثر</option>
              </select>
            </div>
          </div>

          {/* Lot & Heat Details (for coils) */}
          {docType === 'RECEIPT_RAW_MATERIAL' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  شماره سریال رول / کلاف <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="e.g. COIL-SAP-1403-0599"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  شماره ذوب (فولاد مبارکه)
                </label>
                <input
                  type="text"
                  value={heatNumber}
                  onChange={e => setHeatNumber(e.target.value)}
                  placeholder="e.g. HT-MOB-98299"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  سهمیه قرارداد ساپکو
                </label>
                <select
                  value={contractId}
                  onChange={e => setContractId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber} ({c.materialGrade})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quantity, Unit & Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                مقدار ورودی ({selectedPart?.unit || 'KG'}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مقدار به عدد یا کیلوگرم..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                معادل وزنی (کیلوگرم)
              </label>
              <div className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm">
                {formatWeightKg(calculatedWeightKg)}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                شماره بارنامه / رسید باسکول
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. WB-SAP-892410"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quality Status & Posting Option */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                وضعیت اولیه بازرسی کیفی (QC)
              </label>
              <select
                value={qualityStatus}
                onChange={e => setQualityStatus(e.target.value as StockQualityStatus)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="AVAILABLE">تایید شده و آماده مصرف (AVAILABLE)</option>
                <option value="QUARANTINE">قرنطینه آزمایشگاه متالورژی (QUARANTINE)</option>
                <option value="QUALITY_BLOCKED">بلوکه کیفی / مشکوک (BLOCKED)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPost}
                  onChange={e => setAutoPost(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-200 font-medium">
                  ثبت قطعی فوری در کاردکس (POSTED)
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              توضیحات و یادداشت سند
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="توضیحات اضافی، راننده، شماره باسکول درب ورودی کارخانه..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
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
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'در حال ثبت...' : autoPost ? 'ثبت قطعی رسید در کاردکس' : 'ذخیره به عنوان پیش‌نویس'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
