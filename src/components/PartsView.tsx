import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Download,
  Filter,
  Car,
  Scale,
  FileCode,
  ShieldAlert,
  X,
  Check,
  Pin,
} from 'lucide-react';
import { Part, PartCategory, UnitOfMeasure, CarModel } from '../types/inventory';
import { formatNumber, formatWeightKg, exportToCsv, toPersianDigits } from '../utils/formatters';
import { SearchableSelect } from './common/SearchableSelect';

interface PartsViewProps {
  parts: Part[];
  onSavePart: (part: Partial<Part>) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const PartsView: React.FC<PartsViewProps> = ({ parts, onSavePart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [carModelFilter, setCarModelFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Partial<Part> | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Part>>({
    code: '',
    name: '',
    category: 'WIP_PART',
    unit: 'PCS',
    weightPerUnitKg: 1,
    sapcoCode: '',
    carModel: '',
    thicknessMm: 1.2,
    materialGrade: 'ST14',
    minStock: 100,
    maxStock: 2000,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [carModelsList, setCarModelsList] = useState<CarModel[]>([]);

  useEffect(() => {
    fetch('/api/car-models')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) setCarModelsList(d.data);
      })
      .catch(() => {});
  }, []);

  // Extract unique car models for filter combining API models & parts
  const carModels = useMemo(() => {
    const set = new Set<string>();
    carModelsList.forEach(c => set.add(c.name));
    parts.forEach(p => {
      if (p.carModel) set.add(p.carModel);
    });
    return Array.from(set);
  }, [parts, carModelsList]);

  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      if (categoryFilter === 'PINNED' && !p.isPinned) return false;
      if (categoryFilter !== 'ALL' && categoryFilter !== 'PINNED' && p.category !== categoryFilter) return false;
      if (carModelFilter !== 'ALL' && p.carModel !== carModelFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesSapco = p.sapcoCode?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesCode && !matchesSapco) return false;
      }
      return true;
    });
  }, [parts, searchTerm, categoryFilter, carModelFilter]);

  const handleOpenNewModal = () => {
    setEditingPart(null);
    setFormData({
      code: '',
      name: '',
      category: 'WIP_PART',
      unit: 'PCS',
      weightPerUnitKg: 1,
      sapcoCode: '',
      carModel: '',
      thicknessMm: 1.2,
      materialGrade: 'ST14',
      minStock: 100,
      maxStock: 2000,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEditPart = (p: Part) => {
    setEditingPart(p);
    setFormData({ ...p });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.code || !formData.name) {
      setFormError('کد قطعه و عنوان قطعه الزامی هستند.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await onSavePart(formData);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.error || 'خطا در ثبت مشخصات قطعه');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای سرور');
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'کد قطعه',
      'عنوان فارسی قطعه',
      'دسته‌بندی',
      'واحد اندازه‌گیری',
      'وزن واحد (کیلوگرم)',
      'کد ساپکو / ایران‌خودرو',
      'مدل خودرو',
      'ضخامت ورق (mm)',
      'گرید فولاد',
      'حداقل موجودی اطمینان',
      'حداکثر ظرفیت',
    ];

    const categoryFa: Record<PartCategory, string> = {
      RAW_MATERIAL: 'ماده اولیه (کویل/ورق)',
      WIP_PART: 'قطعه نیمه‌ساخته (WIP)',
      FINISHED_GOOD: 'محصول نهایی آماده تحویل',
    };

    const rows = filteredParts.map(p => [
      p.code,
      p.name,
      categoryFa[p.category],
      p.unit,
      p.weightPerUnitKg,
      p.sapcoCode || '',
      p.carModel || '',
      p.thicknessMm || '',
      p.materialGrade || '',
      p.minStock || 0,
      p.maxStock || 0,
    ]);

    exportToCsv(`کاتالوگ_قطعات_خودرو_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              کاتالوگ جامع قطعات و مواد اولیه ({toPersianDigits(parts.length)} قطعه فعال)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            اطلاعات پایه قطعات بدنه و سازه خودرو (پژو ۲۰۶، تارا، دنا پلاس، شاهین، کوییک)، مشخصات فنی ساپکو و وزن مرجع
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-medium border border-slate-200 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل (CSV)</span>
          </button>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف قطعه جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام قطعه، کد کاتالوگ یا کد ساپکو..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="ALL">همه دسته‌بندی‌ها</option>
            <option value="PINNED">📌 قطعات کلیدی نشانه‌گذاری‌شده (VIP)</option>
            <option value="RAW_MATERIAL">مواد اولیه (ورق و کویل ساپکو)</option>
            <option value="WIP_PART">قطعات نیمه‌ساخته (WIP)</option>
            <option value="FINISHED_GOOD">محصولات نهایی آماده تحویل</option>
          </select>

          {/* Car Model Filter */}
          <select
            value={carModelFilter}
            onChange={e => setCarModelFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="ALL">همه خودروها</option>
            {carModels.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          تعداد: <span className="font-bold text-slate-900">{formatNumber(filteredParts.length)}</span> قطعه
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 font-semibold">
                <th className="py-3 px-2 w-8 text-center">📌</th>
                <th className="py-3 px-3">کد کاتالوگ</th>
                <th className="py-3 px-3">عنوان قطعه / ماده اولیه</th>
                <th className="py-3 px-3">دسته‌بندی</th>
                <th className="py-3 px-3">مدل خودرو</th>
                <th className="py-3 px-3">کد ساپکو</th>
                <th className="py-3 px-3">وزن واحد (kg)</th>
                <th className="py-3 px-3">ضخامت (mm)</th>
                <th className="py-3 px-3">گرید فولاد</th>
                <th className="py-3 px-3">واحد پایه</th>
                <th className="py-3 px-3">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map(p => {
                const isRaw = p.category === 'RAW_MATERIAL';
                const isFinished = p.category === 'FINISHED_GOOD';
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      p.isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-100'
                    }`}
                  >
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onSavePart({ id: p.id, isPinned: !p.isPinned })}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          p.isPinned ? 'text-amber-600 hover:text-amber-800' : 'text-slate-300 hover:text-slate-600'
                        }`}
                        title={p.isPinned ? 'حذف نشانه‌گذاری قطعه' : 'نشانه‌گذاری قطعه کلیدی (VIP)'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${p.isPinned ? 'fill-amber-500' : ''}`} />
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{p.code}</td>
                    <td className="py-3 px-3 text-slate-900 font-medium max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isPinned && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                            VIP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isRaw
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : isFinished
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        {isRaw ? 'ماده اولیه' : isFinished ? 'محصول نهایی' : 'نیمه‌ساخته WIP'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-slate-500" />
                        <span>{p.carModel || 'مشترک'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{p.sapcoCode || '-'}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-mono">{p.weightPerUnitKg}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{p.thicknessMm ? `${p.thicknessMm} mm` : '-'}</td>
                    <td className="py-3 px-3 font-mono text-indigo-700">{p.materialGrade || '-'}</td>
                    <td className="py-3 px-3 text-slate-400">{p.unit}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleEditPart(p)}
                        className="text-xs text-blue-400 hover:text-blue-700 font-medium transition-colors"
                      >
                        ویرایش
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit Part */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPart ? 'ویرایش مشخصات قطعه' : 'تعریف قطعه / ماده اولیه جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">کد کاتالوگ قطعه *</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: IKCO-206-BRK05"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">دسته‌بندی *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="RAW_MATERIAL">ماده اولیه (کویل/ورق ساپکو)</option>
                    <option value="WIP_PART">قطعه نیمه‌ساخته (WIP)</option>
                    <option value="FINISHED_GOOD">محصول نهایی آماده تحویل</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">عنوان کامل قطعه در خط تولید *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: براکت تقویتی ستون وسط تارا با پوشش کاتافورز"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">واحد اندازه‌گیری *</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="PCS">عدد (PCS)</option>
                    <option value="KG">کیلوگرم (KG)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">وزن واحد (کیلوگرم) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.weightPerUnitKg || 1}
                    onChange={e => setFormData({ ...formData, weightPerUnitKg: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">ضخامت ورق (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.thicknessMm || ''}
                    onChange={e => setFormData({ ...formData, thicknessMm: parseFloat(e.target.value) || undefined })}
                    placeholder="مثلاً: 1.5"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">گرید فولاد</label>
                  <input
                    type="text"
                    value={formData.materialGrade || ''}
                    onChange={e => setFormData({ ...formData, materialGrade: e.target.value })}
                    placeholder="ST14, DC04, DX51D"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">مدل خودرو / خانواده محصول</label>
                  <SearchableSelect
                    value={formData.carModel || ''}
                    onChange={val => setFormData({ ...formData, carModel: val })}
                    placeholder="انتخاب مدل خودرو..."
                    searchPlaceholder="جستجوی مدل خودرو (۲۰۶، تارا، دنا...)"
                    options={[
                      { value: 'مشترک', label: 'مشترک بین چند خودرو' },
                      ...carModelsList.map(c => ({
                        value: c.name,
                        label: c.name,
                        sublabel: c.oem,
                        badge: c.code,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">کد ساپکو / OEM</label>
                  <input
                    type="text"
                    value={formData.sapcoCode || ''}
                    onChange={e => setFormData({ ...formData, sapcoCode: e.target.value })}
                    placeholder="SAP-88102"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-900/30"
                >
                  {formLoading ? 'در حال ذخیره...' : 'ذخیره در کاتالوگ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
