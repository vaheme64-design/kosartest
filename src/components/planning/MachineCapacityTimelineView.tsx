import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Clock,
  Layers,
  ArrowLeftRight,
  Sparkles,
  Filter,
  ChevronLeft,
  Wrench,
  PlayCircle,
} from 'lucide-react';
import { ProductionPlanSuggestion } from '../../types/productionPlanning';
import { Part, Machine } from '../../types/inventory';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface MachineCapacityTimelineViewProps {
  suggestions: ProductionPlanSuggestion[];
  parts: Part[];
  machines: Machine[];
}

export interface ScheduledMoBlock {
  id: string;
  moNumber: string;
  partCode: string;
  partName: string;
  operationCode: string;
  operationTitle: string;
  machineCode: string;
  machineName: string;
  hall: string;
  tonnageLabel: string;
  quantity: number;
  startHour: number; // 7 to 23 (decimal allowed, e.g., 7.5 = 07:30)
  endHour: number;   // 7 to 23
  status: 'IN_PROGRESS' | 'SCHEDULED' | 'SETUP' | 'COMPLETED';
  contractNumber: string;
  dieCode: string;
  setupMinutes: number;
}

const INITIAL_CAPACITY_BLOCKS: ScheduledMoBlock[] = [
  {
    id: 'CAP-01',
    moNumber: 'MO-1404-0101',
    partCode: 'SAPCO-BRK-206-01',
    partName: 'مجموعه براکت نگه‌دارنده رادیاتور پژو ۲۰۶',
    operationCode: 'OP-20',
    operationTitle: 'کشش عمیق و فرم‌دهی اصلی',
    machineCode: 'PRS-400T-01',
    machineName: 'پرس هیدرولیک ۴۰۰ تن ۱',
    hall: 'سالن پرس سنگین',
    tonnageLabel: '400T',
    quantity: 2500,
    startHour: 7.5,
    endHour: 13.5,
    status: 'IN_PROGRESS',
    contractNumber: 'CNT-SAPCO-1404-108',
    dieCode: 'DIE-206-DRW-02',
    setupMinutes: 35,
  },
  {
    id: 'CAP-02',
    moNumber: 'MO-1404-0104',
    partCode: 'SAPCO-TR-CROSS-04',
    partName: 'رام زیر موتور خودرو تارا (Crossmember)',
    operationCode: 'OP-20',
    operationTitle: 'فرم‌دهی سنگین بدنه رام',
    machineCode: 'PRS-400T-01',
    machineName: 'پرس هیدرولیک ۴۰۰ تن ۱',
    hall: 'سالن پرس سنگین',
    tonnageLabel: '400T',
    quantity: 1200,
    startHour: 11.5,
    endHour: 16.5,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-1404-112',
    dieCode: 'DIE-TR-CRS-01',
    setupMinutes: 45,
  },
  {
    id: 'CAP-03',
    moNumber: 'MO-1404-0102',
    partCode: 'IKCO-PNL-DENA-02',
    partName: 'پنل تقویتی ستون وسط دنا پلاس (B-Pillar)',
    operationCode: 'OP-20',
    operationTitle: 'کشش و فرم‌دهی ستون B',
    machineCode: 'PRS-800T-01',
    machineName: 'پرس هیدرولیک ۸۰۰ تن ۱',
    hall: 'سالن پرس سنگین',
    tonnageLabel: '800T',
    quantity: 1800,
    startHour: 7.0,
    endHour: 14.0,
    status: 'IN_PROGRESS',
    contractNumber: 'CNT-IKCO-1404-204',
    dieCode: 'DIE-DNA-BPL-01',
    setupMinutes: 50,
  },
  {
    id: 'CAP-04',
    moNumber: 'MO-1404-0107',
    partCode: 'IKCO-FND-207-LH',
    partName: 'پوسته گلگیر جلو چپ پژو ۲۰۷',
    operationCode: 'OP-10',
    operationTitle: 'کشش اولیه گلگیر',
    machineCode: 'PRS-800T-01',
    machineName: 'پرس هیدرولیک ۸۰۰ تن ۱',
    hall: 'سالن پرس سنگین',
    tonnageLabel: '800T',
    quantity: 950,
    startHour: 14.5,
    endHour: 20.5,
    status: 'SCHEDULED',
    contractNumber: 'CNT-IKCO-1404-219',
    dieCode: 'DIE-207-FND-01',
    setupMinutes: 40,
  },
  {
    id: 'CAP-05',
    moNumber: 'MO-1404-0103',
    partCode: 'SAPCO-ECU-SHLD-03',
    partName: 'محافظ فلزی ضدسرقت ECU پژو پارس',
    operationCode: 'OP-20',
    operationTitle: 'پانچ و خم کاری مرحله اول',
    machineCode: 'PRS-250T-01',
    machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
    hall: 'سالن پرس متوسط',
    tonnageLabel: '250T',
    quantity: 4000,
    startHour: 8.0,
    endHour: 13.0,
    status: 'COMPLETED',
    contractNumber: 'CNT-SAPCO-1404-115',
    dieCode: 'DIE-ECU-PNC-03',
    setupMinutes: 25,
  },
  {
    id: 'CAP-06',
    moNumber: 'MO-1404-0105',
    partCode: 'SAPCO-SEAT-BRK-05',
    partName: 'براکت ریل صندلی جلو سمند سورن',
    operationCode: 'OP-30',
    operationTitle: 'کالیبره و سوراخ‌کاری دقیق',
    machineCode: 'PRS-250T-01',
    machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
    hall: 'سالن پرس متوسط',
    tonnageLabel: '250T',
    quantity: 3200,
    startHour: 12.0,
    endHour: 17.5,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-1404-119',
    dieCode: 'DIE-SRN-SET-02',
    setupMinutes: 30,
  },
  {
    id: 'CAP-07',
    moNumber: 'MO-1404-0101',
    partCode: 'SAPCO-BRK-206-01',
    partName: 'مجموعه براکت نگه‌دارنده رادیاتور پژو ۲۰۶',
    operationCode: 'OP-10',
    operationTitle: 'برش ورق و بلنک‌زنی اولیه',
    machineCode: 'SHR-GUI-6M',
    machineName: 'قیچی گیوتین ۶ متری و خط بلنک',
    hall: 'سالن برش و آماده‌سازی',
    tonnageLabel: 'برش ۶M',
    quantity: 2500,
    startHour: 7.0,
    endHour: 10.5,
    status: 'COMPLETED',
    contractNumber: 'CNT-SAPCO-1404-108',
    dieCode: 'BLNK-206-01',
    setupMinutes: 15,
  },
  {
    id: 'CAP-08',
    moNumber: 'MO-1404-0104',
    partCode: 'SAPCO-TR-CROSS-04',
    partName: 'رام زیر موتور خودرو تارا (Crossmember)',
    operationCode: 'OP-10',
    operationTitle: 'نواربری و برش شیت ضخامت ۲.۵ میل',
    machineCode: 'SHR-GUI-6M',
    machineName: 'قیچی گیوتین ۶ متری و خط بلنک',
    hall: 'سالن برش و آماده‌سازی',
    tonnageLabel: 'برش ۶M',
    quantity: 1200,
    startHour: 11.0,
    endHour: 15.0,
    status: 'IN_PROGRESS',
    contractNumber: 'CNT-SAPCO-1404-112',
    dieCode: 'BLNK-TR-04',
    setupMinutes: 20,
  },
  {
    id: 'CAP-09',
    moNumber: 'MO-1404-0101',
    partCode: 'SAPCO-BRK-206-01',
    partName: 'مجموعه براکت نگه‌دارنده رادیاتور پژو ۲۰۶',
    operationCode: 'OP-40',
    operationTitle: 'جوشکاری مقاومتی و CO2 مهره M8',
    machineCode: 'WLD-ROB-CO2',
    machineName: 'ربات جوشکاری CO2 و پرس‌جوش ۱',
    hall: 'سالن مونتاژ و جوش',
    tonnageLabel: 'Robot Weld',
    quantity: 2500,
    startHour: 14.0,
    endHour: 21.0,
    status: 'SCHEDULED',
    contractNumber: 'CNT-SAPCO-1404-108',
    dieCode: 'JIG-206-WLD-01',
    setupMinutes: 20,
  },
];

