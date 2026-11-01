import React, { useState, useEffect } from 'react';
import {
  Factory,
  Database,
  Trash2,
  RefreshCw,
  Layers,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Cpu,
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';
import { formatToJalali, getCurrentJalaliDate } from '../utils/jalali';

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
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; isConfigured: boolean } | null>(null);
  const [currentJalali, setCurrentJalali] = useState(getCurrentJalaliDate());

  useEffect(() => {
    // Check DB status on mount
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

    const timer = setInterval(() => {
      setCurrentJalali(getCurrentJalaliDate());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const roleLabels: Record<UserRoleProfile['role'], string> = {
    ADMIN: 'مدیر ارشد کارخانه (Admin)',
    PRODUCTION_MANAGER: 'مدیر برنامه‌ریزی تولید',
    WAREHOUSE_KEEPER: 'مسئول انبار و تدارکات ساپکو',
    LINE_SUPERVISOR: 'سرپرست سالن پرس و جوش',
    QC_INSPECTOR: 'بازرس کنترل کیفیت (QC)',
  };

  // Determine current active factory shift
  const hour = new Date().getHours();
  const currentShift =
    hour >= 6 && hour < 14 ? 'شیفت صبح (A)' : hour >= 14 && hour < 22 ? 'شیفت عصر (B)' : 'شیفت شب (C)';

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <Factory className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>KPIMS</span>
                <span className="text-slate-400 font-normal">|</span>
                <span>سامانه برنامه‌ریزی تولید و کنترل موجودی قطعات فلزی خودرو</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                نسخه صنعتی
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>امروز: {formatToJalali(new Date(), { textualMonth: true })}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400/90 font-medium">{currentShift}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">۵۲ قطعه فعال و خطوط پرس ساپکو</span>
            </div>
          </div>
        </div>

        {/* Status Indicators & Role Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Database Architecture Indicator */}
          <div
            onClick={onOpenErpModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg cursor-pointer transition-all"
            title="وضعیت پیکربندی پایگاه داده PostgreSQL و اتصال به سیستم‌های مالی / ERP"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300">معماری دیتابیس:</span>
            {dbStatus?.isConnected ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>PostgreSQL متصل</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>PostgreSQL (موتور حافظه سرور)</span>
              </span>
            )}
          </div>

          {/* Seed Demo Data */}
          <button
            onClick={onSeedDemo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            title="بازنشانی اطلاعات نمونه کارخانه (۵۲ قطعه، قالب‌ها، ماشین‌آلات)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بارگذاری نمونه</span>
          </button>

          {/* Clean Demo Data */}
          <div className="relative">
            {!showConfirmClean ? (
              <button
                onClick={() => setShowConfirmClean(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                title="پاکسازی امن اطلاعات دمو"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاکسازی دمو</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-600/50 p-1 rounded-lg">
                <span className="text-[11px] text-rose-300 px-1">اطمینان دارید؟</span>
                <button
                  onClick={async () => {
                    await onCleanDemo();
                    setShowConfirmClean(false);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded"
                >
                  بله
                </button>
                <button
                  onClick={() => setShowConfirmClean(false)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded"
                >
                  لغو
                </button>
              </div>
            )}
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={currentUser.role}
              onChange={e => onRoleChange(e.target.value as UserRoleProfile['role'])}
              className="bg-transparent text-xs text-slate-200 border-none focus:outline-none cursor-pointer pr-1"
            >
              {Object.entries(roleLabels).map(([roleKey, label]) => (
                <option key={roleKey} value={roleKey} className="bg-slate-900 text-slate-200">
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
