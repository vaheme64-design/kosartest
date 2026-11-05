import React, { useState, useMemo, useEffect } from 'react';
import {
  GitFork,
  Clock,
  AlertOctagon,
  Cpu,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Settings,
  Trash2,
  Edit3,
  Wrench,
  ArrowLeft,
  X,
  PlayCircle,
  FileCheck2,
  ShieldCheck,
  Search,
  Sparkles,
  Tag,
  HelpCircle,
  Filter,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  Routing,
  OperationStep,
  Part,
  Machine,
  DieMold,
  ProcessType,
  PROCESS_DEFINITIONS,
  CarModel,
} from '../types/inventory';
import { toPersianDigits, formatNumber } from '../utils/formatters';
import { MasterDataDifferenceGuideModal } from './common/MasterDataDifferenceGuideModal';
import { TraceabilityTagModal } from './wip/TraceabilityTagModal';
import { SearchableSelect } from './common/SearchableSelect';

interface RoutingsViewProps {
  routings: Routing[];
  parts: Part[];
  machines: Machine[];
  dies?: DieMold[];
  onSaveRouting: (routing: Partial<Routing>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteRouting?: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDirectProduce?: (partId: string, stageId?: string, machineId?: string) => void;
}

export const RoutingsView: React.FC<RoutingsViewProps> = ({
  routings,
  parts,
  machines,
  dies = [],
  onSaveRouting,
  onDeleteRouting,
  onDirectProduce,
}) => {
  const [selectedRoutingId, setSelectedRoutingId] = useState<string>(routings[0]?.id || '');
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'STEPPER'>('STEPPER');

  // Dynamic Car Models from API
  const [carModelsList, setCarModelsList] = useState<CarModel[]>([]);
  const [selectedCarModel, setSelectedCarModel] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/car-models')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCarModelsList(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewRoutingModalOpen, setIsNewRoutingModalOpen] = useState(false);
  const [isEditRoutingModalOpen, setIsEditRoutingModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);

  // New Routing Form State
  const [newRoutingPartId, setNewRoutingPartId] = useState('');
  const [newRoutingVersion, setNewRoutingVersion] = useState('V1.0');
  const [newRoutingNotes, setNewRoutingNotes] = useState('');

  // Edit Routing Form State
  const [editVersion, setEditVersion] = useState('V1.0');
  const [editNotes, setEditNotes] = useState('');

  // Step Form State
  const [stepData, setStepData] = useState<Partial<OperationStep>>({
    stepNumber: 10,
    stepCode: 'OP10_BLNK',
    stepName: '',
    processType: 'BLANKING',
    machineId: '',
    dieMoldId: '',
    requiredTonnage: 250,
    setupTimeMin: 30,
    standardCycleTimeSec: 10,
    scrapNormPercent: 1.0,
    description: '',
    isSharedOperation: false,
    sharedPartId: '',
    sharedPartCode: '',
    sharedPartName: '',
    sharedYieldRatio: 1,
    sharedOperationNotes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtered Routings
  const filteredRoutings = useMemo(() => {
    return routings.filter(r => {
      const part = parts.find(p => p.id === r.partId || p.code === r.partCode);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.partCode.toLowerCase().includes(q) ||
        r.partName.toLowerCase().includes(q) ||
        (part?.carModel && part.carModel.toLowerCase().includes(q)) ||
        r.operations.some(op => op.stepName.toLowerCase().includes(q));

      const matchesCar =
        selectedCarModel === 'ALL' ||
        (part?.carModel && part.carModel.includes(selectedCarModel)) ||
        r.partName.includes(selectedCarModel);

      return matchesSearch && matchesCar;
    });
  }, [routings, parts, searchQuery, selectedCarModel]);

  const activeRouting = useMemo(() => {
    if (selectedRoutingId) {
      const found = routings.find(r => r.id === selectedRoutingId);
      if (found) return found;
    }
    return filteredRoutings[0] || routings[0] || null;
  }, [routings, selectedRoutingId, filteredRoutings]);

  // Open Step Modal for Add or Edit
  const handleOpenAddStep = () => {
    if (!activeRouting) return;
    const nextStepNum = activeRouting.operations.length > 0
      ? Math.max(...activeRouting.operations.map(o => o.stepNumber)) + 10
      : 10;

    setEditingStepIndex(null);
    setStepData({
      stepNumber: nextStepNum,
      stepCode: `OP${nextStepNum}_FORM`,
      stepName: '',
      processType: 'PUNCH_FORM',
      machineId: machines[0]?.id || '',
      dieMoldId: dies[0]?.id || '',
      requiredTonnage: 250,
      setupTimeMin: 20,
      standardCycleTimeSec: 12,
      scrapNormPercent: 1.0,
      description: '',
    });
    setFormError(null);
    setIsStepModalOpen(true);
  };

  const handleOpenEditStep = (step: OperationStep, index: number) => {
    setEditingStepIndex(index);
    setStepData({ ...step });
    setFormError(null);
    setIsStepModalOpen(true);
  };

  const handleDeleteStep = async (index: number) => {
    if (!activeRouting) return;
    if (!confirm('آیا از حذف این گام عملیاتی اطمینان دارید؟')) return;
    const updatedOps = activeRouting.operations.filter((_, i) => i !== index);
    await onSaveRouting({
      ...activeRouting,
      operations: updatedOps,
    });
  };

  const handleMoveStep = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!activeRouting) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeRouting.operations.length) return;

    const newOps = [...activeRouting.operations];
    const temp = newOps[index];
    newOps[index] = newOps[targetIndex];
    newOps[targetIndex] = temp;

    const renumberedOps = newOps.map((op, i) => {
      const newStepNum = (i + 1) * 10;
      return {
        ...op,
        stepNumber: newStepNum,
        stepCode: op.stepCode.replace(/OP\d+/i, `OP${newStepNum}`),
      };
    });

    await onSaveRouting({
      ...activeRouting,
      operations: renumberedOps,
    });
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!activeRouting) return;

