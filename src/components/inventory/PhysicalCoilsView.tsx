import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Plus,
  Scale,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Info,
} from 'lucide-react';
import { PhysicalCoil, StockOwnership } from '../../types/inventory';
import { formatNumber, formatWeightKg } from '../../utils/formatters';

interface PhysicalCoilsViewProps {
  onRefresh?: () => Promise<void>;
  currentUser: {
    uid: string;
    displayName: string;
  };
}

export const PhysicalCoilsView: React.FC<PhysicalCoilsViewProps> = ({ currentUser }) => {
  const [coils, setCoils] = useState<PhysicalCoil[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('ALL');

  // Modals
  const [selectedCoil, setSelectedCoil] = useState<PhysicalCoil | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);

  // Form states
  const [issueWeight, setIssueWeight] = useState('');
  const [issueMoId, setIssueMoId] = useState('');
  const [issueScrap, setIssueScrap] = useState('0');
  const [returnWeight, setReturnWeight] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  // Multi-contract allocation form
  const [allocationsList, setAllocationsList] = useState<{ contractId: string; allocatedWeightKg: number }[]>([]);

  // Feedback notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCoils = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/coils');
      const data = await res.json();
      if (data.success) {
        setCoils(data.data);
      }
    } catch (err) {
      console.error('Error fetching coils:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoils();
  }, []);

  // Filtered coils
  const filteredCoils = useMemo(() => {
    return coils.filter(c => {
      if (gradeFilter !== 'ALL' && c.materialGrade !== gradeFilter) return false;
      if (ownershipFilter !== 'ALL' && c.ownership !== ownershipFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.coilId.toLowerCase().includes(q) ||
          c.coilPackNumber.toLowerCase().includes(q) ||
          (c.partName && c.partName.toLowerCase().includes(q)) ||
          (c.partCode && c.partCode.toLowerCase().includes(q)) ||
          (c.heatNumber && c.heatNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [coils, gradeFilter, ownershipFilter, searchTerm]);

  // Aggregate stats
  const totalCoilsCount = filteredCoils.length;
  const totalPhysicalWeight = filteredCoils.reduce((sum, c) => sum + c.remainingWeightKg, 0);
  const multiContractCoilsCount = filteredCoils.filter(c => c.allocations && c.allocations.length > 1).length;

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    const issuedKg = Number(issueWeight);
    if (!issuedKg || issuedKg <= 0 || issuedKg > selectedCoil.remainingWeightKg) {
      setNotification({
        type: 'error',
        message: `مقدار صادر شده باید بین 1 تا ${selectedCoil.remainingWeightKg} کیلوگرم باشد.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuedWeightKg: issuedKg,
          moId: issueMoId || 'MO-PROD-LINE-01',
          scrappedKg: Number(issueScrap) || 0,
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در صدور جزئی کلاف' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setIssueModalOpen(false);
        setIssueWeight('');
        fetchCoils();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    const returnedKg = Number(returnWeight);
    if (!returnedKg || returnedKg <= 0) {
      setNotification({ type: 'error', message: 'وزن ته‌کلاف برگشتی باید مثبت باشد.' });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnedRemnantWeightKg: returnedKg,
          notes: returnNotes || 'برگشت مازاد یا ته کلاف از خط تولید به انبار',
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در برگشت ته‌کلاف' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setReturnModalOpen(false);
        setReturnWeight('');
        fetchCoils();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    }
  };

  const openAllocateModal = (coil: PhysicalCoil) => {
    setSelectedCoil(coil);
    setAllocationsList(
      coil.allocations && coil.allocations.length > 0
        ? coil.allocations.map(a => ({ contractId: a.contractId, allocatedWeightKg: a.allocatedWeightKg }))
        : [{ contractId: 'CNT-SAPCO-1403-Q3', allocatedWeightKg: coil.originalWeightKg }]
    );
    setAllocateModalOpen(true);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    const totalAlloc = allocationsList.reduce((sum, a) => sum + Number(a.allocatedWeightKg || 0), 0);
    if (totalAlloc > selectedCoil.originalWeightKg) {
      setNotification({
        type: 'error',
        message: `مجموع وزن تخصیص (${totalAlloc} kg) بیشتر از وزن کلاف (${selectedCoil.originalWeightKg} kg) است.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocationsList,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در ثبت تخصیص قراردادها' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setAllocateModalOpen(false);
        fetchCoils();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    }
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">تعداد کلاف‌های فیزیکی موجود</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{formatNumber(totalCoilsCount)} <span className="text-xs font-normal text-slate-400">حلقه</span></div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">موجودی وزنی در گردش کلاف‌ها</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">{formatWeightKg(totalPhysicalWeight)}</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">کلاف‌های چندقراردادی (تسهیم چندگانه)</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">{formatNumber(multiContractCoilsCount)} <span className="text-xs font-normal text-slate-400">کویل</span></div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی شماره کویل، پکینگ، شماره ذوب..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه گریدها</option>
            <option value="DC04">DC04</option>
            <option value="ST14">ST14</option>
            <option value="ST12">ST12</option>
          </select>

          <select
            value={ownershipFilter}
            onChange={e => setOwnershipFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه مالکیت‌ها</option>
            <option value="SAPCO_SUPPLIER_OWNED">امانی ساپکو</option>
            <option value="COMPANY_OWNED">ملکی کارخانه</option>
            <option value="CUSTOMER_SUPPLIED">مشتری</option>
          </select>

          <button
            onClick={fetchCoils}
            disabled={loading}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="بروزرسانی اطلاعات"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Coils Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th className="py-3 px-3.5">شناسه کویل</th>
                <th className="py-3 px-3.5">شماره پکینگ</th>
                <th className="py-3 px-3.5">شرح ورق و ابعاد</th>
                <th className="py-3 px-3.5">گرید متریال</th>
                <th className="py-3 px-3.5">وزن اولیه</th>
                <th className="py-3 px-3.5">وزن باقیمانده</th>
                <th className="py-3 px-3.5">تخصیص قراردادها</th>
                <th className="py-3 px-3.5">محل استقرار</th>
                <th className="py-3 px-3.5 text-center">عملیات کارگاهی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCoils.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ کلاف فیزیکی منطبق بر جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredCoils.map(coil => {
                  const isRemnant = coil.remainingWeightKg < coil.originalWeightKg;
                  return (
                    <tr key={coil.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-medium text-slate-900">
                        {coil.coilId}
                        {coil.heatNumber && (
                          <div className="text-[10px] text-slate-400">ذوب: {coil.heatNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-800 font-medium">
                        {coil.coilPackNumber}
                        {isRemnant && (
                          <span className="mr-1 inline-block text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            مازاد/ته‌کلاف
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-900">{coil.partName}</div>
                        <div className="text-[10px] text-slate-500">
                          ضخامت: {coil.thicknessMm}mm | عرض: {coil.widthMm}mm
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {coil.materialGrade}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-500">
                        {formatWeightKg(coil.originalWeightKg)}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-700">
                        {formatWeightKg(coil.remainingWeightKg)}
                      </td>
                      <td className="py-3 px-3.5">
                        {coil.allocations && coil.allocations.length > 0 ? (
                          <div className="space-y-0.5">
                            {coil.allocations.map((alloc, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="text-slate-500">{alloc.contractNumber}:</span>
                                <span className="font-mono text-slate-800">{formatNumber(alloc.allocatedWeightKg)} kg</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="text-slate-800">{coil.warehouseName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{coil.warehouseLocationCode}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCoil(coil);
                              setIssueWeight(String(coil.remainingWeightKg));
                              setIssueModalOpen(true);
                            }}
                            disabled={coil.remainingWeightKg <= 0}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                            title="صدور جزئی به خط تولید"
                          >
                            <ArrowUpRight className="w-3 h-3 text-slate-500" />
                            <span>صدور جزئی</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCoil(coil);
                              setReturnWeight('');
                              setReturnModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="برگشت ته‌کلاف یا مازاد"
                          >
                            <ArrowDownLeft className="w-3 h-3 text-slate-500" />
                            <span>برگشت ته‌کلاف</span>
                          </button>
                          <button
                            onClick={() => openAllocateModal(coil)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                            title="مدیریت سهمیه‌ها و قراردادها"
                          >
                            تسهیم
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partial Issue Modal */}
      {issueModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-right shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              صدور جزئی کلاف به خط تولید / سفارش ساخت
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              کویل شماره {selectedCoil.coilId} (پکینگ {selectedCoil.coilPackNumber}) - مانده موجود: {formatWeightKg(selectedCoil.remainingWeightKg)}
            </p>

            <form onSubmit={handleIssueSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">وزن مورد نیاز جهت صدور (کیلوگرم)</label>
                <input
                  type="number"
                  value={issueWeight}
                  onChange={e => setIssueWeight(e.target.value)}
                  max={selectedCoil.remainingWeightKg}
                  min={1}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">شماره دستور ساخت (Manufacturing Order)</label>
                <input
                  type="text"
                  placeholder="مثال: MO-1403-1002"
                  value={issueMoId}
                  onChange={e => setIssueMoId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">افت وزنی / ضایعات سر و ته کلاف (کیلوگرم - در صورت وجود)</label>
                <input
                  type="number"
                  value={issueScrap}
                  onChange={e => setIssueScrap(e.target.value)}
                  min={0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  ثبت صدور به خط تولید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remnant Return Modal */}
      {returnModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-right shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              برگشت ته‌کلاف یا مازاد از خط تولید به انبار
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              پکینگ ساپکو: {selectedCoil.coilPackNumber} (با حفظ کامل ردیابی مادر)
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">وزن ته‌کلاف وزن‌کشی‌شده (کیلوگرم)</label>
                <input
                  type="number"
                  value={returnWeight}
                  onChange={e => setReturnWeight(e.target.value)}
                  min={1}
                  required
                  placeholder="وزن دقیق ترازوی انبار"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">توضیحات و گزارش وضعیت ته‌کلاف</label>
                <textarea
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="علت برگشت، کنترل ابعادی و بسته‌بندی مجدد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  ثبت برگشت ته‌کلاف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Contract Allocation Modal */}
      {allocateModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-right shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              تسهیم چندقراردادی کلاف فیزیکی شماره {selectedCoil.coilId}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              وزن کل فیزیکی کلاف: {formatWeightKg(selectedCoil.originalWeightKg)} | این کلاف واحد می‌تواند به چند قرارداد سهمیه تخصیص داده شود بدون ایجاد کلاف تکراری.
            </p>

            <form onSubmit={handleAllocateSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-2">
                {allocationsList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="شناسه قرارداد سهمیه (مثلاً CNT-SAPCO-1403-Q3)"
                      value={item.contractId}
                      onChange={e => {
                        const updated = [...allocationsList];
                        updated[idx].contractId = e.target.value;
                        setAllocationsList(updated);
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 focus:outline-none text-xs"
                    />
                    <input
                      type="number"
                      placeholder="وزن تخصیصی (kg)"
                      value={item.allocatedWeightKg}
                      onChange={e => {
                        const updated = [...allocationsList];
                        updated[idx].allocatedWeightKg = Number(e.target.value);
                        setAllocationsList(updated);
                      }}
                      className="w-28 bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-mono text-xs focus:outline-none"
                    />
                    {allocationsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationsList(allocationsList.filter((_, i) => i !== idx));
                        }}
                        className="text-rose-500 hover:text-rose-700 px-1 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAllocationsList([...allocationsList, { contractId: '', allocatedWeightKg: 0 }]);
                }}
                className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن سهم قرارداد دیگر</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">
                  مجموع تسهیم‌شده: <strong className="text-slate-900 font-mono">{formatNumber(allocationsList.reduce((s, a) => s + Number(a.allocatedWeightKg || 0), 0))}</strong> / {selectedCoil.originalWeightKg} kg
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocateModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    ذخیره تسهیم
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
