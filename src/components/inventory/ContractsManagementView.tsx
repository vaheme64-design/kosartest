import React, { useState, useMemo } from 'react';
import {
  FileSignature,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Scale,
  Layers,
  Package,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Download,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SapcoContract,
  Part,
  PhysicalCoil,
  ContractCommercialLine,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDate,
  exportToCsv,
} from '../../utils/formatters';
import { ContractCreateModal } from './ContractCreateModal';

interface ContractsManagementViewProps {
  contracts: SapcoContract[];
  parts: Part[];
  coils: PhysicalCoil[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onViewContractLedger?: (contractId: string) => void;
  currentUser: { uid: string; displayName: string; role: string };
}

export const ContractsManagementView: React.FC<ContractsManagementViewProps> = ({
  contracts,
  parts,
  coils,
  loading,
  onRefresh,
  onViewContractLedger,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [allocatingContract, setAllocatingContract] = useState<SapcoContract | null>(null);
  const [selectedCoilToAllocate, setSelectedCoilToAllocate] = useState<string>('');
  const [allocateWeight, setAllocateWeight] = useState<number>(1000);
  const [allocateLoading, setAllocateLoading] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Extract unique customers
  const customers = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach(c => {
      if (c.customerName) set.add(c.customerName);
    });
    return Array.from(set);
  }, [contracts]);

  // Aggregate Metrics
  const totalAllocatedKg = contracts.reduce((sum, c) => sum + (c.allocatedWeightKg || 0), 0);
  const totalReceivedKg = contracts.reduce((sum, c) => sum + (c.totalReceivedKg || 0), 0);
  const totalConsumedKg = contracts.reduce((sum, c) => sum + (c.totalConsumedKg || 0), 0);
  const totalClosingBalanceKg = contracts.reduce((sum, c) => sum + (c.closingBalanceKg || 0), 0);

  const totalCommittedProducts = contracts.reduce((sum, c) => {
    const lines = c.commercialLines || [];
    return sum + lines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY').reduce((s, l) => s + l.contractQty, 0);
  }, 0);

