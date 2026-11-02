import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Layers,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ArrowRightLeft,
  Search,
  Cpu,
  FileText,
  AlertTriangle,
  Building2,
  ArrowLeft,
  Calendar,
  FileSignature,
} from 'lucide-react';
import {
  InventoryTransaction,
  StageInventorySummary,
  Machine,
  UserRoleProfile,
  FACTORY_STAGES,
} from '../types/inventory';
import { ManagementDashboardSummary } from '../types/managementReports';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
} from '../utils/formatters';
import { OnboardingBanner } from './common/ContextualHelp';
import { TabKey } from './Sidebar';
import { InventorySubTab } from './inventory/InventoryModuleView';

interface DashboardViewProps {
  currentUser?: UserRoleProfile;
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
  onNavigateToTab: (tab: TabKey, subTab?: InventorySubTab, actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER') => void;
  onOpenNewVoucher: (type: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  summary,
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
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="text-slate-500 text-xs">در حال بارگذاری اطلاعات میز کار...</div>
      </div>
    );
  }

  const role = currentUser?.role || 'ADMIN';

  // Calculate stage totals & bottleneck stage
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

  let bottleneckStage = { id: '', name: 'هیچ ایستگاهی دارای انباشت غیرعادی نیست', qty: 0 };
  Object.entries(stageTotals).forEach(([id, data]) => {
    if (id !== 'STAGE_RAW_STORE' && id !== 'STAGE_FINISHED_STORE' && id !== 'STAGE_SCRAP_YARD') {
      if (data.qty > bottleneckStage.qty) {
        bottleneckStage = { id, name: data.name, qty: data.qty };
      }
    }
  });

  const activeOrdersCount = managementSummary?.activeCustomerOrdersCount ?? 3;
  const grossDemandPcs = managementSummary?.totalGrossDemandPieces ?? 2500;
  const delayedOrdersCount = managementSummary?.totalDelayedOrdersCount ?? 1;

  const plannedPcs = managementSummary?.totalPlannedProductionPieces ?? 1850;
  const actualPcs = managementSummary?.totalActualProducedPieces ?? 1200;
  const achievementRate = managementSummary?.overallPlanAchievementRatePercent ?? 64.9;

  const finishedGoodsPcs = managementSummary?.totalFinishedGoodsStockPieces ?? summary.totalFinishedPcs;
  const wipQtyPcs = managementSummary?.totalWipQuantityPieces ?? summary.totalWipPcs;
  const materialShortageKg = managementSummary?.totalMaterialShortageKg ?? 0;

  const scrapPcs = managementSummary?.totalScrapPieces ?? summary.totalScrapQty;
  const scrapWeightKg = managementSummary?.totalScrapWeightKg ?? summary.totalScrapKg;
  const activeMachinesCount = machines.filter(m => m.status === 'ACTIVE').length;
  const maintenanceMachinesCount = machines.filter(m => m.status === 'MAINTENANCE').length;

  return (
    <div className="space-y-6">
      {/* Dismissible First-Time Guided Learning Banner */}
      <OnboardingBanner
        role={role}
        onQuickAction={act => {
          if (act === 'inventory_receipt') {
            onNavigateToTab('inventory', 'DASHBOARD', 'RECEIPT');
          }
        }}
      />

      {/* QUESTION 3 FIRST FOR OPERATORS: "What should I do next?" Task Launchpad */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm lg:text-base font-bold text-slate-900">
              میان‌بر عملیات روزانه (چه کاری می‌خواهید انجام دهید؟)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              پرتکرارترین عملیات انبار، رول ورق و خط تولید بدون نیاز به جستجو در منوها
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigateToTab('inventory', 'DASHBOARD', 'RECEIPT')}
            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-right transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-600 text-white">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-700 opacity-60 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-2.5">۱. ثبت رسید کالا / رول ورق</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ورود ورق، پیچ و مهره و تخصیص یک رول به چند قرارداد
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('inventory', 'DASHBOARD', 'ISSUE')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 text-right transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-slate-900 text-white">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-2.5">۲. صدور حواله خروج به خط</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ارسال تمام یا بخشی از رول ورق و قطعات به سالن پرس
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('inventory', 'DASHBOARD', 'RETURN')}
            className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-right transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-600 text-white">
                <RotateCcw className="w-4 h-4" />
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-blue-700 opacity-60 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-2.5">۳. برگشت ورق از خط تولید</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              بازگرداندن ته‌کلاف به انبار با حفظ کویل‌پک و قرارداد
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('inventory', 'INQUIRY')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 text-right transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-slate-800 text-white">
                <Search className="w-4 h-4" />
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-2.5">۴. استعلام موجودی و کویل‌پک</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              فیلتر و گروه‌بندی رول‌ها بر اساس ضخامت، جنس و قرارداد
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewVoucher('PRODUCTION_OUTPUT')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 text-right transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-slate-800 text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-2.5">۵. ثبت تولید و ضایعات شیفت</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ثبت قطعات سالم تولیدشده در ایستگاه‌های پرس و جوش
            </div>
          </button>
        </div>
      </div>

