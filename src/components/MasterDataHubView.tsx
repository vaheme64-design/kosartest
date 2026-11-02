import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Disc,
  ListTree,
  GitBranch,
  Settings2,
  Warehouse,
  Ruler,
  Clock,
  Users,
  Wrench,
  RefreshCw,
  Plus,
  Edit3,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Table2,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  Part,
  Machine,
  Routing,
  DieMold,
  Operator,
  FactoryHall,
  SapcoCoilReceipt,
} from '../types/inventory';
import { ErpColorTheme, ErpLayoutTemplate, COLOR_THEMES } from '../types/theme';
import { PartsView } from './PartsView';
import { RoutingsView } from './RoutingsView';
import { MachinesView } from './MachinesView';
import { toPersianDigits } from '../utils/formatters';

export type MasterSubSection =
  | 'HUB'
  | 'PARTS'
  | 'RAW_MATERIALS'
  | 'BOM'
  | 'ROUTINGS'
  | 'OPERATIONS'
  | 'WAREHOUSES'
  | 'UNITS'
  | 'SHIFTS'
  | 'CUSTOMERS'
  | 'MACHINES'
  | 'DIES'
  | 'ORDERS';

interface RawSheetSpec {
  id: string;
  code: string;
  name: string;
  grade: string;
  thicknessMm: number;
  dimensionsMm: string;
  sheetWeightKg: number;
  unit: string;
  contractsCount: number;
  active: boolean;
}

const INITIAL_RAW_SHEETS: RawSheetSpec[] = [
  {
    id: 'RM-1',
    code: 'SHT-ST12-0.7',
    name: 'ورق سرد ST12 ضخامت ۰/۷',
    grade: 'ST12',
    thicknessMm: 0.7,
    dimensionsMm: '۱,۰۰۰ × ۲,۰۰۰',
    sheetWeightKg: 11.0,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-2',
    code: 'SHT-ST12-0.8',
    name: 'ورق سرد ST12 ضخامت ۰/۸',
    grade: 'ST12',
    thicknessMm: 0.8,
    dimensionsMm: '۱,۰۰۰ × ۲,۰۰۰',
    sheetWeightKg: 12.6,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-3',
    code: 'SHT-ST12-1.0',
    name: 'ورق سرد ST12 ضخامت ۱/۰',
    grade: 'ST12',
    thicknessMm: 1.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 24.5,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-4',
    code: 'SHT-ST12-1.2',
    name: 'ورق سرد ST12 ضخامت ۱/۲',
    grade: 'ST12',
    thicknessMm: 1.2,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 29.4,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-5',
    code: 'SHT-ST12-1.5',
    name: 'ورق سرد ST12 ضخامت ۱/۵',
    grade: 'ST12',
    thicknessMm: 1.5,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 36.8,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-6',
    code: 'SHT-ST12-2.0',
    name: 'ورق سرد ST12 ضخامت ۲/۰',
    grade: 'ST12',
    thicknessMm: 2.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 49.0,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-7',
    code: 'SHT-ST13-1.5',
    name: 'ورق سرد ST13 ضخامت ۱/۵ (کشش)',
    grade: 'ST13',
    thicknessMm: 1.5,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 36.8,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-8',
    code: 'SHT-ST14-0.8',
    name: 'ورق فوق کشش ST14 ضخامت ۰/۸',
    grade: 'ST14',
    thicknessMm: 0.8,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 19.6,
    unit: 'کیلوگرم',
    contractsCount: 2,
    active: true,
  },
];

