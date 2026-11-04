import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Layers,
  Boxes,
  Hammer,
  GitCommit,
  CalendarDays,
  Cpu,
  ScrollText,
  FileSpreadsheet,
  Settings,
  Search,
  FileSignature,
  Upload,
  PanelRightClose,
  PanelRightOpen,
  Filter,
  BellRing,
  FileText,
  ChevronDown,
  ChevronLeft,
  X,
  Truck,
  Palette,
  Sparkles,
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';
import {
  ErpLayoutTemplate,
  ErpColorTheme,
  COLOR_THEMES,
} from '../types/theme';
import { InventorySubTab } from './inventory/InventoryModuleView';
import { toPersianDigits } from '../utils/formatters';

export type TabKey =
  | 'dashboard'
  | 'master_data'
  | 'inventory'
  | 'production'
  | 'wip'
  | 'planning'
  | 'machines'
  | 'sapco'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: TabKey;
  activeInventorySubTab?: InventorySubTab;
  layoutTemplate: ErpLayoutTemplate;
  colorTheme: ErpColorTheme;
  onTabChange: (tab: TabKey, inventorySubTab?: InventorySubTab) => void;
  onOpenTemplateModal?: () => void;
  onOpenAiAssistant?: () => void;
  currentRole: UserRoleProfile['role'];
  partsCount: number;
  txCount: number;
  plansCount: number;
  coilsCount: number;
  reorderAlertsCount?: number;
}

interface SubModuleLink {
  id: string;
  tab: TabKey;
  inventorySubTab?: InventorySubTab;
  label: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeHighlight?: boolean;
}

