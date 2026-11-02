import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';
import { ContextualHelp } from '../common/ContextualHelp';

export interface IssueDraftPayload {
  partId?: string;
  partCode?: string;
  partName?: string;
  quantity?: number | string;
  unit?: string;
  warehouseId?: string;
  targetWarehouseId?: string;
  issuePurpose?: string;
  lotNumber?: string;
  notes?: string;
}

interface IssueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  initialDraft?: IssueDraftPayload | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const IssueFormModal: React.FC<IssueFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  balances,
  initialDraft,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [issuePurpose, setIssuePurpose] = useState<string>('PRODUCTION_LINE');
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('WH-WIP-STAMP');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isAiPrefilled, setIsAiPrefilled] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync AI initialDraft when provided
  React.useEffect(() => {
    if (initialDraft && isOpen) {
      setIsAiPrefilled(true);
      if (initialDraft.quantity) setQuantity(String(initialDraft.quantity));
      if (initialDraft.warehouseId) setWarehouseId(initialDraft.warehouseId);
      if (initialDraft.targetWarehouseId) setTargetWarehouseId(initialDraft.targetWarehouseId);
      if (initialDraft.notes) setNotes(initialDraft.notes);
      if (initialDraft.partId) {
        setSelectedPartId(initialDraft.partId);
      } else if (initialDraft.partCode) {
        const found = parts.find(p => p.code.toLowerCase() === initialDraft.partCode?.toLowerCase());
        if (found) setSelectedPartId(found.id);
      }
      setStep(1);
    } else if (!isOpen) {
      setIsAiPrefilled(false);
    }
  }, [initialDraft, isOpen, parts]);

  // Eligible items (prioritize raw materials and all parts)
  const eligibleParts = useMemo(() => {
    const raw = parts.filter(p => p.category === 'RAW_MATERIAL');
    return raw.length > 0 ? [...raw, ...parts.filter(p => p.category !== 'RAW_MATERIAL')] : parts;
  }, [parts]);

  React.useEffect(() => {
    if (eligibleParts.length > 0 && !selectedPartId) {
      setSelectedPartId(eligibleParts[0].id);
    }
  }, [eligibleParts, selectedPartId]);

  const availableLots = useMemo(() => {
    return balances.filter(
      b => b.partId === selectedPartId && b.warehouseId === warehouseId && b.availableQty > 0
    );
  }, [balances, selectedPartId, warehouseId]);

  React.useEffect(() => {
    if (availableLots.length > 0) {
      setSelectedLotNumber(availableLots[0].lotNumber || '');
    } else {
      setSelectedLotNumber('');
    }
  }, [availableLots]);

  const selectedPart = parts.find(p => p.id === selectedPartId);
  const selectedLotBalance = availableLots.find(l => (l.lotNumber || '') === selectedLotNumber) || availableLots[0];

  const totalAvailableInWarehouse = useMemo(() => {
    const list = balances.filter(b => b.partId === selectedPartId && b.warehouseId === warehouseId);
    return list.reduce((sum, b) => sum + b.availableQty, 0);
  }, [balances, selectedPartId, warehouseId]);

  const availableToIssue = selectedLotBalance ? selectedLotBalance.availableQty : totalAvailableInWarehouse;
  const requestedQty = Number(quantity) || 0;
  const isOverdraft = requestedQty > availableToIssue;

  const calculatedWeightKg = useMemo(() => {
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return requestedQty;
    return Number((requestedQty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [requestedQty, selectedPart]);

  if (!isOpen) return null;

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (requestedQty <= 0) {
      setErrorMessage('لطفاً مقدار یا وزن درخواستی برای خروج از انبار را وارد نمایید.');
      return;
    }
    if (isOverdraft) {
      setErrorMessage(
        `موجودی قابل استفاده این رول/کالا کافی نیست. موجودی قابل استفاده: ${formatNumber(availableToIssue)} ${
          selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'
        }؛ مقدار درخواست‌شده: ${formatNumber(requestedQty)} ${selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}.`
      );
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (autoPost: boolean) => {
    setLoading(true);
    setErrorMessage(null);

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
      setStep(1);
      setQuantity('');
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در صدور حواله خروج از انبار');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-600 text-white rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                صدور حواله خروج کالا و ارسال رول به خط تولید
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                انتخاب رول ورق یا قطعه موجود، کنترل خودکار سقف موجودی قابل استفاده و ثبت خروج به ایستگاه مصرف
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-4 text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step === 1 ? 'text-slate-900' : 'text-emerald-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}>
              ۱
            </span>
            <span>انتخاب مقصد، رول/کالا و مقدار خروج</span>
          </div>
          <span className="text-slate-300">───</span>
          <div className={`flex items-center gap-2 font-semibold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
              ۲
            </span>
            <span>پیش‌نمایش و ثبت قطعی / موقت</span>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {isAiPrefilled && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-amber-900">پیش‌نویس خودکار توسط دستیار هوش مصنوعی</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    مقادیر کالا، مقدار خروج و انبارها پر شده است. لطفاً بررسی و تایید بفرمایید.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-amber-200 text-amber-900 font-bold text-[10px]">
                آماده تایید
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {/* Purpose & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    هدف خروج از انبار
                  </label>
                  <select
                    value={issuePurpose}
                    onChange={e => setIssuePurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="PRODUCTION_LINE">ارسال به خط تولید و پرسکاری</option>
                    <option value="CONTRACT_DELIVERY">ارسال محصول طبق قرارداد مشتری</option>
                    <option value="SUBCONTRACTOR">ارسال به پیمانکار بیرونی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    انبار مبدا خروج <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    مقصد / ایستگاه تحویل‌گیرنده <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetWarehouseId}
                    onChange={e => setTargetWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="WH-WIP-STAMP">انبار پای کار سالن پرس (WIP)</option>
                    <option value="WH-WIP-WELD">انبار پای کار سالن جوشکاری</option>
                    <option value="LINE-SHEAR-01">خط نواربری و برشکاری رول</option>
                    <option value="LINE-PRESS-800">پرس ۸۰۰ تن کشش عمیق</option>
                  </select>
                </div>
              </div>

              {/* Select Part */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  انتخاب کالا / ورق مورد نیاز <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPartId}
                  onChange={e => setSelectedPartId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold"
                >
                  {eligibleParts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — واحد: {p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Specific Coil-Pack / Lot */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  انتخاب رول ورق / کویل‌پک یا بچ موجود در انبار <span className="text-rose-500">*</span>
                  <ContextualHelp
                    title="انتخاب کویل‌پک / رول"
                    description="فهرست رول‌ها و بسته‌هایی که هم‌اکنون در انبار انتخابی موجودی آزاد و قابل مصرف دارند."
                    whyNeeded="برای کسر دقیق وزن از همان کویل‌پک و قرارداد متصل به آن."
                    mandatory
                  />
                </label>
                {availableLots.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>در حال حاضر هیچ موجودی آزادی از این کالا در انبار انتخاب‌شده وجود ندارد.</span>
                  </div>
                ) : (
                  <select
                    value={selectedLotNumber}
                    onChange={e => setSelectedLotNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono"
                  >
                    {availableLots.map(lot => (
                      <option key={lot.id} value={lot.lotNumber || ''}>
                        کویل‌پک/بچ: {lot.lotNumber || 'عمومی'} | موجودی قابل استفاده: {formatNumber(lot.availableQty)} {lot.unit} | مالکیت:{' '}
                        {lot.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی شرکت'}
                        {lot.contractNumber ? ` | قرارداد: ${lot.contractNumber}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Eligible Stock Details Card */}
              {selectedLotBalance && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">کویل‌پک / لوت</span>
                    <strong className="font-mono text-slate-900 mt-0.5 block">{selectedLotBalance.lotNumber || 'عمومی'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">موجودی قابل استفاده</span>
                    <strong className="font-mono text-emerald-700 text-sm mt-0.5 block">
                      {formatNumber(selectedLotBalance.availableQty)} {selectedLotBalance.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">نوع مالکیت</span>
                    <strong className="text-slate-900 mt-0.5 block">
                      {selectedLotBalance.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">شماره قرارداد</span>
                    <strong className="font-mono text-slate-900 mt-0.5 block">
                      {selectedLotBalance.contractNumber || 'آزاد / عمومی'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quantity & Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    مقدار / وزن درخواستی جهت خروج ({selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="مثلاً 1200"
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none ${
                      isOverdraft
                        ? 'border-rose-400 bg-rose-50 text-rose-800'
                        : 'border-slate-300 focus:bg-white focus:border-slate-900'
                    }`}
                  />
                  {isOverdraft && (
                    <span className="text-[11px] text-rose-600 mt-1 block">
                      موجودی قابل استفاده این رول کافی نیست. موجودی قابل استفاده: {formatNumber(availableToIssue)}؛ مقدار درخواست‌شده: {formatNumber(requestedQty)}.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    شماره دستور کار تولید / قرارداد (MO)
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="مثلاً MO-1403-108"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">توضیحات حواله</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="نام تحویل‌گیرنده سالن پرس، توضیحات برش..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Review */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>پیش‌نمایش حواله خروج از انبار</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">کالا و کویل‌پک:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {selectedPart?.name} ({selectedLotNumber || 'عمومی'})
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">مسیر خروج:</span>
                  <strong className="text-slate-900 mt-1 block">
                    از {warehouses.find(w => w.id === warehouseId)?.name} ← به {targetWarehouseId}
                  </strong>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block">مقدار خروجی:</span>
                  <strong className="text-amber-950 font-mono text-sm mt-1 block">
                    - {formatNumber(requestedQty)} {selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'} ({formatWeightKg(calculatedWeightKg)})
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">مانده رول در انبار پس از خروج:</span>
                  <strong className="text-slate-900 font-mono text-sm mt-1 block">
                    {formatNumber(Math.max(0, availableToIssue - requestedQty))} {selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                انصراف
              </button>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  بازگشت
                </button>
              )}
            </div>

            {step === 1 ? (
              <button
                type="button"
                disabled={requestedQty <= 0 || isOverdraft}
                onClick={handleProceedToReview}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>پیش‌نمایش حواله خروج</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinalSubmit(false)}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  ثبت موقت
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinalSubmit(true)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'در حال ثبت...' : 'ثبت قطعی حواله خروج'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
