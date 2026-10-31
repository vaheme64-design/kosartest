import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabKey } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsVouchersView } from './components/TransactionsVouchersView';
import { InventoryReportView } from './components/InventoryReportView';
import { PartsView } from './components/PartsView';
import { RoutingsView } from './components/RoutingsView';
import { MachinesView } from './components/MachinesView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { UserManagementView } from './components/UserManagementView';
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
} from './types/inventory';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
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
    const unsubscribe = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
      if (user) {
        setCurrentUser(prev => ({
          ...prev,
          uid: user.uid,
          email: user.email || prev.email,
          displayName: user.displayName || prev.displayName,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all data from server
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, txRes, partsRes, machinesRes, routingsRes, diesRes, opsRes, hallsRes] = await Promise.all([
        fetch('/api/inventory/summary').then(r => r.json()),
        fetch('/api/inventory/transactions').then(r => r.json()),
        fetch('/api/parts').then(r => r.json()),
        fetch('/api/machines').then(r => r.json()),
        fetch('/api/routings').then(r => r.json()),
        fetch('/api/dies').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/operators').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/halls').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (partsRes.success) setParts(partsRes.data);
      if (machinesRes.success) setMachines(machinesRes.data);
      if (routingsRes.success) setRoutings(routingsRes.data);
      if (diesRes.success) setDies(diesRes.data);
      if (opsRes.success) setOperators(opsRes.data);
      if (hallsRes.success) setHalls(hallsRes.data);
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
      if (data.success) {
        if (data.transaction) {
          setTransactions(prev => [data.transaction, ...prev]);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط با سرور' };
    }
  };

  // Handle Reversal of Voucher
  const handleReverseVoucher = async (voucherId: string, reason: string) => {
    try {
      const res = await fetch('/api/inventory/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherId,
          reason,
          user: currentUser,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط با سرور' };
    }
  };

  // Handle Save Part
  const handleSavePart = async (partData: Partial<Part>) => {
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Save Machine
  const handleSaveMachine = async (machineData: Partial<Machine>) => {
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Save Die / Mold
  const handleSaveDie = async (dieData: Partial<DieMold>) => {
    try {
      const res = await fetch('/api/dies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dieData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Delete Die
  const handleDeleteDie = async (id: string) => {
    try {
      const res = await fetch(`/api/dies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Save Operator
  const handleSaveOperator = async (opData: Partial<Operator>) => {
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Save Factory Hall
  const handleSaveHall = async (hallData: Partial<FactoryHall>) => {
    try {
      const res = await fetch('/api/halls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hallData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Save Routing
  const handleSaveRouting = async (routingData: Partial<Routing>) => {
    try {
      const res = await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingData),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Handle Delete Routing
  const handleDeleteRouting = async (id: string) => {
    try {
      const res = await fetch(`/api/routings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای سرور' };
    }
  };

  // Seed demo data
  const handleSeedDemo = async () => {
    setLoading(true);
    try {
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

  // Clean demo data
  const handleCleanDemo = async () => {
    setLoading(true);
    try {
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

  // Quick navigation from dashboard
  const handleOpenVoucherWithType = (type: string, partId?: string, stageId?: string) => {
    setInitialVoucherType(type as VoucherType);
    setInitialPartId(partId);
    setInitialStageId(stageId);
    setActiveTab('vouchers');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onRoleChange={role => setCurrentUser(prev => ({ ...prev, role }))}
        onSeedDemo={handleSeedDemo}
        onCleanDemo={handleCleanDemo}
        onOpenErpModal={() => setIsErpModalOpen(true)}
        loading={loading}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab)}
          partsCount={parts.length}
          txCount={transactions.length}
          scrapRate={summary?.overallScrapRate || 0}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              recentTransactions={transactions}
              machines={machines}
              onNavigateToTab={tab => setActiveTab(tab)}
              onOpenNewVoucher={handleOpenVoucherWithType}
            />
          )}

          {activeTab === 'vouchers' && (
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

          {activeTab === 'inventory' && (
            <InventoryReportView
              balances={summary?.stageBalances || []}
              onRefresh={loadAllData}
              loading={loading}
            />
          )}

          {activeTab === 'parts' && (
            <PartsView parts={parts} onSavePart={handleSavePart} />
          )}

          {activeTab === 'routings' && (
            <RoutingsView
              routings={routings}
              parts={parts}
              machines={machines}
              dies={dies}
              onSaveRouting={handleSaveRouting}
              onDeleteRouting={handleDeleteRouting}
              onDirectProduce={(partId, machineId) => {
                handleOpenVoucherWithType('PRODUCTION_OUTPUT', partId);
              }}
            />
          )}

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

          {activeTab === 'audit' && (
            <AuditLedgerView
              transactions={transactions}
              onRefresh={loadAllData}
              onReverseVoucher={handleReverseVoucher}
              loading={loading}
            />
          )}

          {activeTab === 'users' && (
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
