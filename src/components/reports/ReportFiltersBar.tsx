import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  Building2,
  Cpu,
  Search,
} from 'lucide-react';
import { ReportFilterParams } from '../../types/managementReports';
import { Part, Machine, ProcessType } from '../../types/inventory';

interface ReportFiltersBarProps {
  parts: Part[];
  machines: Machine[];
  filters: ReportFilterParams;
  onFilterChange: (filters: ReportFilterParams) => void;
  onExportCsv: () => void;
  isExporting?: boolean;
}

export const ReportFiltersBar: React.FC<ReportFiltersBarProps> = ({
  parts,
  machines,
  filters,
  onFilterChange,
  onExportCsv,
  isExporting = false,
}) => {
  const [localFilters, setLocalFilters] = useState<ReportFilterParams>(filters);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: ReportFilterParams = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <form
      onSubmit={handleApply}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>فیلترهای گزارش مدیریتی</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>پاک‌سازی</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* Date Range: Start Date */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">از تاریخ:</label>
          <input
            type="date"
            value={localFilters.startDate || ''}
            onChange={e => setLocalFilters({ ...localFilters, startDate: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Date Range: End Date */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">تا تاریخ:</label>
          <input
            type="date"
            value={localFilters.endDate || ''}
            onChange={e => setLocalFilters({ ...localFilters, endDate: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Part Filter */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">قطعه خودرو:</label>
          <select
            value={localFilters.partId || ''}
            onChange={e => setLocalFilters({ ...localFilters, partId: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">همه قطعات</option>
            {parts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Customer Filter */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">مشتری / خودروساز:</label>
          <select
            value={localFilters.customerName || ''}
            onChange={e => setLocalFilters({ ...localFilters, customerName: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">همه مشتریان</option>
            <option value="ساپکو">ساپکو (ایران‌خودرو)</option>
            <option value="سایپا">سایپا / سازه‌گستر</option>
            <option value="مگاموتور">مگاموتور</option>
          </select>
        </div>

        {/* Machine Filter */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">دستگاه پرس / تجهیز:</label>
          <select
            value={localFilters.machineId || ''}
            onChange={e => setLocalFilters({ ...localFilters, machineId: e.target.value || undefined })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">همه دستگاه‌ها</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
        >
          اعمال فیلترها
        </button>
      </div>
    </form>
  );
};
