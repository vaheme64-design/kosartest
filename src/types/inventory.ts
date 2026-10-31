/**
 * Data models for Automotive Sheet Metal Production Planning & Inventory Control
 * سیستم جامع برنامه‌ریزی تولید، قالب‌ها، خطوط پرس و کنترل موجودی قطعات فلزی خودرو
 */

export type PartCategory = 'RAW_MATERIAL' | 'WIP_PART' | 'FINISHED_GOOD';
export type UnitOfMeasure = 'KG' | 'PCS';

export type ProcessType =
  | 'SHEARING'          // برش و نواربری ورق
  | 'BLANKING'          // پرس بلنکینگ سنبه و ماتریس
  | 'DRAWING'           // کشش عمیق قالب پرس سنگین
  | 'PUNCH_FORM'        // پانچ، سوراخ‌کاری و فرم‌دهی
  | 'BENDING'           // خم‌کاری و پرس برک
  | 'TRIMMING'          // دوربری و آرایش لبه
  | 'SPOT_WELD'         // پرس‌جوش مقاومتی نقطه و مهره
  | 'CO2_WELD'          // جوشکاری دستی و رباتیک CO2
  | 'PAINT'             // شستشو، چربی‌زدایی و رنگ کاتافورز ED
  | 'ASSEMBLY';         // مونتاژ مجموعه‌ها، هِمینگ و بسته‌بندی

export type MachineStatus = 'ACTIVE' | 'MAINTENANCE' | 'IDLE';

export interface ProcessDefinition {
  id: string;
  code: ProcessType;
  name: string;
  category: 'STAMPING' | 'FORMING' | 'JOINING' | 'SURFACE_FINISH' | 'ASSEMBLY';
  description?: string;
}

export interface FactoryHall {
  id: string;
  code: string;
  name: string;
  type: 'STAMPING' | 'WELDING' | 'PAINT' | 'ASSEMBLY' | 'WAREHOUSE';
  supervisorName?: string;
  capacityDesc?: string;
}

export interface Operator {
  id: string;
  personnelCode: string;
  fullName: string;
  skillProcessTypes: ProcessType[];
  defaultShift: 'MORNING' | 'EVENING' | 'NIGHT';
  phone?: string;
  hallId?: string;
  active: boolean;
  isDemo?: boolean;
}

export interface DieMold {
  id: string;
  code: string;               // e.g. DIE-206-BRK01
  name: string;               // e.g. قالب سنبه ماتریس کشش براکت رادیاتور پژو ۲۰۶
  partId: string;             // قطعه تولیدی مرتبط
  partCode: string;
  partName: string;
  processType: ProcessType;   // نوع عملیات این قالب
  requiredTonnage: number;    // تناژ مورد نیاز پرس برای کار با این قالب (تن)
  compatibleMachineCodes?: string[]; // کدهای پرس‌های سازگار
  strokeLifeTarget: number;   // عمر اسمی قالب برحسب ضرب
  currentStrokes: number;     // کارکرد ضرب تا کنون
  status: 'READY' | 'UNDER_MAINTENANCE' | 'CALIBRATION';
  location: string;           // قفسه انبار قالب‌ها
  notes?: string;
  isDemo?: boolean;
}

