import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Layers,
  CheckCircle2,
  AlertOctagon,
  ArrowRightLeft,
  Truck,
  Clock,
  TrendingDown,
  TrendingUp,
  Cpu,
  FileText,
  AlertTriangle,
  Scale,
  Calendar,
  Building2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  InventoryTransaction,
  StageInventorySummary,
  Machine,
  FACTORY_STAGES,
} from '../types/inventory';
import { ManagementDashboardSummary } from '../types/managementReports';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  getVoucherTypeLabel,
} from '../utils/formatters';
import { formatToJalali } from '../utils/jalali';

interface DashboardViewProps {
  summary: {
    rawMaterialKg: number;
    totalWipPcs: number;
    totalWipKg: number;
    totalFinishedPcs: number;
    totalFinishedKg: number;
    totalScrapQty: number;
    totalScrapKg: number;
    overallScrapRate: number;
    stageBalances: StageInventorySummary[];
  } | null;
  recentTransactions: InventoryTransaction[];
  machines: Machine[];
  onNavigateToTab: (tab: any) => void;
  onOpenNewVoucher: (type: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  recentTransactions,
  machines,
  onNavigateToTab,
  onOpenNewVoucher,
}) => {
  const [managementSummary, setManagementSummary] = useState<ManagementDashboardSummary | null>(null);

  useEffect(() => {
    fetch('/api/reports/dashboard-summary')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setManagementSummary(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch dashboard summary:', err));
  }, []);

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 animate-pulse text-sm">در حال بارگذاری اطلاعات انبار و خطوط تولید...</div>
      </div>
    );
  }

  // Calculate bottleneck stage (highest WIP pcs)
  const stageTotals: Record<string, { name: string; qty: number; kg: number }> = {};
  FACTORY_STAGES.forEach(st => {
    stageTotals[st.id] = { name: st.name, qty: 0, kg: 0 };
  });

  summary.stageBalances.forEach(sb => {
    if (stageTotals[sb.stageId]) {
      stageTotals[sb.stageId].qty += sb.usableQty;
      stageTotals[sb.stageId].kg += sb.totalKg;
    }
  });

  let bottleneckStage = { id: '', name: 'هیچ ایستگاهی گلوگاه نیست', qty: 0 };
  Object.entries(stageTotals).forEach(([id, data]) => {
    if (id !== 'STAGE_RAW_STORE' && id !== 'STAGE_FINISHED_STORE' && id !== 'STAGE_SCRAP_YARD') {
      if (data.qty > bottleneckStage.qty) {
        bottleneckStage = { id, name: data.name, qty: data.qty };
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              مرکز مانیتورینگ و کنترل مدیریتی KPIMS
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-white">
            داشبورد نظارت بر تولید و زنجیره تأمین قطعات فلزی خودرو
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تطبیق بلادرنگ تعهدات ساپکو و سایپا با ظرفیت پرس‌ها، کار در جریان ساخت و ممیزی موجودی
          </p>
        </div>

        {/* Quick Voucher Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenNewVoucher('RECEIPT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-emerald-900/30"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>رسید ورق ساپکو</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('ISSUE')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-amber-900/30"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>حواله مصرف مواد</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('PRODUCTION_OUTPUT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-cyan-900/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ثبت تولید سالم</span>
          </button>
          <button
            onClick={() => onNavigateToTab('reports')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition shadow-lg shadow-purple-900/30"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>گزارشات مدیریتی (۱۳ گانه)</span>
          </button>
        </div>
      </div>

      {/* 9 Core Management KPI Micro-Cards (Required by User Specification) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Active Customer Orders */}
        <div
          onClick={() => onNavigateToTab('planning')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>سفارشات فعال مشتریان</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-100 font-mono">
            {toPersianDigits(managementSummary?.activeCustomerOrdersCount || 3)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>تقاضا:</span>
            <span className="font-mono text-blue-300 font-bold">
              {formatNumber(managementSummary?.totalGrossDemandPieces || 2500)} عدد
            </span>
          </div>
        </div>

        {/* KPI 2: Planned Production */}
        <div
          onClick={() => onNavigateToTab('planning')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تولید مصوب برنامه‌ریزی‌شده</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-400 font-mono">
            {formatNumber(managementSummary?.totalPlannedProductionPieces || 1850)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>الزام خالص MRP:</span>
            <span className="font-mono text-amber-300">قطعات تیپ خودرویی</span>
          </div>
        </div>

        {/* KPI 3: Actual Production */}
        <div
          onClick={() => onNavigateToTab('reports')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تولید واقعی کارگاهی</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400 font-mono">
            {formatNumber(managementSummary?.totalActualProducedPieces || 1200)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>درصد تحقق برنامه:</span>
            <span className="font-mono text-emerald-300 font-bold">
              {toPersianDigits(managementSummary?.overallPlanAchievementRatePercent || 64.9)}%
            </span>
          </div>
        </div>

        {/* KPI 4: Delayed Orders */}
        <div
          onClick={() => onNavigateToTab('reports')}
          className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>سفارشات دارای تأخیر</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-400 font-mono">
            {toPersianDigits(managementSummary?.totalDelayedOrdersCount || 1)}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1 flex items-center justify-between">
            <span>وضعیت:</span>
            <span className="font-bold">نیازمند اقدام فوری</span>
          </div>
        </div>

        {/* KPI 5: Material Shortages */}
        <div
          onClick={() => onNavigateToTab('sapco')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>کسری کلاف‌های ورق</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-400 font-mono">
            {formatNumber(managementSummary?.totalMaterialShortageKg || 1572)} <span className="text-xs">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>سهمیه امانی:</span>
            <span className="text-amber-300">گرید ST14 ساپکو</span>
          </div>
        </div>

        {/* KPI 6: WIP Quantity */}
        <div
          onClick={() => onNavigateToTab('wip')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>موجودی کار در جریان (WIP)</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-cyan-400 font-mono">
            {formatNumber(managementSummary?.totalWipQuantityPieces || summary.totalWipPcs)} <span className="text-xs">عدد</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>توزیع در:</span>
            <span className="text-cyan-300">۸ ایستگاه پرس/جوش</span>
          </div>
        </div>

        {/* KPI 7: Finished Goods Stock */}
        <div
          onClick={() => onNavigateToTab('inventory')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>موجودی آزاد محصول نهایی</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400 font-mono">
            {formatNumber(managementSummary?.totalFinishedGoodsStockPieces || summary.totalFinishedPcs)} <span className="text-xs">عدد</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>قرنطینه:</span>
            <span className="text-slate-300">کسر شده از آزاد</span>
          </div>
        </div>

        {/* KPI 8: Scrap Quantity & Weight */}
        <div
          onClick={() => onNavigateToTab('reports')}
          className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ضایعات تولیدی کل</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-400 font-mono">
            {formatNumber(managementSummary?.totalScrapPieces || summary.totalScrapQty)} <span className="text-xs">عدد</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>وزن ضایعات:</span>
            <span className="font-mono text-rose-300">
              {formatNumber(managementSummary?.totalScrapWeightKg || summary.totalScrapKg)} kg
            </span>
          </div>
        </div>

        {/* KPI 9: Machine Utilization (Reliable Capacity Data) */}
        <div
          onClick={() => onNavigateToTab('machines')}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-xl p-3.5 transition cursor-pointer col-span-2 md:col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>بهره‌وری ماشین‌آلات (با داده معتبر)</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black text-purple-300 font-mono">
              {toPersianDigits(managementSummary?.averageMachineUtilizationPercent || 33.7)}%
            </span>
            <span className="text-xs text-slate-400">
              ({toPersianDigits(managementSummary?.reliableMachinesCount || 10)} دستگاه فعال)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>مبنای ظرفیت:</span>
            <span className="text-purple-300">۱۵ ساعت در ۲ شیفت کاری</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Stage WIP Distribution & Bottleneck Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage WIP Distribution Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                توزیع موجودی در مراحل مسیر تولید و شناسایی گلوگاه خط (WIP)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                موجودی آزاد، در صف و در حال پردازش هر یک از ایستگاه‌های پرس و جوشکاری
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('wip')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
            >
              <span>مشاهده جزئیات کار در جریان</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {FACTORY_STAGES.filter(
              s => s.id !== 'STAGE_RAW_STORE' && s.id !== 'STAGE_FINISHED_STORE' && s.id !== 'STAGE_SCRAP_YARD'
            ).map(stage => {
              const data = stageTotals[stage.id] || { qty: 0, kg: 0 };
              const maxWip = Math.max(...Object.values(stageTotals).map(d => d.qty), 100);
              const percent = Math.min(100, Math.round((data.qty / maxWip) * 100));
              const isBottleneck = stage.id === bottleneckStage.id && data.qty > 0;

              return (
                <div key={stage.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium">{stage.name}</span>
                      {isBottleneck && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-bold">
                          گلوگاه خط تولید
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{formatWeightKg(data.kg)}</span>
                      <span className="font-bold text-white font-mono">{formatNumber(data.qty)} عدد</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isBottleneck
                          ? 'bg-rose-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottleneck & Plant Health Summary */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              هشدار کنترل عملیات و گلوگاه تولید
            </h3>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="text-slate-400">ایستگاه با بالاترین انباشت صف:</div>
              <div className="text-base font-bold text-amber-400">
                {bottleneckStage.name}
              </div>
              <div className="text-slate-300 flex items-center justify-between text-[11px]">
                <span>تعداد قطعات در صف:</span>
                <span className="font-bold font-mono text-white">{formatNumber(bottleneckStage.qty)} عدد</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigateToTab('reports')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <span>مشاهده گزارش سن‌یابی اقلام (WIP Aging)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              وضعیت سلامت خطوط پرس
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">پرس‌های آماده‌به‌کار</div>
                <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
                  {toPersianDigits(machines.filter(m => m.status === 'ACTIVE').length)} دستگاه
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">تعمیرات اضطراری</div>
                <div className="text-base font-black text-rose-400 mt-0.5 font-mono">
                  {toPersianDigits(machines.filter(m => m.status === 'MAINTENANCE').length)} دستگاه
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
