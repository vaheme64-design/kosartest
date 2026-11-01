import React from 'react';
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
} from 'lucide-react';

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
  onTabChange: (tab: TabKey) => void;
  partsCount: number;
  txCount: number;
  plansCount: number;
  coilsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  partsCount,
  txCount,
  plansCount,
  coilsCount,
}) => {
  const menuItems: {
    id: TabKey;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'داشبورد مدیریتی',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'master_data',
      label: 'اطلاعات پایه قطعات',
      icon: <Layers className="w-4 h-4" />,
      badge: `${partsCount} قطعه`,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      id: 'inventory',
      label: 'موجودی انبارها',
      icon: <Boxes className="w-4 h-4" />,
      badge: 'محاسباتی',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'production',
      label: 'ثبت و کنترل تولید',
      icon: <Hammer className="w-4 h-4" />,
      badge: 'اسناد',
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      id: 'wip',
      label: 'کار در جریان ساخت (WIP)',
      icon: <GitCommit className="w-4 h-4" />,
      badge: '۸ ایستگاه',
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    },
    {
      id: 'planning',
      label: 'برنامه‌ریزی تولید',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: `${plansCount} برنامه`,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    },
    {
      id: 'machines',
      label: 'ماشین‌آلات و ظرفیت‌سنجی',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'خطوط پرس',
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'sapco',
      label: 'مواد و سهمیه ساپکو',
      icon: <ScrollText className="w-4 h-4" />,
      badge: `${coilsCount} رول`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      id: 'reports',
      label: 'گزارش‌ها و ردیابی اسناد',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: `${txCount} سند`,
      badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    },
    {
      id: 'settings',
      label: 'کاربران و تنظیمات',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-slate-900/70 border-b md:border-b-0 md:border-l border-slate-800 p-3 shrink-0 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          ماژول‌های سیستم KPIMS
        </div>
        <nav className="space-y-1">
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-slate-950' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Industrial Footer Tag */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 px-2 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>نسخه سامانه:</span>
          <span className="font-mono text-slate-400">KPIMS v1.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span>دیتابیس معماری:</span>
          <span className="text-emerald-400 font-mono">PostgreSQL</span>
        </div>
      </div>
    </aside>
  );
};
