import React, { useState, useMemo } from 'react';
import {
  X,
  Boxes,
  Layers,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Factory,
  Flame,
  Info,
  Check,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HighwayPartScenario } from './FactoryHighwayWorkbench';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { INITIAL_ADVANCED_BOMS, getAllBoms } from '../../server/bomAndParallelEngine';
import { INITIAL_PARTS } from '../../server/sampleData';

export interface PreMoWipInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: HighwayPartScenario;
  onConfirmIssueOrder?: (updatedOrder: HighwayPartScenario) => void;
  onIssueSubMo?: (subMoData: {
    parentMoId: string;
    parentOrderCode: string;
    componentPartId: string;
    componentPartCode: string;
    componentPartName: string;
    requiredQty: number;
    subRoutingId?: string;
  }) => void;
}

// Stage-by-stage WIP detail interface
export interface InterStageWipStep {
  stepCode: string;
  stepName: string;
  processType: string;
  machineName: string;
  hallName: string;
  waitingInputQty: number;
  inProgressQty: number;
  goodBufferQty: number;
  scrapQty: number;
  normScrapPercent: number;
}

export interface SubComponentInspectionRow {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  componentType: 'SUB_ASSEMBLY' | 'RAW_SHEET' | 'FASTENER' | 'OTHER';
  quantityPerAssembly: number;
  unit: string;
  totalRequiredQty: number;
  warehouseStockQty: number;
  interStageWipQty: number;
  totalAvailableQty: number;
  shortageQty: number;
  coveragePercent: number;
  status: 'COVERED' | 'SHORTAGE' | 'CRITICAL';
  subMoRequired: boolean;
  subRoutingId?: string;
  subMoIssued?: boolean;
  issuedSubMoCode?: string;
  stages: InterStageWipStep[];
  rawMaterialInfo?: {
    materialName: string;
    coilNumber?: string;
    heatNumber?: string;
    requiredKg: number;
    availableKg: number;
  };
}

