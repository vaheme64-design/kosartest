import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Search,
  FileText,
  ScrollText,
  Layers,
  FilePlus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Part,
  WarehouseDefinition,
  DetailedStockBalance,
  InventoryDocument,
  SapcoContract,
  SapcoContractLedgerEntry,
  InventoryDashboardMetrics,
  StageInventorySummary,
  WAREHOUSES_LIST,
} from '../../types/inventory';
import { InventoryDashboard } from './InventoryDashboard';
import { StockInquiryView } from './StockInquiryView';
import { MovementHistoryView } from './MovementHistoryView';
import { SapcoAccountReportView } from './SapcoAccountReportView';
import { InventoryReportView } from '../InventoryReportView';
import { ReceiptFormModal } from './ReceiptFormModal';
import { IssueFormModal } from './IssueFormModal';
import { TransferFormModal } from './TransferFormModal';
import { AdjustmentFormModal } from './AdjustmentFormModal';

export type InventorySubTab = 'DASHBOARD' | 'INQUIRY' | 'MOVEMENT' | 'SAPCO' | 'STAGES';

interface InventoryModuleViewProps {
  parts: Part[];
  stageBalances: StageInventorySummary[];
  currentUser: {
    uid: string;
    displayName: string;
    role: string;
  };
  onGlobalRefresh?: () => Promise<void>;
}

