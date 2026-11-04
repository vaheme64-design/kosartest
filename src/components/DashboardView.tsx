import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Layers,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Search,
  Cpu,
  FileText,
  AlertTriangle,
  Building2,
  ArrowLeft,
  FileSignature,
  LayoutDashboard,
  ChevronDown,
  ChevronLeft,
  Filter,
  Folder,
  Plus,
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
import { DashboardSkeleton, Skeleton } from './ui/Skeleton';
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
  onNavigateToTab: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onOpenNewVoucher: (type: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  summary,
  machines,
  onNavigateToTab,
  onOpenNewVoucher,
}) => {
  const [managementSummary, setManagementSummary] =
    useState<ManagementDashboardSummary | null>(null);
  const [loadingManagement, setLoadingManagement] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<'ALL' | 'INVENTORY' | 'WIP' | 'PLANNING' | 'QUALITY'>('ALL');
  const [onlyBottlenecks, setOnlyBottlenecks] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    shortcuts: true,
    stations: true,
    alerts: true,
  });

  useEffect(() => {
    setLoadingManagement(true);
    fetch('/api/reports/dashboard-summary')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setManagementSummary(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch dashboard summary:', err))
      .finally(() => setLoadingManagement(false));
  }, []);

  const role = currentUser?.role || 'ADMIN';

  // Calculate stage totals & bottleneck stage safely even when summary is null
  const stageTotals: Record<string, { name: string; qty: number; kg: number }> = {};
  FACTORY_STAGES.forEach(st => {
    stageTotals[st.id] = { name: st.name, qty: 0, kg: 0 };
  });

  (summary?.stageBalances || []).forEach(sb => {
    if (stageTotals[sb.stageId]) {
      stageTotals[sb.stageId].qty += sb.usableQty;
      stageTotals[sb.stageId].kg += sb.totalKg;
    }
  });

  let bottleneckStage = { id: '', name: 'هیچ ایستگاهی دارای انباشت غیرعادی نیست', qty: 0 };
  Object.entries(stageTotals).forEach(([id, data]) => {
    if (
      id !== 'STAGE_RAW_STORE' &&
      id !== 'STAGE_FINISHED_STORE' &&
      id !== 'STAGE_SCRAP_YARD'
    ) {
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

  const finishedGoodsPcs =
    managementSummary?.totalFinishedGoodsStockPieces ?? (summary?.totalFinishedPcs ?? 0);
  const wipQtyPcs =
    managementSummary?.totalWipQuantityPieces ?? (summary?.totalWipPcs ?? 0);
  const materialShortageKg = managementSummary?.totalMaterialShortageKg ?? 0;

  const scrapPcs = managementSummary?.totalScrapPieces ?? (summary?.totalScrapQty ?? 0);
  const scrapWeightKg =
    managementSummary?.totalScrapWeightKg ?? (summary?.totalScrapKg ?? 0);
  const activeMachinesCount = machines.filter(m => m.status === 'ACTIVE').length;
  const maintenanceMachinesCount = machines.filter(
    m => m.status === 'MAINTENANCE'
  ).length;

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const quickDirectoryItems = useMemo(() => {
    const all = [
      {
        id: 'act-receipt',
        title: 'ثبت رسید کالا و ورود رول ورق جدید به انبار',
        subtitle: 'ورود ورق، پیچ و مهره و تخصیص یک رول به چند قرارداد',
        category: 'INVENTORY' as const,
        tags: [
          { label: 'انبار ورق', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'رسید ورود', color: 'bg-slate-100 text-slate-600 border-slate-200' },
        ],
        icon: ArrowDownLeft,
        onClick: () => onNavigateToTab('inventory', 'DASHBOARD', 'RECEIPT'),
      },
      {
        id: 'act-issue',
        title: 'صدور حواله خروج ورق و قطعه به خط تولید',
        subtitle: 'ارسال تمام یا بخشی از رول ورق و قطعات به سالن پرس',
        category: 'INVENTORY' as const,
        tags: [
          { label: 'حواله خط', color: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'کویل‌پک', color: 'bg-slate-100 text-slate-600 border-slate-200' },
        ],
        icon: ArrowUpRight,
        onClick: () => onNavigateToTab('inventory', 'DASHBOARD', 'ISSUE'),
      },
      {
        id: 'act-return',
        title: 'برگشت ورق و ته‌کلاف از خط تولید به انبار',
        subtitle: 'بازگرداندن ته‌کلاف به انبار با حفظ کویل‌پک و قرارداد',
        category: 'INVENTORY' as const,
        tags: [
          { label: 'برگشت از خط', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        ],
        icon: RotateCcw,
        onClick: () => onNavigateToTab('inventory', 'DASHBOARD', 'RETURN'),
      },
      {
        id: 'act-wip',
        title: 'مدیریت ایستگاه‌های کار در جریان ساخت (WIP) و دستورات کار',
        subtitle: `رهگیری ${formatNumber(wipQtyPcs)} قطعه نیمه‌ساخته در ایستگاه‌های برش، پرس و جوش`,
        category: 'WIP' as const,
        tags: [
          { label: 'WIP', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { label: 'خط تولید', color: 'bg-slate-100 text-slate-600 border-slate-200' },
        ],
        icon: Boxes,
        onClick: () => onNavigateToTab('wip'),
      },
      {
        id: 'act-voucher',
        title: 'ثبت روزانه تولید سالم و ضایعات شیفت',
        subtitle: 'ثبت قطعات سالم تولیدشده در ایستگاه‌های پرس و جوشکاری',
        category: 'QUALITY' as const,
        tags: [
          { label: 'ثبت شیفت', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'کنترل کیفیت', color: 'bg-rose-50 text-rose-700 border-rose-200' },
        ],
        icon: CheckCircle2,
        onClick: () => onOpenNewVoucher('PRODUCTION_OUTPUT'),
      },
      {
        id: 'act-mrp',
        title: 'پیش‌بینی نیازمندی مواد (MRP) و سفارشات ساپکو',
        subtitle: `${toPersianDigits(activeOrdersCount)} سفارش فعال — تقاضای کل ${formatNumber(grossDemandPcs)} عدد`,
        category: 'PLANNING' as const,
        tags: [
          { label: 'MRP', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'ساپکو', color: 'bg-amber-50 text-amber-800 border-amber-200' },
        ],
        icon: Building2,
        onClick: () => onNavigateToTab('planning'),
      },
    ];

    return all.filter(item => {
      if (tagFilter !== 'ALL' && item.category !== tagFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tagFilter, searchQuery, wipQtyPcs, activeOrdersCount, grossDemandPcs, onNavigateToTab, onOpenNewVoucher]);

  const filteredStages = useMemo(() => {
    return FACTORY_STAGES.filter(
      s =>
        s.id !== 'STAGE_RAW_STORE' &&
        s.id !== 'STAGE_FINISHED_STORE' &&
        s.id !== 'STAGE_SCRAP_YARD'
    ).filter(stage => {
      const data = stageTotals[stage.id] || { qty: 0, kg: 0 };
      const isBottleneck = stage.id === bottleneckStage.id && data.qty > 0;
      if (onlyBottlenecks && !isBottleneck) return false;
      if (searchQuery.trim()) {
        return stage.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [stageTotals, bottleneckStage.id, onlyBottlenecks, searchQuery]);

  if (!summary) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Dismissible First-Time Guided Learning Banner */}
      <OnboardingBanner
        role={role}
        onQuickAction={act => {
          if (act === 'inventory_receipt') {
            onNavigateToTab('inventory', 'DASHBOARD', 'RECEIPT');
          }
        }}
      />

      {/* Grafana-Inspired Page Header + Unified Flat Search & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                داشبورد عملیاتی و مرکز فرماندهی کارخانه
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                پایش یکپارچه موجودی رول ورق، ایستگاه‌های کار در جریان ساخت (WIP)، تعهدات ساپکو و استثنائات تولید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigateToTab('reports')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              گزارش‌های مدیریتی و OEE
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('inventory', 'DASHBOARD', 'RECEIPT')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              <span>ثبت سریع رسید / سند</span>
            </button>
          </div>
        </div>

        {/* Unified Search & Filter Row (Grafana Template Style — No Nested Sub-Tabs) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در داشبوردها، ایستگاه‌های تولید، عملیات روزانه و هشدارهای کسری..."
              className="w-full bg-slate-50/70 focus:bg-white border border-slate-200/90 focus:border-slate-400 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">فیلتر بر اساس تگ: همه بخش‌ها</option>
                  <option value="INVENTORY">انبار، رول ورق و کویل‌پک</option>
                  <option value="WIP">کار در جریان ساخت (WIP)</option>
                  <option value="PLANNING">برنامه‌ریزی تولید و MRP</option>
                  <option value="QUALITY">تولید روزانه و کیفیت</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white text-slate-600 cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyBottlenecks}
                  onChange={e => setOnlyBottlenecks(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>فقط ایستگاه‌های گلوگاه</span>
              </label>
            </div>

            <div className="text-[11px] text-slate-500">
              نمایش درختی یکپارچه (بدون تب‌های تو در تو)
            </div>
          </div>
        </div>
      </div>

      {/* 4 Main KPI Cards (Uses shared Skeleton with block, circle, text during management summary fetch) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingManagement ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-32 h-3.5" />
                <Skeleton variant="circle" className="w-6 h-6" />
              </div>
              <Skeleton variant="block" className="w-28 h-8" />
              <Skeleton variant="text" className="w-40 h-3" />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton variant="text" className="w-24 h-2.5" />
                <Skeleton variant="text" className="w-16 h-2.5" />
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Card 1: Raw Materials & Coils */}
            <div
              onClick={() => onNavigateToTab('inventory', 'INQUIRY')}
              className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
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
                  موجودی محصول نهایی سالم:{' '}
                  <strong className="font-mono text-slate-900">
                    {formatNumber(finishedGoodsPcs)}
                  </strong>{' '}
                  عدد
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
              className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
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
                  تقاضای کل:{' '}
                  <strong className="font-mono text-slate-900">
                    {formatNumber(grossDemandPcs)}
                  </strong>{' '}
                  عدد قطعه
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
              className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
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
                  تحقق برنامه تولید:{' '}
                  <strong className="font-mono text-slate-900">
                    {toPersianDigits(achievementRate)}%
                  </strong>{' '}
                  ({formatNumber(actualPcs)} از {formatNumber(plannedPcs)})
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>شلوغ‌ترین ایستگاه:</span>
                <strong className="text-slate-800 truncate max-w-[140px]">
                  {bottleneckStage.name}
                </strong>
              </div>
            </div>

            {/* Card 4: Machines & Quality */}
            <div
              onClick={() => onNavigateToTab('machines')}
              className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-2xs"
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
                  مجموع ضایعات ثبت‌شده:{' '}
                  <strong className="font-mono text-slate-900">
                    {formatNumber(scrapPcs)}
                  </strong>{' '}
                  عدد ({formatWeightKg(scrapWeightKg)})
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>در حال تعمیرات / سرویس:</span>
                <strong className="font-mono text-amber-700">
                  {toPersianDigits(maintenanceMachinesCount)} دستگاه
                </strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Grafana-Inspired Expandable Directory Table (Flat Tree of Operations, Stations & Alerts) */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        {/* Table Column Header matching Grafana Reference */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>نام بخش / عملیات و ایستگاه کاری</span>
          <span>تگ‌ها و شاخص وضعیت</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* Folder 1: Daily Operations Launchpad */}
          <div>
            <button
              type="button"
              onClick={() => toggleFolder('shortcuts')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-right"
            >
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                {expandedFolders.shortcuts ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                )}
                <Folder className="w-4 h-4 text-slate-500" />
                <span>میان‌برهای عملیات روزانه انبار و تولید</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {toPersianDigits(quickDirectoryItems.length)} مورد
              </span>
            </button>

            {expandedFolders.shortcuts && (
              <div className="divide-y divide-slate-100 bg-white">
                {quickDirectoryItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={item.onClick}
                      className="pr-10 pl-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-md bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-600 text-slate-600 transition-colors">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-orange-700 transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {item.tags.map((t, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${t.color}`}
                          >
                            {t.label}
                          </span>
                        ))}
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 mr-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Folder 2: WIP Stations Live Queue */}
          <div>
            <button
              type="button"
              onClick={() => toggleFolder('stations')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-right"
            >
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                {expandedFolders.stations ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                )}
                <Folder className="w-4 h-4 text-slate-500" />
                <span>توزیع موجودی نیمه‌ساخته (WIP) در ایستگاه‌های خط تولید</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {toPersianDigits(filteredStages.length)} ایستگاه
              </span>
            </button>

            {expandedFolders.stations && (
              <div className="divide-y divide-slate-100 bg-white">
                {filteredStages.map(stage => {
                  const data = stageTotals[stage.id] || { qty: 0, kg: 0 };
                  const maxWip = Math.max(
                    ...Object.values(stageTotals).map(d => d.qty),
                    100
                  );
                  const percent = Math.min(100, Math.round((data.qty / maxWip) * 100));
                  const isBottleneck =
                    stage.id === bottleneckStage.id && data.qty > 0;

                  return (
                    <div
                      key={stage.id}
                      onClick={() => onNavigateToTab('wip')}
                      className="pr-10 pl-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">
                            {stage.name}
                          </span>
                        </div>
                        <div className="w-full max-w-md bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isBottleneck ? 'bg-orange-500' : 'bg-slate-800'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isBottleneck && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            گلوگاه صف
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
                          {formatWeightKg(data.kg)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {formatNumber(data.qty)} عدد
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Folder 3: Attention & Exceptions */}
          <div>
            <button
              type="button"
              onClick={() => toggleFolder('alerts')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-right"
            >
              <div className="flex items-center gap-2.5 font-semibold text-slate-800">
                {expandedFolders.alerts ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                )}
                <Folder className="w-4 h-4 text-slate-500" />
                <span>موارد نیازمند توجه، قراردادها و گزارش‌های کنترلی</span>
              </div>
              <span className="text-[11px] text-slate-400">۳ مورد</span>
            </button>

            {expandedFolders.alerts && (
              <div className="divide-y divide-slate-100 bg-white">
                <div
                  onClick={() => onNavigateToTab('planning')}
                  className="pr-10 pl-4 py-3 flex items-center justify-between hover:bg-slate-50/90 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        بررسی کفایت موجودی ورق برای سفارشات جاری
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {materialShortageKg > 0
                          ? `مقدار ${formatWeightKg(materialShortageKg)} کسری ورق برای پوشش کامل تقاضای مشتریان شناسایی شده است.`
                          : 'بررسی کفایت موجودی رول‌های ورق و تخصیص ماشین‌آلات پرس برای سفارشات جاری.'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    نیازسنجی MRP
                  </span>
                </div>

                <div
                  onClick={() => onNavigateToTab('inventory', 'CONTRACTS')}
                  className="pr-10 pl-4 py-3 flex items-center justify-between hover:bg-slate-50/90 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSignature className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        کنترل سقف قراردادها و کویل‌پک‌ها
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        مشاهده مانده تعهد قراردادهای ساپکو و مشتریان و رول‌های تخصیص‌یافته
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    امانی ساپکو
                  </span>
                </div>

                <div
                  onClick={() => onNavigateToTab('inventory', 'CUSTOM_REPORTS')}
                  className="pr-10 pl-4 py-3 flex items-center justify-between hover:bg-slate-50/90 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        گزارش سفارشی رول‌ها به تفکیک ضخامت و جنس
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        مشاهده تعداد کل کویل‌ها و مجموع وزن موجود به تفکیک مشخصات فنی کالا
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    گزارش‌ساز
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
