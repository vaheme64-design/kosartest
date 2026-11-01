import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Layers,
  TrendingUp,
  Boxes,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  Download,
  Eye,
  Info,
  Scale,
  Percent,
} from 'lucide-react';
import {
  ReportFilterParams,
  ReportMeta,
  PlanVsActualItem,
  CustomerOrderFulfillmentItem,
  ProductionBacklogItem,
  WipByPartAndOperationItem,
  WipAgingItem,
  MaterialConsumptionVsStandardItem,
  SapcoMaterialAccountItem,
  InventoryValuationQuantitiesItem,
  ScrapByPartAndOperationItem,
  MachineWorkloadCapacityItem,
  ProductionDelaysItem,
  InventoryMovementItem,
  InventoryReconciliationItem,
} from '../../types/managementReports';
import { Part, Machine } from '../../types/inventory';
import { ReportFiltersBar } from './ReportFiltersBar';
import { DrillDownModal, DrillDownData } from './DrillDownModal';
import { exportToCsv } from '../../utils/csvExport';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';

export type ReportTypeKey =
  | 'plan_vs_actual'
  | 'fulfillment'
  | 'backlog'
  | 'wip_operation'
  | 'wip_aging'
  | 'consumption'
  | 'sapco_account'
  | 'valuation_qty'
  | 'scrap_analysis'
  | 'machine_workload'
  | 'delays'
  | 'movements'
  | 'reconciliation';

interface ManagementReportsModuleViewProps {
  parts: Part[];
  machines: Machine[];
  initialReportType?: ReportTypeKey;
}

