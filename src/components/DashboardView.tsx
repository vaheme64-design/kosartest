import React from 'react';
import {
  InventoryTransaction,
  StageInventorySummary,
  Machine,
  UserRoleProfile,
  Part,
  Routing,
  DieMold,
  FactoryHall,
  SapcoCoilReceipt,
} from '../types/inventory';
import { TabKey, SubModuleNavParams } from './Sidebar';
import { InventorySubTab } from './inventory/InventoryModuleView';
import { FactoryHighwayWorkbench } from './workflow/FactoryHighwayWorkbench';

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
  parts?: Part[];
  routings?: Routing[];
  dies?: DieMold[];
  halls?: FactoryHall[];
  coils?: SapcoCoilReceipt[];
  onNavigateToTab: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onNavigateSubModule?: (tab: TabKey, navParams?: SubModuleNavParams) => void;
  onOpenNewVoucher: (type: string, partId?: string) => void;
  onSubmitVoucher?: (payload: any) => Promise<{ success: boolean; message?: string }>;
  initialOrderId?: string | null;
  initialDrawerTab?: any;
  onOrderDrawerChange?: (orderId: string | null, tab?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  machines,
  parts = [],
  routings = [],
  dies = [],
  halls = [],
  coils = [],
  onNavigateToTab,
  onNavigateSubModule,
  onOpenNewVoucher,
  onSubmitVoucher,
  initialOrderId,
  initialDrawerTab,
  onOrderDrawerChange,
}) => {
  return (
    <FactoryHighwayWorkbench
      parts={parts}
      routings={routings}
      machines={machines}
      dies={dies}
      halls={halls}
      coils={coils}
      summary={summary}
      onNavigateToTab={onNavigateToTab}
      onNavigateSubModule={onNavigateSubModule}
      onOpenNewVoucher={onOpenNewVoucher}
      onSubmitVoucher={onSubmitVoucher}
      initialOrderId={initialOrderId}
      initialDrawerTab={initialDrawerTab}
      onOrderDrawerChange={onOrderDrawerChange}
    />
  );
};