interface NavGroup {
  id: string;
  groupTitle: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: {
    id: string;
    tab: TabKey;
    inventorySubTab?: InventorySubTab;
    label: string;
    flatLabel: string;
    keywords: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: string;
    badgeHighlight?: boolean;
    roles: Array<UserRoleProfile['role']>;
    subModules?: SubModuleLink[];
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeInventorySubTab,
  layoutTemplate,
  colorTheme,
  onTabChange,
  onOpenTemplateModal,
  onOpenAiAssistant,
  currentRole,
  partsCount,
  txCount,
  plansCount,
  coilsCount,
  reorderAlertsCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showAllForRole, setShowAllForRole] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    core: true,
    planning_prod: true,
    master_reports: true,
  });

  const themeMeta = COLOR_THEMES[colorTheme];
  const isDarkSidebar = false;
  const isFlatListMode = true;

  const inventorySubModules: SubModuleLink[] = useMemo(
    () => [
      {
        id: 'sub-inv-dashboard',
        tab: 'inventory',
        inventorySubTab: 'DASHBOARD',
        label: 'پیشخوان و عملیات سریع انبار',
        keywords: 'پیشخوان انبار رسید حواله برگشت انتقال',
        icon: Boxes,
      },
      {
        id: 'sub-inv-inquiry',
        tab: 'inventory',
        inventorySubTab: 'INQUIRY',
        label: 'جستجو و استعلام موجودی',
        keywords: 'استعلام موجودی فیلتر ضخامت جنس ورق کویل پک',
        icon: Search,
      },
      {
        id: 'sub-inv-coils',
        tab: 'inventory',
        inventorySubTab: 'COILS',
        label: 'رول‌های ورق و کویل‌پک',
        keywords: 'رول ورق کویل پک کلاف برش برگشت از خط',
        icon: Layers,
        badge: coilsCount > 0 ? toPersianDigits(coilsCount) : undefined,
      },
      {
        id: 'sub-inv-contracts',
        tab: 'inventory',
        inventorySubTab: 'CONTRACTS',
        label: 'قراردادها و سهمیه مواد',
        keywords: 'قرارداد ساپکو مشتری امانی سهمیه تخصیص',
        icon: FileSignature,
      },
      {
        id: 'sub-inv-alerts',
        tab: 'inventory',
        inventorySubTab: 'ALERTS',
        label: 'هشدار نقطه سفارش و کسری‌ها',
        keywords: 'هشدار کسری نقطه سفارش حداقل موجودی اطمینان شارژ',
        icon: BellRing,
        badge: reorderAlertsCount > 0 ? toPersianDigits(reorderAlertsCount) : undefined,
        badgeHighlight: reorderAlertsCount > 0,
      },
      {
        id: 'sub-inv-movement',
        tab: 'inventory',
        inventorySubTab: 'MOVEMENT',
        label: 'اسناد ورود و خروج (کاردکس)',
        keywords: 'اسناد انبار کاردکس گردش ابطال رسید حواله',
        icon: FileText,
      },
      {
        id: 'sub-inv-excel',
        tab: 'inventory',
        inventorySubTab: 'IMPORT_EXPORT',
        label: 'ورود و خروج اکسل (CSV)',
        keywords: 'اکسل ورود اطلاعات خروجی فایل راهنما csv',
        icon: Upload,
      },
      {
        id: 'sub-inv-custom-reports',
        tab: 'inventory',
        inventorySubTab: 'CUSTOM_REPORTS',
        label: 'گزارش‌ساز سفارشی انبار',
        keywords: 'گزارش سفارشی شخصی سازی ستون کویل',
        icon: FileSpreadsheet,
      },
    ],
    [coilsCount, reorderAlertsCount]
  );

  // Ordered flat 10 modules exactly matching Uploaded Images 1 & 2
  const flatTenItems = useMemo(
    () => [
      {
        id: 'flat-dashboard',
        tab: 'dashboard' as TabKey,
        label: 'داشبورد',
        flatLabel: 'داشبورد',
        keywords: 'داشبورد خانه پیشخوان خلاصه وضعیت روزانه',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-master',
        tab: 'master_data' as TabKey,
        label: 'اطلاعات پایه',
        flatLabel: 'اطلاعات پایه',
        keywords: 'اطلاعات پایه کالا قطعه ضخامت جنس ورق مسیر ساخت فرمول bom حداقل موجودی شیفت انبار مشتری',
        icon: ScrollText,
        count: toPersianDigits(partsCount),
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-inventory',
        tab: 'inventory' as TabKey,
        inventorySubTab: 'DASHBOARD' as InventorySubTab,
        label: layoutTemplate === 'TABBED_WORKBENCH' ? 'انبار و موجودی' : 'انبار',
        flatLabel: layoutTemplate === 'TABBED_WORKBENCH' ? 'انبار و موجودی' : 'انبار',
        keywords: 'انبار موجودی ورق رول کویل پک قرارداد کاردکس اکسل کسری نقطه سفارش',
        icon: Boxes,
        count: coilsCount > 0 ? `${toPersianDigits(coilsCount)} رول` : undefined,
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
        subModules: inventorySubModules,
      },
      {
        id: 'flat-production',
        tab: 'production' as TabKey,
        label: 'تولید',
        flatLabel: 'تولید',
        keywords: 'ثبت تولید مصرف ضایعات آمار روزانه شیفت پرسکاری',
        icon: Hammer,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-wip',
        tab: 'wip' as TabKey,
        label: layoutTemplate === 'TABBED_WORKBENCH' ? 'کار در جریان (WIP)' : 'قطعات در جریان ساخت',
        flatLabel: layoutTemplate === 'TABBED_WORKBENCH' ? 'کار در جریان (WIP)' : 'قطعات در جریان ساخت',
        keywords: 'کار در جریان ساخت wip ایستگاه دستور کار انتقال بین مراحل',
        icon: GitCommit,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-planning',
        tab: 'planning' as TabKey,
        label: 'برنامه‌ریزی تولید',
        flatLabel: 'برنامه‌ریزی تولید',
        keywords: 'برنامه ریزی تولید نیازسنجی مواد سفارشات مشتری ساپکو تخصیص ماشین آلات mrp',
        icon: CalendarDays,
        count: plansCount > 0 ? toPersianDigits(plansCount) : undefined,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-machines',
        tab: 'machines' as TabKey,
        label: 'ماشین‌آلات و ظرفیت',
        flatLabel: 'ماشین‌آلات و ظرفیت',
        keywords: 'ماشین آلات دستگاه پرس قالب سنبه ماتریس اپراتور سالن ظرفیت',
        icon: Cpu,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-sapco',
        tab: 'sapco' as TabKey,
        label: 'مواد SAPCO',
        flatLabel: 'مواد SAPCO',
        keywords: 'مواد ساپکو امانی رول کویل',
        icon: Truck,
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-reports',
        tab: 'reports' as TabKey,
        label: layoutTemplate === 'TABBED_WORKBENCH' ? 'گزارشات' : 'گزارش‌ها',
        flatLabel: layoutTemplate === 'TABBED_WORKBENCH' ? 'گزارشات' : 'گزارش‌ها',
        keywords: 'گزارش مدیریتی بهای تمام شده راندمان oee ضایعات تحلیل',
        icon: FileSpreadsheet,
        count: txCount > 0 ? toPersianDigits(txCount) : undefined,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-settings',
        tab: 'settings' as TabKey,
        label: 'کاربران و تنظیمات',
        flatLabel: 'کاربران و تنظیمات',
        keywords: 'کاربران نقش دسترسی امنیت تنظیمات',
        icon: Settings,
        roles: ['ADMIN'] as UserRoleProfile['role'][],
      },
    ],
    [layoutTemplate, partsCount, coilsCount, plansCount, txCount, inventorySubModules]
  );

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'core',
        groupTitle: 'هسته اصلی: موجودی و انبار',
        defaultOpen: true,
        items: [
          flatTenItems[0], // داشبورد
          flatTenItems[2], // انبار
        ],
      },
      {
        id: 'planning_prod',
        groupTitle: 'برنامه‌ریزی و اجرای تولید',
        defaultOpen: true,
        items: [
          flatTenItems[5], // برنامه‌ریزی تولید
          flatTenItems[3], // تولید
          flatTenItems[4], // WIP
        ],
      },
      {
        id: 'master_reports',
        groupTitle: 'اطلاعات پایه، منابع و گزارش‌ها',
        collapsible: true,
        defaultOpen: true,
        items: [
          flatTenItems[1], // اطلاعات پایه
          flatTenItems[6], // ماشین‌آلات
          flatTenItems[7], // مواد SAPCO
          flatTenItems[8], // گزارش‌ها
          flatTenItems[9], // تنظیمات
        ],
      },
    ],
    [flatTenItems]
  );

  const isRoleFiltered = currentRole !== 'ADMIN' && !showAllForRole;
  const searchNormalized = moduleSearch.trim().toLowerCase();

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside
      style={
        isDarkSidebar
          ? { backgroundColor: themeMeta.sidebarDarkHex }
          : undefined
      }
      className={`${
        collapsed ? 'w-full md:w-18' : 'w-full md:w-64 lg:w-68'
      } ${
        isDarkSidebar
          ? 'text-slate-200 border-b md:border-b-0 md:border-l border-slate-800'
          : 'bg-white text-slate-800 border-b md:border-b-0 md:border-l border-slate-200'
      } p-3.5 shrink-0 flex flex-col justify-between transition-all select-none`}
    >
      <div className="space-y-3.5">
        {/* In Template 1 (HUB_WORKSPACE - Image 1), render the KPIMS + KP emerald logo header at the top of the dark sidebar */}
        {isDarkSidebar ? (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: themeMeta.primaryHex }}
                >
                  KP
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">KPIMS</div>
                  <div className="text-[11px] text-slate-400">سامانه تولید و موجودی کوثر</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1.5">
            {!collapsed && (
              <span className="text-[11px] font-bold text-slate-500">
                {layoutTemplate === 'TABBED_WORKBENCH' ? 'منوی اصلی سامانه' : 'دسترسی سریع ماژول‌ها'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Instant Module & Sub-Module Search Input */}
        {!collapsed && (
          <div className="relative">
            <Search
              className={`w-3.5 h-3.5 absolute right-3 top-2.5 pointer-events-none ${
                isDarkSidebar ? 'text-slate-400' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="جستجوی ماژول یا زیرماژول..."
              className={`w-full rounded-xl pr-8 pl-7 py-1.5 text-xs focus:outline-none transition-colors ${
                isDarkSidebar
                  ? 'bg-white/8 border border-white/10 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400'
                  : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {moduleSearch && (
              <button
                type="button"
                onClick={() => setModuleSearch('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* AI Assistant Button in Sidebar */}
        {onOpenAiAssistant && (
          <button
            type="button"
            onClick={onOpenAiAssistant}
            title="دستیار صوتی و متنی هوش مصنوعی کارخانه (کلید میانبر Ctrl + Space)"
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDarkSidebar
                ? 'bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-emerald-900/50 hover:from-indigo-800/80 hover:to-emerald-800/80 text-white border border-indigo-500/30 shadow-xs'
                : 'bg-gradient-to-r from-indigo-50 via-purple-50/50 to-emerald-50 hover:from-indigo-100 hover:to-emerald-100 text-indigo-950 border border-indigo-200/80 shadow-xs'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
              {!collapsed && <span>دستیار هوش مصنوعی</span>}
            </span>
            {!collapsed && (
              <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] font-mono text-slate-500">
                Ctrl+Space
              </span>
            )}
          </button>
        )}

        {/* =================================================================
            FLAT 10-MODULE NAVIGATION (IMAGE 1 & IMAGE 2 STYLE)
           ================================================================= */}
        {isFlatListMode && !searchNormalized ? (
          <nav className="space-y-1">
            {flatTenItems.map(item => {
              const isMainActive = activeTab === item.tab;
              const Icon = item.icon;
              const showSubModules =
                !collapsed &&
                item.subModules &&
                item.subModules.length > 0 &&
                activeTab === item.tab;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onTabChange(item.tab, item.inventorySubTab)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                    } py-2.5 rounded-lg text-xs transition-all cursor-pointer text-right ${
                      isMainActive
                        ? 'bg-orange-50/90 text-orange-950 font-bold border border-orange-200/70 shadow-2xs'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 font-medium border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isMainActive ? 'text-orange-600' : 'text-slate-500'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.tab === 'inventory' && reorderAlertsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 tabular-nums">
                        {toPersianDigits(reorderAlertsCount)}
                      </span>
                    )}
                  </button>

                  {/* Sub-Modules under Inventory when active */}
                  {showSubModules && (
                    <div
                      className={`mr-3.5 pr-2.5 border-r space-y-0.5 py-1 ${
                        isDarkSidebar ? 'border-slate-700' : 'border-slate-200'
                      }`}
                    >
                      {item.subModules?.map(sub => {
                        const isSubActive =
                          activeTab === sub.tab &&
                          activeInventorySubTab === sub.inventorySubTab;
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onTabChange(sub.tab, sub.inventorySubTab)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-right ${
                              isSubActive
                                ? isDarkSidebar
                                  ? 'bg-white/15 text-white font-bold'
                                  : 'bg-emerald-50 text-emerald-900 font-bold'
                                : isDarkSidebar
                                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.badge && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                                  sub.badgeHighlight
                                    ? 'bg-amber-400 text-slate-950'
                                    : isDarkSidebar
                                    ? 'bg-white/10 text-slate-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        ) : (
          /* =================================================================
              GROUPED NAVIGATION OR SEARCH RESULTS
             ================================================================= */
          <div className="space-y-3">
            {navGroups.map(group => {
              const roleItems = isRoleFiltered
                ? group.items.filter(item => item.roles.includes(currentRole))
                : group.items;

              const filteredItems = roleItems
                .map(item => {
                  if (!searchNormalized) return { ...item, matchedSubs: item.subModules || [] };

                  const itemMatches =
                    item.label.toLowerCase().includes(searchNormalized) ||
                    item.keywords.toLowerCase().includes(searchNormalized);

                  const matchedSubs = (item.subModules || []).filter(
                    sub =>
                      sub.label.toLowerCase().includes(searchNormalized) ||
                      sub.keywords.toLowerCase().includes(searchNormalized)
                  );

                  if (itemMatches || matchedSubs.length > 0) {
                    return {
                      ...item,
                      matchedSubs: matchedSubs.length > 0 ? matchedSubs : item.subModules || [],
                    };
                  }
                  return null;
                })
                .filter(Boolean) as Array<
                (typeof group.items)[number] & { matchedSubs: SubModuleLink[] }
              >;

              if (filteredItems.length === 0) return null;

              const isGroupHasActiveTab = filteredItems.some(item => item.tab === activeTab);
              const isGroupExpanded =
                !group.collapsible ||
                Boolean(searchNormalized) ||
                isGroupHasActiveTab ||
                expandedGroups[group.id];

              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => group.collapsible && toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold ${
                        isDarkSidebar
                          ? 'text-slate-400 hover:text-white'
                          : group.collapsible
                          ? 'text-slate-500 hover:text-slate-800 cursor-pointer rounded-lg hover:bg-slate-50'
                          : 'text-slate-400 cursor-default'
                      }`}
                    >
                      <span>{group.groupTitle}</span>
                      {group.collapsible && (
                        <span>
                          {isGroupExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronLeft className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </button>
                  )}

                  {isGroupExpanded && (
                    <nav className="space-y-1">
                      {filteredItems.map(item => {
                        const isMainActive = activeTab === item.tab;
                        const Icon = item.icon;
                        const showSubModules =
                          !collapsed &&
                          item.matchedSubs &&
                          item.matchedSubs.length > 0 &&
                          (activeTab === item.tab || Boolean(searchNormalized));

                        return (
                          <div key={item.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => onTabChange(item.tab, item.inventorySubTab)}
                              title={collapsed ? item.label : undefined}
                              style={
                                isMainActive
                                  ? { backgroundColor: themeMeta.primaryHex }
                                  : undefined
                              }
                              className={`w-full flex items-center ${
                                collapsed ? 'justify-center px-2' : 'justify-between px-3'
                              } py-2 rounded-xl text-xs transition-colors cursor-pointer text-right ${
                                isMainActive
                                  ? 'text-white font-semibold shadow-2xs'
                                  : isDarkSidebar
                                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition-colors ${
                                    isMainActive
                                      ? 'text-white'
                                      : isDarkSidebar
                                      ? 'text-slate-400'
                                      : 'text-slate-400'
                                  }`}
                                />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                              </div>
                              {!collapsed && item.count && (
                                <span
                                  className={`text-[11px] shrink-0 tabular-nums ${
                                    isMainActive ? 'text-white/80' : 'text-slate-400'
                                  }`}
                                >
                                  {item.count}
                                </span>
                              )}
                            </button>

                            {showSubModules && (
                              <div
                                className={`mr-3.5 pr-2.5 border-r space-y-0.5 py-0.5 ${
                                  isDarkSidebar ? 'border-slate-700' : 'border-slate-200'
                                }`}
                              >
                                {item.matchedSubs.map(sub => {
                                  const isSubActive =
                                    activeTab === sub.tab &&
                                    activeInventorySubTab === sub.inventorySubTab;
                                  const SubIcon = sub.icon;

                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => onTabChange(sub.tab, sub.inventorySubTab)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-right ${
                                        isSubActive
                                          ? isDarkSidebar
                                            ? 'bg-white/15 text-white font-bold'
                                            : 'bg-slate-100 text-slate-950 font-bold'
                                          : isDarkSidebar
                                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{sub.label}</span>
                                      </div>
                                      {sub.badge && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                                            sub.badgeHighlight
                                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {sub.badge}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Profile Card (Matches Image 1 Dark Sidebar Footer) or Role Filter */}
      <div
        className={`mt-6 pt-3 border-t space-y-2.5 ${
          isDarkSidebar ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        {!collapsed && onOpenTemplateModal && (
          <button
            type="button"
            onClick={onOpenTemplateModal}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDarkSidebar
                ? 'bg-white/5 hover:bg-white/10 text-emerald-300 border-white/10'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              <span>تغییر قالب و رنگ‌بندی (۴ قالب)</span>
            </span>
          </button>
        )}

        {!collapsed && isDarkSidebar ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
                  م
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-white">مدیر سامانه (نمونه)</div>
                  <div className="text-[10px] text-slate-400">مدیر سامانه</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer">
                خروج
              </span>
            </div>
            <div className="text-[10px] text-slate-500 text-center">
              نسخه ۰/۶/۰ — فازهای ۰ تا ۶
            </div>
          </div>
        ) : (
          !collapsed && (
            <>
              {currentRole !== 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setShowAllForRole(!showAllForRole)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>
                      {showAllForRole ? 'نمایش منوی تخصصی نقش من' : 'نمایش همه منوهای سیستم'}
                    </span>
                  </span>
                </button>
              )}
              <div className="px-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="font-semibold text-[10px]">KPIMS ERP</span>
                <span>تقویم شمسی فعال</span>
              </div>
            </>
          )
        )}
      </div>
    </aside>
  );
};
