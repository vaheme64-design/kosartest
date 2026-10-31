import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  Routing,
  OperationStep,
  Part,
  Machine,
  DieMold,
  ProcessType,
  PROCESS_DEFINITIONS,
} from '../types/inventory';
import { toPersianDigits, formatNumber } from '../utils/formatters';

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

  // Modals
  const [isNewRoutingModalOpen, setIsNewRoutingModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // New Routing State
  const [newRoutingPartId, setNewRoutingPartId] = useState('');
  const [newRoutingVersion, setNewRoutingVersion] = useState('V1.0');
  const [newRoutingNotes, setNewRoutingNotes] = useState('');

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
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeRouting = useMemo(() => {
    return routings.find(r => r.id === selectedRoutingId) || routings[0] || null;
  }, [routings, selectedRoutingId]);

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

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
    const updatedOps = activeRouting.operations.filter((_, i) => i !== index);
    await onSaveRouting({
      ...activeRouting,
      operations: updatedOps,
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
      };

      let newOps = [...activeRouting.operations];
      if (editingStepIndex !== null && editingStepIndex >= 0) {
        newOps[editingStepIndex] = normalizedStep;
      } else {
        newOps.push(normalizedStep);
      }

      // Sort steps by stepNumber
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
      } else {
        setFormError(res.error || 'خطا در ایجاد مسیر تولید');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطای ارتباط');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            مرکز مهندسی تولید و ترتیب عملیات قطعات خودرو (BOM & Routing)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تعریف گام‌به‌گام فرایندهای تولید هر محصول (از ورق خام، بلنکینگ، کشش، خم، پانچ تا جوشکاری و رنگ) و اتصال قالب‌ها و پرس‌ها
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Part Selector Dropdown */}
          <select
            value={selectedRoutingId}
            onChange={e => setSelectedRoutingId(e.target.value)}
            className="flex-1 md:w-80 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            {routings.map(r => (
              <option key={r.id} value={r.id}>
                [{r.partCode}] {r.partName} ({r.operations.length} مرحله)
              </option>
            ))}
          </select>

          {/* New Routing Button */}
          <button
            onClick={() => {
              setNewRoutingPartId('');
              setNewRoutingVersion('V1.0');
              setNewRoutingNotes('');
              setFormError(null);
              setIsNewRoutingModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف مسیر تولید جدید</span>
          </button>
        </div>
      </div>

      {activeRouting ? (
        <div className="space-y-5">
          {/* Routing Summary Banner & Part Link */}
          <div className="bg-gradient-to-l from-slate-900 via-slate-800/90 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                  نسخه مهندسی: {activeRouting.version}
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold">
                  {activeRouting.partCode}
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  (محصول نهایی تحویل مشتری)
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1.5">
                {activeRouting.partName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                توالی ساخت: {toPersianDigits(activeRouting.operations.length)} ایستگاه عملیاتی متوالی
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/80 text-left sm:text-right">
                <span className="text-[11px] text-slate-400 block">مجموع زمان چرخه ساخت (Lead Time):</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {toPersianDigits(activeRouting.operations.reduce((s, op) => s + op.standardCycleTimeSec, 0))} ثانیه
                </span>
              </div>
              <button
                onClick={handleOpenAddStep}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن مرحله جدید (OP)</span>
              </button>
            </div>
          </div>

          {/* VISUAL PROCESS FLOW STEPPER */}
          <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 overflow-hidden">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>جریان تصویری تبدیل مواد و توالی فرآیندها:</span>
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shrink-0 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>کویل ورق ساپکو</span>
              </div>
              {activeRouting.operations.map((op, idx) => (
                <React.Fragment key={op.stepNumber}>
                  <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs shrink-0 min-w-[130px] hover:border-indigo-500 transition-colors">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{op.stepCode}</span>
                      <span className="text-indigo-400 font-bold">{op.processType}</span>
                    </div>
                    <div className="text-white font-medium truncate mt-1 text-[11px]">{op.stepName}</div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {op.dieMoldName ? `قالب: ${op.dieMoldName.slice(0, 16)}...` : op.machineName || 'پرس خط'}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" />
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shrink-0 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>انبار محصول نهایی</span>
              </div>
            </div>
          </div>

          {/* Sequential Operations Detailed List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                گام‌های تفصیلی عملیات و پارامترهای فنی
              </h4>
              <span className="text-xs text-slate-400">
                {toPersianDigits(activeRouting.operations.length)} عملیات تعریف شده
              </span>
            </div>

            {activeRouting.operations.map((op, idx) => {
              const isExpanded = expandedSteps[op.stepNumber] !== false; // Default open
              const machine = machines.find(m => m.id === op.machineId);
              const die = dies.find(d => d.id === op.dieMoldId);

              return (
                <div
                  key={op.stepNumber}
                  className="bg-slate-800/60 rounded-2xl border border-slate-700/60 overflow-hidden transition-all hover:border-slate-600"
                >
                  <div className="p-4 flex items-center justify-between bg-slate-900/30">
                    <div
                      onClick={() => toggleStep(op.stepNumber)}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center">
                        OP{op.stepNumber}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{op.stepName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono border border-slate-700">
                            {op.stepCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-cyan-300">
                            <Cpu className="w-3 h-3 text-cyan-400" />
                            {op.machineName || machine?.name || 'پرس خط'}
                          </span>
                          {op.dieMoldName && (
                            <span className="flex items-center gap-1 text-amber-300">
                              <Wrench className="w-3 h-3 text-amber-400" />
                              {op.dieMoldName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {onDirectProduce && (
                        <button
                          type="button"
                          onClick={() => onDirectProduce(activeRouting.partId, op.machineId)}
                          className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
                          title="ثبت مستقیم برگه تولید سالم در این مرحله"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>ثبت تولید</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditStep(op, idx)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                        title="ویرایش این گام"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="حذف این گام"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStep(op.stepNumber)}
                        className="p-1 text-slate-400"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-2.5 bg-slate-950/20">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">نوع فرآیند تولید:</span>
                          <span className="font-semibold text-amber-400 mt-0.5 block">{op.processType}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">قالب پرس اختصاصی:</span>
                          <span className="font-semibold text-white mt-0.5 block truncate">
                            {die ? `${die.name} (${die.code})` : op.dieMoldName || 'فاقد قالب (فیکسچر)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">زمان سیکل و تعویض قالب:</span>
                          <span className="font-semibold text-cyan-400 mt-0.5 block">
                            سیکل: {toPersianDigits(op.standardCycleTimeSec)}s | ستاپ: {toPersianDigits(op.setupTimeMin || 0)}m
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block">نرم مجاز ضایعات ساپکو:</span>
                          <span className="font-semibold text-rose-400 mt-0.5 block">
                            حداکثر {toPersianDigits(op.scrapNormPercent)}٪ در شیفت
                          </span>
                        </div>
                      </div>

                      {op.description && (
                        <p className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                          <strong>دستورالعمل کنترل ابعادی و بازرسی QC:</strong> {op.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/40 p-12 text-center text-slate-400 rounded-2xl border border-slate-700/60 text-xs">
          هیچ مسیر تولیدی تعریف نشده است. لطفاً روی دکمه «تعریف مسیر تولید جدید» کلیک کنید.
        </div>
      )}

      {/* MODAL: CREATE NEW ROUTING FOR ANY PART */}
      {isNewRoutingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitFork className="w-4 h-4 text-indigo-400" />
                <span>تعریف مسیر مهندسی تولید برای قطعه جدید</span>
              </h3>
              <button
                onClick={() => setIsNewRoutingModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateNewRouting} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">انتخاب قطعه از کاتالوگ ۵۲ گانه *</label>
                <select
                  value={newRoutingPartId}
                  onChange={e => setNewRoutingPartId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                >
                  <option value="">-- انتخاب قطعه مورد نظر برای تولید --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} ({p.carModel || 'مشترک'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  برای هر محصول نهایی یا مجموعه نیمه‌ساخته می‌توانید توالی ایستگاه‌ها و قالب‌ها را تنظیم کنید.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">نسخه مهندسی نقشه ساخت *</label>
                <input
                  type="text"
                  value={newRoutingVersion}
                  onChange={e => setNewRoutingVersion(e.target.value)}
                  placeholder="مثال: V1.0 یا V2.2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">یادداشت‌ها و الزامات کیفی قرارداد</label>
                <textarea
                  rows={2}
                  value={newRoutingNotes}
                  onChange={e => setNewRoutingNotes(e.target.value)}
                  placeholder="مثلاً: تست گشتاور مهره حداقل 45Nm، تست سالت اسپری ۵۰۰ ساعت ساپکو..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRoutingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-900/30"
                >
                  {loading ? 'در حال ایجاد...' : 'ایجاد مسیر تولید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT OPERATION STEP */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>
                  {editingStepIndex !== null ? 'ویرایش گام عملیات' : 'افزودن گام عملیاتی OP جدید'}
                </span>
              </h3>
              <button
                onClick={() => setIsStepModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStep} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">شماره گام متوالی *</label>
                  <input
                    type="number"
                    step="10"
                    value={stepData.stepNumber || 10}
                    onChange={e => setStepData({ ...stepData, stepNumber: parseInt(e.target.value, 10) || 10 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500">معمولاً با مضارب ۱۰ (OP10, OP20...)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">کد فنی گام *</label>
                  <input
                    type="text"
                    value={stepData.stepCode || ''}
                    onChange={e => setStepData({ ...stepData, stepCode: e.target.value })}
                    placeholder="OP20_BLNK"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">عنوان کامل عملیات *</label>
                <input
                  type="text"
                  value={stepData.stepName || ''}
                  onChange={e => setStepData({ ...stepData, stepName: e.target.value })}
                  placeholder="مثلاً: کشش عمیق پوسته در پرس ۸۰۰ تن با بلانک‌هولدر"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">نوع فرآیند *</label>
                  <select
                    value={stepData.processType}
                    onChange={e => setStepData({ ...stepData, processType: e.target.value as ProcessType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {PROCESS_DEFINITIONS.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">ماشین‌آلات / پرس پیشنهادی</label>
                  <select
                    value={stepData.machineId || ''}
                    onChange={e => setStepData({ ...stepData, machineId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- بدون انتساب / دستی --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.code}] {m.name} ({m.tonnage ? `${m.tonnage}T` : m.processType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">قالب پرس متصل به این مرحله</label>
                  <select
                    value={stepData.dieMoldId || ''}
                    onChange={e => setStepData({ ...stepData, dieMoldId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- بدون قالب اختصاصی --</option>
                    {dies.map(d => (
                      <option key={d.id} value={d.id}>
                        [{d.code}] {d.name} ({d.requiredTonnage}T)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">تناژ مورد نیاز پرس (تن)</label>
                  <input
                    type="number"
                    value={stepData.requiredTonnage || 0}
                    onChange={e => setStepData({ ...stepData, requiredTonnage: parseFloat(e.target.value) || 0 })}
                    placeholder="مثلاً: 400"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">زمان سیکل استاندارد (ثانیه)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={stepData.standardCycleTimeSec || 10}
                    onChange={e => setStepData({ ...stepData, standardCycleTimeSec: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">زمان ستاپ قالب (دقیقه)</label>
                  <input
                    type="number"
                    value={stepData.setupTimeMin || 0}
                    onChange={e => setStepData({ ...stepData, setupTimeMin: parseFloat(e.target.value) || 0 })}
                    placeholder="25"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">نرم ضایعات مجاز ساپکو (٪)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stepData.scrapNormPercent || 1}
                    onChange={e => setStepData({ ...stepData, scrapNormPercent: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">دستورالعمل کنترل ابعادی و نکات قالب</label>
                <textarea
                  rows={2}
                  value={stepData.description || ''}
                  onChange={e => setStepData({ ...stepData, description: e.target.value })}
                  placeholder="نکات تنظیم لقی سنبه ماتریس، روان‌کاری ورق، کنترل پارگی کشش..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {loading ? 'در حال ذخیره...' : 'ذخیره گام عملیاتی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
