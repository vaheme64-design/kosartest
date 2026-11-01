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
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';

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
    'dashboard' | 'recommendations' | 'orders' | 'approved_plans'
  >('dashboard');

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

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>داشبورد موازنه تقاضا و ظرفیت</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'recommendations'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>تخصیص و اولویت‌بندی ماشین‌آلات</span>
            {suggestions.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeSubTab === 'recommendations'
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {toPersianDigits(suggestions.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>سفارشات مشتریان (ساپکو/سایپا)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeSubTab === 'orders'
                  ? 'bg-slate-950/20 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {toPersianDigits(customerOrders.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('approved_plans')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'approved_plans'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>برنامه‌های مصوب و صدور دستور کار</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeSubTab === 'approved_plans'
                  ? 'bg-slate-950/20 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {toPersianDigits(approvedPlans.length)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlanningData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            ثبت سفارش ساپکو
          </button>
        </div>
      </div>

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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در سفارشات ساپکو، قطعات..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-200 w-64 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="OPEN">سفارشات باز (در حال برنامه‌ریزی)</option>
                <option value="PARTIALLY_FULFILLED">تحویل بخشی</option>
                <option value="FULFILLED">تکمیل شده</option>
              </select>
            </div>

            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              ثبت تعهد تحویل جدید
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.priority === 1
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {order.priority === 1 ? 'اولویت فوری' : 'اولویت عادی'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{order.customerName}</span>
                      <span className="text-slate-500 font-mono">({order.contractNumber})</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      سفارش باز
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      تحویل: {formatToJalali(order.dueDate)}
                    </div>
                  </div>
                </div>

                {/* Order Lines */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">اقلام تعهد تحویل:</div>
                  {order.lines.map(line => (
                    <div
                      key={line.id}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{line.partName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{line.partCode}</div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-amber-400 font-bold">
                          {formatNumber(line.orderedQuantity)}
                        </span>{' '}
                        <span className="text-slate-500 text-[10px]">عدد</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              سوابق برنامه‌های مصوب مدیر تولید و دستور کارهای صادر شده به کارگاه
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              برنامه‌های تأیید شده قابلیت آزادسازی و ایجاد شناسه رسمی Manufacturing Order (MO) در واحد WIP را دارند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedPlans.length === 0 ? (
              <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                هنوز برنامه‌ای به تصویب نرسیده است. از تب «تخصیص و اولویت‌بندی ماشین‌آلات» اقدام به تأیید برنامه‌ها نمایید.
              </div>
            ) : (
              approvedPlans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          {plan.planVersion}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium mt-1">
                        قطعه: {plan.partName} <span className="font-mono text-slate-500">({plan.partCode})</span>
                      </div>
                    </div>

                    <div className="text-left">
                      {plan.approvalStatus === 'CONVERTED_TO_MO' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          صادر شده به دستور کار
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          مصوب مدیر تولید
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">تیراژ خالص مصوب</div>
                      <div className="font-bold text-amber-400 mt-0.5 font-mono">
                        {formatNumber(plan.proposedQuantity)}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">ورق مورد نیاز</div>
                      <div className="font-bold text-slate-200 mt-0.5 font-mono">
                        {formatNumber(plan.materialStatus.requiredWeightKg)} kg
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">موعد تحویل</div>
                      <div className="font-bold text-slate-200 mt-0.5">
                        {formatToJalali(plan.targetDueDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setSelectedSuggestionId(plan.id);
                        setActiveSubTab('recommendations');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                    >
                      مشاهده جزئیات مراحل و ماشین‌ها ←
                    </button>

                    {plan.approvalStatus === 'APPROVED' && (
                      <button
                        onClick={async () => {
                          const res = await handleReleaseMo(plan.id, 'سرپرست برنامه‌ریزی');
                          if (res.success) {
                            alert(`دستور کار کارگاهی با موفقیت صادر شد.`);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        صدور رسمی MO
                      </button>
                    )}

                    {plan.approvalStatus === 'CONVERTED_TO_MO' && plan.createdMoId && (
                      <div className="text-[11px] font-mono text-purple-300 bg-slate-950 px-2 py-1 rounded border border-purple-500/20">
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