export const ManagementReportsModuleView: React.FC<ManagementReportsModuleViewProps> = ({
  parts,
  machines,
  initialReportType = 'plan_vs_actual',
}) => {
  const [activeReport, setActiveReport] = useState<ReportTypeKey>(initialReportType);
  const [filters, setFilters] = useState<ReportFilterParams>({});
  const [loading, setLoading] = useState(false);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);

  // Report Data Stores
  const [planVsActualData, setPlanVsActualData] = useState<PlanVsActualItem[]>([]);
  const [fulfillmentData, setFulfillmentData] = useState<CustomerOrderFulfillmentItem[]>([]);
  const [backlogData, setBacklogData] = useState<ProductionBacklogItem[]>([]);
  const [wipOpData, setWipOpData] = useState<WipByPartAndOperationItem[]>([]);
  const [wipAgingData, setWipAgingData] = useState<WipAgingItem[]>([]);
  const [consumptionData, setConsumptionData] = useState<MaterialConsumptionVsStandardItem[]>([]);
  const [sapcoAccountData, setSapcoAccountData] = useState<SapcoMaterialAccountItem[]>([]);
  const [valuationData, setValuationData] = useState<InventoryValuationQuantitiesItem[]>([]);
  const [scrapData, setScrapData] = useState<ScrapByPartAndOperationItem[]>([]);
  const [machineData, setMachineData] = useState<MachineWorkloadCapacityItem[]>([]);
  const [delaysData, setDelaysData] = useState<ProductionDelaysItem[]>([]);
  const [movementsData, setMovementsData] = useState<InventoryMovementItem[]>([]);
  const [reconciliationData, setReconciliationData] = useState<InventoryReconciliationItem[]>([]);

  // Drill-down Modal State
  const [drillDownItem, setDrillDownItem] = useState<DrillDownData | null>(null);

  const reportDefinitions: { id: ReportTypeKey; title: string; category: string }[] = [
    { id: 'plan_vs_actual', title: '۱. تطبیق برنامه در برابر تولید واقعی (Plan vs Actual)', category: 'تولید' },
    { id: 'fulfillment', title: '۲. وضعیت تحقق سفارشات مشتریان (ساپکو/سایپا)', category: 'فروش' },
    { id: 'backlog', title: '۳. تعهدات معوق و عقب‌افتاده تولید (Backlog)', category: 'فروش' },
    { id: 'wip_operation', title: '۴. کار در جریان ساخت به تفکیک قطعه و مرحله (WIP)', category: 'تولید' },
    { id: 'wip_aging', title: '۵. سن‌یابی و ماندگاری اقلام در خطوط (WIP Aging)', category: 'تولید' },
    { id: 'consumption', title: '۶. مصرف مواد در برابر استاندارد مهندسی', category: 'مواد' },
    { id: 'sapco_account', title: '۷. حساب و بیلان امانی کلاف‌های ساپکو', category: 'مواد' },
    { id: 'valuation_qty', title: '۸. تفکیک مقداری موجودی انبارها و قرنطینه', category: 'انبار' },
    { id: 'scrap_analysis', title: '۹. ضایعات به تفکیک قطعه و مرحله عملیات', category: 'کیفیت' },
    { id: 'machine_workload', title: '۱۰. لود کاری و ظرفیت آزاد ماشین‌آلات پرس', category: 'ماشین‌آلات' },
    { id: 'delays', title: '۱۱. گزارش تأخیرات تولید و علل انحرافات', category: 'برنامه‌ریزی' },
    { id: 'movements', title: '۱۲. کاردکس و گردش تحلیلی اسناد انبار', category: 'انبار' },
    { id: 'reconciliation', title: '۱۳. انبارگردانی و موازنه مغایرت فیزیکی', category: 'انبار' },
  ];

  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.partId) queryParams.append('partId', filters.partId);
      if (filters.customerName) queryParams.append('customerName', filters.customerName);
      if (filters.machineId) queryParams.append('machineId', filters.machineId);
      if (filters.processType) queryParams.append('processType', filters.processType);
      if (filters.status) queryParams.append('status', filters.status);

      let endpoint = '';
      switch (activeReport) {
        case 'plan_vs_actual':
          endpoint = `/api/reports/plan-vs-actual?${queryParams}`;
          break;
        case 'fulfillment':
          endpoint = `/api/reports/customer-order-fulfillment?${queryParams}`;
          break;
        case 'backlog':
          endpoint = `/api/reports/production-backlog?${queryParams}`;
          break;
        case 'wip_operation':
          endpoint = `/api/reports/wip-by-part-operation?${queryParams}`;
          break;
        case 'wip_aging':
          endpoint = `/api/reports/wip-aging?${queryParams}`;
          break;
        case 'consumption':
          endpoint = `/api/reports/material-consumption-vs-standard?${queryParams}`;
          break;
        case 'sapco_account':
          endpoint = `/api/reports/sapco-material-account?${queryParams}`;
          break;
        case 'valuation_qty':
          endpoint = `/api/reports/inventory-valuation-quantities?${queryParams}`;
          break;
        case 'scrap_analysis':
          endpoint = `/api/reports/scrap-by-part-operation?${queryParams}`;
          break;
        case 'machine_workload':
          endpoint = `/api/reports/machine-workload-capacity?${queryParams}`;
          break;
        case 'delays':
          endpoint = `/api/reports/production-delays?${queryParams}`;
          break;
        case 'movements':
          endpoint = `/api/reports/inventory-movements?${queryParams}`;
          break;
        case 'reconciliation':
          endpoint = `/api/reports/inventory-reconciliation?${queryParams}`;
          break;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setReportMeta(data.meta);
        if (activeReport === 'plan_vs_actual') setPlanVsActualData(data.data);
        else if (activeReport === 'fulfillment') setFulfillmentData(data.data);
        else if (activeReport === 'backlog') setBacklogData(data.data);
        else if (activeReport === 'wip_operation') setWipOpData(data.data);
        else if (activeReport === 'wip_aging') setWipAgingData(data.data);
        else if (activeReport === 'consumption') setConsumptionData(data.data);
        else if (activeReport === 'sapco_account') setSapcoAccountData(data.data);
        else if (activeReport === 'valuation_qty') setValuationData(data.data);
        else if (activeReport === 'scrap_analysis') setScrapData(data.data);
        else if (activeReport === 'machine_workload') setMachineData(data.data);
        else if (activeReport === 'delays') setDelaysData(data.data);
        else if (activeReport === 'movements') setMovementsData(data.data);
        else if (activeReport === 'reconciliation') setReconciliationData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReport();
  }, [activeReport, filters]);

  // Export Table to Excel CSV
  const handleExportCsv = () => {
    const filename = `KPIMS_${activeReport}_${new Date().toISOString().slice(0, 10)}`;

    switch (activeReport) {
      case 'plan_vs_actual': {
        const headers = ['شماره برنامه', 'نسخه', 'کد قطعه', 'نام قطعه', 'تیراژ مصوب', 'تولید واقعی', 'ضایعات', 'درصد تحقق', 'انحراف', 'موعد تحویل'];
        const rows = planVsActualData.map(r => [
          r.planNumber,
          r.planVersion,
          r.partCode,
          r.partName,
          r.plannedQuantity,
          r.actualProducedQuantity,
          r.actualScrapQuantity,
          `${r.achievementRatePercent}%`,
          r.varianceQuantity,
          r.targetDueDate,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'fulfillment': {
        const headers = ['شماره سفارش', 'قرارداد', 'مشتری', 'کد قطعه', 'نام قطعه', 'سفارش داده شده', 'تحویل شده', 'باقیمانده', 'درصد تحقق', 'موعد تحویل', 'تأخیر (روز)'];
        const rows = fulfillmentData.map(r => [
          r.orderNumber,
          r.contractNumber,
          r.customerName,
          r.partCode,
          r.partName,
          r.orderedQuantity,
          r.deliveredQuantity,
          r.remainingQuantity,
          `${r.fulfillmentPercent}%`,
          r.dueDate,
          r.daysOverdue,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'backlog': {
        const headers = ['شماره سفارش', 'مشتری', 'قرارداد', 'کد قطعه', 'نام قطعه', 'تعداد معوق', 'موعد تحویل', 'روزهای تأخیر', 'ورق مورد نیاز (kg)', 'سطح فوریت'];
        const rows = backlogData.map(r => [
          r.orderNumber,
          r.customerName,
          r.contractNumber,
          r.partCode,
          r.partName,
          r.backlogQuantity,
          r.dueDate,
          r.daysOverdue,
          r.requiredRawMaterialKg,
          r.urgencyLevel,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'wip_operation': {
        const headers = ['شماره MO', 'کد قطعه', 'نام قطعه', 'مرحله', 'فرایند', 'موقعیت انبارش', 'در صف ورودی', 'پای دستگاه', 'آماده انتقال', 'منتقل شده', 'کل WIP فعال'];
        const rows = wipOpData.map(r => [
          r.moNumber,
          r.partCode,
          r.partName,
          `OP${r.stepNumber} - ${r.stepName}`,
          r.processType,
          r.warehouseLocation,
          r.waitingInputQty,
          r.inProgressQty,
          r.readyForTransferQty,
          r.transferredQty,
          r.totalActiveWipQty,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'wip_aging': {
        const headers = ['شماره MO', 'کد قطعه', 'نام قطعه', 'مرحله', 'موقعیت', 'موجودی در ایستگاه', 'ساعت توقف', 'روز توقف', 'رده سنی', 'سطح هشدار'];
        const rows = wipAgingData.map(r => [
          r.moNumber,
          r.partCode,
          r.partName,
          r.stepName,
          r.warehouseLocation,
          r.quantityInStation,
          r.idleHours,
          r.idleDays,
          r.ageCategory,
          r.statusSeverity,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'consumption': {
        const headers = ['شماره MO', 'کد قطعه', 'نام قطعه', 'گرید ورق', 'تولید سالم', 'مصرف استاندارد (kg)', 'مصرف واقعی (kg)', 'انحراف (kg)', 'انحراف درصدی'];
        const rows = consumptionData.map(r => [
          r.moNumber,
          r.partCode,
          r.partName,
          r.materialGrade,
          r.totalProducedPieces,
          r.theoreticalStandardConsumptionKg,
          r.actualIssuedMaterialKg,
          r.varianceKg,
          `${r.variancePercent}%`,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'sapco_account': {
        const headers = ['شماره قرارداد', 'عنوان تخصیص', 'گرید فولاد', 'سهمیه مصوب (kg)', 'اول دوره (kg)', 'رسید (kg)', 'مصرف (kg)', 'مانده دفتری (kg)', 'موجودی فیزیکی کارخانه (kg)', 'مغایرت (kg)'];
        const rows = sapcoAccountData.map(r => [
          r.contractNumber,
          r.title,
          r.materialGrade,
          r.allocatedQuotaKg,
          r.openingBalanceKg,
          r.totalReceivedKg,
          r.totalIssuedKg,
          r.closingBookBalanceKg,
          r.physicalStockInPlantKg,
          r.discrepancyKg,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'valuation_qty': {
        const headers = ['طبقه‌بندی', 'کد قلم', 'شرح قلم', 'واحد', 'موجودی فیزیکی', 'ملکی کارخانه', 'امانی ساپکو', 'مسدود کیفی', 'رزرو سفارشات', 'موجودی آزاد قابل تخصیص', 'وزن کل (kg)'];
        const rows = valuationData.map(r => [
          r.category,
          r.partOrMaterialCode,
          r.description,
          r.unit,
          r.physicalQuantity,
          r.companyOwnedQuantity,
          r.sapcoConsignmentQuantity,
          r.qualityBlockedQuantity,
          r.reservedQuantity,
          r.availableFreeQuantity,
          r.totalPhysicalWeightKg,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'scrap_analysis': {
        const headers = ['کد قطعه', 'نام قطعه', 'مرحله', 'فرایند', 'ماشین', 'کل ورودی', 'تعداد ضایعات', 'وزن ضایعات (kg)', 'نرم مجاز %', 'درصد واقعی ضایعات', 'علت شایع نقص'];
        const rows = scrapData.map(r => [
          r.partCode,
          r.partName,
          `OP${r.stepNumber} - ${r.stepName}`,
          r.processType,
          r.machineName || r.machineCode || '-',
          r.totalInputQty,
          r.scrapPieces,
          r.scrapWeightKg,
          `${r.scrapNormPercent}%`,
          `${r.actualScrapPercent}%`,
          r.commonScrapDefectType || '-',
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'machine_workload': {
        const headers = ['کد دستگاه', 'نام دستگاه پرس', 'سالن', 'فرایند', 'تناژ (تن)', 'ظرفیت اسمی روزانه (h)', 'ساعت کار برنامه‌ریزی‌شده', 'ظرفیت آزاد (h)', 'درصد بهره‌وری', 'وضعیت دستگاه'];
        const rows = machineData.map(r => [
          r.machineCode,
          r.machineName,
          r.hall,
          r.processType,
          r.tonnage || '-',
          r.nominalDailyCapacityHours,
          r.scheduledWorkloadHours,
          r.availableCapacityHours,
          `${r.utilizationRatePercent}%`,
          r.machineStatus,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'delays': {
        const headers = ['نوع سند', 'شماره مرجع', 'مشتری / برنامه', 'کد قطعه', 'نام قطعه', 'تیراژ', 'موعد مصوب', 'تکمیل تخمینی', 'روزهای تأخیر', 'علت اصلی تأخیر'];
        const rows = delaysData.map(r => [
          r.documentType,
          r.referenceNumber,
          r.customerOrPlan,
          r.partCode,
          r.partName,
          r.quantity,
          r.plannedDueDate,
          r.estimatedCompletionDate,
          r.delayDays,
          r.primaryDelayCause,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'movements': {
        const headers = ['شناسه تراکنش', 'شماره سند', 'تاریخ تراکنش', 'نوع سند', 'کد قلم', 'نام قلم', 'مقدار', 'واحد', 'مبدأ', 'مقصد', 'مالکیت', 'کاربر ثبت‌کننده'];
        const rows = movementsData.map(r => [
          r.transactionId,
          r.documentNumber,
          r.transactionDate,
          r.documentType,
          r.partCode,
          r.partName,
          r.quantity,
          r.unit,
          r.sourceLocation,
          r.targetLocation,
          r.ownership,
          r.operatorOrUser,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
      case 'reconciliation': {
        const headers = ['کد انبار/موقعیت', 'نام انبار', 'کد قطعه', 'نام قطعه', 'موجودی دفتری', 'شمارش فیزیکی', 'مغایرت', 'وضعیت موازنه', 'تاریخ انبارگردانی', 'مسئول ممیزی'];
        const rows = reconciliationData.map(r => [
          r.locationCode,
          r.warehouseName,
          r.partCode,
          r.partName,
          r.bookQuantity,
          r.physicalCountQuantity,
          r.varianceQuantity,
          r.reconciliationStatus,
          r.lastReconciledAt,
          r.reconciledBy,
        ]);
        exportToCsv(filename, headers, rows);
        break;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                سامانه گزارشات مدیریتی و نظارت و کنترل تولید (KPIMS Management Reports)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ۱۳ گزارش تحلیلی، تطبیق برنامه و واقعی، بیلان امانی ساپکو، گردش اسناد و ممیزی انبارگردانی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchActiveReport}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی داده‌ها
            </button>
          </div>
        </div>
      </div>

      {/* Report Selector Dropdown / Pills */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">انتخاب نوع گزارش:</span>
            <select
              value={activeReport}
              onChange={e => setActiveReport(e.target.value as ReportTypeKey)}
              className="bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs rounded-lg px-3 py-2 w-full sm:w-auto focus:outline-none focus:border-amber-500"
            >
              {reportDefinitions.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Report Metadata Status Badge */}
          {reportMeta && (
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
              <span>
                تاریخ تولید گزارش:{' '}
                <strong className="text-slate-200">{formatToJalali(reportMeta.generatedAt)}</strong>
              </span>
              <span>
                تعداد رکوردها:{' '}
                <strong className="text-amber-400 font-mono">{toPersianDigits(reportMeta.totalRecordsCount)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <ReportFiltersBar
        parts={parts}
        machines={machines}
        filters={filters}
        onFilterChange={setFilters}
        onExportCsv={handleExportCsv}
        isExporting={loading}
      />

      {/* Main Report Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100">
              {reportDefinitions.find(r => r.id === activeReport)?.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              ● مقادیر قطعی واقعی
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              ▲ مقادیر برآوردی/تخمینی
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* 1. Plan vs Actual */}
          {activeReport === 'plan_vs_actual' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره برنامه و نسخه</th>
                  <th className="py-3 px-3">کد و نام قطعه</th>
                  <th className="py-3 px-3 text-center">تیراژ مصوب</th>
                  <th className="py-3 px-3 text-center text-emerald-400">تولید واقعی سالم</th>
                  <th className="py-3 px-3 text-center text-rose-400">ضایعات</th>
                  <th className="py-3 px-3 text-center font-bold">درصد تحقق</th>
                  <th className="py-3 px-3 text-center">انحراف</th>
                  <th className="py-3 px-3 text-center">نوع داده</th>
                  <th className="py-3 px-3 text-center">موعد تحویل</th>
                  <th className="py-3 px-3 text-center">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {planVsActualData.map(r => (
                  <tr
                    key={r.planId}
                    onClick={() =>
                      setDrillDownItem({
                        title: `سند برنامه تولید: ${r.planNumber} (${r.planVersion})`,
                        subtitle: `${r.partName} - موعد تحویل: ${formatToJalali(r.targetDueDate)}`,
                        badge: { text: r.status, color: 'bg-amber-500/20 text-amber-300' },
                        fields: [
                          { label: 'کد قطعه', value: r.partCode, isMono: true },
                          { label: 'تیراژ مصوب برنامه', value: r.plannedQuantity, isHighlight: true },
                          { label: 'تولید واقعی تایید شده', value: r.actualProducedQuantity, isHighlight: true },
                          { label: 'تعداد ضایعات ثبت شده', value: r.actualScrapQuantity },
                          { label: 'درصد تحقق برنامه', value: `${r.achievementRatePercent}%` },
                          { label: 'انحراف از برنامه', value: r.varianceQuantity },
                        ],
                        detailsList: [
                          {
                            title: 'دستور کارهای مرتبط (Manufacturing Orders):',
                            lines: r.linkedMoNumbers.map(m => ({ label: 'شماره MO', value: m })),
                          },
                        ],
                      })
                    }
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100">{r.planNumber}</span>{' '}
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                        {r.planVersion}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {formatNumber(r.plannedQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-400">
                      {formatNumber(r.actualProducedQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-400">
                      {formatNumber(r.actualScrapQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-100">
                      {toPersianDigits(r.achievementRatePercent)}%
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-bold ${
                        r.varianceQuantity < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatNumber(r.varianceQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {r.isEstimate ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          ▲ برآوردی
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ● قطعی واقعی
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-300">
                      {formatToJalali(r.targetDueDate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Eye className="w-4 h-4 text-amber-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 2. Customer Order Fulfillment */}
          {activeReport === 'fulfillment' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره سفارش و قرارداد</th>
                  <th className="py-3 px-3">مشتری</th>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3 text-center">تعهد سفارش</th>
                  <th className="py-3 px-3 text-center text-emerald-400">تحویل شده</th>
                  <th className="py-3 px-3 text-center text-amber-400">باقیمانده</th>
                  <th className="py-3 px-3 text-center font-bold">درصد تحقق</th>
                  <th className="py-3 px-3 text-center">موعد تحویل</th>
                  <th className="py-3 px-3 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {fulfillmentData.map(r => (
                  <tr key={r.orderLineId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100">{r.orderNumber}</span>
                      <div className="text-[11px] text-slate-400">{r.contractNumber}</div>
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-200">{r.customerName}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{formatNumber(r.orderedQuantity)}</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">{formatNumber(r.deliveredQuantity)}</td>
                    <td className="py-3 px-3 text-center text-amber-400 font-black">{formatNumber(r.remainingQuantity)}</td>
                    <td className="py-3 px-3 text-center font-black">{toPersianDigits(r.fulfillmentPercent)}%</td>
                    <td className="py-3 px-3 text-center font-sans text-[11px]">{formatToJalali(r.dueDate)}</td>
                    <td className="py-3 px-3 text-center font-sans">
                      {r.isDelayed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {toPersianDigits(r.daysOverdue)} روز تأخیر
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          مطابق برنامه
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 3. Production Backlog */}
          {activeReport === 'backlog' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره سفارش</th>
                  <th className="py-3 px-3">مشتری و خودرو</th>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3 text-center text-amber-400 font-bold">تعداد معوق (Backlog)</th>
                  <th className="py-3 px-3 text-center">ورق مورد نیاز (kg)</th>
                  <th className="py-3 px-3 text-center text-rose-400">روزهای گذشته از موعد</th>
                  <th className="py-3 px-3 text-center">سطح فوریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {backlogData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.orderNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.customerName}</div>
                      <div className="text-[11px] text-slate-400">{r.carModel || '-'}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-amber-400 text-sm">
                      {formatNumber(r.backlogQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.requiredRawMaterialKg)} kg</td>
                    <td className="py-3 px-3 text-center text-rose-400 font-bold">
                      {toPersianDigits(r.daysOverdue)} روز
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.urgencyLevel === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {r.urgencyLevel === 'CRITICAL' ? 'بحرانی' : 'اولویت بالا'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 4. WIP by Part & Operation */}
          {activeReport === 'wip_operation' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره MO</th>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3">مرحله و فرایند</th>
                  <th className="py-3 px-3">موقعیت انبارش</th>
                  <th className="py-3 px-3 text-center">در صف ورودی</th>
                  <th className="py-3 px-3 text-center text-amber-400">پای دستگاه</th>
                  <th className="py-3 px-3 text-center text-cyan-400">آماده انتقال</th>
                  <th className="py-3 px-3 text-center font-black text-purple-400">کل WIP فعال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {wipOpData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.moNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-amber-400 font-mono">OP{r.stepNumber}</span> - {r.stepName}
                      <span className="block text-[10px] text-slate-400 font-mono">{r.processType}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{r.warehouseLocation}</td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.waitingInputQty)}</td>
                    <td className="py-3 px-3 text-center text-amber-400 font-bold">{formatNumber(r.inProgressQty)}</td>
                    <td className="py-3 px-3 text-center text-cyan-400 font-bold">{formatNumber(r.readyForTransferQty)}</td>
                    <td className="py-3 px-3 text-center font-black text-purple-400 text-sm bg-purple-500/5">
                      {formatNumber(r.totalActiveWipQty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. WIP Aging */}
          {activeReport === 'wip_aging' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره MO</th>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3">مرحله کارگاهی</th>
                  <th className="py-3 px-3">موقعیت انبارش</th>
                  <th className="py-3 px-3 text-center">موجودی در ایستگاه</th>
                  <th className="py-3 px-3 text-center text-amber-400">مدت توقف (روز)</th>
                  <th className="py-3 px-3 text-center">رده سنی</th>
                  <th className="py-3 px-3 text-center">وضعیت انباشت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {wipAgingData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.moNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-200">{r.stepName}</td>
                    <td className="py-3 px-3 text-slate-300">{r.warehouseLocation}</td>
                    <td className="py-3 px-3 text-center font-bold">{formatNumber(r.quantityInStation)}</td>
                    <td className="py-3 px-3 text-center text-amber-400 font-black text-sm">
                      {toPersianDigits(r.idleDays)} روز
                    </td>
                    <td className="py-3 px-3 text-center font-sans text-[11px]">
                      {r.ageCategory === 'OVER_7_DAYS_STAGNANT'
                        ? 'بیش از ۷ روز (راکد)'
                        : r.ageCategory === '3_TO_7_DAYS'
                        ? '۳ تا ۷ روز'
                        : 'کمتر از ۳ روز'}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.statusSeverity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : r.statusSeverity === 'ATTENTION'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {r.statusSeverity === 'CRITICAL' ? 'ایستگاه بحرانی' : r.statusSeverity === 'ATTENTION' ? 'نیازمند تسریع' : 'عادی'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 6. Material Consumption vs Standard */}
          {activeReport === 'consumption' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره MO</th>
                  <th className="py-3 px-3">قطعه و گرید</th>
                  <th className="py-3 px-3 text-center">تولید سالم</th>
                  <th className="py-3 px-3 text-center">مصرف استاندارد BOM</th>
                  <th className="py-3 px-3 text-center text-amber-400">مصرف واقعی کارگاه</th>
                  <th className="py-3 px-3 text-center text-rose-400">ضایعات تولیدی</th>
                  <th className="py-3 px-3 text-center font-bold">انحراف مصرف</th>
                  <th className="py-3 px-3 text-center">ارزیابی نرم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {consumptionData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.moNumber}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode} • {r.materialGrade}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{formatNumber(r.totalProducedPieces)}</td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.theoreticalStandardConsumptionKg)} kg</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400">{formatNumber(r.actualIssuedMaterialKg)} kg</td>
                    <td className="py-3 px-3 text-center text-rose-400">{formatNumber(r.actualScrapKg)} kg</td>
                    <td
                      className={`py-3 px-3 text-center font-black ${
                        r.varianceKg > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatNumber(r.varianceKg)} kg ({toPersianDigits(r.variancePercent)}%)
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {r.isOverConsumption ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          مازاد بر استاندارد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          منطبق با نرم
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 7. SAPCO Material Account */}
          {activeReport === 'sapco_account' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره و عنوان قرارداد ساپکو</th>
                  <th className="py-3 px-3">گرید ورق</th>
                  <th className="py-3 px-3 text-center">سهمیه مصوب</th>
                  <th className="py-3 px-3 text-center">اول دوره (kg)</th>
                  <th className="py-3 px-3 text-center text-emerald-400">رسید (kg)</th>
                  <th className="py-3 px-3 text-center text-amber-400">مصرف خطوط (kg)</th>
                  <th className="py-3 px-3 text-center font-black">مانده دفتری (kg)</th>
                  <th className="py-3 px-3 text-center text-cyan-400">موجودی فیزیکی کارخانه</th>
                  <th className="py-3 px-3 text-center">مغایرت انبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sapcoAccountData.map(r => (
                  <tr key={r.contractId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100">{r.contractNumber}</span>
                      <div className="text-[11px] text-slate-400 font-sans">{r.title}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-400">{r.materialGrade}</td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.allocatedQuotaKg)}</td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.openingBalanceKg)}</td>
                    <td className="py-3 px-3 text-center text-emerald-400">{formatNumber(r.totalReceivedKg)}</td>
                    <td className="py-3 px-3 text-center text-amber-400">{formatNumber(r.totalIssuedKg)}</td>
                    <td className="py-3 px-3 text-center font-black text-slate-100 bg-slate-950">
                      {formatNumber(r.closingBookBalanceKg)}
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-400 font-bold">
                      {formatNumber(r.physicalStockInPlantKg)}
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-bold ${
                        r.discrepancyKg === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatNumber(r.discrepancyKg)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 8. Inventory Valuation Quantities */}
          {activeReport === 'valuation_qty' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">طبقه‌بندی</th>
                  <th className="py-3 px-3">کد و شرح قلم</th>
                  <th className="py-3 px-3 text-center font-bold">موجودی فیزیکی کل</th>
                  <th className="py-3 px-3 text-center text-emerald-400">ملکی شرکت</th>
                  <th className="py-3 px-3 text-center text-cyan-400">امانی ساپکو</th>
                  <th className="py-3 px-3 text-center text-rose-400">مسدود کیفی</th>
                  <th className="py-3 px-3 text-center text-amber-400">رزرو سفارش</th>
                  <th className="py-3 px-3 text-center font-black text-amber-400">موجودی آزاد قابل تخصیص</th>
                  <th className="py-3 px-3 text-center">وزن فیزیکی کل (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {valuationData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {r.category === 'FINISHED_GOODS'
                          ? 'محصول نهایی'
                          : r.category === 'WIP_PARTS'
                          ? 'کار در جریان'
                          : 'ورق خام'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.description}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partOrMaterialCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-100">
                      {formatNumber(r.physicalQuantity)} {r.unit}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400">{formatNumber(r.companyOwnedQuantity)}</td>
                    <td className="py-3 px-3 text-center text-cyan-400">{formatNumber(r.sapcoConsignmentQuantity)}</td>
                    <td className="py-3 px-3 text-center text-rose-400">{formatNumber(r.qualityBlockedQuantity)}</td>
                    <td className="py-3 px-3 text-center text-amber-400">{formatNumber(r.reservedQuantity)}</td>
                    <td className="py-3 px-3 text-center font-black text-amber-400 text-sm bg-amber-500/5">
                      {formatNumber(r.availableFreeQuantity)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{formatNumber(r.totalPhysicalWeightKg)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 9. Scrap by Part & Operation */}
          {activeReport === 'scrap_analysis' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3">مرحله و فرایند</th>
                  <th className="py-3 px-3">دستگاه پرس</th>
                  <th className="py-3 px-3 text-center">کل قطعات ورودی</th>
                  <th className="py-3 px-3 text-center text-rose-400 font-bold">ضایعات (عدد)</th>
                  <th className="py-3 px-3 text-center text-rose-400">وزن ضایعات (kg)</th>
                  <th className="py-3 px-3 text-center">نرم مجاز</th>
                  <th className="py-3 px-3 text-center font-black">درصد واقعی ضایعات</th>
                  <th className="py-3 px-3">نقص شایع و علت ریشه‌ای</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {scrapData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-amber-400 font-mono">OP{r.stepNumber}</span> - {r.stepName}
                      <span className="block text-[10px] text-slate-400 font-mono">{r.processType}</span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">{r.machineName || r.machineCode || '-'}</td>
                    <td className="py-3 px-3 text-center">{formatNumber(r.totalInputQty)}</td>
                    <td className="py-3 px-3 text-center text-rose-400 font-bold">{formatNumber(r.scrapPieces)}</td>
                    <td className="py-3 px-3 text-center text-rose-400">{formatNumber(r.scrapWeightKg)} kg</td>
                    <td className="py-3 px-3 text-center">{toPersianDigits(r.scrapNormPercent)}%</td>
                    <td
                      className={`py-3 px-3 text-center font-black text-sm ${
                        r.isAboveNorm ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {toPersianDigits(r.actualScrapPercent)}%
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">{r.commonScrapDefectType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 10. Machine Workload & Capacity */}
          {activeReport === 'machine_workload' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">کد و نام ماشین</th>
                  <th className="py-3 px-3">سالن و فرایند</th>
                  <th className="py-3 px-3 text-center">تناژ اسمی</th>
                  <th className="py-3 px-3 text-center">ظرفیت شیفت (ساعت)</th>
                  <th className="py-3 px-3 text-center text-amber-400">ساعت کار برنامه‌ریزی‌شده</th>
                  <th className="py-3 px-3 text-center text-emerald-400">ظرفیت آزاد</th>
                  <th className="py-3 px-3 text-center font-black">درصد بهره‌وری</th>
                  <th className="py-3 px-3 text-center">وضعیت دستگاه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {machineData.map(r => (
                  <tr key={r.machineId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-100">{r.machineName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.machineCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">
                      {r.hall} • <span className="font-mono">{r.processType}</span>
                    </td>
                    <td className="py-3 px-3 text-center">{r.tonnage ? `${formatNumber(r.tonnage)} T` : '-'}</td>
                    <td className="py-3 px-3 text-center">{toPersianDigits(r.nominalDailyCapacityHours)}h</td>
                    <td className="py-3 px-3 text-center text-amber-400 font-bold">{toPersianDigits(r.scheduledWorkloadHours)}h</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">{toPersianDigits(r.availableCapacityHours)}h</td>
                    <td className="py-3 px-3 text-center font-black text-slate-100 text-sm">
                      {toPersianDigits(r.utilizationRatePercent)}%
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {r.machineStatus === 'MAINTENANCE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          تعمیرات اضطراری
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          آماده‌به‌کار
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 11. Production Delays */}
          {activeReport === 'delays' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">نوع و شماره مرجع</th>
                  <th className="py-3 px-3">مشتری</th>
                  <th className="py-3 px-3">قطعه</th>
                  <th className="py-3 px-3 text-center">تیراژ</th>
                  <th className="py-3 px-3 text-center">موعد مصوب</th>
                  <th className="py-3 px-3 text-center text-amber-400">تکمیل تخمینی ▲</th>
                  <th className="py-3 px-3 text-center text-rose-400 font-black">روزهای تأخیر</th>
                  <th className="py-3 px-3">علت اصلی تأخیر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {delaysData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.referenceNumber}</td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-200">{r.customerOrPlan}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{formatNumber(r.quantity)}</td>
                    <td className="py-3 px-3 text-center font-sans text-[11px]">{formatToJalali(r.plannedDueDate)}</td>
                    <td className="py-3 px-3 text-center font-sans text-[11px] text-amber-400 font-bold">
                      {formatToJalali(r.estimatedCompletionDate)}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-400 font-black text-sm">
                      {toPersianDigits(r.delayDays)} روز
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">{r.delayDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 12. Inventory Movements */}
          {activeReport === 'movements' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">شماره سند</th>
                  <th className="py-3 px-3">تاریخ سند</th>
                  <th className="py-3 px-3">نوع سند</th>
                  <th className="py-3 px-3">قطعه / متریال</th>
                  <th className="py-3 px-3 text-center">مقدار</th>
                  <th className="py-3 px-3 text-center">مبدأ → مقصد</th>
                  <th className="py-3 px-3 text-center">مالکیت</th>
                  <th className="py-3 px-3 text-center">کاربر ثبت‌کننده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {movementsData.map(r => (
                  <tr key={r.transactionId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-100">{r.documentNumber}</td>
                    <td className="py-3 px-3 font-sans text-[11px] text-slate-300">{formatToJalali(r.transactionDate)}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {r.documentType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-100">
                      {formatNumber(r.quantity)} {r.unit}
                    </td>
                    <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-300">
                      {r.sourceLocation} → {r.targetLocation}
                    </td>
                    <td className="py-3 px-3 text-center font-sans text-[11px]">{r.ownership}</td>
                    <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-400">{r.operatorOrUser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 13. Inventory Reconciliation */}
          {activeReport === 'reconciliation' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">کد و انبار</th>
                  <th className="py-3 px-3">قلم کالایی</th>
                  <th className="py-3 px-3 text-center">موجودی دفتری سیستم</th>
                  <th className="py-3 px-3 text-center text-emerald-400 font-bold">شمارش عینی انبارگردانی</th>
                  <th className="py-3 px-3 text-center">مغایرت</th>
                  <th className="py-3 px-3 text-center">وضعیت موازنه</th>
                  <th className="py-3 px-3 text-center">تاریخ ممیزی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reconciliationData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-100">{r.warehouseName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.locationCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-200">{r.partName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.partCode}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-200">{formatNumber(r.bookQuantity)}</td>
                    <td className="py-3 px-3 text-center font-black text-emerald-400">{formatNumber(r.physicalCountQuantity)}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{formatNumber(r.varianceQuantity)}</td>
                    <td className="py-3 px-3 text-center font-sans">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        موازنه کامل (بدون مغایرت)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-400">
                      {formatToJalali(r.lastReconciledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drill-down modal */}
      <DrillDownModal
        isOpen={Boolean(drillDownItem)}
        onClose={() => setDrillDownItem(null)}
        data={drillDownItem}
      />
    </div>
  );
};
