import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Building2,
  RefreshCw,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Boxes,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpLeft,
  Scale,
} from 'lucide-react';
import {
  InventoryDocument,
  WarehouseDefinition,
  InventoryDocType,
  PostingStatus,
  StockOwnership,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../../utils/formatters';

interface MovementHistoryViewProps {
  documents: InventoryDocument[];
  warehouses: WarehouseDefinition[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onReverseDocument: (documentId: string, reason: string) => Promise<{ success: boolean; message: string }>;
}

export const MovementHistoryView: React.FC<MovementHistoryViewProps> = ({
  documents,
  warehouses,
  loading,
  onRefresh,
  onReverseDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Reversal dialog state
  const [reversalDoc, setReversalDoc] = useState<InventoryDocument | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const docTypeLabels: Record<InventoryDocType, { label: string; color: string; icon: any }> = {
    OPENING_BALANCE: { label: 'موجودی اول دوره', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: Scale },
    RECEIPT_RAW_MATERIAL: { label: 'رسید ورود مواد اولیه', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: ArrowDownRight },
    ISSUE_RAW_MATERIAL: { label: 'حواله خروج و مصرف', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: ArrowUpLeft },
    RECEIPT_FINISHED_GOODS: { label: 'رسید محصول نهایی', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CheckCircle2 },
    TRANSFER: { label: 'انتقال بین‌انباری', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: ArrowRightLeft },
    ADJUSTMENT: { label: 'تعدیل انبارگردانی', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: Scale },
    REVERSAL: { label: 'سند اصلاحی / ابطال', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: RotateCcw },
  };

  const statusLabels: Record<PostingStatus, { label: string; color: string }> = {
    POSTED: { label: 'قطعی (ثبت در کاردکس)', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    UNPOSTED: { label: 'پیش‌نویس (غیرقطعی)', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    REVERSED: { label: 'ابطال‌شده با سند معکوس', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (selectedTypeFilter !== 'ALL' && doc.documentType !== selectedTypeFilter) {
        return false;
      }
      if (selectedWarehouseFilter !== 'ALL' && doc.warehouseId !== selectedWarehouseFilter && doc.targetWarehouseId !== selectedWarehouseFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ALL' && doc.postingStatus !== selectedStatusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesDocNo = doc.documentNumber.toLowerCase().includes(q);
        const matchesRef = doc.referenceNumber ? doc.referenceNumber.toLowerCase().includes(q) : false;
        const matchesNote = doc.auditNote ? doc.auditNote.toLowerCase().includes(q) : false;
        const matchesContract = doc.contractNumber ? doc.contractNumber.toLowerCase().includes(q) : false;
        const matchesLine = doc.lines.some(l => 
          l.partName.toLowerCase().includes(q) ||
          l.partCode.toLowerCase().includes(q) ||
          (l.lotNumber && l.lotNumber.toLowerCase().includes(q)) ||
          (l.heatNumber && l.heatNumber.toLowerCase().includes(q))
        );
        if (!matchesDocNo && !matchesRef && !matchesNote && !matchesContract && !matchesLine) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, selectedTypeFilter, selectedWarehouseFilter, selectedStatusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const pagedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Statistics for top cards
  const postedCount = documents.filter(d => d.postingStatus === 'POSTED').length;
  const reversalCount = documents.filter(d => d.documentType === 'REVERSAL' || d.postingStatus === 'REVERSED').length;
  const unpostedCount = documents.filter(d => d.postingStatus === 'UNPOSTED').length;
  const totalWeightIn = documents
    .filter(d => (d.documentType === 'RECEIPT_RAW_MATERIAL' || d.documentType === 'RECEIPT_FINISHED_GOODS') && d.postingStatus === 'POSTED')
    .reduce((s, d) => s + d.totalWeightKg, 0);
  const totalWeightOut = documents
    .filter(d => d.documentType === 'ISSUE_RAW_MATERIAL' && d.postingStatus === 'POSTED')
    .reduce((s, d) => s + d.totalWeightKg, 0);

  const handleExportCsv = () => {
    const headers = [
      'شماره سند',
      'نوع سند',
      'تاریخ سند',
      'وضعیت قطعی',
      'انبار مبدأ',
      'انبار مقصد',
      'مالکیت',
      'قرارداد ساپکو',
      'شماره ارجاع / بارنامه',
      'تعداد اقلام',
      'تعداد کل',
      'وزن کل (کیلوگرم)',
      'سند اصلی ابطال‌شده',
      'علت / یادداشت حسابرسی',
      'ثبت‌کننده',
    ];

    const rows = filteredDocs.map(d => [
      d.documentNumber,
      docTypeLabels[d.documentType]?.label || d.documentType,
      d.documentDate,
      statusLabels[d.postingStatus]?.label || d.postingStatus,
      d.warehouseName,
      d.targetWarehouseName || '-',
      d.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه',
      d.contractNumber || '-',
      d.referenceNumber || '-',
      d.lines.length,
      d.totalQuantity,
      d.totalWeightKg,
      d.reversalOfDocNumber || '-',
      d.adjustmentReason || d.auditNote || '-',
      d.createdByName,
    ]);

    exportToCsv(`کاردکس_و_تاریخچه_اسناد_انبار_${Date.now()}`, headers, rows);
  };

  const handleConfirmReversal = async () => {
    if (!reversalDoc) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      setReversalError('لطفاً دلیل مستند و مشخصی برای ابطال و صدور سند معکوس درج کنید (حداقل ۵ کاراکتر).');
      return;
    }

    setIsSubmittingReversal(true);
    setReversalError(null);

    try {
      const res = await onReverseDocument(reversalDoc.id, reversalReason.trim());
      if (res.success) {
        setReversalDoc(null);
        setReversalReason('');
        await onRefresh();
      } else {
        setReversalError(res.message);
      }
    } catch (err: any) {
      setReversalError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Summary */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            تاریخچه تراکنش‌ها و کاردکس اسناد انبار (Ledger)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دفتر ثبت رویدادهای غیرقابل تغییر (Immutable Ledger)؛ هرگونه اصلاح منحصراً از طریق صدور سند معکوس (Reversal) با حفظ ردپای حسابرسی انجام می‌پذیرد.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی کاردکس</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">اسناد قطعی ثبت‌شده</span>
            <div className="text-base lg:text-lg font-bold text-emerald-400 mt-1">
              {formatNumber(postedCount)} <span className="text-xs font-normal text-slate-400">سند</span>
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">مجموع وزن ورودی (رسیدها)</span>
            <div className="text-base lg:text-lg font-bold text-blue-400 mt-1">
              {formatWeightKg(totalWeightIn)}
            </div>
          </div>
          <ArrowDownRight className="w-8 h-8 text-blue-500/20" />
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">مجموع وزن خروجی (حواله‌ها)</span>
            <div className="text-base lg:text-lg font-bold text-amber-400 mt-1">
              {formatWeightKg(totalWeightOut)}
            </div>
          </div>
          <ArrowUpLeft className="w-8 h-8 text-amber-500/20" />
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">اسناد اصلاحی / ابطال</span>
            <div className="text-base lg:text-lg font-bold text-rose-400 mt-1">
              {formatNumber(reversalCount)} <span className="text-xs font-normal text-slate-400">مورد</span>
            </div>
          </div>
          <RotateCcw className="w-8 h-8 text-rose-500/20" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="جستجوی شماره سند، کد/نام قطعه، لوت، ذوب یا بارنامه..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Doc Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={e => { setSelectedTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه انواع اسناد</option>
            <option value="RECEIPT_RAW_MATERIAL">رسید مواد اولیه (ورق و کویل)</option>
            <option value="ISSUE_RAW_MATERIAL">حواله خروج / مصرف</option>
            <option value="RECEIPT_FINISHED_GOODS">رسید محصول نهایی</option>
            <option value="TRANSFER">انتقال بین‌انباری</option>
            <option value="ADJUSTMENT">تعدیل انبارگردانی</option>
            <option value="REVERSAL">سند معکوس / اصلاحی</option>
            <option value="OPENING_BALANCE">موجودی اول دوره</option>
          </select>

          {/* Warehouse Filter */}
          <select
            value={selectedWarehouseFilter}
            onChange={e => { setSelectedWarehouseFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه انبارها</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="POSTED">قطعی (Posted)</option>
            <option value="UNPOSTED">پیش‌نویس (Unposted)</option>
            <option value="REVERSED">ابطال‌شده (Reversed)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          تعداد اسناد: <span className="font-bold text-white">{toPersianDigits(filteredDocs.length)}</span>
        </div>
      </div>

      {/* Documents List & Accordion */}
      <div className="space-y-3">
        {pagedDocs.length === 0 ? (
          <div className="bg-slate-800/40 p-12 text-center rounded-2xl border border-slate-700/60 text-slate-400">
            هیچ سندی منطبق با معیارهای فیلتر یافت نشد.
          </div>
        ) : (
          pagedDocs.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            const typeInfo = docTypeLabels[doc.documentType] || { label: doc.documentType, color: 'bg-slate-700 text-slate-300', icon: FileText };
            const statusInfo = statusLabels[doc.postingStatus] || { label: doc.postingStatus, color: 'bg-slate-700 text-slate-300' };
            const Icon = typeInfo.icon;
            const canReverse = doc.postingStatus === 'POSTED' && doc.documentType !== 'REVERSAL';

            return (
              <div
                key={doc.id}
                className={`bg-slate-800/60 rounded-2xl border transition-all ${
                  isExpanded ? 'border-amber-500/50 shadow-lg shadow-black/20' : 'border-slate-700/60 hover:border-slate-600'
                }`}
              >
                {/* Document Main Row */}
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${typeInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {doc.documentNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {doc.ownership === 'SAPCO_SUPPLIER_OWNED' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            امانی ساپکو
                          </span>
                        )}
                        {doc.reversalOfDocNumber && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            اصلاحیه سند: {doc.reversalOfDocNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span>تاریخ: <span className="font-mono text-slate-300">{doc.documentDate}</span></span>
                        <span>انبار: <span className="text-slate-300 font-medium">{doc.warehouseName}</span></span>
                        {doc.targetWarehouseName && (
                          <span>مقصد: <span className="text-purple-300 font-medium">{doc.targetWarehouseName}</span></span>
                        )}
                        {doc.contractNumber && (
                          <span>قرارداد: <span className="font-mono text-cyan-300">{doc.contractNumber}</span></span>
                        )}
                        {doc.referenceNumber && (
                          <span>ارجاع/بارنامه: <span className="font-mono text-slate-300">{doc.referenceNumber}</span></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-700/60">
                    <div className="text-left md:text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        {formatWeightKg(doc.totalWeightKg)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {toPersianDigits(doc.lines.length)} ردیف کالا ({formatNumber(doc.totalQuantity)} عدد/شیت)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canReverse && (
                        <button
                          onClick={() => {
                            setReversalDoc(doc);
                            setReversalReason('');
                            setReversalError(null);
                          }}
                          className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                          title="صدور سند اصلاحی و ابطال معکوس"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ابطال سند</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'بستن اقلام' : 'مشاهده اقلام'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Lines Table */}
                {isExpanded && (
                  <div className="border-t border-slate-700/60 p-4 bg-slate-900/40 rounded-b-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>
                        اقلام ثبت‌شده در سند <span className="font-mono text-amber-400">{doc.documentNumber}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>ثبت‌کننده: <strong className="text-white">{doc.createdByName}</strong></span>
                        {doc.postedByName && (
                          <span>تأیید نهایی: <strong className="text-emerald-400">{doc.postedByName}</strong></span>
                        )}
                      </div>
                    </div>

                    {(doc.adjustmentReason || doc.auditNote) && (
                      <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>علت یا یادداشت حسابرسی: </strong>
                          <span>{doc.adjustmentReason || doc.auditNote}</span>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700">
                            <th className="py-2.5 px-3">ردیف</th>
                            <th className="py-2.5 px-3">کد کاتالوگ</th>
                            <th className="py-2.5 px-3">عنوان کالا</th>
                            <th className="py-2.5 px-3">شماره رول / لوت</th>
                            <th className="py-2.5 px-3">شماره ذوب</th>
                            <th className="py-2.5 px-3">آدرس در انبار</th>
                            <th className="py-2.5 px-3">وضعیت کیفی</th>
                            <th className="py-2.5 px-3 text-left">تعداد</th>
                            <th className="py-2.5 px-3">واحد</th>
                            <th className="py-2.5 px-3 text-left">وزن (کیلوگرم)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {doc.lines.map((line, idx) => (
                            <tr key={line.id || idx} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{line.partCode}</td>
                              <td className="py-2.5 px-3 text-slate-200 font-medium">{line.partName}</td>
                              <td className="py-2.5 px-3 font-mono text-cyan-300">{line.lotNumber || '-'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{line.heatNumber || '-'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{line.locationCode}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  line.qualityStatus === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-300' :
                                  line.qualityStatus === 'QUALITY_BLOCKED' ? 'bg-rose-500/20 text-rose-300' :
                                  line.qualityStatus === 'REJECTED' ? 'bg-red-500/30 text-red-300' :
                                  'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {line.qualityStatus === 'AVAILABLE' ? 'قابل استفاده' :
                                   line.qualityStatus === 'QUALITY_BLOCKED' ? 'مسدود کیفی' :
                                   line.qualityStatus === 'REJECTED' ? 'نامنطبق / ضایعات' : 'قرنطینه'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-white text-left">
                                {formatNumber(line.quantity)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 font-medium">{line.unit}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-left">
                                {formatWeightKg(line.quantityKg)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div>
            نمایش صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              قبلی
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {toPersianDigits(pageNum)}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ابطال سند و صدور سند معکوس (Reversal)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  سند شماره <span className="font-mono text-amber-400 font-bold">{reversalDoc.documentNumber}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>قانون تغییرناپذیری اسناد انبار (Immutable Documents)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                اسناد قطعی ثبت‌شده قابل حذف یا ویرایش مستقیم نیستند. این عملیات یک سند معکوس هم‌ارز با مقادیر جبرانی صادر کرده و وضعیت سند جاری را به «ابطال‌شده» تغییر می‌دهد تا دفاتر کاردکس و موجودی تصحیح شوند.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                دلیل رسمی ابطال و صدور سند معکوس <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="مثال: اصلاح خطای اپراتور در ثبت بارنامه، مغایرت تناژ با باسکول، برگشت سفارش تولید..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {reversalError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reversalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReversalDoc(null)}
                disabled={isSubmittingReversal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={isSubmittingReversal}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/40 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isSubmittingReversal ? 'animate-spin' : ''}`} />
                <span>تأیید و صدور سند معکوس</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
