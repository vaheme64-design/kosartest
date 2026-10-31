import React, { useState, useEffect, useMemo } from 'react';
import {
  FilePlus2,
  Truck,
  TrendingDown,
  CheckCircle2,
  AlertOctagon,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Scale,
  Cpu,
  Layers,
  Send,
  Check,
  Search,
  Filter,
  Car,
  Wrench,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  Part,
  Machine,
  VoucherType,
  FACTORY_STAGES,
  SCRAP_REASONS,
  StageInventorySummary,
  DieMold,
  Operator,
  PartCategory,
} from '../types/inventory';
import { formatNumber, formatWeightKg, getVoucherTypeLabel, toPersianDigits } from '../utils/formatters';

interface TransactionsVouchersViewProps {
  parts: Part[];
  machines: Machine[];
  dies?: DieMold[];
  operators?: Operator[];
  stageBalances: StageInventorySummary[];
  initialVoucherType?: VoucherType;
  initialPartId?: string;
  initialStageId?: string;
  onSubmitVoucher: (payload: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onCancel?: () => void;
}

export const TransactionsVouchersView: React.FC<TransactionsVouchersViewProps> = ({
  parts,
  machines,
  dies = [],
  operators = [],
  stageBalances,
  initialVoucherType = 'RECEIPT',
  initialPartId,
  initialStageId,
  onSubmitVoucher,
}) => {
  const [voucherType, setVoucherType] = useState<VoucherType>(initialVoucherType);
  const [selectedPartId, setSelectedPartId] = useState<string>(initialPartId || '');
  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId || 'STAGE_RAW_STORE');
  const [targetStageId, setTargetStageId] = useState<string>('STAGE_BLANKING');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');
  const [dieMoldId, setDieMoldId] = useState<string>('');
  const [shift, setShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [scrapReason, setScrapReason] = useState<string>(SCRAP_REASONS[0]);
  const [notes, setNotes] = useState<string>('');

  // Smart Part Filtering States
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PartCategory>('RAW_MATERIAL');
  const [partSearch, setPartSearch] = useState('');
  const [carModelFilter, setCarModelFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-configure category default based on voucher type
  useEffect(() => {
    if (voucherType === 'RECEIPT') {
      // 95% of receipts in this factory are Raw Material Steel Coils/Sheets from SAPCO
      setCategoryFilter('RAW_MATERIAL');
      setSelectedStageId('STAGE_RAW_STORE');
      const rawPart = parts.find(p => p.category === 'RAW_MATERIAL');
      if (rawPart) setSelectedPartId(rawPart.id);
    } else if (voucherType === 'ISSUE') {
      // Raw Material issuance to shearing/stamping lines
      setCategoryFilter('RAW_MATERIAL');
      setSelectedStageId('STAGE_RAW_STORE');
      setTargetStageId('STAGE_SHEARING');
      const rawPart = parts.find(p => p.category === 'RAW_MATERIAL');
      if (rawPart) setSelectedPartId(rawPart.id);
    } else if (voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') {
      // Production is for WIP or Finished Goods
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_BLANKING');
      const wipPart = parts.find(p => p.category === 'WIP_PART') || parts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'WIP_TRANSFER_DISPATCH') {
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_SHEARING');
      setTargetStageId('STAGE_BLANKING');
      const wipPart = parts.find(p => p.category === 'WIP_PART') || parts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'WIP_TRANSFER_RECEIPT') {
      setCategoryFilter('WIP_PART');
      setSelectedStageId('STAGE_BLANKING');
      const wipPart = parts.find(p => p.category === 'WIP_PART') || parts[0];
      if (wipPart) setSelectedPartId(wipPart.id);
    } else if (voucherType === 'OPENING_BALANCE') {
      setCategoryFilter('ALL');
    }
    setErrorMessage(null);
  }, [voucherType, parts]);

  // Unique car models for quick filtering
  const carModelsList = useMemo(() => {
    const list = new Set<string>();
    parts.forEach(p => {
      if (p.carModel) {
        if (p.carModel.includes('۲۰۶')) list.add('پژو ۲۰۶ / ۲۰۷');
        else if (p.carModel.includes('تارا')) list.add('تارا');
        else if (p.carModel.includes('دنا')) list.add('دنا پلاس');
        else if (p.carModel.includes('شاهین')) list.add('شاهین');
        else if (p.carModel.includes('کوییک')) list.add('کوییک / تیبا');
      }
    });
    return Array.from(list);
  }, [parts]);

  // Filtered parts for selection
  const eligibleParts = useMemo(() => {
    return parts.filter(p => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      if (carModelFilter !== 'ALL') {
        if (!p.carModel || !p.carModel.includes(carModelFilter.split(' ')[0])) {
          return false;
        }
      }
      if (partSearch.trim()) {
        const q = partSearch.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesGrade = p.materialGrade?.toLowerCase().includes(q) || false;
        const matchesSapco = p.sapcoCode?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesCode && !matchesGrade && !matchesSapco) {
          return false;
        }
      }
      return true;
    });
  }, [parts, categoryFilter, carModelFilter, partSearch]);

