import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Boxes,
  Layers,
  GitFork,
  Cpu,
  History,
  Users,
  AlertTriangle,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'vouchers'
  | 'inventory'
  | 'parts'
  | 'routings'
  | 'machines'
  | 'audit'
  | 'users';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  partsCount: number;
  txCount: number;
  scrapRate: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  partsCount,
  txCount,
  scrapRate,
}) => {
  const menuItems: { id: TabKey; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'داشبورد مدیریتی',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'vouchers',
      label: 'صدور و ثبت اسناد',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: 'عملیات',
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      id: 'inventory',
      label: 'موجودی انبارها و WIP',
      icon: <Boxes className="w-4 h-4" />,
      badge: 'محاسباتی',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'parts',
      label: 'اطلاعات پایه و کاتالوگ قطعات',
      icon: <Layers className="w-4 h-4" />,
      badge: `${partsCount} قطعه`,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      id: 'routings',
      label: 'مسیرهای تولید و عملیات (OP)',
      icon: <GitFork className="w-4 h-4" />,
    },
    {
      id: 'machines',
      label: 'ماشین‌آلات و خطوط پرس',
      icon: <Cpu className="w-4 h-4" />,
      badge: '۱۰ دستگاه',
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'audit',
      label: 'گردش تراکنش‌ها و سوابق اصلاح',
      icon: <History className="w-4 h-4" />,
      badge: `${txCount} سند`,
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    },
    {
      id: 'users',
      label: 'مدیریت کاربران و دسترسی',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-900/60 border-b md:border-b-0 md:border-l border-slate-800 p-3 shrink-0 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          ماژول‌های سیستم کارخانه
        </div>
        <nav className="space-y-1">
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Factory KPI summary widget */}
      <div className="hidden md:block mt-6 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>شاخص کیفیت (نرخ ضایعات)</span>
          <span className="font-bold text-slate-200">{scrapRate}%</span>
        </div>
        <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              scrapRate > 3 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, scrapRate * 10)}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          نرم مجاز ضایعات قرارداد ساپکو: حداکثر ۲.۵٪
        </p>
      </div>
    </aside>
  );
};