export interface Part {
  id: string;
  code: string;               // e.g. IKCO-206-BRK01, SAPCO-COIL-ST14
  name: string;               // e.g. براکت دیاق سپر جلو ۲۰۶
  category: PartCategory;     // RAW_MATERIAL | WIP_PART | FINISHED_GOOD
  unit: UnitOfMeasure;        // KG | PCS
  weightPerUnitKg: number;    // وزن واحد به کیلوگرم
  sapcoCode?: string;         // کد تأمین ساپکو / ایران‌خودرو / سایپا
  carModel?: string;          // پژو ۲۰۶، تارا، دنا پلاس، شاهین، کوییک
  thicknessMm?: number;       // ضخامت ورق به میلیمتر
  materialGrade?: string;     // گرید فولاد: ST12, ST14, DX51D, ST37
  minStock?: number;          // حداقل موجودی اطمینان
  maxStock?: number;          // حداکثر ظرفیت انبار
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationStep {
  stepNumber: number;          // OP10, OP20, OP30...
  stepCode: string;            // OP10_SHEAR, OP20_BLANK...
  stepName: string;            // برش و نواربری، بلنکینگ، خم‌کاری، فرم‌دهی، جوش...
  processType: ProcessType;
  machineId?: string;
  machineName?: string;
  dieMoldId?: string;          // قالب پرس متصل به این مرحله
  dieMoldName?: string;
  requiredTonnage?: number;    // تناژ مورد نیاز پرس
  setupTimeMin?: number;       // زمان ستاپ و تعویض قالب (دقیقه)
  standardCycleTimeSec: number;// زمان استاندارد سیکل به ثانیه
  scrapNormPercent: number;    // نرم استاندارد ضایعات درصدی
  description?: string;
}

export interface Routing {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  version: string;
  operations: OperationStep[];
  notes?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Machine {
  id: string;
  code: string;               // PRS-800-01, BRK-160-02
  name: string;               // پرس هیدرولیک کشش عمیق ۸۰۰ تن
  capabilities: ProcessType[]; // قابلیت‌های چندگانه پرس (پانچ، خم، کشش، بلنکینگ بسته به قالب)
  processType: ProcessType;   // فرایند اصلی پیش‌فرض
  tonnage?: number;           // تناژ اسمی پرس (تن)
  bolsterSize?: string;       // ابعاد میز پرس (میلیمتر)
  strokeLengthMm?: number;    // کورس ضربه پرس (میلیمتر)
  strokesPerMinute?: number;  // سرعت ضربه (SPM)
  hallId?: string;            // سالن استقرار
  location: string;           // سالن پرس سنگین، سالن جوش، سالن رنگ
  status: MachineStatus;      // فعال، تعمیرات، متوقف
  operatorName?: string;      // اپراتور مسئول شیفت
  isDemo?: boolean;
  createdAt?: string;
}

export type VoucherType =
  | 'OPENING_BALANCE'         // موجودی اول دوره
  | 'RECEIPT'                 // رسید مواد اولیه یا ورودی محصول
  | 'ISSUE'                   // حواله مصرف مواد اولیه به سالن
  | 'PRODUCTION_OUTPUT'       // ثبت تولید سالم قطعه در مرحله
  | 'SCRAP'                   // ثبت ضایعات تولیدی
  | 'WIP_TRANSFER_DISPATCH'   // خروج قطعه نیمه‌ساخته به مرحله بعد
  | 'WIP_TRANSFER_RECEIPT'    // ورود و دریافت قطعه در مرحله مقصد
  | 'ADJUSTMENT';             // سند اصلاحی / تعدیل انبارگردانی

export type VoucherStatus = 'CONFIRMED' | 'REVERSED';

export interface InventoryTransaction {
  id: string;
  voucherNumber: string;      // شناسه یکتا مانند VCH-1405-00101
  voucherType: VoucherType;
  partId: string;
  partCode: string;
  partName: string;
  stageId: string;            // مرحله یا انبار مبدا/اصلی
  stageName: string;          // نام فارسی مرحله
  targetStageId?: string;     // مرحله مقصد در صورت انتقال
  targetStageName?: string;   // نام مرحله مقصد
  quantity: number;           // مقدار اصلی (مثبت یا منفی)
  unit: UnitOfMeasure;        // KG | PCS
  quantityKg: number;         // مقدار معادل کیلوگرم
  referenceDoc?: string;      // شماره بارنامه ساپکو، حواله انبار، دستور کار
  operatorName?: string;      // نام اپراتور / مسئول ثبت
  machineId?: string;         // کد ماشین‌آلات درگیر
  dieMoldId?: string;         // قالب پرس استفاده شده
  dieMoldName?: string;
  shift?: 'MORNING' | 'EVENING' | 'NIGHT';
  scrapReason?: string;       // علت ضایعات: پارگی کشش، چروکیدگی، ترک خم و...
  status: VoucherStatus;      // CONFIRMED | REVERSED
  reversalOfVoucherId?: string;
  notes?: string;
  createdByUid?: string;
  createdByName?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface StageInventorySummary {
  stageId: string;
  stageName: string;
  processType?: ProcessType;
  partId: string;
  partCode: string;
  partName: string;
  unit: UnitOfMeasure;
  totalQty: number;           // موجودی فیزیکی کل مرحله
  reservedQty: number;        // موجودی رزرو شده برای ارسال به مرحله بعد
  inTransitQty: number;       // موجودی در راه (ارسال شده و در انتظار تأیید مقصد)
  usableQty: number;          // موجودی آزاد و قابل استفاده در ایستگاه = totalQty - reservedQty
  totalKg: number;            // وزن کل به کیلوگرم
  scrapQty: number;           // مجموع ضایعات ثبت شده
  scrapRatePercent: number;   // درصد ضایعات به کل تولید
  lastActivityDate?: string;
}

export interface UserRoleProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'PRODUCTION_MANAGER' | 'WAREHOUSE_KEEPER' | 'QC_INSPECTOR' | 'LINE_SUPERVISOR';
  active: boolean;
  createdAt: string;
}

export const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  { id: 'PROC-SHEAR', code: 'SHEARING', name: 'برش و نواربری رول ورق', category: 'STAMPING', description: 'گیوتین، رول‌بازکن و فیدر تغذیه کلاف ساپکو' },
  { id: 'PROC-BLANK', code: 'BLANKING', name: 'بلنکینگ سنبه و ماتریس', category: 'STAMPING', description: 'تولید ورق شیت شکل‌یافته اولیه در پرس ضربه‌ای' },
  { id: 'PROC-DRAW', code: 'DRAWING', name: 'کشش عمیق هیدرولیک', category: 'FORMING', description: 'فرم‌دهی پوسته سه‌بعدی قطعات بدنه در پرس‌های تناژ بالا' },
  { id: 'PROC-PUNCH', code: 'PUNCH_FORM', name: 'پانچ، سوراخ‌کاری و پیرسینگ', category: 'STAMPING', description: 'ایجاد سوراخ‌های عبور مهره و شیارهای پیچ' },
  { id: 'PROC-BEND', code: 'BENDING', name: 'خم‌کاری با قالب و پرس برک', category: 'FORMING', description: 'خم‌های ۹۰ درجه، Z و فلنجینگ لبه‌ها' },
  { id: 'PROC-TRIM', code: 'TRIMMING', name: 'دوربری و پلیسه‌گیری لبه', category: 'STAMPING', description: 'جداسازی زواید ورق پس از فرآیند کشش' },
  { id: 'PROC-SPOT', code: 'SPOT_WELD', name: 'پرس‌جوش مقاومتی نقطه و مهره', category: 'JOINING', description: 'جوش مقاومتی مهره‌های M6, M8 و لچکی‌ها' },
  { id: 'PROC-CO2', code: 'CO2_WELD', name: 'جوشکاری دستی و رباتیک CO2', category: 'JOINING', description: 'جوشکاری پیوسته با گاز محافظ آرگون و CO2' },
  { id: 'PROC-PAINT', code: 'PAINT', name: 'رنگ‌آمیزی الکتروفورز کاتافورز (ED)', category: 'SURFACE_FINISH', description: 'شستشو ۸ مرحله‌ای و پوشش ضدخوردگی استاندارد ساپکو' },
  { id: 'PROC-ASSY', code: 'ASSEMBLY', name: 'مونتاژ، هِمینگ و بسته‌بندی', category: 'ASSEMBLY', description: 'هِمینگ لبه درب‌ها و بسته‌بندی در پالت‌های بارکددار ساپکو' },
];

export const FACTORY_HALLS: FactoryHall[] = [
  { id: 'HALL-RAW-STORE', code: 'HALL-01', name: 'انبار مرکزی مواد اولیه و کویل ساپکو', type: 'WAREHOUSE', supervisorName: 'حسین سلیمانی (انباردار مواد)', capacityDesc: 'ظرفیت ۲۰۰ تن ورق رول و شیت' },
  { id: 'HALL-SHEARING', code: 'HALL-02', name: 'سالن برشکاری، نواربری و آماده‌سازی بلنک', type: 'STAMPING', supervisorName: 'علی رضایی (سرپرست برش)', capacityDesc: '۲ خط رول‌بازکن و گیوتین ۳ متری' },
  { id: 'HALL-HEAVY-PRESS', code: 'HALL-03', name: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)', type: 'STAMPING', supervisorName: 'مهندس قنبری (سرپرست پرس سنگین)', capacityDesc: 'پرس هیدرولیک کشش و شولر ضربه‌ای' },
  { id: 'HALL-MEDIUM-PRESS', code: 'HALL-04', name: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)', type: 'STAMPING', supervisorName: 'حسین مرادی', capacityDesc: 'پرس‌های کلاچ پنوماتیک و خم‌کاری' },
  { id: 'HALL-WELDING', code: 'HALL-05', name: 'سالن جوشکاری رباتیک و پرس‌جوش مقاومتی', type: 'WELDING', supervisorName: 'مهندس اکبری', capacityDesc: 'سلول رباتیک یاسکاوا و دستگاه‌های اسپات ولد' },
  { id: 'HALL-CATAPHORESIS', code: 'HALL-06', name: 'سالن خط رنگ کاتافورز و پوشش ضدخوردگی ED', type: 'PAINT', supervisorName: 'مهندس طاهری', capacityDesc: 'تونل شستشو، فسفاته و کوره پخت ۲۰۰ درجه' },
  { id: 'HALL-ASSEMBLY-QC', code: 'HALL-07', name: 'سالن مونتاژ، هِمینگ و انبار محصول نهایی', type: 'ASSEMBLY', supervisorName: 'حمید رسولی', capacityDesc: 'باکس پالت‌های تحویل به خطوط خودروساز' },
];

export const FACTORY_STAGES = [
  { id: 'STAGE_RAW_STORE', name: 'انبار مواد اولیه ساپکو', type: 'STORE', unit: 'KG' },
  { id: 'STAGE_SHEARING', name: 'ایستگاه ۱: برش و نواربری ورق', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_BLANKING', name: 'ایستگاه ۲: پرس بلنکینگ', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_FORMING', name: 'ایستگاه ۳: پرس پانچ و فرم‌دهی', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_BENDING', name: 'ایستگاه ۴: پرس برک و خم‌کاری', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_SPOT_WELD', name: 'ایستگاه ۵: پرس‌جوش مقاومتی', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_CO2_WELD', name: 'ایستگاه ۶: خط جوشکاری CO2', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_PAINT', name: 'ایستگاه ۷: خط شستشو و رنگ کاتافورز', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_ASSEMBLY', name: 'ایستگاه ۸: مونتاژ مجموعه‌ها', type: 'WIP', unit: 'PCS' },
  { id: 'STAGE_FINISHED_STORE', name: 'انبار قطعات و محصولات نهایی', type: 'STORE', unit: 'PCS' },
  { id: 'STAGE_SCRAP_YARD', name: 'انبار ضایعات پرس و ورق', type: 'SCRAP', unit: 'KG' },
] as const;

export const SCRAP_REASONS = [
  'پارگی کشش عمیق در قالب پرس',
  'چروکیدگی ورق در شعاع خم',
  'عدم انطباق ابعادی سوراخ پانچ',
  'پاشش و سوختگی جوش CO2',
  'عدم استحکام نقطه جوش (عدم نفوذ)',
  'خط و خش و لهیدگی سطح ورق',
  'پوست پرتقالی و ریزش رنگ',
  'عیب مواد اولیه / عدم کشش‌پذیری ورق ساپکو',
  'خرابی یا انحراف روبیک قالب',
  'ضایعات راه‌اندازی و تنظیم خط'
];
