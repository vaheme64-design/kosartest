import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TabKey, SubModuleNavParams, MachineSubTabKey } from '../components/Sidebar';
import { InventorySubTab } from '../components/inventory/InventoryModuleView';
import { ProductionWorkbenchSubTab } from '../components/production/ErpProductionWorkbenchView';
import { PlanningSubTabKey } from '../components/planning/ProductionPlanningModuleView';
import { DrawerTabKey } from '../components/workflow/OrderDetailsDrawer';

export interface RouteState {
  tab: TabKey;
  productionViewMode: 'ERP_WORKBENCH' | 'VOUCHERS';
  productionModuleTab: ProductionWorkbenchSubTab;
  inventorySubTab: InventorySubTab;
  planningSubTab: PlanningSubTabKey;
  machineSubTab: MachineSubTabKey;
  moId: string | null;
  drawerTab: DrawerTabKey | null;
  timelineMoId: string | null;
}

export interface RouteNavigateParams {
  tab?: TabKey;
  productionViewMode?: 'ERP_WORKBENCH' | 'VOUCHERS';
  productionModuleTab?: ProductionWorkbenchSubTab;
  inventorySubTab?: InventorySubTab;
  planningSubTab?: PlanningSubTabKey;
  machineSubTab?: MachineSubTabKey;
  moId?: string | null;
  drawerTab?: DrawerTabKey | null;
  timelineMoId?: string | null;
}

interface RouterContextType {
  route: RouteState;
  navigate: (params: RouteNavigateParams, options?: { replace?: boolean }) => void;
  openMoDrawer: (moId: string, drawerTab?: DrawerTabKey) => void;
  closeMoDrawer: () => void;
  openTimeline: (moId: string) => void;
  closeTimeline: () => void;
  buildShareableUrl: (params?: RouteNavigateParams) => string;
}

const DEFAULT_ROUTE: RouteState = {
  tab: 'dashboard',
  productionViewMode: 'ERP_WORKBENCH',
  productionModuleTab: 'MULTI_PART_SCHEDULER',
  inventorySubTab: 'DASHBOARD',
  planningSubTab: 'erp_workbench',
  machineSubTab: 'machines',
  moId: null,
  drawerTab: null,
  timelineMoId: null,
};

const RouterContext = createContext<RouterContextType | null>(null);

