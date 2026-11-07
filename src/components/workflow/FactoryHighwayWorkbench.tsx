import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Hammer,
  Printer,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Cpu,
  RotateCcw,
  Search,
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpRight,
  Compass,
  GitBranch,
  FileCheck2,
  Layers,
} from 'lucide-react';
import {
  Part,
  Routing,
  Machine,
  DieMold,
  FactoryHall,
  SapcoCoilReceipt,
  PROCESS_DEFINITIONS,
  FACTORY_HALLS,
  ProcessType,
} from '../../types/inventory';
import { TabKey, SubModuleNavParams } from '../Sidebar';
import { InventorySubTab } from '../inventory/InventoryModuleView';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

export interface HighwayOperationStep {
  stepCode: string;
  stepName: string;
  processType?: ProcessType;
  hall: string;
  machineId?: string;
  machineName: string;
  dieId?: string;
  dieName: string;
  cycleTimeSec: number;
  isShared?: boolean;
  sharedWithPart?: string;
  completedGood: number;
  scrapQty: number;
  isFinal: boolean;
}

export interface IssuedCommandLog {
  id: string;
  docNumber: string;
  type: 'MO_CREATED' | 'MATERIAL_ISSUED' | 'OP_LOGGED' | 'FG_RECEIPT';
  title: string;
  timestamp: string;
  qtyOrWeight: string;
  targetStation: string;
}

export interface HighwayPartScenario {
  id: string;
  orderCode: string;
  partId: string;
  partCode: string;
  partName: string;
  carModel: string;
  customerName: string;
  orderQty: number;
  unitWeightKg: number;
  scrapAllowancePct: number;
  rawMaterialPartId?: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  isCustomSheetOverride?: boolean;
  warehouseAvailableKg: number;
  materialIssuedVoucherNo?: string;
  finishedReceiptVoucherNo?: string;
  bomSubComponents: Array<{
    name: string;
    qtyPerParent: number;
    unit: string;
    stage: string;
  }>;
  operations: HighwayOperationStep[];
  commandLogs?: IssuedCommandLog[];
}

const INITIAL_SCENARIOS: HighwayPartScenario[] = [
  {
    id: 'SCN-ECU-BRK',
    orderCode: 'MO-1404-2001',
    partId: 'PRT-ECU-BRK-01',
    partCode: 'SAPCO-ASY-ECU-BRK-01',
    partName: 'براکت ضدسرقت رایانه موتور (ECU)',
    carModel: 'پژو ۲۰۶',
    customerName: 'ساپکو',
    orderQty: 5000,
    unitWeightKg: 1.45,
    scrapAllowancePct: 5.0,
    rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
    rawMaterialName: 'رول ورق DC01A ضخامت 2.0 عرض 1140',
    warehouseAvailableKg: 18500,
    materialIssuedVoucherNo: 'ISS-1404-881',
    bomSubComponents: [
      { name: 'صفحه اصلی براکت ضدسرقت (WIP-ECU-MAIN)', qtyPerParent: 1, unit: 'عدد', stage: 'برش و پرس' },
      { name: 'قطعه مکمل تقویتی (WIP-ECU-COMP)', qtyPerParent: 1, unit: 'عدد', stage: 'بلنک و پانچ' },
      { name: 'مهره جوشی M6 استاندارد خودرویی', qtyPerParent: 15, unit: 'عدد', stage: 'پرس‌جوش مقاومتی' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش ورق خام از رول',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'قیچی گیوتین ۶ متری ۱',
        dieName: 'BLD-SHR-01',
        cycleTimeSec: 6,
        completedGood: 5000,
        scrapQty: 25,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'بلنک‌زنی اولیه صفحه اصلی',
        processType: 'BLANKING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
        dieName: 'DIE-ECU-BLK-01',
        cycleTimeSec: 10,
        completedGood: 3500,
        scrapQty: 30,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'پرس خمکاری و فرم لبه‌ها',
        processType: 'BENDING',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۱۶۰ تن خم ۱',
        dieName: 'DIE-ECU-BND-02',
        cycleTimeSec: 12,
        completedGood: 2200,
        scrapQty: 18,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'پانچ و سوراخ‌کاری دوبل',
        processType: 'PUNCH_FORM',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۱۶۰ تن پانچ ۲',
        dieName: 'DIE-ECU-PNC-03',
        cycleTimeSec: 12,
        completedGood: 0,
        scrapQty: 0,
        isFinal: false,
      },
      {
        stepCode: 'OP50',
        stepName: 'پرس‌جوش مهره و تحویل به انبار',
        processType: 'SPOT_WELD',
        hall: 'سالن جوشکاری رباتیک و پرس‌جوش مقاومتی',
        machineName: 'پرس‌جوش مقاومتی ۱۰۰KVA',
        dieName: 'JIG-ECU-NUT15',
        cycleTimeSec: 20,
        completedGood: 0,
        scrapQty: 0,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-1',
        docNumber: 'MO-1404-2001',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید (MO) بر اساس BOM و مسیر تولید',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۷:۳۰',
        qtyOrWeight: '۵,۰۰۰ عدد',
        targetStation: 'خط تولید و پرس',
      },
      {
        id: 'CMD-2',
        docNumber: 'ISS-1404-881',
        type: 'MATERIAL_ISSUED',
        title: 'حواله ورق DC01A ضخامت 2.0 به سالن برش',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۱۰',
        qtyOrWeight: '۷,۶۱۳ کیلوگرم',
        targetStation: 'سالن برشکاری (OP10)',
      },
    ],
  },
  {
    id: 'SCN-SEAT-LHRH',
    orderCode: 'MO-1404-2002',
    partId: 'PRT-SEAT-LH',
    partCode: 'SAPCO-SEAT-BACK-LH',
    partName: 'اسکلت صندلی چپ و راست (قالب ۲ کویته)',
    carModel: 'پژو پارس',
    customerName: 'ساپکو',
    orderQty: 4000,
    unitWeightKg: 2.1,
    scrapAllowancePct: 4.5,
    rawMaterialCode: 'RM-COIL-DC04-1.2-1250',
    rawMaterialName: 'رول ورق کشش عمیق DC04 ضخامت 1.2',
    warehouseAvailableKg: 24000,
    materialIssuedVoucherNo: 'ISS-1404-884',
    bomSubComponents: [
      { name: 'بلنک مشترک کشش عمیق (چپ/راست)', qtyPerParent: 1, unit: 'عدد', stage: 'پرس ۸۰۰ تن' },
      { name: 'پوسته صندلی چپ (Split LH)', qtyPerParent: 1, unit: 'عدد', stage: 'دوربری و تفکیک' },
      { name: 'پوسته صندلی راست (Split RH)', qtyPerParent: 1, unit: 'عدد', stage: 'دوربری و تفکیک' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش کلاف DC04 ضخامت ۱.۲',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'خط برش عرضی ۱',
        dieName: 'BLD-SLT-01',
        cycleTimeSec: 7,
        completedGood: 4000,
        scrapQty: 15,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'کشش عمیق مشترک (۲ کویته چپ/راست)',
        processType: 'DRAWING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس هیدرولیک ۸۰۰ تن',
        dieName: 'DIE-SEAT-LHRH-G1',
        cycleTimeSec: 18,
        isShared: true,
        sharedWithPart: 'اسکلت پشت صندلی راست (RH)',
        completedGood: 3000,
        scrapQty: 25,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'دوربری و تفکیک چپ و راست',
        processType: 'TRIMMING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۴۰۰ تن ۲',
        dieName: 'DIE-SEAT-TRM2',
        cycleTimeSec: 15,
        completedGood: 1500,
        scrapQty: 10,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'پانچ نهایی و رسید انبار محصول',
        processType: 'PUNCH_FORM',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۲۵۰ تن ۱',
        dieName: 'DIE-SEAT-CAL3',
        cycleTimeSec: 14,
        completedGood: 0,
        scrapQty: 0,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-10',
        docNumber: 'MO-1404-2002',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید اسکلت صندلی چپ و راست',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۰۰',
        qtyOrWeight: '۴,۰۰۰ عدد',
        targetStation: 'سالن پرس سنگین',
      },
    ],
  },
  {
    id: 'SCN-BUMP-BEAM',
    orderCode: 'MO-1404-2003',
    partId: 'PRT-BUMP-FR',
    partCode: 'SAPCO-BUMP-BEAM-FR',
    partName: 'تیر عرضی سپر جلو (امگا)',
    carModel: 'سمند سورن',
    customerName: 'ایران خودرو',
    orderQty: 2000,
    unitWeightKg: 5.4,
    scrapAllowancePct: 3.5,
    rawMaterialCode: 'RM-COIL-ST37-2.5-1250',
    rawMaterialName: 'ورق ضخیم ST37 ضخامت 2.5 عرض 1250',
    warehouseAvailableKg: 32000,
    bomSubComponents: [
      { name: 'پروفیل اصلی امگا تیر سپر', qtyPerParent: 1, unit: 'عدد', stage: 'پرس ۸۰۰ تن' },
      { name: 'قوطی جاذب ضربه چپ Crash Box LH', qtyPerParent: 1, unit: 'عدد', stage: 'جوش رباتیک' },
      { name: 'قوطی جاذب ضربه راست Crash Box RH', qtyPerParent: 1, unit: 'عدد', stage: 'جوش رباتیک' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش طولی ورق ضخیم تیر سپر',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'گیوتین سنگین ۱',
        dieName: 'BLD-BMP-01',
        cycleTimeSec: 10,
        completedGood: 2000,
        scrapQty: 10,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'فرم‌دهی پروفیل امگا تیر سپر',
        processType: 'DRAWING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۸۰۰ تن',
        dieName: 'DIE-BMP-OMG',
        cycleTimeSec: 20,
        completedGood: 1200,
        scrapQty: 15,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'پانچ و خم قوس سپر',
        processType: 'BENDING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۴۰۰ تن',
        dieName: 'DIE-BMP-ARC',
        cycleTimeSec: 18,
        completedGood: 0,
        scrapQty: 0,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'جوش رباتیک و تحویل به انبار',
        processType: 'CO2_WELD',
        hall: 'سالن جوشکاری رباتیک و پرس‌جوش مقاومتی',
        machineName: 'ربات جوش CO2',
        dieName: 'JIG-BMP-ROB',
        cycleTimeSec: 25,
        completedGood: 0,
        scrapQty: 0,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-20',
        docNumber: 'MO-1404-2003',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید تیر عرضی سپر جلو',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۳۰',
        qtyOrWeight: '۲,۰۰۰ عدد',
        targetStation: 'سالن برشکاری',
      },
    ],
  },
];

