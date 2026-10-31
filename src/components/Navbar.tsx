import React, { useState } from 'react';
import {
  Factory,
  Database,
  Trash2,
  RefreshCw,
  Layers,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';

interface NavbarProps {
  currentUser: UserRoleProfile;
  onRoleChange: (role: UserRoleProfile['role']) => void;
  onSeedDemo: () => Promise<void>;
  onCleanDemo: () => Promise<void>;
  onOpenErpModal: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleChange,
  onSeedDemo,
  onCleanDemo,
  onOpenErpModal,
  loading,
}) => {
  const [showConfirmClean, setShowConfirmClean] = useState(false);

  const roleLabels: Record<UserRoleProfile['role'], string> = {
    ADMIN: 'مدیر ارشد کارخانه (Admin)',
    PRODUCTION_MANAGER: 'مدیر برنامه‌ریزی تولید',
    WAREHOUSE_KEEPER: 'مسئول انبار و تدارکات ساپکو',
    LINE_SUPERVISOR: 'سرپرست سالن پرس و جوش',
    QC_INSPECTOR: 'بازرس کنترل کیفیت (QC)',
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <Factory className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-white tracking-tight">
                سامانه کنترل تولید و انبار قطعات خودرو
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                نسخه کارخانه ۱.۰
              </span>
            </div>
            <p className="text-xs text-slate-400">
              خطوط پرس سنگین، برش، جوشکاری، پوشش ED و رهگیری قطعات ۵۲ گانه ساپکو
            </p>
          </div>
        </div>

        {/* Action Buttons & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ERP Connector */}
          <button
            onClick={onOpenErpModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-all"
            title="وضعیت اتصال به سیستم‌های مالی و ERP ساپکو / SQL Server"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>اتصال ERP / SQL</span>
          </button>

          {/* Seed Demo Data */}
          <button
            onClick={onSeedDemo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all disabled:opacity-50"
            title="بارگذاری مجدد ۵۲ قطعه، ماشین‌آلات و اسناد نمونه"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>داده‌های اولیه کارخانه</span>
          </button>

          {/* Clean Demo Data */}
          <div className="relative">
            {!showConfirmClean ? (
              <button
                onClick={() => setShowConfirmClean(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all disabled:opacity-50"
                title="پاکسازی امن داده‌های آزمایشی بدون حذف داده‌های واقعی"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی دمو</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded-lg p-1 animate-in fade-in">
                <span className="text-[11px] text-rose-200 px-1">حذف داده‌های آزمایشی؟</span>
                <button
                  onClick={async () => {
                    await onCleanDemo();
                    setShowConfirmClean(false);
                  }}
                  className="px-2 py-0.5 text-xs bg-rose-600 text-white rounded font-medium hover:bg-rose-500"
                >
                  بله
                </button>
                <button
                  onClick={() => setShowConfirmClean(false)}
                  className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                >
                  لغو
                </button>
              </div>
            )}
          </div>

          {/* User Role Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs text-slate-400 hidden sm:inline">کاربر فعال:</span>
            <select
              value={currentUser.role}
              onChange={e => onRoleChange(e.target.value as UserRoleProfile['role'])}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ADMIN" className="bg-slate-900 text-slate-100">
                {roleLabels.ADMIN}
              </option>
              <option value="PRODUCTION_MANAGER" className="bg-slate-900 text-slate-100">
                {roleLabels.PRODUCTION_MANAGER}
              </option>
              <option value="WAREHOUSE_KEEPER" className="bg-slate-900 text-slate-100">
                {roleLabels.WAREHOUSE_KEEPER}
              </option>
              <option value="LINE_SUPERVISOR" className="bg-slate-900 text-slate-100">
                {roleLabels.LINE_SUPERVISOR}
              </option>
              <option value="QC_INSPECTOR" className="bg-slate-900 text-slate-100">
                {roleLabels.QC_INSPECTOR}
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
