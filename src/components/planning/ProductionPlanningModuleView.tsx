import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Package,
  Send,
  GitBranch,
  Clock,
  Building2,
  FileText,
  Calculator,
} from 'lucide-react';
import {
  CustomerOrder,
  PartNetRequirement,
  ProductionPlanSuggestion,
  PlanningDashboardMetrics,
} from '../../types/productionPlanning';
import { Part, Machine, DieMold } from '../../types/inventory';
import { PlanningDashboardView } from './PlanningDashboardView';
import { MachineRecommendationView } from './MachineRecommendationView';
import { NewCustomerOrderModal } from './NewCustomerOrderModal';
import { MrpModuleView } from './MrpModuleView';
import { ConsumablesForecastView } from './ConsumablesForecastView';
import { DailyProductionScheduleView } from './DailyProductionScheduleView';
import { ErpProductionWorkbenchView } from '../production/ErpProductionWorkbenchView';
import { ProductionWorkflowDocumentationView } from './ProductionWorkflowDocumentationView';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { PlanningModuleSkeleton } from '../ui/Skeleton';

interface ProductionPlanningModuleViewProps {
  parts: Part[];
  machines: Machine[];
  dies: DieMold[];
  onGlobalRefresh?: () => Promise<void>;
}

export const ProductionPlanningModuleView: React.FC<ProductionPlanningModuleViewProps> = ({
  parts,
  machines,
  dies,
  onGlobalRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'erp_workbench'
    | 'workflow_doc'
    | 'dashboard'
    | 'daily_schedule'
    | 'mrp'
    | 'consumables'
    | 'recommendations'
    | 'orders'
    | 'approved_plans'
  >('erp_workbench');

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<PlanningDashboardMetrics | null>(null);
  const [netRequirements, setNetRequirements] = useState<PartNetRequirement[]>([]);
  const [suggestions, setSuggestions] = useState<ProductionPlanSuggestion[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Search & Filter in Orders
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const loadPlanningData = async () => {
    setLoading(true);
    try {
      const [metricsRes, netRes, sugRes, ordersRes] = await Promise.all([
        fetch('/api/planning/dashboard-metrics').then(r => r.json()),
        fetch('/api/planning/net-requirements').then(r => r.json()),
        fetch('/api/planning/suggestions').then(r => r.json()),
        fetch('/api/planning/customer-orders').then(r => r.json()),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (netRes.success) setNetRequirements(netRes.data);
      if (sugRes.success) {
        setSuggestions(sugRes.data);
        if (!selectedSuggestionId && sugRes.data.length > 0) {
          setSelectedSuggestionId(sugRes.data[0].id);
        }
      }
      if (ordersRes.success) setCustomerOrders(ordersRes.data);
    } catch (err) {
      console.error('Failed to load planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanningData();
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/planning/suggestions/regenerate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadPlanningData();
        if (onGlobalRefresh) await onGlobalRefresh();
      }
    } catch (err) {
      console.error('Failed to regenerate plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomerOrder = async (payload: any) => {
    try {
      const res = await fetch('/api/planning/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت سفارش' };
      }

      await loadPlanningData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای شبکه' };
    }
  };

  const handleApprovePlan = async (id: string, approvedBy: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در تصویب برنامه' };
      }
      await loadPlanningData();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const handleReleaseMo = async (id: string, releasedBy: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/release-mo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releasedBy }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در آزادسازی به MO' };
      }
      await loadPlanningData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true, message: data.message, moId: data.data?.manufacturingOrder?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const handleRevisePlan = async (id: string, changeReason: string) => {
    try {
      const res = await fetch(`/api/planning/suggestions/${id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ایجاد بازنگری' };
      }
      await loadPlanningData();
      return { success: true, message: data.message, newPlanId: data.data?.newPlan?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط' };
    }
  };

  const navigateToRecommendationsForPart = (partId?: string) => {
    if (partId) {
      const matchingSuggestion = suggestions.find(s => s.partId === partId);
      if (matchingSuggestion) {
        setSelectedSuggestionId(matchingSuggestion.id);
      }
    }
    setActiveSubTab('recommendations');
  };

  const filteredOrders = customerOrders.filter(o => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    if (orderSearchTerm) {
      const q = orderSearchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.contractNumber.toLowerCase().includes(q) ||
        o.lines.some(l => l.partName.toLowerCase().includes(q) || l.partCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const approvedPlans = suggestions.filter(
    s => s.approvalStatus === 'APPROVED' || s.approvalStatus === 'CONVERTED_TO_MO'
  );

  const [planToast, setPlanToast] = useState<string | null>(null);

  if (loading && !metrics && suggestions.length === 0 && customerOrders.length === 0) {
    return <PlanningModuleSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Grafana-Inspired Header & Flat Section Selector Bar */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900">
                برنامه‌ریزی تولید، نیازسنجی مواد (MRP) و ظرفیت خطوط
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                موازنه سفارشات خودروسازان با موجودی آزاد ورق، پیش‌بینی مواد مصرفی و صدور دستور کار کارگاهی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={loadPlanningData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              <span>ثبت سفارش ساپکو / مشتری</span>
            </button>
          </div>
        </div>

        {/* Single Flat Section Filter Bar (Grafana Style — No Crowded Multi-Row Tabs) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-slate-500 font-medium">نمای بخش برنامه‌ریزی:</span>
              <select
                value={activeSubTab}
                onChange={e => setActiveSubTab(e.target.value as any)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="erp_workbench">
                  میز کار ۵ مرحله‌ای تولید (SAP / Odoo — ۵,۰۰۰ عدد تا انتقال مانده روزانه)
                </option>
                <option value="workflow_doc">
                  مستند فنی و جریان فرآیند تولید (Workflow استاندارد SAP PP)
                </option>
                <option value="dashboard">داشبورد موازنه تقاضا و ظرفیت</option>
                <option value="daily_schedule">برنامه روزانه شرکت به تفکیک سالن (Daily Dispatch)</option>
                <option value="mrp">پیش‌بینی نیاز مواد و موازنه کلاف (MRP)</option>
                <option value="consumables">پیش‌بینی مواد مصرفی کارگاه (ROP)</option>
                <option value="recommendations">
                  تخصیص ماشین‌آلات و پیشنهاد برنامه ({toPersianDigits(suggestions.length)})
                </option>
                <option value="orders">
                  سفارشات مشتریان ({toPersianDigits(customerOrders.length)})
                </option>
                <option value="approved_plans">
                  برنامه‌های مصوب و صدور MO ({toPersianDigits(approvedPlans.length)})
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'erp_workbench', label: 'میز کار ۵ مرحله‌ای (SAP / Odoo)' },
                { id: 'workflow_doc', label: 'جریان فرآیند SAP PP' },
                { id: 'dashboard', label: 'موازنه تقاضا' },
                { id: 'daily_schedule', label: 'برنامه روزانه سالن' },
                { id: 'mrp', label: 'نیازسنجی MRP' },
                { id: 'consumables', label: 'مواد مصرفی' },
                { id: 'recommendations', label: 'تخصیص پرس‌ها' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSubTab(item.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                    activeSubTab === item.id
                      ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            پیشنهادهای فعال: {toPersianDigits(suggestions.length)} • سفارشات باز: {toPersianDigits(customerOrders.length)}
          </div>
        </div>
      </div>

      {planToast && (
        <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{planToast}</span>
          </div>
          <button type="button" onClick={() => setPlanToast(null)} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tab 0: ERP 5-Stage Workbench (SAP PP / Odoo MRP / Daily Roll-Forward) */}
      {activeSubTab === 'erp_workbench' && (
        <ErpProductionWorkbenchView parts={parts} routings={[]} onRefreshData={loadPlanningData} />
      )}

      {/* Sub-Tab: SAP PP Production Workflow Documentation */}
      {activeSubTab === 'workflow_doc' && <ProductionWorkflowDocumentationView />}

      {/* 1. Dashboard Sub-Tab */}
      {activeSubTab === 'dashboard' && (
        <PlanningDashboardView
          metrics={metrics}
          netRequirements={netRequirements}
          machines={machines}
          onRegenerate={handleRegenerate}
          onOpenNewOrderModal={() => setIsOrderModalOpen(true)}
          onNavigateToRecommendations={navigateToRecommendationsForPart}
          loading={loading}
        />
      )}

      {/* 1.0. Daily Production Schedule Sub-Tab (برنامه روزانه شرکت به تفکیک سالن) */}
      {activeSubTab === 'daily_schedule' && (
        <DailyProductionScheduleView />
      )}

      {/* 1.1. MRP & Material Requirements Forecast Sub-Tab */}
      {activeSubTab === 'mrp' && (
        <MrpModuleView onRefreshGlobal={onGlobalRefresh} />
      )}

      {/* 1.2. Consumables & Shop-Floor Supplies Forecast Sub-Tab */}
      {activeSubTab === 'consumables' && (
        <ConsumablesForecastView />
      )}

      {/* 2. Machine Recommendations Sub-Tab */}
      {activeSubTab === 'recommendations' && (
        <MachineRecommendationView
          suggestions={suggestions}
          selectedSuggestionId={selectedSuggestionId}
          onSelectSuggestion={setSelectedSuggestionId}
          onApprovePlan={handleApprovePlan}
          onReleaseMo={handleReleaseMo}
          onRevisePlan={handleRevisePlan}
          onRefresh={loadPlanningData}
          loading={loading}
        />
      )}

      {/* 3. Customer Orders Sub-Tab */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در سفارشات ساپکو، قطعات..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 w-64 focus:outline-none focus:border-slate-900"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="OPEN">سفارشات باز (در حال برنامه‌ریزی)</option>
                <option value="PARTIALLY_FULFILLED">تحویل بخشی</option>
                <option value="FULFILLED">تکمیل شده</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت تعهد تحویل جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.priority === 1
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.priority === 1 ? 'اولویت فوری' : 'اولویت عادی'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customerName}</span>
                      <span className="text-slate-400">({order.contractNumber})</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      سفارش باز
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      تحویل: {formatToJalali(order.dueDate)}
                    </div>
                  </div>
                </div>

                {/* Order Lines */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">اقلام تعهد تحویل:</div>
                  {order.lines.map(line => (
                    <div
                      key={line.id}
                      className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{line.partName}</div>
                        <div className="text-[11px] text-slate-500">{line.partCode}</div>
                      </div>
                      <div className="text-left tabular-nums">
                        <span className="text-slate-900 font-bold">
                          {formatNumber(line.orderedQuantity)}
                        </span>{' '}
                        <span className="text-slate-500 text-[10px]">عدد</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    یادداشت: {order.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Approved Plans Sub-Tab */}
      {activeSubTab === 'approved_plans' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              سوابق برنامه‌های مصوب مدیر تولید و دستور کارهای صادر شده به کارگاه
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              برنامه‌های تأیید شده قابلیت آزادسازی و ایجاد شناسه رسمی دستور کار (MO) در واحد WIP را دارند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedPlans.length === 0 ? (
              <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                هنوز برنامه‌ای به تصویب نرسیده است. از تب «تخصیص ماشین‌آلات و پیشنهاد برنامه» اقدام به تأیید برنامه‌ها نمایید.
              </div>
            ) : (
              approvedPlans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {plan.planVersion}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium mt-1">
                        قطعه: {plan.partName} <span className="text-slate-400">({plan.partCode})</span>
                      </div>
                    </div>

                    <div className="text-left">
                      {plan.approvalStatus === 'CONVERTED_TO_MO' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          صادر شده به دستور کار
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          مصوب مدیر تولید
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">تیراژ خالص مصوب</div>
                      <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                        {formatNumber(plan.proposedQuantity)}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">ورق مورد نیاز</div>
                      <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                        {formatNumber(plan.materialStatus.requiredWeightKg)} kg
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-500">موعد تحویل</div>
                      <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                        {formatToJalali(plan.targetDueDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSuggestionId(plan.id);
                        setActiveSubTab('recommendations');
                      }}
                      className="text-xs text-slate-700 hover:text-slate-950 font-semibold cursor-pointer"
                    >
                      مشاهده جزئیات مراحل و ماشین‌ها ←
                    </button>

                    {plan.approvalStatus === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await handleReleaseMo(plan.id, 'سرپرست برنامه‌ریزی');
                          if (res.success) {
                            setPlanToast('دستور کار کارگاهی (MO) با موفقیت صادر و به واحد WIP ارسال شد.');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>صدور رسمی MO</span>
                      </button>
                    )}

                    {plan.approvalStatus === 'CONVERTED_TO_MO' && plan.createdMoId && (
                      <div className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                        MO: {plan.createdMoId}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New Customer Order Modal */}
      <NewCustomerOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        parts={parts}
        onSubmit={handleCreateCustomerOrder}
      />
    </div>
  );
};
