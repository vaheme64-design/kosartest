import React from 'react';
import {
  Boxes,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  TrendingUp,
  FilePlus,
  Play,
  Scale,
  RefreshCw,
  Cpu,
  ShieldCheck,
  ChevronRight,
  ArrowDownRight,
  ArrowUpLeft,
} from 'lucide-react';
import {
  WipDashboardMetrics,
  ManufacturingOrder,
} from '../../types/productionWip';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
} from '../../utils/formatters';

interface WipDashboardViewProps {
  metrics: WipDashboardMetrics | null;
  orders: ManufacturingOrder[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenCreateMo: () => void;
  onOpenTransfer: () => void;
  onSelectMo: (mo: ManufacturingOrder) => void;
  onNavigateToOrders: () => void;
  onNavigateToTransfers: () => void;
}

export const WipDashboardView: React.FC<WipDashboardViewProps> = ({
  metrics,
  orders,
  loading,
  onRefresh,
  onOpenCreateMo,
  onOpenTransfer,
  onSelectMo,
  onNavigateToOrders,
  onNavigateToTransfers,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Actions */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-purple-400" />
              داشبورد کار در جریان ساخت و کنترل گلوگاه‌های خطوط (WIP Execution)
            </h2>
            {metrics?.overallConservationIntegrity && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>پایستگی قطعات تایید شده</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            رهگیری لحظه‌ای صف‌های ورودی، اقلام پای دستگاه، تولید آماده انتقال و تحلیل زمان توقف و قدمت (Aging)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/30 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>انتقال بین‌مراحل</span>
          </button>
          <button
            onClick={onOpenCreateMo}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>دستور کار جدید (MO)</span>
          </button>
        </div>
      </div>

      {/* 5 Main WIP Stage Breakdown Micro-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Waiting at operations */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>در انتظار صف ورودی</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">
            {formatNumber(metrics?.totalWaitingQty || 0)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">آماده شروع در ماشین</span>
        </div>

        {/* 2. In-Progress at machines */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>در حال ساخت پای دستگاه</span>
            <Play className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 font-mono mt-1">
            {formatNumber(metrics?.totalInProgressQty || 0)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">در حال پرس/خم/جوش</span>
        </div>

        {/* 3. Ready for transfer */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>آماده انتقال به مرحله بعد</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {formatNumber(metrics?.totalReadyForTransferQty || 0)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">نیازمند صدور حواله</span>
        </div>

        {/* 4. In-Transit */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>در حال انتقال (In-Transit)</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 font-mono mt-1">
            {formatNumber(metrics?.totalInTransitQty || 0)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {toPersianDigits(metrics?.pendingTransfersCount || 0)} حواله در انتظار تأیید
          </span>
        </div>

        {/* 5. Completed Final Products */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>تکمیل‌شده نهایی</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300 font-mono mt-1">
            {formatNumber(metrics?.totalCompletedQty || 0)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">تحویل انبار نهایی</span>
        </div>

        {/* 6. Scrap & Non-Conformity */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/10">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>ضایعات و دوباره‌کاری</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono mt-1">
            {formatNumber((metrics?.totalScrapQty || 0) + (metrics?.totalReworkQty || 0))}
          </div>
          <span className="text-[10px] text-rose-400/80 block mt-0.5">
            {toPersianDigits(metrics?.totalScrapQty || 0)} ضایعات | {toPersianDigits(metrics?.totalReworkQty || 0)} دوباره‌کاری
          </span>
        </div>
      </div>

      {/* Two Column Layout: Bottlenecks & Active MOs Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bottlenecks and Queue Depth */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>تحلیل تراکم و صف ایستگاه‌ها (Bottleneck & Aging Analysis)</span>
            </h3>
            <span className="text-[11px] text-slate-400">مرتب‌سازی بر اساس عمق صف</span>
          </div>

          <div className="space-y-3">
            {(!metrics?.bottleneckOperations || metrics.bottleneckOperations.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-400">اطلاعاتی در دسترس نیست.</div>
            ) : (
              metrics.bottleneckOperations.slice(0, 5).map((op, idx) => {
                const totalInQueue = op.waitingQty + op.inProgressQty;
                const isHighAging = op.agingHoursAvg > 12;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{op.stepCode}</span>
                        <span className="text-xs font-medium text-white">{op.operationName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>صف انتظار: <strong className="text-amber-300 font-mono">{formatNumber(op.waitingQty)}</strong></span>
                        <span>پای‌کار: <strong className="text-blue-300 font-mono">{formatNumber(op.inProgressQty)}</strong></span>
                        <span>آماده انتقال: <strong className="text-emerald-300 font-mono">{formatNumber(op.readyQty)}</strong></span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className={`text-xs font-mono font-bold ${isHighAging ? 'text-rose-400' : 'text-slate-300'}`}>
                        {toPersianDigits(op.agingHoursAvg)} ساعت توقف
                      </div>
                      <span className="text-[10px] text-slate-500 block">میانگین قدمت WIP</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Manufacturing Orders Quick Overview */}
        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>دستورهای کار جاری و پیشرفت فرآیندها (Active MOs)</span>
            </h3>
            <button
              onClick={onNavigateToOrders}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه دستورها</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map(mo => {
              const completedOps = mo.operations.filter(o => o.status === 'COMPLETED').length;
              const progressPercent = Math.round((completedOps / mo.operations.length) * 100);

              return (
                <div
                  key={mo.id}
                  onClick={() => onSelectMo(mo)}
                  className="p-3 bg-slate-900/60 hover:bg-slate-900 rounded-xl border border-slate-700/60 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-xs">{mo.moNumber}</span>
                        <span className="text-xs font-semibold text-white">{mo.partName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        کد: <span className="font-mono text-slate-300">{mo.partCode}</span> | هدف: <strong className="text-white font-mono">{formatNumber(mo.targetQuantity)} PCS</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      نسخه {mo.routingVersion}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>پیشرفت مراحل فرآیند ({toPersianDigits(completedOps)} از {toPersianDigits(mo.operations.length)} مرحله):</span>
                      <span className="font-mono font-bold text-cyan-400">{toPersianDigits(progressPercent)}٪</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
