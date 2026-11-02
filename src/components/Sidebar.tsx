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
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';
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
  onTabChange: (tab: TabKey, inventorySubTab?: InventorySubTab) => void;
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
  onTabChange,
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
    master_reports: false,
  });

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'core',
        groupTitle: 'هسته اصلی: موجودی و انبار',
        defaultOpen: true,
        items: [
          {
            id: 'nav-dashboard',
            tab: 'dashboard',
            label: 'میز کار و خلاصه وضعیت',
            keywords: 'داشبورد خانه پیشخوان خلاصه وضعیت روزانه',
            icon: LayoutDashboard,
            roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'],
          },
          {
            id: 'nav-inventory-hub',
            tab: 'inventory',
            inventorySubTab: 'DASHBOARD',
            label: 'مدیریت انبار، ورق و قراردادها',
            keywords: 'انبار موجودی ورق رول کویل پک قرارداد کاردکس اکسل کسری نقطه سفارش',
            icon: Boxes,
            count: coilsCount > 0 ? `${toPersianDigits(coilsCount)} رول` : undefined,
            roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'],
            subModules: [
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
          },
        ],
      },
      {
        id: 'planning_prod',
        groupTitle: 'برنامه‌ریزی و اجرای تولید',
        defaultOpen: true,
        items: [
          {
            id: 'nav-planning',
            tab: 'planning',
            label: 'برنامه‌ریزی تولید و نیازسنجی (MRP)',
            keywords: 'برنامه ریزی تولید نیازسنجی مواد سفارشات مشتری ساپکو تخصیص ماشین آلات mrp',
            icon: CalendarDays,
            count: plansCount > 0 ? toPersianDigits(plansCount) : undefined,
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'],
          },
          {
            id: 'nav-production',
            tab: 'production',
            label: 'ثبت روزانه تولید و ضایعات',
            keywords: 'ثبت تولید مصرف ضایعات آمار روزانه شیفت پرسکاری',
            icon: Hammer,
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'],
          },
          {
            id: 'nav-wip',
            tab: 'wip',
            label: 'کار در جریان (WIP) و ایستگاه‌ها',
            keywords: 'کار در جریان ساخت wip ایستگاه دستور کار انتقال بین مراحل',
            icon: GitCommit,
            count: '۸ ایستگاه',
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'],
          },
        ],
      },
      {
        id: 'master_reports',
        groupTitle: 'اطلاعات پایه، منابع و گزارش‌ها',
        collapsible: true,
        defaultOpen: false,
        items: [
          {
            id: 'nav-master',
            tab: 'master_data',
            label: 'شناسنامه کالا، ورق و مسیر ساخت',
            keywords: 'اطلاعات پایه کالا قطعه ضخامت جنس ورق مسیر ساخت فرمول bom حداقل موجودی',
            icon: ScrollText,
            count: toPersianDigits(partsCount),
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'],
          },
          {
            id: 'nav-machines',
            tab: 'machines',
            label: 'ماشین‌آلات، پرس‌ها و قالب‌ها',
            keywords: 'ماشین آلات دستگاه پرس قالب سنبه ماتریس اپراتور سالن ظرفیت',
            icon: Cpu,
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR'],
          },
          {
            id: 'nav-reports',
            tab: 'reports',
            label: 'گزارش‌های جامع مدیریتی و OEE',
            keywords: 'گزارش مدیریتی بهای تمام شده راندمان oee ضایعات تحلیل',
            icon: FileSpreadsheet,
            count: txCount > 0 ? toPersianDigits(txCount) : undefined,
            roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER', 'QC_INSPECTOR'],
          },
          {
            id: 'nav-settings',
            tab: 'settings',
            label: 'کاربران، نقش‌ها و تنظیمات',
            keywords: 'کاربران نقش دسترسی امنیت تنظیمات',
            icon: Settings,
            roles: ['ADMIN'],
          },
        ],
      },
    ],
    [coilsCount, reorderAlertsCount, plansCount, partsCount, txCount]
  );

  const isRoleFiltered = currentRole !== 'ADMIN' && !showAllForRole;
  const searchNormalized = moduleSearch.trim().toLowerCase();

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-full md:w-18' : 'w-full md:w-64 lg:w-72'
      } bg-white border-b md:border-b-0 md:border-l border-slate-200 p-3.5 shrink-0 flex flex-col justify-between transition-all select-none`}
    >
      <div className="space-y-3.5">
        {/* Header & Collapse Toggle */}
        <div className="flex items-center justify-between px-1.5">
          {!collapsed && (
            <span className="text-[11px] font-bold text-slate-500">
              دسترسی سریع ماژول‌ها
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

        {/* Instant Module & Sub-Module Search Input */}
        {!collapsed && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="جستجوی ماژول یا زیرماژول..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-xl pr-8 pl-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            {moduleSearch && (
              <button
                type="button"
                onClick={() => setModuleSearch('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Groups */}
        <div className="space-y-3">
          {navGroups.map(group => {
            const roleItems = isRoleFiltered
              ? group.items.filter(item => item.roles.includes(currentRole))
              : group.items;

            // Filter by moduleSearch across main items and sub-modules
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
                      group.collapsible
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
                            className={`w-full flex items-center ${
                              collapsed ? 'justify-center px-2' : 'justify-between px-3'
                            } py-2 rounded-xl text-xs transition-colors cursor-pointer text-right ${
                              isMainActive
                                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isMainActive ? 'text-amber-400' : 'text-slate-400'
                                }`}
                              />
                              {!collapsed && <span className="truncate">{item.label}</span>}
                            </div>
                            {!collapsed && item.count && (
                              <span
                                className={`text-[11px] shrink-0 tabular-nums ${
                                  isMainActive ? 'text-slate-300' : 'text-slate-400'
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                          </button>

                          {/* Nested Sub-Modules (Visible when Inventory is active or when searching) */}
                          {showSubModules && (
                            <div className="mr-3.5 pr-2.5 border-r border-slate-200 space-y-0.5 py-0.5">
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
                                        ? 'bg-slate-100 text-slate-950 font-bold'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <SubIcon
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isSubActive
                                            ? 'text-slate-900'
                                            : sub.badgeHighlight
                                            ? 'text-amber-600'
                                            : 'text-slate-400'
                                        }`}
                                      />
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
      </div>

      {/* Role Workspace Mode Switch & Footer */}
      <div className="mt-6 pt-3 border-t border-slate-100 space-y-2">
        {!collapsed && currentRole !== 'ADMIN' && (
          <button
            type="button"
            onClick={() => setShowAllForRole(!showAllForRole)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>{showAllForRole ? 'نمایش منوی تخصصی نقش من' : 'نمایش همه منوهای سیستم'}</span>
            </span>
          </button>
        )}

        {!collapsed && (
          <div className="px-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-[10px]">KPIMS ERP</span>
            <span>تقویم شمسی فعال</span>
          </div>
        )}
      </div>
    </aside>
  );
};
