import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  ClipboardCheck,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  PackageCheck,
  ShieldAlert,
  Boxes,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Lock,
} from 'lucide-react';
import {
  MrpRunResult,
  MrpMaterialRow,
  MrpPartRow,
  MoMaterialCheckResult,
} from '../../types/mrp';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface MrpModuleViewProps {
  onRefreshGlobal?: () => Promise<void>;
}

export const MrpModuleView: React.FC<MrpModuleViewProps> = ({ onRefreshGlobal }) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'pre_issue' | 'parts' | 'simulation'>('materials');
  const [mrpData, setMrpData] = useState<MrpRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters for materials table
  const [materialSearch, setMaterialSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'HARD_SHORTAGE' | 'SHORTAGE_COVERED_BY_CONTRACT' | 'OK'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Pre-Issue Check State
  const [moList, setMoList] = useState<{ id: string; moNumber: string; partCode: string; partName: string; targetQuantity: number; status: string }[]>([]);
  const [selectedMoId, setSelectedMoId] = useState<string>('');
  const [moCheckResult, setMoCheckResult] = useState<MoMaterialCheckResult | null>(null);
  const [checkingMo, setCheckingMo] = useState(false);
  const [reservingMo, setReservingMo] = useState(false);

  // Simulation Parameters
  const [simGrowth, setSimGrowth] = useState<number>(0);
  const [simHorizon, setSimHorizon] = useState<number>(30);
  const [simIncludeWip, setSimIncludeWip] = useState<boolean>(true);
  const [simIncludeConsignment, setSimIncludeConsignment] = useState<boolean>(true);
  const [simulating, setSimulating] = useState(false);

  // Detail Modal / Popover for parts demanded
  const [expandedMaterialCode, setExpandedMaterialCode] = useState<string | null>(null);

  const loadMrp = useCallback(async (params?: { growth?: number; horizon?: number; includeWip?: boolean; includeConsignment?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (params?.growth !== undefined) q.append('growth', String(params.growth));
      if (params?.horizon !== undefined) q.append('horizonDays', String(params.horizon));
      if (params?.includeWip !== undefined) q.append('includeWip', String(params.includeWip));
      if (params?.includeConsignment !== undefined) q.append('includeConsignment', String(params.includeConsignment));

      const res = await fetch(`/api/mrp/run?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMrpData(json.data);
      } else {
        setError(json.error || 'خطا در بارگذاری محاسبات MRP');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoList = useCallback(async () => {
    try {
      const res = await fetch('/api/mrp/mos');
      const json = await res.json();
      if (json.success && json.data) {
        setMoList(json.data);
        if (json.data.length > 0 && !selectedMoId) {
          setSelectedMoId(json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedMoId]);

  useEffect(() => {
    loadMrp();
    loadMoList();
  }, [loadMrp, loadMoList]);

  // Run Pre-issue check when selected MO changes
  const runMoCheck = async (moIdToTest?: string) => {
    const targetId = moIdToTest || selectedMoId;
    if (!targetId) return;
    setCheckingMo(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/mrp/mos/${encodeURIComponent(targetId)}/check`);
      const json = await res.json();
      if (json.success && json.data) {
        setMoCheckResult(json.data);
      } else {
        setError(json.error || 'خطا در بررسی مواد دستور کار');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در بررسی مواد');
    } finally {
      setCheckingMo(false);
    }
  };

  useEffect(() => {
    if (selectedMoId && activeTab === 'pre_issue') {
      runMoCheck(selectedMoId);
    }
  }, [selectedMoId, activeTab]);

  const handleAutoReserve = async () => {
    if (!selectedMoId) return;
    setReservingMo(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/mrp/mos/${encodeURIComponent(selectedMoId)}/reserve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        const count = json.data?.reserved?.length || 0;
        setNotice(`موجودی آزاد با موفقیت برای دستور کار ${json.data?.moNumber} رزرو شد (${toPersianDigits(count)} ردیف رزرو جدید).`);
        await runMoCheck(selectedMoId);
        await loadMrp();
        if (onRefreshGlobal) await onRefreshGlobal();
      } else {
        setError(json.error || 'خطا در رزرو خودکار مواد');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در انجام عملیات رزرو');
    } finally {
      setReservingMo(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setError(null);
    try {
      await loadMrp({
        growth: simGrowth,
        horizon: simHorizon,
        includeWip: simIncludeWip,
        includeConsignment: simIncludeConsignment,
      });
      setActiveTab('materials');
    } finally {
      setSimulating(false);
    }
  };

  const handleExportCsv = () => {
    if (!mrpData) return;
    const headers = [
      'کد ماده اولیه',
      'عنوان ماده',
      'گرید',
      'ضخامت (mm)',
      'واحد',
      'نیاز کل ناخالص',
      'نیاز وزنی (kg)',
      'موجودی ملکی',
      'موجودی امانی ساپکو',
      'قرنطینه کیفی',
      'رزرو فعال',
      'موجودی خالص آزاد (ATP)',
      'قرارداد باز ساپکو',
      'کسری کل',
      'پوشش با قرارداد',
      'کسری قطعی',
      'وضعیت نهایی',
    ];

    const rows = mrpData.materials.map(m => [
      m.materialCode,
      `"${m.materialName.replace(/"/g, '""')}"`,
      m.materialGrade,
      m.thicknessMm,
      m.unitCode,
      m.requiredQuantity,
      m.requiredWeightKg,
      m.onHandOwned,
      m.onHandConsignment,
      m.onHandQuarantined,
      m.reservedActive,
      m.netAvailable,
      m.openContractQuantity,
      m.shortageQuantity,
      m.coveredByContract,
      m.hardShortageQuantity,
      m.severity === 'OK' ? 'پوشش کامل' : m.severity === 'SHORTAGE_COVERED_BY_CONTRACT' ? 'پوشش با قرارداد' : 'کسری قطعی',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRP_Material_Forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered materials
  const filteredMaterials = (mrpData?.materials || []).filter(m => {
    if (severityFilter !== 'ALL' && m.severity !== severityFilter) return false;
    if (gradeFilter !== 'ALL' && !m.materialGrade.toLowerCase().includes(gradeFilter.toLowerCase())) return false;
    if (materialSearch.trim()) {
      const q = materialSearch.toLowerCase();
      const matchCode = m.materialCode.toLowerCase().includes(q);
      const matchName = m.materialName.toLowerCase().includes(q);
      const matchGrade = m.materialGrade.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchGrade) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                پیش‌بینی نیازمندی مواد و موازنه کلاف (MRP)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phases 8 & 9
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                انفجار درخت محصول (BOM)، کسر موجودی آزاد ملکی و امانی ساپکو، حذف قرنطینه و پیش‌بینی پوشش قراردادها
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {mrpData && (
            <div className="text-[11px] text-slate-400 font-mono hidden lg:flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>آخرین محاسبه:</span>
              <span className="text-slate-200 font-bold">{mrpData.ranAtFa}</span>
            </div>
          )}

          <button
            onClick={() => loadMrp()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>محاسبه مجدد</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!mrpData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ رسمی</span>
          </button>
        </div>
      </div>

      {/* Error & Notice Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs cursor-pointer">بستن</button>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer">بستن</button>
        </div>
      )}

      {/* KPI Cards Summary */}
      {mrpData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-slate-400 block font-sans">تعداد مواد و کلاف‌ها</span>
            <div className="text-xl font-black text-slate-100 font-mono mt-1">
              {toPersianDigits(mrpData.summary.materialsConsidered)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">اقلام فعال در BOM</span>
          </div>

          <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-emerald-400 block font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              پوشش کامل با موجودی
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {toPersianDigits(mrpData.summary.ok)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">تأمین تضمین‌شده</span>
          </div>

          <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-amber-400 block font-sans flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              پوشش با قرارداد باز
            </span>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              {toPersianDigits(mrpData.summary.contractCovered)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">در انتظار تحویل سهمیه</span>
          </div>

          <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-rose-400 block font-sans flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              کسری قطعی مواد
            </span>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {toPersianDigits(mrpData.summary.hardShortages)}
            </div>
            <span className="text-[10px] text-rose-400/80 mt-1 block font-bold">هشدار توقف پرس</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-slate-400 block font-sans">کل وزن ناخالص مواد</span>
            <div className="text-lg font-black text-slate-200 font-mono mt-1">
              {formatNumber(mrpData.summary.totalGrossWeightKg)} <span className="text-xs font-normal text-slate-400">kg</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">شامل نرم ضایعات</span>
          </div>

          <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-rose-400 block font-sans">کسری وزنی کل کلاف‌ها</span>
            <div className="text-lg font-black text-rose-400 font-mono mt-1">
              {formatNumber(mrpData.summary.totalShortageWeightKg)} <span className="text-xs font-normal text-rose-400/70">kg</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">نیاز به خرید / حواله</span>
          </div>
        </div>
      )}

      {/* Main Navigation Subtabs */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'materials'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>موازنه و کسری مواد اولیه و کلاف‌ها</span>
          {mrpData && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {toPersianDigits(mrpData.materials.length)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pre_issue')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'pre_issue'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>بررسی پیش از حواله دستور کار (Pre-Issue)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
            ATP
          </span>
        </button>

        <button
          onClick={() => setActiveTab('parts')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'parts'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>موازنه تقاضای قطعات خودرویی</span>
          {mrpData && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {toPersianDigits(mrpData.parts.length)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'simulation'
              ? 'border-purple-500 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>شبیه‌ساز سناریوی تقاضا (What-If)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MATERIALS NETTING MATRIX
          ========================================================================= */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در کد، نام کلاف یا گرید..."
                  value={materialSearch}
                  onChange={e => setMaterialSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">همه گریدها</option>
                <option value="DC04">DC04 (کشش عمیق)</option>
                <option value="ST14">ST14 (روغنی فرم‌دهی)</option>
                <option value="DX51">DX51D (گالوانیزه)</option>
                <option value="ST37">ST37 (شیت سیاه)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-400 font-sans ml-1">فیلتر وضعیت:</span>
              <button
                onClick={() => setSeverityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                  severityFilter === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                همه ({toPersianDigits(mrpData?.materials.length || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('HARD_SHORTAGE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'HARD_SHORTAGE'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-slate-950 text-rose-400 hover:bg-rose-950/40 border border-rose-900/40'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                کسری قطعی ({toPersianDigits(mrpData?.summary.hardShortages || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('SHORTAGE_COVERED_BY_CONTRACT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'SHORTAGE_COVERED_BY_CONTRACT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-amber-400 hover:bg-amber-950/40 border border-amber-900/40'
                }`}
              >
                <Info className="w-3 h-3" />
                پوشش با قرارداد ({toPersianDigits(mrpData?.summary.contractCovered || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('OK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'OK'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/40'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                کافی ({toPersianDigits(mrpData?.summary.ok || 0)})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-3">کد و عنوان ماده اولیه</th>
                    <th className="py-3 px-3 text-center">گرید و ضخامت</th>
                    <th className="py-3 px-3 text-center text-indigo-400 font-bold">نیاز کل (kg)</th>
                    <th className="py-3 px-3 text-center text-slate-300">موجودی ملکی</th>
                    <th className="py-3 px-3 text-center text-emerald-400">امانی ساپکو</th>
                    <th className="py-3 px-3 text-center text-rose-400/80">قرنطینه</th>
                    <th className="py-3 px-3 text-center text-amber-400">رزرو فعال</th>
                    <th className="py-3 px-3 text-center text-emerald-300 font-bold">موجودی آزاد (ATP)</th>
                    <th className="py-3 px-3 text-center text-indigo-300">قرارداد باز</th>
                    <th className="py-3 px-3 text-center text-rose-400 font-black">کسری قطعی</th>
                    <th className="py-3 px-3 text-center">وضعیت تأمین</th>
                    <th className="py-3 px-3 text-center">قطعات متقاضی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredMaterials.map(m => {
                    const isExpanded = expandedMaterialCode === m.materialCode;
                    return (
                      <React.Fragment key={m.materialId}>
                        <tr className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-sans">
                            <div className="font-bold text-slate-200">{m.materialName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{m.materialCode}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[11px]">
                              {m.materialGrade}
                            </span>
                            {m.thicknessMm > 0 && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                {toPersianDigits(m.thicknessMm)} mm
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-indigo-400 font-bold text-sm">
                            {formatNumber(m.requiredWeightKg)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-300">
                            {formatNumber(m.onHandOwned)}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                            {formatNumber(m.onHandConsignment)}
                          </td>
                          <td className="py-3 px-3 text-center text-rose-400/80">
                            {m.onHandQuarantined > 0 ? (
                              <span className="text-rose-400 font-bold underline" title="خارج از چرخه تخصیص">
                                {formatNumber(m.onHandQuarantined)}
                              </span>
                            ) : (
                              '۰'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-amber-400">
                            {formatNumber(m.reservedActive)}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-300 font-bold text-sm bg-emerald-950/20">
                            {formatNumber(m.netAvailable)}
                          </td>
                          <td className="py-3 px-3 text-center text-indigo-300">
                            {formatNumber(m.openContractQuantity)}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm">
                            {m.hardShortageQuantity > 0 ? (
                              <span className="text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                {formatNumber(m.hardShortageQuantity)}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            {m.severity === 'OK' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                پوشش کامل
                              </span>
                            )}
                            {m.severity === 'SHORTAGE_COVERED_BY_CONTRACT' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                پوشش قرارداد
                              </span>
                            )}
                            {m.severity === 'HARD_SHORTAGE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                کسری قطعی
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setExpandedMaterialCode(isExpanded ? null : m.materialCode)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <span>{toPersianDigits(m.demandedByParts.length)} قطعه</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Drawer for Demanded Parts & Matching Coils */}
                        {isExpanded && (
                          <tr className="bg-slate-950/70 border-b border-slate-800 font-sans">
                            <td colSpan={12} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* Demanded by Parts */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                  <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                                    <Boxes className="w-4 h-4 text-indigo-400" />
                                    قطعات متقاضی این متریال در برنامه:
                                  </h4>
                                  <div className="space-y-2">
                                    {m.demandedByParts.map((dp, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-300">{dp.partName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{dp.partCode}</div>
                                        </div>
                                        <div className="text-left font-mono">
                                          <div className="text-indigo-400 font-bold">
                                            {formatNumber(dp.weightKg)} <span className="text-[10px] font-sans text-slate-400">kg</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            ({formatNumber(dp.requiredQuantity)} عدد)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Physical Matching Coils in Plant */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                  <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-400" />
                                    کلاف‌ها و رول‌های فیزیکی منطبق پای پرس:
                                  </h4>
                                  {m.matchingCoils.length > 0 ? (
                                    <div className="space-y-2">
                                      {m.matchingCoils.map((c, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80"
                                        >
                                          <div>
                                            <div className="font-bold text-slate-300 font-mono">{c.coilNumber}</div>
                                            <div className="text-[10px] text-slate-500">
                                              {c.ownership === 'SAPCO_CONSIGNMENT' ? 'امانی ساپکو' : 'ملکی کارخانه'} • {c.warehouseLocation}
                                            </div>
                                          </div>
                                          <div className="text-left font-mono">
                                            <span className="text-emerald-400 font-bold text-sm">
                                              {formatNumber(c.remainingWeightKg)} kg
                                            </span>
                                            <span className="block text-[10px] text-slate-400">
                                              ضخامت {toPersianDigits(c.thicknessMm)}mm
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 text-[11px] p-3 text-center bg-slate-950 rounded-lg">
                                      هیچ رول فیزیکی با این مشخصات در انبار ثبت نشده است.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PRE-ISSUE CHECK & AUTO-RESERVE (بررسی پیش از حواله)
          ========================================================================= */}
      {activeTab === 'pre_issue' && (
        <div className="space-y-5">
          {/* MO Selector & ATP Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  انتخاب دستور کار ساخت (MO) جهت بررسی موجودی مواد پیش از صدور حواله:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMoId}
                    onChange={e => setSelectedMoId(e.target.value)}
                    className="flex-1 max-w-xl bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {moList.map(mo => (
                      <option key={mo.id} value={mo.id}>
                        {mo.moNumber} — {mo.partName} ({formatNumber(mo.targetQuantity)} عدد) [وضعیت: {mo.status}]
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => runMoCheck(selectedMoId)}
                    disabled={checkingMo}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingMo ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>بررسی در لحظه</span>
                  </button>
                </div>
              </div>

              {moCheckResult && (
                <div className="flex items-center gap-3">
                  <div className={`p-4 rounded-xl border ${
                    moCheckResult.readyToIssue
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {moCheckResult.readyToIssue ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>آماده صدور حواله خروج پای پرس</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-400" />
                          <span>دارای کسری مواد / عدم امکان حواله</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {moCheckResult.readyToIssue
                        ? 'کلیه ورق‌ها و قطعات این دستور کار در انبار آزاد و موجود است.'
                        : 'یک یا چند قلم متریال در انبار آزاد نبوده و نیازمند حواله یا تأمین است.'}
                    </p>
                  </div>

                  <button
                    onClick={handleAutoReserve}
                    disabled={reservingMo}
                    className="px-5 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      <span>رزرو خودکار موجودی آزاد (ATP)</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-normal">
                      قفل کردن مواد در انبار برای این دستور کار
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BOM Materials Availability Table */}
          {moCheckResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-200">
                    جدول موازنه اقلام BOM دستور کار {moCheckResult.moNumber} ({moCheckResult.partName})
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  تیراژ مصوب: {formatNumber(moCheckResult.targetQuantity)} عدد
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-3">کد و عنوان قطعه / ماده در BOM</th>
                      <th className="py-3 px-3 text-center">واحد</th>
                      <th className="py-3 px-3 text-center text-indigo-400">کل نیاز سفارش</th>
                      <th className="py-3 px-3 text-center text-slate-400">حواله شده قبلی</th>
                      <th className="py-3 px-3 text-center text-slate-200 font-bold">باقیمانده نیاز</th>
                      <th className="py-3 px-3 text-center text-slate-300">موجودی انبار</th>
                      <th className="py-3 px-3 text-center text-amber-400">رزرو همین MO</th>
                      <th className="py-3 px-3 text-center text-rose-400/80">رزرو سایر MOها</th>
                      <th className="py-3 px-3 text-center text-emerald-300 font-bold">آزاد برای این MO</th>
                      <th className="py-3 px-3 text-center text-rose-400 font-black">کسری</th>
                      <th className="py-3 px-3 text-center">وضعیت ردیف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {moCheckResult.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-slate-200">{l.materialName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{l.materialCode}</div>
                          {l.notes.length > 0 && (
                            <div className="text-[10px] text-slate-500 mt-0.5">{l.notes.join(' • ')}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">{l.unitCode}</td>
                        <td className="py-3 px-3 text-center text-indigo-400 font-bold">{formatNumber(l.requiredQuantity)}</td>
                        <td className="py-3 px-3 text-center text-slate-400">{formatNumber(l.alreadyIssuedQuantity)}</td>
                        <td className="py-3 px-3 text-center text-slate-200 font-bold">{formatNumber(l.remainingRequired)}</td>
                        <td className="py-3 px-3 text-center text-slate-300">{formatNumber(l.onHandApproved)}</td>
                        <td className="py-3 px-3 text-center text-amber-400 font-bold">{formatNumber(l.reservedForThisMo)}</td>
                        <td className="py-3 px-3 text-center text-rose-400/80">{formatNumber(l.reservedForOthers)}</td>
                        <td className="py-3 px-3 text-center text-emerald-300 font-bold text-sm bg-emerald-950/20">
                          {formatNumber(l.availableForThisMo)}
                        </td>
                        <td className="py-3 px-3 text-center font-black">
                          {l.shortageQuantity > 0 ? (
                            <span className="text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                              {formatNumber(l.shortageQuantity)}
                            </span>
                          ) : (
                            <span className="text-slate-500">۰</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {l.status === 'READY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              آماده حواله
                            </span>
                          )}
                          {l.status === 'SHORTAGE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              کسری موجودی
                            </span>
                          )}
                          {l.status === 'NOT_REQUIRED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              تأمین کامل شده
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: PARTS DEMAND NETTING (موازنه تقاضای قطعات)
          ========================================================================= */}
      {activeTab === 'parts' && mrpData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              موازنه تیراژ قطعات نهایی خودرویی (تقاضای باز مشتریان نسبت به موجودی و WIP)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {toPersianDigits(mrpData.parts.length)} محصول
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3">کد و نام قطعه خودرویی</th>
                  <th className="py-3 px-3">خودرو</th>
                  <th className="py-3 px-3 text-center text-indigo-400 font-bold">تقاضای ناخالص</th>
                  <th className="py-3 px-3 text-center text-emerald-400">موجودی محصول نهایی</th>
                  <th className="py-3 px-3 text-center text-amber-400">رزرو محصول</th>
                  <th className="py-3 px-3 text-center text-purple-400">کار در جریان (WIP)</th>
                  <th className="py-3 px-3 text-center text-blue-400">دستور کار باز (MO)</th>
                  <th className="py-3 px-3 text-center text-rose-400 font-black">نیاز خالص تولید</th>
                  <th className="py-3 px-3 text-center">وضعیت مستندات فنی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {mrpData.parts.map(p => (
                  <tr key={p.partId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{p.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.partCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">{p.carModel || '-'}</td>
                    <td className="py-3 px-3 text-center text-indigo-400 font-bold text-sm">
                      {formatNumber(p.grossDemand)}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                      {formatNumber(p.coveredByFgStock)}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-400">
                      {formatNumber(p.coveredByFgReservations)}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-400 font-bold">
                      {formatNumber(p.coveredByWip)}
                    </td>
                    <td className="py-3 px-3 text-center text-blue-400">
                      {formatNumber(p.coveredByActiveMos)}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-sm">
                      {p.netRequirement > 0 ? (
                        <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {formatNumber(p.netRequirement)}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">پوشش کامل (۰)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.hasBom
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {p.hasBom ? 'BOM تأییدشده' : 'فاقد BOM'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.hasRouting
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.hasRouting ? 'مسیر ساخت' : 'فاقد مسیر'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DEMAND SIMULATION (شبیه‌ساز سناریوی تقاضا)
          ========================================================================= */}
      {activeTab === 'simulation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              شبیه‌ساز پیش‌بینی نیازمندی مواد و سناریوی رشد تقاضا (What-If Simulation)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تنظیم سناریوهای رشد تقاضای ساپکو، افق زمانی برنامه‌ریزی، و سنجش میزان کسری کلاف قبل از تعهد تجاری
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                درصد رشد تقاضای سفارشات:
              </label>
              <div className="flex items-center gap-2">
                {[0, 15, 25, 50].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setSimGrowth(pct)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      simGrowth === pct
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {pct === 0 ? 'مبنا (۰٪)' : `+${toPersianDigits(pct)}٪`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                افق زمانی برنامه‌ریزی:
              </label>
              <div className="flex items-center gap-2">
                {[7, 14, 30, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => setSimHorizon(days)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      simHorizon === days
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {toPersianDigits(days)} روزه
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                ملاحظات چرخه ساخت و موجودی:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIncludeWip}
                    onChange={e => setSimIncludeWip(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>لحاظ کردن موجودی کار در جریان (WIP)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIncludeConsignment}
                    onChange={e => setSimIncludeConsignment(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>شمارش موجودی امانی ساپکو</span>
                </label>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black text-white shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>اجرای شبیه‌سازی سناریو</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
