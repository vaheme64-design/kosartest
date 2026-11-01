import React, { useState, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Building2,
  RefreshCw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpLeft,
  Calendar,
  Layers,
  FileCheck,
} from 'lucide-react';
import {
  SapcoContract,
  SapcoContractLedgerEntry,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../../utils/formatters';

interface SapcoAccountReportViewProps {
  contracts: SapcoContract[];
  ledger: SapcoContractLedgerEntry[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const SapcoAccountReportView: React.FC<SapcoAccountReportViewProps> = ({
  contracts,
  ledger,
  loading,
  onRefresh,
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('ALL');
  const [selectedOperationFilter, setSelectedOperationFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination for ledger table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Aggregate metrics across active contracts
  const totalAllocatedKg = contracts.reduce((sum, c) => sum + c.allocatedWeightKg, 0);
  const totalReceivedKg = contracts.reduce((sum, c) => sum + c.totalReceivedKg, 0);
  const totalConsumedKg = contracts.reduce((sum, c) => sum + c.totalConsumedKg, 0);
  const totalClosingBalanceKg = contracts.reduce((sum, c) => sum + c.closingBalanceKg, 0);

  const operationLabels: Record<string, { label: string; color: string; sign: string }> = {
    OPENING: { label: 'موجودی اول دوره', color: 'bg-slate-700 text-slate-200', sign: '' },
    RECEIPT: { label: 'ورود رول ساپکو', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', sign: '+' },
    CONSUMPTION: { label: 'مصرف در خط پرس', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', sign: '-' },
    RETURN: { label: 'برگشت به ساپکو', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', sign: '-' },
    ADJUSTMENT: { label: 'تعدیل حسابرسی', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', sign: '±' },
  };

  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      if (selectedContractId !== 'ALL' && item.contractId !== selectedContractId) {
        return false;
      }
      if (selectedOperationFilter !== 'ALL' && item.operationType !== selectedOperationFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesDoc = item.documentNumber.toLowerCase().includes(q);
        const matchesWaybill = item.waybillNumber ? item.waybillNumber.toLowerCase().includes(q) : false;
        const matchesLot = item.lotNumber ? item.lotNumber.toLowerCase().includes(q) : false;
        const matchesHeat = item.heatNumber ? item.heatNumber.toLowerCase().includes(q) : false;
        const matchesNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
        if (!matchesDoc && !matchesWaybill && !matchesLot && !matchesHeat && !matchesNotes) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, selectedContractId, selectedOperationFilter, searchTerm]);

  const totalPages = Math.ceil(filteredLedger.length / pageSize) || 1;
  const pagedLedger = filteredLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCsv = () => {
    const headers = [
      'قرارداد ساپکو',
      'شماره سند کاردکس',
      'تاریخ',
      'نوع تراکنش',
      'شماره بارنامه ساپکو',
      'شماره رول / لوت',
      'شماره ذوب فولادساز',
      'وزن تراکنش (کیلوگرم)',
      'مانده جاری قرارداد (کیلوگرم)',
      'شرح و توضیحات',
    ];

    const rows = filteredLedger.map(l => [
      l.contractNumber,
      l.documentNumber,
      l.date,
      operationLabels[l.operationType]?.label || l.operationType,
      l.waybillNumber || '-',
      l.lotNumber || '-',
      l.heatNumber || '-',
      l.weightKgSigned,
      l.runningBalanceKg,
      l.notes || '-',
    ]);

    exportToCsv(`حسابداری_و_کاردکس_سهمیه_ساپکو_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-400" />
            حسابداری سهمیه ورق و کلاف‌های امانی ساپکو (SAPCO Consignment)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ردیابی مستقل موجودی امانی ساپکو از موجودی ملکی کارخانه بر حسب کیلوگرم، تطبیق بارنامه‌های ورودی و موازنه مصارف خطوط پرس
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی حساب‌ها</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>گزارش جامع اکسل</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">کل سهمیه تخصیصی قراردادها</span>
          <div className="text-base lg:text-xl font-bold text-white mt-1">
            {formatWeightKg(totalAllocatedKg)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">بر اساس تفاهم‌نامه‌های ساپکو</span>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">مجموع دریافتی کلاف (تحویل کارخانه)</span>
          <div className="text-base lg:text-xl font-bold text-emerald-400 mt-1">
            {formatWeightKg(totalReceivedKg)}
          </div>
          <span className="text-[10px] text-emerald-400/80 block mt-1">
            {totalAllocatedKg > 0 ? toPersianDigits(Math.round((totalReceivedKg / totalAllocatedKg) * 100)) : 0}٪ کل سهمیه
          </span>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">مجموع مصرف و برش خطوط پرس</span>
          <div className="text-base lg:text-xl font-bold text-amber-400 mt-1">
            {formatWeightKg(totalConsumedKg)}
          </div>
          <span className="text-[10px] text-amber-400/80 block mt-1">
            {totalReceivedKg > 0 ? toPersianDigits(Math.round((totalConsumedKg / totalReceivedKg) * 100)) : 0}٪ دریافتی
          </span>
        </div>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] text-emerald-400 font-medium">موجودی کلاف در انبار (مانده پایان دوره)</span>
          <div className="text-base lg:text-xl font-bold text-emerald-300 mt-1">
            {formatWeightKg(totalClosingBalanceKg)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">فیزیکی موجود در انبار شماره ۱</span>
        </div>
      </div>

      {/* Contracts Progress Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>وضعیت تفکیکی سهمیه قراردادهای فعال ساپکو</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contracts.map(contract => {
            const consumedPercent = contract.allocatedWeightKg > 0
              ? Math.min(100, Math.round((contract.totalConsumedKg / contract.allocatedWeightKg) * 100))
              : 0;

            const isSelected = selectedContractId === contract.id;

            return (
              <div
                key={contract.id}
                onClick={() => setSelectedContractId(isSelected ? 'ALL' : contract.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {contract.contractNumber}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{contract.title}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    گرید {contract.materialGrade}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">درصد مصرف سهمیه:</span>
                    <span className="font-mono font-bold text-amber-400">{toPersianDigits(consumedPercent)}٪</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${consumedPercent}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown details */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">سهمیه کل:</span>
                    <span className="font-mono font-bold text-slate-300">{formatWeightKg(contract.allocatedWeightKg)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">دریافتی کارخانه:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatWeightKg(contract.totalReceivedKg)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">مصرف شده:</span>
                    <span className="font-mono font-bold text-amber-400">{formatWeightKg(contract.totalConsumedKg)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block font-medium">مانده در انبار:</span>
                    <span className="font-mono font-bold text-emerald-300">{formatWeightKg(contract.closingBalanceKg)}</span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-400">
                  قطعات مجاز: <span className="font-mono text-slate-300">{contract.associatedPartCodes.join(' ، ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Movement Ledger Section */}
      <div className="space-y-4">
        {/* Ledger Filter Bar */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="جستجوی بارنامه ساپکو، شماره سند، لوت یا شماره ذوب..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={selectedContractId}
              onChange={e => { setSelectedContractId(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه قراردادهای ساپکو</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.contractNumber} - {c.title}</option>
              ))}
            </select>

            <select
              value={selectedOperationFilter}
              onChange={e => { setSelectedOperationFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه انواع تراکنش‌ها</option>
              <option value="OPENING">موجودی اول دوره</option>
              <option value="RECEIPT">ورود رول ساپکو</option>
              <option value="CONSUMPTION">مصرف در خط پرس</option>
              <option value="RETURN">برگشت به ساپکو</option>
              <option value="ADJUSTMENT">تعدیلات</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            ردیف‌های گردش: <span className="font-bold text-white">{toPersianDigits(filteredLedger.length)}</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 font-semibold select-none">
                  <th className="py-3 px-3">ردیف</th>
                  <th className="py-3 px-3">تاریخ</th>
                  <th className="py-3 px-3">شماره سند کاردکس</th>
                  <th className="py-3 px-3">نوع عملیات</th>
                  <th className="py-3 px-3">قرارداد</th>
                  <th className="py-3 px-3">شماره بارنامه ساپکو</th>
                  <th className="py-3 px-3">شماره رول / لوت</th>
                  <th className="py-3 px-3">شماره ذوب</th>
                  <th className="py-3 px-3 text-left">وزن گردش (کیلوگرم)</th>
                  <th className="py-3 px-3 text-left">مانده جاری (کیلوگرم)</th>
                  <th className="py-3 px-3">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pagedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      هیچ رکوردی در کاردکس سهمیه ساپکو یافت نشد.
                    </td>
                  </tr>
                ) : (
                  pagedLedger.map((row, idx) => {
                    const op = operationLabels[row.operationType] || { label: row.operationType, color: 'bg-slate-700 text-slate-300', sign: '' };
                    const isPositive = row.weightKgSigned > 0;

                    return (
                      <tr key={row.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {toPersianDigits((currentPage - 1) * pageSize + idx + 1)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{row.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">{row.documentNumber}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${op.color}`}>
                            {op.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-cyan-300">{row.contractNumber}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">{row.waybillNumber || '-'}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">{row.lotNumber || '-'}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{row.heatNumber || '-'}</td>
                        <td className="py-3 px-3 font-mono font-bold text-left">
                          <span className={isPositive ? 'text-emerald-400' : 'text-amber-400'}>
                            {isPositive ? `+${formatNumber(row.weightKgSigned)}` : formatNumber(row.weightKgSigned)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white text-left">
                          {formatWeightKg(row.runningBalanceKg)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px] max-w-[200px] truncate" title={row.notes}>
                          {row.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
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
        </div>
      </div>
    </div>
  );
};