const HOURS_AXIS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const formatHourLabel = (hr: number): string => {
  const whole = Math.floor(hr);
  const mins = Math.round((hr - whole) * 60);
  const hh = String(whole).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return toPersianDigits(`${hh}:${mm}`);
};

export const MachineCapacityTimelineView: React.FC<MachineCapacityTimelineViewProps> = ({
  suggestions,
}) => {
  const [blocks, setBlocks] = useState<ScheduledMoBlock[]>(INITIAL_CAPACITY_BLOCKS);
  const [selectedHall, setSelectedHall] = useState<string>('ALL');
  const [onlyConflicts, setOnlyConflicts] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('CAP-02');
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);

  // Group blocks by machine and detect overlaps (تداخل زمانی ماشین‌آلات)
  const machineRows = useMemo(() => {
    const map = new Map<
      string,
      {
        machineCode: string;
        machineName: string;
        hall: string;
        tonnageLabel: string;
        items: ScheduledMoBlock[];
        conflicts: Array<{ blockA: ScheduledMoBlock; blockB: ScheduledMoBlock; overlapHours: number }>;
        utilizationPercent: number;
      }
    >();

    blocks.forEach(b => {
      if (selectedHall !== 'ALL' && b.hall !== selectedHall) return;
      const existing = map.get(b.machineCode) || {
        machineCode: b.machineCode,
        machineName: b.machineName,
        hall: b.hall,
        tonnageLabel: b.tonnageLabel,
        items: [],
        conflicts: [],
        utilizationPercent: 0,
      };
      existing.items.push(b);
      map.set(b.machineCode, existing);
    });

    const totalHorizonHours = 16; // 07:00 to 23:00 (2 shifts)
    Array.from(map.values()).forEach(row => {
      row.items.sort((a, b) => a.startHour - b.startHour);
      let bookedHours = 0;

      for (let i = 0; i < row.items.length; i++) {
        const a = row.items[i];
        bookedHours += Math.max(0, a.endHour - a.startHour);
        for (let j = i + 1; j < row.items.length; j++) {
          const b = row.items[j];
          const overlapStart = Math.max(a.startHour, b.startHour);
          const overlapEnd = Math.min(a.endHour, b.endHour);
          if (overlapEnd > overlapStart) {
            row.conflicts.push({
              blockA: a,
              blockB: b,
              overlapHours: Number((overlapEnd - overlapStart).toFixed(1)),
            });
          }
        }
      }

      row.utilizationPercent = Math.min(100, Math.round((bookedHours / totalHorizonHours) * 100));
    });

    const allRows = Array.from(map.values());
    return onlyConflicts ? allRows.filter(r => r.conflicts.length > 0) : allRows;
  }, [blocks, selectedHall, onlyConflicts]);

  const totalConflictsCount = useMemo(
    () => machineRows.reduce((sum, r) => sum + r.conflicts.length, 0),
    [machineRows]
  );

  const conflictingBlockIds = useMemo(() => {
    const ids = new Set<string>();
    machineRows.forEach(r => {
      r.conflicts.forEach(c => {
        ids.add(c.blockA.id);
        ids.add(c.blockB.id);
      });
    });
    return ids;
  }, [machineRows]);

  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === selectedBlockId) || blocks[0] || null,
    [blocks, selectedBlockId]
  );

  // Auto-resolve a conflict by shifting the second MO right after the first MO (+0.5h setup buffer)
  const handleAutoResolveConflict = (blockIdToShift: string, targetStartHour: number) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockIdToShift) return b;
        const duration = b.endHour - b.startHour;
        const nextStart = Math.min(22 - duration, targetStartHour);
        const nextEnd = Math.min(23, nextStart + duration);
        return {
          ...b,
          startHour: nextStart,
          endHour: nextEnd,
        };
      })
    );
    setResolutionNotice('تداخل زمانی دستور تولید با جابجایی خودکار به اولین بازه آزاد پس از تعویض قالب (SMED) برطرف شد.');
    setTimeout(() => setResolutionNotice(null), 4000);
  };

  // Resolve all conflicts across all machines with one click
  const handleResolveAllConflicts = () => {
    setBlocks(prev => {
      const next = [...prev];
      const byMachine = new Map<string, ScheduledMoBlock[]>();
      next.forEach(b => {
        const list = byMachine.get(b.machineCode) || [];
        list.push({ ...b });
        byMachine.set(b.machineCode, list);
      });

      const resolved: ScheduledMoBlock[] = [];
      byMachine.forEach(list => {
        list.sort((a, b) => a.startHour - b.startHour);
        for (let i = 1; i < list.length; i++) {
          const prevBlock = list[i - 1];
          const currBlock = list[i];
          if (currBlock.startHour < prevBlock.endHour) {
            const duration = currBlock.endHour - currBlock.startHour;
            currBlock.startHour = prevBlock.endHour + 0.5; // 30m SMED setup buffer
            currBlock.endHour = Math.min(23, currBlock.startHour + duration);
          }
        }
        resolved.push(...list);
      });
      return resolved;
    });
    setResolutionNotice('تمامی تداخل‌های زمانی ماشین‌آلات با اعمال ۳۰ دقیقه زمان تعویض قالب (SMED) تسطیح (Leveling) شدند.');
    setTimeout(() => setResolutionNotice(null), 4500);
  };

  const resetDemoConflicts = () => {
    setBlocks(INITIAL_CAPACITY_BLOCKS);
    setResolutionNotice(null);
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                تقویم ظرفیت ماشین‌آلات و گانت چارت دستورات تولید (Finite Capacity Planning)
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                استاندارد SAP PP-CRP / گانت تعاملی
              </span>
              {totalConflictsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {toPersianDigits(totalConflictsCount)} تداخل زمانی ماشین‌آلات شناسایی شد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  بدون تداخل زمانی (برنامه تسطیح‌شده)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              نمای بصری تخصیص هر دستور تولید (MO) و ایستگاه عملیاتی (OP) روی پرس‌ها و خطوط برش در شیفت صبح و عصر (۰۷:۰۰ تا ۲۳:۰۰) جهت شناسایی و رفع تداخل‌های همزمان.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalConflictsCount > 0 ? (
            <button
              type="button"
              onClick={handleResolveAllConflicts}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تسطیح خودکار تداخل‌ها (Auto-Leveling)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resetDemoConflicts}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              بازنشانی سناریوی تداخل نمونه
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {resolutionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resolutionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setResolutionNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Strip & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>دستورات تولید زمان‌بندی‌شده</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {toPersianDigits(blocks.length)} <span className="text-xs font-sans font-normal text-slate-500">عملیات MO</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>تداخل‌های زمانی (Overlaps)</span>
            <AlertTriangle className={`w-4 h-4 ${totalConflictsCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${totalConflictsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {toPersianDigits(totalConflictsCount)}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              {totalConflictsCount > 0 ? 'مورد نیازمند تصمیم‌گیری' : 'تداخل صفر'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>متوسط ضریب اشغال پرس‌ها</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">
            {toPersianDigits(
              machineRows.length > 0
                ? Math.round(machineRows.reduce((s, r) => s + r.utilizationPercent, 0) / machineRows.length)
                : 0
            )}
            ٪ <span className="text-xs font-sans font-normal text-slate-500">در ۲ شیفت کاری</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>فیلتر سالن:</span>
            </div>
            <select
              value={selectedHall}
              onChange={e => setSelectedHall(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">همه سالن‌ها</option>
              <option value="سالن پرس سنگین">سالن پرس سنگین</option>
              <option value="سالن پرس متوسط">سالن پرس متوسط</option>
              <option value="سالن برش و آماده‌سازی">سالن برش و آماده‌سازی</option>
              <option value="سالن مونتاژ و جوش">سالن مونتاژ و جوش</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-700 font-medium cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={onlyConflicts}
              onChange={e => setOnlyConflicts(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span>فقط نمایش ماشین‌آلات دارای تداخل زمانی</span>
          </label>
        </div>
      </div>

      {/* Main Minimal Visual Gantt / Timeline Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Legend & Shift Indicators */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700">راهنمای وضعیت دستور کار روی گانت:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
              <span className="text-slate-700">در حال تولید (In Progress)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
              <span className="text-slate-700">برنامه‌ریزی شده (Scheduled)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-500 inline-block" />
              <span className="text-slate-700">تکمیل شده (Completed)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-600 ring-2 ring-rose-300 inline-block" />
              <span className="font-bold text-rose-700">تداخل زمانی ماشین (Time Conflict)</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-sans">
              شیفت صبح (A): ۰۷:۰۰ تا ۱۵:۰۰
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-sans">
              شیفت عصر (B): ۱۵:۰۰ تا ۲۳:۰۰
            </span>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            {/* Time Axis Header */}
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600">
              <div className="col-span-3 py-2.5 px-4 border-l border-slate-200 flex items-center justify-between">
                <span>ماشین / خط تولید (Work Center)</span>
                <span className="text-[10px] text-slate-400">بارگذاری</span>
              </div>
              <div className="col-span-9 relative py-2.5 px-2">
                <div className="grid grid-cols-16 text-center font-mono text-[10px] text-slate-500">
                  {HOURS_AXIS.slice(0, 16).map(hr => (
                    <div key={hr} className="border-r border-slate-200/70 first:border-r-0">
                      {toPersianDigits(String(hr).padStart(2, '0'))}:۰۰
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Machine Rows */}
            <div className="divide-y divide-slate-200">
              {machineRows.map(row => {
                const hasConflict = row.conflicts.length > 0;
                return (
                  <div
                    key={row.machineCode}
                    className={`grid grid-cols-12 transition-colors ${
                      hasConflict ? 'bg-rose-50/20' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Right Column: Machine Info */}
                    <div className="col-span-3 p-3.5 border-l border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {row.machineCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                            {row.tonnageLabel}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1.5">{row.machineName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{row.hall}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">ضریب اشغال شیفت:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                hasConflict
                                  ? 'bg-rose-600'
                                  : row.utilizationPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${row.utilizationPercent}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {toPersianDigits(row.utilizationPercent)}٪
                          </span>
                        </div>
                      </div>

                      {hasConflict && (
                        <div className="mt-2 px-2 py-1 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            تداخل: {toPersianDigits(row.conflicts[0].overlapHours)} ساعت همپوشانی
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleAutoResolveConflict(
                                row.conflicts[0].blockB.id,
                                row.conflicts[0].blockA.endHour + 0.5
                              )
                            }
                            className="underline hover:text-rose-950 cursor-pointer"
                          >
                            رفع تداخل
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Left Column: 16-Hour Visual Gantt Track (07:00 to 23:00) */}
                    <div className="col-span-9 relative min-h-[96px] p-2 flex items-center">
                      {/* Vertical Hour Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-16 pointer-events-none">
                        {HOURS_AXIS.slice(0, 16).map(hr => (
                          <div
                            key={hr}
                            className={`border-r h-full ${
                              hr === 15
                                ? 'border-r-2 border-dashed border-amber-400/70 bg-blue-50/10'
                                : 'border-slate-100'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Scheduled MO Blocks */}
                      <div className="relative w-full h-20">
                        {row.items.map((item, idx) => {
                          const totalSpan = 16; // 7 to 23
                          const startOffset = Math.max(0, item.startHour - 7);
                          const duration = Math.max(0.8, item.endHour - item.startHour);
                          const rightPercent = Math.min(95, (startOffset / totalSpan) * 100);
                          const widthPercent = Math.min(100 - rightPercent, (duration / totalSpan) * 100);
                          const isConflicting = conflictingBlockIds.has(item.id);
                          const isSelected = selectedBlock?.id === item.id;

                          // Stack slightly vertically if conflicting so both bars are clearly visible and clickable
                          const topClass = isConflicting
                            ? idx % 2 === 0
                              ? 'top-0.5 h-10'
                              : 'bottom-0.5 h-10'
                            : 'top-2 bottom-2';

                          const colorClass = isConflicting
                            ? 'bg-rose-600/95 hover:bg-rose-600 text-white border-rose-800 ring-2 ring-rose-300'
                            : item.status === 'IN_PROGRESS'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                            : item.status === 'COMPLETED'
                            ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700';

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedBlockId(item.id)}
                              style={{
                                right: `${rightPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              className={`absolute ${topClass} rounded-xl border px-2.5 py-1 text-right shadow-xs transition-all cursor-pointer flex flex-col justify-center overflow-hidden ${colorClass} ${
                                isSelected ? 'ring-2 ring-amber-400 z-20 scale-[1.01]' : 'z-10'
                              }`}
                              title={`${item.moNumber} | ${item.partName} (${formatHourLabel(item.startHour)} - ${formatHourLabel(item.endHour)})`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold leading-tight">
                                <span className="truncate">{item.moNumber}</span>
                                <span className="px-1 py-0.2 rounded bg-black/20 text-[9px] shrink-0">
                                  {item.operationCode}
                                </span>
                              </div>
                              <div className="text-[10px] font-sans truncate opacity-95 leading-tight mt-0.5">
                                {item.partName}
                              </div>
                              <div className="flex items-center justify-between text-[9px] opacity-85 font-mono mt-0.5">
                                <span>
                                  {formatHourLabel(item.startHour)} تا {formatHourLabel(item.endHour)}
                                </span>
                                <span>{formatNumber(item.quantity)} عدد</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected MO Operation Inspector & Conflict Resolution Panel */}
      {selectedBlock && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-mono text-xs font-bold">
                {selectedBlock.moNumber}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                {selectedBlock.operationCode}: {selectedBlock.operationTitle}
              </span>
              <span className="text-sm font-bold text-slate-900">{selectedBlock.partName}</span>
              {conflictingBlockIds.has(selectedBlock.id) && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  دارای تداخل زمانی روی {selectedBlock.machineName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">ماشین تخصیص‌یافته</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedBlock.machineName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">بازه زمانی شیفت</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {formatHourLabel(selectedBlock.startHour)} الی {formatHourLabel(selectedBlock.endHour)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">تیراژ دستور تولید</span>
                <span className="font-mono font-bold text-emerald-700 mt-0.5 block">
                  {formatNumber(selectedBlock.quantity)} قطعه
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">کد قالب و زمان ستاپ (SMED)</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {selectedBlock.dieCode} ({toPersianDigits(selectedBlock.setupMinutes)}m)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block">قرارداد پشتوانه</span>
                <span className="font-mono font-bold text-indigo-700 mt-0.5 block">
                  {selectedBlock.contractNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Time Shift Controls for Selected MO */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                تنظیم دستی زمان‌بندی روی ماشین:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{selectedBlock.machineCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleAutoResolveConflict(selectedBlock.id, Math.max(7, selectedBlock.startHour - 1))
                }
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                ۱ ساعت جلوتر (-1h)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAutoResolveConflict(selectedBlock.id, Math.min(21, selectedBlock.startHour + 1))
                }
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                ۱ ساعت عقب‌تر (+1h)
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/80">
                <span>پیشنهادهای MRP آماده زمان‌بندی:</span>
                <span className="font-mono font-bold text-slate-800">{toPersianDigits(suggestions.length)} دستور</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
