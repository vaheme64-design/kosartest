import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Layers,
  ArrowRightLeft,
  Scale,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Cpu,
} from 'lucide-react';
import {
  ManufacturingOrder,
  ManufacturingOperation,
  WipTransfer,
  WipDashboardMetrics,
} from '../../types/productionWip';
import { Part, Machine, Operator, StageInventorySummary } from '../../types/inventory';
import { WipDashboardView } from './WipDashboardView';
import { ManufacturingOrdersView } from './ManufacturingOrdersView';
import { InterOperationTransfersView } from './InterOperationTransfersView';
import { WipTrackingView } from '../WipTrackingView';
import { CreateMoModal } from './CreateMoModal';
import { OperationInputModal } from './OperationInputModal';
import { OperationProductionModal } from './OperationProductionModal';
import { OperationTransferModal } from './OperationTransferModal';
import { WipReconciliationModal } from './WipReconciliationModal';

export type WipSubTab = 'DASHBOARD' | 'ORDERS' | 'TRANSFERS' | 'STAGES';

interface ProductionWipModuleViewProps {
  parts: Part[];
  machines: Machine[];
  operators: Operator[];
  stageBalances: StageInventorySummary[];
  onGlobalRefresh?: () => Promise<void>;
}

export const ProductionWipModuleView: React.FC<ProductionWipModuleViewProps> = ({
  parts,
  machines,
  operators,
  stageBalances,
  onGlobalRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WipSubTab>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Core WIP State
  const [metrics, setMetrics] = useState<WipDashboardMetrics | null>(null);
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [transfers, setTransfers] = useState<WipTransfer[]>([]);
  const [routings, setRoutings] = useState<any[]>([]);

  // Modal Control States
  const [isCreateMoOpen, setIsCreateMoOpen] = useState(false);
  const [selectedOperationForInput, setSelectedOperationForInput] = useState<ManufacturingOperation | null>(null);
  const [selectedOperationForProd, setSelectedOperationForProd] = useState<ManufacturingOperation | null>(null);
  const [transferModalData, setTransferModalData] = useState<{
    mo: ManufacturingOrder;
    operation: ManufacturingOperation;
  } | null>(null);
  const [reconciliationMoId, setReconciliationMoId] = useState<string | null>(null);

  // Auto-clear notification after 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load All WIP Data
  const loadWipData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, ordersRes, transfersRes, routingsRes] = await Promise.all([
        fetch('/api/wip/dashboard').then(r => r.json()),
        fetch('/api/wip/manufacturing-orders').then(r => r.json()),
        fetch('/api/wip/transfers').then(r => r.json()),
        fetch('/api/routings').then(r => r.json()).catch(() => ({ success: false, data: [] })),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (ordersRes.success) setOrders(ordersRes.data);
      if (transfersRes.success) setTransfers(transfersRes.data);
      if (routingsRes.success) setRoutings(routingsRes.data);
    } catch (err) {
      console.error('Error fetching WIP module data:', err);
      setNotification({ type: 'error', message: 'خطا در بارگذاری اطلاعات کار در جریان (WIP)' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWipData();
  }, [loadWipData]);

  // Handle MO Creation
  const handleCreateMo = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/manufacturing-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          createdBy: 'مهندس حسینی (مدیر تولید)',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ایجاد دستور کار' };
      }

      setNotification({
        type: 'success',
        message: `دستور کار شماره ${data.data.moNumber} با ${data.data.operations.length} مرحله عملیاتی صادر شد.`,
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Input Load
  const handleRegisterInput = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/operations/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت ورودی' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'ورودی به پای دستگاه با موفقیت منتقل شد.',
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Production Output
  const handleRegisterProduction = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/operations/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت تولید' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'عملکرد تولید ثبت و قطعات سالم آماده انتقال شدند.',
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Transfer Dispatch
  const handleCreateTransfer = async (payload: any) => {
    try {
      const res = await fetch('/api/wip/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ارسال حواله' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'حواله انتقال صادر گردید و در وضعیت در حال انتقال قرار گرفت.',
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Transfer Approval
  const handleApproveTransfer = async (transferId: string, notes?: string) => {
    try {
      const res = await fetch(`/api/wip/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedBy: 'سرپرست ایستگاه مقصد', notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در تأیید حواله' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'حواله تحویل شد و به صف ورودی مرحله مقصد اضافه گردید.',
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Transfer Rejection
  const handleRejectTransfer = async (transferId: string, reason: string) => {
    try {
      const res = await fetch(`/api/wip/transfers/${transferId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy: 'بازرس کنترل کیفیت', rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در رد حواله' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'حواله رد شد و قطعات به مرحله مبدأ بازگردانده شدند.',
      });

      await loadWipData();
      if (onGlobalRefresh) await onGlobalRefresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  const navTabs: { id: WipSubTab; label: string; icon: any; count?: number }[] = [
    { id: 'DASHBOARD', label: 'داشبورد WIP و صف ایستگاه‌ها', icon: Boxes },
    { id: 'ORDERS', label: 'دستورهای ساخت و فرآیندها (MO)', icon: Layers, count: orders.length },
    {
      id: 'TRANSFERS',
      label: 'حواله‌ها و رهگیری انتقال بین‌مراحل',
      icon: ArrowRightLeft,
      count: transfers.filter(t => t.status === 'PENDING_APPROVAL').length,
    },
    { id: 'STAGES', label: 'نمای تراز ایستگاهی کارخانه', icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        {navTabs.map(tab => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab 1: WIP Dashboard */}
      {activeSubTab === 'DASHBOARD' && (
        <WipDashboardView
          metrics={metrics}
          orders={orders}
          loading={loading}
          onRefresh={loadWipData}
          onOpenCreateMo={() => setIsCreateMoOpen(true)}
          onOpenTransfer={() => {
            if (orders.length > 0 && orders[0].operations.length > 0) {
              const candidateOp = orders[0].operations.find(o => o.readyForTransferQty > 0) || orders[0].operations[0];
              setTransferModalData({ mo: orders[0], operation: candidateOp });
            } else {
              setNotification({ type: 'error', message: 'ابتدا یک دستور تولید صادر نمایید.' });
            }
          }}
          onSelectMo={mo => {
            setActiveSubTab('ORDERS');
          }}
          onNavigateToOrders={() => setActiveSubTab('ORDERS')}
          onNavigateToTransfers={() => setActiveSubTab('TRANSFERS')}
        />
      )}

      {/* Sub-Tab 2: Manufacturing Orders (MOs) */}
      {activeSubTab === 'ORDERS' && (
        <ManufacturingOrdersView
          orders={orders}
          loading={loading}
          onRefresh={loadWipData}
          onOpenCreateMo={() => setIsCreateMoOpen(true)}
          onOpenInput={op => setSelectedOperationForInput(op)}
          onOpenProduction={op => setSelectedOperationForProd(op)}
          onOpenTransfer={(mo, op) => setTransferModalData({ mo, operation: op })}
          onOpenReconciliation={moId => setReconciliationMoId(moId)}
        />
      )}

      {/* Sub-Tab 3: Transfers In-Transit */}
      {activeSubTab === 'TRANSFERS' && (
        <InterOperationTransfersView
          transfers={transfers}
          loading={loading}
          onRefresh={loadWipData}
          onApproveTransfer={handleApproveTransfer}
          onRejectTransfer={handleRejectTransfer}
        />
      )}

      {/* Sub-Tab 4: Legacy Stage WIP Overview */}
      {activeSubTab === 'STAGES' && (
        <WipTrackingView
          balances={stageBalances}
          parts={parts}
          onOpenTransfer={() => {
            if (orders.length > 0) {
              setTransferModalData({ mo: orders[0], operation: orders[0].operations[0] });
            }
          }}
          onRefresh={onGlobalRefresh || loadWipData}
          loading={loading}
        />
      )}

      {/* Modals */}
      <CreateMoModal
        isOpen={isCreateMoOpen}
        onClose={() => setIsCreateMoOpen(false)}
        parts={parts}
        routings={routings}
        onSubmit={handleCreateMo}
      />

      <OperationInputModal
        isOpen={!!selectedOperationForInput}
        onClose={() => setSelectedOperationForInput(null)}
        operation={selectedOperationForInput}
        machines={machines}
        operators={operators}
        onSubmit={handleRegisterInput}
      />

      <OperationProductionModal
        isOpen={!!selectedOperationForProd}
        onClose={() => setSelectedOperationForProd(null)}
        operation={selectedOperationForProd}
        onSubmit={handleRegisterProduction}
      />

      {transferModalData && (
        <OperationTransferModal
          isOpen={true}
          onClose={() => setTransferModalData(null)}
          mo={transferModalData.mo}
          fromOperation={transferModalData.operation}
          onSubmit={handleCreateTransfer}
        />
      )}

      <WipReconciliationModal
        isOpen={!!reconciliationMoId}
        onClose={() => setReconciliationMoId(null)}
        moId={reconciliationMoId}
      />
    </div>
  );
};