interface MasterDataHubViewProps {
  layoutTemplate: ErpLayoutTemplate;
  colorTheme: ErpColorTheme;
  parts: Part[];
  routings: Routing[];
  machines: Machine[];
  dies: DieMold[];
  operators: Operator[];
  halls: FactoryHall[];
  coils: SapcoCoilReceipt[];
  onSavePart: (part: Partial<Part>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveRouting: (routing: Partial<Routing>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteRouting: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveMachine: (mch: Partial<Machine>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveDie: (die: Partial<DieMold>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteDie: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveOperator: (op: Partial<Operator>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveHall: (hall: Partial<FactoryHall>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDirectProduce: (partId: string) => void;
  onRefresh: () => Promise<void>;
  onNavigateToInventoryCoils?: () => void;
  onNavigateToPlanning?: () => void;
}

export const MasterDataHubView: React.FC<MasterDataHubViewProps> = ({
  layoutTemplate,
  colorTheme,
  parts,
  routings,
  machines,
  dies,
  operators,
  halls,
  coils,
  onSavePart,
  onSaveRouting,
  onDeleteRouting,
  onSaveMachine,
  onSaveDie,
  onDeleteDie,
  onSaveOperator,
  onSaveHall,
  onDirectProduce,
  onRefresh,
  onNavigateToInventoryCoils,
  onNavigateToPlanning,
}) => {
  const themeMeta = COLOR_THEMES[colorTheme];

  // View mode: 'CARDS_HUB' (Image 1 / ERPNext) vs 'SEGMENTED_TABS' (Image 2)
  const [viewMode, setViewMode] = useState<'CARDS_HUB' | 'SEGMENTED_TABS'>(
    layoutTemplate === 'HUB_WORKSPACE' || layoutTemplate === 'ODOO_ENTERPRISE'
      ? 'CARDS_HUB'
      : 'SEGMENTED_TABS'
  );

  // Sync automatically when user switches global template
  useEffect(() => {
    if (layoutTemplate === 'HUB_WORKSPACE') {
      setViewMode('CARDS_HUB');
      setActiveSection('HUB');
    } else if (layoutTemplate === 'TABBED_WORKBENCH') {
      setViewMode('SEGMENTED_TABS');
      setActiveSection(prev => (prev === 'HUB' ? 'RAW_MATERIALS' : prev));
    }
  }, [layoutTemplate]);

  const [activeSection, setActiveSection] = useState<MasterSubSection>(
    layoutTemplate === 'TABBED_WORKBENCH' ? 'RAW_MATERIALS' : 'HUB'
  );

  const [rawSheets, setRawSheets] = useState<RawSheetSpec[]>(INITIAL_RAW_SHEETS);
  const [sheetSearch, setSheetSearch] = useState('');
  const [editingSheet, setEditingSheet] = useState<RawSheetSpec | null>(null);
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [sheetForm, setSheetForm] = useState<Partial<RawSheetSpec>>({
    code: '',
    name: '',
    grade: 'ST12',
    thicknessMm: 1.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 24.5,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  });

  // Hub Cards exactly matching Uploaded Image 1 (1_1da4846f.jpg)
  const hubCards: {
    id: MasterSubSection;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    countBadge?: string;
  }[] = [
    {
      id: 'PARTS',
      title: 'قطعات (کالا)',
      description: 'تعریف قطعه، واحد پایه، وزن استاندارد، ماده اصلی و مشتری',
      icon: Boxes,
      countBadge: `${toPersianDigits(parts.length)} قطعه`,
    },
    {
      id: 'RAW_MATERIALS',
      title: 'مواد اولیه و کویل',
      description: 'ورق/کویل/رنگ با گرید، ابعاد، وزن واحد و تامین‌کننده',
      icon: Disc,
      countBadge: `${toPersianDigits(rawSheets.length)} گرید ورق`,
    },
    {
      id: 'BOM',
      title: 'سرانه مصرف (BOM)',
      description: 'مصرف ماده اولیه به ازای هر عدد قطعه — ورودی محاسبه کسری',
      icon: ListTree,
      countBadge: 'فرمول ساخت',
    },
    {
      id: 'ROUTINGS',
      title: 'مسیرهای تولید',
      description: 'نسخه‌بندی مسیر و ترتیب عملیات، ماشین و قالب هر مرحله',
      icon: GitBranch,
      countBadge: `${toPersianDigits(routings.length)} مسیر`,
    },
    {
      id: 'OPERATIONS',
      title: 'عملیات تولید',
      description: 'برش، خالی‌بری، خم، پرس، جوش، رنگ و مونتاژ با زمان‌های استاندارد',
      icon: Settings2,
      countBadge: '۷ ایستگاه استاندارد',
    },
    {
      id: 'WAREHOUSES',
      title: 'انبارها و موقعیت‌ها',
      description: 'انبارهای مواد/WIP/محصول/ضایعات و قفسه‌ها',
      icon: Warehouse,
      countBadge: '۵ انبار فعال',
    },
    {
      id: 'UNITS',
      title: 'واحدهای شمارش',
      description: 'عدد، کیلوگرم، متر، مترمربع و برگ',
      icon: Ruler,
      countBadge: '۵ واحد پایه',
    },
    {
      id: 'SHIFTS',
      title: 'شیفت‌های کاری',
      description: 'ساعت شروع و پایان شیفت‌ها — مبنای تقویم ظرفیت',
      icon: Clock,
      countBadge: '۳ شیفت کاری',
    },
    {
      id: 'CUSTOMERS',
      title: 'مشتریان',
      description: 'شرکت‌های خودروساز و اطلاعات تماس',
      icon: Users,
      countBadge: 'ساپکو / سازه‌گستر',
    },
    {
      id: 'MACHINES',
      title: 'ماشین‌آلات و ظرفیت',
      description: 'پرس‌ها و ایستگاه‌ها، توانمندی‌ها، قالب‌ها و ظرفیت',
      icon: Wrench,
      countBadge: `${toPersianDigits(machines.length)} دستگاه`,
    },
  ];

  // Segmented Tabs exactly matching Uploaded Image 2 (2_5080a2ed.jpg)
  const segmentedTabs: { id: MasterSubSection; label: string }[] = [
    { id: 'PARTS', label: 'قطعات' },
    { id: 'RAW_MATERIALS', label: 'ماده اولیه' },
    { id: 'OPERATIONS', label: 'عملیات' },
    { id: 'MACHINES', label: 'ماشین‌آلات' },
    { id: 'DIES', label: 'قالب‌ها' },
    { id: 'ROUTINGS', label: 'مسیر تولید' },
    { id: 'BOM', label: 'سرانه مصرف (BOM)' },
    { id: 'WAREHOUSES', label: 'انبارها' },
    { id: 'CUSTOMERS', label: 'مشتریان' },
    { id: 'ORDERS', label: 'سفارشات' },
  ];

  const handleSaveSheetSpec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetForm.code || !sheetForm.name) return;

    if (editingSheet) {
      setRawSheets(prev =>
        prev.map(item =>
          item.id === editingSheet.id
            ? ({ ...item, ...sheetForm } as RawSheetSpec)
            : item
        )
      );
      setEditingSheet(null);
    } else {
      const newSpec: RawSheetSpec = {
        id: `RM-${Date.now()}`,
        code: sheetForm.code,
        name: sheetForm.name,
        grade: sheetForm.grade || 'ST12',
        thicknessMm: Number(sheetForm.thicknessMm) || 1.0,
        dimensionsMm: sheetForm.dimensionsMm || '۱,۲۵۰ × ۲,۵۰۰',
        sheetWeightKg: Number(sheetForm.sheetWeightKg) || 24.5,
        unit: sheetForm.unit || 'کیلوگرم',
        contractsCount: Number(sheetForm.contractsCount) || 0,
        active: sheetForm.active !== false,
      };
      setRawSheets(prev => [newSpec, ...prev]);
    }
    setIsNewSheetModalOpen(false);
  };

  const filteredRawSheets = rawSheets.filter(
    s =>
      !sheetSearch.trim() ||
      s.code.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      s.grade.toLowerCase().includes(sheetSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Header & View Switcher (Supports both Image 1 Hub & Image 2 Tabbed Workbench) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">اطلاعات پایه</h1>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'CARDS_HUB'
              ? 'کلیه تعاریف پایه سامانه — همه صفحه‌ها جستجوی زنده، خروجی اکسل و ورود گروهی دارند'
              : 'مدیریت قطعات، مواد، عملیات، ماشین‌آلات، قالب‌ها، مسیر تولید، انبارها، مشتریان و سفارشات'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch between Image 1 UX (Card Hub) & Image 2 UX (Tabbed Table) */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setViewMode('CARDS_HUB');
                setActiveSection('HUB');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'CARDS_HUB'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>نمای کارتی (طرح ۱ / ERPNext)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('SEGMENTED_TABS');
                if (activeSection === 'HUB') setActiveSection('RAW_MATERIALS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'SEGMENTED_TABS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-blue-600" />
              <span>نمای تب‌بندی یکپارچه (طرح ۲)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODE 1: WORKSPACE CARD HUB (EXACT UX/UI OF UPLOADED IMAGE 1)
         ===================================================================== */}
      {viewMode === 'CARDS_HUB' && activeSection === 'HUB' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hubCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveSection(card.id)}
                  className="group bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${themeMeta.softBgClass} ${themeMeta.activeTextClass}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[38px]">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {card.countBadge ? (
                      <span className="text-[11px] font-medium text-slate-400">
                        {card.countBadge}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${themeMeta.activeTextClass} group-hover:translate-x-[-2px] transition-transform`}
                    >
                      <span>ورود به بخش</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Back Bar when drilling into a Card from Mode 1 */}
      {viewMode === 'CARDS_HUB' && activeSection !== 'HUB' && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveSection('HUB')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به پیشخوان کارتی اطلاعات پایه (۱۰ بخش)</span>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {hubCards.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveSection(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                  activeSection === c.id
                    ? themeMeta.activeBgClass
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: SEGMENTED HORIZONTAL PILL TABS (EXACT UX/UI OF IMAGE 2)
         ===================================================================== */}
      {viewMode === 'SEGMENTED_TABS' && (
        <div className="flex items-center justify-start overflow-x-auto pb-1">
          <div className="inline-flex items-center bg-slate-100/90 border border-slate-200/80 p-1 rounded-xl gap-1">
            {segmentedTabs.map(tab => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          ACTIVE SUB-SECTION CONTENT
         ===================================================================== */}

      {/* 1. RAW MATERIALS & SHEET SPECS (Matches Table in Image 2: 2_5080a2ed.jpg) */}
      {activeSection === 'RAW_MATERIALS' && (
        <div className="space-y-3">
          {/* Action Row above table matching Image 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingSheet(null);
                  setSheetForm({
                    code: `SHT-ST12-${(rawSheets.length + 1) * 0.2}`,
                    name: '',
                    grade: 'ST12',
                    thicknessMm: 1.0,
                    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
                    sheetWeightKg: 24.5,
                    unit: 'کیلوگرم',
                    contractsCount: 1,
                    active: true,
                  });
                  setIsNewSheetModalOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${themeMeta.buttonPrimaryClass}`}
              >
                <Plus className="w-4 h-4" />
                <span>ماده اولیه جدید</span>
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {toPersianDigits(filteredRawSheets.length)} ماده
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={e => setSheetSearch(e.target.value)}
                  placeholder="جستجوی کد ورق، گرید (ST12/ST13) یا ضخامت..."
                  className="bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 w-64"
                />
              </div>
              {onNavigateToInventoryCoils && (
                <button
                  type="button"
                  onClick={onNavigateToInventoryCoils}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  رهگیری کویل‌پک‌ها در انبار ({toPersianDigits(coils.length)} رول) ←
                </button>
              )}
            </div>
          </div>

          {/* High-Contrast Right-Bordered Table exactly like Image 2 */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs ${themeMeta.borderAccentClass}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">کد ماده</th>
                    <th className="py-3.5 px-4">نام</th>
                    <th className="py-3.5 px-4">گرید</th>
                    <th className="py-3.5 px-4">ضخامت (mm)</th>
                    <th className="py-3.5 px-4">ابعاد ورق (mm)</th>
                    <th className="py-3.5 px-4">وزن ورق (kg)</th>
                    <th className="py-3.5 px-4">واحد</th>
                    <th className="py-3.5 px-4">قراردادها</th>
                    <th className="py-3.5 px-4">وضعیت</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredRawSheets.map(sheet => (
                    <tr
                      key={sheet.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                        {sheet.code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {sheet.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {sheet.grade}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium">
                        {toPersianDigits(sheet.thicknessMm.toString().replace('.', '/'))}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-600">
                        {sheet.dimensionsMm}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-800">
                        {toPersianDigits(sheet.sheetWeightKg.toFixed(1).replace('.', '/'))}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{sheet.unit}</td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-slate-700">
                        {toPersianDigits(sheet.contractsCount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          {sheet.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSheet(sheet);
                            setSheetForm(sheet);
                            setIsNewSheetModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PARTS (قطعات / کالا) */}
      {activeSection === 'PARTS' && (
        <PartsView parts={parts} onSavePart={onSavePart} />
      )}

      {/* 3. ROUTINGS (مسیرهای تولید) */}
      {activeSection === 'ROUTINGS' && (
        <RoutingsView
          routings={routings}
          parts={parts}
          machines={machines}
          dies={dies}
          onSaveRouting={onSaveRouting}
          onDeleteRouting={onDeleteRouting}
          onDirectProduce={onDirectProduce}
        />
      )}

      {/* 4. MACHINES & DIES (ماشین‌آلات و قالب‌ها) */}
      {(activeSection === 'MACHINES' || activeSection === 'DIES') && (
        <MachinesView
          machines={machines}
          dies={dies}
          operators={operators}
          halls={halls}
          parts={parts}
          onSaveMachine={onSaveMachine}
          onSaveDie={onSaveDie}
          onDeleteDie={onDeleteDie}
          onSaveOperator={onSaveOperator}
          onSaveHall={onSaveHall}
        />
      )}

      {/* 5. BOM (سرانه مصرف ماده اولیه به ازای هر قطعه) */}
      {activeSection === 'BOM' && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs ${themeMeta.borderAccentClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                جدول سرانه مصرف مواد اولیه و ورق (BOM)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ارتباط مستقیم هر قطعه خودرویی با گرید ورق، ضخامت، وزن ناخالص برش و ضریب مصرف در محاسبات کسری (MRP)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('PARTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
            >
              ویرایش سرانه مصرف در شناسنامه قطعه
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">کد قطعه محصول</th>
                  <th className="py-3 px-4">نام قطعه خودرویی</th>
                  <th className="py-3 px-4">گرید و جنس ورق مصرفی</th>
                  <th className="py-3 px-4">ضخامت ورق (mm)</th>
                  <th className="py-3 px-4">سرانه مصرف ناخالص (kg)</th>
                  <th className="py-3 px-4">نقطه سفارش قطعه</th>
                  <th className="py-3 px-4">وضعیت BOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts
                  .filter(p => p.category !== 'RAW_MATERIAL')
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {p.materialGrade || 'ST12'}
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {toPersianDigits(p.thicknessMm || 1.2)} میلی‌متر
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold text-emerald-700">
                        {toPersianDigits(p.weightPerUnitKg || 1.45)} کیلوگرم
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {toPersianDigits(p.minStock || 500)} {p.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تایید مهندسی</span>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. OPERATIONS (عملیات تولید استاندارد) */}
      {activeSection === 'OPERATIONS' && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs ${themeMeta.borderAccentClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ایستگاه‌ها و عملیات استاندارد تولید (Standard Operations)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف مراحل استاندارد برش کویل، بلنکینگ، فرم‌دهی، کشش، پانچ، جوشکاری مقاومتی و کنترل کیفیت
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">کد عملیات</th>
                  <th className="py-3 px-4">عنوان عملیات</th>
                  <th className="py-3 px-4">نوع ایستگاه کاری</th>
                  <th className="py-3 px-4">زمان چرخه استاندارد (ثانیه)</th>
                  <th className="py-3 px-4">زمان تعویض قالب (دقیقه)</th>
                  <th className="py-3 px-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { code: 'OP-10', name: 'برش رول و نواربری (Slitting / Cut-to-Length)', station: 'خط برش کویل', cycle: '۴/۵', setup: '۳۵' },
                  { code: 'OP-20', name: 'خالی‌بری و بلنکینگ (Blanking)', station: 'پرس ضربه‌ای ۲۵۰ تن', cycle: '۳/۲', setup: '۲۵' },
                  { code: 'OP-30', name: 'کشش عمیق و فرم‌دهی اولیه (Deep Drawing)', station: 'پرس هیدرولیک ۴۰۰ تن', cycle: '۸/۰', setup: '۴۵' },
                  { code: 'OP-40', name: 'پانچ و دوربری (Piercing & Trimming)', station: 'پرس ضربه‌ای ۱۶۰ تن', cycle: '۴/۰', setup: '۲۰' },
                  { code: 'OP-50', name: 'خم‌کاری و لبهزنی (Bending & Flanging)', station: 'پرس خم ۱۲۰ تن', cycle: '۴/۲', setup: '۲۰' },
                  { code: 'OP-60', name: 'جوشکاری نقطه‌ای و مونتاژ مهره (Spot Projection Weld)', station: 'سالن جوش CO2 و نقطه‌ای', cycle: '۱۲/۰', setup: '۱۵' },
                  { code: 'OP-70', name: 'کنترل کیفیت نهایی و بسته‌بندی پالت ساپکو', station: 'قرنطینه و QC', cycle: '۵/۰', setup: '۱۰' },
                ].map(op => (
                  <tr key={op.code} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{op.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{op.name}</td>
                    <td className="py-3 px-4 text-slate-600">{op.station}</td>
                    <td className="py-3 px-4 tabular-nums font-bold">{op.cycle} ثانیه</td>
                    <td className="py-3 px-4 tabular-nums">{op.setup} دقیقه</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                        فعال
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. WAREHOUSES, UNITS, SHIFTS, CUSTOMERS, ORDERS */}
      {(activeSection === 'WAREHOUSES' ||
        activeSection === 'UNITS' ||
        activeSection === 'SHIFTS' ||
        activeSection === 'CUSTOMERS' ||
        activeSection === 'ORDERS') && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs ${themeMeta.borderAccentClass}`}
        >
          {activeSection === 'WAREHOUSES' && (
            <>
              <h3 className="text-sm font-bold text-slate-900">انبارها و موقعیت‌های قفسه‌بندی کارخانه کوثر</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {[
                  { code: 'WH-RAW-01', name: 'انبار مرکزی ورق، کویل و پیچ و مهره', type: 'مواد اولیه و امانی ساپکو', cap: '۱,۲۰۰ تن ظرفیت کف' },
                  { code: 'WH-WIP-02', name: 'انبار پای خط و قطعات نیمه‌ساخته (WIP)', type: 'ایستگاه‌های میانی پرس و جوش', cap: '۸۵ پالت فلزی' },
                  { code: 'WH-FIN-03', name: 'انبار محصول نهایی آماده ارسال', type: 'محصول سالم تاییدشده QC', cap: '۲۵۰ باکس پالت ساپکو' },
                  { code: 'WH-SCR-04', name: 'انبار ضایعات ورق، کناره و ته‌کلاف', type: 'ضایعات قابل بازیافت / برگشتی', cap: 'تفکیک بر اساس گرید ST12/ST13' },
                  { code: 'WH-QRN-05', name: 'انبار قرنطینه و بازرسی کیفیت', type: 'موقت تا تعیین تکلیف مهندسی کیفیت', cap: '۳۰ پالت قرنطینه' },
                ].map(w => (
                  <div key={w.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{w.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">فعال</span>
                    </div>
                    <div className="text-slate-500">کد انبار: {w.code} — {w.type}</div>
                    <div className="text-slate-700 font-medium">{w.cap}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'UNITS' && (
            <>
              <h3 className="text-sm font-bold text-slate-900">واحدهای شمارش و ضرایب تبدیل مهندسی</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                {[
                  { symbol: 'KG', title: 'کیلوگرم (وزن ورق و کویل)', desc: 'واحد پایه رول ورق و ضایعات' },
                  { symbol: 'PCS', title: 'عدد (قطعه شمارشی)', desc: 'واحد پایه قطعات پرسی، پیچ، مهره و لاستیک' },
                  { symbol: 'SHEET', title: 'برگ ورق (Sheet)', desc: 'قابل تبدیل خودکار به کیلوگرم بر اساس ابعاد و ضخامت' },
                  { symbol: 'COIL', title: 'رول / کلاف (Coil Pack)', desc: 'رهگیری فیزیکی کلاف با شماره کویل‌پک یکتا' },
                  { symbol: 'PALLET', title: 'باکس پالت ساپکو', desc: 'واحد بسته‌بندی و ارسال محصول نهایی' },
                ].map(u => (
                  <div key={u.symbol} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="text-sm font-bold text-emerald-700">{u.symbol}</div>
                    <div className="font-bold text-slate-900">{u.title}</div>
                    <div className="text-slate-500 text-[11px]">{u.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'SHIFTS' && (
            <>
              <h3 className="text-sm font-bold text-slate-900">شیفت‌های کاری و تقویم ظرفیت تولید</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {[
                  { code: 'SHIFT-A', name: 'شیفت صبح (A)', time: '۰۶:۰۰ الی ۱۴:۰۰ (۴۵۰ دقیقه مفید)', status: 'فعال در تقویم MRP' },
                  { code: 'SHIFT-B', name: 'شیفت عصر (B)', time: '۱۴:۰۰ الی ۲۲:۰۰ (۴۵۰ دقیقه مفید)', status: 'فعال در تقویم MRP' },
                  { code: 'SHIFT-C', name: 'شیفت شب (C)', time: '۲۲:۰۰ الی ۰۶:۰۰ (۴۲۰ دقیقه مفید)', status: 'پشتیبان / اضافه‌کاری' },
                ].map(sh => (
                  <div key={sh.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="font-bold text-slate-900">{sh.name}</div>
                    <div className="text-slate-600">{sh.time}</div>
                    <div className="text-emerald-700 font-semibold text-[11px]">{sh.status}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'CUSTOMERS' && (
            <>
              <h3 className="text-sm font-bold text-slate-900">مشتریان و شرکت‌های خودروساز طرف قرارداد</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {[
                  { code: 'CUST-SAPCO', name: 'شرکت طراحی مهندسی و تامین قطعات ایران‌خودرو (ساپکو)', contract: 'قراردادهای ورق امانی و خرید قطعه', phone: '۰۲۱-۴۸۹۰۱۰۰۰' },
                  { code: 'CUST-SAZEH', name: 'شرکت سازه‌گستر سایپا', contract: 'تامین قطعات پرسی بدنه و شاسی', phone: '۰۲۱-۴۴۱۹۶۰۰۰' },
                  { code: 'CUST-BAHMAN', name: 'گروه بهمن (بهمن موتور)', contract: 'تامین براکت‌ها و رام زیر موتور', phone: '۰۲۱-۴۸۰۲۷۰۰۰' },
                ].map(c => (
                  <div key={c.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-slate-600">{c.contract}</div>
                    <div className="text-slate-400 text-[11px]">تلفن: {c.phone}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'ORDERS' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  سفارشات مشتریان و برنامه‌های تحویل (Sales & Delivery Orders)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  سفارشات مشتریان به صورت یکپارچه در موتور برنامه‌ریزی تولید و نیازسنجی مواد (MRP) مدیریت و به قراردادهای ورق متصل می‌شوند.
                </p>
              </div>
              {onNavigateToPlanning && (
                <button
                  type="button"
                  onClick={onNavigateToPlanning}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${themeMeta.buttonPrimaryClass}`}
                >
                  باز کردن سفارشات در ماژول برنامه‌ریزی تولید (MRP) ←
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for Adding / Editing Raw Sheet Spec */}
      {isNewSheetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSheet ? 'ویرایش مشخصات ورق / ماده اولیه' : 'تعریف ماده اولیه و ورق جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSheetModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSheetSpec} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">کد ماده (انگلیسی)</label>
                  <input
                    type="text"
                    required
                    value={sheetForm.code || ''}
                    onChange={e => setSheetForm({ ...sheetForm, code: e.target.value })}
                    placeholder="مثلا SHT-ST12-1.5"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">گرید / جنس ورق</label>
                  <select
                    value={sheetForm.grade || 'ST12'}
                    onChange={e => setSheetForm({ ...sheetForm, grade: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="ST12">ST12 (ورق سرد معمولی)</option>
                    <option value="ST13">ST13 (ورق سرد کششی)</option>
                    <option value="ST14">ST14 (ورق فوق کشش)</option>
                    <option value="ST37">ST37 (ورق گرم ساختمانی)</option>
                    <option value="GALV">گالوانیزه</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نام کامل ماده اولیه</label>
                <input
                  type="text"
                  required
                  value={sheetForm.name || ''}
                  onChange={e => setSheetForm({ ...sheetForm, name: e.target.value })}
                  placeholder="مثلا ورق سرد ST12 ضخامت ۱/۵"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ضخامت (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sheetForm.thicknessMm ?? 1.0}
                    onChange={e =>
                      setSheetForm({ ...sheetForm, thicknessMm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ابعاد ورق (mm)</label>
                  <input
                    type="text"
                    value={sheetForm.dimensionsMm || ''}
                    onChange={e => setSheetForm({ ...sheetForm, dimensionsMm: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وزن هر برگ (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sheetForm.sheetWeightKg ?? 24.5}
                    onChange={e =>
                      setSheetForm({ ...sheetForm, sheetWeightKg: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSheetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  ذخیره مشخصات ورق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