function parseUrlToRoute(): RouteState {
  if (typeof window === 'undefined') return DEFAULT_ROUTE;

  // Prefer hash routing format: #/production?tab=DAILY_DISPATCH_SHEET&mo=MO-1403-1092
  // Also fall back gracefully to window.location.search or pathname
  const hash = window.location.hash || '';
  const hashPathAndSearch = hash.replace(/^#\/?/, '');
  const [hashPath, hashSearch = ''] = hashPathAndSearch.split('?');

  const searchParams = new URLSearchParams(hashSearch || window.location.search);

  // Tab determination
  let tab: TabKey = 'dashboard';
  const cleanPath = (hashPath || window.location.pathname.replace(/^\//, '')).split('/')[0].toLowerCase();

  const VALID_TABS: Record<string, TabKey> = {
    dashboard: 'dashboard',
    workbench: 'dashboard',
    master_data: 'master_data',
    parts: 'master_data',
    contracts: 'contracts',
    sales: 'contracts',
    inventory: 'inventory',
    stock: 'inventory',
    production: 'production',
    manufacturing: 'production',
    wip: 'wip',
    planning: 'planning',
    mrp: 'planning',
    machines: 'machines',
    equipment: 'machines',
    sapco: 'sapco',
    coils: 'sapco',
    reports: 'reports',
    oee: 'reports',
    settings: 'settings',
    users: 'settings',
  };

  if (VALID_TABS[cleanPath]) {
    tab = VALID_TABS[cleanPath];
  } else if (searchParams.get('module') && VALID_TABS[searchParams.get('module')!]) {
    tab = VALID_TABS[searchParams.get('module')!];
  }

  // Sub-tabs & parameters
  const rawProdViewMode = searchParams.get('viewMode') || searchParams.get('mode');
  const productionViewMode: 'ERP_WORKBENCH' | 'VOUCHERS' =
    rawProdViewMode === 'VOUCHERS' ? 'VOUCHERS' : 'ERP_WORKBENCH';

  const rawProdSubTab = searchParams.get('tab') || searchParams.get('prodTab');
  const validProdSubTabs: ProductionWorkbenchSubTab[] = [
    'MULTI_PART_SCHEDULER',
    'DAILY_DISPATCH_SHEET',
    'LIVE_WIP_OP_TRACKER',
    'KPI_OEE_REPORTS',
    'MATERIAL_REQUIREMENT_PROJECTION',
    'TREE_TIMELINE_REPORT',
    'SAP_PP_WORKFLOW',
  ];
  const productionModuleTab: ProductionWorkbenchSubTab = validProdSubTabs.includes(rawProdSubTab as any)
    ? (rawProdSubTab as ProductionWorkbenchSubTab)
    : 'MULTI_PART_SCHEDULER';

  const rawInvSubTab = searchParams.get('subTab') || searchParams.get('invTab');
  const validInvSubTabs: InventorySubTab[] = ['DASHBOARD', 'INQUIRY', 'MOVEMENT', 'COILS', 'ALERTS'];
  const inventorySubTab: InventorySubTab = validInvSubTabs.includes(rawInvSubTab as any)
    ? (rawInvSubTab as InventorySubTab)
    : 'DASHBOARD';

  const rawPlanningSubTab = searchParams.get('planTab') || searchParams.get('subTab');
  const validPlanningSubTabs: PlanningSubTabKey[] = [
    'erp_workbench',
    'workflow_doc',
    'dashboard',
    'daily_schedule',
    'capacity_planning',
    'mrp',
    'consumables',
    'recommendations',
    'orders',
    'approved_plans',
  ];
  const planningSubTab: PlanningSubTabKey = validPlanningSubTabs.includes(rawPlanningSubTab as any)
    ? (rawPlanningSubTab as PlanningSubTabKey)
    : 'erp_workbench';

  const rawMachineSubTab = searchParams.get('mchTab') || searchParams.get('subTab');
  const validMachineSubTabs: MachineSubTabKey[] = [
    'machines',
    'maintenance',
    'oee',
    'utilization',
    'dies',
    'halls',
    'operators',
  ];
  const machineSubTab: MachineSubTabKey = validMachineSubTabs.includes(rawMachineSubTab as any)
    ? (rawMachineSubTab as MachineSubTabKey)
    : 'machines';

  const moId = searchParams.get('mo') || searchParams.get('orderId') || null;
  const rawDrawerTab = searchParams.get('drawerTab');
  const validDrawerTabs: DrawerTabKey[] = ['TRACEABILITY', 'ROUTING', 'ACTIONS', 'AUDIT_TRAIL'];
  const drawerTab: DrawerTabKey | null = validDrawerTabs.includes(rawDrawerTab as any)
    ? (rawDrawerTab as DrawerTabKey)
    : moId
    ? 'TRACEABILITY'
    : null;

  const timelineMoId = searchParams.get('timeline') || searchParams.get('timelineMo') || null;

  return {
    tab,
    productionViewMode,
    productionModuleTab,
    inventorySubTab,
    planningSubTab,
    machineSubTab,
    moId,
    drawerTab,
    timelineMoId,
  };
}

function serializeRouteToHash(state: RouteState): string {
  const params = new URLSearchParams();

  if (state.tab === 'production') {
    if (state.productionViewMode !== 'ERP_WORKBENCH') {
      params.set('viewMode', state.productionViewMode);
    }
    if (state.productionModuleTab !== 'MULTI_PART_SCHEDULER') {
      params.set('tab', state.productionModuleTab);
    }
  } else if (state.tab === 'inventory') {
    if (state.inventorySubTab !== 'DASHBOARD') {
      params.set('subTab', state.inventorySubTab);
    }
  } else if (state.tab === 'planning') {
    if (state.planningSubTab !== 'erp_workbench') {
      params.set('subTab', state.planningSubTab);
    }
  } else if (state.tab === 'machines') {
    if (state.machineSubTab !== 'machines') {
      params.set('subTab', state.machineSubTab);
    }
  }

  if (state.moId) {
    params.set('mo', state.moId);
    if (state.drawerTab && state.drawerTab !== 'TRACEABILITY') {
      params.set('drawerTab', state.drawerTab);
    }
  }

  if (state.timelineMoId) {
    params.set('timeline', state.timelineMoId);
  }

  const queryString = params.toString();
  return `#/${state.tab}${queryString ? `?${queryString}` : ''}`;
}

export const ErpRouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteState>(parseUrlToRoute);

  // Sync state whenever hash or popstate changes (browser Back / Forward button)
  useEffect(() => {
    const handleLocationChange = () => {
      const parsed = parseUrlToRoute();
      setRoute(parsed);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    // Initial normalize if URL is bare
    if (typeof window !== 'undefined' && !window.location.hash) {
      const initialHash = serializeRouteToHash(route);
      window.history.replaceState(null, '', initialHash);
    }

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((params: RouteNavigateParams, options?: { replace?: boolean }) => {
    setRoute(prev => {
      const next: RouteState = {
        ...prev,
        ...params,
        productionViewMode:
          params.productionViewMode !== undefined
            ? params.productionViewMode
            : params.productionModuleTab
            ? 'ERP_WORKBENCH'
            : prev.productionViewMode,
        // If tab changed and no subTab was explicitly provided, reset drawer & subTab defaults
        moId: params.moId !== undefined ? params.moId : params.tab && params.tab !== prev.tab ? null : prev.moId,
        drawerTab: params.drawerTab !== undefined ? params.drawerTab : params.moId ? 'TRACEABILITY' : prev.drawerTab,
      };

      const newHash = serializeRouteToHash(next);
      if (typeof window !== 'undefined') {
        if (options?.replace) {
          window.history.replaceState(null, '', newHash);
        } else {
          // Push new browser history state to allow genuine Back/Forward navigation!
          window.history.pushState(null, '', newHash);
        }
      }

      return next;
    });
  }, []);

  const openMoDrawer = useCallback((moId: string, drawerTab: DrawerTabKey = 'TRACEABILITY') => {
    navigate({ moId, drawerTab });
  }, [navigate]);

  const closeMoDrawer = useCallback(() => {
    navigate({ moId: null, drawerTab: null });
  }, [navigate]);

  const openTimeline = useCallback((timelineMoId: string) => {
    navigate({ timelineMoId });
  }, [navigate]);

  const closeTimeline = useCallback(() => {
    navigate({ timelineMoId: null });
  }, [navigate]);

  const buildShareableUrl = useCallback((params?: RouteNavigateParams) => {
    if (typeof window === 'undefined') return '';
    const targetState: RouteState = { ...route, ...params };
    const hash = serializeRouteToHash(targetState);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [route]);

  const contextValue = useMemo<RouterContextType>(() => ({
    route,
    navigate,
    openMoDrawer,
    closeMoDrawer,
    openTimeline,
    closeTimeline,
    buildShareableUrl,
  }), [route, navigate, openMoDrawer, closeMoDrawer, openTimeline, closeTimeline, buildShareableUrl]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
};

export function useErpRouter(): RouterContextType {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useErpRouter must be used within an ErpRouterProvider');
  }
  return ctx;
}
