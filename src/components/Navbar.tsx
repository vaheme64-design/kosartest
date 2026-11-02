import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Factory,
  Database,
  Trash2,
  RefreshCw,
  Search,
  Bell,
  BellRing,
  UserCheck,
  ArrowLeft,
  Compass,
  Zap,
  Boxes,
  Palette,
  Grid,
  LogOut,
  LayoutDashboard,
  ScrollText,
  Hammer,
  GitCommit,
  CalendarDays,
  Cpu,
  Layers,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { Part, UserRoleProfile } from '../types/inventory';
import {
  ErpLayoutTemplate,
  ErpColorTheme,
  COLOR_THEMES,
} from '../types/theme';
import { formatToJalali } from '../utils/jalali';
import { toPersianDigits } from '../utils/formatters';
import { TabKey } from './Sidebar';
import { InventorySubTab } from './inventory/InventoryModuleView';

interface NavbarProps {
  activeTab: TabKey;
  layoutTemplate: ErpLayoutTemplate;
  colorTheme: ErpColorTheme;
  currentUser: UserRoleProfile;
  parts?: Part[];
  coilsCount?: number;
  reorderAlertsCount?: number;
  criticalAlertsCount?: number;
  onRoleChange: (role: UserRoleProfile['role']) => void;
  onNavigate?: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onOpenTemplateModal: () => void;
  onQuickTemplateChange: (tpl: ErpLayoutTemplate) => void;
  onSeedDemo: () => Promise<void>;
  onCleanDemo: () => Promise<void>;
  onOpenErpModal: () => void;
  loading: boolean;
}

interface SearchableModuleItem {
  label: string;
  category: string;
  keywords: string;
  tab: TabKey;
  subTab?: InventorySubTab;
}

