import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Scale,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Building2,
} from 'lucide-react';
import { SapcoCoilReceipt, Part } from '../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits, exportToCsv } from '../utils/formatters';
import { formatToJalali } from '../utils/jalali';
import { InventoryModuleSkeleton } from './ui/Skeleton';

interface SapcoMaterialsViewProps {
  coils: SapcoCoilReceipt[];
  parts: Part[];
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const SapcoMaterialsView: React.FC<SapcoMaterialsViewProps> = ({
  coils,
  parts,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [receiptNumber, setReceiptNumber] = useState('');
  const [coilNumber, setCoilNumber] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [materialGrade, setMaterialGrade] = useState('DC04');
  const [thicknessMm, setThicknessMm] = useState<number>(0.8);
  const [widthMm, setWidthMm] = useState<number>(1250);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(12000);
  const [heatNumber, setHeatNumber] = useState('');

  if (loading && coils.length === 0) {
    return <InventoryModuleSkeleton />;
  }

  const rawParts = parts.filter(p => p.category === 'RAW_MATERIAL');

  const filteredCoils = coils.filter(c => {
    if (gradeFilter !== 'ALL' && c.materialGrade !== gradeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.coilNumber.toLowerCase().includes(q) ||
        c.receiptNumber.toLowerCase().includes(q) ||
        c.partName.toLowerCase().includes(q) ||
        (c.heatNumber && c.heatNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalReceivedKg = coils.reduce((acc, c) => acc + c.receivedWeightKg, 0);
  const totalConsumedKg = coils.reduce((acc, c) => acc + c.consumedWeightKg, 0);
  const remainingKg = totalReceivedKg - totalConsumedKg;

  const handleCreateCoil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber || !coilNumber || !selectedPartId || receivedWeightKg <= 0) {
      setErrorMsg('لطفاً شماره رسید، شماره کویل، پارت مرتبط و وزن را وارد کنید.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sapco/coils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber,
          coilNumber,
          partId: selectedPartId,
          materialGrade,
          thicknessMm: Number(thicknessMm),
          widthMm: Number(widthMm),
          receivedWeightKg: Number(receivedWeightKg),
          heatNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت کلاف ساپکو');
      }

      setShowModal(false);
      setReceiptNumber('');
      setCoilNumber('');
      setHeatNumber('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'شماره رسید ساپکو',
      'شماره کویل',
      'عنوان ورق',
      'گرید آلیاژ',
      'ضخامت (mm)',
      'عرض (mm)',
      'وزن ورودی (kg)',
      'مصرف شده (kg)',
      'مانده (kg)',
      'شماره ذوب',
      'وضعیت',
    ];
    const rows = filteredCoils.map(c => [
      c.receiptNumber,
      c.coilNumber,
      c.partName,
      c.materialGrade,
      c.thicknessMm,
      c.widthMm,
      c.receivedWeightKg,
      c.consumedWeightKg,
      c.receivedWeightKg - c.consumedWeightKg,
      c.heatNumber || '—',
      c.status === 'IN_STOCK' ? 'موجود در انبار' : 'در حال برش',
    ]);
    exportToCsv(`گزارش_سهمیه_کلاف_های_ساپکو_${Date.now()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">مدیریت مواد اولیه، رول‌ها و سهمیه ساپکو</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            رهگیری کلاف‌های فولاد مبارکه و ساپکو، شماره پارت، گرید آلیاژ، آنالیز ذوب و مانده سهمیه به کیلوگرم
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>خروجی CSV</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت رسید کلاف ساپکو</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>تعداد کلاف‌های فعال</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(coils.length)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">رول ورق</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>مجموع وزن ورودی</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatWeightKg(totalReceivedKg)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>مصرف شده در برشکاری</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {formatWeightKg(totalConsumedKg)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>مانده سهمیه موجود در انبار</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatWeightKg(remainingKg)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی شماره کویل، شماره رسید یا ذوب..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'DC04', 'ST14', 'DX51D', 'ST37'].map(grade => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
                gradeFilter === grade
                  ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {grade === 'ALL' ? 'همه گریدها' : `گرید ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {/* Coils Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3.5">شماره رسید ساپکو</th>
                <th className="p-3.5">شماره سریال کویل</th>
                <th className="p-3.5">عنوان ورق و قطعه</th>
                <th className="p-3.5">گرید آلیاژ</th>
                <th className="p-3.5">ضخامت × عرض (mm)</th>
                <th className="p-3.5">وزن دریافتی</th>
                <th className="p-3.5">مصرف شده</th>
                <th className="p-3.5">مانده خالص</th>
                <th className="p-3.5">شماره ذوب</th>
                <th className="p-3.5">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCoils.map(coil => {
                const rem = coil.receivedWeightKg - coil.consumedWeightKg;
                const remPercent = Math.round((rem / coil.receivedWeightKg) * 100);
                return (
                  <tr key={coil.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-orange-700 font-bold">{coil.receiptNumber}</td>
                    <td className="p-3.5 font-mono text-slate-900 font-bold">{coil.coilNumber}</td>
                    <td className="p-3.5 font-medium text-slate-800">{coil.partName}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px] font-semibold">
                        {coil.materialGrade}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">
                      {toPersianDigits(coil.thicknessMm)} × {toPersianDigits(coil.widthMm)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{formatWeightKg(coil.receivedWeightKg)}</td>
                    <td className="p-3.5 text-rose-600 font-semibold">{formatWeightKg(coil.consumedWeightKg)}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-700">{formatWeightKg(rem)}</span>
                        <span className="text-[10px] text-slate-500">({toPersianDigits(remPercent)}٪)</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{coil.heatNumber || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          coil.status === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {coil.status === 'IN_STOCK' ? 'موجود در انبار' : 'در حال برش'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Coil Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">ثبت رسید ورود کلاف ساپکو</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCoil} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">شماره رسید حواله ساپکو</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: SAP-RC-98520"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">شماره سریال کویل فولاد مبارکه</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: MOB-2024-DC04-912"
                    value={coilNumber}
                    onChange={e => setCoilNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-700 font-medium mb-1">ماده اولیه مرتبط در کاتالوگ</label>
                <select
                  required
                  value={selectedPartId}
                  onChange={e => setSelectedPartId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- انتخاب ورق / ماده اولیه --</option>
                  {rawParts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">گرید آلیاژ</label>
                  <select
                    value={materialGrade}
                    onChange={e => setMaterialGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="DC04">DC04 (کشش عمیق)</option>
                    <option value="ST14">ST14 (نورد سرد)</option>
                    <option value="ST12">ST12 (کشش معمولی)</option>
                    <option value="DX51D">DX51D (گالوانیزه)</option>
                    <option value="ST37">ST37 (ساختمانی/شاسی)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">ضخامت (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0.1}
                    value={thicknessMm}
                    onChange={e => setThicknessMm(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">عرض کویل (mm)</label>
                  <input
                    type="number"
                    min={100}
                    value={widthMm}
                    onChange={e => setWidthMm(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">وزن دریافتی (کیلوگرم)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={receivedWeightKg}
                    onChange={e => setReceivedWeightKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">شماره ذوب (Heat No)</label>
                  <input
                    type="text"
                    placeholder="مثال: HT-99412"
                    value={heatNumber}
                    onChange={e => setHeatNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                توجه: با ثبت این فرم، سند رسمی رسید انبار مواد اولیه در کاردکس ثبت شده و موجودی کیلوگرم انبار به صورت آنی افزایش می‌یابد.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  {submitting ? 'در حال ثبت رسید...' : 'ثبت قطعی رسید کویل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
