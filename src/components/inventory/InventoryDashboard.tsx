import React from 'react';
import {
  Boxes,
  Scale,
  ShieldCheck,
  Clock,
  FilePlus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  FileEdit,
  AlertTriangle,
  ScrollText,
  Warehouse,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  InventoryDashboardMetrics,
  DetailedStockBalance,
  SapcoContract,
  WarehouseDefinition,
} from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits, formatDateTime } from '../../utils/formatters';

interface InventoryDashboardProps {
  metrics: InventoryDashboardMetrics | null;
  contracts: SapcoContract[];
  warehouses: WarehouseDefinition[];
  balances: DetailedStockBalance[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenReceipt: () => void;
  onOpenIssue: () => void;
  onOpenTransfer: () => void;
  onOpenAdjustment: () => void;
  onNavigateToInquiry: () => void;
  onNavigateToSapco: () => void;
  onNavigateToLedger: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  metrics,
  contracts,
  warehouses,
  balances,
  loading,
  onRefresh,
  onOpenReceipt,
  onOpenIssue,
  onOpenTransfer,
  onOpenAdjustment,
  onNavigateToInquiry,
  onNavigateToSapco,
  onNavigateToLedger,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-white">
                سامانه مدیریت و کاردکس انبار قطعات و ورق (KPIMS Inventory)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                محاسبه بر مبنای اسناد قطعی‌شده، کنترل عدم منفی‌شدن موجودی، تفکیک مالکیت امانی ساپکو و رهگیری کلاف‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            onClick={onOpenReceipt}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>رسید کالا / ورق</span>
          </button>
          <button
            onClick={onOpenIssue}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/30 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>حواله مصرف</span>
          </button>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/30 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>انتقال بین انبارها</span>
          </button>
          <button
            onClick={onOpenAdjustment}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-600 cursor-pointer"
          >
            <FileEdit className="w-4 h-4" />
            <span>تعدیل انبارگردانی</span>
          </button>
        </div>
      </div>

      {/* Main KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Stock Card */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/70 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">موجودی فیزیکی کل کارخانه</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono">
            {formatWeightKg(metrics?.totalPhysicalKg || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>قطعات و مجموعه‌ها:</span>
            <span className="font-mono text-blue-400 font-semibold">
              {formatNumber(metrics?.totalPhysicalPcs || 0)} عدد
            </span>
          </div>
        </div>

        {/* Available Stock Card */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/70 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">موجودی آزاد و قابل تخصیص</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 font-mono">
            {formatWeightKg(metrics?.totalAvailableKg || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>آزاد جهت تولید:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatNumber(metrics?.totalAvailablePcs || 0)} عدد
            </span>
          </div>
        </div>

        {/* SAPCO Consignment Stock Card */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/70 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">ورق امانی ساپکو (تامین‌کننده)</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <ScrollText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-amber-400 font-mono">
            {formatWeightKg(metrics?.totalSapcoConsignmentKg || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>مالکیت شرکتی کارخانه:</span>
            <span className="font-mono text-slate-300 font-semibold">
              {formatWeightKg(metrics?.totalCompanyOwnedKg || 0)}
            </span>
          </div>
        </div>

        {/* Reserved & Blocked Stock Card */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/70 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">رزرو شده / قرنطینه کیفی</span>
            <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-purple-400 font-mono">
            {formatWeightKg(metrics?.totalReservedKg || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>بلوکه کیفی / قرنطینه:</span>
            <span className="font-mono text-rose-400 font-semibold">
              {formatWeightKg(metrics?.totalQualityBlockedKg || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Warehouse Status Grid & Contracts Glance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouses Summary (2 cols) */}
        <div className="lg:col-span-2 bg-slate-800/60 rounded-2xl border border-slate-700/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              وضعیت انبارهای کارخانه و توزیع فیزیکی موجودی
            </h2>
            <button
              onClick={onNavigateToInquiry}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده کاردکس تفصیلی</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warehouses.map(wh => {
              const whBalances = balances.filter(b => b.warehouseId === wh.id);
              const totalKg = whBalances.reduce((sum, b) => sum + b.physicalKg, 0);
              const totalPcs = whBalances.reduce((sum, b) => (b.unit === 'PCS' ? sum + b.physicalQty : sum), 0);
              const lotsCount = new Set(whBalances.map(b => b.lotNumber).filter(Boolean)).size;

              return (
                <div
                  key={wh.id}
                  className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{wh.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {wh.code}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-base font-bold text-white font-mono">
                        {formatWeightKg(totalKg)}
                      </span>
                      {totalPcs > 0 && (
                        <span className="text-xs text-slate-400 font-mono">
                          ({formatNumber(totalPcs)} عدد)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>سرپرست: {wh.managerName || '—'}</span>
                    <span>{lotsCount > 0 ? `${lotsCount} رول/بچ فعال` : `${wh.locations.length} موقعیت`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SAPCO Active Contracts Glance (1 col) */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-400" />
                سهمیه‌های فعال ورق ساپکو
              </h2>
              <button
                onClick={onNavigateToSapco}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                دفتر سهمیه‌ها
              </button>
            </div>

            <div className="space-y-3">
              {contracts.slice(0, 3).map(c => {
                const consumedPercent = c.allocatedWeightKg > 0
                  ? Math.round((c.totalConsumedKg / c.allocatedWeightKg) * 100)
                  : 0;

                return (
                  <div key={c.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{c.contractNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {c.materialGrade}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">{c.title}</div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>مانده موجودی: {formatWeightKg(c.closingBalanceKg)}</span>
                        <span>{toPersianDigits(consumedPercent)}٪ مصرف سهمیه</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            consumedPercent > 80 ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, consumedPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={onNavigateToSapco}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>مشاهده صورتحساب کامل ساپکو</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Business Rules Reminder Strip */}
      <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>اصول کنترل کیفیت و انبارداری KPIMS:</strong> عدم ثبت موجودی منفی، ثبت اتمیک تراکنش‌ها در سرور، تفکیک رول‌های امانی ساپکو و ثبت اصلاحات با صدور سند معکوس جبرانی.
          </span>
        </div>
        <button
          onClick={onNavigateToLedger}
          className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
        >
          دفتر روزنامه تراکنش‌ها
        </button>
      </div>
    </div>
  );
};
