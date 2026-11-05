import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Play,
  RefreshCw,
  Wrench,
  Boxes,
  ListTree,
  Clock,
  TrendingUp,
  RotateCcw,
  Plus,
  FileCheck2,
  Info,
  Sparkles,
} from 'lucide-react';
import { Part, Routing, DetailedStockBalance } from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { SearchableSelect } from '../common/SearchableSelect';
import { ProductStructureData, SubComponentNode } from '../bom/ProductStructureView';

export interface DailyPlanRow {
  dayIndex: number;
  dayName: string;
  dateLabel: string;
  baseTargetQty: number;
  carriedFromPrevDayQty: number;
  effectiveTargetQty: number; // baseTargetQty + carriedFromPrevDayQty
  actualGoodQty: number;
  scrapQty: number;
  remainingDayQty: number; // max(0, effectiveTargetQty - actualGoodQty)
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED_ROLLED_FORWARD' | 'COMPLETED';
  operatorNote?: string;
}

export interface SubMoWorkOrder {
  id: string;
  moNumber: string;
  level: number;
  partCode: string;
  partName: string;
  unit: string;
  perParentQty: number;
  totalRequiredQty: number;
  lineWipStockQty: number;
  netToProduceQty: number;
  assignedStation: string;
  assignedMachineCode: string;
  operationsSummary: string;
  producedTotalQty: number;
}

export interface MaterialRequirementRow {
  partCode: string;
  partName: string;
  categoryLabel: string;
  unit: string;
  perUnitConsumption: number;
  grossRequiredQty: number;
  warehouseAvailableQty: number;
  lineSideAvailableQty: number;
  shortageOrSurplusQty: number;
}

interface ErpProductionWorkbenchViewProps {
  parts: Part[];
  routings: Routing[];
  balances?: DetailedStockBalance[];
  onRefreshData?: () => void;
}

const STORAGE_KEY_ERP_WORKBENCH = 'kpims_erp_workbench_plan_v1';
const STORAGE_KEY_PRODUCT_STRUCTURES = 'kpims_product_structures_v1';

const DEFAULT_DAYS: Array<{ dayIndex: number; dayName: string; dateLabel: string }> = [
  { dayIndex: 1, dayName: 'روز اول — شنبه (هفته جاری)', dateLabel: '۱۴۰۴/۰۲/۲۰' },
  { dayIndex: 2, dayName: 'روز دوم — یکشنبه (هفته جاری)', dateLabel: '۱۴۰۴/۰۲/۲۱' },
  { dayIndex: 3, dayName: 'روز سوم — دوشنبه (هفته جاری)', dateLabel: '۱۴۰۴/۰۲/۲۲' },
  { dayIndex: 4, dayName: 'روز چهارم — سه‌شنبه (هفته جاری)', dateLabel: '۱۴۰۴/۰۲/۲۳' },
  { dayIndex: 5, dayName: 'روز پنجم — چهارشنبه (هفته جاری)', dateLabel: '۱۴۰۴/۰۲/۲۴' },
  { dayIndex: 6, dayName: 'روز ششم — پنج‌شنبه (جبرانی / اضافه‌کاری)', dateLabel: '۱۴۰۴/۰۲/۲۵' },
];

