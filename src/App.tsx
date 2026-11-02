import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabKey } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsVouchersView } from './components/TransactionsVouchersView';
import { InventoryModuleView, InventorySubTab } from './components/inventory/InventoryModuleView';
import { PartsView } from './components/PartsView';
import { RoutingsView } from './components/RoutingsView';
import { MachinesView } from './components/MachinesView';
import { UserManagementView } from './components/UserManagementView';
import { SapcoMaterialsView } from './components/SapcoMaterialsView';
import { ProductionWipModuleView } from './components/wip/ProductionWipModuleView';
import { ProductionPlanningModuleView } from './components/planning/ProductionPlanningModuleView';
import { ManagementReportsModuleView } from './components/reports/ManagementReportsModuleView';
import { ErpSyncModal } from './components/ErpSyncModal';

import {
  Part,
  Machine,
  Routing,
  InventoryTransaction,
  UserRoleProfile,
  VoucherType,
  DieMold,
  Operator,
  FactoryHall,
  ProductionPlan,
  SapcoCoilReceipt,
} from './types/inventory';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeInventorySubTab, setActiveInventorySubTab] = useState<InventorySubTab>('DASHBOARD');
  const [pendingInventoryModal, setPendingInventoryModal] = useState<
    'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER' | null
  >(null);

  const [initialVoucherType, setInitialVoucherType] = useState<VoucherType>('RECEIPT');
  const [initialPartId, setInitialPartId] = useState<string | undefined>(undefined);
  const [initialStageId, setInitialStageId] = useState<string | undefined>(undefined);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Core Data
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dies, setDies] = useState<DieMold[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [halls, setHalls] = useState<FactoryHall[]>([]);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [coils, setCoils] = useState<SapcoCoilReceipt[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Auth & Role
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRoleProfile>({
    uid: 'USR-PROD-01',
    email: 'admin.factory@sapco-supplier.ir',
    displayName: 'مهندس حسینی (مدیر تولید)',
    role: 'ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        setFirebaseUser(user);
        if (user) {
          setCurrentUser(prev => ({
            ...prev,
            uid: user.uid,
            email: user.email || prev.email,
            displayName: user.displayName || prev.displayName,
          }));
        }
      },
      () => {
        setFirebaseUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch all data from server
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        sumRes,
        txRes,
        partsRes,
        machinesRes,
        routingsRes,
        diesRes,
        opsRes,
        hallsRes,
        plansRes,
        coilsRes,
      ] = await Promise.all([
        fetch('/api/inventory/summary').then(r => r.json()),
        fetch('/api/inventory/transactions').then(r => r.json()),
        fetch('/api/parts').then(r => r.json()),
        fetch('/api/machines').then(r => r.json()),
        fetch('/api/routings').then(r => r.json()),
        fetch('/api/dies').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/operators').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/halls').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/planning').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/sapco/coils').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (partsRes.success) setParts(partsRes.data);
      if (machinesRes.success) setMachines(machinesRes.data);
      if (routingsRes.success) setRoutings(routingsRes.data);
      if (diesRes.success) setDies(diesRes.data);
      if (opsRes.success) setOperators(opsRes.data);
      if (hallsRes.success) setHalls(hallsRes.data);
      if (plansRes.success) setPlans(plansRes.data);
      if (coilsRes.success) setCoils(coilsRes.data);
    } catch (err) {
      console.error('Error fetching data from server:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Voucher Submission
  const handleSubmitVoucher = async (payload: any) => {
    try {
      const enrichedPayload = {
        ...payload,
        createdByUid: currentUser.uid,
        createdByName: currentUser.displayName,
      };

      const res = await fetch('/api/inventory/validate-and-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت سند در سرور');
      }

      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'خطای ارتباط با سرور',
      };
    }
  };

  // Master Data Save/Update
  const handleSavePart = async (partData: Partial<Part>) => {
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت قطعه');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت قطعه';
      return { success: false, error: msg };
    }
  };

  const handleSaveMachine = async (mchData: Partial<Machine>) => {
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mchData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت ماشین');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت ماشین';
      return { success: false, error: msg };
    }
  };

  const handleSaveDie = async (dieData: Partial<DieMold>) => {
    try {
      const res = await fetch('/api/dies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dieData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت قالب');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت قالب';
      return { success: false, error: msg };
    }
  };

  const handleDeleteDie = async (id: string) => {
    try {
      const res = await fetch(`/api/dies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در حذف قالب');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف قالب';
      return { success: false, error: msg };
    }
  };

  const handleSaveOperator = async (opData: Partial<Operator>) => {
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت اپراتور');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت اپراتور';
      return { success: false, error: msg };
    }
  };

  const handleSaveHall = async (hallData: Partial<FactoryHall>) => {
    try {
      const res = await fetch('/api/halls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hallData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت سالن');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت سالن';
      return { success: false, error: msg };
    }
  };

  const handleSaveRouting = async (routingData: Partial<Routing>) => {
    try {
      const res = await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت مسیر تولید');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت مسیر تولید';
      return { success: false, error: msg };
    }
  };

  const handleDeleteRouting = async (routingId: string) => {
    try {
      const res = await fetch(`/api/routings/${routingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در حذف مسیر');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف مسیر';
      return { success: false, error: msg };
    }
  };

  // Demo Data Reset & Clean Handlers
  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demo-data/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demo-data/clean', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVoucherWithType = (type: string, partId?: string, stageId?: string) => {
    setInitialVoucherType(type as VoucherType);
    setInitialPartId(partId);
    setInitialStageId(stageId);
    setActiveTab('production');
  };

  const handleDeepNavigate = (
    tab: any,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => {
    if (tab === 'vouchers') setActiveTab('production');
    else if (tab === 'parts') setActiveTab('master_data');
    else if (tab === 'audit') setActiveTab('reports');
    else if (tab === 'users') setActiveTab('settings');
    else setActiveTab(tab);

    if (subTab) {
      setActiveInventorySubTab(subTab);
    }
    if (actionModal) {
      setPendingInventoryModal(actionModal);
    }
  };

  // Compute top-level reorder alert summary counts for Navbar & Sidebar badges
  const stageBalancesList: any[] = summary?.stageBalances || [];
  let reorderAlertsCount = 0;
  let criticalAlertsCount = 0;
  parts.forEach(part => {
    if (typeof part.minStock === 'number' && part.minStock > 0) {
      const matchingStages = stageBalancesList.filter(
        sb => (sb.partId === part.id || sb.partCode === part.code) && sb.stageId !== 'STAGE_SCRAP_YARD'
      );
      const currentStock = matchingStages.reduce(
        (sum, sb) => sum + (part.unit === 'KG' ? sb.totalKg || sb.usableQty : sb.usableQty),
        0
      );
      if (currentStock < part.minStock) {
        reorderAlertsCount++;
        const coverage = Math.round((currentStock / part.minStock) * 100);
        if (currentStock <= 0 || coverage <= 25) {
          criticalAlertsCount++;
        }
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navbar with Global Command Search & Role Switcher */}
      <Navbar
        currentUser={currentUser}
        parts={parts}
        coilsCount={coils.length}
        reorderAlertsCount={reorderAlertsCount}
        criticalAlertsCount={criticalAlertsCount}
        onRoleChange={role => setCurrentUser(prev => ({ ...prev, role }))}
        onNavigate={handleDeepNavigate}
        onSeedDemo={handleSeedDemo}
        onCleanDemo={handleCleanDemo}
        onOpenErpModal={() => setIsErpModalOpen(true)}
        loading={loading}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Grouped, Collapsible, Role-Aware Sidebar */}
        <Sidebar
          activeTab={activeTab}
          activeInventorySubTab={activeInventorySubTab}
          onTabChange={(tab, invSubTab) => {
            setActiveTab(tab);
            if (invSubTab) setActiveInventorySubTab(invSubTab);
          }}
          currentRole={currentUser.role}
          partsCount={parts.length}
          txCount={transactions.length}
          plansCount={plans.length}
          coilsCount={coils.length}
          reorderAlertsCount={reorderAlertsCount}
        />

        {/* Content Area */}
        <main className="flex-1 p-5 md:p-7 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* 1. Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              summary={summary}
              recentTransactions={transactions}
              machines={machines}
              onNavigateToTab={handleDeepNavigate}
              onOpenNewVoucher={handleOpenVoucherWithType}
            />
          )}

          {/* 2. Master Data (Parts & Routings) */}
          {activeTab === 'master_data' && (
            <div className="space-y-6">
              <PartsView parts={parts} onSavePart={handleSavePart} />
              <div className="pt-6 border-t border-slate-200">
                <RoutingsView
                  routings={routings}
                  parts={parts}
                  machines={machines}
                  dies={dies}
                  onSaveRouting={handleSaveRouting}
                  onDeleteRouting={handleDeleteRouting}
                  onDirectProduce={partId => {
                    handleOpenVoucherWithType('PRODUCTION_OUTPUT', partId);
                  }}
                />
              </div>
            </div>
          )}

          {/* 3. Inventory Management Module */}
          {activeTab === 'inventory' && (
            <InventoryModuleView
              parts={parts}
              stageBalances={summary?.stageBalances || []}
              currentUser={{
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                role: currentUser.role,
              }}
              initialSubTab={activeInventorySubTab}
              initialActionModal={pendingInventoryModal}
              onClearInitialAction={() => setPendingInventoryModal(null)}
              onGlobalRefresh={loadAllData}
              onNavigateToPlanning={() => setActiveTab('planning')}
            />
          )}

          {/* 4. Production */}
          {activeTab === 'production' && (
            <TransactionsVouchersView
              parts={parts}
              machines={machines}
              dies={dies}
              operators={operators}
              stageBalances={summary?.stageBalances || []}
              initialVoucherType={initialVoucherType}
              initialPartId={initialPartId}
              initialStageId={initialStageId}
              onSubmitVoucher={handleSubmitVoucher}
            />
          )}

          {/* 5. Production Execution & WIP Module */}
          {activeTab === 'wip' && (
            <ProductionWipModuleView
              parts={parts}
              machines={machines}
              operators={operators}
              stageBalances={summary?.stageBalances || []}
              onGlobalRefresh={loadAllData}
            />
          )}

          {/* 6. Production Planning Engine */}
          {activeTab === 'planning' && (
            <ProductionPlanningModuleView
              parts={parts}
              machines={machines}
              dies={dies}
              onGlobalRefresh={loadAllData}
            />
          )}

          {/* 7. Machines and Capacity */}
          {activeTab === 'machines' && (
            <MachinesView
              machines={machines}
              dies={dies}
              operators={operators}
              halls={halls}
              parts={parts}
              onSaveMachine={handleSaveMachine}
              onSaveDie={handleSaveDie}
              onDeleteDie={handleDeleteDie}
              onSaveOperator={handleSaveOperator}
              onSaveHall={handleSaveHall}
            />
          )}

          {/* 8. SAPCO Materials */}
          {activeTab === 'sapco' && (
            <SapcoMaterialsView
              coils={coils}
              parts={parts}
              onRefresh={loadAllData}
              loading={loading}
            />
          )}

          {/* 9. Management Reporting & Control Module */}
          {activeTab === 'reports' && (
            <ManagementReportsModuleView
              parts={parts}
              machines={machines}
            />
          )}

          {/* 10. Users and Settings */}
          {activeTab === 'settings' && (
            <UserManagementView
              currentUser={currentUser}
              onRoleChange={role => setCurrentUser(prev => ({ ...prev, role }))}
              firebaseUser={firebaseUser}
            />
          )}
        </main>
      </div>

      {/* ERP Sync Modal */}
      <ErpSyncModal
        isOpen={isErpModalOpen}
        onClose={() => setIsErpModalOpen(false)}
        partsCount={parts.length}
        txCount={transactions.length}
      />
    </div>
  );
}