export const InventoryModuleView: React.FC<InventoryModuleViewProps> = ({
  parts,
  stageBalances,
  currentUser,
  onGlobalRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Core Inventory Data
  const [metrics, setMetrics] = useState<InventoryDashboardMetrics | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseDefinition[]>(WAREHOUSES_LIST);
  const [balances, setBalances] = useState<DetailedStockBalance[]>([]);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [contracts, setContracts] = useState<SapcoContract[]>([]);
  const [sapcoLedger, setSapcoLedger] = useState<SapcoContractLedgerEntry[]>([]);

  // Modal States
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  // Auto-clear notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Inventory Data
  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, whRes, inquiryRes, docsRes, sapcoRes] = await Promise.all([
        fetch('/api/inventory/dashboard-metrics').then(r => r.json()),
        fetch('/api/inventory/warehouses').then(r => r.json()),
        fetch('/api/inventory/stock-inquiry').then(r => r.json()),
        fetch('/api/inventory/documents').then(r => r.json()),
        fetch('/api/inventory/sapco-account').then(r => r.json()),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (whRes.success && whRes.data.length > 0) setWarehouses(whRes.data);
      if (inquiryRes.success) setBalances(inquiryRes.data);
      if (docsRes.success) setDocuments(docsRes.data);
      if (sapcoRes.success) {
        setContracts(sapcoRes.data.contracts || []);
        setSapcoLedger(sapcoRes.data.ledger || []);
      }
    } catch (err) {
      console.error('Error fetching inventory module data:', err);
      setNotification({ type: 'error', message: 'خطا در بارگذاری اطلاعات جامع انبارداری' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Handle Document Creation from Modals
  const handleCreateDocument = async (payload: any) => {
    try {
      const enrichedPayload = {
        ...payload,
        createdByUid: currentUser.uid,
        createdByName: currentUser.displayName,
      };

      const res = await fetch('/api/inventory/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت سند انبار' };
      }

      setNotification({
        type: 'success',
        message: data.message || `سند شماره ${data.data.documentNumber} با موفقیت ثبت و کاردکس به‌روزرسانی شد.`,
      });

      await loadInventoryData();
      if (onGlobalRefresh) await onGlobalRefresh();

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  // Handle Reversal of Document
  const handleReverseDocument = async (documentId: string, reason: string) => {
    try {
      const res = await fetch(`/api/inventory/documents/${documentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          reversedByUid: currentUser.uid,
          reversedByName: currentUser.displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'خطا در ابطال سند' };
      }

      setNotification({
        type: 'success',
        message: data.message || 'سند معکوس صادر شد و وضعیت سند اصلی به ابطال‌شده تغییر یافت.',
      });

      await loadInventoryData();
      if (onGlobalRefresh) await onGlobalRefresh();

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'خطا در ارتباط با سرور' };
    }
  };

  const navTabs: { id: InventorySubTab; label: string; icon: any }[] = [
    { id: 'DASHBOARD', label: 'داشبورد انبار', icon: Boxes },
    { id: 'INQUIRY', label: 'استعلام تفصیلی موجودی', icon: Search },
    { id: 'MOVEMENT', label: 'دفاتر کاردکس و اسناد', icon: FileText },
    { id: 'SAPCO', label: 'حسابداری سهمیه ساپکو', icon: ScrollText },
    { id: 'STAGES', label: 'گردش ایستگاه‌ها و WIP', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-800/80 p-4 lg:p-5 rounded-2xl border border-slate-700/80 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
                سیستم جامع مدیریت و کنترل موجودی انبارها (KPIMS Inventory)
              </h1>
              <p className="text-xs text-slate-400">
                محاسبه بلادرنگ دفاتر کاردکس، تفکیک کلاف‌های امانی ساپکو، صدور اسناد ورود/خروج و کنترل مانده منفی
              </p>
            </div>
          </div>
        </div>

        {/* 4 Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>رسید کالا / مواد</span>
          </button>
          <button
            onClick={() => setIsIssueOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/30 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>حواله خروج / مصرف</span>
          </button>
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/30 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>انتقال بین‌انباری</span>
          </button>
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>تعدیل انبارگردانی</span>
          </button>
        </div>
      </div>

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
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab 1: Dashboard */}
      {activeSubTab === 'DASHBOARD' && (
        <InventoryDashboard
          metrics={metrics}
          contracts={contracts}
          warehouses={warehouses}
          balances={balances}
          loading={loading}
          onRefresh={loadInventoryData}
          onOpenReceipt={() => setIsReceiptOpen(true)}
          onOpenIssue={() => setIsIssueOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenAdjustment={() => setIsAdjustmentOpen(true)}
          onNavigateToInquiry={() => setActiveSubTab('INQUIRY')}
          onNavigateToSapco={() => setActiveSubTab('SAPCO')}
          onNavigateToLedger={() => setActiveSubTab('MOVEMENT')}
        />
      )}

      {/* Sub-Tab 2: Stock Inquiry */}
      {activeSubTab === 'INQUIRY' && (
        <StockInquiryView
          balances={balances}
          parts={parts}
          warehouses={warehouses}
          loading={loading}
          onRefresh={loadInventoryData}
        />
      )}

      {/* Sub-Tab 3: Movement Ledger */}
      {activeSubTab === 'MOVEMENT' && (
        <MovementHistoryView
          documents={documents}
          warehouses={warehouses}
          loading={loading}
          onRefresh={loadInventoryData}
          onReverseDocument={handleReverseDocument}
        />
      )}

      {/* Sub-Tab 4: SAPCO Quota Account */}
      {activeSubTab === 'SAPCO' && (
        <SapcoAccountReportView
          contracts={contracts}
          ledger={sapcoLedger}
          loading={loading}
          onRefresh={loadInventoryData}
        />
      )}

      {/* Sub-Tab 5: Multi-Stage WIP Balances (Legacy Stage View) */}
      {activeSubTab === 'STAGES' && (
        <InventoryReportView
          balances={stageBalances}
          onRefresh={onGlobalRefresh || loadInventoryData}
          loading={loading}
        />
      )}

      {/* Modals */}
      <ReceiptFormModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        parts={parts}
        warehouses={warehouses}
        contracts={contracts}
        onSubmit={handleCreateDocument}
      />

      <IssueFormModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        parts={parts}
        warehouses={warehouses}
        balances={balances}
        onSubmit={handleCreateDocument}
      />

      <TransferFormModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        parts={parts}
        warehouses={warehouses}
        balances={balances}
        onSubmit={handleCreateDocument}
      />

      <AdjustmentFormModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        parts={parts}
        warehouses={warehouses}
        balances={balances}
        onSubmit={handleCreateDocument}
      />
    </div>
  );
};
