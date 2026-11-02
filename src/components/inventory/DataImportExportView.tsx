import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  Layers,
  Table,
  FileUp,
} from 'lucide-react';
import { formatNumber, toPersianDigits, exportToCsv } from '../../utils/formatters';

interface DataImportExportViewProps {
  currentUser: {
    uid: string;
    displayName: string;
  };
  onSuccess?: () => void;
}

export const DataImportExportView: React.FC<DataImportExportViewProps> = ({ currentUser, onSuccess }) => {
  const [activeMode, setActiveMode] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [templateType, setTemplateType] = useState<string>('PHYSICAL_COILS');
  const [templateData, setTemplateData] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Export mode state
  const [exportDataset, setExportDataset] = useState<'STOCK' | 'COILS' | 'CONTRACTS'>('COILS');
  const [exportFilterGrade, setExportFilterGrade] = useState<string>('ALL');
  const [exportPreviewList, setExportPreviewList] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchTemplate = async (type: string) => {
    try {
      const res = await fetch(`/api/inventory/import/templates/${type}`);
      const data = await res.json();
      if (data.success) {
        setTemplateData(data.data);
        if (data.data.sampleRows) {
          setPreviewRows(data.data.sampleRows);
        }
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    }
  };

  useEffect(() => {
    fetchTemplate(templateType);
    setValidationResult(null);
  }, [templateType]);

  // Load live data for Export Center
  useEffect(() => {
    if (activeMode !== 'EXPORT') return;
    setExportLoading(true);
    const endpoint =
      exportDataset === 'COILS'
        ? '/api/inventory/coils'
        : exportDataset === 'CONTRACTS'
        ? '/api/inventory/contracts'
        : '/api/inventory/stock-inquiry';

    fetch(endpoint)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setExportPreviewList(res.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setExportLoading(false));
  }, [activeMode, exportDataset]);

  // Parse uploaded CSV file into previewRows
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateData) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = String(evt.target?.result || '').replace(/^\uFEFF/, '');
      const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setNotification({
          type: 'error',
          message: 'فایل انتخاب‌شده فاقد ردیف داده است. لطفاً ابتدا فایل نمونه را دانلود و تکمیل نمایید.',
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const cols = templateData.columns || [];

      const parsed = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const matchedCol = cols.find(
            (c: any) => c.key.toLowerCase() === h.toLowerCase() || c.label === h
          );
          const targetKey = matchedCol ? matchedCol.key : h;
          const rawVal = values[idx] ?? '';
          const numVal = Number(rawVal);
          obj[targetKey] = rawVal !== '' && !Number.isNaN(numVal) && !rawVal.includes('-') ? numVal : rawVal;
        });
        return obj;
      });

      setPreviewRows(parsed);
      setValidationResult(null);
      setNotification({
        type: 'success',
        message: `تعداد ${toPersianDigits(parsed.length)} ردیف از فایل «${file.name}» با موفقیت خوانده شد. اکنون دکمه «بررسی و اعتبارسنجی» را بزنید.`,
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/inventory/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchType: templateType,
          rows: previewRows,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در بررسی اطلاعات' });
      } else {
        setValidationResult(data);
        if (data.invalidRowsCount === 0) {
          setNotification({
            type: 'success',
            message: 'همه ردیف‌ها معتبر هستند و هیچ خطایی وجود ندارد. می‌توانید دکمه «تایید و ثبت نهایی» را بزنید.',
          });
        } else {
          setNotification({
            type: 'error',
            message: `در ${toPersianDigits(data.invalidRowsCount)} ردیف خطا مشاهده شد. لطفاً جدول خطاها در پایین را بررسی کنید.`,
          });
        }
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validRowsCount === 0) return;
    setIsConfirming(true);
    try {
      const validPayloads = validationResult.validatedRows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.payload);

      const res = await fetch('/api/inventory/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: `BATCH-${Date.now()}`,
          batchType: templateType,
          validRows: validPayloads,
          user: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در ثبت اطلاعات در پایگاه داده' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setValidationResult(null);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    if (!templateData) return;
    const cols = templateData.columns || [];
    const headers = cols.map((c: any) => c.key).join(',');
    const sampleRows = (templateData.sampleRows || []).map((row: any) =>
      cols.map((c: any) => `"${row[c.key] ?? ''}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قالب_ورود_${templateType}.csv`;
    a.click();
  };

  const handleExecuteExport = () => {
    if (exportDataset === 'COILS') {
      const rows = exportPreviewList
        .filter(c => exportFilterGrade === 'ALL' || c.materialGrade === exportFilterGrade)
        .map(c => [
          c.coilId,
          c.coilPackNumber,
          c.partName || 'ورق فولادی',
          c.materialGrade,
          c.thicknessMm,
          c.widthMm,
          c.originalWeightKg,
          c.remainingWeightKg,
          c.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه',
          (c.allocations || []).map((a: any) => `${a.contractNumber || a.contractId}:${a.allocatedWeightKg}kg`).join(' | ') || 'آزاد',
        ]);
      exportToCsv(
        `گزارش_رول_و_کویل_پک_${Date.now()}`,
        [
          'کد رول فیزیکی',
          'شماره کویل‌پک',
          'نام کالا',
          'جنس / گرید ورق',
          'ضخامت (mm)',
          'عرض (mm)',
          'وزن اولیه (kg)',
          'وزن باقی‌مانده (kg)',
          'نوع مالکیت',
          'قراردادهای متصل',
        ],
        rows
      );
    } else if (exportDataset === 'CONTRACTS') {
      const rows = exportPreviewList.map(c => [
        c.contractNumber,
        c.title,
        c.customerName || 'ساپکو',
        c.materialGrade,
        c.allocatedWeightKg,
        c.totalReceivedKg,
        c.totalConsumedKg,
        c.closingBalanceKg,
        c.status,
      ]);
      exportToCsv(
        `گزارش_قراردادها_${Date.now()}`,
        [
          'شماره قرارداد',
          'عنوان قرارداد',
          'نام مشتری / کارفرما',
          'گرید ورق',
          'سقف سهمیه (kg)',
          'ورودی کل (kg)',
          'مصرف‌شده (kg)',
          'مانده تعهد (kg)',
          'وضعیت',
        ],
        rows
      );
    } else {
      const rows = exportPreviewList.map(b => [
        b.partCode,
        b.partName,
        b.warehouseName,
        b.lotNumber || '—',
        b.contractNumber || '—',
        b.physicalQty,
        b.availableQty,
        b.unit,
        b.physicalKg,
      ]);
      exportToCsv(
        `گزارش_موجودی_انبار_${Date.now()}`,
        ['کد کالا', 'نام کالا', 'انبار', 'کویل‌پک / بچ', 'قرارداد', 'موجودی فیزیکی', 'موجودی آزاد', 'واحد', 'وزن کل (kg)'],
        rows
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>مرکز ورود اطلاعات از اکسل و دریافت خروجی‌های سفارشی</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ورود گروهی رول‌ها، کالاها و قراردادها همراه با جدول راهنمای فارسی ستون‌به‌ستون و پیش‌نمایش جدولی پیش از ثبت
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('IMPORT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'IMPORT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>۱. ورود اطلاعات به سیستم (Import)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('EXPORT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'EXPORT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>۲. دریافت خروجی اکسل (Export)</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {activeMode === 'IMPORT' ? (
        <div className="space-y-5">
          {/* Step 1 & 2: Choose Type & Download Template */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  گام اول: نوع اطلاعاتی که می‌خواهید وارد کنید را انتخاب نمایید
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  پس از انتخاب نوع اطلاعات، فایل نمونه اکسل (CSV) را دانلود کرده و طبق راهنمای ستون‌ها تکمیل کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل نمونه اکسل (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'PHYSICAL_COILS', label: 'رول‌های ورق و کویل‌پک' },
                { id: 'CONTRACTS', label: 'قراردادها و سهمیه‌ها' },
                { id: 'ITEMS', label: 'کالاها، ورق و پیچ و مهره' },
                { id: 'STOCK_COUNT', label: 'شمارش موجودی انبار' },
                { id: 'BOM', label: 'فرمول ساخت (BOM)' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateType(t.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    templateType === t.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Persian Column Guide Table */}
          {templateData && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Info className="w-4 h-4 text-blue-600" />
                <span>گام دوم: راهنمای فارسی ستون‌های فایل «{templateData.title}»</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">عنوان فارسی ستون</th>
                      <th className="py-2.5 px-3">نام ستون در فایل</th>
                      <th className="py-2.5 px-3">الزامی / اختیاری</th>
                      <th className="py-2.5 px-3">مثال معتبر</th>
                      <th className="py-2.5 px-3">توضیح به زبان ساده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(templateData.columns || []).map((col: any) => (
                      <tr key={col.key} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{col.label}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-700">{col.key}</td>
                        <td className="py-2.5 px-3">
                          {col.required ? (
                            <span className="text-rose-600 font-semibold">الزامی (*)</span>
                          ) : (
                            <span className="text-slate-500">اختیاری</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700">{String(col.example ?? '—')}</td>
                        <td className="py-2.5 px-3 text-slate-600">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4 & 5: File Upload + Visual Table Preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  گام سوم: بارگذاری فایل تکمیل‌شده و پیش‌نمایش جدولی اطلاعات
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  فایل CSV/Excel خود را انتخاب کنید یا داده‌های نمونه آماده در جدول زیر را بررسی و ثبت نمایید.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  <FileUp className="w-4 h-4 text-slate-600" />
                  <span>انتخاب فایل از کامپیوتر (.csv)</span>
                  <input type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || previewRows.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isValidating ? 'در حال بررسی...' : 'بررسی و اعتبارسنجی ردیف‌ها'}</span>
                </button>
              </div>
            </div>

            {/* Visual Table Preview (No Raw JSON Needed!) */}
            {previewRows.length > 0 && templateData && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12">ردیف</th>
                      {(templateData.columns || []).map((c: any) => (
                        <th key={c.key} className="py-2 px-3">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                        {(templateData.columns || []).map((c: any) => (
                          <td key={c.key} className="py-2 px-3 font-mono text-slate-800">
                            <input
                              type="text"
                              value={row[c.key] ?? ''}
                              onChange={e => {
                                const next = [...previewRows];
                                next[idx] = { ...next[idx], [c.key]: e.target.value };
                                setPreviewRows(next);
                              }}
                              className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded focus:outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Step 6 & 7: Validation Results & Confirm Import */}
            {validationResult && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4 text-xs">
                    <span>
                      کل ردیف‌ها: <strong className="font-mono">{formatNumber(validationResult.totalRows)}</strong>
                    </span>
                    <span className="text-emerald-700">
                      معتبر و آماده ثبت: <strong className="font-mono">{formatNumber(validationResult.validRowsCount)}</strong>
                    </span>
                    <span className="text-rose-600">
                      دارای خطا: <strong className="font-mono">{formatNumber(validationResult.invalidRowsCount)}</strong>
                    </span>
                  </div>

                  {validationResult.validRowsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {isConfirming
                          ? 'در حال ثبت در سیستم...'
                          : `تایید و ثبت نهایی (${toPersianDigits(validationResult.validRowsCount)} ردیف)`}
                      </span>
                    </button>
                  )}
                </div>

                {validationResult.invalidRowsCount > 0 && (
                  <div className="space-y-1.5">
                    {validationResult.validatedRows
                      .filter((r: any) => !r.isValid)
                      .map((r: any) => (
                        <div
                          key={r.rowIndex}
                          className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between"
                        >
                          <span className="font-bold">ردیف شماره {toPersianDigits(r.rowIndex)}:</span>
                          <span>{r.errors.join(' ، ')}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: Export Builder */
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">دریافت خروجی اکسل (CSV استاندارد فارسی)</h3>
              <p className="text-slate-500 mt-0.5">
                گزارش مورد نظر خود را انتخاب کرده، پیش‌نمایش را مشاهده کنید و فایل اکسل را دانلود نمایید.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExecuteExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل اکسل (CSV)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'COILS', title: 'لیست رول‌های ورق و کویل‌پک‌ها', desc: 'شامل کد کویل‌پک، ضخامت، جنس، وزن باقی‌مانده و قراردادها' },
              { id: 'STOCK', title: 'موجودی لحظه‌ای همه انبارها', desc: 'شامل ورق، پیچ و مهره، لاستیک و قطعات محصول نهایی' },
              { id: 'CONTRACTS', title: 'وضعیت قراردادها و تعهدات', desc: 'شامل سقف قرارداد، مقدار دریافتی، مصرفی و مانده' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExportDataset(item.id as any)}
                className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                  exportDataset === item.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">{item.title}</div>
                <div className={`text-[11px] mt-1 ${exportDataset === item.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 text-slate-500">
            تعداد رکوردهای آماده خروجی: <strong className="text-slate-900 font-mono">{formatNumber(exportPreviewList.length)}</strong> ردیف
            {exportLoading && <span className="mr-2">(در حال بارگذاری...)</span>}
          </div>
        </div>
      )}
    </div>
  );
};
