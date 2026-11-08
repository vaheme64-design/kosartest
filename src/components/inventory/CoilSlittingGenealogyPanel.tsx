import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Layers,
  Split,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Package,
  Scissors,
  FileText,
  Recycle,
  AlertTriangle,
} from 'lucide-react';
import { PhysicalCoil } from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

export interface ChildSlitNode {
  id: string;
  childCode: string;
  type: 'SLIT_STRIP' | 'BLANK_SHEET' | 'REMNANT_COIL' | 'EDGE_SCRAP';
  typeLabel: string;
  dimensionsLabel: string;
  weightKg: number;
  sheetCount?: number;
  assignedMoNumber?: string;
  targetPartName?: string;
  warehouseLocation: string;
  status: 'IN_STOCK' | 'ISSUED_TO_LINE' | 'CONSUMED' | 'SCRAP_BIN';
}

export interface ParentCoilSlittingTree {
  parentId: string;
  parentCoilCode: string;
  coilPackNumber: string;
  heatNumber: string;
  materialGrade: string;
  thicknessMm: number;
  originalWidthMm: number;
  originalWeightKg: number;
  supplierName: string;
  slittingDate: string;
  slittingMachine: string;
  contractNumber: string;
  children: ChildSlitNode[];
}

const DEFAULT_SLITTING_TREES: ParentCoilSlittingTree[] = [
  {
    parentId: 'PC-SLIT-01',
    parentCoilCode: 'COIL-402918',
    coilPackNumber: 'PK-SAPCO-88210',
    heatNumber: 'HT-99204-A',
    materialGrade: 'ST14',
    thicknessMm: 1.5,
    originalWidthMm: 1250,
    originalWeightKg: 8400,
    supplierName: 'فولاد مبارکه اصفهان (امانی ساپکو)',
    slittingDate: '۱۴۰۴/۰۱/۱۸',
    slittingMachine: 'خط نواربری و برش رول (Slitter Line 01)',
    contractNumber: 'CNT-SAPCO-1404-108',
    children: [
      {
        id: 'CH-101',
        childCode: 'SLIT-402918-S1',
        type: 'SLIT_STRIP',
        typeLabel: 'نوار فرعی ۱ (Slit Strip)',
        dimensionsLabel: 'عرض ۳۸۰mm × ضخامت ۱.۵mm',
        weightKg: 2520,
        sheetCount: 1650,
        assignedMoNumber: 'MO-1404-0101',
        targetPartName: 'براکت نگه‌دارنده رادیاتور پژو ۲۰۶',
        warehouseLocation: 'خط پرس ۴۰۰ تن (ایستگاه OP-10)',
        status: 'ISSUED_TO_LINE',
      },
      {
        id: 'CH-102',
        childCode: 'SLIT-402918-S2',
        type: 'SLIT_STRIP',
        typeLabel: 'نوار فرعی ۲ (Slit Strip)',
        dimensionsLabel: 'عرض ۳۸۰mm × ضخامت ۱.۵mm',
        weightKg: 2520,
        sheetCount: 1650,
        assignedMoNumber: 'MO-1404-0101',
        targetPartName: 'براکت نگه‌دارنده رادیاتور پژو ۲۰۶',
        warehouseLocation: 'انبار ورق نیمه‌ساخته (RACK-B02)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-103',
        childCode: 'BLNK-402918-B3',
        type: 'BLANK_SHEET',
        typeLabel: 'بسته شیت فرعی ۳ (Blank Pack)',
        dimensionsLabel: 'ابعاد ۴۶۰×۸۰۰mm × ضخامت ۱.۵mm',
        weightKg: 2100,
        sheetCount: 980,
        assignedMoNumber: 'MO-1404-0103',
        targetPartName: 'محافظ فلزی ضدسرقت ECU پژو پارس',
        warehouseLocation: 'انبار شیت برش‌خورده (RACK-C04)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-104',
        childCode: 'REM-402918-R1',
        type: 'REMNANT_COIL',
        typeLabel: 'ته‌کلاف مادر (Remnant Coil)',
        dimensionsLabel: 'عرض ۱۲۵۰mm × ضخامت ۱.۵mm',
        weightKg: 1120,
        warehouseLocation: 'انبار رول ورق (زون ته‌کلاف A-04)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-105',
        childCode: 'SCR-402918-E1',
        type: 'EDGE_SCRAP',
        typeLabel: 'پرت کناره‌بری (Edge Trim)',
        dimensionsLabel: 'لبه نواربری ۲×۱۵mm',
        weightKg: 140,
        warehouseLocation: 'باکس ضایعات ذوبی (SCRAP-Z1)',
        status: 'SCRAP_BIN',
      },
    ],
  },
  {
    parentId: 'PC-SLIT-02',
    parentCoilCode: 'COIL-403105',
    coilPackNumber: 'PK-IKCO-77412',
    heatNumber: 'HT-88412-B',
    materialGrade: 'DC04',
    thicknessMm: 0.8,
    originalWidthMm: 1500,
    originalWeightKg: 9600,
    supplierName: 'فولاد مبارکه اصفهان (قرارداد ایپکو/ایران‌خودرو)',
    slittingDate: '۱۴۰۴/۰۱/۱۹',
    slittingMachine: 'خط برش عرضی و شیت‌کن (CTL & Slitter 02)',
    contractNumber: 'CNT-IKCO-1404-204',
    children: [
      {
        id: 'CH-201',
        childCode: 'BLNK-403105-B1',
        type: 'BLANK_SHEET',
        typeLabel: 'پالت شیت فرعی ۱ (Blank Sheet)',
        dimensionsLabel: 'ابعاد ۷۲۰×۱۲۰۰mm × ضخامت ۰.۸mm',
        weightKg: 3800,
        sheetCount: 900,
        assignedMoNumber: 'MO-1404-0102',
        targetPartName: 'پنل تقویتی ستون وسط دنا پلاس (B-Pillar)',
        warehouseLocation: 'پای خط پرس ۸۰۰ تن (OP-10)',
        status: 'ISSUED_TO_LINE',
      },
      {
        id: 'CH-202',
        childCode: 'BLNK-403105-B2',
        type: 'BLANK_SHEET',
        typeLabel: 'پالت شیت فرعی ۲ (Blank Sheet)',
        dimensionsLabel: 'ابعاد ۷۲۰×۱۲۰۰mm × ضخامت ۰.۸mm',
        weightKg: 3800,
        sheetCount: 900,
        assignedMoNumber: 'MO-1404-0107',
        targetPartName: 'پوسته گلگیر جلو چپ پژو ۲۰۷',
        warehouseLocation: 'انبار شیت آماده پرس (RACK-D01)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-203',
        childCode: 'REM-403105-R1',
        type: 'REMNANT_COIL',
        typeLabel: 'ته‌کلاف برگشتی (Remnant Coil)',
        dimensionsLabel: 'عرض ۱۵۰۰mm × ضخامت ۰.۸mm',
        weightKg: 1840,
        warehouseLocation: 'انبار رول ورق (زون A-02)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-204',
        childCode: 'SCR-403105-E1',
        type: 'EDGE_SCRAP',
        typeLabel: 'پرت سر و ته کلاف (Crop Scrap)',
        dimensionsLabel: 'پرت برش اولیه',
        weightKg: 160,
        warehouseLocation: 'باکس ضایعات ورق',
        status: 'SCRAP_BIN',
      },
    ],
  },
  {
    parentId: 'PC-SLIT-03',
    parentCoilCode: 'COIL-403590',
    coilPackNumber: 'PK-SAPCO-90114',
    heatNumber: 'HT-77519-C',
    materialGrade: 'S355MC',
    thicknessMm: 2.5,
    originalWidthMm: 1200,
    originalWeightKg: 7200,
    supplierName: 'فولاد اکسین / مبارکه (ملکی کارخانه)',
    slittingDate: '۱۴۰۴/۰۱/۲۰',
    slittingMachine: 'قیچی گیوتین ۶ متری و نواربر سنگین',
    contractNumber: 'CNT-SAPCO-1404-112',
    children: [
      {
        id: 'CH-301',
        childCode: 'SLIT-403590-S1',
        type: 'SLIT_STRIP',
        typeLabel: 'نوار فرعی تقویتی ۱',
        dimensionsLabel: 'عرض ۲۹۰mm × ضخامت ۲.۵mm',
        weightKg: 3100,
        sheetCount: 620,
        assignedMoNumber: 'MO-1404-0104',
        targetPartName: 'رام زیر موتور خودرو تارا (Crossmember)',
        warehouseLocation: 'سالن پرس سنگین - پرس ۴۰۰ تن',
        status: 'ISSUED_TO_LINE',
      },
      {
        id: 'CH-302',
        childCode: 'SLIT-403590-S2',
        type: 'SLIT_STRIP',
        typeLabel: 'نوار فرعی تقویتی ۲',
        dimensionsLabel: 'عرض ۲۹۰mm × ضخامت ۲.۵mm',
        weightKg: 3100,
        sheetCount: 620,
        assignedMoNumber: 'MO-1404-0104',
        targetPartName: 'رام زیر موتور خودرو تارا (Crossmember)',
        warehouseLocation: 'انبار میانی برش (WIP-SLIT-03)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-303',
        childCode: 'REM-403590-R1',
        type: 'REMNANT_COIL',
        typeLabel: 'ته‌کلاف مادر (Remnant)',
        dimensionsLabel: 'عرض ۱۲۰۰mm × ضخامت ۲.۵mm',
        weightKg: 890,
        warehouseLocation: 'انبار کلاف سنگین (B-01)',
        status: 'IN_STOCK',
      },
      {
        id: 'CH-304',
        childCode: 'SCR-403590-E1',
        type: 'EDGE_SCRAP',
        typeLabel: 'پرت لبه‌بری (Edge Scrap)',
        dimensionsLabel: 'لبه برش ضخامت ۲.۵mm',
        weightKg: 110,
        warehouseLocation: 'باکس ضایعات',
        status: 'SCRAP_BIN',
      },
    ],
  },
];