  const selectedPart = parts.find(p => p.id === selectedPartId);

  // Dies compatible with selected part or all dies
  const matchingDies = useMemo(() => {
    if (!selectedPartId) return dies;
    const directMatches = dies.filter(d => d.partId === selectedPartId);
    return directMatches.length > 0 ? directMatches : dies;
  }, [dies, selectedPartId]);

  // Auto-fill die if only 1 matching die exists
  useEffect(() => {
    if (voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') {
      const match = dies.find(d => d.partId === selectedPartId);
      if (match) {
        setDieMoldId(match.id);
        // If die has compatible machines, pick first one
        if (match.compatibleMachineCodes && match.compatibleMachineCodes.length > 0) {
          const compatibleMachine = machines.find(m => match.compatibleMachineCodes?.includes(m.code));
          if (compatibleMachine) setMachineId(compatibleMachine.id);
        }
      }
    }
  }, [selectedPartId, voucherType, dies, machines]);

  // Available stock at source stage
  const currentStageStock = stageBalances.find(
    sb => sb.stageId === selectedStageId && sb.partId === selectedPartId
  );
  const availableUsableQty = currentStageStock ? currentStageStock.usableQty : 0;

  // Live conversion to KG
  const numQty = parseFloat(quantity) || 0;
  const computedWeightKg = selectedPart
    ? selectedPart.unit === 'KG'
      ? numQty
      : numQty * (selectedPart.weightPerUnitKg || 1)
    : 0;