    if (!stepData.stepName || !stepData.processType) {
      setFormError('نام عملیات و نوع فرآیند الزامی هستند.');
      return;
    }

    setLoading(true);
    try {
      const machine = machines.find(m => m.id === stepData.machineId);
      const die = dies.find(d => d.id === stepData.dieMoldId);

      const normalizedStep: OperationStep = {
        stepNumber: Number(stepData.stepNumber) || 10,
        stepCode: stepData.stepCode || `OP${stepData.stepNumber}`,
        stepName: stepData.stepName,
        processType: stepData.processType as ProcessType,
        machineId: stepData.machineId,
        machineName: machine ? machine.name : undefined,
        dieMoldId: stepData.dieMoldId,
        dieMoldName: die ? die.name : undefined,
        requiredTonnage: Number(stepData.requiredTonnage) || 0,
        setupTimeMin: Number(stepData.setupTimeMin) || 0,
        standardCycleTimeSec: Number(stepData.standardCycleTimeSec) || 10,
        scrapNormPercent: Number(stepData.scrapNormPercent) || 1,
        description: stepData.description || '',
        isSharedOperation: stepData.isSharedOperation || false,
        sharedPartId: stepData.sharedPartId,
        sharedPartCode: stepData.sharedPartCode,
        sharedPartName: stepData.sharedPartName,
        sharedYieldRatio: Number(stepData.sharedYieldRatio) || 1,
        sharedOperationNotes: stepData.sharedOperationNotes || '',
      };

      let newOps = [...activeRouting.operations];
      if (editingStepIndex !== null && editingStepIndex >= 0) {
        newOps[editingStepIndex] = normalizedStep;
      } else {
        newOps.push(normalizedStep);
      }

      newOps.sort((a, b) => a.stepNumber - b.stepNumber);

      const res = await onSaveRouting({
        ...activeRouting,
        operations: newOps,
      });

      if (res.success) {
        setIsStepModalOpen(false);
      } else {
        setFormError(res.error || 'خطا در ثبت گام عملیات');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newRoutingPartId) {
      setFormError('لطفاً قطعه مورد نظر را از کاتالوگ انتخاب نمایید.');
      return;
    }

    const part = parts.find(p => p.id === newRoutingPartId);
    if (!part) return;

    setLoading(true);
    try {
      const initialStep: OperationStep = {
        stepNumber: 10,
        stepCode: 'OP10_BLNK',
        stepName: `بلنکینگ و برش اولیه ${part.name}`,
        processType: 'BLANKING',
        machineId: machines[0]?.id,
        machineName: machines[0]?.name,
        standardCycleTimeSec: 15,
        scrapNormPercent: 1.2,
        description: 'برش و آماده‌سازی بلنک مطابق نقشه مهندسی ساپکو',
      };

      const res = await onSaveRouting({
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        version: newRoutingVersion || 'V1.0',
        operations: [initialStep],
        notes: newRoutingNotes,
      });

      if (res.success) {
        setIsNewRoutingModalOpen(false);
        setNewRoutingPartId('');
        setViewMode('STEPPER');
      } else {
        setFormError(res.error || 'خطا در ایجاد مسیر تولید');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای ارتباط');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditRouting = () => {
    if (!activeRouting) return;
    setEditVersion(activeRouting.version || 'V1.0');
    setEditNotes(activeRouting.notes || '');
    setIsEditRoutingModalOpen(true);
  };

  const handleSaveEditRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRouting) return;

    try {
      const res = await onSaveRouting({
        ...activeRouting,
        version: editVersion,
        notes: editNotes,
      });
      if (res.success) {
        setIsEditRoutingModalOpen(false);
      }
    } catch {
      alert('خطا در ذخیره ویرایش');
    }
  };