interface CoilSlittingGenealogyPanelProps {
  coils?: PhysicalCoil[];
}

export const CoilSlittingGenealogyPanel: React.FC<CoilSlittingGenealogyPanelProps> = ({ coils = [] }) => {
  // Merge any dynamic coils from props with rich default slitting trees
  const slittingTrees = useMemo(() => {
    const dynamicTrees: ParentCoilSlittingTree[] = coils.slice(0, 2).map((c, idx) => {
      const origW = c.originalWeightKg || 6000;
      const remW = c.remainingWeightKg ?? Math.round(origW * 0.25);
      const consumedW = Math.max(500, origW - remW);
      const strip1W = Math.round(consumedW * 0.52);
      const strip2W = Math.round(consumedW * 0.44);
      const scrapW = Math.max(20, consumedW - strip1W - strip2W);

      return {
        parentId: `DYN-${c.id}`,
        parentCoilCode: c.coilId,
        coilPackNumber: c.coilPackNumber,
        heatNumber: c.heatNumber || `HT-1404-${910 + idx}`,
        materialGrade: c.materialGrade,
        thicknessMm: c.thicknessMm,
        originalWidthMm: c.widthMm || 1250,
        originalWeightKg: origW,
        supplierName: c.supplierName || 'فولاد مبارکه اصفهان',
        slittingDate: '۱۴۰۴/۰۱/۲۱',
        slittingMachine: 'خط نواربری و شیت‌کن کویل (Slitting Line)',
        contractNumber: c.allocations?.[0]?.contractNumber || 'CNT-SAPCO-1404',
        children: [
          {
            id: `DYN-CH-${c.id}-1`,
            childCode: `SLIT-${c.coilId}-01`,
            type: 'SLIT_STRIP',
            typeLabel: 'نوار فرعی ۱ (Slit Strip)',
            dimensionsLabel: `عرض ${Math.round((c.widthMm || 1250) / 3)}mm × ضخامت ${c.thicknessMm}mm`,
            weightKg: strip1W,
            sheetCount: Math.round(strip1W / 1.4),
            assignedMoNumber: 'MO-1404-0101',
            targetPartName: c.partName,
            warehouseLocation: 'خط پرسکاری (OP-10)',
            status: 'ISSUED_TO_LINE',
          },
          {
            id: `DYN-CH-${c.id}-2`,
            childCode: `BLNK-${c.coilId}-02`,
            type: 'BLANK_SHEET',
            typeLabel: 'بسته شیت فرعی ۲ (Child Blank)',
            dimensionsLabel: `شیت برش‌خورده × ضخامت ${c.thicknessMm}mm`,
            weightKg: strip2W,
            sheetCount: Math.round(strip2W / 1.6),
            assignedMoNumber: 'MO-1404-0103',
            targetPartName: c.partName,
            warehouseLocation: 'انبار میانی شیت (WIP-RACK)',
            status: 'IN_STOCK',
          },
          {
            id: `DYN-CH-${c.id}-3`,
            childCode: `REM-${c.coilId}`,
            type: 'REMNANT_COIL',
            typeLabel: 'ته‌کلاف مادر در انبار (Remnant)',
            dimensionsLabel: `عرض ${c.widthMm || 1250}mm × ضخامت ${c.thicknessMm}mm`,
            weightKg: remW,
            warehouseLocation: c.warehouseLocationCode || 'زون A-01',
            status: 'IN_STOCK',
          },
          {
            id: `DYN-CH-${c.id}-4`,
            childCode: `SCR-${c.coilId}`,
            type: 'EDGE_SCRAP',
            typeLabel: 'پرت کناره‌بری (Edge Scrap)',
            dimensionsLabel: 'کناره نواربری',
            weightKg: scrapW,
            warehouseLocation: 'باکس ضایعات',
            status: 'SCRAP_BIN',
          },
        ],
      };
    });

    const combined = [...DEFAULT_SLITTING_TREES];
    dynamicTrees.forEach(dt => {
      if (!combined.some(t => t.parentCoilCode === dt.parentCoilCode)) {
        combined.push(dt);
      }
    });
    return combined;
  }, [coils]);

  const [selectedTreeId, setSelectedTreeId] = useState<string>(DEFAULT_SLITTING_TREES[0].parentId);

  const activeTree = useMemo(
    () => slittingTrees.find(t => t.parentId === selectedTreeId) || slittingTrees[0],
    [slittingTrees, selectedTreeId]
  );

  const totalSlitWeight = useMemo(
    () =>
      activeTree.children
        .filter(c => c.type === 'SLIT_STRIP' || c.type === 'BLANK_SHEET')
        .reduce((s, c) => s + c.weightKg, 0),
    [activeTree]
  );

  const remnantWeight = useMemo(
    () => activeTree.children.filter(c => c.type === 'REMNANT_COIL').reduce((s, c) => s + c.weightKg, 0),
    [activeTree]
  );

  const scrapWeight = useMemo(
    () => activeTree.children.filter(c => c.type === 'EDGE_SCRAP').reduce((s, c) => s + c.weightKg, 0),
    [activeTree]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 text-right" dir="rtl">
      {/* Header & Parent Coil Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                شجره‌نامه برش کلاف (Coil Slitting Genealogy: Parent ➔ Child Strips & Sheets)
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                ردیابی شماره ذوب (Heat Traceability)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              مشاهده بصری نحوه برش یک رول مادر (Parent Coil) با شماره ذوب مشخص به نوارها و شیت‌های فرعی (Child)، ته‌کلاف و دستورات تولید (MO) مصرف‌کننده.
            </p>
          </div>
        </div>

        {/* Parent Coil Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 font-medium ml-1">انتخاب رول مادر:</span>
          {slittingTrees.map(tree => {
            const isSelected = tree.parentId === activeTree.parentId;
            return (
              <button
                key={tree.parentId}
                type="button"
                onClick={() => setSelectedTreeId(tree.parentId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{tree.parentCoilCode}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tree.materialGrade}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Tree Layout: Parent Coil (Right) ➔ Slitting Operation ➔ Child Strips/Sheets (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch pt-1">
        {/* 1. Parent Coil Card (رول مادر) */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border border-slate-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                رول مادر (Parent Master Coil)
              </span>
              <span className="font-mono text-xs text-slate-300">{activeTree.coilPackNumber}</span>
            </div>

            <div>
              <div className="text-lg font-black font-mono tracking-tight text-white">
                {activeTree.parentCoilCode}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">{activeTree.supplierName}</div>
            </div>

            {/* Heat Number Highlight Box */}
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">شماره ذوب فولاد (Heat Number)</span>
                  <span className="font-mono text-sm font-black text-amber-400">{activeTree.heatNumber}</span>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">گرید و ضخامت</span>
                <span className="font-mono text-xs font-bold text-white">
                  {activeTree.materialGrade} | {toPersianDigits(activeTree.thicknessMm)}mm
                </span>
              </div>
            </div>

            {/* Parent Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">وزن اولیه رول مادر</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                  {formatNumber(activeTree.originalWeightKg)} kg
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">عرض اولیه کلاف</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {formatNumber(activeTree.originalWidthMm)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Mass Balance Bar inside Parent Card */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">موازنه جرم برش کلاف:</span>
              <span className="font-mono text-emerald-400 font-bold">
                راندمان برش: {toPersianDigits(Math.round(((totalSlitWeight + remnantWeight) / activeTree.originalWeightKg) * 100))}٪
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(totalSlitWeight / activeTree.originalWeightKg) * 100}%` }}
                title={`نوار و شیت فرعی: ${totalSlitWeight} kg`}
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: `${(remnantWeight / activeTree.originalWeightKg) * 100}%` }}
                title={`ته‌کلاف: ${remnantWeight} kg`}
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: `${(scrapWeight / activeTree.originalWeightKg) * 100}%` }}
                title={`پرت برش: ${scrapWeight} kg`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
              <span>نوار/شیت: {formatNumber(totalSlitWeight)}kg</span>
              <span>ته‌کلاف: {formatNumber(remnantWeight)}kg</span>
              <span>پرت: {formatNumber(scrapWeight)}kg</span>
            </div>
          </div>
        </div>

        {/* 2. Child Strips & Sheets Tree Branches (نوارها و شیت‌های فرعی - Child Nodes) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-800">ایستگاه برش: {activeTree.slittingMachine}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">تاریخ برش: {activeTree.slittingDate}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              {toPersianDigits(activeTree.children.length)} خروجی فرعی (Child) از ذوب {activeTree.heatNumber}
            </span>
          </div>

          {/* Vertical Connected Tree of Child Outputs */}
          <div className="relative pr-5 space-y-2.5">
            {/* Vertical Connector Line */}
            <div className="absolute right-2 top-3 bottom-3 w-0.5 bg-slate-300 rounded-full" />

            {activeTree.children.map(child => {
              const isStripOrSheet = child.type === 'SLIT_STRIP' || child.type === 'BLANK_SHEET';
              const isRemnant = child.type === 'REMNANT_COIL';
              const isScrap = child.type === 'EDGE_SCRAP';

              const dotColor = isStripOrSheet
                ? 'bg-emerald-600 ring-emerald-100'
                : isRemnant
                ? 'bg-amber-500 ring-amber-100'
                : 'bg-rose-500 ring-rose-100';

              const cardBorder = isStripOrSheet
                ? 'border-slate-200 hover:border-emerald-400 bg-white'
                : isRemnant
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-rose-200 bg-rose-50/30';

              return (
                <div
                  key={child.id}
                  className={`relative rounded-xl border p-3 transition-all shadow-2xs ${cardBorder}`}
                >
                  {/* Tree Branch Node Circle */}
                  <span
                    className={`absolute -right-[17px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-4 ${dotColor}`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {child.childCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isStripOrSheet
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isRemnant
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {child.typeLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{child.dimensionsLabel}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          ذوب ارث‌برده: {activeTree.heatNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                        <span>محل استقرار: <strong>{child.warehouseLocation}</strong></span>
                        {child.targetPartName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>قطعه هدف: <strong className="text-slate-900">{child.targetPartName}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right-side Metrics & Linked MO Badge */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {child.assignedMoNumber && (
                        <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-left">
                          <span className="text-[9px] text-indigo-600 block">دستور تولید متصل</span>
                          <span className="font-mono text-xs font-black text-indigo-900">
                            {child.assignedMoNumber}
                          </span>
                        </div>
                      )}

                      {child.sheetCount && (
                        <div className="text-left px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[9px] text-slate-500 block">تعداد شیت/بلنک</span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {formatNumber(child.sheetCount)} برگ
                          </span>
                        </div>
                      )}

                      <div className="text-left min-w-[85px]">
                        <span className="text-[10px] text-slate-400 block">وزن فرعی</span>
                        <span className="font-mono text-sm font-black text-slate-900">
                          {formatNumber(child.weightKg)} <span className="text-[10px] font-normal">kg</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