export const ErpProductionWorkbenchView: React.FC<ErpProductionWorkbenchViewProps> = ({
  parts,
  routings,
  balances = [],
}) => {
  // Active Step in the 5-stage SAP / Odoo / ERPNext flow
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Target Demand State (Step 1)
  const [selectedProductCode, setSelectedProductCode] = useState<string>('SAPCO-ASY-ECU-BRK-01');
  const [targetOrderQty, setTargetOrderQty] = useState<number>(5000);
  const [workingDaysCount, setWorkingDaysCount] = useState<number>(5);
  const [masterMoNumber, setMasterMoNumber] = useState<string>('MO-1404-5000');

  // Product Structures loaded from localStorage / backend
  const [productStructures, setProductStructures] = useState<ProductStructureData[]>([]);

  // Daily Schedule & Execution State (Steps 4 & 5)
  const [dailyRows, setDailyRows] = useState<DailyPlanRow[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_ERP_WORKBENCH);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.dailyRows) && parsed.dailyRows.length > 0) {
          return parsed.dailyRows;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Active day selected in Step 5 for logging daily production
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1);
  const [inputGoodQty, setInputGoodQty] = useState<string>('750');
  const [inputScrapQty, setInputScrapQty] = useState<string>('15');
  const [inputOperatorNote, setInputOperatorNote] = useState<string>(
    'تولید شیفت صبح و عصر؛ ۲۵۰ عدد مانده به دلیل تعویض سنبه پانچ به فردا منتقل شد.'
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Load ProductStructures
  useEffect(() => {
    try {
      const local = window.localStorage.getItem(STORAGE_KEY_PRODUCT_STRUCTURES);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProductStructures(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    fetch('/api/production/product-structures')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setProductStructures(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Recompute daily schedule when targetOrderQty or workingDaysCount changes if no saved rows
  const initializeSchedule = (totalQty: number, days: number) => {
    const basePerDay = Math.floor(totalQty / Math.max(1, days));
    const remainder = totalQty - basePerDay * Math.max(1, days);

    const newRows: DailyPlanRow[] = DEFAULT_DAYS.map((d, idx) => {
      const isWorkDay = idx < days;
      const base = isWorkDay ? basePerDay + (idx === 0 ? remainder : 0) : 0;
      return {
        dayIndex: d.dayIndex,
        dayName: d.dayName,
        dateLabel: d.dateLabel,
        baseTargetQty: base,
        carriedFromPrevDayQty: 0,
        effectiveTargetQty: base,
        actualGoodQty: 0,
        scrapQty: 0,
        remainingDayQty: base,
        status: idx === 0 ? 'IN_PROGRESS' : 'OPEN',
        operatorNote: '',
      };
    });

    setDailyRows(newRows);
    setSelectedDayIdx(1);
    setInputGoodQty(String(Math.round(basePerDay * 0.75)));
    setInputScrapQty('12');
    try {
      window.localStorage.setItem(
        STORAGE_KEY_ERP_WORKBENCH,
        JSON.stringify({
          selectedProductCode,
          targetOrderQty: totalQty,
          workingDaysCount: days,
          dailyRows: newRows,
        })
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (dailyRows.length === 0) {
      initializeSchedule(targetOrderQty, workingDaysCount);
    }
  }, []);

  const persistDailyRows = (rows: DailyPlanRow[]) => {
    setDailyRows(rows);
    try {
      window.localStorage.setItem(
        STORAGE_KEY_ERP_WORKBENCH,
        JSON.stringify({
          selectedProductCode,
          targetOrderQty,
          workingDaysCount,
          dailyRows: rows,
        })
      );
    } catch {
      // ignore
    }
  };

  // Selected finished product info
  const selectedProduct = useMemo(() => {
    const p = parts.find(
      item => item.code === selectedProductCode || item.id === selectedProductCode
    );
    return (
      p || {
        id: 'PRT-FGD-ECU-BRK',
        code: 'SAPCO-ASY-ECU-BRK-01',
        name: 'مجموعه کامل براکت ضدسرقت رایانه موتور',
        category: 'FINISHED_GOOD',
        unit: 'PCS',
        carModel: 'پژو ۲۰۶',
      }
    );
  }, [parts, selectedProductCode]);

  // Cumulative produced so far across all days
  const cumulativeProducedGood = useMemo(
    () => dailyRows.reduce((sum, r) => sum + r.actualGoodQty, 0),
    [dailyRows]
  );
  const cumulativeScrap = useMemo(
    () => dailyRows.reduce((sum, r) => sum + r.scrapQty, 0),
    [dailyRows]
  );
  const totalOrderRemaining = Math.max(0, targetOrderQty - cumulativeProducedGood);
  const completionPercent = Math.min(
    100,
    Math.round((cumulativeProducedGood / Math.max(1, targetOrderQty)) * 100)
  );

  // Explode BOM / ProductStructure for the selected product (Step 2 & Step 3)
  const { subMoList, materialRequirements } = useMemo(() => {
    const struct = productStructures.find(
      s => s.rootPartCode === selectedProduct.code || s.rootPartId === selectedProduct.id
    );

    const subMos: SubMoWorkOrder[] = [];
    const matMap = new Map<string, MaterialRequirementRow>();

    if (struct && struct.subComponents && struct.subComponents.length > 0) {
      // Build from user's recursive ProductStructure
      struct.subComponents.forEach((sub: SubComponentNode, idx: number) => {
        const reqSubQty = targetOrderQty * (Number(sub.quantity) || 1);
        const wipStock = balances
          .filter(b => b.partCode === sub.partCode || b.partId === sub.partId)
          .reduce((s, b) => s + b.availableQty, 0);

        subMos.push({
          id: `SUB-MO-${idx + 1}`,
          moNumber: `${masterMoNumber}-SUB${idx + 1}`,
          level: 1,
          partCode: sub.partCode,
          partName: sub.partName,
          unit: sub.unit || 'عدد',
          perParentQty: sub.quantity,
          totalRequiredQty: reqSubQty,
          lineWipStockQty: wipStock,
          netToProduceQty: Math.max(0, reqSubQty - wipStock),
          assignedStation:
            idx === 0
              ? 'خط نواربری + پرس ۲۵۰ تن + پرس‌جوش مهره M6'
              : 'خط برش + پرس ضربه‌ای ۱۶۰ تن + پرس‌جوش پیچ M6x20',
          assignedMachineCode: idx === 0 ? 'PRS-250T-01 / WLD-SPOT-01' : 'PRS-160T-02 / WLD-SPOT-02',
          operationsSummary:
            sub.notes ||
            'برش ورق -> بلنک‌زنی -> خمکاری -> پانچ اول و دوم -> پرس‌جوش مقاومتی',
          producedTotalQty: cumulativeProducedGood * (Number(sub.quantity) || 1),
        });

        // Level 2 raw materials & fasteners under this sub-assembly
        (sub.subComponents || []).forEach(leaf => {
          const leafGross = reqSubQty * (Number(leaf.quantity) || 1);
          const existing = matMap.get(leaf.partCode);
          const whStock = balances
            .filter(
              b =>
                (b.partCode === leaf.partCode || b.partId === leaf.partId) &&
                b.warehouseId === 'WH-RAW'
            )
            .reduce((s, b) => s + b.availableQty, 0);
          const lineStock = balances
            .filter(
              b =>
                (b.partCode === leaf.partCode || b.partId === leaf.partId) &&
                b.warehouseId !== 'WH-RAW'
            )
            .reduce((s, b) => s + b.availableQty, 0);

          if (existing) {
            existing.perUnitConsumption = Number(
              (existing.perUnitConsumption + leaf.quantity).toFixed(3)
            );
            existing.grossRequiredQty = Number(
              (existing.grossRequiredQty + leafGross).toFixed(2)
            );
            existing.shortageOrSurplusQty = Number(
              (
                existing.warehouseAvailableQty +
                existing.lineSideAvailableQty -
                existing.grossRequiredQty
              ).toFixed(2)
            );
          } else {
            const totalStock = whStock > 0 ? whStock : leaf.unit === 'کیلوگرم' ? 18450 : 95000;
            const sideStock = lineStock > 0 ? lineStock : leaf.unit === 'کیلوگرم' ? 1200 : 15000;
            matMap.set(leaf.partCode, {
              partCode: leaf.partCode,
              partName: leaf.partName,
              categoryLabel: leaf.unit === 'کیلوگرم' ? 'رول و ورق فولادی' : 'پیچ و مهره جوشی',
              unit: leaf.unit,
              perUnitConsumption: leaf.quantity,
              grossRequiredQty: Number(leafGross.toFixed(2)),
              warehouseAvailableQty: totalStock,
              lineSideAvailableQty: sideStock,
              shortageOrSurplusQty: Number((totalStock + sideStock - leafGross).toFixed(2)),
            });
          }
        });
      });
    } else {
      // Default explosion for Anti-Theft Bracket or selected product
      subMos.push(
        {
          id: 'SUB-MO-1',
          moNumber: `${masterMoNumber}-SUB1`,
          level: 1,
          partCode: 'WIP-ECU-MAIN-BRK',
          partName: 'صفحه براکت اصلی ضدسرقت (نیمه‌ساخته)',
          unit: 'عدد',
          perParentQty: 1,
          totalRequiredQty: targetOrderQty,
          lineWipStockQty: 0,
          netToProduceQty: targetOrderQty,
          assignedStation: 'خط برش گیوتین -> پرس بلنک و خم ۲۵۰ تن -> پرس پانچ ۱ و ۲ -> پرس‌جوش ۱۵ مهره M6',
          assignedMachineCode: 'SHR-01 / PRS-250T / WLD-SPOT-01',
          operationsSummary:
            'OP10: برش رول ۲*۱۱۴۰ -> OP20: بلنک -> OP30: خم لبه -> OP40: پانچ ۱ و ۲ -> OP50: پرس‌جوش ۱۵ مهره M6',
          producedTotalQty: cumulativeProducedGood,
        },
        {
          id: 'SUB-MO-2',
          moNumber: `${masterMoNumber}-SUB2`,
          level: 1,
          partCode: 'WIP-ECU-COMP-BRK',
          partName: 'مکمل براکت ضدسرقت (نیمه‌ساخته)',
          unit: 'عدد',
          perParentQty: 1,
          totalRequiredQty: targetOrderQty,
          lineWipStockQty: 0,
          netToProduceQty: targetOrderQty,
          assignedStation: 'خط برش -> پرس ۱۶۰ تن (بلنک، خم، پانچ) -> پرس‌جوش ۲ پیچ 6*20',
          assignedMachineCode: 'SHR-01 / PRS-160T / WLD-SPOT-02',
          operationsSummary:
            'OP10: برش ورق DC01A -> OP20: بلنک و خم -> OP30: پانچ -> OP40: پرس‌جوش ۲ عدد پیچ M6x20',
          producedTotalQty: cumulativeProducedGood,
        }
      );

      matMap.set('RM-COIL-DC01A-2.0-1140', {
        partCode: 'RM-COIL-DC01A-2.0-1140',
        partName: 'رول ورق DC01A ضخامت 2mm عرض 1140 (یا جایگزین 1000)',
        categoryLabel: 'ماده اولیه / کلاف ورق',
        unit: 'کیلوگرم',
        perUnitConsumption: 1.4,
        grossRequiredQty: targetOrderQty * 1.4,
        warehouseAvailableQty: 18450,
        lineSideAvailableQty: 1550,
        shortageOrSurplusQty: 20000 - targetOrderQty * 1.4,
      });
      matMap.set('FST-NUT-WELD-M6', {
        partCode: 'FST-NUT-WELD-M6',
        partName: 'مهره جوشی چهارخار M6 استاندارد DIN 928 (۱۵ عدد در صفحه اصلی)',
        categoryLabel: 'یراق‌آلات و اتصالات جوشی',
        unit: 'عدد',
        perUnitConsumption: 15,
        grossRequiredQty: targetOrderQty * 15,
        warehouseAvailableQty: 85000,
        lineSideAvailableQty: 12000,
        shortageOrSurplusQty: 97000 - targetOrderQty * 15,
      });
      matMap.set('FST-BOLT-WELD-M6-20', {
        partCode: 'FST-BOLT-WELD-M6-20',
        partName: 'پیچ جوشی پایه ۶*۲۰ (۲ عدد در قطعه مکمل)',
        categoryLabel: 'یراق‌آلات و اتصالات جوشی',
        unit: 'عدد',
        perUnitConsumption: 2,
        grossRequiredQty: targetOrderQty * 2,
        warehouseAvailableQty: 24000,
        lineSideAvailableQty: 3500,
        shortageOrSurplusQty: 27500 - targetOrderQty * 2,
      });
    }

    // Add Final Assembly MO (Level 0)
    subMos.push({
      id: 'FINAL-MO-0',
      moNumber: `${masterMoNumber}-FIN`,
      level: 0,
      partCode: selectedProduct.code,
      partName: `${selectedProduct.name} (مونتاژ نهایی و رنگ)`,
      unit: 'عدد',
      perParentQty: 1,
      totalRequiredQty: targetOrderQty,
      lineWipStockQty: 0,
      netToProduceQty: targetOrderQty,
      assignedStation: 'ایستگاه جوش CO2 (اتصال اصلی و مکمل) + خط رنگ کاتافورز (ED)',
      assignedMachineCode: 'WLD-CO2-ST04 / PNT-ED-LINE1',
      operationsSummary: 'OP60: جوشکاری CO2 اتصال صفحه اصلی و مکمل -> OP70: شستشو و رنگ کاتافورز نهایی',
      producedTotalQty: cumulativeProducedGood,
    });

    return {
      subMoList: subMos,
      materialRequirements: Array.from(matMap.values()),
    };
  }, [
    productStructures,
    selectedProduct,
    targetOrderQty,
    masterMoNumber,
    balances,
    cumulativeProducedGood,
  ]);

  // Step 5 Handler: Log daily production and roll remaining work forward to the next day!
  const handleRecordDailyProductionAndRollForward = (e: React.FormEvent) => {
    e.preventDefault();
    const good = Math.max(0, Number(inputGoodQty) || 0);
    const scrap = Math.max(0, Number(inputScrapQty) || 0);

    const updated = [...dailyRows];
    const currentIdx = updated.findIndex(r => r.dayIndex === selectedDayIdx);
    if (currentIdx === -1) return;

    const currentDay = { ...updated[currentIdx] };
    currentDay.actualGoodQty = good;
    currentDay.scrapQty = scrap;
    currentDay.operatorNote = inputOperatorNote;

    // Calculate Remaining Work for today:
    const remainingToday = Math.max(0, currentDay.effectiveTargetQty - good);
    currentDay.remainingDayQty = remainingToday;
    currentDay.status =
      remainingToday > 0 ? 'CLOSED_ROLLED_FORWARD' : 'COMPLETED';
    updated[currentIdx] = currentDay;

    // Propagate Carry-Over (مانده کار) cascading through subsequent days
    for (let i = currentIdx + 1; i < updated.length; i++) {
      const prevDay = updated[i - 1];
      const thisDay = { ...updated[i] };
      thisDay.carriedFromPrevDayQty = prevDay.remainingDayQty;
      thisDay.effectiveTargetQty = thisDay.baseTargetQty + thisDay.carriedFromPrevDayQty;
      thisDay.remainingDayQty = Math.max(0, thisDay.effectiveTargetQty - thisDay.actualGoodQty);
      if (i === currentIdx + 1 && thisDay.status === 'OPEN') {
        thisDay.status = 'IN_PROGRESS';
      }
      updated[i] = thisDay;
    }

    persistDailyRows(updated);

    const nextDay = updated[currentIdx + 1];
    if (nextDay) {
      setSelectedDayIdx(nextDay.dayIndex);
      setInputGoodQty(String(nextDay.effectiveTargetQty));
      setInputScrapQty('10');
      setInputOperatorNote('');
      setBannerMessage(
        remainingToday > 0
          ? `گزارش ${currentDay.dayName} ثبت شد: ${formatNumber(good)} عدد تولید سالم ثبت گردید و مانده کار (${formatNumber(
              remainingToday
            )} عدد) به صورت خودکار به «${nextDay.dayName}» منتقل شد (برنامه جدید فردا: ${formatNumber(
              nextDay.effectiveTargetQty
            )} عدد).`
          : `گزارش ${currentDay.dayName} با موفقیت تکمیل شد (۱۰۰٪ هدف روز محقق گردید و مانده انتقالی به فردا صفر است).`
      );
    } else {
      setBannerMessage(
        `گزارش ${currentDay.dayName} ثبت شد. مجموع تولید تجمعی: ${formatNumber(
          updated.reduce((s, r) => s + r.actualGoodQty, 0)
        )} عدد از ${formatNumber(targetOrderQty)} عدد.`
      );
    }
  };

  const activeDayRow = dailyRows.find(r => r.dayIndex === selectedDayIdx) || dailyRows[0];

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl">
      {/* Top ERP Standard Workflow Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  میز کار جامع برنامه‌ریزی و اجرای تولید (استاندارد SAP PP / Odoo MRP / ERPNext)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  فرآیند ۵ مرحله‌ای از سفارش تا انتقال مانده کار روزانه
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                تبدیل خودکار تیراژ هدف (مثلاً ۵,۰۰۰ عدد محصول) به دستورات ساخت زیرمجموعه‌ها، محاسبه ورق و مهره، تخصیص ماشین‌آلات، برنامه هفتگی/روزانه و انتقال خودکار مانده کار هر روز به روز بعد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                initializeSchedule(targetOrderQty, workingDaysCount);
                setBannerMessage(
                  `برنامه تولید برای تیراژ ${formatNumber(targetOrderQty)} عدد در ${toPersianDigits(
                    workingDaysCount
                  )} روز کاری بازنشانی و آماده اجرا شد.`
                );
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی برنامه ۵,۰۰۰ تایی</span>
            </button>
          </div>
        </div>

        {/* 5-Stage Interactive Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            {
              step: 1 as const,
              title: 'گام ۱: تیراژ هدف و سفارش (MPS)',
              subtitle: `هدف: ${formatNumber(targetOrderQty)} عدد`,
              icon: FileCheck2,
            },
            {
              step: 2 as const,
              title: 'گام ۲: انفجار BOM و دستورات ساخت',
              subtitle: `${toPersianDigits(subMoList.length)} دستور ساخت + موازنه مواد`,
              icon: ListTree,
            },
            {
              step: 3 as const,
              title: 'گام ۳: تخصیص منابع و موجودی خطوط',
              subtitle: 'پرس‌ها، جوش و موجودی پای خط',
              icon: Wrench,
            },
            {
              step: 4 as const,
              title: 'گام ۴: برنامه هفتگی و روزانه',
              subtitle: `شکست در ${toPersianDigits(workingDaysCount)} روز کاری`,
              icon: Calendar,
            },
            {
              step: 5 as const,
              title: 'گام ۵: ثبت تولید روز و انتقال مانده',
              subtitle: `مانده کل: ${formatNumber(totalOrderRemaining)} عدد`,
              icon: TrendingUp,
            },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isActive ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{item.title}</div>
                  <div
                    className={`text-[11px] mt-0.5 truncate ${
                      isActive ? 'text-amber-300 font-mono' : 'text-slate-500 font-mono'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Action Notification */}
      {bannerMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-4 text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 text-xs px-2 py-0.5 rounded bg-emerald-100 cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Global Order Progress KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">شماره برنامه / دستور ساخت مادر</span>
          <strong className="font-mono text-sm font-bold text-slate-900 mt-1 block">
            {masterMoNumber}
          </strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">تیراژ هدف کل سفارش (MPS)</span>
          <strong className="font-mono text-base font-bold text-slate-900 mt-1 block">
            {formatNumber(targetOrderQty)} <span className="text-xs font-sans">عدد</span>
          </strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">تولید سالم تجمعی تا این لحظه</span>
          <strong className="font-mono text-base font-bold text-emerald-700 mt-1 block">
            {formatNumber(cumulativeProducedGood)} <span className="text-xs font-sans">عدد ({toPersianDigits(completionPercent)}٪)</span>
          </strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">مانده کار کل سفارش (تعهد باقی‌مانده)</span>
          <strong className="font-mono text-base font-bold text-amber-700 mt-1 block">
            {formatNumber(totalOrderRemaining)} <span className="text-xs font-sans">عدد</span>
          </strong>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">ضایعات ثبت‌شده کل دوره</span>
          <strong className="font-mono text-base font-bold text-rose-700 mt-1 block">
            {formatNumber(cumulativeScrap)} <span className="text-xs font-sans">عدد</span>
          </strong>
        </div>
      </div>

      {/* ================================================================== */}
      {/* STEP 1: MPS TARGET DEMAND & SCENARIO DEFINITION                    */}
      {/* ================================================================== */}
      {activeStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-600" />
              <span>گام ۱: ثبت سفارش تولید یا تعیین تیراژ هدف (Master Production Schedule - MPS)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              در سیستم‌های SAP PP و Odoo، ابتدا محصول نهایی و تیراژ هدف (مثلاً ۵,۰۰۰ عدد براکت ضدسرقت) مشخص می‌شود تا موتور MRP قطعات زیرمجموعه و مواد اولیه را محاسبه کند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                انتخاب محصول نهایی جهت برنامه‌ریزی تولید *
              </label>
              <SearchableSelect
                value={selectedProductCode}
                onChange={val => setSelectedProductCode(val)}
                placeholder="جستجو و انتخاب محصول نهایی..."
                searchPlaceholder="تایپ نام یا کد محصول (مثلاً براکت ضدسرقت یا تارا)..."
                options={[
                  {
                    value: 'SAPCO-ASY-ECU-BRK-01',
                    label: 'مجموعه کامل براکت ضدسرقت رایانه موتور (SAPCO-ASY-ECU-BRK-01)',
                    sublabel: 'متشکل از: صفحه براکت اصلی + مکمل براکت + ۱۵ مهره M6 + ۲ پیچ 6*20',
                    badge: 'پژو ۲۰۶',
                  },
                  {
                    value: 'SAPCO-ASY-TARA-BRK-01',
                    label: 'مجموعه براکت تارا با پوشش کاتافورز ED (SAPCO-ASY-TARA-BRK-01)',
                    sublabel: 'متشکل از: براکت بزرگ (۸ مهره) + براکت کوچک (۱۲ مهره)',
                    badge: 'تارا',
                  },
                  ...parts
                    .filter(
                      p =>
                        p.code !== 'SAPCO-ASY-ECU-BRK-01' &&
                        p.code !== 'SAPCO-ASY-TARA-BRK-01'
                    )
                    .map(p => ({
                      value: p.code,
                      label: `${p.name} (${p.code})`,
                      sublabel: `واحد: ${p.unit}`,
                      badge: p.carModel || 'کالا',
                    })),
                ]}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                تیراژ هدف تولید (تعداد کل سفارش) *
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={targetOrderQty}
                onChange={e => setTargetOrderQty(Math.max(1, Number(e.target.value) || 5000))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1000, 3000, 5000, 10000].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setTargetOrderQty(q)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      targetOrderQty === q
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {formatNumber(q)} عدد
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                افق شکست روزانه (تعداد روز کاری هفته)
              </label>
              <select
                value={workingDaysCount}
                onChange={e => setWorkingDaysCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none"
              >
                <option value={5}>۵ روز کاری (شنبه تا چهارشنبه — روزی {formatNumber(Math.round(targetOrderQty / 5))} عدد)</option>
                <option value={6}>۶ روز کاری (شنبه تا پنج‌شنبه — روزی {formatNumber(Math.round(targetOrderQty / 6))} عدد)</option>
                <option value={4}>۴ روز کاری فشرده (روزی {formatNumber(Math.round(targetOrderQty / 4))} عدد)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-600">
              محصول انتخابی: <strong className="text-slate-900">{selectedProduct.name}</strong> | تیراژ هدف:{' '}
              <strong className="font-mono text-slate-900">{formatNumber(targetOrderQty)} عدد</strong>
            </div>

            <button
              type="button"
              onClick={() => {
                initializeSchedule(targetOrderQty, workingDaysCount);
                setActiveStep(2);
              }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>اجرای انفجار BOM و مشاهده دستورات ساخت پیشنهادی (گام ۲)</span>
              <ArrowLeft className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: BOM EXPLOSION, SUB-MOs & MATERIAL NETTING                  */}
      {/* ================================================================== */}
      {activeStep === 2 && (
        <div className="space-y-5">
          {/* Sub-MOs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-amber-600" />
                  <span>
                    الف) پیشنهاد خودکار دستورات ساخت مرحله‌ای (Planned Manufacturing Orders) برای تولید{' '}
                    {formatNumber(targetOrderQty)} عدد
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سیستم بر اساس «ساختار درختی محصول»، قطعات نیمه‌ساخته لازم (مثل صفحه اصلی و مکمل) را استخراج و برای هر کدام دستور کار مجزا صادر کرده است.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>ادامه به گام ۳: تخصیص منابع و موجودی خطوط</span>
                <ArrowLeft className="w-4 h-4 text-amber-400" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">شماره دستور ساخت (MO)</th>
                    <th className="py-3 px-3">سطح درخت</th>
                    <th className="py-3 px-3">کد و نام قطعه تولیدی</th>
                    <th className="py-3 px-3">ضریب در محصول</th>
                    <th className="py-3 px-3">نیاز ناخالص</th>
                    <th className="py-3 px-3">موجودی پای خط</th>
                    <th className="py-3 px-3 text-emerald-700 font-bold">تیراژ خالص دستور ساخت</th>
                    <th className="py-3 px-3">توالی عملیات مسیر تولید (Routing)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subMoList.map(mo => (
                    <tr key={mo.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{mo.moNumber}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mo.level === 0
                              ? 'bg-slate-900 text-white'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {mo.level === 0 ? 'سطح ۰ (مونتاژ نهایی)' : 'سطح ۱ (قطعه نیمه‌ساخته)'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{mo.partName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{mo.partCode}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {toPersianDigits(mo.perParentQty)} {mo.unit}
                      </td>
                      <td className="py-3 px-3 font-mono">{formatNumber(mo.totalRequiredQty)}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {formatNumber(mo.lineWipStockQty)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-sm">
                        {formatNumber(mo.netToProduceQty)} {mo.unit}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs">
                        {mo.operationsSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Material Netting Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>
                ب) محاسبه نیازمندی ورق خام و یراق‌آلات جوشی (MRP Material Netting) برای{' '}
                {formatNumber(targetOrderQty)} عدد
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">کد و نام ماده اولیه / یراق</th>
                    <th className="py-3 px-3">گروه کالا</th>
                    <th className="py-3 px-3">مصرف به ازای ۱ محصول</th>
                    <th className="py-3 px-3 font-bold text-slate-900">کل نیاز برنامه ({formatNumber(targetOrderQty)} عدد)</th>
                    <th className="py-3 px-3">موجودی انبار مرکزی</th>
                    <th className="py-3 px-3">موجودی پای خط (WIP)</th>
                    <th className="py-3 px-3">وضعیت تأمین (تراز خالص)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialRequirements.map(mat => {
                    const isShortage = mat.shortageOrSurplusQty < 0;
                    return (
                      <tr key={mat.partCode} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{mat.partName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{mat.partCode}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{mat.categoryLabel}</td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {toPersianDigits(mat.perUnitConsumption)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm">
                          {formatNumber(mat.grossRequiredQty)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800">
                          {formatNumber(mat.warehouseAvailableQty)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-700">
                          {formatNumber(mat.lineSideAvailableQty)} {mat.unit}
                        </td>
                        <td className="py-3 px-3">
                          {isShortage ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-mono font-bold text-[11px]">
                              کسری: {formatNumber(Math.abs(mat.shortageOrSurplusQty))} {mat.unit}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[11px]">
                              موجودی کافی (+{formatNumber(mat.shortageOrSurplusQty)} {mat.unit} مازاد)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: RESOURCE ALLOCATION & LINE-SIDE INVENTORY CHECK            */}
      {/* ================================================================== */}
      {activeStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>
                  گام ۳: تخصیص منابع (ماشین‌آلات، پرس‌ها و ایستگاه‌های جوش) و کنترل موجودی پای خط
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                بررسی ظرفیت ایستگاه‌های کاری و تأیید تخصیص ماشین‌آلات قبل از شکست برنامه به روزهای هفته
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>تأیید منابع و مشاهده برنامه هفتگی و روزانه (گام ۴)</span>
              <ArrowLeft className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subMoList.map(mo => (
              <div
                key={mo.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                    {mo.moNumber}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    آماده تولید
                  </span>
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{mo.partName}</div>
                  <div className="text-slate-500 mt-0.5">
                    تیراژ مورد نیاز: <strong className="font-mono text-slate-900">{formatNumber(mo.netToProduceQty)} عدد</strong>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-[11px] text-slate-500">ایستگاه و ماشین‌آلات تخصیص‌یافته:</div>
                  <div className="font-bold text-slate-900">{mo.assignedStation}</div>
                  <div className="font-mono text-[11px] text-indigo-700">{mo.assignedMachineCode}</div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">نرخ تولید استاندارد ایستگاه:</span>
                  <strong className="font-mono text-slate-900">۲۵۰ قطعه / ساعت (۱,۰۰۰ در روز)</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: WEEKLY & DAILY SCHEDULE BREAKDOWN MATRIX                   */}
      {/* ================================================================== */}
      {activeStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>
                  گام ۴: جدول برنامه‌ریزی هفتگی و روزانه به همراه ستون «انتقال مانده از روز قبل»
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تیراژ {formatNumber(targetOrderQty)} عددی بین روزهای هفته شکسته شده است. اگر در هر روز کمتر از برنامه تولید شود، مانده کار خودکار به ستون «انتقالی از روز قبل» در روز بعد اضافه می‌گردد.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveStep(5)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>ورود به گام ۵: ثبت تولید روزانه و انتقال مانده به روز بعد</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-3">روز هفته و تاریخ</th>
                  <th className="py-3 px-3">سهمیه پایه روز</th>
                  <th className="py-3 px-3 text-amber-800 bg-amber-50/60">
                    + مانده انتقالی از روز قبل (Carry-Over)
                  </th>
                  <th className="py-3 px-3 font-bold text-slate-900 bg-slate-100">
                    = برنامه کل قابل اجرا در روز
                  </th>
                  <th className="py-3 px-3 text-emerald-700">تولید سالم ثبت‌شده</th>
                  <th className="py-3 px-3 text-rose-700">ضایعات</th>
                  <th className="py-3 px-3 font-bold text-amber-900">
                    مانده کار روز (انتقال به فردا)
                  </th>
                  <th className="py-3 px-3">وضعیت روز</th>
                  <th className="py-3 px-3">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRows.map(row => (
                  <tr key={row.dayIndex} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{row.dayName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{row.dateLabel}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {formatNumber(row.baseTargetQty)} عدد
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-800 bg-amber-50/40">
                      {row.carriedFromPrevDayQty > 0
                        ? `+${formatNumber(row.carriedFromPrevDayQty)} عدد`
                        : '۰'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-950 bg-slate-50 text-sm">
                      {formatNumber(row.effectiveTargetQty)} عدد
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      {formatNumber(row.actualGoodQty)} عدد
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-700">
                      {row.scrapQty > 0 ? `${formatNumber(row.scrapQty)} عدد` : '۰'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-900">
                      {row.remainingDayQty > 0 ? `${formatNumber(row.remainingDayQty)} عدد` : '۰ (تکمیل)'}
                    </td>
                    <td className="py-3 px-3">
                      {row.status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                          تکمیل‌شده (۱۰۰٪)
                        </span>
                      ) : row.status === 'CLOSED_ROLLED_FORWARD' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                          بسته‌شده (مانده به فردا منتقل شد)
                        </span>
                      ) : row.status === 'IN_PROGRESS' ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                          روز جاری در حال تولید
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          برنامه‌ریزی شده
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayIdx(row.dayIndex);
                          setInputGoodQty(
                            String(
                              row.actualGoodQty > 0
                                ? row.actualGoodQty
                                : Math.round(row.effectiveTargetQty * 0.8)
                            )
                          );
                          setActiveStep(5);
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        ثبت تولید این روز
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5: DAILY EXECUTION LOGGING & ROLL-FORWARD ENGINE              */}
      {/* ================================================================== */}
      {activeStep === 5 && activeDayRow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Right Form: Log Daily Production & Roll Balance Forward */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                موتور ثبت کارکرد روزانه و انتقال مانده (SAP / Odoo Roll-Forward)
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                ثبت تولید روزانه و انتقال خودکار مانده کار به روز بعد
              </h3>
            </div>

            <form onSubmit={handleRecordDailyProductionAndRollForward} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  انتخاب روز کاری جهت ثبت گزارش تولید:
                </label>
                <select
                  value={selectedDayIdx}
                  onChange={e => {
                    const idx = Number(e.target.value);
                    setSelectedDayIdx(idx);
                    const found = dailyRows.find(r => r.dayIndex === idx);
                    if (found) {
                      setInputGoodQty(
                        String(found.actualGoodQty > 0 ? found.actualGoodQty : found.effectiveTargetQty)
                      );
                      setInputScrapQty(String(found.scrapQty || 0));
                      setInputOperatorNote(found.operatorNote || '');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none"
                >
                  {dailyRows.map(r => (
                    <option key={r.dayIndex} value={r.dayIndex}>
                      {r.dayName} ({r.dateLabel}) — برنامه قابل اجرا: {formatNumber(r.effectiveTargetQty)} عدد
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Day Target Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">سهمیه پایه این روز:</span>
                  <strong className="font-mono text-slate-900">
                    {formatNumber(activeDayRow.baseTargetQty)} عدد
                  </strong>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>+ مانده منتقل‌شده از روز قبل:</span>
                  <strong className="font-mono">
                    {formatNumber(activeDayRow.carriedFromPrevDayQty)} عدد
                  </strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">= کل تعهد قابل تولید امروز:</span>
                  <strong className="font-mono text-slate-900">
                    {formatNumber(activeDayRow.effectiveTargetQty)} عدد
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تعداد تولید سالم امروز (عدد) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputGoodQty}
                    onChange={e => setInputGoodQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-sm text-emerald-800 focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تعداد ضایعات امروز (عدد)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={inputScrapQty}
                    onChange={e => setInputScrapQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-sm text-rose-700 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Live Preview of Remaining Work to Roll Forward */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-amber-900 block font-semibold">
                    مانده کار امروز (جهت انتقال خودکار به برنامه فردا):
                  </span>
                  <span className="text-[10px] text-amber-700">
                    فرمول: {formatNumber(activeDayRow.effectiveTargetQty)} (برنامه امروز) منهای{' '}
                    {formatNumber(Number(inputGoodQty) || 0)} (تولید سالم امروز)
                  </span>
                </div>
                <strong className="font-mono text-base font-bold text-amber-950">
                  {formatNumber(
                    Math.max(0, activeDayRow.effectiveTargetQty - (Number(inputGoodQty) || 0))
                  )}{' '}
                  عدد
                </strong>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  توضیحات سرپرست تولید / علت انتقال مانده به روز بعد
                </label>
                <textarea
                  rows={2}
                  value={inputOperatorNote}
                  onChange={e => setInputOperatorNote(e.target.value)}
                  placeholder="مثلاً توقف ۲۰ دقیقه‌ای پرس جوش جهت تعویض الکترود..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  ثبت تولید {activeDayRow.dayName} و انتقال مانده کار به روز بعد
                </span>
              </button>
            </form>
          </div>

          {/* Left Table: Live Daily Roll-Forward Schedule */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900">
                جدول زنده ردیابی روزبه‌روز تولید و انتقال مانده کار (Roll-Forward Schedule)
              </h4>
              <span className="text-[11px] font-mono text-slate-600">
                پیشرفت کل سفارش: {toPersianDigits(completionPercent)}٪
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">روز</th>
                    <th className="py-2.5 px-3">برنامه پایه</th>
                    <th className="py-2.5 px-3 text-amber-800">+ انتقالی از قبل</th>
                    <th className="py-2.5 px-3 font-bold text-slate-900">= برنامه کل روز</th>
                    <th className="py-2.5 px-3 text-emerald-700">تولید واقعی</th>
                    <th className="py-2.5 px-3 font-bold text-amber-900">مانده به فردا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRows.map(row => {
                    const isSelected = row.dayIndex === selectedDayIdx;
                    return (
                      <tr
                        key={row.dayIndex}
                        onClick={() => setSelectedDayIdx(row.dayIndex)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50/80 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-900">
                          <div>{row.dayName}</div>
                          {row.operatorNote && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {row.operatorNote}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{formatNumber(row.baseTargetQty)}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-800 font-bold">
                          {row.carriedFromPrevDayQty > 0
                            ? `+${formatNumber(row.carriedFromPrevDayQty)}`
                            : '۰'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-950">
                          {formatNumber(row.effectiveTargetQty)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {formatNumber(row.actualGoodQty)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                          {row.remainingDayQty > 0 ? formatNumber(row.remainingDayQty) : '۰'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
