import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Activity,
  ShieldCheck,
  Zap,
  AlertTriangle,
  RefreshCw,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  TrendingUp,
  Layers,
  Wrench,
  Eye,
  X,
} from 'lucide-react';
import {
  OeeDashboardSummary,
  OeeMachineRecord,
  ShiftFilterKey,
} from '../../types/oeeAndConsumables';
import { exportToCsv } from '../../utils/csvExport';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

export interface OeeModuleViewProps {
  machines?: any[];
}

export const OeeModuleView: React.FC<OeeModuleViewProps> = () => {
  const [data, setData] = useState<OeeDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<ShiftFilterKey>('ALL');
  const [hallFilter, setHallFilter] = useState<string>('ALL');
  const [selectedMachine, setSelectedMachine] = useState<OeeMachineRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Interactive OEE Simulator State (شبیه‌ساز ارتقای OEE)
  const [simAvailBoost, setSimAvailBoost] = useState<number>(4);
  const [simPerfBoost, setSimPerfBoost] = useState<number>(3);
  const [simQualBoost, setSimQualBoost] = useState<number>(0.5);

  // Log Shift Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logMachineId, setLogMachineId] = useState<string>('MCH-02');
  const [logEventType, setLogEventType] = useState<'PRODUCTION_RUN' | 'PLANNED_DOWNTIME' | 'UNPLANNED_DOWNTIME'>('PRODUCTION_RUN');
  const [logDurationMin, setLogDurationMin] = useState<number>(30);
  const [logStrokes, setLogStrokes] = useState<number>(850);
  const [logScrap, setLogScrap] = useState<number>(12);
  const [logReason, setLogReason] = useState<string>('بهینه‌سازی زمان تعویض قالب کشش با کلمپ هیدرولیک (SMED)');
  const [submittingLog, setSubmittingLog] = useState(false);

  const loadOeeData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (shiftFilter !== 'ALL') q.append('shift', shiftFilter);
      if (hallFilter !== 'ALL') q.append('hall', hallFilter);
      const res = await fetch(`/api/oee/dashboard?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load OEE dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [shiftFilter, hallFilter]);

  useEffect(() => {
    loadOeeData();
  }, [loadOeeData]);

  const handleExportCsv = () => {
    if (!data) return;
    const headers = [
      'کد ماشین',
      'نام ماشین',
      'سالن',
      'قطعه فعال',
      'دسترس‌پذیری (Availability %)',
      'عملکرد (Performance %)',
      'کیفیت (Quality %)',
      'شاخص کل OEE (%)',
      'شاخص TEEP (%)',
      'فاصله تا کلاس جهانی (85%)',
      'MTBF (ساعت)',
      'MTTR (دقیقه)',
      'تولید سالم',
      'ضایعات',
    ];
    const rows = data.machines.map(m => [
      m.machineCode,
      m.machineName,
      m.hallName,
      m.activePartName,
      `${m.availabilityPercent}%`,
      `${m.performancePercent}%`,
      `${m.qualityPercent}%`,
      `${m.oeePercent}%`,
      `${m.teepPercent}%`,
      `${m.varianceFromTargetPercent}%`,
      m.mtbfHours,
      m.mttrMinutes,
      m.goodPieces,
      m.scrapAndReworkPieces,
    ]);
    exportToCsv(`KPIMS_OEE_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLog(true);
    try {
      const res = await fetch('/api/oee/log-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: logMachineId,
          eventType: logEventType,
          durationMinutes: logDurationMin,
          strokesExecuted: logStrokes,
          scrapCount: logScrap,
          reasonTitleFa: logReason,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setNotice(json.message || 'ثبت کارکرد شیفت انجام شد و شاخص OEE بازمحاسبه گردید.');
        setIsLogModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingLog(false);
    }
  };

  // Simulated OEE calculations
  const baseA = data?.plantAvailabilityPercent || 82;
  const baseP = data?.plantPerformancePercent || 87;
  const baseQ = data?.plantQualityPercent || 98.2;
  const simA = Math.min(99.5, Math.round((baseA + simAvailBoost) * 10) / 10);
  const simP = Math.min(99.5, Math.round((baseP + simPerfBoost) * 10) / 10);
  const simQ = Math.min(99.9, Math.round((baseQ + simQualBoost) * 10) / 10);
  const simOee = Math.round(((simA * simP * simQ) / 10000) * 10) / 10;
  const oeeGain = Math.max(0, Math.round((simOee - (data?.plantOeePercent || 70)) * 10) / 10);
  const extraMonthlyParts = Math.round(oeeGain * 1450);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base lg:text-lg font-bold text-white">
                ماژول جامع اثربخشی کلی تجهیزات (OEE) و تحلیل ۶ ضایعه بزرگ (TPM)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                IATF 16949 / SAPCO Grade A
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              محاسبه استاندارد جهانی OEE = دسترس‌پذیری (Availability) × عملکرد سرعت ضرب (Performance) × کیفیت قطعه سالم (Quality) به تفکیک پرس و شیفت
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت آمار شیفت / توقف جدید</span>
          </button>

          <button
            type="button"
            onClick={loadOeeData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>چاپ رسمی</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline cursor-pointer">بستن</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">تفکیک شیفت کاری:</span>
          {[
            { id: 'ALL', label: 'همه شیفت‌ها (کل روز)' },
            { id: 'MORNING', label: 'شیفت صبح (A)' },
            { id: 'EVENING', label: 'شیفت عصر (B)' },
            { id: 'NIGHT', label: 'شیفت شب (C)' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShiftFilter(s.id as ShiftFilterKey)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                shiftFilter === s.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">سالن تولید:</span>
          <select
            value={hallFilter}
            onChange={e => setHallFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه سالن‌های کارخانه</option>
            <option value="پرس">سالن پرس سنگین و متوسط</option>
            <option value="برش">سالن برشکاری و نواربری</option>
            <option value="جوش">سالن مونتاژ و جوشکاری بدنه</option>
          </select>
        </div>
      </div>

      {/* Top Formula & 6 KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-emerald-400 font-bold block">شاخص کل OEE کارخانه</span>
            <div className="text-2xl font-black text-white font-mono tabular-nums mt-1">
              {toPersianDigits(data.plantOeePercent)}٪
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono tabular-nums">
              <span>هدف جهانی: ۸۵٪</span>
              <span className={data.plantOeePercent >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                {data.plantOeePercent >= 85 ? 'کلاس جهانی A' : 'پتانسیل رشد'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-cyan-400 font-bold block">۱. دسترس‌پذیری (Availability)</span>
            <div className="text-xl font-black text-cyan-300 font-mono tabular-nums mt-1">
              {toPersianDigits(data.plantAvailabilityPercent)}٪
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">کسر خرابی و تعویض قالب (هدف ≥ ۹۰٪)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-amber-400 font-bold block">۲. عملکرد سرعت (Performance)</span>
            <div className="text-xl font-black text-amber-300 font-mono tabular-nums mt-1">
              {toPersianDigits(data.plantPerformancePercent)}٪
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">ضرب واقعی به اسمی SPM (هدف ≥ ۹۵٪)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-purple-400 font-bold block">۳. نرخ کیفیت (Quality / FPY)</span>
            <div className="text-xl font-black text-purple-300 font-mono tabular-nums mt-1">
              {toPersianDigits(data.plantQualityPercent)}٪
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">نسبت قطعه سالم به کل ضرب (هدف ≥ ۹۹٪)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-slate-300 font-bold block">قابلیت اطمینان (MTBF / MTTR)</span>
            <div className="text-base font-black text-slate-100 font-mono tabular-nums mt-1">
              {toPersianDigits(data.avgMtbfHours)}h <span className="text-slate-500">/</span> {toPersianDigits(data.avgMttrMinutes)}m
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">میانگین فاصله خرابی / زمان تعمیر</span>
          </div>

          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-indigo-400 font-bold block">ظرفیت پنهان قابل آزادسازی</span>
            <div className="text-lg font-black text-indigo-300 font-mono tabular-nums mt-1">
              +{formatNumber(data.totalHiddenCapacityPiecesPerMonth)} <span className="text-[10px] font-sans font-normal">قطعه/ماه</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 block">در صورت ارتقای OEE به ۸۵٪</span>
          </div>
        </div>
      )}

      {/* Six Big Losses Analysis (تحلیل شش ضایعه بزرگ استاندارد TPM) */}
      {data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                تحلیل پارتو شش ضایعه بزرگ تجهیزات (Six Big Losses Breakdown - TPM)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                شناسایی دقیق گلوگاه‌های اتلاف زمان پرس‌ها و معادل قطعات از دست رفته به تفکیک سه عامل OEE
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              کل زمان تلف‌شده روزانه: {formatNumber(data.sixBigLossesAggregate.reduce((s, l) => s + l.lostTimeMinutes, 0))} دقیقه
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.sixBigLossesAggregate.map(loss => {
              const badgeColor =
                loss.oeeFactor === 'AVAILABILITY_LOSS'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : loss.oeeFactor === 'PERFORMANCE_LOSS'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-purple-500/15 text-purple-300 border-purple-500/30';

              const barColor =
                loss.oeeFactor === 'AVAILABILITY_LOSS'
                  ? 'bg-cyan-500'
                  : loss.oeeFactor === 'PERFORMANCE_LOSS'
                  ? 'bg-amber-500'
                  : 'bg-purple-500';

              return (
                <div
                  key={loss.lossNumber}
                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {loss.oeeFactorLabelFa}
                      </span>
                      <span className="text-xs font-mono font-black text-rose-400 tabular-nums">
                        {toPersianDigits(loss.shareOfTotalLossPercent)}٪ از کل اتلاف
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 mt-2">{loss.lossTitleFa}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      <strong className="text-slate-300">مصداق کارگاهی:</strong> {loss.rootCauseExampleFa}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-900">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-slate-300">زمان تلف‌شده: <strong>{formatNumber(loss.lostTimeMinutes)} دقیقه</strong></span>
                      <span className="text-amber-400">معادل: <strong>{formatNumber(loss.lostPiecesEquivalent)} قطعه</strong></span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full`}
                        style={{ width: `${Math.min(100, loss.shareOfTotalLossPercent)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-emerald-400 pt-0.5">
                      <strong>اقدام کایزن:</strong> {loss.kaizenActionFa}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Machine OEE Matrix Table */}
      {data && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              جدول تحلیلی OEE به تفکیک دستگاه‌های پرس و خطوط جوشکاری ({toPersianDigits(data.machines.length)} دستگاه)
            </h3>
            <span className="text-[11px] text-slate-400">برای مشاهده آبشار زمان و ۶ ضایعه هر دستگاه روی ردیف کلیک کنید</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3">کد و نام دستگاه</th>
                  <th className="py-3 px-3">قطعه فعال روی خط</th>
                  <th className="py-3 px-3 text-center text-cyan-400">دسترس‌پذیری (A)</th>
                  <th className="py-3 px-3 text-center text-amber-400">عملکرد سرعت (P)</th>
                  <th className="py-3 px-3 text-center text-purple-400">کیفیت (Q)</th>
                  <th className="py-3 px-3 text-center font-black text-emerald-400">شاخص OEE</th>
                  <th className="py-3 px-3 text-center">TEEP</th>
                  <th className="py-3 px-3 text-center">سیکل واقعی / ایده‌آل</th>
                  <th className="py-3 px-3 text-center">تولید سالم / ضایعات</th>
                  <th className="py-3 px-3 text-center">رتبه OEE</th>
                  <th className="py-3 px-3 text-center">کالبدشکافی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {data.machines.map(m => (
                  <tr
                    key={m.machineId}
                    onClick={() => setSelectedMachine(m)}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-100">{m.machineName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.machineCode} • {m.hallName}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-medium text-slate-200">{m.activePartName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.processType} • {toPersianDigits(m.tonnage)}T</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-cyan-400">
                      {toPersianDigits(m.availabilityPercent)}٪
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400">
                      {toPersianDigits(m.performancePercent)}٪
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-400">
                      {toPersianDigits(m.qualityPercent)}٪
                    </td>
                    <td className="py-3 px-3 text-center font-black text-sm bg-emerald-950/20">
                      <span className={m.oeePercent >= 75 ? 'text-emerald-400' : m.oeePercent >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                        {toPersianDigits(m.oeePercent)}٪
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {toPersianDigits(m.teepPercent)}٪
                    </td>
                    <td className="py-3 px-3 text-center text-[11px] text-slate-300">
                      {toPersianDigits(m.actualCycleTimeSeconds)}s / <span className="text-slate-500">{toPersianDigits(m.idealCycleTimeSeconds)}s</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-emerald-400 font-bold">{formatNumber(m.goodPieces)}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-rose-400">{formatNumber(m.scrapAndReworkPieces)}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {m.gradeClass === 'WORLD_CLASS_A' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          کلاس جهانی A
                        </span>
                      )}
                      {m.gradeClass === 'ACCEPTABLE_B' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          مطلوب B
                        </span>
                      )}
                      {m.gradeClass === 'NEEDS_IMPROVEMENT_C' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          نیازمند بهبود C
                        </span>
                      )}
                      {m.gradeClass === 'CRITICAL_D' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          بحرانی D
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Eye className="w-4 h-4 text-emerald-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift Comparison & Interactive What-If OEE Calculator */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Shift OEE Comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              مقایسه شاخص OEE به تفکیک شیفت‌های کاری کارخانه
            </h3>
            <div className="space-y-2.5">
              {data.shiftComparison.map(sh => (
                <div
                  key={sh.shiftCode}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{sh.shiftNameFa}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      سرپرست شیفت: {sh.supervisorName} • تیراژ سالم: <span className="font-mono text-slate-200">{formatNumber(sh.totalPieces)}</span> قطعه
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block font-sans">دسترس‌پذیری</span>
                      <span className="text-cyan-400 font-bold">{toPersianDigits(sh.availabilityPercent)}٪</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block font-sans">عملکرد</span>
                      <span className="text-amber-400 font-bold">{toPersianDigits(sh.performancePercent)}٪</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block font-sans">کیفیت</span>
                      <span className="text-purple-400 font-bold">{toPersianDigits(sh.qualityPercent)}٪</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black">
                      OEE: {toPersianDigits(sh.oeePercent)}٪
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive OEE Improvement Simulator */}
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                شبیه‌ساز تعاملی ارتقای OEE و محاسبه تیراژ آزادشده (What-If)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tabular-nums">
                OEE شبیه‌سازی: {toPersianDigits(simOee)}٪
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>کاهش توقفات تعویض قالب (SMED) و افزایش دسترس‌پذیری:</span>
                  <span className="font-mono font-bold text-cyan-400 tabular-nums">+{toPersianDigits(simAvailBoost)}٪ (به {toPersianDigits(simA)}٪)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={simAvailBoost}
                  onChange={e => setSimAvailBoost(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>حذف توقفات جزئی فیدر و بهبود سرعت ضرب (Performance):</span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">+{toPersianDigits(simPerfBoost)}٪ (به {toPersianDigits(simP)}٪)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={simPerfBoost}
                  onChange={e => setSimPerfBoost(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>کاهش ضایعات کشش و بهبود نرخ کیفیت (Quality):</span>
                  <span className="font-mono font-bold text-purple-400 tabular-nums">+{toPersianDigits(simQualBoost)}٪ (به {toPersianDigits(simQ)}٪)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={simQualBoost}
                  onChange={e => setSimQualBoost(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-200">تیراژ قطعه سالم اضافه قابل تولید در ماه (بدون خرید پرس جدید):</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  افزایش خالص شاخص OEE به میزان <strong className="text-emerald-400 font-mono">+{toPersianDigits(oeeGain)}٪</strong>
                </div>
              </div>
              <div className="text-left font-mono tabular-nums">
                <span className="text-xl font-black text-emerald-400">+{formatNumber(extraMonthlyParts)}</span>
                <span className="block text-[10px] text-slate-300 font-sans">قطعه خودرویی / ماه</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Drill-Down Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  کالبدشکافی OEE و آبشار زمان: {selectedMachine.machineName} ({selectedMachine.machineCode})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  قطعه فعال: {selectedMachine.activePartName} • شاخص OEE فعلی: {toPersianDigits(selectedMachine.oeePercent)}٪
                </p>
              </div>
              <button onClick={() => setSelectedMachine(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Waterfall Bars */}
            <div className="space-y-2 text-xs">
              <div className="text-slate-300 font-bold">آبشار تبدیل زمان برنامه‌ریزی‌شده به زمان خالص ارزش‌آفرین (دقیقه):</div>
              {[
                { label: '۱. زمان برنامه‌ریزی‌شده تولید (Planned Production Time)', val: selectedMachine.plannedProductionMinutes, color: 'bg-slate-600' },
                { label: '۲. زمان کارکرد واقعی پس از کسر توقفات (Run Time)', val: selectedMachine.operatingRunMinutes, color: 'bg-cyan-500' },
                { label: '۳. زمان کارکرد خالص پس از کسر افت سرعت (Net Operating Time)', val: selectedMachine.netOperatingMinutes, color: 'bg-amber-500' },
                { label: '۴. زمان کاملاً اثربخش تولید قطعه سالم (Fully Productive Time)', val: selectedMachine.fullyProductiveMinutes, color: 'bg-emerald-500' },
              ].map((row, idx) => {
                const pct = Math.round((row.val / Math.max(1, selectedMachine.plannedProductionMinutes)) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">{row.label}</span>
                      <span className="font-mono font-bold text-white tabular-nums">{formatNumber(row.val)} دقیقه ({toPersianDigits(pct)}٪)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`${row.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Machine Six Big Losses */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-200">تفکیک ۶ ضایعه بزرگ در این دستگاه:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedMachine.sixBigLosses.map(l => (
                  <div key={l.lossNumber} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{l.lossTitleFa}</span>
                      <span className="font-mono text-rose-400 tabular-nums">{formatNumber(l.lostTimeMinutes)} دقیقه</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{l.kaizenActionFa}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Shift OEE Modal */}
      {isLogModalOpen && data && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ثبت آمار کارکرد شیفت و بروزرسانی OEE</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">انتخاب دستگاه پرس / ایستگاه:</label>
                <select
                  value={logMachineId}
                  onChange={e => setLogMachineId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {data.machines.map(m => (
                    <option key={m.machineId} value={m.machineId}>
                      [{m.machineCode}] {m.machineName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">نوع رویداد شیفت:</label>
                <select
                  value={logEventType}
                  onChange={e => setLogEventType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="PRODUCTION_RUN">ثبت ضرب تولید و قطعه سالم شیفت</option>
                  <option value="PLANNED_DOWNTIME">توقف برنامه‌ریزی‌شده (تعویض قالب SMED / نت PM)</option>
                  <option value="UNPLANNED_DOWNTIME">توقف اضطراری (خرابی پرس / شکستگی سنبه)</option>
                </select>
              </div>

              {logEventType === 'PRODUCTION_RUN' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">تعداد ضرب ثبت‌شده:</label>
                    <input
                      type="number"
                      value={logStrokes}
                      onChange={e => setLogStrokes(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">تعداد ضایعات:</label>
                    <input
                      type="number"
                      value={logScrap}
                      onChange={e => setLogScrap(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">مدت زمان توقف (دقیقه):</label>
                  <input
                    type="number"
                    value={logDurationMin}
                    onChange={e => setLogDurationMin(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">شرح عملیات یا علت توقف:</label>
                <input
                  type="text"
                  value={logReason}
                  onChange={e => setLogReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  {submittingLog ? 'در حال ثبت...' : 'ثبت و بازمحاسبه OEE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
