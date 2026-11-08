import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSignature,
  Cpu,
  Hammer,
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  Truck,
  Layers,
  Boxes,
  Search,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import {
  Part,
  SapcoContract,
  PhysicalCoil,
  UserRoleProfile,
} from '../../types/inventory';
import { CustomerOrder, PartNetRequirement } from '../../types/productionPlanning';
import { ContractsManagementView } from '../inventory/ContractsManagementView';
import { NewCustomerOrderModal } from '../planning/NewCustomerOrderModal';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { TabKey, SubModuleNavParams } from '../Sidebar';
import { InventorySubTab } from '../inventory/InventoryModuleView';

export type ContractsSubTabKey = 'CHAIN_PIPELINE' | 'SAPCO_CONTRACTS' | 'CUSTOMER_ORDERS';

interface SalesContractsModuleViewProps {
  parts: Part[];
  currentUser: UserRoleProfile;
  initialSubTab?: ContractsSubTabKey;
  onNavigateToTab: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onNavigateSubModule: (tab: TabKey, navParams?: SubModuleNavParams) => void;
  onGlobalRefresh: () => Promise<void>;
}

export const SalesContractsModuleView: React.FC<SalesContractsModuleViewProps> = ({
  parts,
  currentUser,
  initialSubTab = 'CHAIN_PIPELINE',
  onNavigateToTab,
  onNavigateSubModule,
  onGlobalRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ContractsSubTabKey>(initialSubTab);
  const [contracts, setContracts] = useState<SapcoContract[]>([]);
  const [coils, setCoils] = useState<PhysicalCoil[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [netRequirements, setNetRequirements] = useState<PartNetRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadContractsAndOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, coilsRes, ordersRes, netRes] = await Promise.all([
        fetch('/api/inventory/contracts').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/inventory/coils').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/planning/customer-orders').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/planning/net-requirements').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (contractsRes.success) setContracts(contractsRes.data || []);
      if (coilsRes.success) setCoils(coilsRes.data || []);
      if (ordersRes.success) setCustomerOrders(ordersRes.data || []);
      if (netRes.success) setNetRequirements(netRes.data || []);
    } catch (err) {
      console.error('Error loading Sales & Contracts data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContractsAndOrders();
  }, [loadContractsAndOrders]);

  const handleCreateCustomerOrder = async (payload: any) => {
    try {
      const res = await fetch('/api/planning/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'خطا در ثبت سفارش مشتری' };
      }
      await loadContractsAndOrders();
      await onGlobalRefresh();
      setToastMsg('سفارش فروش جدید ثبت شد و نیازسنجی MRP به‌روزرسانی گردید.');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطای ارتباط با سرور' };
    }
  };

  // Issue MO directly from a Contract / Customer Order Line and jump to Factory Dashboard
  const handleIssueMoFromContractLine = (
    contractNumber: string,
    customerName: string,
    partCode: string,
    partName: string,
    qty: number
  ) => {
    try {
      const savedRaw = localStorage.getItem('kpims_highway_scenarios_v3');
      const existingList = savedRaw ? JSON.parse(savedRaw) : [];
      const matchedPart = parts.find(p => p.code === partCode || p.name === partName);
      const newMoCode = `MO-1404-${Math.floor(2100 + Math.random() * 7000)}`;
      const batchCode = `BCH-PRD-${newMoCode.replace('MO-', '')}`;

      const newScenario = {
        id: `SCN-${Date.now()}`,
        orderCode: newMoCode,
        productionBatchCode: batchCode,
        partId: matchedPart?.id || `PRT-${Date.now()}`,
        partCode: partCode || matchedPart?.code || 'SAPCO-PRT-01',
        partName: partName || matchedPart?.name || 'قطعه قراردادی ساپکو',
        carModel: matchedPart?.carModel || 'پژو ۲۰۶ / پارس',
        customerName: customerName || 'ساپکو',
        contractCode: contractNumber,
        status: 'ACTIVE',
        orderQty: qty > 0 ? qty : 2500,
        unitWeightKg: matchedPart?.weightPerUnitKg || 1.5,
        scrapAllowancePct: 4.5,
        rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
        rawMaterialName: `رول ورق ${matchedPart?.materialGrade || 'DC01A'} ضخامت ${matchedPart?.thicknessMm || 2.0}`,
        coilNumber: 'MOB-2025-DC01-409',
        heatNumber: 'HT-99412-MOB',
        sapcoBatchNumber: 'BCH-SAP-1404-101',
        warehouseAvailableKg: 18500,
        bomSubComponents: [
          { name: `بلنک برش‌خورده ${partName}`, qtyPerParent: 1, unit: 'عدد', stage: 'برش و بلنکینگ' },
          { name: `قطعه فرم‌دهی‌شده نهایی`, qtyPerParent: 1, unit: 'عدد', stage: 'پرس نهایی' },
        ],
        operations: [
          {
            stepCode: 'OP10',
            stepName: 'برش ورق خام از رول',
            processType: 'SHEARING',
            hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
            machineName: 'قیچی گیوتین ۶ متری ۱',
            dieName: 'BLD-SHR-01',
            cycleTimeSec: 6,
            completedGood: 0,
            scrapQty: 0,
            isFinal: false,
          },
          {
            stepCode: 'OP20',
            stepName: 'پرس فرم‌دهی و پانچ',
            processType: 'BLANKING',
            hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
            machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
            dieName: `DIE-${partCode.slice(-6)}`,
            cycleTimeSec: 12,
            completedGood: 0,
            scrapQty: 0,
            isFinal: true,
          },
        ],
        commandLogs: [
          {
            id: `CMD-${Date.now()}`,
            docNumber: newMoCode,
            type: 'MO_CREATED',
            title: `صدور دستور تولید (MO) از قرارداد ${contractNumber} (${customerName})`,
            timestamp: 'امروز - زنجیره قرارداد به تولید',
            qtyOrWeight: `${formatNumber(qty)} عدد`,
            targetStation: 'خط تولید و پرس',
          },
        ],
      };

      localStorage.setItem(
        'kpims_highway_scenarios_v3',
        JSON.stringify([newScenario, ...existingList])
      );
      onNavigateToTab('dashboard');
    } catch {
      onNavigateToTab('dashboard');
    }
  };

  return (
    <div className="space-y-5 font-sans text-right" dir="rtl">
      {/* ================================================================== */}
      {/* 1. ARCHITECTURAL CHAIN HEADER: CONTRACT -> MRP -> MO               */}
      {/* ================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              ماژول قراردادها و سفارشات (Sales & Contracts)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              زنجیره یکپارچه اتصال تعهدات قرارداد مشتری ⟵ محاسبه نیاز خالص و ورق (MRP) ⟵ صدور دستور تولید (MO)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>ثبت سفارش فروش / تحویل جدید</span>
            </button>

            <button
              type="button"
              onClick={loadContractsAndOrders}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="بروزرسانی اطلاعات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Interactive 3-Stage Value Chain Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold">۱. قراردادها و سفارشات مشتری</div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {toPersianDigits(contracts.length)} قرارداد فعال · {toPersianDigits(customerOrders.length)} سفارش تحویل
                </div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 hidden md:block" />
          </div>

          <button
            type="button"
            onClick={() => onNavigateSubModule('planning', { planningSubTab: 'mrp' })}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">۲. انفجار BOM و نیازسنجی (MRP)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  محاسبه کسری قطعات و نیاز ورق از روی سفارشات
                </div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('dashboard')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Hammer className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">۳. صدور دستور تولید (MO)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ابلاغ به ایستگاه‌های OP و تخصیص شماره ذوب
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('CHAIN_PIPELINE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CHAIN_PIPELINE'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>میز کار تبدیل قرارداد ⟵ MRP ⟵ دستور تولید (MO)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CUSTOMER_ORDERS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CUSTOMER_ORDERS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>سفارشات تحویل مشتری ({toPersianDigits(customerOrders.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SAPCO_CONTRACTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'SAPCO_CONTRACTS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>قراردادها و سهمیه ورق امانی ساپکو ({toPersianDigits(contracts.length)})</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 1: UNIFIED PIPELINE (CONTRACT -> MRP -> ISSUE MO)          */}
      {/* ================================================================== */}
      {activeSubTab === 'CHAIN_PIPELINE' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                جدول تبدیل مستقیم تعهدات قرارداد و سفارشات به دستور تولید (MO)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                بررسی همزمان تیراژ تعهد قرارداد، موجودی انبار، کسری خالص MRP و صدور ۱-کلیکی دستور کار
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجوی شماره قرارداد، مشتری یا قطعه..."
                className="w-full pr-8 pl-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">شماره قرارداد / سفارش</th>
                  <th className="py-3 px-4 font-semibold">مشتری</th>
                  <th className="py-3 px-4 font-semibold">نام قطعه تعهدشده</th>
                  <th className="py-3 px-4 font-semibold">تیراژ تعهد</th>
                  <th className="py-3 px-4 font-semibold">وضعیت MRP / کسری</th>
                  <th className="py-3 px-4 font-semibold text-left">زنجیره اقدام (MRP / صدور MO)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customerOrders.flatMap(order =>
                  order.lines.map((line, idx) => {
                    const matchedReq = netRequirements.find(
                      r => r.partId === line.partId || r.partCode === line.partCode
                    );
                    const netShortage = matchedReq
                      ? matchedReq.netProductionRequirement
                      : Math.max(0, line.orderedQuantity - line.deliveredQuantity);
                    return {
                      rowKey: `${order.id}-${idx}`,
                      docNumber: order.contractNumber || order.orderNumber,
                      orderNumber: order.orderNumber,
                      customerName: order.customerName,
                      partCode: line.partCode,
                      partName: line.partName,
                      committedQty: line.orderedQuantity,
                      deliveredQty: line.deliveredQuantity,
                      netShortage,
                      dueDate: order.dueDate,
                    };
                  })
                ).filter(row => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    row.docNumber.toLowerCase().includes(q) ||
                    row.customerName.toLowerCase().includes(q) ||
                    row.partName.toLowerCase().includes(q) ||
                    row.partCode.toLowerCase().includes(q)
                  );
                }).map(row => (
                  <tr key={row.rowKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div>{row.docNumber}</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        سفارش: {row.orderNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {row.customerName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.partName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{row.partCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatNumber(row.committedQty)} عدد
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {row.netShortage > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px] font-bold">
                          نیاز تولید: {formatNumber(row.netShortage)} عدد
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                          پوشش کامل موجودی
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigateSubModule('planning', { planningSubTab: 'mrp' })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                          <span>بررسی MRP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleIssueMoFromContractLine(
                              row.docNumber,
                              row.customerName,
                              row.partCode,
                              row.partName,
                              row.netShortage > 0 ? row.netShortage : row.committedQty
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Hammer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>صدور MO</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: CUSTOMER SALES ORDERS                                   */}
      {/* ================================================================== */}
      {activeSubTab === 'CUSTOMER_ORDERS' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                فهرست سفارشات تحویل مشتری (Customer Sales Orders)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                سفارشات ثبت‌شده مستقیماً در موتور نیازسنجی مواد (MRP) لحاظ می‌شوند.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>سفارش جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {customerOrders.map(order => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {order.orderNumber}
                    </div>
                    <div className="text-slate-600 font-semibold mt-0.5">
                      {order.customerName} · قرارداد: <span className="font-mono">{order.contractNumber}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>موعد: {formatToJalali(order.dueDate)}</span>
                  </span>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {order.lines.map((line, i) => (
                    <div
                      key={i}
                      className="p-2.5 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{line.partName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{line.partCode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {formatNumber(line.orderedQuantity)} عدد
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleIssueMoFromContractLine(
                              order.contractNumber,
                              order.customerName,
                              line.partCode,
                              line.partName,
                              line.orderedQuantity
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          صدور MO
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: SAPCO CONTRACTS & QUOTA MANAGEMENT                      */}
      {/* ================================================================== */}
      {activeSubTab === 'SAPCO_CONTRACTS' && (
        <ContractsManagementView
          contracts={contracts}
          parts={parts}
          coils={coils}
          loading={loading}
          onRefresh={loadContractsAndOrders}
          currentUser={{
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            role: currentUser.role,
          }}
        />
      )}

      {/* New Customer Order Modal */}
      <NewCustomerOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        parts={parts}
        onSubmit={handleCreateCustomerOrder}
      />
    </div>
  );
};
