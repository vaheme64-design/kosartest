import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Building2,
  RefreshCw,
  Scale,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Boxes,
  ArrowUpDown,
} from 'lucide-react';
import {
  DetailedStockBalance,
  Part,
  WarehouseDefinition,
  StockOwnership,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../../utils/formatters';

interface StockInquiryViewProps {
  balances: DetailedStockBalance[];
  parts: Part[];
  warehouses: WarehouseDefinition[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const StockInquiryView: React.FC<StockInquiryViewProps> = ({
  balances,
  parts,
  warehouses,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartFilter, setSelectedPartFilter] = useState('ALL');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [selectedOwnershipFilter, setSelectedOwnershipFilter] = useState<'ALL' | StockOwnership>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof DetailedStockBalance>('physicalKg');
  const [sortAsc, setSortAsc] = useState(false);

  // Unique material grades
  const grades = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => {
      if (p.materialGrade) set.add(p.materialGrade);
    });
    return Array.from(set);
  }, [parts]);

  const filteredBalances = useMemo(() => {
    return balances.filter(item => {
      if (selectedPartFilter !== 'ALL' && item.partId !== selectedPartFilter) {
        return false;
      }
      if (selectedWarehouseFilter !== 'ALL' && item.warehouseId !== selectedWarehouseFilter) {
        return false;
      }
      if (selectedOwnershipFilter !== 'ALL' && item.ownership !== selectedOwnershipFilter) {
        return false;
      }
      if (selectedGradeFilter !== 'ALL' && item.materialGrade !== selectedGradeFilter) {
        return false;
      }
      if (onlyAvailable && item.availableQty <= 0) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.partName.toLowerCase().includes(q);
        const matchesCode = item.partCode.toLowerCase().includes(q);
        const matchesLot = item.lotNumber ? item.lotNumber.toLowerCase().includes(q) : false;
        const matchesHeat = item.heatNumber ? item.heatNumber.toLowerCase().includes(q) : false;
        const matchesWh = item.warehouseName.toLowerCase().includes(q);
        const matchesLoc = item.locationCode.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesLot && !matchesHeat && !matchesWh && !matchesLoc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [
    balances,
    searchTerm,
    selectedPartFilter,
    selectedWarehouseFilter,
    selectedOwnershipFilter,
    selectedGradeFilter,
    onlyAvailable,
    sortField,
    sortAsc,
  ]);

  // Aggregate stats
  const totalPhysicalKg = filteredBalances.reduce((sum, b) => sum + b.physicalKg, 0);
  const totalAvailableKg = filteredBalances.reduce((sum, b) => sum + b.availableKg, 0);
  const totalReservedKg = filteredBalances.reduce((sum, b) => sum + b.reservedKg, 0);
  const totalSapcoKg = filteredBalances
    .filter(b => b.ownership === 'SAPCO_SUPPLIER_OWNED')
    .reduce((sum, b) => sum + b.physicalKg, 0);

  const handleExportCsv = () => {
    const headers = [
      'کد قطعه',
      'عنوان قطعه / متریال',
      'گرید ورق',
      'ضخامت (mm)',
      'انبار',
      'جایگاه / پالت',
      'شماره سریال کلاف / بچ',
      'شماره ذوب',
      'نوع مالکیت',
      'موجودی فیزیکی',
      'موجودی آزاد',
      'موجودی رزرو شده',
      'بلوکه کیفی',
      'واحد',
      'وزن فیزیکی (kg)',
      'وزن آزاد (kg)',
      'آخرین گردش',
    ];

    const rows = filteredBalances.map(b => [
      b.partCode,
      b.partName,
      b.materialGrade || '—',
      b.thicknessMm ? `${b.thicknessMm} mm` : '—',
      b.warehouseName,
      b.locationCode,
      b.lotNumber || '—',
      b.heatNumber || '—',
      b.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'مالکیت شرکتی',
      b.physicalQty,
      b.availableQty,
      b.reservedQty,
      b.qualityBlockedQty,
      b.unit,
      b.physicalKg,
      b.availableKg,
      formatDateTime(b.lastTransactionAt),
    ]);

    exportToCsv(`استعلام_موجودی_کاردکس_${Date.now()}`, headers, rows);
  };

  const handleSort = (field: keyof DetailedStockBalance) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            استعلام چندبعدی کاردکس و موجودی انبارها (Stock Inquiry)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تفکیک موجودی فیزیکی، آزاد، رزرو و قرنطینه به همراه ردیابی رول‌های امانی ساپکو و پلاک ذوب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Micro-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">موجودی فیزیکی کل (این نما)</span>
          <div className="text-base lg:text-lg font-bold text-white mt-1 font-mono">
            {formatWeightKg(totalPhysicalKg)}
          </div>
        </div>
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">موجودی آزاد و قابل استفاده</span>
          <div className="text-base lg:text-lg font-bold text-emerald-400 mt-1 font-mono">
            {formatWeightKg(totalAvailableKg)}
          </div>
        </div>
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">ورق امانی ساپکو</span>
          <div className="text-base lg:text-lg font-bold text-amber-400 mt-1 font-mono">
            {formatWeightKg(totalSapcoKg)}
          </div>
        </div>
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px] text-slate-400">رزرو شده جهت خطوط تولید</span>
          <div className="text-base lg:text-lg font-bold text-purple-400 mt-1 font-mono">
            {formatWeightKg(totalReservedKg)}
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی قطعه، کلاف، ذوب..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Part Filter */}
          <select
            value={selectedPartFilter}
            onChange={e => setSelectedPartFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه قطعات و مواد</option>
            {parts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Warehouse Filter */}
          <select
            value={selectedWarehouseFilter}
            onChange={e => setSelectedWarehouseFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه انبارها</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Ownership Filter */}
          <select
            value={selectedOwnershipFilter}
            onChange={e => setSelectedOwnershipFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه مالکیت‌ها</option>
            <option value="SAPCO_SUPPLIER_OWNED">فقط امانی ساپکو</option>
            <option value="COMPANY_OWNED">فقط مالکیت کارخانه</option>
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGradeFilter}
            onChange={e => setSelectedGradeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه گریدهای فولاد</option>
            {grades.map(g => (
              <option key={g} value={g}>
                گرید {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={e => setOnlyAvailable(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>فقط رکوردهای دارای موجودی آزاد (&gt; 0)</span>
          </label>

          <div className="text-xs text-slate-400">
            تعداد ردیف‌های منطبق: <span className="font-bold text-white">{formatNumber(filteredBalances.length)}</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 font-semibold select-none">
                <th className="py-3 px-3">کد قطعه</th>
                <th className="py-3 px-3">عنوان قطعه / ورق</th>
                <th className="py-3 px-3">انبار و جایگاه</th>
                <th className="py-3 px-3">شماره کلاف / ذوب</th>
                <th className="py-3 px-3">نوع مالکیت</th>
                <th
                  onClick={() => handleSort('physicalQty')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>موجودی فیزیکی</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('availableQty')}
                  className="py-3 px-3 cursor-pointer hover:text-white text-emerald-400"
                >
                  <div className="flex items-center gap-1">
                    <span>موجودی آزاد</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-purple-400">رزرو شده</th>
                <th className="py-3 px-3 text-rose-400">بلوکه کیفی</th>
                <th className="py-3 px-3">واحد</th>
                <th
                  onClick={() => handleSort('physicalKg')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>وزن کل (kg)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">آخرین گردش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    هیچ موجودی منطبق با شرایط جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredBalances.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {item.partCode}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">
                      <div>{item.partName}</div>
                      {item.materialGrade && (
                        <div className="text-[10px] text-slate-400">
                          گرید {item.materialGrade} {item.thicknessMm ? `| ضخامت ${item.thicknessMm}mm` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.warehouseName}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{item.locationCode}</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {item.lotNumber ? (
                        <div>
                          <div className="text-slate-200 font-semibold">{item.lotNumber}</div>
                          {item.heatNumber && (
                            <div className="text-[10px] text-slate-400">ذوب: {item.heatNumber}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.ownership === 'SAPCO_SUPPLIER_OWNED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          امانی ساپکو
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          شرکتی
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-white font-mono">
                      {formatNumber(item.physicalQty)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400 font-mono">
                      {formatNumber(item.availableQty)}
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-300">
                      {item.reservedQty > 0 ? formatNumber(item.reservedQty) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-300">
                      {item.qualityBlockedQty > 0 ? formatNumber(item.qualityBlockedQty) : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">{item.unit}</td>
                    <td className="py-3 px-3 font-bold text-slate-200 font-mono">
                      {formatWeightKg(item.physicalKg)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                      {formatDateTime(item.lastTransactionAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
