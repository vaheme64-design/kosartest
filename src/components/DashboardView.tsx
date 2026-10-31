import React from 'react';
import {
  Boxes,
  Layers,
  CheckCircle2,
  AlertOctagon,
  ArrowRightLeft,
  Truck,
  Flame,
  Clock,
  TrendingDown,
  Cpu,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  InventoryTransaction,
  StageInventorySummary,
  Machine,
  FACTORY_STAGES,
} from '../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  getVoucherTypeLabel,
} from '../utils/formatters';

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
  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 animate-pulse text-sm">در حال بارگذاری اطلاعات انبار و خطوط تولید...</div>
      </div>
    );
  }

  // Calculate bottleneck stage (highest WIP pcs)
  const wipStages = summary.stageBalances.filter(
    s => s.stageId !== 'STAGE_RAW_STORE' && s.stageId !== 'STAGE_FINISHED_STORE' && s.stageId !== 'STAGE_SCRAP_YARD'
  );

  // Group by stage
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

  const activeMachinesCount = machines.filter(m => m.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              وضعیت خط تولید: فعال و در حال پردازش
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-white">
            داشبورد مانیتورینگ کارخانه قطعات پرسی خودرو
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            محاسبه قطعی و لحظه‌ای موجودی بر مبنای گردش دفاتر تراکنش‌های معتبر و جلوگیری از موجودی منفی
          </p>
        </div>

        {/* Quick Voucher Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenNewVoucher('RECEIPT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-emerald-900/30"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>رسید ورق ساپکو</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('ISSUE')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-amber-900/30"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>حواله مصرف مواد</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('PRODUCTION_OUTPUT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-cyan-900/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ثبت تولید سالم</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('WIP_TRANSFER_DISPATCH')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-purple-900/30"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>انتقال بین مراحل</span>
          </button>
          <button
            onClick={() => onOpenNewVoucher('SCRAP')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-rose-900/30"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>ثبت ضایعات</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Raw Material Steel (KG & Ton) */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">موجودی ورق فولادی ساپکو</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-white">
              {formatWeightKg(summary.rawMaterialKg)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              کلاف‌های ST14، DC04، گالوانیزه و ورق سیاه
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">واحد ردیابی:</span>
            <span className="text-amber-400 font-semibold">کیلوگرم (KG)</span>
          </div>
        </div>

        {/* Card 2: Work in Progress (WIP) */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">کار در جریان ساخت (WIP)</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-white">
              {formatNumber(summary.totalWipPcs)} <span className="text-sm font-normal text-slate-400">عدد</span>
            </div>
            <p className="text-[11px] text-cyan-400 mt-1">
              معادل {formatWeightKg(summary.totalWipKg)} در ایستگاه‌ها
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">توزیع در مراحل:</span>
            <span className="text-slate-300 font-medium">۸ مرحله عملیاتی</span>
          </div>
        </div>

        {/* Card 3: Finished Goods */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">محصولات نهایی آماده تحویل</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-white">
              {formatNumber(summary.totalFinishedPcs)} <span className="text-sm font-normal text-slate-400">عدد</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">
              وزن کل: {formatWeightKg(summary.totalFinishedKg)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">محل استقرار:</span>
            <span className="text-slate-300 font-medium">انبار نهایی ساپکو</span>
          </div>
        </div>

        {/* Card 4: Scrap & Quality */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">نرخ ضایعات کارخانه</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-rose-400">
              {toPersianDigits(summary.overallScrapRate)}٪
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              مجموع ضایعات: {formatNumber(summary.totalScrapQty)} عدد ({formatWeightKg(summary.totalScrapKg)})
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">وضعیت حد مجاز:</span>
            <span className={summary.overallScrapRate <= 2.5 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {summary.overallScrapRate <= 2.5 ? 'در محدوده مجاز ساپکو' : 'فراتر از حد استاندارد'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Stage WIP Distribution & Bottleneck Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage WIP Distribution Chart */}
        <div className="lg:col-span-2 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">توزیع قطعات در مراحل تولید (WIP)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                موجودی آزاد و در جریان هر ایستگاه پرس و جوش
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              مشاهده گزارش تفصیلی ←
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
                          گلوگاه خط
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{formatWeightKg(data.kg)}</span>
                      <span className="font-bold text-white">{formatNumber(data.qty)} عدد</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-900/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isBottleneck
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottleneck Alert & Machines Status */}
        <div className="space-y-4">
          {/* Bottleneck Card */}
          <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertOctagon className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">تحلیل گلوگاه تولید</h4>
            </div>
            <div className="text-sm font-bold text-white">{bottleneckStage.name}</div>
            <p className="text-xs text-slate-400 mt-1">
              با انباشت <span className="text-amber-400 font-semibold">{formatNumber(bottleneckStage.qty)}</span> قطعه
              نیمه‌ساخته، بیشترین بار کاری در این مرحله قرار دارد. تسریع انتقال به مرحله بعد توصیه می‌شود.
            </p>
          </div>

          {/* Machine Readiness Card */}
          <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Cpu className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">آمادگی ماشین‌آلات</h4>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {toPersianDigits(activeMachinesCount)} از {toPersianDigits(machines.length)} فعال
              </span>
            </div>
            <div className="space-y-2">
              {machines.slice(0, 4).map(m => (
                <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/40">
                  <div>
                    <span className="font-medium text-slate-200">{m.code}</span>
                    <span className="text-[11px] text-slate-400 mr-2">{m.name.slice(0, 26)}...</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {m.status === 'ACTIVE' ? 'فعال' : 'تعمیرات'}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigateToTab('machines')}
              className="w-full mt-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center font-medium"
            >
              مشاهده تمامی ماشین‌آلات ←
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Factory Transactions */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">آخرین اسناد و تراکنش‌های انبار و سالن</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              دفتر گردش معتبر تراکنش‌ها با کد پیگیری یکتا
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('audit')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            مشاهده دفتر کل اسناد ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-700/80 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">شماره سند</th>
                <th className="py-2.5 px-3">نوع عملیات</th>
                <th className="py-2.5 px-3">نام قطعه / ماده اولیه</th>
                <th className="py-2.5 px-3">ایستگاه / انبار</th>
                <th className="py-2.5 px-3">مقدار</th>
                <th className="py-2.5 px-3">وزن معادل</th>
                <th className="py-2.5 px-3">مسئول ثبت</th>
                <th className="py-2.5 px-3">تاریخ و زمان</th>
                <th className="py-2.5 px-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentTransactions.slice(0, 7).map(tx => {
                const badge = getVoucherTypeLabel(tx.voucherType);
                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-amber-400">{tx.voucherNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      <div>{tx.partName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.partCode}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div>{tx.stageName}</div>
                      {tx.targetStageName && (
                        <div className="text-[10px] text-purple-400">به: {tx.targetStageName}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {formatNumber(tx.quantity)} {tx.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{formatWeightKg(tx.quantityKg)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{tx.operatorName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      {tx.status === 'CONFIRMED' ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          تأیید شده
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                          <AlertOctagon className="w-3 h-3" />
                          ابطال شده
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
