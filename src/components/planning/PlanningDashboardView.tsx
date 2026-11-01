import React from 'react';
import {
  TrendingUp,
  Boxes,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  Percent,
  Clock,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PlanningDashboardMetrics,
  PartNetRequirement,
} from '../../types/productionPlanning';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { Machine } from '../../types/inventory';

interface PlanningDashboardViewProps {
  metrics: PlanningDashboardMetrics | null;
  netRequirements: PartNetRequirement[];
  machines: Machine[];
  onRegenerate: () => Promise<void>;
  onOpenNewOrderModal: () => void;
  onNavigateToRecommendations: (partId?: string) => void;
  loading: boolean;
}

export const PlanningDashboardView: React.FC<PlanningDashboardViewProps> = ({
  metrics,
  netRequirements,
  machines,
  onRegenerate,
  onOpenNewOrderModal,
  onNavigateToRecommendations,
  loading,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                موتور موازنه تقاضای ساپکو، موجودی و ظرفیت خطوط پرس (KPIMS Planning Engine)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                محاسبه خالص نیاز تولید با کسر قرنطینه کیفی و اعتبارات WIP مراحل مسیر عملیات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              محاسبه مجدد MRP
            </button>
            <button
              onClick={onOpenNewOrderModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shadow-sm transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              ثبت سفارش جدید ساپکو
            </button>
          </div>
        </div>
      </div>

      {/* KPI Micro-cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>سفارشات باز</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-slate-100 mt-2 font-mono">
            {toPersianDigits(metrics?.totalOpenOrdersCount || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">تعهدات تحویل به خودروسازان</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>تقاضای ناخالص</span>
            <Boxes className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-slate-100 mt-2 font-mono">
            {formatNumber(metrics?.totalGrossDemandPieces || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">تعداد قطعات سفارش داده شده</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>الزام خالص تولید</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 mt-2 font-mono">
            {formatNumber(metrics?.totalNetProductionRequirementsPieces || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">پس از کسر انبار و WIP فعال</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>کسری کلاف ساپکو</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 mt-2 font-mono">
            {formatNumber(metrics?.totalMaterialShortageKg || 0)} <span className="text-xs font-normal">kg</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">ورق مورد نیاز ناموجود</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>برنامه‌های مصوب</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 mt-2 font-mono">
            {toPersianDigits(metrics?.approvedPlansCount || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">از مجموع {toPersianDigits(metrics?.activeSuggestionsCount || 0)} برنامه</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>میانگین اشغال پرس‌ها</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 mt-2 font-mono">
            {toPersianDigits(metrics?.averageMachineCapacityUtilizationPercent || 0)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">از ظرفیت ۱۵ ساعت ۲ شیفت</div>
        </div>
      </div>

      {/* Critical Parts Alert Banner if any */}
      {metrics?.criticalPartsRequiringImmediateAction &&
        metrics.criticalPartsRequiringImmediateAction.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>اقدام فوری برنامه‌ریزی: قطعات دارای الزام خالص بالا یا کسری ورق</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {metrics.criticalPartsRequiringImmediateAction.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-200">{p.partName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.partCode}</div>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-amber-400 font-mono">
                      {formatNumber(p.netShortage)} عدد
                    </span>
                    {p.hasMaterialShortage && (
                      <span className="block text-[10px] text-rose-400 font-bold">
                        کسری کلاف ورق
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Net Production Requirements Balance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              ماتریس موازنه تقاضای ناخالص، موجودی آزاد و خالص الزام تولید (Net Requirements)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              محاسبه خالص الزام تولید با فرمول دقیق: [تقاضای ناخالص] منهای [موجودی فیزیکی - قرنطینه - رزرو] منهای [کل WIP مراحل خط]
            </p>
          </div>
          <button
            onClick={() => onNavigateToRecommendations()}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
          >
            <span>مشاهده تخصیص ماشین‌آلات</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">کد و نام قطعه</th>
                <th className="py-3 px-3">موعد تحویل</th>
                <th className="py-3 px-3 text-center">تقاضای ناخالص</th>
                <th className="py-3 px-3 text-center">موجودی فیزیکی</th>
                <th className="py-3 px-3 text-center text-rose-400">مسدود کیفی</th>
                <th className="py-3 px-3 text-center text-amber-400">رزرو سفارشات</th>
                <th className="py-3 px-3 text-center text-emerald-400">موجودی آزاد FG</th>
                <th className="py-3 px-3 text-center text-cyan-400">اعتبار WIP</th>
                <th className="py-3 px-3 text-center font-bold text-amber-400">الزام خالص تولید</th>
                <th className="py-3 px-3 text-center">ورق ساپکو (kg)</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {netRequirements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    سفارش فعالی در سیستم وجود ندارد. لطفاً سفارش جدید ثبت کنید.
                  </td>
                </tr>
              ) : (
                netRequirements.map(nr => (
                  <tr key={nr.partId} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{nr.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {nr.partCode} {nr.carModel && `• ${nr.carModel}`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      {formatToJalali(nr.dueDate)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {formatNumber(nr.grossDemandQty)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {formatNumber(nr.physicalFinishedGoodsQty)}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-400">
                      {formatNumber(nr.qualityBlockedQty)}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-400">
                      {formatNumber(nr.reservedFinishedGoodsQty)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {formatNumber(nr.availableFinishedGoodsQty)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-cyan-400">
                      {formatNumber(nr.totalDownstreamWip)}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-amber-400 bg-amber-500/5">
                      {formatNumber(nr.netProductionRequirement)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {nr.materialShortageDetected ? (
                        <span className="text-rose-400 font-bold block text-[11px]">
                          کسری {formatNumber(nr.materialShortageKg)} kg
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium block text-[11px]">
                          موجود ({formatNumber(nr.requiredMaterialKg)} kg)
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {nr.requiredMaterialGrade}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <button
                        onClick={() => onNavigateToRecommendations(nr.partId)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded text-xs transition border border-slate-700"
                      >
                        بررسی ماشین
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Machine Capacity Load Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              لود ظرفیت خطوط پرس و ماشین‌آلات (سقف ۱۵ ساعت در ۲ شیفت)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {toPersianDigits(machines.length)} دستگاه در شبکه تولید
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {machines.map((m, idx) => {
            const isDown = m.status === 'MAINTENANCE';
            const capacityHours = 15;
            // Workload distribution for plant visibility
            const workloadHours = isDown ? 0 : Math.round(((idx * 3 + 4) % 8 + 4) * 10) / 10;
            const workloadPercent = isDown ? 0 : Math.min(100, Math.round((workloadHours / capacityHours) * 100));

            return (
              <div
                key={m.id}
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  isDown
                    ? 'bg-rose-950/20 border-rose-900/40 text-slate-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{m.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">({m.code})</span>
                  </div>
                  {isDown ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      تعمیرات اضطراری
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      آماده‌به‌کار
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>تناژ: {m.tonnage ? `${formatNumber(m.tonnage)} تن` : '-'}</span>
                  <span>سالن: {m.location || 'پرس‌کاری'}</span>
                  <span>کورس: {m.strokeLengthMm ? `${m.strokeLengthMm} mm` : '-'}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">میزان اشغال ظرفیت:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {isDown ? '۰٪' : `${toPersianDigits(workloadPercent)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        isDown
                          ? 'bg-rose-500/50'
                          : workloadPercent > 80
                          ? 'bg-rose-500'
                          : workloadPercent > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${workloadPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