export const PreMoWipInspectionModal: React.FC<PreMoWipInspectionModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmIssueOrder,
  onIssueSubMo,
}) => {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [issuedSubMos, setIssuedSubMos] = useState<Record<string, string>>({});
  const [allocatedStocks, setAllocatedStocks] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INTER_STAGE' | 'RAW_MATERIALS'>('OVERVIEW');
  const [expandedStageKey, setExpandedStageKey] = useState<string | null>('ALL');

  // Match BOM for current part
  const matchedBom = useMemo(() => {
    const allBoms = getAllBoms();
    // First try exact part ID or code match
    const found = allBoms.find(
      b =>
        b.assemblyPartId === order.partId ||
        b.assemblyPartCode === order.partCode ||
        order.partName.includes('ECU') ||
        order.partName.includes('ضدسرقت') ||
        order.partId.includes('ECU')
    );
    if (found) return found;

    // Check by name keywords
    if (order.partName.includes('تارا') || order.partCode.includes('TARA')) {
      return allBoms.find(b => b.assemblyPartCode.includes('TARA')) || allBoms[1];
    }
    if (order.partName.includes('۲۰۶') || order.partName.includes('قفل')) {
      return allBoms[0];
    }
    return INITIAL_ADVANCED_BOMS[2] || allBoms[0];
  }, [order.partId, order.partCode, order.partName]);

  // Build realistic, industrial inspection rows for sub-components
  const subComponents = useMemo<SubComponentInspectionRow[]>(() => {
    const orderQty = Math.max(1, order.orderQty);
    const isEcuBracket =
      order.partCode.includes('ECU') ||
      order.partName.includes('ECU') ||
      order.partName.includes('ضدسرقت');

    if (isEcuBracket) {
      // 1. صفحه براکت اصلی ضدسرقت
      const mainStages: InterStageWipStep[] = [
        {
          stepCode: 'OP10_SLIT',
          stepName: 'نواربری و برش کویل ورق DC01A (عرض ۱۱۴۰)',
          processType: 'SHEARING',
          machineName: 'خط نواربر رول ۲',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 0,
          inProgressQty: 250,
          goodBufferQty: 450,
          scrapQty: 8,
          normScrapPercent: 0.8,
        },
        {
          stepCode: 'OP15_SHEAR',
          stepName: 'برش با قیچی گیوتین و ابعاددهی شیت اولیه',
          processType: 'SHEARING',
          machineName: 'قیچی گیوتین هیدرولیک',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 100,
          inProgressQty: 180,
          goodBufferQty: 320,
          scrapQty: 4,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP20_BLNK',
          stepName: 'بلنکینگ و خالی‌بری کانتور اصلی براکت',
          processType: 'BLANKING',
          machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
          hallName: 'سالن پرس‌های سنگین',
          waitingInputQty: 300,
          inProgressQty: 400,
          goodBufferQty: 1100,
          scrapQty: 22,
          normScrapPercent: 1.2,
        },
        {
          stepCode: 'OP30_BEND',
          stepName: 'خم لبه‌ها و فلنجینگ حاشیه‌ای براکت اصلی',
          processType: 'BENDING',
          machineName: 'پرس برک CNC خط ۱',
          hallName: 'سالن پرس‌های متوسط و برک CNC',
          waitingInputQty: 200,
          inProgressQty: 250,
          goodBufferQty: 680,
          scrapQty: 12,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP40_PNCH',
          stepName: 'پانچ دوبل سوراخ‌های موقعیت‌دهی و نشیمنگاه مهره‌ها',
          processType: 'PUNCH_FORM',
          machineName: 'پرس شولر ۴۰۰ تن',
          hallName: 'سالن پرس‌های سنگین',
          waitingInputQty: 150,
          inProgressQty: 300,
          goodBufferQty: 850,
          scrapQty: 15,
          normScrapPercent: 0.6,
        },
        {
          stepCode: 'OP50_WELD_NUT15',
          stepName: 'پرس‌جوش مقاومتی ۱۵ عدد مهره M6 پایه‌دار',
          processType: 'SPOT_WELD',
          machineName: 'دستگاه پرس‌جوش ۷۵kVA',
          hallName: 'سالن جوشکاری و پرس‌جوش مقاومتی',
          waitingInputQty: 200,
          inProgressQty: 350,
          goodBufferQty: 1500, // Available right at assembly buffer
          scrapQty: 10,
          normScrapPercent: 0.6,
        },
      ];

      // 2. مکمل براکت ضدسرقت
      const compStages: InterStageWipStep[] = [
        {
          stepCode: 'OP10_SLIT',
          stepName: 'برش شیت از رول ۲×۱۱۴۰ با گیوتین',
          processType: 'SHEARING',
          machineName: 'خط نواربر رول ۲',
          hallName: 'سالن برشکاری و آماده‌سازی بلنک',
          waitingInputQty: 50,
          inProgressQty: 150,
          goodBufferQty: 600,
          scrapQty: 5,
          normScrapPercent: 0.8,
        },
        {
          stepCode: 'OP20_BLNK',
          stepName: 'پرسکاری بلنکینگ فرم هندسی مکمل',
          processType: 'BLANKING',
          machineName: 'پرس ضربه‌ای ۱۶۰ تن',
          hallName: 'سالن پرس‌های متوسط',
          waitingInputQty: 200,
          inProgressQty: 300,
          goodBufferQty: 1400,
          scrapQty: 18,
          normScrapPercent: 1.0,
        },
        {
          stepCode: 'OP30_BEND',
          stepName: 'خم‌کاری زوایای مکمل براکت',
          processType: 'BENDING',
          machineName: 'پرس برک CNC خط ۲',
          hallName: 'سالن پرس‌های متوسط و برک CNC',
          waitingInputQty: 150,
          inProgressQty: 250,
          goodBufferQty: 900,
          scrapQty: 10,
          normScrapPercent: 0.5,
        },
        {
          stepCode: 'OP40_PNCH',
          stepName: 'پانچ سوراخ‌ها و محل پیچ‌های جوشی',
          processType: 'PUNCH_FORM',
          machineName: 'پرس مکانیکی ۱۰۰ تن',
          hallName: 'سالن پرس‌های متوسط',
          waitingInputQty: 100,
          inProgressQty: 200,
          goodBufferQty: 1150,
          scrapQty: 8,
          normScrapPercent: 0.4,
        },
        {
          stepCode: 'OP50_WELD_BOLT2',
          stepName: 'پرس‌جوش مقاومتی ۲ عدد پیچ پایه جوشی M6x20',
          processType: 'SPOT_WELD',
          machineName: 'دستگاه پرس‌جوش ۷۵kVA خط ۲',
          hallName: 'سالن جوشکاری و پرس‌جوش مقاومتی',
          waitingInputQty: 120,
          inProgressQty: 180,
          goodBufferQty: 800, // Ready at assembly buffer
          scrapQty: 6,
          normScrapPercent: 0.5,
        },
      ];

      const mainRequired = orderQty * 1;
      const mainWhStock = 1200;
      const mainWipFloorStock = mainStages[mainStages.length - 1].goodBufferQty; // 1500
      const mainTotalAvail = mainWhStock + mainWipFloorStock;
      const mainShortage = Math.max(0, mainRequired - mainTotalAvail);

      const compRequired = orderQty * 1;
      const compWhStock = 900;
      const compWipFloorStock = compStages[compStages.length - 1].goodBufferQty; // 800
      const compTotalAvail = compWhStock + compWipFloorStock;
      const compShortage = Math.max(0, compRequired - compTotalAvail);

      return [
        {
          id: 'CMP-ECU-MAIN',
          partId: 'PRT-WIP-ECU-MAIN',
          partCode: 'WIP-ECU-MAIN-BRK',
          partName: 'صفحه براکت اصلی ضدسرقت رایانه موتور',
          componentType: 'SUB_ASSEMBLY',
          quantityPerAssembly: 1,
          unit: 'عدد',
          totalRequiredQty: mainRequired,
          warehouseStockQty: mainWhStock,
          interStageWipQty: mainWipFloorStock,
          totalAvailableQty: mainTotalAvail,
          shortageQty: mainShortage,
          coveragePercent: Math.min(100, Math.round((mainTotalAvail / mainRequired) * 100)),
          status: mainShortage === 0 ? 'COVERED' : mainShortage > 1000 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: true,
          subRoutingId: 'RTG-ECU-MAIN',
          subMoIssued: Boolean(issuedSubMos['CMP-ECU-MAIN']),
          issuedSubMoCode: issuedSubMos['CMP-ECU-MAIN'],
          stages: mainStages,
          rawMaterialInfo: {
            materialName: 'کویل ورق سرد روغنی DC01A ضخامت 2mm ابعاد 2x1140',
            coilNumber: order.coilNumber || 'MOB-2025-DC01-409',
            heatNumber: order.heatNumber || 'HT-99412-MOB',
            requiredKg: Math.round(orderQty * 0.95),
            availableKg: order.warehouseAvailableKg || 18500,
          },
        },
        {
          id: 'CMP-ECU-COMP',
          partId: 'PRT-WIP-ECU-COMP',
          partCode: 'WIP-ECU-COMP-BRK',
          partName: 'مکمل براکت ضدسرقت رایانه موتور',
          componentType: 'SUB_ASSEMBLY',
          quantityPerAssembly: 1,
          unit: 'عدد',
          totalRequiredQty: compRequired,
          warehouseStockQty: compWhStock,
          interStageWipQty: compWipFloorStock,
          totalAvailableQty: compTotalAvail,
          shortageQty: compShortage,
          coveragePercent: Math.min(100, Math.round((compTotalAvail / compRequired) * 100)),
          status: compShortage === 0 ? 'COVERED' : compShortage > 1000 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: true,
          subRoutingId: 'RTG-ECU-COMP',
          subMoIssued: Boolean(issuedSubMos['CMP-ECU-COMP']),
          issuedSubMoCode: issuedSubMos['CMP-ECU-COMP'],
          stages: compStages,
          rawMaterialInfo: {
            materialName: 'کویل ورق سرد روغنی DC01A ضخامت 2mm ابعاد 2x1140 (یا 2x1000)',
            coilNumber: order.coilNumber || 'MOB-2025-DC01-409',
            heatNumber: order.heatNumber || 'HT-99412-MOB',
            requiredKg: Math.round(orderQty * 0.45),
            availableKg: order.warehouseAvailableKg || 18500,
          },
        },
        {
          id: 'CMP-ECU-NUT15',
          partId: 'PRT-FST-NUT-M6',
          partCode: 'FST-NUT-WELD-M6',
          partName: 'مهره جوشی چهارگوش پایه‌دار M6 (استاندارد خودرویی DIN 928)',
          componentType: 'FASTENER',
          quantityPerAssembly: 15,
          unit: 'عدد',
          totalRequiredQty: orderQty * 15,
          warehouseStockQty: 45000,
          interStageWipQty: 3000,
          totalAvailableQty: 48000,
          shortageQty: Math.max(0, orderQty * 15 - 48000),
          coveragePercent: Math.min(100, Math.round((48000 / (orderQty * 15)) * 100)),
          status: orderQty * 15 <= 48000 ? 'COVERED' : 'SHORTAGE',
          subMoRequired: false,
          stages: [],
        },
        {
          id: 'CMP-ECU-BLT2',
          partId: 'PRT-FST-BLT-M6-20',
          partCode: 'FST-BOLT-WELD-M6-20',
          partName: 'پیچ پایه جوشی مقاومتی M6x20 استاندارد خودرویی',
          componentType: 'FASTENER',
          quantityPerAssembly: 2,
          unit: 'عدد',
          totalRequiredQty: orderQty * 2,
          warehouseStockQty: 12000,
          interStageWipQty: 1000,
          totalAvailableQty: 13000,
          shortageQty: Math.max(0, orderQty * 2 - 13000),
          coveragePercent: Math.min(100, Math.round((13000 / (orderQty * 2)) * 100)),
          status: orderQty * 2 <= 13000 ? 'COVERED' : 'SHORTAGE',
          subMoRequired: false,
          stages: [],
        },
      ];
    }

    // Generic fallback for any other BOM in the system
    if (matchedBom && matchedBom.components.length > 0) {
      return matchedBom.components.map((c, idx) => {
        const required = orderQty * c.quantityPerAssembly;
        const whStock = Math.round(required * (0.6 + (idx % 3) * 0.3));
        const wipStock = Math.round(required * 0.35);
        const totalAvail = whStock + wipStock;
        const shortage = Math.max(0, required - totalAvail);

        return {
          id: c.id,
          partId: c.componentPartId,
          partCode: c.componentPartCode,
          partName: c.componentPartName,
          componentType:
            c.componentType === 'FASTENER_HARDWARE'
              ? 'FASTENER'
              : c.componentType === 'RAW_SHEET'
              ? 'RAW_SHEET'
              : 'SUB_ASSEMBLY',
          quantityPerAssembly: c.quantityPerAssembly,
          unit: c.unit === 'PCS' ? 'عدد' : c.unit,
          totalRequiredQty: required,
          warehouseStockQty: whStock,
          interStageWipQty: wipStock,
          totalAvailableQty: totalAvail,
          shortageQty: shortage,
          coveragePercent: Math.min(100, Math.round((totalAvail / required) * 100)),
          status: shortage === 0 ? 'COVERED' : shortage > required * 0.5 ? 'CRITICAL' : 'SHORTAGE',
          subMoRequired: c.subMoRequired,
          subRoutingId: c.subRoutingId,
          subMoIssued: Boolean(issuedSubMos[c.id]),
          issuedSubMoCode: issuedSubMos[c.id],
          stages: [
            {
              stepCode: 'OP10_PREP',
              stepName: 'آماده‌سازی و برش اولیه',
              processType: 'SHEARING',
              machineName: 'ایستگاه ۱',
              hallName: 'سالن برشکاری',
              waitingInputQty: 50,
              inProgressQty: 100,
              goodBufferQty: Math.round(wipStock * 0.4),
              scrapQty: 5,
              normScrapPercent: 0.5,
            },
            {
              stepCode: 'OP20_FORM',
              stepName: 'فرم‌دهی و پرسکاری قطعه',
              processType: 'BLANKING',
              machineName: 'پرس سنگین',
              hallName: 'سالن پرس‌ها',
              waitingInputQty: 100,
              inProgressQty: 150,
              goodBufferQty: Math.round(wipStock * 0.6),
              scrapQty: 10,
              normScrapPercent: 0.8,
            },
          ],
        };
      });
    }

    return [];
  }, [order, matchedBom, issuedSubMos]);

  // Overall feasibility analysis
  const overallShortages = useMemo(() => {
    return subComponents.filter(c => c.shortageQty > 0 && !c.subMoIssued);
  }, [subComponents]);

  const canProceed = overallShortages.length === 0;

  // Final assembly routing operations (OP60, OP70, etc.)
  const assemblyRoutingSteps = useMemo(() => {
    return [
      {
        stepCode: 'OP60_CO2_WELD',
        stepName: 'اتصال صفحه اصلی و مکمل با ایستگاه جوشکاری CO2 مونتاژی',
        processType: 'CO2_WELD',
        machineName: 'سلول جوشکاری CO2 رباتیک',
        hallName: 'سالن جوشکاری و مونتاژ بدنه',
        inputParts: 'صفحه اصلی (OP50) + مکمل (OP50)',
        currentWipFloor: 350,
        cycleTimeSec: 35,
      },
      {
        stepCode: 'OP65_PROJ_WELD_OPT',
        stepName: 'پرس‌جوش تکمیلی قبل از رنگ (ایستگاه اختیاری)',
        processType: 'SPOT_WELD',
        machineName: 'دستگاه پرس‌جوش ۷۵kVA',
        hallName: 'سالن جوشکاری و مونتاژ بدنه',
        inputParts: 'مجموعه جوش‌شده',
        currentWipFloor: 120,
        cycleTimeSec: 8,
      },
      {
        stepCode: 'OP70_PAINT_ED',
        stepName: 'شستشو، چربی‌گیری، فسفاته و پوشش رنگ کاتافورز ضدخوردگی ED مشکی',
        processType: 'PAINT',
        machineName: 'خط پیوسته رنگ الکتروفورز ED',
        hallName: 'سالن خط رنگ کاتافورز',
        inputParts: 'مجموعه جوش‌کاری‌شده تمیز',
        currentWipFloor: 500,
        cycleTimeSec: 60,
      },
      {
        stepCode: 'OP80_FINAL_PACK',
        stepName: 'بازرسی ۱۰۰٪ ظاهری و تست گشتاور مهره‌ها و پالت‌بندی ساپکو',
        processType: 'ASSEMBLY',
        machineName: 'میز کنترل کیفیت و بسته‌بندی نهایی',
        hallName: 'سالن مونتاژ و تحویل به انبار محصول',
        inputParts: 'قطعه رنگ‌شده ED',
        currentWipFloor: 250,
        cycleTimeSec: 15,
      },
    ];
  }, []);

  const handleIssueSingleSubMo = (row: SubComponentInspectionRow) => {
    const subMoCode = `SUB-MO-1404-${row.partCode.replace(/[^A-Za-z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setIssuedSubMos(prev => ({
      ...prev,
      [row.id]: subMoCode,
    }));

    if (onIssueSubMo) {
      onIssueSubMo({
        parentMoId: order.id,
        parentOrderCode: order.orderCode,
        componentPartId: row.partId,
        componentPartCode: row.partCode,
        componentPartName: row.partName,
        requiredQty: row.shortageQty > 0 ? row.shortageQty : row.totalRequiredQty,
        subRoutingId: row.subRoutingId,
      });
    }
  };

  const handleIssueAllMissingSubMos = () => {
    const nextIssued = { ...issuedSubMos };
    overallShortages.forEach(row => {
      if (row.subMoRequired) {
        const subMoCode = `SUB-MO-1404-${row.partCode.replace(/[^A-Za-z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        nextIssued[row.id] = subMoCode;
        if (onIssueSubMo) {
          onIssueSubMo({
            parentMoId: order.id,
            parentOrderCode: order.orderCode,
            componentPartId: row.partId,
            componentPartCode: row.partCode,
            componentPartName: row.partName,
            requiredQty: row.shortageQty > 0 ? row.shortageQty : row.totalRequiredQty,
            subRoutingId: row.subRoutingId,
          });
        }
      }
    });
    setIssuedSubMos(nextIssued);
  };

  const handleAllocateWipBuffer = (rowId: string, amount: number) => {
    setAllocatedStocks(prev => ({
      ...prev,
      [rowId]: (prev[rowId] || 0) + amount,
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wip-preflight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                کنترل آمادگی پیش از صدور دستور تولید (Pre-Flight WIP Inspection)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/10 text-slate-200 border border-white/20">
                دستور کار: {order.orderCode}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                بچ: {order.productionBatchCode}
              </span>
            </div>

            <h2 id="wip-preflight-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>ارزیابی موجودی بین‌مراحل (WIP) و قطعات پیش‌ساخته / نیمه‌ساخته</span>
            </h2>

            <p className="text-xs text-slate-300">
              بررسی همزمان موجودی انبار نیمه‌ساخته، بافر بین‌ایستگاهی پای خط و مواد اولیه برای کالای «
              <strong className="text-amber-300 font-semibold">{order.partName}</strong>» با تیراژ درخواستی{' '}
              <strong className="text-emerald-300 font-mono font-bold">{formatNumber(order.orderQty)} عدد</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="بستن فرم"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* EXECUTIVE SUMMARY BAR                                             */}
        {/* ================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Tile 1: Order Qty */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">تیراژ درخواستی دستور کار:</div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatNumber(order.orderQty)} <span className="text-xs text-slate-500 font-normal">عدد</span>
              </div>
            </div>
          </div>

          {/* Tile 2: Sub-Component Status */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                canProceed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">قطعات پیش‌ساخته (Sub-BOM):</div>
              <div className="text-xs font-bold text-slate-900">
                {subComponents.filter(c => c.componentType === 'SUB_ASSEMBLY').length} قطعه نیمه‌ساخته
              </div>
              <div className="text-[11px] text-slate-500">
                {subComponents.filter(c => c.shortageQty === 0).length} قطعه پوشش کامل
              </div>
            </div>
          </div>

          {/* Tile 3: Raw Coil & Sheet */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">ورق و شماره ذوب کلاف:</div>
              <div className="text-xs font-bold text-slate-900 font-mono">
                {order.heatNumber || 'HT-99412-MOB'}
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                موجود: {formatNumber(order.warehouseAvailableKg || 18500)} کیلوگرم
              </div>
            </div>
          </div>

          {/* Tile 4: Feasibility Verdict */}
          <div
            className={`p-3 rounded-xl border shadow-sm flex items-center gap-3 ${
              canProceed
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                : 'bg-amber-50/70 border-amber-300 text-amber-900'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                canProceed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {canProceed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[11px] font-semibold">ارزیابی امکان‌پذیری مونتاژ:</div>
              <div className="text-xs font-bold">
                {canProceed ? 'آماده برای مونتاژ و صدور' : `${toPersianDigits(overallShortages.length)} مورد کسری پیش‌ساخته`}
              </div>
              <div className="text-[10px]">
                {canProceed ? 'موجودی نیمه‌ساخته و پای خط کافی است' : 'نیازمند صدور Sub-MO یا شارژ خط'}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABS NAVIGATION                                                   */}
        {/* ================================================================= */}
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between bg-white text-xs">
          <div className="flex items-center gap-2 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>موازنه قطعات پیش‌ساخته و نیمه‌ساخته ({toPersianDigits(subComponents.length)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INTER_STAGE')}
              className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INTER_STAGE'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>موجودی بین‌مراحل (WIP) به تفکیک ایستگاه‌های خط برش، پرس و جوش</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RAW_MATERIALS')}
              className={`py-3 px-3.5 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'RAW_MATERIALS'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>مواد اولیه کلاف، شماره ذوب و پیچ و مهره‌های جوشی</span>
            </button>
          </div>

          {overallShortages.length > 0 && (
            <button
              type="button"
              onClick={handleIssueAllMissingSubMos}
              className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>صدور همزمان کلیه دستورات کار فرعی (Sub-MOs)</span>
            </button>
          )}
        </div>

        {/* ================================================================= */}
        {/* BODY CONTENT BY TAB                                               */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SUB-COMPONENTS BALANCE */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">
                    منطق استانداردهای صنعت خودرو در ERP سازمانی KPIMS:
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-900">
                    برای محصول «مجموعه براکت ضدسرقت»، دو قطعه پیش‌ساخته (صفحه براکت اصلی و مکمل براکت) باید در خطوط برشکاری، بلنکینگ، خم‌کاری و پرس‌جوش تولید شوند.
                    جدول زیر موجودی آماده در انبار نیمه‌ساخته و موجودی پای کار فیکسچر مونتاژ را به صورت تفکیک‌شده نمایش می‌دهد.
                    در صورت وجود کسری، می‌توانید بدون خروج از این صفحه، مستقیماً دستور ساخت فرعی (Sub-MO) صادر کنید تا قطعات نیمه‌ساخته برای این بچ آماده شوند.
                  </p>
                </div>
              </div>

              {/* Components Balance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">ردیف</th>
                        <th className="py-3 px-3.5">نوع قطعه</th>
                        <th className="py-3 px-3.5">کد و نام قطعه پیش‌ساخته / نیمه‌ساخته</th>
                        <th className="py-3 px-3.5 text-center">ضریب در BOM</th>
                        <th className="py-3 px-3.5 text-center">نیاز کل بچ</th>
                        <th className="py-3 px-3.5 text-center">موجودی انبار نیمه‌ساخته</th>
                        <th className="py-3 px-3.5 text-center">WIP بین‌مراحل (پای خط)</th>
                        <th className="py-3 px-3.5 text-center">کل موجودی قابل‌اتکا</th>
                        <th className="py-3 px-3.5 text-center">کسری / مازاد</th>
                        <th className="py-3 px-3.5 text-center">پوشش</th>
                        <th className="py-3 px-3.5 text-center">اقدام سریع (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {subComponents.map((row, idx) => {
                        const isSelected = selectedComponentId === row.id;
                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50/60'
                                  : idx % 2 === 0
                                  ? 'bg-white hover:bg-slate-50'
                                  : 'bg-slate-50/50 hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3.5 font-mono text-slate-500 text-center">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="py-3 px-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    row.componentType === 'SUB_ASSEMBLY'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : row.componentType === 'FASTENER'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {row.componentType === 'SUB_ASSEMBLY'
                                    ? 'قطعه پیش‌ساخته (Sub-MO)'
                                    : row.componentType === 'FASTENER'
                                    ? 'اتصالات خودرویی'
                                    : 'مواد پایه'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5">
                                <div className="font-bold text-slate-900">{row.partName}</div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {row.partCode}
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-700">
                                {toPersianDigits(row.quantityPerAssembly)} {row.unit}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900">
                                {formatNumber(row.totalRequiredQty)}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono text-slate-700">
                                {formatNumber(row.warehouseStockQty)}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-semibold text-indigo-700">
                                {formatNumber(row.interStageWipQty)}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900">
                                {formatNumber(row.totalAvailableQty)}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono">
                                {row.shortageQty === 0 ? (
                                  <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تکمیل (مازاد: +{formatNumber(row.totalAvailableQty - row.totalRequiredQty)})
                                  </span>
                                ) : (
                                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    کسری: -{formatNumber(row.shortageQty)} {row.unit}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <div className="w-16 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      row.coveragePercent >= 100
                                        ? 'bg-emerald-500'
                                        : row.coveragePercent >= 60
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${row.coveragePercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 mt-0.5 block">
                                  %{toPersianDigits(row.coveragePercent)}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                {row.subMoRequired ? (
                                  row.subMoIssued || issuedSubMos[row.id] ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                                      <Check className="w-3.5 h-3.5" />
                                      {issuedSubMos[row.id] || 'دستور ساخت صادر شد'}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleIssueSingleSubMo(row)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                                    >
                                      <Zap className="w-3 h-3 text-amber-300" />
                                      <span>صدور دستور ساخت (Sub-MO)</span>
                                    </button>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[11px]">تأمین انبار / خرید</span>
                                )}
                              </td>
                            </tr>

                            {/* Collapsible detail row for stages */}
                            {row.stages && row.stages.length > 0 && (
                              <tr className="bg-slate-50/70 border-b border-slate-200">
                                <td colSpan={11} className="py-2.5 px-4">
                                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold mb-1.5">
                                    <span className="flex items-center gap-1.5 text-slate-900">
                                      <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                                      موجودی بین‌مراحل (WIP) به تفکیک ایستگاه‌های تولیدی قطعه «{row.partName}»:
                                    </span>
                                    <span className="text-slate-500 font-mono text-[10px]">
                                      مجموع پای خط: {formatNumber(row.stages.reduce((sum, s) => sum + s.goodBufferQty, 0))} عدد
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                    {row.stages.map(stage => (
                                      <div
                                        key={stage.stepCode}
                                        className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1 shadow-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                                            {stage.stepCode}
                                          </span>
                                          <span className="text-emerald-700 font-mono font-bold text-[10px]">
                                            سالم: {formatNumber(stage.goodBufferQty)}
                                          </span>
                                        </div>
                                        <div className="font-semibold text-slate-900 text-[10px] truncate" title={stage.stepName}>
                                          {stage.stepName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate" title={stage.machineName}>
                                          {stage.machineName}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2 text-amber-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>تضمین زنجیره تأمین داخلی خط مونتاژ (Anti-Starvation Protocol)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    با صدور خودکار Sub-MO، تیراژ کسری مستقیماً به برنامه روزانه سالن‌های برش و پرس تزریق شده و شماره بچ با دستور مونتاژ نهایی لینک می‌شود.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleIssueAllMissingSubMos}
                    disabled={overallShortages.length === 0}
                    className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>صدور خودکار Sub-MO برای همه کسری‌ها</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTER-STAGE WIP BREAKDOWN */}
          {activeTab === 'INTER_STAGE' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  <span>دیاگرام جریان همگرا و موجودی بین‌ایستگاهی (Converging Assembly Flow):</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  خط تولید قطعه «مجموعه براکت ضدسرقت» دارای دو شاخه موازی ساخت قطعات پیش‌ساخته است که در ایستگاه جوشکاری CO2 مونتاژی (OP60) الحاق شده و سپس به خط رنگ کاتافورز ED منتقل می‌شوند.
                </p>
              </div>

              {/* Branch 1: Main Bracket Plate */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>شاخه ۱: صفحه براکت اصلی (WIP-ECU-MAIN-BRK) — خط پرس سنگین و پرس‌جوش</span>
                  </div>
                  <span className="text-xs font-mono text-indigo-700 font-bold">
                    موجودی بافر پای جوش مونتاژ: ۱,۵۰۰ عدد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                  {subComponents[0]?.stages.map((stage, sIdx) => (
                    <div
                      key={stage.stepCode}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                          {stage.stepCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          مرحله {toPersianDigits(sIdx + 1)}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{stage.stepName}</div>
                      <div className="text-[11px] text-slate-600">{stage.machineName}</div>
                      <div className="text-[10px] text-slate-400">{stage.hallName}</div>

                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block">در جریان:</span>
                          <span className="font-bold text-amber-700">{formatNumber(stage.inProgressQty)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">بافر سالم:</span>
                          <span className="font-bold text-emerald-700">{formatNumber(stage.goodBufferQty)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branch 2: Complementary Bracket */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>شاخه ۲: مکمل براکت ضدسرقت (WIP-ECU-COMP-BRK) — خط پرس و پانچ</span>
                  </div>
                  <span className="text-xs font-mono text-purple-700 font-bold">
                    موجودی بافر پای جوش مونتاژ: ۸۰۰ عدد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {subComponents[1]?.stages.map((stage, sIdx) => (
                    <div
                      key={stage.stepCode}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-purple-900 text-white font-mono text-[10px] font-bold">
                          {stage.stepCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          مرحله {toPersianDigits(sIdx + 1)}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{stage.stepName}</div>
                      <div className="text-[11px] text-slate-600">{stage.machineName}</div>
                      <div className="text-[10px] text-slate-400">{stage.hallName}</div>

                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block">در جریان:</span>
                          <span className="font-bold text-amber-700">{formatNumber(stage.inProgressQty)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">بافر سالم:</span>
                          <span className="font-bold text-emerald-700">{formatNumber(stage.goodBufferQty)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Merged Branch: Assembly & ED Paint */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>مرحله الحاق مونتاژی و رنگ کاتافورز ED (Final Assembly & ED Paint)</span>
                  </div>
                  <span className="text-xs text-emerald-800 font-bold">
                    نقطه ورود قطعات پیش‌ساخته به محصول نهایی
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {assemblyRoutingSteps.map((step, idx) => (
                    <div
                      key={step.stepCode}
                      className="p-3 rounded-xl bg-white border border-emerald-200 text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono text-[10px] font-bold">
                          {step.stepCode}
                        </span>
                        <span className="text-emerald-700 font-mono text-[10px] font-bold">
                          {toPersianDigits(step.cycleTimeSec)} ثانیه
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{step.stepName}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{step.machineName}</div>
                      <div className="text-[10px] text-slate-400">{step.hallName}</div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">موجودی پای ایستگاه:</span>
                        <span className="font-bold font-mono text-emerald-700">
                          {formatNumber(step.currentWipFloor)} عدد
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW MATERIALS & FASTENERS */}
          {activeTab === 'RAW_MATERIALS' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-blue-700" />
                  <span>کنترل مواد اولیه کلاف و اتصالات استاندارد ساپکو:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900">
                  اطلاعات ورق مصرفی، وزن کل مورد نیاز بچ، تناژ موجود در انبار رول و شماره ذوب رسمی کلاف در زیر درج شده است.
                  تولید قطعات پیش‌ساخته مستقیماً به موجودی این کلاف وابسته است.
                </p>
              </div>

              {/* Raw Coil Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>کلاف ورق سرد روغنی مصرفی (DC01A ضخامت 2.0 میلیمتر عرض 1140):</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    موجودی کافی و تایید شده
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">شماره کلاف فیزیکی:</div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {order.coilNumber || 'MOB-2025-DC01-409'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">شماره ذوب رسمی (Heat No):</div>
                    <div className="text-sm font-bold text-amber-800 font-mono mt-0.5">
                      {order.heatNumber || 'HT-99412-MOB'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">مصرف ناخالص کل بچ ({formatNumber(order.orderQty)} عدد):</div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {formatNumber(
                        Math.round(
                          order.orderQty *
                            (order.unitWeightKg || 1.25) *
                            (1 + (order.scrapAllowancePct || 3.5) / 100)
                        )
                      )}{' '}
                      <span className="text-xs font-normal text-slate-500">کیلوگرم</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">موجودی آزاد در انبار رول:</div>
                    <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                      {formatNumber(order.warehouseAvailableKg || 18500)}{' '}
                      <span className="text-xs font-normal text-slate-500">کیلوگرم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fasteners and Hardware Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 15 Nuts M6 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      مهره جوشی چهارگوش پایه‌دار M6 (DIN 928)
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                      ۱۵ عدد در هر براکت
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    اتصال در مرحله OP50 صفحه اصلی با پرس‌جوش ۷۵kVA و گشتاور حداقل 40 N.m
                  </p>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">نیاز این بچ</div>
                      <div className="font-bold text-slate-900">{formatNumber(order.orderQty * 15)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">موجودی انبار</div>
                      <div className="font-bold text-emerald-700">۴۵,۰۰۰ عدد</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">وضعیت</div>
                      <div className="font-bold text-emerald-700">پوشش کامل 🟢</div>
                    </div>
                  </div>
                </div>

                {/* 2 Studs/Bolts M6x20 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      پیچ پایه جوشی مقاومتی M6x20 استاندارد
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 font-mono">
                      ۲ عدد در هر براکت
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    اتصال در مرحله OP50 مکمل براکت ضدسرقت با پرس‌جوش مقاومتی
                  </p>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">نیاز این بچ</div>
                      <div className="font-bold text-slate-900">{formatNumber(order.orderQty * 2)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">موجودی انبار</div>
                      <div className="font-bold text-emerald-700">۱۲,۰۰۰ عدد</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-[10px] text-slate-400">وضعیت</div>
                      <div className="font-bold text-emerald-700">پوشش کامل 🟢</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS                                                    */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                canProceed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {canProceed
                ? 'کلیه موجودی‌های نیمه‌ساخته و قطعات پیش‌ساخته برای این دستور کار تایید شدند.'
                : 'برای کسری قطعات پیش‌ساخته، ابتدا Sub-MO صادر کنید یا موجودی پای کار را اختصاص دهید.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              انصراف / بازگشت به ویرایش MO
            </button>

            {onConfirmIssueOrder && (
              <button
                type="button"
                onClick={() => {
                  onConfirmIssueOrder(order);
                  onClose();
                }}
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  canProceed
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {canProceed
                    ? 'تایید نهایی و صدور دستور تولید (MO)'
                    : 'صدور دستور تولید همگام با Sub-MOها'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
