import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Calculator, CheckCircle2, Target, X } from 'lucide-react';

export type PredefinedMetricKey =
  | 'OEE'
  | 'ATP'
  | 'WIP'
  | 'SMED'
  | 'PR'
  | 'MO'
  | 'BOM'
  | 'FTT'
  | 'CT'
  | 'TAKT'
  | 'SLITTING_YIELD'
  | 'CAPACITY_LOAD';

interface MetricDefinition {
  code: string;
  nameFa: string;
  nameEn: string;
  formula: string;
  description: string;
  benchmark?: string;
  automotiveContext?: string;
}

export const METRIC_DEFINITIONS: Record<PredefinedMetricKey, MetricDefinition> = {
  OEE: {
    code: 'OEE',
    nameFa: 'اثربخشی کلی تجهیزات',
    nameEn: 'Overall Equipment Effectiveness',
    formula: 'OEE = Availability × Performance × Quality',
    description:
      'شاخص جامع بهره‌وری پرس‌ها و ماشین‌آلات که ضرب سه نرخ دسترس‌پذیری، راندمان سرعت ضربه پرس و نرخ قطعات سالم (بدون ضایعات) است.',
    benchmark: 'استاندارد جهانی خودروسازی: > ۸۵٪ (دسترس‌پذیری ۹۰٪، عملکرد ۹۵٪، کیفیت ۹۹.۹٪)',
    automotiveContext: 'در سالن پرس، توقفات تعویض قالب (SMED) و خرابی هیدرولیک بیشترین افت OEE را ایجاد می‌کنند.',
  },
  ATP: {
    code: 'ATP',
    nameFa: 'موجودی قابل تعهد به خودروساز',
    nameEn: 'Available To Promise',
    formula: 'ATP = موجودی آزاد انبار + دریافت‌های قطعی آینده - تعهدات سفارش‌های قبلی',
    description:
      'میزان دقیق قطعاتی که بدون به خطر انداختن تعهدات جاری خطوط ایران‌خودرو یا ساپکو، می‌توان به سفارش‌های جدید تخصیص داد.',
    benchmark: 'پاسخگویی آنی به سفارش‌های اضطراری بدون ایجاد کسری در زنجیره تامین',
    automotiveContext: 'مانع از صدور قول تحویل مازاد بر ظرفیت واقعی خط و انبار محصول نهایی می‌شود.',
  },
  WIP: {
    code: 'WIP',
    nameFa: 'موجودی در جریان ساخت بین‌ایستگاهی',
    nameEn: 'Work In Process (Inter-OP Buffer)',
    formula: 'WIP = تولید سالم مرحله ماقبل (OP_{k-1}) - مصرف‌شده در مرحله جاری (OP_k)',
    description:
      'تعداد قطعات نیمه‌ساخته‌ای که از یک عملیات (مثلاً بلنکینگ) خارج شده و در پالت‌های پای خط در انتظار ورود به مرحله بعد (مثلاً خم یا پرس‌جوش) هستند.',
    benchmark: 'بافر بهینه: معادل ۲ الی ۴ ساعت کارکرد مداوم ایستگاه بعدی جهت جلوگیری از گرسنگی خط (Line Starvation)',
    automotiveContext: 'انباشت بیش از حد WIP باعث قفل فضای سالن و افزایش سرمایه در گردش راکد می‌شود.',
  },
  SMED: {
    code: 'SMED',
    nameFa: 'تعویض سریع قالب پرس در کمتر از ۱۰ دقیقه',
    nameEn: 'Single-Minute Exchange of Die',
    formula: 'زمان ستاپ = لحظه آخرین ضربه قطعه قبلی تا اولین ضربه تاییدشده قطعه جدید',
    description:
      'متدولوژی لین تویوتا برای به حداقل رساندن زمان خواب پرس‌های سنگین هنگام جابجایی قالب کشش و خم با استفاده از فیکسچرهای پیش‌تنظیم.',
    benchmark: 'استاندارد کلاس جهانی: کمتر از ۹ دقیقه و ۵۹ ثانیه',
    automotiveContext: 'کاهش زمان ستاپ امکان تولید در بچ‌های کوچکتر و منعطف‌تر را برای سفارشات متنوع فراهم می‌سازد.',
  },
  PR: {
    code: 'PR',
    nameFa: 'درخواست خرید رسمی مواد اولیه',
    nameEn: 'Purchase Requisition',
    formula: 'مقدار سفارش = (تقاضای خالص MRP + حداقل ذخیره اطمینان) - موجودی آزاد',
    description:
      'سند رسمی خروجی از موتور برنامه‌ریزی احتیاجات مواد (MRP) به واحد تدارکات و بازرگانی جهت سفارش کلاف ورق فولاد مبارکه یا ساپکو.',
    benchmark: 'صدور خودکار همگام با لیدتایم تحویل تامین‌کننده (Lead Time)',
    automotiveContext: 'از توقف پرس‌ها به علت تاخیر در برش کلاف‌های با ضخامت خاص پیشگیری می‌کند.',
  },
  MO: {
    code: 'MO',
    nameFa: 'دستور ساخت کارگاهی',
    nameEn: 'Manufacturing / Production Order',
    formula: 'سند اجرایی صادرشده با کد یکتا، مسیر ساخت (Routing) و ساختار درخت محصول (BOM)',
    description:
      'مجوز رسمی شروع کار برای سالن‌های برش، پرس و جوشکاری که تیراژ هدف، ایستگاه‌ها، قالب‌ها و شناسه ردیابی را مشخص می‌کند.',
    benchmark: 'ردیابی ۱۰۰٪ سوابق تولید و قطعه از کلاف مادر تا پالت نهایی',
    automotiveContext: 'مبنای ثبت کارکرد شیفت و صدور حواله رسید انبار محصول به ساپکو است.',
  },
  BOM: {
    code: 'BOM',
    nameFa: 'ساختار درخت محصول',
    nameEn: 'Bill of Materials',
    formula: 'BOM = نسبت مصرف مواد خام (وزن ورق + پرت ضایعات) + قطعات استاندارد (مهره/پین)',
    description:
      'فهرست مهندسی تمام متریال، ضخامت، گرید ورق (مانند ST12, DC01A) و قطعات الحاقی لازم برای ساخت یک عدد محصول کامل.',
    benchmark: 'دقت ۱۰۰٪ ضرایب مصرف جهت برآورد هزینه و تراز انبار',
    automotiveContext: 'هرگونه تغییر ضخامت ورق در ساپکو مستلزم صدور ویرایش مهندسی (ECN) در BOM است.',
  },
  FTT: {
    code: 'FTT',
    nameFa: 'راندمان کیفیت بار اول',
    nameEn: 'First Time Through',
    formula: 'FTT = (قطعات تولیدی کاملاً سالم بدون هیچ دوباره‌کاری ÷ کل تیراژ ورودی) × ۱۰۰',
    description:
      'درصد قطعات پرسی که در همان ضرب اول بدون نیاز به پلیسه‌گیری مجدد، سنگ‌زنی یا صافکاری تایید کیفی می‌گیرند.',
    benchmark: 'هدف استاندارد خطوط خودرویی: > ۹۸.۵٪',
    automotiveContext: 'معیار کلیدی کنترل کیفی حین فرایند (In-Process QC) در سالن پرس.',
  },
  CT: {
    code: 'CT',
    nameFa: 'زمان سیکل پرس',
    nameEn: 'Cycle Time',
    formula: 'CT = زمان لازم برای قرارگیری بلنک + ضربه پرس + تخلیه قطعه (ثانیه)',
    description:
      'مدت زمان استاندارد برای تکمیل یک ضربه موفق روی دستگاه یا پرس با احتساب سرعت اپراتور یا فیدر اتوماتیک.',
    benchmark: 'پرس اتوماتیک: ۲ الی ۴ ثانیه | پرس دستی: ۶ الی ۱۰ ثانیه',
    automotiveContext: 'تعیین‌کننده نرخ استاندارد خروجی در ساعت (Pcs/Hour) در برنامه‌ریزی ظرفیت.',
  },
  TAKT: {
    code: 'TAKT',
    nameFa: 'تاکت تایم تقاضای مشتری',
    nameEn: 'Takt Time',
    formula: 'Takt Time = زمان خالص کاری شیفت (ثانیه) ÷ تقاضای روزانه مشتری (ساپکو)',
    description:
      'ضرب‌آهنگ و ریتمی که کارخانه باید تولید کند تا دقیقاً با سرعت مصرف خط مونتاژ خودروساز همگام باشد.',
    benchmark: 'همگامی کامل (Cycle Time ≤ Takt Time) جهت جلوگیری از اضافه تولید یا تاخیر',
    automotiveContext: 'اگر زمان سیکل پرس بیشتر از تاکت تایم باشد، کارخانه به اضافه شیفت نیاز پیدا می‌کند.',
  },
  SLITTING_YIELD: {
    code: 'SLITTING_YIELD',
    nameFa: 'راندمان بازده نواربری کلاف',
    nameEn: 'Coil Slitting Yield',
    formula: 'بازده = (مجموع وزن نوارهای برشی سالم ÷ وزن کلاف مادر ورودی) × ۱۰۰',
    description:
      'نسبت وزن نوارهای ورق تولیدشده به وزن رول مادر ورودی از فولاد مبارکه پس از کسر ضایعات کناره‌بری (Trimming Scrap).',
    benchmark: 'استاندارد برش نوار ورق خودروسازی: > ۹۶٪',
    automotiveContext: 'بهینه‌سازی عرض نوارهای برشی در نرم‌افزار موجب صرفه‌جویی چندصد میلیونی در خرید ورق می‌شود.',
  },
  CAPACITY_LOAD: {
    code: 'CAPACITY_LOAD',
    nameFa: 'بار ظرفیت دستگاه و پرس',
    nameEn: 'Machine Capacity Utilization Load',
    formula: 'Load % = (مجموع ساعات مورد نیاز تولید قطعات روی دستگاه ÷ کل ساعات در دسترس) × ۱۰۰',
    description:
      'درصد اشغال ظرفیت زمانی هر پرس در طول هفته که نشان‌دهنده گلوگاه‌ها یا ظرفیت‌های خالی خط تولید است.',
    benchmark: 'محدوده ایده‌آل: ۷۵٪ الی ۸۵٪ (بالای ۸۵٪ خط قرمز گلوگاه بحرانی است)',
    automotiveContext: 'امکان پیش‌بینی نیاز به شیفت شب یا انتقال قالب به پرس موازی را فراهم می‌کند.',
  },
};