interface FactoryHighwayWorkbenchProps {
  parts?: Part[];
  routings?: Routing[];
  machines?: Machine[];
  dies?: DieMold[];
  halls?: FactoryHall[];
  coils?: SapcoCoilReceipt[];
  summary?: any;
  onNavigateToTab?: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onNavigateSubModule?: (tab: TabKey, navParams?: SubModuleNavParams) => void;
  onOpenNewVoucher?: (type: string, partId?: string) => void;
  onSubmitVoucher?: (payload: any) => Promise<{ success: boolean; message?: string }>;
}

export const FactoryHighwayWorkbench: React.FC<FactoryHighwayWorkbenchProps> = ({
  parts = [],
  routings = [],
  machines = [],
  dies = [],
  halls = [],
  coils = [],
  summary,
  onNavigateToTab,
  onNavigateSubModule,
  onSubmitVoucher,
}) => {
  const [scenarios, setScenarios] = useState<HighwayPartScenario[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_highway_scenarios_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SCENARIOS;
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [carFilter, setCarFilter] = useState<string>('ALL');

  // On-Demand Progressive Disclosure Toggles (Closed by default for minimalism!)
  const [showKpiPanel, setShowKpiPanel] = useState(false);
  const [showWarehouseTools, setShowWarehouseTools] = useState(false);

  // Expanded Row Drawer: Closed by default so the user only sees details when they ask!
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedViewMode, setExpandedViewMode] = useState<'OPS' | 'BOM'>('OPS');

  // Live Order & Command Tracking Modal (`پیگیری دستور`)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Modal for Logging Production on an Operation
  const [loggingTarget, setLoggingTarget] = useState<{
    orderId: string;
    opIndex: number;
  } | null>(null);
  const [logQtyInput, setLogQtyInput] = useState<string>('');
  const [logScrapInput, setLogScrapInput] = useState<string>('0');

  // Modal for Editing / Creating a Work Order (Connected to Master Data Parts, Routings & BOM!)
  const [editingOrder, setEditingOrder] = useState<HighwayPartScenario | null>(null);
  const [isNewOrderMode, setIsNewOrderMode] = useState(false);
  const [allowManualSheetOverride, setAllowManualSheetOverride] = useState(false);

  // Modal for Editing / Adding a specific Operation Step (Connected to Master Data Operations, Halls, Machines, Dies!)
  const [editingOpContext, setEditingOpContext] = useState<{
    orderId: string;
    partId: string;
    partCode: string;
    opIndex: number | null;
    stepData: HighwayOperationStep;
  } | null>(null);

  // Toast with direct Tracking button (`پیگیری دستور`)
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    detail: string;
    type: 'success' | 'warning' | 'info';
    trackOrderId?: string;
    navAction?: { label: string; onClick: () => void };
  } | null>(null);

  const saveScenarios = (next: HighwayPartScenario[]) => {
    setScenarios(next);
    try {
      localStorage.setItem('kpims_highway_scenarios_v3', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Combine Master Data parts (`parts`) with scenario catalog so the dropdown always has all real parts
  const produciblePartsCatalog = useMemo(() => {
    const prodParts = parts.filter(p => p.category !== 'RAW_MATERIAL');
    if (prodParts.length > 0) return prodParts;
    return parts;
  }, [parts]);

  // Available Raw Materials & Coils from Master Data + Inventory
  const availableRawSheetsCatalog = useMemo(() => {
    const rawParts = parts
      .filter(p => p.category === 'RAW_MATERIAL')
      .map(p => {
        const balances = (summary?.stageBalances || []).filter(
          (sb: any) => sb.partId === p.id || sb.partCode === p.code
        );
        const stockKg =
          balances.reduce((acc: number, sb: any) => acc + (sb.totalKg || sb.usableQty || 0), 0) ||
          18500;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          grade: p.materialGrade || 'ST12',
          thicknessMm: p.thicknessMm || 1.5,
          availableKg: stockKg,
        };
      });

    const coilItems = coils.map(c => ({
      id: c.id,
      code: c.coilNumber || c.partCode,
      name: `${c.partName} (کویل ${c.coilNumber})`,
      grade: c.materialGrade,
      thicknessMm: c.thicknessMm,
      availableKg: Math.max(0, c.receivedWeightKg - c.consumedWeightKg),
    }));

    const fallbackDefaults = [
      {
        id: 'RM-DC01-20',
        code: 'RM-COIL-DC01A-2.0-1140',
        name: 'رول ورق DC01A ضخامت 2.0 عرض 1140',
        grade: 'DC01A',
        thicknessMm: 2.0,
        availableKg: 18500,
      },
      {
        id: 'RM-DC04-12',
        code: 'RM-COIL-DC04-1.2-1250',
        name: 'رول ورق کشش عمیق DC04 ضخامت 1.2 عرض 1250',
        grade: 'DC04',
        thicknessMm: 1.2,
        availableKg: 24000,
      },
      {
        id: 'RM-ST14-08',
        code: 'RM-COIL-ST14-0.8-1000',
        name: 'رول ورق فوق کشش ST14 ضخامت 0.8 عرض 1000',
        grade: 'ST14',
        thicknessMm: 0.8,
        availableKg: 16200,
      },
      {
        id: 'RM-ST37-25',
        code: 'RM-COIL-ST37-2.5-1250',
        name: 'ورق ضخیم ST37 ضخامت 2.5 عرض 1250',
        grade: 'ST37',
        thicknessMm: 2.5,
        availableKg: 32000,
      },
    ];

    const combined = [...rawParts, ...coilItems];
    return combined.length > 0 ? combined : fallbackDefaults;
  }, [parts, coils, summary]);

  // Helper: Build Operations (`OP10`, `OP20`...) and Default BOM Sheet for a Selected Part from Master Data
  const buildOrderDataFromMasterPart = (selectedPart: Part, currentOrderCode: string): HighwayPartScenario => {
    // 1. Find official Routing for this part in Master Data (`routings`)
    const matchedRouting = routings.find(
      r => r.partId === selectedPart.id || r.partCode === selectedPart.code
    );

    // 2. Find dies correlated with this part in Master Data (`dies`)
    const correlatedDies = dies.filter(
      d => d.partId === selectedPart.id || d.partCode === selectedPart.code
    );

    let mappedOperations: HighwayOperationStep[] = [];

    if (matchedRouting && matchedRouting.operations && matchedRouting.operations.length > 0) {
      mappedOperations = matchedRouting.operations.map((op, idx) => {
        const matchedMachine = machines.find(m => m.id === op.machineId);
        const matchedDie =
          dies.find(d => d.id === op.dieMoldId) || correlatedDies[idx];
        return {
          stepCode: op.stepCode || `OP${(idx + 1) * 10}`,
          stepName: op.stepName,
          processType: op.processType,
          hall: matchedMachine?.location || 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
          machineId: op.machineId,
          machineName:
            op.machineName ||
            matchedMachine?.name ||
            machines[idx % Math.max(1, machines.length)]?.name ||
            'پرس ضربه‌ای ۲۵۰ تن',
          dieId: op.dieMoldId || matchedDie?.id,
          dieName:
            op.dieMoldName ||
            matchedDie?.code ||
            `DIE-${selectedPart.code.slice(-6)}-OP${(idx + 1) * 10}`,
          cycleTimeSec: op.standardCycleTimeSec || 12,
          isShared: op.isSharedOperation,
          sharedWithPart: op.sharedPartName,
          completedGood: 0,
          scrapQty: 0,
          isFinal: idx === matchedRouting.operations.length - 1,
        };
      });
    } else {
      // Build standard operations connected to the part's correlated dies & machines in Master Data
      const die1 = correlatedDies[0];
      const die2 = correlatedDies[1] || correlatedDies[0];
      const shearMachine =
        machines.find(m => m.processType === 'SHEARING') || machines[0];
      const pressMachine =
        machines.find(m => m.processType === 'BLANKING' || m.processType === 'DRAWING') ||
        machines[1] ||
        machines[0];
      const finalMachine =
        machines.find(m => m.processType === 'PUNCH_FORM' || m.processType === 'SPOT_WELD') ||
        machines[2] ||
        pressMachine;

      mappedOperations = [
        {
          stepCode: 'OP10',
          stepName: `برش و نواربری ورق (${selectedPart.materialGrade || 'ST12'})`,
          processType: 'SHEARING',
          hall: shearMachine?.location || 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
          machineId: shearMachine?.id,
          machineName: shearMachine?.name || 'قیچی گیوتین ۶ متری ۱',
          dieName: 'BLD-SHR-01',
          cycleTimeSec: 6,
          completedGood: 0,
          scrapQty: 0,
          isFinal: false,
        },
        {
          stepCode: 'OP20',
          stepName: die1 ? die1.name : `بلنکینگ و فرم‌دهی اولیه ${selectedPart.name}`,
          processType: die1?.processType || 'BLANKING',
          hall: pressMachine?.location || 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
          machineId: pressMachine?.id,
          machineName: pressMachine?.name || 'پرس ضربه‌ای ۲۵۰ تن ۱',
          dieId: die1?.id,
          dieName: die1?.code || `DIE-${selectedPart.code}-BLK`,
          cycleTimeSec: 12,
          completedGood: 0,
          scrapQty: 0,
          isFinal: false,
        },
        {
          stepCode: 'OP30',
          stepName: die2 && die2 !== die1 ? die2.name : `پانچ، خم نهایی و تحویل به انبار`,
          processType: die2?.processType || 'PUNCH_FORM',
          hall: finalMachine?.location || 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
          machineId: finalMachine?.id,
          machineName: finalMachine?.name || 'پرس ۱۶۰ تن پانچ و فرم',
          dieId: die2?.id,
          dieName: die2?.code || `DIE-${selectedPart.code}-FIN`,
          cycleTimeSec: 14,
          completedGood: 0,
          scrapQty: 0,
          isFinal: true,
        },
      ];
    }

    // 3. Match BOM Raw Material Sheet automatically by Grade & Thickness
    const matchedSheet =
      availableRawSheetsCatalog.find(
        rm =>
          (selectedPart.materialGrade &&
            rm.grade.toLowerCase() === selectedPart.materialGrade.toLowerCase()) ||
          (selectedPart.thicknessMm && rm.thicknessMm === selectedPart.thicknessMm)
      ) || availableRawSheetsCatalog[0];

    return {
      id: `SCN-${Date.now()}`,
      orderCode: currentOrderCode,
      partId: selectedPart.id,
      partCode: selectedPart.code,
      partName: selectedPart.name,
      carModel: selectedPart.carModel || 'پژو ۲۰۶',
      customerName: 'ساپکو',
      orderQty: 2000,
      unitWeightKg: selectedPart.weightPerUnitKg || 1.2,
      scrapAllowancePct: 4.5,
      rawMaterialPartId: matchedSheet?.id,
      rawMaterialCode: matchedSheet?.code || 'RM-COIL-ST12-1.5',
      rawMaterialName:
        matchedSheet?.name ||
        `رول ورق ${selectedPart.materialGrade || 'ST12'} ضخامت ${selectedPart.thicknessMm || 1.5}`,
      isCustomSheetOverride: false,
      warehouseAvailableKg: matchedSheet?.availableKg || 18500,
      bomSubComponents: [
        {
          name: `بلنک ورق برش‌خورده ${selectedPart.name}`,
          qtyPerParent: 1,
          unit: 'عدد',
          stage: mappedOperations[0]?.stepName || 'برش و بلنکینگ',
        },
        {
          name: `قطعه فرم‌دهی‌شده (${selectedPart.code})`,
          qtyPerParent: 1,
          unit: 'عدد',
          stage: mappedOperations[mappedOperations.length - 1]?.stepName || 'پرس نهایی',
        },
      ],
      operations: mappedOperations,
      commandLogs: [],
    };
  };

  // Open Create MO Modal (Connected to Master Data Catalog!)
  const handleOpenCreateNewOrder = () => {
    setIsNewOrderMode(true);
    setAllowManualSheetOverride(false);
    const newMoCode = `MO-1404-${Math.floor(2100 + Math.random() * 7000)}`;
    const defaultPart = produciblePartsCatalog[0];

    if (defaultPart) {
      setEditingOrder(buildOrderDataFromMasterPart(defaultPart, newMoCode));
    } else {
      // Fallback to first scenario template if parts not yet loaded
      const tpl = INITIAL_SCENARIOS[0];
      setEditingOrder({
        ...tpl,
        id: `SCN-${Date.now()}`,
        orderCode: newMoCode,
        operations: tpl.operations.map(o => ({ ...o, completedGood: 0, scrapQty: 0 })),
        commandLogs: [],
      });
    }
  };

  // Listen to Contextual Floating Action Menu events (`OPEN_CREATE_MO`, `OPEN_TRACK_FIRST_ORDER`)
  useEffect(() => {
    const handleContextual = (e: Event) => {
      const custom = e as CustomEvent<{ actionType?: string }>;
      if (custom.detail?.actionType === 'OPEN_CREATE_MO') {
        handleOpenCreateNewOrder();
      } else if (custom.detail?.actionType === 'OPEN_TRACK_FIRST_ORDER') {
        if (scenarios.length > 0) {
          setTrackingOrderId(scenarios[0].id);
        }
      }
    };
    window.addEventListener('kpims:contextual-action', handleContextual);
    return () => window.removeEventListener('kpims:contextual-action', handleContextual);
  }, [scenarios, produciblePartsCatalog, routings, machines, dies]);

  // Filtered Orders by Search & Car Model
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scenarios.filter(scn => {
      if (carFilter !== 'ALL' && scn.carModel !== carFilter) return false;
      if (!q) return true;
      return (
        scn.partName.toLowerCase().includes(q) ||
        scn.partCode.toLowerCase().includes(q) ||
        scn.orderCode.toLowerCase().includes(q) ||
        scn.carModel.toLowerCase().includes(q) ||
        scn.rawMaterialName.toLowerCase().includes(q)
      );
    });
  }, [scenarios, searchQuery, carFilter]);

  const uniqueCarModels = useMemo(
    () => Array.from(new Set(scenarios.map(s => s.carModel))),
    [scenarios]
  );

  // Aggregate Factory Metrics (Calculated for On-Demand KPI Drawer)
  const aggregateMetrics = useMemo(() => {
    let totalWarehouseKg = 0;
    let totalOrderQty = 0;
    let totalFinishedQty = 0;
    let totalWipQty = 0;

    scenarios.forEach(scn => {
      totalWarehouseKg += scn.warehouseAvailableKg;
      totalOrderQty += scn.orderQty;
      const lastOp = scn.operations[scn.operations.length - 1];
      if (lastOp) totalFinishedQty += lastOp.completedGood;
      scn.operations.forEach((op, idx) => {
        if (idx > 0) {
          const prev = scn.operations[idx - 1];
          totalWipQty += Math.max(0, prev.completedGood - op.completedGood);
        }
      });
    });

    return {
      totalWarehouseKg,
      totalOrderQty,
      totalFinishedQty,
      totalWipQty,
    };
  }, [scenarios]);

  // Issue Raw Material Sheet Voucher to Line (Connected to Inventory & Trackable!)
  const handleIssueSheetForOrder = async (order: HighwayPartScenario) => {
    const netWeightKg = Math.round(order.orderQty * order.unitWeightKg);
    const grossRequiredKg = Math.round(netWeightKg * (1 + order.scrapAllowancePct / 100));
    const voucherNo = `ISS-1404-${Math.floor(100 + Math.random() * 899)}`;
    const nowTime = 'امروز - ثبت سیستمی';

    if (onSubmitVoucher && order.rawMaterialPartId) {
      await onSubmitVoucher({
        voucherType: 'ISSUE',
        partId: order.rawMaterialPartId,
        stageId: 'STAGE_RAW_STORE',
        targetStageId: 'STAGE_SHEARING',
        quantity: grossRequiredKg,
        referenceDoc: order.orderCode,
        notes: `حواله ورق برای دستور تولید ${order.orderCode} (${order.partName})`,
      }).catch(() => {});
    }

    const newLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: voucherNo,
      type: 'MATERIAL_ISSUED',
      title: `صدور حواله ورق (${order.rawMaterialName}) به سالن برش`,
      timestamp: nowTime,
      qtyOrWeight: `${formatNumber(grossRequiredKg)} کیلوگرم`,
      targetStation: order.operations[0]?.hall || 'سالن برشکاری',
    };

    const updated = scenarios.map(scn => {
      if (scn.id !== order.id) return scn;
      return {
        ...scn,
        materialIssuedVoucherNo: voucherNo,
        warehouseAvailableKg: Math.max(0, scn.warehouseAvailableKg - grossRequiredKg),
        commandLogs: [newLog, ...(scn.commandLogs || [])],
      };
    });

    saveScenarios(updated);
    setToastMessage({
      type: 'success',
      title: `حواله ورق ${voucherNo} برای دستور ${order.orderCode} صادر شد`,
      detail: `مقدار ${formatNumber(grossRequiredKg)} کیلوگرم «${order.rawMaterialName}» از انبار کسر و به ایستگاه ${order.operations[0]?.stepCode || 'OP10'} ارسال شد.`,
      trackOrderId: order.id,
      navAction: {
        label: 'مشاهده در کاردکس انبار',
        onClick: () => onNavigateToTab?.('inventory', 'MOVEMENT'),
      },
    });
  };

  // Open Step Logger with Strict Precedence Validation (تقدم و تأخر)
  const handleOpenStepLogger = (order: HighwayPartScenario, opIdx: number) => {
    const targetOp = order.operations[opIdx];
    const prevOp = opIdx > 0 ? order.operations[opIdx - 1] : null;

    if (prevOp && prevOp.completedGood === 0) {
      setToastMessage({
        type: 'warning',
        title: `توقف به دلیل تقدم و تأخر فرآیند (${targetOp.stepCode} قفل است)`,
        detail: `شما نمی‌توانید «${targetOp.stepName}» را شروع کنید زیرا مرحله قبلی (${prevOp.stepCode} — ${prevOp.stepName}) هنوز هیچ خروجی سالمی ثبت نکرده است.`,
        trackOrderId: order.id,
      });
      return;
    }

    const maxAllowedFromPrev = prevOp ? prevOp.completedGood : order.orderQty;
    const remainingToComplete = Math.max(0, maxAllowedFromPrev - targetOp.completedGood);

    setLoggingTarget({ orderId: order.id, opIndex: opIdx });
    setLogQtyInput(
      String(remainingToComplete > 0 ? maxAllowedFromPrev : targetOp.completedGood || 500)
    );
    setLogScrapInput(String(targetOp.scrapQty || 0));
  };

  const handleSaveStepProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingTarget) return;

    const order = scenarios.find(s => s.id === loggingTarget.orderId);
    if (!order) return;

    const opIdx = loggingTarget.opIndex;
    const targetOp = order.operations[opIdx];
    const prevOp = opIdx > 0 ? order.operations[opIdx - 1] : null;
    const newGood = Math.max(0, Number(logQtyInput) || 0);
    const newScrap = Math.max(0, Number(logScrapInput) || 0);

    if (prevOp && newGood > prevOp.completedGood) {
      setToastMessage({
        type: 'warning',
        title: 'خطای سقف مجاز ورودی از مرحله قبل',
        detail: `تعداد ثبت‌شده (${formatNumber(newGood)} عدد) نمی‌تواند از خروجی سالم مرحله قبلی (${formatNumber(prevOp.completedGood)} عدد در ${prevOp.stepCode}) بیشتر باشد.`,
      });
      return;
    }

    const docNo = targetOp.isFinal
      ? `FG-REC-${Math.floor(1000 + Math.random() * 8999)}`
      : `OP-LOG-${Math.floor(1000 + Math.random() * 8999)}`;

    const newLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: docNo,
      type: targetOp.isFinal ? 'FG_RECEIPT' : 'OP_LOGGED',
      title: targetOp.isFinal
        ? `تکمیل ${targetOp.stepCode} و صدور رسید محصول نهایی به انبار`
        : `ثبت تولید ایستگاه ${targetOp.stepCode} (${targetOp.stepName})`,
      timestamp: 'امروز - ثبت کارگاه',
      qtyOrWeight: `${formatNumber(newGood)} عدد سالم (ضایعات: ${formatNumber(newScrap)})`,
      targetStation: targetOp.isFinal
        ? 'انبار محصول نهایی'
        : order.operations[opIdx + 1]?.stepName || targetOp.hall,
    };

    const updated = scenarios.map(scn => {
      if (scn.id !== order.id) return scn;
      const nextOps = scn.operations.map((op, i) => {
        if (i !== opIdx) return op;
        return { ...op, completedGood: newGood, scrapQty: newScrap };
      });
      return {
        ...scn,
        finishedReceiptVoucherNo: targetOp.isFinal ? docNo : scn.finishedReceiptVoucherNo,
        operations: nextOps,
        commandLogs: [newLog, ...(scn.commandLogs || [])],
      };
    });

    saveScenarios(updated);
    setLoggingTarget(null);

    setToastMessage({
      type: 'success',
      title: targetOp.isFinal
        ? `رسید انبار محصول (${docNo}) صادر شد`
        : `کارکرد ${targetOp.stepCode} (${docNo}) ثبت شد`,
      detail: targetOp.isFinal
        ? `${formatNumber(newGood)} عدد «${order.partName}» در انبار محصول نهایی رسید شد.`
        : `موجودی بافر پای خط بروزرسانی شد و ایستگاه بعدی آماده تولید است.`,
      trackOrderId: order.id,
    });
  };

  // Save Edited or New Work Order
  const handleSaveWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const creationLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: editingOrder.orderCode,
      type: 'MO_CREATED',
      title: isNewOrderMode
        ? `صدور دستور تولید (MO) متصل به BOM و ${toPersianDigits(editingOrder.operations.length)} ایستگاه OP`
        : `بروزرسانی دستور تولید ${editingOrder.orderCode}`,
      timestamp: 'امروز - ثبت برنامه‌ریزی',
      qtyOrWeight: `${formatNumber(editingOrder.orderQty)} عدد`,
      targetStation: editingOrder.operations[0]?.hall || 'سالن برشکاری',
    };

    const enrichedOrder: HighwayPartScenario = {
      ...editingOrder,
      commandLogs: [creationLog, ...(editingOrder.commandLogs || [])],
    };

    if (isNewOrderMode) {
      saveScenarios([enrichedOrder, ...scenarios]);
      setExpandedOrderId(enrichedOrder.id);
      setExpandedViewMode('OPS');
      setToastMessage({
        type: 'success',
        title: `دستور تولید ${enrichedOrder.orderCode} صادر شد`,
        detail: `کالای «${enrichedOrder.partName}» با ${toPersianDigits(enrichedOrder.operations.length)} ایستگاه کاری (OP) و ورق «${enrichedOrder.rawMaterialName}» به خط تولید ابلاغ شد.`,
        trackOrderId: enrichedOrder.id,
      });
    } else {
      const next = scenarios.map(s => (s.id === enrichedOrder.id ? enrichedOrder : s));
      saveScenarios(next);
      setToastMessage({
        type: 'success',
        title: `دستور تولید ${enrichedOrder.orderCode} بروزرسانی شد`,
        detail: `تغییرات دستور ساخت ذخیره گردید.`,
        trackOrderId: enrichedOrder.id,
      });
    }
    setEditingOrder(null);
    setIsNewOrderMode(false);
  };

  // Delete Work Order
  const handleDeleteOrder = (order: HighwayPartScenario) => {
    const next = scenarios.filter(s => s.id !== order.id);
    saveScenarios(next);
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
    }
    setToastMessage({
      type: 'info',
      title: `دستور تولید ${order.orderCode} حذف شد`,
      detail: `قطعه «${order.partName}» از فهرست دستورهای فعال خارج گردید.`,
    });
  };

  // Save Edited or New Operation Step
  const handleSaveOperationStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpContext) return;

    const { orderId, opIndex, stepData } = editingOpContext;
    const next = scenarios.map(scn => {
      if (scn.id !== orderId) return scn;
      let updatedOps = [...scn.operations];
      if (opIndex === null) {
        updatedOps = updatedOps.map(o => ({ ...o, isFinal: false }));
        updatedOps.push({ ...stepData, isFinal: true });
      } else {
        updatedOps[opIndex] = stepData;
      }
      return { ...scn, operations: updatedOps };
    });

    saveScenarios(next);
    setEditingOpContext(null);
    setToastMessage({
      type: 'success',
      title: opIndex === null ? 'ایستگاه OP جدید به مسیر قطعه اضافه شد' : 'ایستگاه OP ویرایش شد',
      detail: `عملیات ${stepData.stepCode} (${stepData.stepName}) روی دستگاه «${stepData.machineName}» با قالب «${stepData.dieName}» ثبت شد.`,
      trackOrderId: orderId,
    });
  };

  // Delete an Operation Step
  const handleDeleteOperationStep = (orderId: string, opIdx: number) => {
    const next = scenarios.map(scn => {
      if (scn.id !== orderId) return scn;
      if (scn.operations.length <= 1) return scn;
      const filtered = scn.operations.filter((_, i) => i !== opIdx);
      const fixed = filtered.map((o, i) => ({
        ...o,
        isFinal: i === filtered.length - 1,
      }));
      return { ...scn, operations: fixed };
    });
    saveScenarios(next);
  };

  const trackedOrder = useMemo(
    () => scenarios.find(s => s.id === trackingOrderId) || null,
    [scenarios, trackingOrderId]
  );

  // Halls list from Master Data or defaults
  const hallsCatalog = useMemo(
    () => (halls.length > 0 ? halls : FACTORY_HALLS),
    [halls]
  );

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* ==================================================================== */}
      {/* 1. MINIMALIST TOP BAR (Clean, Non-Crowded, On-Demand Toggles)        */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              پیشخوان دستورهای تولید (MO) و رهگیری ایستگاه‌ها (OP)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تمامی دستورها به کاتالوگ کالا، درخت محصول (BOM) و مسیر تولید (OP) متصل هستند. جزئیات تنها به درخواست شما باز می‌شوند.
            </p>
          </div>

          {/* On-Demand Tool Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKpiPanel(!showKpiPanel)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showKpiPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>شاخص‌ها و OEE</span>
              {showKpiPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarehouseTools(!showWarehouseTools)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showWarehouseTools
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>ابزارهای انبار ورق</span>
              {showWarehouseTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleOpenCreateNewOrder}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>صدور دستور تولید (MO)</span>
            </button>
          </div>
        </div>

        {/* Search & Car Filter Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام قطعه، شماره دستور تولید (MO)، کد فنی، ورق یا خودرو..."
              className="w-full pr-9 pl-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCarFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                carFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              همه خودروها ({toPersianDigits(scenarios.length)})
            </button>
            {uniqueCarModels.map(car => (
              <button
                key={car}
                type="button"
                onClick={() => setCarFilter(car)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  carFilter === car
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {car}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                saveScenarios(INITIAL_SCENARIOS);
                setToastMessage({
                  type: 'info',
                  title: 'داده‌های نمونه بازنشانی شد',
                  detail: 'فهرست دستورهای تولید به حالت استاندارد اولیه بازگشت.',
                });
              }}
              title="بازنشانی داده‌های نمونه"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. ON-DEMAND KPI DRAWER (Only visible when user clicks شاخص‌ها و OEE) */}
      {/* ==================================================================== */}
      {showKpiPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800">
              خلاصه شاخص‌های کلیدی عملکرد و موجودی کارخانه
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateSubModule?.('reports')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                <span>گزارش تحلیلی کامل OEE</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowKpiPanel(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500">موجودی ورق تخصیص‌یافته</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1 tabular-nums">
                {formatNumber(aggregateMetrics.totalWarehouseKg)} کیلوگرم
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500">مجموع تیراژ دستورهای فعال</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1 tabular-nums">
                {formatNumber(aggregateMetrics.totalOrderQty)} عدد
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500">موجودی نیمه‌ساخته پای خط (WIP)</div>
              <div className="text-lg font-bold text-amber-700 font-mono mt-1 tabular-nums">
                {formatNumber(aggregateMetrics.totalWipQty)} قطعه
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-slate-500">تحویل به انبار محصول · شاخص OEE</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                {formatNumber(aggregateMetrics.totalFinishedQty)} عدد · ۸۵.۴٪
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. ON-DEMAND WAREHOUSE TOOLS (Only visible when user clicks ابزار انبار)*/}
      {/* ==================================================================== */}
      {showWarehouseTools && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800">
              دسترسی سریع به ابزارهای انبار و گردش ورق
            </span>
            <button
              type="button"
              onClick={() => setShowWarehouseTools(false)}
              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigateSubModule?.('inventory', { inventorySubTab: 'INQUIRY' })}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">استعلام موجودی و کاردکس کالا</div>
                <div className="text-[11px] text-slate-500 mt-0.5">گردش ورود، خروج و مانده هر قطعه</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubModule?.('inventory', { inventorySubTab: 'COILS' })}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">مدیریت رول‌های ورق و کویل‌پک</div>
                <div className="text-[11px] text-slate-500 mt-0.5">کلاف‌های موجود و ته‌کلاف برگشتی</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubModule?.('inventory', { inventorySubTab: 'DASHBOARD' })}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">ثبت رسید و حواله ورق به خط</div>
                <div className="text-[11px] text-slate-500 mt-0.5">ارسال ورق با شماره دستور ساخت</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigateSubModule?.('production', {
                  productionViewMode: 'ERP_WORKBENCH',
                  productionModuleTab: 'DAILY_DISPATCH_SHEET',
                })
              }
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">چاپ برگه کار روزانه شیفت</div>
                <div className="text-[11px] text-slate-500 mt-0.5">خروجی چاپی برنامه ایستگاه‌ها</div>
              </div>
              <Printer className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* COMMAND NOTIFICATION BANNER WITH LIVE TRACKING BUTTON (`پیگیری دستور`) */}
      {/* ==================================================================== */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-950 border-amber-200'
              : 'bg-slate-100 text-slate-900 border-slate-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">{toastMessage.title}: </span>
              <span className="text-slate-700">{toastMessage.detail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {toastMessage.trackOrderId && (
              <button
                type="button"
                onClick={() => setTrackingOrderId(toastMessage.trackOrderId!)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>پیگیری دستور</span>
              </button>
            )}
            {toastMessage.navAction && (
              <button
                type="button"
                onClick={toastMessage.navAction.onClick}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer"
              >
                {toastMessage.navAction.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="px-2 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-600 font-semibold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. MINIMAL & READABLE WORK ORDERS TABLE (With On-Demand Expansion)   */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">شماره دستور تولید (MO)</th>
                <th className="py-3.5 px-4 font-semibold">کالا / محصول (متصل به BOM)</th>
                <th className="py-3.5 px-4 font-semibold">تیراژ دستور</th>
                <th className="py-3.5 px-4 font-semibold">ایستگاه جاری (OP)</th>
                <th className="py-3.5 px-4 font-semibold">تحویل به انبار</th>
                <th className="py-3.5 px-4 font-semibold text-left">پیگیری و جزئیات (بر اساس تقاضا)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    هیچ دستور کاری مطابق با عبارت جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const lastOp = order.operations[order.operations.length - 1];
                  const finishedQty = lastOp ? lastOp.completedGood : 0;
                  const progressPct = Math.min(
                    100,
                    Math.round((finishedQty / Math.max(1, order.orderQty)) * 100)
                  );

                  const activeStep =
                    order.operations.find(op => op.completedGood < order.orderQty) || lastOp;

                  const netWeightKg = Math.round(order.orderQty * order.unitWeightKg);
                  const grossRequiredKg = Math.round(
                    netWeightKg * (1 + order.scrapAllowancePct / 100)
                  );

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`transition-colors ${
                          isExpanded ? 'bg-slate-50/90' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">{order.orderCode}</div>
                          {order.materialIssuedVoucherNo ? (
                            <span className="inline-block mt-0.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              حواله ورق: {order.materialIssuedVoucherNo}
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              در انتظار حواله ورق
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-bold text-slate-900">{order.partName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {order.carModel} ·{' '}
                            <span className="font-mono text-[11px]">{order.partCode}</span> · ورق:{' '}
                            <span className="text-slate-700 font-medium">{order.rawMaterialName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap">
                          {formatNumber(order.orderQty)}{' '}
                          <span className="text-xs font-normal text-slate-500">عدد</span>
                        </td>
                        <td className="py-4 px-4">
                          {activeStep ? (
                            <div className="text-slate-700">
                              <span className="font-mono font-bold text-slate-900">
                                {activeStep.stepCode}
                              </span>{' '}
                              — {activeStep.stepName}
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-semibold">تکمیل شده</span>
                          )}
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {toPersianDigits(order.operations.length)} مرحله OP از مسیر تولید کالا
                          </div>
                        </td>
                        <td className="py-4 px-4 w-40">
                          <div className="flex items-center justify-between font-mono text-xs mb-1 tabular-nums">
                            <span className="font-bold text-slate-900">
                              {formatNumber(finishedQty)} عدد
                            </span>
                            <span className="text-slate-400">{toPersianDigits(progressPct)}٪</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-900 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-4 text-left whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Track Order Button (`پیگیری دستور`) */}
                            <button
                              type="button"
                              onClick={() => setTrackingOrderId(order.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="پیگیری کامل زنجیره این دستور (از حواله ورق تا ایستگاه‌های OP و رسید انبار)"
                            >
                              <Compass className="w-3.5 h-3.5 text-emerald-600" />
                              <span>پیگیری دستور</span>
                            </button>

                            {/* On-Demand: Open Operations Pipeline */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded && expandedViewMode === 'OPS') {
                                  setExpandedOrderId(null);
                                } else {
                                  setExpandedOrderId(order.id);
                                  setExpandedViewMode('OPS');
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                isExpanded && expandedViewMode === 'OPS'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <Hammer className="w-3.5 h-3.5" />
                              <span>مراحل (OP)</span>
                            </button>

                            {/* On-Demand: Open Sheet & BOM Details */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded && expandedViewMode === 'BOM') {
                                  setExpandedOrderId(null);
                                } else {
                                  setExpandedOrderId(order.id);
                                  setExpandedViewMode('BOM');
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                isExpanded && expandedViewMode === 'BOM'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <Cpu className="w-3.5 h-3.5" />
                              <span>ورق و BOM</span>
                            </button>

                            {/* Edit Order Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewOrderMode(false);
                                setAllowManualSheetOverride(Boolean(order.isCustomSheetOverride));
                                setEditingOrder(order);
                              }}
                              title="ویرایش دستور تولید"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Order Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              title="حذف دستور تولید"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ====================================================== */}
                      {/* EXPANDED ON-DEMAND PANEL FOR THIS SPECIFIC WORK ORDER  */}
                      {/* ====================================================== */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/70 p-4 border-b border-slate-200">
                            {expandedViewMode === 'OPS' ? (
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                  <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                      توالی ایستگاه‌های کاری (OP) متصل به مسیر تولید — {order.partName}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      قانون تقدم و تأخر: هر ایستگاه تنها به اندازه خروجی سالم ایستگاه قبلی مجاز به ثبت تولید است.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextStepNum = (order.operations.length + 1) * 10;
                                        const partDies = dies.filter(
                                          d =>
                                            d.partId === order.partId || d.partCode === order.partCode
                                        );
                                        const defaultMachine = machines[0];
                                        const defaultDie = partDies[0] || dies[0];
                                        setEditingOpContext({
                                          orderId: order.id,
                                          partId: order.partId,
                                          partCode: order.partCode,
                                          opIndex: null,
                                          stepData: {
                                            stepCode: `OP${nextStepNum}`,
                                            stepName: PROCESS_DEFINITIONS[3].name,
                                            processType: 'PUNCH_FORM',
                                            hall:
                                              defaultMachine?.location ||
                                              FACTORY_HALLS[3].name,
                                            machineId: defaultMachine?.id,
                                            machineName:
                                              defaultMachine?.name || 'پرس ضربه‌ای ۲۵۰ تن ۱',
                                            dieId: defaultDie?.id,
                                            dieName:
                                              defaultDie?.code || `DIE-${order.partCode.slice(-5)}`,
                                            cycleTimeSec: 12,
                                            completedGood: 0,
                                            scrapQty: 0,
                                            isFinal: true,
                                          },
                                        });
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>افزودن مرحله (OP) از بانک عملیات</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedOrderId(null)}
                                      className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs cursor-pointer"
                                    >
                                      بستن ✕
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-right">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2.5 px-3 font-semibold">کد OP</th>
                                        <th className="py-2.5 px-3 font-semibold">عملیات تولید و سالن</th>
                                        <th className="py-2.5 px-3 font-semibold">دستگاه پرس و قالب متصل</th>
                                        <th className="py-2.5 px-3 font-semibold">موجودی ورودی (بافر)</th>
                                        <th className="py-2.5 px-3 font-semibold">تولید سالم</th>
                                        <th className="py-2.5 px-3 font-semibold">ضایعات</th>
                                        <th className="py-2.5 px-3 font-semibold text-left">ثبت کارکرد / ویرایش</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {order.operations.map((op, idx) => {
                                        const prevOp = idx > 0 ? order.operations[idx - 1] : null;
                                        const isLocked = prevOp !== null && prevOp.completedGood === 0;
                                        const availableFromPrev = prevOp
                                          ? Math.max(0, prevOp.completedGood - op.completedGood)
                                          : Math.max(0, order.orderQty - op.completedGood);

                                        return (
                                          <tr
                                            key={op.stepCode + idx}
                                            className={isLocked ? 'bg-slate-50/60 text-slate-400' : ''}
                                          >
                                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                              {op.stepCode}
                                            </td>
                                            <td className="py-3 px-3">
                                              <div className="font-semibold text-slate-900">
                                                {op.stepName}
                                              </div>
                                              <div className="text-[11px] text-slate-500">
                                                {op.hall}
                                                {op.isShared && op.sharedWithPart
                                                  ? ` · قالب مشترک با ${op.sharedWithPart}`
                                                  : ''}
                                                {op.isFinal ? ' · مرحله نهایی (رسید انبار)' : ''}
                                              </div>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">
                                              <div>{op.machineName}</div>
                                              <div className="text-[11px] font-mono text-slate-400">
                                                قالب: {op.dieName}
                                              </div>
                                            </td>
                                            <td className="py-3 px-3 font-mono tabular-nums">
                                              {idx === 0 ? (
                                                <span>ورق خام ({formatNumber(order.orderQty)})</span>
                                              ) : isLocked ? (
                                                <span className="text-slate-400">۰ عدد (بافر خالی)</span>
                                              ) : (
                                                <span className="text-slate-800 font-semibold">
                                                  {formatNumber(availableFromPrev)} آماده در بافر
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                                              {formatNumber(op.completedGood)}{' '}
                                              <span className="text-[11px] font-normal text-slate-400">
                                                / {formatNumber(order.orderQty)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                                              {formatNumber(op.scrapQty)}
                                            </td>
                                            <td className="py-3 px-3 text-left whitespace-nowrap">
                                              <div className="inline-flex items-center gap-1.5">
                                                {isLocked ? (
                                                  <span
                                                    onClick={() => handleOpenStepLogger(order, idx)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium cursor-not-allowed"
                                                  >
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>قفل تقدم ({prevOp?.stepCode})</span>
                                                  </span>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenStepLogger(order, idx)}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                                                  >
                                                    ثبت تولید
                                                  </button>
                                                )}

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setEditingOpContext({
                                                      orderId: order.id,
                                                      partId: order.partId,
                                                      partCode: order.partCode,
                                                      opIndex: idx,
                                                      stepData: { ...op },
                                                    })
                                                  }
                                                  title="ویرایش ایستگاه (متصل به بانک عملیات، پرس‌ها و قالب‌ها)"
                                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                                >
                                                  <Edit3 className="w-3.5 h-3.5" />
                                                </button>

                                                {order.operations.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleDeleteOperationStep(order.id, idx)
                                                    }
                                                    title="حذف این مرحله"
                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              /* ON-DEMAND BOM & RAW MATERIAL PANEL */
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                      ورق مصرفی و ساختار درختی (BOM) — {order.partName}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {order.rawMaterialName} ({order.rawMaterialCode})
                                      {order.isCustomSheetOverride
                                        ? ' · [ورق جایگزین به انتخاب کاربر]'
                                        : ' · [ورق استاندارد پیش‌فرض BOM قطعه]'}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedOrderId(null)}
                                    className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs cursor-pointer"
                                  >
                                    بستن ✕
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="text-slate-500">نیاز ناخالص ورق (با پرت):</span>
                                    <div className="text-sm font-bold text-slate-900 font-mono mt-1 tabular-nums">
                                      {formatNumber(grossRequiredKg)} کیلوگرم
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="text-slate-500">موجودی فعلی در انبار ورق:</span>
                                    <div className="text-sm font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                                      {formatNumber(order.warehouseAvailableKg)} کیلوگرم
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <div>
                                      <span className="text-slate-500">وضعیت حواله ورق به خط:</span>
                                      <div className="text-xs font-semibold text-slate-800 mt-1">
                                        {order.materialIssuedVoucherNo
                                          ? `صادر شده (${order.materialIssuedVoucherNo})`
                                          : 'آماده صدور حواله از انبار'}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleIssueSheetForOrder(order)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                                    >
                                      {order.materialIssuedVoucherNo
                                        ? 'صدور حواله مجدد'
                                        : 'صدور حواله ورق'}
                                    </button>
                                  </div>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                  <div className="text-xs font-bold text-slate-700 mb-2">
                                    اجزای درخت محصول (BOM):
                                  </div>
                                  <div className="divide-y divide-slate-100 text-xs">
                                    {order.bomSubComponents.map((sub, i) => (
                                      <div
                                        key={i}
                                        className="py-2 flex items-center justify-between"
                                      >
                                        <span className="text-slate-800 font-medium">
                                          {sub.name}{' '}
                                          <span className="text-slate-400">({sub.stage})</span>
                                        </span>
                                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                                          {formatNumber(sub.qtyPerParent * order.orderQty)}{' '}
                                          {sub.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: LOG STEP PRODUCTION                                         */}
      {/* ==================================================================== */}
      {loggingTarget !== null && (() => {
        const order = scenarios.find(s => s.id === loggingTarget.orderId);
        if (!order) return null;
        const op = order.operations[loggingTarget.opIndex];
        const prevOp =
          loggingTarget.opIndex > 0 ? order.operations[loggingTarget.opIndex - 1] : null;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    ثبت آمار تولید ایستگاه — {op.stepCode} ({op.stepName})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دستور {order.orderCode} · {order.partName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoggingTarget(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStepProduction} className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
                  <div>
                    دستگاه: <strong>{op.machineName}</strong> · قالب: <strong className="font-mono">{op.dieName}</strong>
                  </div>
                  {prevOp ? (
                    <div>
                      سقف مجاز بر اساس خروجی مرحله قبلی ({prevOp.stepCode}):{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumber(prevOp.completedGood)} عدد
                      </strong>
                    </div>
                  ) : (
                    <div>
                      ورودی از ورق برش‌خورده ({order.rawMaterialCode}):{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumber(order.orderQty)} عدد
                      </strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    تعداد کل قطعات سالم تولیدشده در این مرحله:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={prevOp ? prevOp.completedGood : order.orderQty}
                    value={logQtyInput}
                    onChange={e => setLogQtyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    تعداد ضایعات ایستگاه:
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={logScrapInput}
                    onChange={e => setLogScrapInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLoggingTarget(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    ثبت و صدور سند کارکرد
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE / EDIT MANUFACTURING ORDER (100% CONNECTED TO PARTS, */}
      {/* ROUTINGS/OP, AND BOM RAW MATERIAL SHEETS!)                           */}
      {/* ==================================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {isNewOrderMode
                    ? 'صدور دستور تولید جدید (MO) — متصل به کاتالوگ کالا، BOM و مسیر تولید (OP)'
                    : `ویرایش دستور تولید ${editingOrder.orderCode}`}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  با انتخاب کالا از اطلاعات پایه، مراحل تولید (OP) و ورق مصرفی استاندارد (BOM) به صورت خودکار بارگذاری می‌شوند.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkOrder} className="space-y-4 text-xs">
              {/* STEP 1: Select Product / Part from Master Data */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>۱. انتخاب کالا / قطعه تولیدی از اطلاعات پایه:</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    متصل به کاتالوگ قطعات و مسیر تولید
                  </span>
                </div>

                <select
                  value={editingOrder.partId}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const foundPart = produciblePartsCatalog.find(p => p.id === selectedId);
                    if (foundPart) {
                      const rebuilt = buildOrderDataFromMasterPart(
                        foundPart,
                        editingOrder.orderCode
                      );
                      rebuilt.id = editingOrder.id;
                      rebuilt.orderQty = editingOrder.orderQty;
                      setEditingOrder(rebuilt);
                      setAllowManualSheetOverride(false);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                >
                  {produciblePartsCatalog.map(part => (
                    <option key={part.id} value={part.id}>
                      {part.name} — ({part.code}) | خودرو: {part.carModel || 'عمومی'} | وزن:{' '}
                      {part.weightPerUnitKg} ک.گ
                    </option>
                  ))}
                  {!produciblePartsCatalog.some(p => p.id === editingOrder.partId) && (
                    <option value={editingOrder.partId}>
                      {editingOrder.partName} — ({editingOrder.partCode})
                    </option>
                  )}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      شماره دستور تولید (MO):
                    </label>
                    <input
                      type="text"
                      value={editingOrder.orderCode}
                      onChange={e =>
                        setEditingOrder({ ...editingOrder, orderCode: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      تیراژ دستور تولید (عدد):
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingOrder.orderQty}
                      onChange={e =>
                        setEditingOrder({
                          ...editingOrder,
                          orderQty: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      خودرو / مشتری (از شناسنامه کالا):
                    </label>
                    <input
                      type="text"
                      value={`${editingOrder.carModel} · ${editingOrder.customerName}`}
                      readOnly
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: BOM Raw Material Sheet (Default from BOM + Optional User Override!) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>۲. ورق مصرفی بر اساس درخت محصول (BOM):</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowManualSheetOverride}
                      onChange={e => setAllowManualSheetOverride(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900"
                    />
                    <span>تغییر اختیاری ورق / جایگزینی رول به انتخاب کاربر</span>
                  </label>
                </div>

                {!allowManualSheetOverride ? (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {editingOrder.rawMaterialName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        کد ورق BOM: {editingOrder.rawMaterialCode} · وزن واحد قطعه:{' '}
                        {editingOrder.unitWeightKg} ک.گ
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-slate-900">
                        نیاز ناخالص:{' '}
                        {formatNumber(
                          Math.round(
                            editingOrder.orderQty *
                              editingOrder.unitWeightKg *
                              (1 + editingOrder.scrapAllowancePct / 100)
                          )
                        )}{' '}
                        ک.گ
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        موجودی انبار: {formatNumber(editingOrder.warehouseAvailableKg)} ک.گ
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[11px] text-amber-800 font-semibold">
                      انتخاب ورق یا کلاف جایگزین از موجودی انبار (اختیار کاربر):
                    </label>
                    <select
                      value={editingOrder.rawMaterialCode}
                      onChange={e => {
                        const chosen = availableRawSheetsCatalog.find(
                          rm => rm.code === e.target.value
                        );
                        if (chosen) {
                          setEditingOrder({
                            ...editingOrder,
                            rawMaterialPartId: chosen.id,
                            rawMaterialCode: chosen.code,
                            rawMaterialName: chosen.name,
                            warehouseAvailableKg: chosen.availableKg,
                            isCustomSheetOverride: true,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 text-slate-900 font-semibold cursor-pointer"
                    >
                      {availableRawSheetsCatalog.map(rm => (
                        <option key={rm.code} value={rm.code}>
                          {rm.name} ({rm.code}) — موجودی انبار: {formatNumber(rm.availableKg)} ک.گ
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* STEP 3: Preview of Connected Routing & OP Steps */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-emerald-600" />
                    <span>
                      ۳. مراحل عملیات تولید (OP) بارگذاری‌شده از مسیر تولید قطعه (
                      {toPersianDigits(editingOrder.operations.length)} ایستگاه):
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    قابل ویرایش و افزودن OP در جدول
                  </span>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {editingOrder.operations.map((op, i) => (
                    <div
                      key={op.stepCode + i}
                      className="px-3 py-2 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                          {op.stepCode}
                        </span>
                        <span className="font-semibold text-slate-900">{op.stepName}</span>
                        <span className="text-slate-400">({op.hall})</span>
                      </div>
                      <div className="text-slate-600 font-mono">
                        {op.machineName} · {op.dieName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  {isNewOrderMode ? 'صدور دستور تولید و ابلاغ به خط' : 'ذخیره تغییرات دستور تولید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDIT OR ADD OPERATION STEP (100% CONNECTED TO MASTER DATA   */}
      {/* PROCESS DEFINITIONS, HALLS, MACHINES & PART-CORRELATED DIES!)        */}
      {/* ==================================================================== */}
      {editingOpContext && (() => {
        const correlatedDies = dies.filter(
          d =>
            d.partId === editingOpContext.partId ||
            d.partCode === editingOpContext.partCode
        );
        const otherDies = dies.filter(
          d =>
            d.partId !== editingOpContext.partId &&
            d.partCode !== editingOpContext.partCode
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {editingOpContext.opIndex === null
                      ? 'افزودن مرحله عملیاتی (OP) متصل به اطلاعات پایه'
                      : `ویرایش ایستگاه ${editingOpContext.stepData.stepCode}`}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    انتخاب عملیات، سالن، دستگاه پرس و قالب مرتبط با قطعه از بانک اطلاعات پایه
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOpContext(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveOperationStep} className="space-y-3.5 text-xs">
                {/* 1. Standard Process Type & OP Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      کد مرحله (OP):
                    </label>
                    <select
                      value={editingOpContext.stepData.stepCode}
                      onChange={e =>
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: { ...editingOpContext.stepData, stepCode: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white cursor-pointer"
                    >
                      {['OP10', 'OP20', 'OP30', 'OP40', 'OP50', 'OP60', 'OP70', 'OP80'].map(
                        code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      نوع فرآیند استاندارد (از بانک عملیات تولید):
                    </label>
                    <select
                      value={editingOpContext.stepData.processType || 'PUNCH_FORM'}
                      onChange={e => {
                        const procCode = e.target.value as ProcessType;
                        const procDef = PROCESS_DEFINITIONS.find(p => p.code === procCode);
                        const compatibleMachine = machines.find(
                          m =>
                            m.processType === procCode ||
                            (m.capabilities && m.capabilities.includes(procCode))
                        );
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: {
                            ...editingOpContext.stepData,
                            processType: procCode,
                            stepName: procDef ? procDef.name : editingOpContext.stepData.stepName,
                            machineId: compatibleMachine?.id || editingOpContext.stepData.machineId,
                            machineName:
                              compatibleMachine?.name || editingOpContext.stepData.machineName,
                            hall:
                              compatibleMachine?.location || editingOpContext.stepData.hall,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white font-semibold cursor-pointer"
                    >
                      {PROCESS_DEFINITIONS.map(proc => (
                        <option key={proc.id} value={proc.code}>
                          {proc.name} ({proc.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Operation Title */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شرح دقیق عملیات در برگه کار ایستگاه:
                  </label>
                  <input
                    type="text"
                    value={editingOpContext.stepData.stepName}
                    onChange={e =>
                      setEditingOpContext({
                        ...editingOpContext,
                        stepData: { ...editingOpContext.stepData, stepName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                    required
                  />
                </div>

                {/* 3. Hall & Machine from Master Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      سالن تولید (از اطلاعات پایه):
                    </label>
                    <select
                      value={editingOpContext.stepData.hall}
                      onChange={e =>
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: { ...editingOpContext.stepData, hall: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white cursor-pointer"
                    >
                      {hallsCatalog.map(h => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                      {!hallsCatalog.some(h => h.name === editingOpContext.stepData.hall) && (
                        <option value={editingOpContext.stepData.hall}>
                          {editingOpContext.stepData.hall}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      دستگاه / پرس (از لیست ماشین‌آلات):
                    </label>
                    <select
                      value={editingOpContext.stepData.machineName}
                      onChange={e => {
                        const mch = machines.find(m => m.name === e.target.value);
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: {
                            ...editingOpContext.stepData,
                            machineId: mch?.id,
                            machineName: e.target.value,
                            hall: mch?.location || editingOpContext.stepData.hall,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white cursor-pointer"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.code}{m.tonnage ? ` · ${m.tonnage} تن` : ''})
                        </option>
                      ))}
                      {!machines.some(
                        m => m.name === editingOpContext.stepData.machineName
                      ) && (
                        <option value={editingOpContext.stepData.machineName}>
                          {editingOpContext.stepData.machineName}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 4. Die / Mold correlated with Part */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    قالب / فیکسچر متصل به قطعه (از بانک قالب‌ها):
                  </label>
                  <select
                    value={editingOpContext.stepData.dieName}
                    onChange={e => {
                      const d = dies.find(x => x.code === e.target.value);
                      setEditingOpContext({
                        ...editingOpContext,
                        stepData: {
                          ...editingOpContext.stepData,
                          dieId: d?.id,
                          dieName: e.target.value,
                        },
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white cursor-pointer"
                  >
                    {correlatedDies.length > 0 && (
                      <optgroup label="★ قالب‌های اختصاصی مرتبط با همین قطعه">
                        {correlatedDies.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} — {d.name} ({d.requiredTonnage} تن)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherDies.length > 0 && (
                      <optgroup label="سایر قالب‌ها و ابزارهای عمومی کارخانه">
                        {otherDies.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} — {d.name} ({d.partName})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {!dies.some(d => d.code === editingOpContext.stepData.dieName) && (
                      <option value={editingOpContext.stepData.dieName}>
                        {editingOpContext.stepData.dieName}
                      </option>
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOpContext(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    ذخیره ایستگاه کاری (OP)
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 4: LIVE ORDER & COMMAND TRACKER (`پیگیری دستور`)               */}
      {/* ==================================================================== */}
      {trackedOrder && (() => {
        const lastOp = trackedOrder.operations[trackedOrder.operations.length - 1];
        const finishedQty = lastOp ? lastOp.completedGood : 0;
        const netWeightKg = Math.round(trackedOrder.orderQty * trackedOrder.unitWeightKg);
        const grossRequiredKg = Math.round(
          netWeightKg * (1 + trackedOrder.scrapAllowancePct / 100)
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Compass className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      زنجیره پیگیری دستور تولید {trackedOrder.orderCode}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {trackedOrder.partName} ({trackedOrder.partCode}) · تیراژ:{' '}
                      {formatNumber(trackedOrder.orderQty)} عدد
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrderId(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 4-Stage End-to-End Traceability Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stage A: Raw Material Voucher */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۱. تامین و حواله ورق از انبار</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {trackedOrder.rawMaterialName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                      نیاز: {formatNumber(grossRequiredKg)} ک.گ
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    {trackedOrder.materialIssuedVoucherNo ? (
                      <span className="font-mono font-bold text-emerald-700">
                        سند: {trackedOrder.materialIssuedVoucherNo}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIssueSheetForOrder(trackedOrder)}
                        className="px-2.5 py-1 rounded bg-slate-900 text-white font-semibold cursor-pointer"
                      >
                        صدور حواله ورق
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateToTab?.('inventory', 'INQUIRY');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      کاردکس انبار ⟵
                    </button>
                  </div>
                </div>

                {/* Stage B: Shop-Floor OP Execution */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۲. وضعیت در ایستگاه‌های OP</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {toPersianDigits(trackedOrder.operations.length)} ایستگاه کاری متصل
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      ایستگاه اول: {trackedOrder.operations[0]?.completedGood || 0} عدد تولیدشده
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        setExpandedOrderId(trackedOrder.id);
                        setExpandedViewMode('OPS');
                      }}
                      className="text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      باز کردن جدول OPها
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateSubModule?.('production', {
                          productionViewMode: 'ERP_WORKBENCH',
                          productionModuleTab: 'LIVE_WIP_OP_TRACKER',
                        });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      رهگیری WIP ⟵
                    </button>
                  </div>
                </div>

                {/* Stage C: Finished Goods Receipt */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۳. رسید انبار محصول نهایی</div>
                    <div className="font-bold text-emerald-700 font-mono text-sm mt-1">
                      {formatNumber(finishedQty)} از {formatNumber(trackedOrder.orderQty)} عدد
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {trackedOrder.finishedReceiptVoucherNo
                        ? `سند رسید: ${trackedOrder.finishedReceiptVoucherNo}`
                        : 'پس از ثبت مرحله آخر صادر می‌شود'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500">مقصد: انبار محصول</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateSubModule?.('production', {
                          productionViewMode: 'ERP_WORKBENCH',
                          productionModuleTab: 'DAILY_DISPATCH_SHEET',
                        });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      برگه شیفت ⟵
                    </button>
                  </div>
                </div>
              </div>

              {/* Operation Steps Progress Table inside Tracker */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800">
                  وضعیت لحظه‌ای ایستگاه‌های کاری (OP) این دستور:
                </div>
                <div className="divide-y divide-slate-100">
                  {trackedOrder.operations.map((op, i) => {
                    const prev = i > 0 ? trackedOrder.operations[i - 1] : null;
                    const locked = prev !== null && prev.completedGood === 0;
                    const wipInBuffer = prev
                      ? Math.max(0, prev.completedGood - op.completedGood)
                      : Math.max(0, trackedOrder.orderQty - op.completedGood);

                    return (
                      <div
                        key={op.stepCode + i}
                        className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                            {op.stepCode}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{op.stepName}</div>
                            <div className="text-[11px] text-slate-500">
                              {op.hall} · {op.machineName} · قالب {op.dieName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center font-mono">
                          <span className="text-slate-600">
                            بافر ورودی: <strong>{formatNumber(wipInBuffer)}</strong>
                          </span>
                          <span className="text-emerald-700 font-bold">
                            تولید سالم: {formatNumber(op.completedGood)}
                          </span>
                          {locked ? (
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[11px]">
                              قفل تقدم ({prev?.stepCode})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTrackingOrderId(null);
                                handleOpenStepLogger(trackedOrder, i);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-sans font-semibold cursor-pointer"
                            >
                              ثبت کارکرد
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issued Documents & Command Audit Log */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-600" />
                  <span>تاریخچه دستورات و اسناد صادرشده برای این دستور کار:</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {(trackedOrder.commandLogs || []).length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      هنوز سندی برای این دستور ثبت نشده است.
                    </div>
                  ) : (
                    (trackedOrder.commandLogs || []).map(log => (
                      <div
                        key={log.id}
                        className="px-3.5 py-2 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 ml-2">
                            [{log.docNumber}]
                          </span>
                          <span className="font-semibold text-slate-800">{log.title}</span>
                          <span className="text-slate-400 mr-2">({log.targetStation})</span>
                        </div>
                        <div className="font-mono text-slate-600 shrink-0">
                          {log.qtyOrWeight} · {log.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrderId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  بستن پنجره پیگیری
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
