import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  Info,
  Sparkles,
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
import { ContextualHelp } from '../common/ContextualHelp';

export type GuidedReceiptSubType =
  | 'SAPCO_MATERIAL'
  | 'CUSTOMER_SUPPLIED'
  | 'SUPPLIER_PURCHASE'
  | 'OPENING_BALANCE'
  | 'FINISHED_PRODUCT';

export interface ReceiptDraftPayload {
  subType?: GuidedReceiptSubType;
  partId?: string;
  partCode?: string;
  partName?: string;
  quantity?: number | string;
  unit?: string;
  coilPackNumber?: string;
  physicalCoilCode?: string;
  heatNumber?: string;
  warehouseId?: string;
  locationCode?: string;
  ownership?: StockOwnership;
  referenceNumber?: string;
  notes?: string;
}

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  warehouses: WarehouseDefinition[];
  contracts: SapcoContract[];
  initialDraft?: ReceiptDraftPayload | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  parts,
  warehouses,
  contracts,
  initialDraft,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [receiptSubType, setReceiptSubType] = useState<GuidedReceiptSubType>('SAPCO_MATERIAL');
  const [warehouseId, setWarehouseId] = useState<string>('WH-RAW');
  const [locationCode, setLocationCode] = useState<string>('LOC-RAW-A1');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partSearch, setPartSearch] = useState<string>('');
  const [isAiPrefilled, setIsAiPrefilled] = useState<boolean>(false);

  // Tracking fields
  const [coilPackNumber, setCoilPackNumber] = useState<string>('');
  const [physicalCoilCode, setPhysicalCoilCode] = useState<string>('');
  const [heatNumber, setHeatNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [ownership, setOwnership] = useState<StockOwnership>('SAPCO_SUPPLIER_OWNED');
  const [qualityStatus, setQualityStatus] = useState<StockQualityStatus>('AVAILABLE');
  const [notes, setNotes] = useState<string>('');

  // Sync with AI initial draft when provided
  useEffect(() => {
    if (initialDraft && isOpen) {
      setIsAiPrefilled(true);
      if (initialDraft.subType) setReceiptSubType(initialDraft.subType);
      if (initialDraft.warehouseId) setWarehouseId(initialDraft.warehouseId);
      if (initialDraft.locationCode) setLocationCode(initialDraft.locationCode);
      if (initialDraft.quantity) setQuantity(String(initialDraft.quantity));
      if (initialDraft.coilPackNumber) setCoilPackNumber(initialDraft.coilPackNumber);
      if (initialDraft.physicalCoilCode) setPhysicalCoilCode(initialDraft.physicalCoilCode);
      if (initialDraft.heatNumber) setHeatNumber(initialDraft.heatNumber);
      if (initialDraft.ownership) setOwnership(initialDraft.ownership);
      if (initialDraft.referenceNumber) setReferenceNumber(initialDraft.referenceNumber);
      if (initialDraft.notes) setNotes(initialDraft.notes);

      // Find part by id or code
      if (initialDraft.partId) {
        setSelectedPartId(initialDraft.partId);
      } else if (initialDraft.partCode) {
        const found = parts.find(p => p.code.toLowerCase() === initialDraft.partCode?.toLowerCase());
        if (found) setSelectedPartId(found.id);
      }
      // Jump directly to step 2 (details) so user can see and approve
      setStep(2);
    } else if (!isOpen) {
      setIsAiPrefilled(false);
    }
  }, [initialDraft, isOpen, parts]);

  // Multi-contract allocation for sheet metal coils
  const [contractAllocations, setContractAllocations] = useState<
    Array<{ contractId: string; allocatedWeightKg: string }>
  >([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const docType: InventoryDocType = useMemo(() => {
    if (receiptSubType === 'OPENING_BALANCE') return 'OPENING_BALANCE';
    if (receiptSubType === 'FINISHED_PRODUCT') return 'RECEIPT_FINISHED_GOODS';
    return 'RECEIPT_RAW_MATERIAL';
  }, [receiptSubType]);

  // Adjust defaults when receiptSubType changes
  useEffect(() => {
    if (receiptSubType === 'SAPCO_MATERIAL') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('SAPCO_SUPPLIER_OWNED');
    } else if (receiptSubType === 'CUSTOMER_SUPPLIED') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('CUSTOMER_SUPPLIED' as StockOwnership);
    } else if (receiptSubType === 'SUPPLIER_PURCHASE') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-B1');
      setOwnership('COMPANY_OWNED');
    } else if (receiptSubType === 'OPENING_BALANCE') {
      setWarehouseId('WH-RAW');
      setLocationCode('LOC-RAW-A1');
      setOwnership('COMPANY_OWNED');
    } else if (receiptSubType === 'FINISHED_PRODUCT') {
      setWarehouseId('WH-FINISHED');
      setLocationCode('LOC-FIN-P1');
      setOwnership('COMPANY_OWNED');
    }
  }, [receiptSubType]);

  const currentWarehouse = useMemo(
    () => warehouses.find(w => w.id === warehouseId),
    [warehouses, warehouseId]
  );
  const availableLocations = currentWarehouse ? currentWarehouse.locations : ['LOC-01'];

  // Filter parts based on receipt type & search
  const eligibleParts = useMemo(() => {
    const base =
      receiptSubType === 'FINISHED_PRODUCT'
        ? parts.filter(p => p.category === 'FINISHED_GOOD')
        : receiptSubType === 'OPENING_BALANCE'
        ? parts
        : parts.filter(p => p.category === 'RAW_MATERIAL' || p.category === 'WIP_PART');

    if (!partSearch.trim()) return base;
    const q = partSearch.toLowerCase();
    return base.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.materialGrade && p.materialGrade.toLowerCase().includes(q))
    );
  }, [parts, receiptSubType, partSearch]);

  useEffect(() => {
    if (eligibleParts.length > 0 && (!selectedPartId || !eligibleParts.some(p => p.id === selectedPartId))) {
      setSelectedPartId(eligibleParts[0].id);
    }
  }, [eligibleParts, selectedPartId]);

  const selectedPart = parts.find(p => p.id === selectedPartId);

  // Determine if selected item is Sheet Metal (progressive disclosure)
  const isSheetMetal = useMemo(() => {
    if (!selectedPart) return false;
    return (
      selectedPart.unit === 'KG' ||
      Boolean(selectedPart.thicknessMm && selectedPart.thicknessMm > 0) ||
      selectedPart.name.includes('ورق') ||
      selectedPart.name.includes('کلاف') ||
      selectedPart.name.includes('رول')
    );
  }, [selectedPart]);

  // Initialize default contract allocation when sheet metal is selected
  useEffect(() => {
    if (isSheetMetal && contracts.length > 0 && contractAllocations.length === 0) {
      setContractAllocations([{ contractId: contracts[0].id, allocatedWeightKg: quantity || '' }]);
    }
  }, [isSheetMetal, contracts, contractAllocations.length, quantity]);

  const enteredQty = Number(quantity) || 0;
  const calculatedWeightKg = useMemo(() => {
    if (!selectedPart) return 0;
    if (selectedPart.unit === 'KG') return enteredQty;
    return Number((enteredQty * (selectedPart.weightPerUnitKg || 1)).toFixed(3));
  }, [enteredQty, selectedPart]);

  // Multi-contract allocation calculations
  const totalAllocatedKg = useMemo(() => {
    return contractAllocations.reduce((sum, item) => sum + (Number(item.allocatedWeightKg) || 0), 0);
  }, [contractAllocations]);

  const allocationDiffKg = Number((calculatedWeightKg - totalAllocatedKg).toFixed(2));

  if (!isOpen) return null;

  const handleAddContractRow = () => {
    if (contracts.length === 0) return;
    const remaining = Math.max(0, allocationDiffKg);
    setContractAllocations(prev => [
      ...prev,
      { contractId: contracts[0].id, allocatedWeightKg: remaining > 0 ? String(remaining) : '' },
    ]);
  };

  const handleRemoveContractRow = (idx: number) => {
    setContractAllocations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!selectedPartId) {
      setErrorMessage('لطفاً کالا یا ورق مورد نظر را از لیست انتخاب کنید.');
      return;
    }
    if (enteredQty <= 0) {
      setErrorMessage('مقدار / وزن دریافتی باید بزرگتر از صفر باشد.');
      return;
    }
    if (isSheetMetal && !coilPackNumber.trim()) {
      setErrorMessage('برای ورود ورق، ثبت «شماره کویل‌پک (Coil-Pack)» جهت رهگیری در انبار الزامی است.');
      return;
    }
    if (isSheetMetal && totalAllocatedKg > calculatedWeightKg) {
      setErrorMessage(
        `مجموع وزن تخصیص‌یافته به قراردادها (${formatNumber(totalAllocatedKg)} کیلوگرم) نمی‌تواند بیشتر از وزن باسکول رول دریافتی (${formatNumber(calculatedWeightKg)} کیلوگرم) باشد.`
      );
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (autoPost: boolean) => {
    setErrorMessage(null);
    setLoading(true);

    const primaryContractId =
      contractAllocations.length > 0 ? contractAllocations[0].contractId : contracts[0]?.id;
    const primaryContract = contracts.find(c => c.id === primaryContractId);
    const effectiveLot = coilPackNumber.trim() || physicalCoilCode.trim() || undefined;

    const payload = {
      documentType: docType,
      warehouseId,
      ownership,
      referenceType:
        receiptSubType === 'SAPCO_MATERIAL'
          ? 'SAPCO_WAYBILL'
          : receiptSubType === 'FINISHED_PRODUCT'
          ? 'PRODUCTION_REPORT'
          : 'SUPPLIER_WAYBILL',
      referenceNumber: referenceNumber.trim() || undefined,
      autoPost,
      lines: [
        {
          partId: selectedPartId,
          partCode: selectedPart?.code,
          partName: selectedPart?.name,
          lotNumber: effectiveLot,
          heatNumber: heatNumber.trim() || undefined,
          ownership,
          contractId: primaryContract?.id,
          contractNumber: primaryContract?.contractNumber,
          locationCode,
          quantity: enteredQty,
          unit: selectedPart?.unit || 'KG',
          qualityStatus,
          notes: notes.trim() || undefined,
        },
      ],
    };

    const res = await onSubmit(payload);

    // If sheet metal, also register the Physical Coil & Multi-Contract Allocations in /api/inventory/coils
    if (res.success && isSheetMetal && coilPackNumber.trim()) {
      try {
        const validAllocations = contractAllocations
          .filter(a => Number(a.allocatedWeightKg) > 0)
          .map(a => {
            const cnt = contracts.find(c => c.id === a.contractId);
            return {
              contractId: a.contractId,
              contractNumber: cnt?.contractNumber || a.contractId,
              allocatedWeightKg: Number(a.allocatedWeightKg),
            };
          });

        await fetch('/api/inventory/coils', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coilId: physicalCoilCode.trim() || `COIL-${Date.now().toString().slice(-5)}`,
            coilPackNumber: coilPackNumber.trim(),
            partId: selectedPart?.id,
            partCode: selectedPart?.code,
            partName: selectedPart?.name,
            materialGrade: selectedPart?.materialGrade || 'ST12',
            thicknessMm: selectedPart?.thicknessMm || 1.0,
            widthMm: (selectedPart as any)?.widthMm || 1000,
            originalWeightKg: calculatedWeightKg,
            remainingWeightKg: calculatedWeightKg,
            ownership,
            warehouseId,
            locationCode,
            heatNumber: heatNumber.trim() || undefined,
            allocations: validAllocations,
          }),
        });
      } catch {
        // Non-blocking coil registration sync
      }
    }

    setLoading(false);

    if (res.success) {
      setStep(1);
      setQuantity('');
      setCoilPackNumber('');
      setPhysicalCoilCode('');
      setHeatNumber('');
      onClose();
    } else {
      setErrorMessage(res.error || 'خطا در ثبت سند رسید کالا');
    }
  };

  const receiptTypes: Array<{ id: GuidedReceiptSubType; title: string; subtitle: string }> = [
    {
      id: 'SAPCO_MATERIAL',
      title: 'رسید ورق و مواد امانی ساپکو',
      subtitle: 'ورود رول ورق یا اقلام امانی خودروساز با حواله ساپکو',
    },
    {
      id: 'CUSTOMER_SUPPLIED',
      title: 'رسید مواد ارسالی مستقیم مشتری',
      subtitle: 'ورق، پیچ و مهره یا قطعاتی که مشتری طبق قرارداد تامین می‌کند',
    },
    {
      id: 'SUPPLIER_PURCHASE',
      title: 'خرید مستقیم از تامین‌کننده (ملکی)',
      subtitle: 'ورق، پیچ، مهره و لاستیک خریداری‌شده با مالکیت شرکت کوثر',
    },
    {
      id: 'OPENING_BALANCE',
      title: 'ثبت موجودی اول دوره',
      subtitle: 'ورود موجودی شمارش‌شده ابتدای دوره به کاردکس انبار',
    },
    {
      id: 'FINISHED_PRODUCT',
      title: 'رسید محصول نهایی از سالن تولید',
      subtitle: 'تحویل قطعات پرسکاری و مونتاژشده به انبار محصول',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-600 text-white rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                ثبت رسید ورود کالا، رول ورق و قطعات به انبار
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                فرم هوشمند ورود کالا به انبار همراه با بارگذاری خودکار مشخصات فنی و تسهیم چندقراردادی رول ورق
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

        {/* Guided Stepper Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto gap-3">
          {[
            { num: 1, label: '۱. نوع رسید و انبار مقصد' },
            { num: 2, label: '۲. انتخاب کالا، وزن و تخصیص قرارداد' },
            { num: 3, label: '۳. پیش‌نمایش و ثبت قطعی / موقت' },
          ].map(s => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num as 1 | 2 | 3);
              }}
              className={`flex items-center gap-2 font-semibold whitespace-nowrap cursor-pointer ${
                step === s.num
                  ? 'text-slate-900'
                  : step > s.num
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === s.num
                    ? 'bg-slate-900 text-white'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {toPersianDigits(s.num)}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[78vh] overflow-y-auto">
          {isAiPrefilled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-xs text-emerald-800">تکمیل هوشمند توسط دستیار هوش مصنوعی کارخانه</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    فیلدهای رسید کالا با مشخصات دریافتی از دستور صوتی/متنی شما پر شده‌اند. لطفاً پس از بازبینی، جهت نهایی‌سازی تایید فرمایید.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-emerald-200/80 text-emerald-900 font-bold text-[11px]">
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

          {/* STEP 1: Receipt Type & Warehouse */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-slate-800 font-bold mb-2">
                  گام اول: نوع عملیات ورود کالا را انتخاب کنید <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {receiptTypes.map(rt => {
                    const active = receiptSubType === rt.id;
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setReceiptSubType(rt.id)}
                        className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs">{rt.title}</div>
                        <div className={`text-[11px] mt-1 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {rt.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    انبار تحویل‌گیرنده <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={e => {
                      setWarehouseId(e.target.value);
                      const wh = warehouses.find(w => w.id === e.target.value);
                      if (wh && wh.locations.length > 0) setLocationCode(wh.locations[0]);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    جایگاه / پالت انبارش
                    <ContextualHelp
                      title="جایگاه انبارش"
                      description="کد محل قرارگیری فیزیکی رول یا پالت در سالن انبار."
                      example="LOC-RAW-A1"
                    />
                  </label>
                  <select
                    value={locationCode}
                    onChange={e => setLocationCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {availableLocations.map(loc => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    شماره بارنامه / قبض باسکول
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="مثلاً WB-1403-8821"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Item Selection, Smart Progressive Disclosure & Multi-Contract Split */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Item Search & Select */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    جستجوی سریع کالا / ورق
                  </label>
                  <input
                    type="text"
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    placeholder="جستجو با نام، کد یا گرید ST12..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    انتخاب کالا از فهرست اطلاعات پایه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPartId}
                    onChange={e => setSelectedPartId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    {eligibleParts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — واحد: {p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automatic Read-Only Item Master Specification Banner */}
              {selectedPart && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-slate-600">مشخصات تعریف‌شده در اطلاعات پایه کالا:</span>
                    <strong className="text-slate-900">{selectedPart.name}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span>کد: {selectedPart.code}</span>
                    {selectedPart.materialGrade && (
                      <>
                        <span>·</span>
                        <span>جنس/گرید: {selectedPart.materialGrade}</span>
                      </>
                    )}
                    {selectedPart.thicknessMm && (
                      <>
                        <span>·</span>
                        <span>ضخامت: {selectedPart.thicknessMm} mm</span>
                      </>
                    )}
                    <span>·</span>
                    <span>واحد: {selectedPart.unit === 'KG' ? 'کیلوگرم (KG)' : 'عدد (PCS)'}</span>
                  </div>
                </div>
              )}

              {/* Quantity & Quality Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    {isSheetMetal ? 'وزن باسکول دریافتی (کیلوگرم)' : `مقدار دریافتی (${selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'})`}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={e => {
                      const val = e.target.value;
                      setQuantity(val);
                      if (contractAllocations.length === 1) {
                        setContractAllocations([{ ...contractAllocations[0], allocatedWeightKg: val }]);
                      }
                    }}
                    placeholder={isSheetMetal ? 'مثلاً 2000' : 'مثلاً 500'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    معادل وزنی کل (کیلوگرم)
                  </label>
                  <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm">
                    {formatWeightKg(calculatedWeightKg)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    وضعیت تایید کنترل کیفیت (QC)
                  </label>
                  <select
                    value={qualityStatus}
                    onChange={e => setQualityStatus(e.target.value as StockQualityStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
                  >
                    <option value="AVAILABLE">سالم و قابل مصرف در تولید</option>
                    <option value="QUARANTINE">در انتظار آزمایشگاه / قرنطینه</option>
                    <option value="QUALITY_BLOCKED">مردود / بلوکه کیفی</option>
                  </select>
                </div>
              </div>

              {/* PROGRESSIVE DISCLOSURE: Sheet Metal Specific Tracking & Multi-Contract Allocation */}
              {isSheetMetal ? (
                <div className="space-y-4 bg-blue-50/40 border border-blue-200/80 rounded-xl p-4">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>مشخصات اختصاصی رول ورق (کویل‌پک و تسهیم قرارداد)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        شماره کویل‌پک (Coil-Pack) <span className="text-rose-500">*</span>
                        <ContextualHelp
                          title="شماره کویل‌پک (Coil-Pack)"
                          description="شماره بسته یا پک کلاف ورق که روی پلاک رول درج شده و در استعلام موجودی و گزارش‌های انبار بر اساس آن فیلتر می‌کنید."
                          whyNeeded="برای اینکه هنگام انتخاب جنس ورق، دقیقاً ببینید کدام کویل‌پک‌ها در انبار موجود هستند."
                          example="PK-ST12-1403-09"
                          mandatory
                        />
                      </label>
                      <input
                        type="text"
                        value={coilPackNumber}
                        onChange={e => setCoilPackNumber(e.target.value)}
                        placeholder="مثلاً PK-ST12-1403-09"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        شناسه رول فیزیکی (اختیاری)
                        <ContextualHelp
                          title="شناسه رول فیزیکی"
                          description="کد یکتای رول در کارخانه؛ در صورت خالی گذاشتن، سیستم به صورت خودکار کد رول تخصیص می‌دهد."
                          example="COIL-1403-204"
                        />
                      </label>
                      <input
                        type="text"
                        value={physicalCoilCode}
                        onChange={e => setPhysicalCoilCode(e.target.value)}
                        placeholder="مثلاً COIL-1403-204"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        شماره ذوب (Heat No)
                      </label>
                      <input
                        type="text"
                        value={heatNumber}
                        onChange={e => setHeatNumber(e.target.value)}
                        placeholder="مثلاً HT-MOB-9921"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Multi-Contract Split Section */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800">
                        تخصیص وزن این رول به قراردادها (امکان تقسیم یک رول بین چند قرارداد با ضخامت یکسان)
                        <ContextualHelp
                          title="تخصیص یک رول بین چند قرارداد"
                          description="اگر بخشی از وزن این رول مربوط به یک قرارداد و بقیه آن مربوط به قرارداد دیگری است، می‌توانید ردیف قرارداد جدید اضافه کنید."
                          whyNeeded="تا سهمیه هر قرارداد به درستی از همان رول فیزیکی محاسبه و گزارش‌گیری شود."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddContractRow}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن قرارداد دیگر به این رول</span>
                      </button>
                    </div>

                    {contractAllocations.map((row, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="sm:col-span-7">
                          <select
                            value={row.contractId}
                            onChange={e => {
                              const next = [...contractAllocations];
                              next[index].contractId = e.target.value;
                              setContractAllocations(next);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                          >
                            {contracts.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.contractNumber} — {c.title} ({c.materialGrade})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-4 flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={row.allocatedWeightKg}
                            onChange={e => {
                              const next = [...contractAllocations];
                              next[index].allocatedWeightKg = e.target.value;
                              setContractAllocations(next);
                            }}
                            placeholder="وزن سهم (kg)"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold"
                          />
                          <span className="text-slate-500 font-mono">kg</span>
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {contractAllocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveContractRow(index)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="حذف این ردیف قرارداد"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 text-slate-600">
                      <span>
                        مجموع تخصیص‌یافته به قراردادها:{' '}
                        <strong className="font-mono text-slate-900">{formatWeightKg(totalAllocatedKg)}</strong>
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          allocationDiffKg < 0
                            ? 'text-rose-600'
                            : allocationDiffKg === 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {allocationDiffKg === 0
                          ? '✓ کل وزن رول به طور کامل به قرارداد(ها) تخصیص یافت'
                          : allocationDiffKg > 0
                          ? `وزن آزاد / بدون قرارداد: ${formatWeightKg(allocationDiffKg)}`
                          : `خطا: اضافه‌تخصیص بیش از وزن رول (${formatWeightKg(Math.abs(allocationDiffKg))})`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Screws, Nuts, Rubber, or Standard Parts */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      شماره بسته / بچ ورودی (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={coilPackNumber}
                      onChange={e => setCoilPackNumber(e.target.value)}
                      placeholder="مثلاً BATCH-1403-12"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      قرارداد مرتبط (در صورت وجود)
                    </label>
                    <select
                      value={contractAllocations[0]?.contractId || ''}
                      onChange={e =>
                        setContractAllocations(
                          e.target.value ? [{ contractId: e.target.value, allocatedWeightKg: String(calculatedWeightKg) }] : []
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    >
                      <option value="">بدون قرارداد (موجودی عمومی کارخانه)</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.contractNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  توضیحات سند رسید
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="نام راننده، شماره پلاک خودرو، توضیحات بازرسی..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>پیش‌نمایش اطلاعات سند پیش از ثبت نهایی</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">نوع رسید و مالکیت:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {receiptTypes.find(r => r.id === receiptSubType)?.title}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">انبار و جایگاه تحویل:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {currentWarehouse?.name} ({locationCode})
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">کالا / متریال انتخابی:</span>
                  <strong className="text-slate-900 mt-1 block">
                    {selectedPart?.name} ({selectedPart?.code})
                  </strong>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block">مقدار / وزن قابل ثبت:</span>
                  <strong className="text-emerald-900 font-mono text-sm mt-1 block">
                    {formatNumber(enteredQty)} {selectedPart?.unit === 'KG' ? 'کیلوگرم' : 'عدد'} ({formatWeightKg(calculatedWeightKg)})
                  </strong>
                </div>
                {coilPackNumber && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">کویل‌پک / بچ:</span>
                    <strong className="text-slate-900 font-mono mt-1 block">{coilPackNumber}</strong>
                  </div>
                )}
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">تسهیم قرارداد:</span>
                  <strong className="text-slate-900 font-mono mt-1 block">
                    {contractAllocations.length > 0
                      ? contractAllocations
                          .filter(a => Number(a.allocatedWeightKg) > 0)
                          .map(a => {
                            const c = contracts.find(cnt => cnt.id === a.contractId);
                            return `${c?.contractNumber || a.contractId}: ${formatNumber(Number(a.allocatedWeightKg))} kg`;
                          })
                          .join(' | ') || 'بدون قرارداد'
                      : 'بدون قرارداد'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation & Standard Persian Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                انصراف
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                  disabled={loading}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  بازگشت
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ادامه: انتخاب کالا و مقدار</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>پیش‌نمایش سند</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalSubmit(false)}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ثبت موقت (پیش‌نویس)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalSubmit(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'در حال ثبت...' : 'ثبت قطعی در کاردکس'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