  const totalDeliveredProducts = contracts.reduce((sum, c) => {
    const lines = c.commercialLines || [];
    return sum + lines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY').reduce((s, l) => s + l.deliveredOrReceivedQty, 0);
  }, 0);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      if (selectedCustomer !== 'ALL' && c.customerName !== selectedCustomer) {
        return false;
      }
      if (selectedType !== 'ALL' && c.contractType !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNum = c.contractNumber.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesCust = c.customerName ? c.customerName.toLowerCase().includes(q) : false;
        const matchesGrade = c.materialGrade ? c.materialGrade.toLowerCase().includes(q) : false;
        const matchesPart = (c.associatedPartCodes || []).some(code => code.toLowerCase().includes(q));
        if (!matchesNum && !matchesTitle && !matchesCust && !matchesGrade && !matchesPart) {
          return false;
        }
      }
      return true;
    });
  }, [contracts, selectedCustomer, selectedType, selectedStatus, searchTerm]);

  // Handle Quick Allocate Coil
  const handleConfirmAllocateCoil = async () => {
    if (!allocatingContract || !selectedCoilToAllocate) return;
    setAllocateLoading(true);
    setAllocateError(null);

    try {
      const res = await fetch(`/api/inventory/contracts/${allocatingContract.id}/allocate-coil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coilId: selectedCoilToAllocate,
          allocatedWeightKg: Number(allocateWeight),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در تخصیص کلاف به قرارداد');
      }

      await onRefresh();
      setAllocatingContract(null);
      setSelectedCoilToAllocate('');
    } catch (err) {
      setAllocateError(err instanceof Error ? err.message : 'خطای اتصال به سرور');
    } finally {
      setAllocateLoading(false);
    }
  };

  const handleExportContractsCsv = () => {
    const headers = [
      'شماره قرارداد',
      'عنوان قرارداد',
      'طرف حساب / کارفرما',
      'نوع قرارداد',
      'گرید ورق/ماده',
      'سهمیه کل (کیلوگرم)',
      'موجودی اول دوره (kg)',
      'دریافت کل (kg)',
      'مصرف کل (kg)',
      'مانده دفتری (kg)',
      'تاریخ شروع',
      'تاریخ پایان',
      'وضعیت',
    ];

    const rows = filteredContracts.map(c => [
      c.contractNumber,
      c.title,
      c.customerName || 'ساپکو',
      c.contractType || 'دوطرفه',
      c.materialGrade,
      c.allocatedWeightKg,
      c.openingBalanceKg,
      c.totalReceivedKg,
      c.totalConsumedKg,
      c.closingBalanceKg,
      formatDate(c.startDate),
      formatDate(c.endDate),
      c.status,
    ]);

    exportToCsv('KPIMS-Contracts-Export', headers, rows);
  };

  const contractTypeBadges: Record<string, { label: string; color: string }> = {
    HYBRID: { label: 'دوطرفه (دریافت مواد + تحویل محصول)', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
    SAPCO_CONSIGNMENT: { label: 'امانی ورق ساپکو', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
    CUSTOMER_SUPPLIED: { label: 'تأمین قطعات مشتری (پیچ/لاستیک)', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    PRODUCT_DELIVERY: { label: 'تعهد تحویل محصول نهایی', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">قراردادهای فعال</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {toPersianDigits(contracts.filter(c => c.status === 'ACTIVE').length)}
            </span>
            <span className="text-xs text-slate-500">از کل {toPersianDigits(contracts.length)} قرارداد</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">سهمیه کل ورق قراردادها</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {formatNumber(Math.round(totalAllocatedKg / 1000))}
            </span>
            <span className="text-xs text-slate-400">تن ({formatNumber(totalAllocatedKg)} kg)</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">مانده ورق در انبار کارخانه</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {formatNumber(Math.round(totalClosingBalanceKg / 1000))}
            </span>
            <span className="text-xs text-slate-400">تن ({formatNumber(totalClosingBalanceKg)} kg)</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">تعهدات تحویل قطعه نهایی</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {formatNumber(totalCommittedProducts)}
            </span>
            <span className="text-xs text-slate-400">عدد ({formatNumber(totalDeliveredProducts)} تحویل شده)</span>
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="جستجو در قرارداد، طرف حساب، گرید، قطعه..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">تمام طرف‌های حساب</option>
            {customers.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">تمام انواع قراردادها</option>
            <option value="HYBRID">دوطرفه (مواد + محصول)</option>
            <option value="SAPCO_CONSIGNMENT">امانی ورق ساپکو</option>
            <option value="CUSTOMER_SUPPLIED">تأمین قطعات مشتری</option>
            <option value="PRODUCT_DELIVERY">تعهد تحویل محصول نهایی</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">تمام وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="FULFILLED">تکمیل شده</option>
            <option value="SUSPENDED">معلق / متوقف</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportContractsCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            خروجی اکسل
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded transition-colors"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            ثبت قرارداد جدید
          </button>
        </div>
      </div>

      {/* Contracts List / Cards */}
      <div className="space-y-4">
        {filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-lg">
            قراردادی با شرایط فیلتر انتخاب شده یافت نشد.
          </div>
        ) : (
          filteredContracts.map(contract => {
            const isExpanded = expandedContractId === contract.id;
            const badge = contractTypeBadges[contract.contractType || 'HYBRID'] || contractTypeBadges.HYBRID;
            const commercialLines = contract.commercialLines || [];
            const incomingMaterials = commercialLines.filter(l => l.lineType === 'CUSTOMER_SUPPLIED_MATERIAL');
            const productDeliveries = commercialLines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY');
            const connectedCoils = contract.coils || [];

            const quotaProgress = contract.allocatedWeightKg > 0
              ? Math.min(100, Math.round(((contract.totalConsumedKg || 0) / contract.allocatedWeightKg) * 100))
              : 0;

            return (
              <div
                key={contract.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm transition-all"
              >
                {/* Contract Summary Bar */}
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-950 border border-slate-700 text-blue-400 rounded">
                        {contract.contractNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100">{contract.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-medium border rounded ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                          contract.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : contract.status === 'FULFILLED'
                            ? 'bg-blue-500/10 text-blue-300'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {contract.status === 'ACTIVE'
                          ? 'فعال'
                          : contract.status === 'FULFILLED'
                          ? 'تکمیل شده'
                          : 'تعلیق / متوقف'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>طرف حساب: {contract.customerName || 'شرکت ساپکو'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          دوره: {formatDate(contract.startDate)} الی {formatDate(contract.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-slate-500" />
                        <span>گرید اصلی: {contract.materialGrade}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    {/* Quota Progress */}
                    <div className="text-left font-mono">
                      <div className="text-[11px] text-slate-400">
                        مانده سهمیه: {formatNumber(contract.closingBalanceKg)} / {formatNumber(contract.allocatedWeightKg)} kg
                      </div>
                      <div className="w-36 h-2 bg-slate-950 border border-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${quotaProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAllocatingContract(contract);
                          setAllocateWeight(1000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded transition-colors"
                        title="تخصیص کلاف یا رول جدید به این قرارداد"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>تخصیص کلاف</span>
                      </button>

                      {onViewContractLedger && (
                        <button
                          onClick={() => onViewContractLedger(contract.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded transition-colors"
                          title="مشاهده کاردکس و گردش اسناد این قرارداد"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span>کاردکس</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedContractId(isExpanded ? null : contract.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Sections */}
                {isExpanded && (
                  <div className="p-5 bg-slate-950/50 space-y-5 border-t border-slate-800/60">
                    {/* SECTION 1: INCOMING MATERIALS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-400" />
                          مواد و قطعات دریافتی از مشتری / تأمین‌کننده (سهمیه ورق، پیچ و مهره، لاستیک)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {toPersianDigits(incomingMaterials.length)} ردیف تعریف شده
                        </span>
                      </div>

                      {incomingMaterials.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800/80 rounded">
                          ردیف تفکیک شده ماده‌ای برای این قرارداد ثبت نشده است (سهمیه کلی: {formatNumber(contract.allocatedWeightKg)} kg).
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-900/90 text-slate-400">
                              <tr>
                                <th className="px-3 py-2">کد قطعه/ماده</th>
                                <th className="px-3 py-2">شرح کالا</th>
                                <th className="px-3 py-2">واحد</th>
                                <th className="px-3 py-2 text-left font-mono">سهمیه قرارداد</th>
                                <th className="px-3 py-2 text-left font-mono">دریافت شده</th>
                                <th className="px-3 py-2 text-left font-mono">مانده سهمیه</th>
                                <th className="px-3 py-2">توضیحات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {incomingMaterials.map(mat => (
                                <tr key={mat.id} className="hover:bg-slate-900/40">
                                  <td className="px-3 py-2 font-mono text-slate-300">{mat.partCode}</td>
                                  <td className="px-3 py-2 font-medium text-slate-200">{mat.partName}</td>
                                  <td className="px-3 py-2 text-slate-400">{mat.unit === 'KG' ? 'کیلوگرم' : 'عدد'}</td>
                                  <td className="px-3 py-2 text-left font-mono text-slate-200 font-bold">
                                    {formatNumber(mat.contractQty)}
                                  </td>
                                  <td className="px-3 py-2 text-left font-mono text-emerald-400">
                                    {formatNumber(mat.deliveredOrReceivedQty || 0)}
                                  </td>
                                  <td className="px-3 py-2 text-left font-mono text-amber-400 font-bold">
                                    {formatNumber(mat.remainingQty || mat.contractQty)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400 text-[11px]">{mat.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: PRODUCT DELIVERY COMMITMENTS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-emerald-400" />
                          تعهدات تجاری تحویل محصول نهایی به مشتری (ارسال جنس طبق قرارداد)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {toPersianDigits(productDeliveries.length)} تعهد محصول
                        </span>
                      </div>

                      {productDeliveries.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800/80 rounded">
                          تعهد محصول نهایی به صورت مجزا در این قرارداد درج نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-900/90 text-slate-400">
                              <tr>
                                <th className="px-3 py-2">کد محصول</th>
                                <th className="px-3 py-2">عنوان قطعه نهایی</th>
                                <th className="px-3 py-2 text-left font-mono">تیراژ تعهد شده</th>
                                <th className="px-3 py-2 text-left font-mono">تحویل شده تاکنون</th>
                                <th className="px-3 py-2 text-left font-mono">مانده تعهد تحویل</th>
                                <th className="px-3 py-2 text-center">درصد پیشرفت</th>
                                <th className="px-3 py-2">ملاحظات تحویل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {productDeliveries.map(prod => {
                                const progress = prod.contractQty > 0
                                  ? Math.min(100, Math.round(((prod.deliveredOrReceivedQty || 0) / prod.contractQty) * 100))
                                  : 0;

                                return (
                                  <tr key={prod.id} className="hover:bg-slate-900/40">
                                    <td className="px-3 py-2 font-mono text-slate-300">{prod.partCode}</td>
                                    <td className="px-3 py-2 font-medium text-slate-200">{prod.partName}</td>
                                    <td className="px-3 py-2 text-left font-mono text-slate-200 font-bold">
                                      {formatNumber(prod.contractQty)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-left font-mono text-emerald-400 font-bold">
                                      {formatNumber(prod.deliveredOrReceivedQty || 0)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-left font-mono text-purple-300 font-bold">
                                      {formatNumber(prod.remainingQty || prod.contractQty)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                                        <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                          <div
                                            className="h-full bg-emerald-500 rounded-full"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <span>{progress}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-400 text-[11px]">{prod.notes || 'تحویل ماهیانه'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: CONNECTED COILS & PACKS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          کلاف‌های ورق و کویل‌پک‌های متصل به این قرارداد
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {toPersianDigits(connectedCoils.length)} کلاف متصل
                        </span>
                      </div>

                      {connectedCoils.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/50 border border-slate-800/80 rounded">
                          کلافی به صورت مستقیم به این قرارداد لینک نشده است. با دکمه «تخصیص کلاف» می‌توانید کلاف‌های موجود در انبار را متصل کنید.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {connectedCoils.map((coil, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-slate-900 border border-slate-800 rounded flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-blue-400">{coil.coilId}</span>
                                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 text-[10px] text-slate-300 font-mono rounded">
                                  پکینگ: {coil.coilPackNumber || '—'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 space-y-0.5">
                                <div>گرید: {coil.materialGrade || contract.materialGrade}</div>
                                {coil.thicknessMm && <div>ضخامت: {coil.thicknessMm}mm | عرض: {coil.widthMm}mm</div>}
                              </div>
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">سهم تخصیصی:</span>
                                <span className="font-bold text-slate-200">{formatNumber(coil.allocatedWeightKg)} kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contract Create Modal */}
      <ContractCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async () => {
          await onRefresh();
        }}
        parts={parts}
        coils={coils}
        currentUser={currentUser}
      />

      {/* Quick Allocate Coil Modal */}
      {allocatingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-100">تخصیص کلاف به قرارداد</h3>
                <span className="text-[11px] font-mono text-blue-400">{allocatingContract.contractNumber}</span>
              </div>
              <button
                onClick={() => setAllocatingContract(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {allocateError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded">
                {allocateError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">انتخاب کلاف موجود در انبار</label>
                <select
                  value={selectedCoilToAllocate}
                  onChange={e => {
                    setSelectedCoilToAllocate(e.target.value);
                    const selected = coils.find(c => c.coilId === e.target.value || c.id === e.target.value);
                    if (selected) {
                      setAllocateWeight(selected.remainingWeightKg);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- انتخاب کلاف و کویل‌پک --</option>
                  {coils.map(c => (
                    <option key={c.id} value={c.coilId}>
                      [{c.coilId}] پکینگ: {c.coilPackNumber} | {c.materialGrade} {c.thicknessMm}mm | مانده: {formatNumber(c.remainingWeightKg)} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  وزن تخصیصی به این قرارداد (کیلوگرم)
                </label>
                <input
                  type="number"
                  min="1"
                  value={allocateWeight}
                  onChange={e => setAllocateWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono text-left focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  می‌توانید کل وزن کلاف یا بخشی از آن (تخصیص چندقراردادی) را به این قرارداد متصل نمایید.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAllocatingContract(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!selectedCoilToAllocate || allocateLoading}
                onClick={handleConfirmAllocateCoil}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded"
              >
                {allocateLoading ? 'در حال ثبت...' : 'تأیید و اتصال کلاف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