      {/* QUESTION 1: "What is the current situation?" (Clickable KPI Cards) */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 px-1">
          ۱. وضعیت فعلی کارخانه در یک نگاه (روی هر کارت کلیک کنید تا جزئیات باز شود)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Raw Materials & Coils */}
          <div
            onClick={() => onNavigateToTab('inventory', 'INQUIRY')}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">موجودی ورق و مواد اولیه</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  {formatWeightKg(summary.rawMaterialKg)}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                موجودی محصول نهایی سالم: <strong className="font-mono text-slate-900">{formatNumber(finishedGoodsPcs)}</strong> عدد
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">وضعیت کسری ورق سفارشات:</span>
              {materialShortageKg > 0 ? (
                <span className="text-rose-600 font-mono font-bold">
                  کسری: {formatWeightKg(materialShortageKg)}
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">کافی و پایدار</span>
              )}
            </div>
          </div>

          {/* Card 2: Customer Demand & Contracts */}
          <div
            onClick={() => onNavigateToTab('planning')}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">سفارشات مشتریان و نیازسنجی</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  {toPersianDigits(activeOrdersCount)}
                </span>
                <span className="text-xs text-slate-500">سفارش فعال</span>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                تقاضای کل: <strong className="font-mono text-slate-900">{formatNumber(grossDemandPcs)}</strong> عدد قطعه
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">وضعیت تحویل:</span>
              {delayedOrdersCount > 0 ? (
                <span className="text-amber-700 font-semibold">
                  {toPersianDigits(delayedOrdersCount)} سفارش نیازمند پیگیری
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">طبق برنامه زمانی</span>
              )}
            </div>
          </div>

          {/* Card 3: Production Plan & WIP */}
          <div
            onClick={() => onNavigateToTab('wip')}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">کار در جریان ساخت (WIP)</span>
                <Boxes className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  {formatNumber(wipQtyPcs)}
                </span>
                <span className="text-xs text-slate-500">قطعه نیمه‌ساخته در خطوط</span>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                تحقق برنامه تولید: <strong className="font-mono text-slate-900">{toPersianDigits(achievementRate)}%</strong> ({formatNumber(actualPcs)} از {formatNumber(plannedPcs)})
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>شلوغ‌ترین ایستگاه:</span>
              <strong className="text-slate-800 truncate max-w-[140px]">{bottleneckStage.name}</strong>
            </div>
          </div>

          {/* Card 4: Machines & Quality */}
          <div
            onClick={() => onNavigateToTab('machines')}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">وضعیت پرس‌ها و کیفیت</span>
                <Cpu className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums tracking-tight">
                  {toPersianDigits(activeMachinesCount)}
                </span>
                <span className="text-xs text-slate-500">دستگاه پرس فعال و آماده</span>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                مجموع ضایعات ثبت‌شده: <strong className="font-mono text-slate-900">{formatNumber(scrapPcs)}</strong> عدد ({formatWeightKg(scrapWeightKg)})
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>در حال تعمیرات / سرویس:</span>
              <strong className="font-mono text-amber-700">{toPersianDigits(maintenanceMachinesCount)} دستگاه</strong>
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 2: "What requires my attention?" (Exceptions & Bottlenecks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Attention & Exceptions Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>۲. موارد نیازمند توجه و پیگیری</span>
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => onNavigateToTab('planning')}
                className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 hover:bg-amber-50 transition cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span>بررسی موجودی ورق برای سفارشات</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <p className="text-[11px] text-amber-800 mt-1">
                  {materialShortageKg > 0
                    ? `مقدار ${formatWeightKg(materialShortageKg)} کسری ورق برای پوشش کامل تقاضای مشتریان شناسایی شده است.`
                    : 'بررسی کفایت موجودی رول‌های ورق و تخصیص ماشین‌آلات پرس برای سفارشات جاری.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateToTab('inventory', 'CONTRACTS')}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>کنترل سقف قراردادها و کویل‌پک‌ها</span>
                  <FileSignature className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  مشاهده مانده تعهد قراردادهای ساپکو و مشتریان و رول‌های تخصیص‌یافته به هر قرارداد.
                </p>
              </div>

              <div
                onClick={() => onNavigateToTab('inventory', 'CUSTOM_REPORTS')}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>گزارش سفارشی رول‌ها به تفکیک ضخامت و جنس</span>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  مشاهده تعداد کل کویل‌ها و مجموع وزن موجود به تفکیک مشخصات فنی کالا.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WIP Progress Across Operations (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                توزیع موجودی نیمه‌ساخته (WIP) در ایستگاه‌های خط تولید
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                موجودی پای دستگاه در ایستگاه‌های برش، پرسکاری، جوشکاری و رنگ
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('wip')}
              className="text-xs text-blue-700 hover:text-blue-900 transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>مدیریت ایستگاه‌های WIP</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
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
                      <span className="text-slate-800 font-medium">{stage.name}</span>
                      {isBottleneck && (
                        <span className="text-[11px] text-amber-700 font-semibold">
                          (بیشترین تجمع قطعه در صف)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-slate-500 text-[11px]">{formatWeightKg(data.kg)}</span>
                      <span className="text-slate-900 font-bold">{formatNumber(data.qty)} عدد</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isBottleneck ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
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
