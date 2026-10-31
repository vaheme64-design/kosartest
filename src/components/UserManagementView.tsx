import React from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
  Building,
  KeyRound,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface UserManagementViewProps {
  currentUser: UserRoleProfile;
  onRoleChange: (role: UserRoleProfile['role']) => void;
  firebaseUser: any;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onRoleChange,
  firebaseUser,
}) => {
  const rolesInfo: {
    role: UserRoleProfile['role'];
    title: string;
    description: string;
    permissions: string[];
    color: string;
  }[] = [
    {
      role: 'ADMIN',
      title: 'مدیر ارشد کارخانه (System Administrator)',
      description: 'دسترسی نامحدود به تمامی ماژول‌ها، تعریف کاربران، ابطال اسناد، پاکسازی داده‌ها و کالیبراسیون انبارگردانی',
      permissions: ['صدور کلیه اسناد', 'ابطال و صدور سند معکوس', 'تعریف قطعه و مسیر', 'تعریف ماشین‌آلات', 'پاکسازی امن دمو', 'مدیریت کاربران'],
      color: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
    },
    {
      role: 'PRODUCTION_MANAGER',
      title: 'مدیر برنامه‌ریزی تولید (Production Manager)',
      description: 'نظارت بر ایستگاه‌های پرسکاری و جوش، تعریف مسیرهای تولید، کنترل گلوگاه‌ها و مانیتورینگ WIP',
      permissions: ['ثبت تولید سالم', 'ثبت انتقال بین مراحل', 'تعریف و اصلاح مسیر تولید', 'گزارش‌گیری کامل WIP', 'مشاهده ماشین‌آلات'],
      color: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
    },
    {
      role: 'WAREHOUSE_KEEPER',
      title: 'مسئول انبار و تدارکات ساپکو (Warehouse Keeper)',
      description: 'مدیریت کویل‌ها و شیت‌های ورودی ساپکو، صدور رسید بارنامه، حواله خروج به خطوط برش و انبار محصول نهایی',
      permissions: ['صدور رسید ورود ورق ساپکو', 'صدور حواله مصرف مواد اولیه', 'انبارگردانی اول دوره', 'مشاهده موجودی انبار مواد و محصول'],
      color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
    },
    {
      role: 'LINE_SUPERVISOR',
      title: 'سرپرست سالن پرس و جوشکاری (Line Supervisor)',
      description: 'ثبت تیراژ شیفت، تخصیص اپراتورها و ماشین‌آلات، صدور کارت انتقال قطعه (کانبان) و تحویل در ایستگاه‌ها',
      permissions: ['ثبت تولید شیفت', 'ثبت خروج و ورود بین مراحل', 'مشاهده موجودی لحظه‌ای ایستگاه', 'تغییر وضعیت آمادگی ماشین'],
      color: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
    },
    {
      role: 'QC_INSPECTOR',
      title: 'بازرس کنترل کیفیت ساپکو (QC Inspector)',
      description: 'بازرسی ابعادی و متالورژی، کنترل پیچش مهره جوش، تست رنگ کاتافورز و ثبت ضایعات با کد علت نقص',
      permissions: ['ثبت ضایعات قطعات', 'ثبت علل عیوب قالب و کشش', 'مشاهده گزارش نرخ ضایعات', 'دسترسی فقط‌خواندنی به کاتالوگ'],
      color: 'border-rose-500/40 bg-rose-500/5 text-rose-400',
    },
  ];

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In failed', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out failed', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            مدیریت هویت کاربران و ماتریس دسترسی نقش‌ها (RBAC)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            یکپارچه‌شده با Firebase Authentication؛ کنترل دقیق سطح دسترسی برای تضمین امنیت و یکپارچگی دفاتر
          </p>
        </div>

        {/* Firebase Auth Button */}
        <div>
          {firebaseUser ? (
            <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                {firebaseUser.displayName?.charAt(0) || 'U'}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white">{firebaseUser.displayName || firebaseUser.email}</div>
                <div className="text-[10px] text-emerald-400">احراز هویت شده در فایربیس</div>
              </div>
              <button
                onClick={handleSignOut}
                className="mr-2 p-1 text-slate-400 hover:text-rose-400 transition-colors"
                title="خروج از حساب فایربیس"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition-all shadow-md"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>ورود با حساب گوگل (Firebase Auth)</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Active Role Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">نقش فعال کنونی در این نشست:</div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {rolesInfo.find(r => r.role === currentUser.role)?.title}
            </h3>
            <p className="text-xs text-amber-300/80 mt-0.5">
              کاربر جاری: {currentUser.displayName} ({currentUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">تغییر شبیه‌سازی نقش:</span>
          <select
            value={currentUser.role}
            onChange={e => onRoleChange(e.target.value as UserRoleProfile['role'])}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {rolesInfo.map(r => (
              <option key={r.role} value={r.role}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rolesInfo.map(info => {
          const isSelected = currentUser.role === info.role;

          return (
            <div
              key={info.role}
              className={`p-5 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                  {info.role}
                </span>
                {isSelected ? (
                  <span className="text-[11px] px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    فعال کنونی
                  </span>
                ) : (
                  <button
                    onClick={() => onRoleChange(info.role)}
                    className="text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    تغییر به این نقش
                  </button>
                )}
              </div>

              <h3 className="text-sm font-bold text-white mt-3">{info.title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed min-h-[48px]">
                {info.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-700/40">
                <div className="text-[11px] font-semibold text-slate-300 mb-2">مجوزهای عملیاتی:</div>
                <div className="space-y-1.5">
                  {info.permissions.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
