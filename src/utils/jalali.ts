/**
 * KPIMS Persian Jalali (Solar Hijri) Calendar Utilities
 * Standard astronomical conversion between Gregorian and Jalali dates
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formatted: string;
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * Converts a Gregorian Date to Jalali (Solar Hijri)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Format any ISO string, timestamp or Date into Persian Jalali string
 * e.g. "۱۴۰۳/۰۸/۰۹" or "۹ آبان ۱۴۰۳"
 */
export function formatToJalali(
  inputDate?: string | Date | null,
  options: { includeTime?: boolean; textualMonth?: boolean } = {}
): string {
  if (!inputDate) return '—';

  const d = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  if (isNaN(d.getTime())) return '—';

  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());

  const toPersianDigits = (num: number | string): string => {
    const persianMap: Record<string, string> = {
      '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
      '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
    };
    return String(num).replace(/[0-9]/g, w => persianMap[w] || w);
  };

  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (options.textualMonth) {
    const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
    let result = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
    if (options.includeTime) {
      const hours = padZero(d.getHours());
      const mins = padZero(d.getMinutes());
      result += ` - ساعت ${toPersianDigits(hours)}:${toPersianDigits(mins)}`;
    }
    return result;
  }

  let result = `${toPersianDigits(jy)}/${toPersianDigits(padZero(jm))}/${toPersianDigits(padZero(jd))}`;

  if (options.includeTime) {
    const hours = padZero(d.getHours());
    const mins = padZero(d.getMinutes());
    result += ` ${toPersianDigits(hours)}:${toPersianDigits(mins)}`;
  }

  return result;
}

/**
 * Returns current Jalali date object
 */
export function getCurrentJalaliDate(): JalaliDate {
  const now = new Date();
  const { jy, jm, jd } = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: JALALI_MONTH_NAMES[jm - 1],
    formatted: `${jy}/${padZero(jm)}/${padZero(jd)}`,
  };
}