  const handleDeleteRouting = async () => {
    if (!activeRouting) return;
    if (!confirm(`آیا از حذف کامل مسیر تولید برای قطعه [${activeRouting.partCode}] ${activeRouting.partName} اطمینان دارید؟`)) {
      return;
    }
    if (onDeleteRouting) {
      await onDeleteRouting(activeRouting.id);
    }
  };

  return (
    <div className="space-y-5 font-sans text-right">
      {/* Grafana-Inspired Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center shrink-0">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base lg:text-lg font-bold text-slate-900">
                  مدیریت مسیرهای مهندسی تولید (Manufacturing Routings)
                </h2>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  {toPersianDigits(routings.length)} مسیر فعال
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تعیین توالی ایستگاه‌های کاری (OP10 برش، OP20 کشش، OP30 پانچ و...)، انتساب پرس، قالب و زمان‌های استاندارد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={() => {
                setNewRoutingPartId('');
                setNewRoutingVersion('V1.0');
                setNewRoutingNotes('');
                setFormError(null);
                setIsNewRoutingModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-orange-400" />
              <span>تعریف مسیر تولید برای قطعه جدید</span>
            </button>

            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('STEPPER')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  viewMode === 'STEPPER' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                نمای مراحل عملیات
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DIRECTORY')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  viewMode === 'DIRECTORY' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                کاتالوگ کلیه قطعات ({toPersianDigits(parts.length)})
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Instant Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در کد فنی، نام قطعه یا گام عملیات..."
                className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 w-64 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dynamic Car Model Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedCarModel('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                  selectedCarModel === 'ALL'
                    ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                همه مدل‌ها
              </button>
              {carModelsList.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedCarModel(m.name)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border whitespace-nowrap ${
                    selectedCarModel === m.name
                      ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Routing Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">انتخاب مسیر جاری:</span>
            <select
              value={activeRouting?.id || ''}
              onChange={e => {
                setSelectedRoutingId(e.target.value);
                setViewMode('STEPPER');
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {filteredRoutings.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.partCode}] {r.partName} ({toPersianDigits(r.operations.length)} مرحله)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ALL PARTS DIRECTORY */}
      {viewMode === 'DIRECTORY' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-600" />
              <span>وضعیت تخصیص مسیر تولید به قطعات کاتالوگ کارخانه:</span>
            </h3>
            <span className="text-xs text-slate-500">
              {toPersianDigits(parts.length)} قطعه در کاتالوگ • {toPersianDigits(routings.length)} دارای مسیر ساخت
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">کد قطعه</th>
                  <th className="py-3 px-3.5">عنوان قطعه در خط</th>
                  <th className="py-3 px-3.5">نوع کالا</th>
                  <th className="py-3 px-3.5">مدل خودرو</th>
                  <th className="py-3 px-3.5">وضعیت مسیر ساخت</th>
                  <th className="py-3 px-3.5">تعداد مراحل (OP)</th>
                  <th className="py-3 px-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parts.map(p => {
                  const r = routings.find(rt => rt.partId === p.id || rt.partCode === p.code);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{p.code}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.category === 'FINISHED_GOOD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.category === 'WIP_PART' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.category === 'FINISHED_GOOD' ? 'محصول نهایی' : p.category === 'WIP_PART' ? 'نیمه‌ساخته' : 'ماده اولیه'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{p.carModel || 'مشترک'}</td>
                      <td className="py-3 px-3.5">
                        {r ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>دارای مسیر (نسخه {r.version})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">فاقد مسیر تولید</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono">
                        {r ? `${toPersianDigits(r.operations.length)} ایستگاه` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {r ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoutingId(r.id);
                              setViewMode('STEPPER');
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            مشاهده و ویرایش مراحل ←
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewRoutingPartId(p.id);
                              setNewRoutingVersion('V1.0');
                              setNewRoutingNotes('');
                              setIsNewRoutingModalOpen(true);
                            }}
                            className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            + ایجاد مسیر برای این قطعه
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: STEPPER & PROCESS DETAILS */}
      {viewMode === 'STEPPER' && activeRouting && (
        <div className="space-y-5">
          {/* Active Routing Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold">
                    {activeRouting.partCode}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    نسخه {activeRouting.version}
                  </span>
                  <span className="text-xs text-slate-500">
                    توالی: <strong>{toPersianDigits(activeRouting.operations.length)} ایستگاه عملیاتی</strong>
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                  {activeRouting.partName}
                </h3>
                {activeRouting.notes && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    الزامات کیفی و یادداشت‌ها: {activeRouting.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons for Active Routing */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block">زمان چرخه کل ساخت:</span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    {toPersianDigits(activeRouting.operations.reduce((s, op) => s + op.standardCycleTimeSec, 0))} ثانیه
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddStep}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ افزودن مرحله عملیاتی جدید (OP)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenEditRouting}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                  ویرایش سند
                </button>

                <button
                  type="button"
                  onClick={handleDeleteRouting}
                  className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-rose-200"
                  title="حذف این مسیر"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Process Flow Horizontal Stepper */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">گردش متوالی فرآیند ساخت:</span>
              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {activeRouting.operations.map((op, idx) => (
                  <React.Fragment key={op.stepNumber || idx}>
                    <div className="flex-1 min-w-[150px] p-3 rounded-xl bg-slate-50 border border-slate-200 text-right space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {op.stepCode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {toPersianDigits(op.standardCycleTimeSec)}s
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 line-clamp-1 mt-1">{op.stepName}</div>
                      {op.isSharedOperation && (
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 block mt-1">
                          ✨ قالب ۲ کویته ({op.sharedPartCode || 'هم‌تولید'})
                        </span>
                      )}
                      <div className="text-[11px] text-slate-500 line-clamp-1">{op.machineName || 'پرس دستی'}</div>
                    </div>
                    {idx < activeRouting.operations.length - 1 && (
                      <ArrowLeft className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Operations Breakdown Table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800">
                جزئیات مهندسی ایستگاه‌ها، قالب‌ها و پارامترهای کنترل فرآیند:
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">شماره گام</th>
                      <th className="py-3 px-3.5">کد و عنوان عملیات</th>
                      <th className="py-3 px-3.5">نوع فرآیند</th>
                      <th className="py-3 px-3.5">پرس / دستگاه انتسابی</th>
                      <th className="py-3 px-3.5">قالب متصل</th>
                      <th className="py-3 px-3.5 text-center">تناژ لازم</th>
                      <th className="py-3 px-3.5 text-center">زمان سیکل (ثانیه)</th>
                      <th className="py-3 px-3.5 text-center">ستاپ (دقیقه)</th>
                      <th className="py-3 px-3.5 text-center">ضایعات مجاز</th>
                      <th className="py-3 px-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeRouting.operations.map((step, idx) => (
                      <tr key={step.stepNumber || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-indigo-700">
                          {step.stepCode}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          {step.stepName}
                          {step.isSharedOperation && (
                            <span className="mt-1 block text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md w-fit">
                              ✨ عملیات مشترک: خروجی همزمان {step.sharedPartCode ? `[${step.sharedPartCode}]` : ''} ({toPersianDigits(step.sharedYieldRatio || 1)} عدد در هر ضرب)
                            </span>
                          )}
                          {step.description && (
                            <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                              {step.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200">
                            {step.processType}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-800 font-medium">
                          {step.machineName || 'پرس مشترک سالن'}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-purple-700 text-[11px]">
                          {step.dieMoldName || 'فاقد قالب'}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">
                          {step.requiredTonnage ? `${toPersianDigits(step.requiredTonnage)}T` : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900">
                          {toPersianDigits(step.standardCycleTimeSec)}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-slate-600">
                          {toPersianDigits(step.setupTimeMin || 0)}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-amber-700 font-bold">
                          {toPersianDigits(step.scrapNormPercent)}%
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStep(idx, 'UP')}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded transition cursor-pointer"
                              title="انتقال به گام قبلی (تغییر توالی)"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeRouting.operations.length - 1}
                              onClick={() => handleMoveStep(idx, 'DOWN')}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded transition cursor-pointer"
                              title="انتقال به گام بعدی (تغییر توالی)"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStep(step, idx)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="ویرایش گام"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="حذف گام"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE NEW ROUTING */}
      {isNewRoutingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-indigo-600" />
                <span>تعریف مسیر تولید مهندسی برای قطعه جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewRoutingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateNewRouting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  انتخاب قطعه خودرویی از کاتالوگ *
                </label>
                <SearchableSelect
                  value={newRoutingPartId}
                  onChange={val => setNewRoutingPartId(val)}
                  placeholder="جستجو و انتخاب قطعه برای ساخت مسیر..."
                  searchPlaceholder="جستجوی کد یا نام قطعه..."
                  options={parts.map(p => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `${p.code} • ${p.carModel || 'مشترک'}`,
                    badge: p.category === 'FINISHED_GOOD' ? 'محصول' : p.category === 'WIP_PART' ? 'نیمه‌ساخته' : 'ماده اولیه',
                  }))}
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">نسخه مهندسی نقشه ساخت *</label>
                <input
                  type="text"
                  required
                  value={newRoutingVersion}
                  onChange={e => setNewRoutingVersion(e.target.value)}
                  placeholder="V1.0 یا V2.1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">یادداشت‌ها و الزامات قرارداد ساپکو</label>
                <textarea
                  rows={2}
                  value={newRoutingNotes}
                  onChange={e => setNewRoutingNotes(e.target.value)}
                  placeholder="الزامات ابعادی، تلرانس‌های مجاز، نوع روانکاری ورق و کنترل پلیسه..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewRoutingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {loading ? 'در حال ایجاد...' : 'ایجاد مسیر تولید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ACTIVE ROUTING */}
      {isEditRoutingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">ویرایش مشخصات سند مسیر تولید</h3>
              <button
                type="button"
                onClick={() => setIsEditRoutingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRouting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">نسخه مهندسی مسیر</label>
                <input
                  type="text"
                  required
                  value={editVersion}
                  onChange={e => setEditVersion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">یادداشت‌ها و الزامات نقشه</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditRoutingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  ثبت تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT OPERATION STEP */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-5 shadow-xl space-y-4 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-600" />
                <span>{editingStepIndex !== null ? 'ویرایش گام عملیات' : 'افزودن گام عملیاتی OP جدید'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStepModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStep} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">شماره گام (Step Number) *</label>
                  <input
                    type="number"
                    step={10}
                    required
                    value={stepData.stepNumber || 10}
                    onChange={e => setStepData({ ...stepData, stepNumber: parseInt(e.target.value, 10) || 10 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">معمولاً به صورت مضارب ۱۰ (OP10, OP20, OP30)</span>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">کد فنی گام *</label>
                  <input
                    type="text"
                    required
                    value={stepData.stepCode || ''}
                    onChange={e => setStepData({ ...stepData, stepCode: e.target.value })}
                    placeholder="OP20_DRAW"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">عنوان کامل عملیات *</label>
                <input
                  type="text"
                  required
                  value={stepData.stepName || ''}
                  onChange={e => setStepData({ ...stepData, stepName: e.target.value })}
                  placeholder="مثال: کشش عمیق پوسته و فرم‌دهی در پرس ۸۰۰ تن"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">نوع فرآیند *</label>
                  <select
                    value={stepData.processType}
                    onChange={e => setStepData({ ...stepData, processType: e.target.value as ProcessType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {PROCESS_DEFINITIONS.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">پرس / دستگاه انتسابی</label>
                  <select
                    value={stepData.machineId || ''}
                    onChange={e => setStepData({ ...stepData, machineId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- بدون انتساب / دستی --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.code}] {m.name} ({m.tonnage}T)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">قالب پرس متصل به این مرحله</label>
                  <select
                    value={stepData.dieMoldId || ''}
                    onChange={e => setStepData({ ...stepData, dieMoldId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- بدون قالب اختصاصی --</option>
                    {dies.map(d => (
                      <option key={d.id} value={d.id}>
                        [{d.code}] {d.name} ({d.requiredTonnage}T)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">تناژ اسمی مورد نیاز (تن)</label>
                  <input
                    type="number"
                    value={stepData.requiredTonnage || 0}
                    onChange={e => setStepData({ ...stepData, requiredTonnage: parseFloat(e.target.value) || 0 })}
                    placeholder="400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">زمان چرخه (ثانیه) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={stepData.standardCycleTimeSec || 10}
                    onChange={e => setStepData({ ...stepData, standardCycleTimeSec: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">زمان ستاپ قالب (دقیقه)</label>
                  <input
                    type="number"
                    value={stepData.setupTimeMin || 0}
                    onChange={e => setStepData({ ...stepData, setupTimeMin: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">نرم ضایعات مجاز (٪) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={stepData.scrapNormPercent || 1}
                    onChange={e => setStepData({ ...stepData, scrapNormPercent: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">دستورالعمل کنترل ابعادی و نکات قالب</label>
                <textarea
                  rows={2}
                  value={stepData.description || ''}
                  onChange={e => setStepData({ ...stepData, description: e.target.value })}
                  placeholder="نکات تنظیم لقی سنبه ماتریس، کنترل چروکیدگی کشش، روغن‌کاری ورق..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Shared Operation / Dual-Output Co-Production Config */}
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSharedOpCheck"
                    checked={stepData.isSharedOperation || false}
                    onChange={e => setStepData({ ...stepData, isSharedOperation: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="isSharedOpCheck" className="font-bold text-xs text-purple-950 cursor-pointer">
                    عملیات مشترک / خروجی همزمان دوگانه (قالب ۲ کویته متقارن مانند چپ و راست)
                  </label>
                </div>

                {stepData.isSharedOperation && (
                  <div className="space-y-2.5 pt-1 text-xs">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">
                        انتخاب قطعه دوم هم‌تولید (Co-Produced Part) *
                      </label>
                      <select
                        value={stepData.sharedPartId || ''}
                        onChange={e => {
                          const pId = e.target.value;
                          const found = parts.find(p => p.id === pId || p.code === pId);
                          setStepData({
                            ...stepData,
                            sharedPartId: pId,
                            sharedPartCode: found?.code || '',
                            sharedPartName: found?.name || '',
                          });
                        }}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="">-- انتخاب قطعه مکمل (مثلاً پشت صندلی راست) --</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.code}] {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-purple-900 mb-1">کد فنی قطعه دوم</label>
                        <input
                          type="text"
                          value={stepData.sharedPartCode || ''}
                          onChange={e => setStepData({ ...stepData, sharedPartCode: e.target.value })}
                          placeholder="SAPCO-ST-BACK-RH"
                          className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-purple-900 mb-1">نسبت خروجی در هر ضرب</label>
                        <input
                          type="number"
                          min={1}
                          value={stepData.sharedYieldRatio || 1}
                          onChange={e => setStepData({ ...stepData, sharedYieldRatio: parseInt(e.target.value, 10) || 1 })}
                          className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {loading ? 'در حال ذخیره...' : 'ذخیره گام عملیاتی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      <MasterDataDifferenceGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* Traceability Modal */}
      <TraceabilityTagModal
        isOpen={isTraceabilityModalOpen}
        onClose={() => setIsTraceabilityModalOpen(false)}
        parts={parts}
        machines={machines}
        dies={dies}
        initialPartCode={activeRouting?.partCode}
      />
    </div>
  );
};