  // Stock depletion check
  const isDeduction = ['ISSUE', 'SCRAP', 'WIP_TRANSFER_DISPATCH'].includes(voucherType);
  const isExceedingStock = isDeduction && numQty > availableUsableQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedPartId) {
      setErrorMessage('لطفاً قطعه یا ماده اولیه را از لیست انتخاب کنید.');
      return;
    }

    if (numQty <= 0) {
      setErrorMessage('مقدار تراکنش باید بزرگتر از صفر باشد.');
      return;
    }

    if (isExceedingStock) {
      setErrorMessage(
        `خطای کنترل موجودی: موجودی در دسترس در این مرحله (${availableUsableQty} ${selectedPart?.unit}) کمتر از مقدار درخواستی (${numQty}) است. سیستم از ثبت موجودی منفی جلوگیری می‌کند.`
      );
      return;
    }

    if (voucherType === 'WIP_TRANSFER_DISPATCH' && selectedStageId === targetStageId) {
      setErrorMessage('مرحله مبدا و مقصد انتقال نمی‌تواند یکسان باشد.');
      return;
    }

    setLoading(true);

    try {
      const selectedDie = dies.find(d => d.id === dieMoldId);
      const selectedOp = operators.find(o => o.id === operatorId);

      const payload = {
        voucherType,
        partId: selectedPartId,
        stageId: selectedStageId,
        targetStageId: voucherType === 'WIP_TRANSFER_DISPATCH' || voucherType === 'ISSUE' ? targetStageId : undefined,
        quantity: numQty,
        referenceDoc,
        operatorName: selectedOp ? selectedOp.fullName : operatorName || undefined,
        machineId: machineId || undefined,
        dieMoldId: dieMoldId || undefined,
        dieMoldName: selectedDie ? selectedDie.name : undefined,
        shift,
        scrapReason: voucherType === 'SCRAP' ? scrapReason : undefined,
        notes,
        isDemo: false, // New manual transactions entered by user are marked as real factory records
      };

      const result = await onSubmitVoucher(payload);
      if (result.success) {
        setSuccessMessage(result.message || 'سند با موفقیت صادر و در دفاتر کل ثبت گردید.');
        setQuantity('');
        setNotes('');
        setReferenceDoc('');
      } else {
        setErrorMessage(result.error || 'خطا در ثبت سند در پایگاه داده.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'خطای ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const voucherTypesList: { id: VoucherType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'RECEIPT',
      label: '۱. رسید ورود کالا',
      icon: <Truck className="w-4 h-4 text-emerald-400" />,
      desc: 'ورود کلاف‌های ورق فولادی از ساپکو / محصولات نهایی به انبار',
    },
    {
      id: 'ISSUE',
      label: '۲. حواله مصرف مواد',
      icon: <TrendingDown className="w-4 h-4 text-amber-400" />,
      desc: 'تخصیص ورق از انبار مواد به خطوط برش و بلنکینگ',
    },
    {
      id: 'PRODUCTION_OUTPUT',
      label: '۳. ثبت تولید سالم',
      icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
      desc: 'ثبت قطعات سالم خروجی از پرس با قالب و اپراتور معین',
    },
    {
      id: 'SCRAP',
      label: '۴. ثبت ضایعات',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
      desc: 'ثبت قطعات معیوب با ثبت دلیل عیب قالب یا ورق',
    },
    {
      id: 'WIP_TRANSFER_DISPATCH',
      label: '۵. ارسال بین مراحل',
      icon: <ArrowRightLeft className="w-4 h-4 text-purple-400" />,
      desc: 'ارسال قطعات نیمه‌ساخته از یک ایستگاه به ایستگاه بعدی با کانبان',
    },
    {
      id: 'WIP_TRANSFER_RECEIPT',
      label: '۶. تأیید دریافت در مقصد',
      icon: <Check className="w-4 h-4 text-indigo-400" />,
      desc: 'وصول قطعات ارسال‌شده در مرحله مقصد بدون ایجاد موجودی مضاعف',
    },
    {
      id: 'OPENING_BALANCE',
      label: '۷. موجودی اول دوره',
      icon: <Calendar className="w-4 h-4 text-blue-400" />,
      desc: 'سند انبارگردانی و تعیین موجودی ابتدای دوره یا کالیبراسیون',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Voucher Type Selector */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
        <div className="mb-4">
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-amber-400" />
            مرکز صدور و ثبت اسناد انبار و سالن‌های تولید
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            فرم‌های تفکیک‌شده و هوشمند بر اساس نوع سند با فیلتر خودکار ورق‌ها، قطعات نیمه‌ساخته WIP و قالب‌های متصل
          </p>
        </div>

        {/* Voucher Type Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {voucherTypesList.map(item => {
            const isSelected = voucherType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setVoucherType(item.id)}
                className={`flex flex-col text-right p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Voucher Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              فرم صدور: {voucherTypesList.find(v => v.id === voucherType)?.label}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            سیستم ثبت: <span className="font-mono text-emerald-400 font-bold">دفتر کل معتبر و بلادرنگ</span>
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">خطا در اعتبارسنجی سند:</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ثبت موفق سند:</p>
              <p className="mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: SMART PART SELECTOR WITH CATEGORY TABS & SEARCH */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>انتخاب قطعه یا ماده اولیه هدف سند *</span>
            </label>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('RAW_MATERIAL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  categoryFilter === 'RAW_MATERIAL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                فقط ورق و مواد اولیه ساپکو ({parts.filter(p => p.category === 'RAW_MATERIAL').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('WIP_PART')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  categoryFilter === 'WIP_PART'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                قطعات نیمه‌ساخته WIP ({parts.filter(p => p.category === 'WIP_PART').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('FINISHED_GOOD')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  categoryFilter === 'FINISHED_GOOD'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                محصولات نهایی ({parts.filter(p => p.category === 'FINISHED_GOOD').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  categoryFilter === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                همه ({parts.length})
              </button>
            </div>
          </div>

          {/* Quick Search & Car Model Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={partSearch}
                onChange={e => setPartSearch(e.target.value)}
                placeholder="جستجوی سریع در نام قطعه، کد کاتالوگ (مثلاً: ST14, DC04, ۲۰۶, تارا, سپر)..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {carModelsList.length > 0 && categoryFilter !== 'RAW_MATERIAL' && (
              <select
                value={carModelFilter}
                onChange={e => setCarModelFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">همه خودروها</option>
                {carModelsList.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtered Dropdown or Cards */}
          <div className="space-y-1">
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              required
            >
              <option value="">-- انتخاب از میان {toPersianDigits(eligibleParts.length)} قلم منطبق با فیلتر --</option>
              {eligibleParts.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name} {p.thicknessMm ? `(ضخامت ${p.thicknessMm}mm)` : ''} {p.carModel ? `[${p.carModel}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Part Details Card */}
          {selectedPart && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 font-mono">{selectedPart.code}</span>
                <span className="text-slate-300">{selectedPart.name}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>واحد سنجش: <strong className="text-white">{selectedPart.unit}</strong></span>
                <span>وزن واحد: <strong className="text-white">{selectedPart.weightPerUnitKg} کیلوگرم</strong></span>
                {selectedPart.materialGrade && (
                  <span>گرید فولاد: <strong className="text-cyan-400">{selectedPart.materialGrade}</strong></span>
                )}
                {selectedPart.sapcoCode && (
                  <span>کد ساپکو: <strong className="text-slate-300 font-mono">{selectedPart.sapcoCode}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: TRANSACTION PARAMETERS & STAGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Source Stage / Store */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {voucherType === 'WIP_TRANSFER_DISPATCH' ? 'ایستگاه مبدا (ارسال‌کننده) *' : 'ایستگاه / انبار مرجع *'}
            </label>
            <select
              value={selectedStageId}
              onChange={e => setSelectedStageId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              required
            >
              {FACTORY_STAGES.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.type})
                </option>
              ))}
            </select>

            {/* Live Stock Status Indicator */}
            {selectedPart && (
              <div className="text-[11px] pt-1 flex items-center justify-between">
                <span className="text-slate-400">موجودی آزاد در این مرحله:</span>
                <span className={`font-bold font-mono ${availableUsableQty > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {formatNumber(availableUsableQty)} {selectedPart.unit}
                </span>
              </div>
            )}
          </div>

          {/* Target Stage (For Transfers and Issues) */}
          {(voucherType === 'WIP_TRANSFER_DISPATCH' || voucherType === 'ISSUE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                ایستگاه مقصد (دریافت‌کننده) *
              </label>
              <select
                value={targetStageId}
                onChange={e => setTargetStageId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              >
                {FACTORY_STAGES.filter(st => st.id !== selectedStageId).map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-purple-400 pt-1">
                ارسال به وضعیت «در راه» در مرحله مقصد می‌رود تا پس از تأیید وصول ثبت نهایی شود.
              </p>
            </div>
          )}

          {/* Quantity Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>مقدار تراکنش ({selectedPart ? selectedPart.unit : 'عدد/کیلوگرم'}) *</span>
              {isExceedingStock && (
                <span className="text-[11px] text-rose-400 font-bold">کسری موجودی!</span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="مثلاً: 1200"
                className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none ${
                  isExceedingStock ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-amber-500'
                }`}
                required
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">
                {selectedPart ? selectedPart.unit : ''}
              </span>
            </div>

            {/* Live Weight Equivalent Preview */}
            {selectedPart && numQty > 0 && (
              <div className="text-[11px] text-cyan-400 flex items-center gap-1 pt-1">
                <Scale className="w-3 h-3" />
                <span>وزن معادل کل: <strong>{formatWeightKg(computedWeightKg)}</strong></span>
              </div>
            )}
          </div>

          {/* Machine Selector (For Production & Scrap) */}
          {(voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">پرس یا ماشین مورد استفاده *</label>
              <select
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- انتخاب ماشین خط تولید --</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.tonnage ? `${m.tonnage}T` : m.processType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Die / Mold Selector (For Production & Scrap) */}
          {(voucherType === 'PRODUCTION_OUTPUT' || voucherType === 'SCRAP') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>قالب پرس متصل (Die / Mold) *</span>
                {matchingDies.length > 0 && (
                  <span className="text-[10px] text-emerald-400">
                    {matchingDies.length} قالب سازگار یافت شد
                  </span>
                )}
              </label>
              <select
                value={dieMoldId}
                onChange={e => setDieMoldId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- انتخاب قالب سنبه ماتریس / کشش --</option>
                {matchingDies.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name} ({d.requiredTonnage} تن - {d.status === 'READY' ? 'آماده' : 'سرویس'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Operator Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">اپراتور / تکنسین ثبت‌کننده</label>
            {operators.length > 0 ? (
              <select
                value={operatorId}
                onChange={e => {
                  setOperatorId(e.target.value);
                  const op = operators.find(o => o.id === e.target.value);
                  if (op) setOperatorName(op.fullName);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- انتخاب اپراتور یا ثبت دستی --</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>
                    [{op.personnelCode}] {op.fullName} (شیفت {op.defaultShift === 'MORNING' ? 'صبح' : op.defaultShift === 'EVENING' ? 'عصر' : 'شب'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                placeholder="نام اپراتور یا تکنسین شیفت"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Shift */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">شیفت کاری</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="MORNING">شیفت صبح (۰۷:۰۰ الی ۱۵:۰۰)</option>
              <option value="EVENING">شیفت عصر (۱۵:۰۰ الی ۲۳:۰۰)</option>
              <option value="NIGHT">شیفت شب (۲۳:۰۰ الی ۰۷:۰۰)</option>
            </select>
          </div>

          {/* Scrap Reason (For Scrap only) */}
          {voucherType === 'SCRAP' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">علت عیب و بروز ضایعات *</label>
              <select
                value={scrapReason}
                onChange={e => setScrapReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {SCRAP_REASONS.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reference Document */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">سند عطف / شماره بارنامه / کانبان</label>
            <input
              type="text"
              value={referenceDoc}
              onChange={e => setReferenceDoc(e.target.value)}
              placeholder="مثلاً: بارنامه ۹۸۲۴۱۵ ساپکو یا دستور کار WO-401"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">توضیحات و یادداشت تکمیلی سند</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="هرگونه یادداشت بازرسی QC، شرایط محیطی، وضعیت قالب پرس، شماره ذوب کویل یا پالت..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
          <div className="text-xs text-slate-400">
            {isDeduction && (
              <span>
                کنترل موجودی مبدا فعال است: خروج بدون موجودی مجاز نخواهد بود.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || isExceedingStock}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'در حال ثبت در سرور و دفاتر...' : 'تأیید و صدور نهایی سند'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