interface MetricTooltipProps {
  metric?: PredefinedMetricKey;
  title?: string;
  formula?: string;
  description?: string;
  benchmark?: string;
  automotiveContext?: string;
  iconClassName?: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  metric,
  title,
  formula,
  description,
  benchmark,
  automotiveContext,
  iconClassName = 'w-3.5 h-3.5',
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const def = metric ? METRIC_DEFINITIONS[metric] : null;
  const finalTitle = title || (def ? `${def.code} - ${def.nameFa}` : 'راهنمای شاخص تخصصی');
  const finalEn = def?.nameEn;
  const finalFormula = formula || def?.formula;
  const finalDesc = description || def?.description;
  const finalBenchmark = benchmark || def?.benchmark;
  const finalContext = automotiveContext || def?.automotiveContext;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle mx-1 select-none z-30 ${className}`}
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        title={`راهنمای تخصصی و فرمول: ${finalTitle}`}
        className="text-slate-400 hover:text-amber-600 transition-colors p-0.5 rounded cursor-pointer focus:outline-none"
      >
        <HelpCircle className={iconClassName} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${alignClass} w-80 md:w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 text-right text-xs z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{finalTitle}</span>
              </div>
              {finalEn && (
                <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                  {finalEn}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formula Block */}
          {finalFormula && (
            <div className="bg-slate-900 text-amber-300 font-mono text-[11px] p-2.5 rounded-lg mb-2.5 border border-slate-800 leading-relaxed text-center" dir="ltr">
              <div className="text-[9px] text-slate-400 font-sans mb-1 text-right" dir="rtl">
                فرمول استاندارد محاسبه:
              </div>
              <span className="font-bold">{finalFormula}</span>
            </div>
          )}

          {/* Description */}
          {finalDesc && (
            <p className="text-slate-600 leading-relaxed mb-2 text-[11px]">
              {finalDesc}
            </p>
          )}

          {/* Benchmark / Target */}
          {finalBenchmark && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] flex items-start gap-1.5 mb-2 leading-relaxed">
              <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>تارگت و بنچ‌مارک استاندارد: </strong>
                <span>{finalBenchmark}</span>
              </div>
            </div>
          )}

          {/* Automotive Specific Context */}
          {finalContext && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] leading-relaxed">
              <strong>کاربرد در خطوط پرس و جوش: </strong>
              <span>{finalContext}</span>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
