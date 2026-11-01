import React, { useState, useEffect } from 'react';
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
  Database,
  Terminal,
  Server,
  Layers,
  Code,
  AlertCircle,
  Copy,
  Check,
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
  const [activeSubTab, setActiveSubTab] = useState<'rbac' | 'db_architecture'>('rbac');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDbStatus(data);
        }
      })
      .catch(() => {});
  }, []);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            تنظیمات سیستم، هویت کاربران و پایگاه داده (KPIMS Core)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت سطوح دسترسی بر پایه نقش (RBAC)، معماری پایگاه داده PostgreSQL و پیکربندی Prisma ORM
          </p>
        </div>

        {/* Sub-tabs switch */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('rbac')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'rbac'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            کاربران و سطوح دسترسی
          </button>
          <button
            onClick={() => setActiveSubTab('db_architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'db_architecture'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            معماری PostgreSQL & Prisma
          </button>
        </div>
      </div>

      {activeSubTab === 'rbac' ? (
        <div className="space-y-6">
          {/* Active Profile Info */}
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  کاربر فعال در این نشست: {currentUser.displayName}
                </div>
                <div className="text-xs text-slate-400">
                  نقش عملیاتی فعلی: <span className="text-amber-400 font-semibold">{currentUser.role}</span>
                </div>
              </div>
            </div>

            {firebaseUser ? (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-300">{firebaseUser.email}</span>
                <button
                  onClick={handleSignOut}
                  className="mr-2 p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="خروج از حساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl font-medium cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود با Google / Firebase</span>
              </button>
            )}
          </div>

          {/* Role Cards Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesInfo.map(info => {
              const isSelected = currentUser.role === info.role;
              return (
                <div
                  key={info.role}
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-slate-900/90 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.color}`}>
                        {info.role}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          نقش فعال شما
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2">{info.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{info.description}</p>

                    <div className="space-y-1.5 border-t border-slate-800 pt-3">
                      <div className="text-[11px] font-bold text-slate-400">مجوزهای عملیاتی:</div>
                      {info.permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onRoleChange(info.role)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isSelected ? 'نقش فعال است' : 'تغییر به این نقش'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Database & Prisma Architecture Documentation */
        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">وضعیت اتصال پایگاه داده PostgreSQL</h3>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  dbStatus?.data?.isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {dbStatus?.data?.isConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    متصل به سرور PostgreSQL
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    موتور پایدار سرور فعال است (DATABASE_URL تنظیم نشده)
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {dbStatus?.data?.errorMessage ||
                'سامانه آماده اتصال به PostgreSQL با ORM پریسما است. تمام تراکنش‌ها و اعتبارسنجی‌ها سمت سرور با موتور Zod و کنترل موجودی انجام می‌شوند.'}
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <div>
                <span className="text-slate-500">پایگاه داده: </span>
                <span className="text-indigo-400 font-bold">PostgreSQL 15+</span>
              </div>
              <div>
                <span className="text-slate-500">ابزار ORM: </span>
                <span className="text-white">Prisma Client v6.19 (Type-safe)</span>
              </div>
              <div>
                <span className="text-slate-500">اعتبارسنجی: </span>
                <span className="text-emerald-400">Zod 4.x Runtime Validation</span>
              </div>
              <div>
                <span className="text-slate-500">وضعیت رشته اتصال: </span>
                <span className="text-amber-400">{dbStatus?.data?.databaseUrlMasked || 'تنظیم در متغیرهای محیطی'}</span>
              </div>
            </div>
          </div>

          {/* Database Tables Defined */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-amber-400" />
              جداول تعریف‌شده در Prisma Schema (۱۱ جدول تخصصی کارخانه)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {[
                { name: 'users', desc: 'کاربران و ماتریس دسترسی RBAC' },
                { name: 'parts', desc: 'کاتالوگ ۵۲ قطعه، گرید، ضخامت و اوزان' },
                { name: 'factory_halls', desc: 'سالن‌های پرس، جوش، رنگ و مونتاژ' },
                { name: 'machines', desc: 'پرس‌های هیدرولیک و ضربه‌ای چندمنظوره' },
                { name: 'dies_molds', desc: 'قالب‌های سنبه‌ماتریس و عمر ضرب' },
                { name: 'production_routes', desc: 'مسیرهای تولید و ساخت مهندسی' },
                { name: 'route_operations', desc: 'مراحل OP10..OP80 و زمان سیکل' },
                { name: 'inventory_transactions', desc: 'اسناد کاردکس و گردش انبار' },
                { name: 'production_plans', desc: 'برنامه‌های هفتگی و تیراژ مصوب' },
                { name: 'sapco_coils', desc: 'کلاف‌ها، رول‌ها و سهمیه وزنی ساپکو' },
                { name: 'system_audit_logs', desc: 'ثبت وقایع و امنیت سیستم' },
              ].map(tbl => (
                <div key={tbl.name} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="font-mono text-amber-400 font-bold">{tbl.name}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tbl.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Migration Commands */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-emerald-400" />
              دستورات اجرای مایگریشن و مدیریت پایگاه داده (Prisma CLI)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              پس از مقداردهی متغیر محیطی <code className="text-amber-400 font-mono">DATABASE_URL</code>، می‌توانید از طریق دستورات زیر جداول را در PostgreSQL ایجاد کنید:
            </p>

            <div className="space-y-2 text-xs font-mono">
              {[
                {
                  cmd: 'npx prisma migrate dev --name init',
                  desc: 'ایجاد فایل مایگریشن اولیه و اعمال آن روی PostgreSQL',
                },
                {
                  cmd: 'npx prisma db push',
                  desc: 'همگام‌سازی فوری شمای پریسما با پایگاه داده بدون تولید فایل مایگریشن',
                },
                {
                  cmd: 'npx prisma generate',
                  desc: 'تولید کلاینت تایپ‌اسکریپت پریسما برای مدل‌های جدید',
                },
                {
                  cmd: 'npx prisma studio',
                  desc: 'راه‌اندازی محیط گرافیکی وب برای مشاهده و مدیریت مستقیم جداول',
                },
              ].map(item => (
                <div
                  key={item.cmd}
                  className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800"
                >
                  <div>
                    <div className="text-emerald-400 font-bold">$ {item.cmd}</div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.cmd)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    title="کپی دستور"
                  >
                    {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Environment Variables Documentation */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-cyan-400" />
              متغیرهای محیطی مورد نیاز سامانه (.env)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">نام متغیر</th>
                    <th className="p-2.5">الزامی/اختیاری</th>
                    <th className="p-2.5">توضیح و نمونه مقدار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="p-2.5 font-mono text-amber-400 font-bold">DATABASE_URL</td>
                    <td className="p-2.5 text-rose-400 font-semibold">الزامی برای PostgreSQL</td>
                    <td className="p-2.5 font-mono text-[11px]">postgresql://user:pass@localhost:5432/kpims_db?schema=public</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-cyan-400 font-bold">PORT</td>
                    <td className="p-2.5 text-slate-400">پیش‌فرض ۳۰۰۰</td>
                    <td className="p-2.5 text-[11px]">پورت اجرای وب‌سرور Express Node.js</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-cyan-400 font-bold">NODE_ENV</td>
                    <td className="p-2.5 text-slate-400">اختیاری</td>
                    <td className="p-2.5 text-[11px]">development یا production</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-cyan-400 font-bold">APP_URL</td>
                    <td className="p-2.5 text-slate-400">خودکار در پلتفرم</td>
                    <td className="p-2.5 text-[11px]">آدرس اصلی هاست برنامه</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