const TAB_TITLES: Record<TabKey, string> = {
  dashboard: 'داشبورد مدیریتی و خلاصه وضعیت',
  master_data: 'اطلاعات پایه',
  inventory: 'انبار و موجودی',
  production: 'ثبت روزانه تولید و ضایعات',
  wip: 'قطعات در جریان ساخت (WIP)',
  planning: 'برنامه‌ریزی تولید و نیازسنجی (MRP)',
  machines: 'ماشین‌آلات و ظرفیت',
  sapco: 'مواد امانی SAPCO',
  reports: 'گزارش‌های مدیریتی و OEE',
  settings: 'کاربران و تنظیمات',
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  layoutTemplate,
  colorTheme,
  currentUser,
  parts = [],
  coilsCount = 0,
  reorderAlertsCount = 0,
  criticalAlertsCount = 0,
  onRoleChange,
  onNavigate,
  onOpenTemplateModal,
  onQuickTemplateChange,
  onSeedDemo,
  onCleanDemo,
  onOpenErpModal,
  loading,
}) => {
  const [showConfirmClean, setShowConfirmClean] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; isConfigured: boolean } | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppMatrix, setShowAppMatrix] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const themeMeta = COLOR_THEMES[colorTheme];
  const isDarkHeader =
    layoutTemplate === 'TABBED_WORKBENCH' || layoutTemplate === 'ODOO_ENTERPRISE';

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDbStatus(data.data);
        }
      })
      .catch(() => {
        setDbStatus({ isConnected: false, isConfigured: false });
      });
  }, []);

  // Support Ctrl+K / Cmd+K to focus global module & action search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleLabels: Record<UserRoleProfile['role'], string> = {
    WAREHOUSE_KEEPER: 'مسئول انبار و کنترل موجودی',
    PRODUCTION_MANAGER: 'مدیر تولید و برنامه‌ریزی',
    LINE_SUPERVISOR: 'سرپرست سالن تولید و پرس',
    QC_INSPECTOR: 'بازرس کنترل کیفیت (QC)',
    ADMIN: 'مدیر سیستم (دسترسی کامل)',
  };

  const allModulesAndSubModules: SearchableModuleItem[] = [
    { label: 'داشبورد و خلاصه وضعیت روزانه', category: 'ماژول اصلی', keywords: 'داشبورد خانه میز کار خلاصه', tab: 'dashboard' },
    { label: 'اطلاعات پایه (قطعات، ورق، BOM، مسیر تولید، شیفت‌ها)', category: 'ماژول اصلی', keywords: 'اطلاعات پایه کالا قطعه ورق ضخامت جنس مسیر ساخت فرمول bom حداقل موجودی', tab: 'master_data' },
    { label: 'پیشخوان و مرکز فرماندهی انبار', category: 'زیرماژول انبار', keywords: 'انبار پیشخوان موجودی', tab: 'inventory', subTab: 'DASHBOARD' },
    { label: 'جستجو و استعلام موجودی انبار', category: 'زیرماژول انبار', keywords: 'استعلام موجودی فیلتر ضخامت جنس ورق', tab: 'inventory', subTab: 'INQUIRY' },
    { label: 'مدیریت رول‌های ورق و کویل‌پک', category: 'زیرماژول انبار', keywords: 'رول ورق کویل پک کلاف برش', tab: 'inventory', subTab: 'COILS' },
    { label: 'مدیریت قراردادها و سهمیه مواد', category: 'زیرماژول انبار', keywords: 'قرارداد ساپکو مشتری امانی سهمیه', tab: 'inventory', subTab: 'CONTRACTS' },
    { label: 'هشدارهای نقطه سفارش و کسری موجودی', category: 'زیرماژول انبار', keywords: 'هشدار کسری نقطه سفارش حداقل اطمینان شارژ reorder alert', tab: 'inventory', subTab: 'ALERTS' },
    { label: 'اسناد ورود و خروج انبار (کاردکس)', category: 'زیرماژول انبار', keywords: 'کاردکس اسناد گردش انبار ابطال', tab: 'inventory', subTab: 'MOVEMENT' },
    { label: 'ورود و خروج اکسل (CSV) با راهنما', category: 'زیرماژول انبار', keywords: 'اکسل ورود اطلاعات خروجی csv راهنما', tab: 'inventory', subTab: 'IMPORT_EXPORT' },
    { label: 'گزارش‌ساز سفارشی انبار', category: 'زیرماژول انبار', keywords: 'گزارش سفارشی شخصی سازی ستون کویل', tab: 'inventory', subTab: 'CUSTOM_REPORTS' },
    { label: 'برنامه‌ریزی تولید و نیازسنجی مواد (MRP)', category: 'ماژول برنامه‌ریزی', keywords: 'برنامه ریزی تولید mrp سفارشات مشتری تخصیص ماشین آلات', tab: 'planning' },
    { label: 'ثبت روزانه تولید، مصرف و ضایعات', category: 'ماژول تولید', keywords: 'ثبت تولید مصرف ضایعات آمار روزانه پرسکاری', tab: 'production' },
    { label: 'قطعات در جریان ساخت (WIP) و ایستگاه‌ها', category: 'ماژول تولید', keywords: 'wip کار در جریان ایستگاه دستور کار انتقال بین مراحل', tab: 'wip' },
    { label: 'ماشین‌آلات و ظرفیت (پرس‌ها و قالب‌ها)', category: 'اطلاعات پایه', keywords: 'ماشین آلات دستگاه پرس قالب سنبه ماتریس اپراتور سالن', tab: 'machines' },
    { label: 'مواد امانی SAPCO', category: 'ماژول امانی', keywords: 'مواد ساپکو امانی رول کویل', tab: 'sapco' },
    { label: 'گزارش‌های جامع مدیریتی و OEE', category: 'گزارش‌ها', keywords: 'گزارش مدیریتی بهای تمام شده راندمان oee ضایعات تحلیل', tab: 'reports' },
    { label: 'مدیریت کاربران و تنظیمات', category: 'تنظیمات', keywords: 'کاربران نقش دسترسی تنظیمات', tab: 'settings' },
  ];

  const appMatrixItems: {
    tab: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    { tab: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, color: 'bg-emerald-600' },
    { tab: 'master_data', label: 'اطلاعات پایه', icon: ScrollText, color: 'bg-blue-600' },
    { tab: 'inventory', label: 'انبار و موجودی', icon: Boxes, color: 'bg-teal-600' },
    { tab: 'production', label: 'تولید روزانه', icon: Hammer, color: 'bg-amber-600' },
    { tab: 'wip', label: 'کار در جریان (WIP)', icon: GitCommit, color: 'bg-purple-600' },
    { tab: 'planning', label: 'برنامه‌ریزی (MRP)', icon: CalendarDays, color: 'bg-indigo-600' },
    { tab: 'machines', label: 'ماشین‌آلات و ظرفیت', icon: Cpu, color: 'bg-cyan-600' },
    { tab: 'sapco', label: 'مواد SAPCO', icon: Layers, color: 'bg-rose-600' },
    { tab: 'reports', label: 'گزارش‌ها', icon: FileSpreadsheet, color: 'bg-slate-700' },
    { tab: 'settings', label: 'کاربران و تنظیمات', icon: Settings, color: 'bg-slate-800' },
  ];

  const quickActions = [
    { label: 'ثبت رسید کالا / ورود رول ورق جدید', tab: 'inventory' as TabKey, subTab: 'DASHBOARD' as InventorySubTab, modal: 'RECEIPT' as const },
    { label: 'صدور حواله خروج ورق و قطعه به خط تولید', tab: 'inventory' as TabKey, subTab: 'DASHBOARD' as InventorySubTab, modal: 'ISSUE' as const },
    { label: 'ثبت برگشت ورق / ته‌کلاف از خط تولید به انبار', tab: 'inventory' as TabKey, subTab: 'DASHBOARD' as InventorySubTab, modal: 'RETURN' as const },
    { label: 'انتقال کالا بین انبارهای کارخانه', tab: 'inventory' as TabKey, subTab: 'DASHBOARD' as InventorySubTab, modal: 'TRANSFER' as const },
  ];

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return {
        modules: allModulesAndSubModules.slice(0, 6),
        actions: quickActions,
        matchedParts: [],
      };
    }

    const modules = allModulesAndSubModules.filter(
      m =>
        m.label.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.keywords.toLowerCase().includes(q)
    );
    const actions = quickActions.filter(a => a.label.toLowerCase().includes(q));
    const matchedParts = parts
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.materialGrade && p.materialGrade.toLowerCase().includes(q))
      )
      .slice(0, 5);
    return { modules, actions, matchedParts };
  }, [globalSearch, parts]);

  const now = new Date();
  const timeStr = toPersianDigits(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  );
  const jalaliNumeric = formatToJalali(now);

  return (
    <header
      style={
        isDarkHeader
          ? {
              backgroundColor:
                layoutTemplate === 'ODOO_ENTERPRISE'
                  ? themeMeta.headerDarkHex
                  : '#0f172a',
            }
          : undefined
      }
      className={`${
        isDarkHeader
          ? 'text-white border-b border-slate-800'
          : 'bg-white text-slate-900 border-b border-slate-200'
      } sticky top-0 z-40 px-4 lg:px-6 py-2.5 transition-colors`}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* RIGHT SIDE: App Matrix + Brand / Active Page Title */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            {/* Odoo-style 9-dots App Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAppMatrix(!showAppMatrix)}
                title="ماتریس سریع برنامه‌ها و ماژول‌ها (سبک Odoo)"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkHeader
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>

              {showAppMatrix && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="text-xs font-bold text-slate-800">
                      ماتریس ماژول‌های KPIMS (سبک Odoo)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAppMatrix(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {appMatrixItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.tab}
                          type="button"
                          onClick={() => {
                            if (onNavigate) onNavigate(item.tab);
                            setShowAppMatrix(false);
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 border transition-all cursor-pointer ${
                            activeTab === item.tab
                              ? 'border-emerald-500 bg-emerald-50/40'
                              : 'border-transparent'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl ${item.color} text-white flex items-center justify-center shadow-xs`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* In Template 1 (HUB_WORKSPACE - Image 1), the KPIMS brand is inside the dark right sidebar, so the white top bar cleanly shows the current module title */}
            {layoutTemplate === 'HUB_WORKSPACE' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-bold text-slate-900">
                  {TAB_TITLES[activeTab]}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                  style={{ backgroundColor: themeMeta.primaryHex }}
                >
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isDarkHeader ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      KPIMS
                    </span>
                    <span className={isDarkHeader ? 'text-slate-600' : 'text-slate-300'}>|</span>
                    <span
                      className={`text-xs font-medium ${
                        isDarkHeader ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      سامانه مدیریت تولید و موجودی کوثر
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Global Search for Modules, Sub-Modules, Quick Actions & Parts */}
        <div className="relative w-full lg:max-w-md">
          <Search
            className={`w-4 h-4 absolute right-3 top-2.5 pointer-events-none ${
              isDarkHeader ? 'text-slate-400' : 'text-slate-400'
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="جستجوی ماژول، زیرماژول (کویل، کسری، MRP)، عملیات یا قطعه..."
            className={`w-full rounded-xl pr-9 pl-14 py-1.5 text-xs focus:outline-none transition-colors ${
              isDarkHeader
                ? 'bg-white/10 border border-white/15 text-white placeholder:text-slate-300 focus:bg-white focus:text-slate-900'
                : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-slate-900'
            }`}
          />
          <span
            className={`absolute left-2.5 top-2 px-1.5 py-0.2 rounded text-[10px] font-medium pointer-events-none ${
              isDarkHeader
                ? 'bg-white/15 text-slate-200'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            Ctrl+K
          </span>

          {searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-50 text-xs space-y-2.5 max-h-96 overflow-y-auto text-slate-900">
              {/* 1. Modules & Sub-Modules */}
              {searchResults.modules.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Compass className="w-3 h-3" />
                    <span>ماژول‌ها و زیرماژول‌های سیستم:</span>
                  </div>
                  <div className="space-y-0.5">
                    {searchResults.modules.map((mod, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          if (onNavigate) onNavigate(mod.tab, mod.subTab);
                          setGlobalSearch('');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-800 font-medium cursor-pointer"
                      >
                        <span>{mod.label}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                          {mod.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Quick Operational Actions */}
              {searchResults.actions.length > 0 && (
                <div className="border-t border-slate-100 pt-1.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>عملیات و فرم‌های سریع:</span>
                  </div>
                  <div className="space-y-0.5">
                    {searchResults.actions.map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          if (onNavigate) onNavigate(act.tab, act.subTab, act.modal);
                          setGlobalSearch('');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-emerald-50/60 rounded-lg text-slate-800 font-medium cursor-pointer"
                      >
                        <span>{act.label}</span>
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Matched Parts */}
              {searchResults.matchedParts.length > 0 && (
                <div className="border-t border-slate-100 pt-1.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Boxes className="w-3 h-3" />
                    <span>کالاها و ورق‌های منطبق:</span>
                  </div>
                  <div className="space-y-0.5">
                    {searchResults.matchedParts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          if (onNavigate) onNavigate('inventory', 'INQUIRY');
                          setGlobalSearch('');
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 cursor-pointer"
                      >
                        <span>{p.name}</span>
                        <span className="text-[11px] text-slate-500 font-semibold">{p.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.modules.length === 0 &&
                searchResults.actions.length === 0 &&
                searchResults.matchedParts.length === 0 && (
                  <div className="py-4 text-center text-slate-400">
                    موردی با عبارت «{globalSearch}» یافت نشد.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* LEFT SIDE: Template Switcher, Reorder Alert Pill, Role, Clock/Date */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Quick 1-Click Template Pills + Full Modal Trigger */}
          <div
            className={`inline-flex items-center p-0.5 rounded-xl border ${
              isDarkHeader
                ? 'bg-white/10 border-white/15'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => onQuickTemplateChange('HUB_WORKSPACE')}
              title="قالب ۱: فضای کاری کارتی (مطابق تصویر ۱ و ERPNext)"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                layoutTemplate === 'HUB_WORKSPACE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : isDarkHeader
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قالب ۱ (کارتی)
            </button>
            <button
              type="button"
              onClick={() => onQuickTemplateChange('TABBED_WORKBENCH')}
              title="قالب ۲: میزکار تب‌بندی یکپارچه (مطابق تصویر ۲)"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                layoutTemplate === 'TABBED_WORKBENCH'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : isDarkHeader
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قالب ۲ (تب‌بندی)
            </button>
            <button
              type="button"
              onClick={() => onQuickTemplateChange('ODOO_ENTERPRISE')}
              title="قالب ۳: سبک Odoo Enterprise"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                layoutTemplate === 'ODOO_ENTERPRISE'
                  ? 'bg-[#017E84] text-white shadow-2xs'
                  : isDarkHeader
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قالب Odoo
            </button>
            <button
              type="button"
              onClick={onOpenTemplateModal}
              title="باز کردن تنظیمات کامل قالب‌ها، رنگ‌ها و تحلیل UX/UI"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                isDarkHeader
                  ? 'text-emerald-300 hover:bg-white/10'
                  : 'text-emerald-700 hover:bg-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>رنگ و قالب‌ها</span>
            </button>
          </div>

          {/* Top Reorder Point Alert Pill -> Navigates directly to Inventory ALERTS page */}
          {reorderAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('inventory', 'ALERTS');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                criticalAlertsCount > 0
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
              title="مشاهده فهرست اقلام زیر نقطه سفارش و کسری موجودی"
            >
              <BellRing
                className={`w-3.5 h-3.5 ${
                  criticalAlertsCount > 0 ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <span>{toPersianDigits(reorderAlertsCount)} کسری نقطه سفارش</span>
            </button>
          )}

          {/* Role Workspace Selector */}
          <div
            className={`hidden xl:flex items-center rounded-xl px-2.5 py-1.5 border ${
              isDarkHeader
                ? 'bg-white/10 border-white/15 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <UserCheck
              className={`w-3.5 h-3.5 ml-1.5 shrink-0 ${
                isDarkHeader ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
            <select
              value={currentUser.role}
              onChange={e => onRoleChange(e.target.value as UserRoleProfile['role'])}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              {Object.entries(roleLabels).map(([roleKey, label]) => (
                <option key={roleKey} value={roleKey} className="bg-white text-slate-900">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer relative ${
                isDarkHeader
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="اعلان‌ها و هشدارهای عملیاتی"
            >
              <Bell className="w-4 h-4" />
              {reorderAlertsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 top-full mt-1.5 w-80 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-lg p-3.5 z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">اعلان‌ها و هشدارهای کارخانه</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  {reorderAlertsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigate) onNavigate('inventory', 'ALERTS');
                        setShowNotifications(false);
                      }}
                      className="w-full text-right p-2.5 bg-rose-50/70 hover:bg-rose-100/70 rounded-lg border border-rose-200 cursor-pointer block"
                    >
                      <div className="font-bold text-rose-900">
                        هشدار نقطه سفارش ({toPersianDigits(reorderAlertsCount)} قلم کالا)
                      </div>
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        برای مشاهده جدول کامل کسری‌ها و ثبت رسید جبرانی کلیک کنید ←
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('inventory', 'COILS');
                      setShowNotifications(false);
                    }}
                    className="w-full text-right p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200/70 cursor-pointer block"
                  >
                    <div className="font-semibold text-slate-800">وضعیت رول‌های ورق و کویل‌پک</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {toPersianDigits(coilsCount)} رول فیزیکی در انبار ثبت شده و آماده رهگیری قرارداد است.
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Database & Demo Controls */}
          <button
            onClick={onOpenErpModal}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-xl transition-colors cursor-pointer ${
              isDarkHeader
                ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="مشاهده وضعیت پایگاه داده و تنظیمات ERP"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">
              {dbStatus?.isConnected ? 'PostgreSQL' : 'پایگاه داده'}
            </span>
          </button>

          <button
            onClick={onSeedDemo}
            disabled={loading}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
              isDarkHeader
                ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="بازنشانی اطلاعات نمونه کارخانه"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>داده نمونه</span>
          </button>

          {/* Clean Demo Data Button */}
          {!showConfirmClean ? (
            <button
              onClick={() => setShowConfirmClean(true)}
              disabled={loading}
              className={`p-1.5 border rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                isDarkHeader
                  ? 'bg-white/10 hover:bg-rose-500/20 text-slate-300 border-white/15'
                  : 'text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border-slate-200'
              }`}
              title="پاکسازی داده‌های نمونه"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-xs text-slate-900">
              <span className="text-rose-700 text-[11px]">حذف نمونه؟</span>
              <button
                onClick={async () => {
                  await onCleanDemo();
                  setShowConfirmClean(false);
                }}
                className="text-rose-700 hover:text-rose-900 font-bold px-1.5 py-0.5 rounded text-[11px] cursor-pointer"
              >
                بله
              </button>
              <button
                onClick={() => setShowConfirmClean(false)}
                className="text-slate-600 hover:text-slate-900 px-1.5 py-0.5 text-[11px] cursor-pointer"
              >
                لغو
              </button>
            </div>
          )}

          {/* Clock / Date (Image 1 style) or User / Exit (Image 2 style) */}
          {layoutTemplate === 'HUB_WORKSPACE' ? (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium pl-1 tabular-nums">
              <span>{jalaliNumeric}</span>
              <span className="text-slate-300">|</span>
              <span>{timeStr}</span>
            </div>
          ) : (
            isDarkHeader && (
              <div className="hidden md:flex items-center gap-3 pr-2 border-r border-slate-700 text-xs">
                <div className="text-left leading-tight">
                  <div className="font-bold text-white">مدیر سیستم</div>
                  <div className="text-[10px] text-slate-400">مدیر سیستم</div>
                </div>
                <span className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
};
