import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Send,
  GitBranch,
  Info,
  Calendar,
  Package,
  Wrench,
  Gauge,
  Percent,
} from 'lucide-react';
import {
  ProductionPlanSuggestion,
  ProposedOperationPlan,
  MachineEligibilityCheck,
} from '../../types/productionPlanning';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';

interface MachineRecommendationViewProps {
  suggestions: ProductionPlanSuggestion[];
  selectedSuggestionId: string | null;
  onSelectSuggestion: (id: string) => void;
  onApprovePlan: (id: string, approvedBy: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onReleaseMo: (id: string, releasedBy: string) => Promise<{ success: boolean; message?: string; moId?: string; error?: string }>;
  onRevisePlan: (id: string, changeReason: string) => Promise<{ success: boolean; message?: string; newPlanId?: string; error?: string }>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const MachineRecommendationView: React.FC<MachineRecommendationViewProps> = ({
  suggestions,
  selectedSuggestionId,
  onSelectSuggestion,
  onApprovePlan,
  onReleaseMo,
  onRevisePlan,
  onRefresh,
  loading = false,
}) => {
  const [expandedOperationIndex, setExpandedOperationIndex] = useState<number | null>(0);
  const [showAllCandidates, setShowAllCandidates] = useState<Record<number, boolean>>({});
  const [actionInProgress, setActionInProgress] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Current selected suggestion
  const activePlan = suggestions.find(s => s.id === selectedSuggestionId) || suggestions[0] || null;

  const toggleAllCandidates = (idx: number) => {
    setShowAllCandidates(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleApprove = async () => {
    if (!activePlan) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onApprovePlan(activePlan.id, 'مدیر برنامه‌ریزی تولید');
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'برنامه با موفقیت به تصویب رسید.' });
        await onRefresh();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در تصویب برنامه' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRelease = async () => {
    if (!activePlan) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onReleaseMo(activePlan.id, 'سرپرست برنامه‌ریزی');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `دستور کار کارگاهی با شناسه ${res.moId || ''} ایجاد و به خط تولید صادر گردید.`,
        });
        await onRefresh();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در صدور دستور کار' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !revisionReason.trim()) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onRevisePlan(activePlan.id, revisionReason.trim());
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'نسخه جدید برنامه ایجاد شد.' });
        setShowRevisionModal(false);
        setRevisionReason('');
        await onRefresh();
        if (res.newPlanId) {
          onSelectSuggestion(res.newPlanId);
        }
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در ایجاد بازنگری' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  if (!activePlan && suggestions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">هیچ برنامه تولید پیشنهادی یافت نشد</h3>
        <p className="text-sm mt-1 text-slate-400">
          برای ایجاد برنامه‌های پیشنهادی، سفارشات مشتریان را ثبت کرده یا دکمه «محاسبه مجدد تقاضا و برنامه‌ریزی هوشمند» را بزنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            بستن
          </button>
        </div>
      )}

      {/* Plan Selector & Quick Actions Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  موتور تطبیق و اولویت‌بندی ماشین‌آلات پرس و تجهیزات
                </h2>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {toPersianDigits(suggestions.length)} پیشنهاد فعال
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصیص هوشمند مراحل مسیر تولید براساس تناژ، سازگاری قالب، وضعیت سلامت دستگاه و سقف ظرفیت شیفت
              </p>
            </div>
          </div>

          {/* Plan Selector Dropdown */}
          <div className="w-full lg:w-auto flex flex-wrap items-center gap-2.5">
            <label className="text-xs text-slate-400">انتخاب برنامه:</label>
            <select
              value={activePlan?.id || ''}
              onChange={e => onSelectSuggestion(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              {suggestions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.planNumber} ({s.planVersion}) - {s.partName} ({formatNumber(s.proposedQuantity)} عدد)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activePlan && (
        <>
          {/* Active Plan Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-black text-slate-100 font-mono tracking-tight">
                    {activePlan.planNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    نسخه {toPersianDigits(activePlan.planVersion)}
                  </span>
                  {activePlan.approvalStatus === 'DRAFT_SUGGESTION' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      پیش‌نویس موتور برنامه‌ریزی
                    </span>
                  )}
                  {activePlan.approvalStatus === 'APPROVED' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      مصوب مدیر تولید
                    </span>
                  )}
                  {activePlan.approvalStatus === 'CONVERTED_TO_MO' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      صادر شده به دستور کار کارگاهی
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-300 font-medium mt-1 flex items-center gap-3">
                  <span>قطعه: <strong className="text-amber-400 font-bold">{activePlan.partName}</strong></span>
                  <span className="text-slate-500 font-mono">({activePlan.partCode})</span>
                  <span className="text-xs text-slate-400">
                    تحویل سفارشات: {formatToJalali(activePlan.targetDueDate)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {activePlan.approvalStatus === 'DRAFT_SUGGESTION' && (
                  <button
                    onClick={handleApprove}
                    disabled={actionInProgress || !activePlan.overallFeasible}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <FileCheck className="w-4 h-4" />
                    تأیید و تصویب برنامه
                  </button>
                )}

                {activePlan.approvalStatus === 'APPROVED' && (
                  <button
                    onClick={handleRelease}
                    disabled={actionInProgress}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    صدور رسمی دستور کار (Release MO)
                  </button>
                )}

                {activePlan.approvalStatus === 'CONVERTED_TO_MO' && activePlan.createdMoId && (
                  <div className="text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-300 font-mono flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-purple-400" />
                    شناسه MO: {activePlan.createdMoId}
                  </div>
                )}

                <button
                  onClick={() => setShowRevisionModal(true)}
                  disabled={actionInProgress}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                >
                  <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                  ایجاد بازنگری (Revision)
                </button>
              </div>
            </div>

            {/* Infeasibility Warnings Banner if any */}
            {!activePlan.overallFeasible && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  برنامه با محدودیت‌های خط تولید مواجه بوده و قابل اجرای مستقیم نیست:
                </div>
                <ul className="list-disc list-inside space-y-0.5 pr-2 opacity-90">
                  {activePlan.infeasibilityWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculations Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">تقاضای سفارشات</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">
                  {formatNumber(activePlan.grossDemand)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">موجودی آزاد انبار</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {formatNumber(activePlan.availableFg)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">اعتبار WIP خطوط</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">
                  {formatNumber(activePlan.wipCredit)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">الزام خالص تولید</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">
                  {formatNumber(activePlan.proposedQuantity)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">ورق مصرفی مورد نیاز</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">
                  {formatNumber(activePlan.materialStatus.requiredWeightKg)} <span className="text-[10px] text-slate-500">kg</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[11px] text-slate-400">وضعیت کلاف ساپکو</div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    activePlan.materialStatus.hasShortage ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activePlan.materialStatus.hasShortage
                    ? `کسری ${formatNumber(activePlan.materialStatus.shortageKg)} kg`
                    : 'تأمین کامل'}
                </div>
              </div>
            </div>
          </div>

          {/* Proposed Operations List with Ranked Machine Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                توالی عملیات مسیر تولید و نتایج ارزیابی ماشین‌آلات پرس
              </h3>
              <span className="text-xs text-slate-400">
                {toPersianDigits(activePlan.proposedOperations.length)} مرحله تولید مصوب
              </span>
            </div>

            <div className="space-y-4">
              {activePlan.proposedOperations.map((op, idx) => {
                const isExpanded = expandedOperationIndex === idx;
                const recMachine = op.recommendedMachine;
                const showCandidates = showAllCandidates[idx];

                return (
                  <div
                    key={idx}
                    className={`bg-slate-900 border rounded-xl overflow-hidden transition ${
                      op.isInfeasible
                        ? 'border-rose-900/60 bg-rose-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Operation Step Header Bar */}
                    <div
                      onClick={() => setExpandedOperationIndex(isExpanded ? null : idx)}
                      className="p-4 cursor-pointer hover:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-slate-700">
                          {toPersianDigits(op.stepNumber)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-100">{op.stepName}</span>
                            <span className="text-xs font-mono text-slate-400">({op.stepCode})</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {op.processType}
                            </span>
                            {op.requiredTonnage > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                تناژ الزامی: {formatNumber(op.requiredTonnage)} T
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                            <span>تیراژ عملیات: <strong className="text-slate-200">{formatNumber(op.plannedQuantity)}</strong> عدد</span>
                            <span>سایکل استاندارد: <strong className="text-slate-200">{toPersianDigits(op.standardCycleTimeSec)}</strong> ثانیه</span>
                            <span>زمان خالص تخمینی: <strong className="text-slate-200">{toPersianDigits(op.estimatedRunHours)}</strong> ساعت</span>
                            {op.dieMoldName && (
                              <span className="text-purple-300">
                                قالب اختصاصی: {op.dieMoldName} ({op.dieMoldCode})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {recMachine ? (
                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                اولویت اول: {recMachine.machineName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                امتیاز تناسب: {toPersianDigits(recMachine.suitabilityScore)}% | بار کاری: {toPersianDigits(recMachine.currentWorkloadPercent)}%
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-xs font-mono border border-emerald-500/20">
                              {recMachine.machineCode}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                            <XCircle className="w-4 h-4" />
                            فاقد دستگاه مجاز و سازگار
                          </div>
                        )}
                        <button className="text-slate-400 hover:text-slate-200 p-1">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-4">
                        {/* Top Recommended Machine Card Details */}
                        {recMachine ? (
                          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    ★ اولویت اول پیشنهادی سیستم
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-100">
                                    {recMachine.machineName} ({recMachine.machineCode})
                                  </h4>
                                </div>
                                <p className="text-xs text-emerald-300/90 mt-1.5 leading-relaxed">
                                  {recMachine.recommendationReason}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-center shrink-0">
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                  <div className="text-[10px] text-slate-400">امتیاز شایستگی</div>
                                  <div className="text-sm font-black text-emerald-400 mt-0.5">
                                    {toPersianDigits(recMachine.suitabilityScore)}/۱۰۰
                                  </div>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                  <div className="text-[10px] text-slate-400">ساعت کار باقیمانده</div>
                                  <div className="text-sm font-bold text-cyan-400 mt-0.5">
                                    {toPersianDigits(recMachine.availableHoursRemaining)}h
                                  </div>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                  <div className="text-[10px] text-slate-400">لود ظرفیت جاری</div>
                                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                                    {toPersianDigits(recMachine.currentWorkloadPercent)}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Workload Progress Bar */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                              <span className="text-[11px] text-slate-400 shrink-0">اشغال ظرفیت شیفت (سقف ۱۵ ساعت):</span>
                              <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    recMachine.currentWorkloadPercent > 80
                                      ? 'bg-rose-500'
                                      : recMachine.currentWorkloadPercent > 60
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, recMachine.currentWorkloadPercent)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-slate-300 shrink-0">
                                {toPersianDigits(recMachine.currentWorkloadHours)} / {toPersianDigits(recMachine.dailyCapacityHours)} ساعت
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-sm text-rose-200">
                                توقف در برنامه‌ریزی این مرحله:
                              </strong>
                              هیچ ماشینی با مشخصات فنی مورد نیاز سازگار نیست.
                              <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-300/90">
                                {op.infeasibilityReasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Candidate Machines Audit Drawer Toggle */}
                        <div className="pt-2">
                          <button
                            onClick={() => toggleAllCandidates(idx)}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition"
                          >
                            <Info className="w-4 h-4" />
                            {showCandidates
                              ? 'بستن ممیزی وضعیت ماشین‌آلات کارخانه'
                              : `مشاهده ممیزی صلاحیت و علل رد سایر پرس‌ها (${toPersianDigits(op.allCandidateMachines.length)} دستگاه ارزیابی شده)`}
                          </button>

                          {showCandidates && (
                            <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                              <div className="text-[11px] text-slate-400 mb-2">
                                طبق ضوابط فنی کارخانه، ماشین‌های فاقد تناژ کافی، قالب ناسازگار یا متوقف در تعمیرات اکیداً رد صلاحیت می‌شوند:
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {op.allCandidateMachines.map(cand => (
                                  <div
                                    key={cand.machineId}
                                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                      cand.isEligible
                                        ? 'bg-slate-900 border-slate-700/80 text-slate-200'
                                        : 'bg-rose-950/20 border-rose-900/40 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-100">{cand.machineName}</span>
                                        <span className="font-mono text-[10px] text-slate-400">({cand.machineCode})</span>
                                      </div>
                                      {cand.isEligible ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          رتبه {toPersianDigits(cand.recommendationRank)} (مجاز)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                          رد صلاحیت فنی
                                        </span>
                                      )}
                                    </div>

                                    {/* Evaluation Criteria Checklist */}
                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
                                      <div className="flex items-center gap-1">
                                        {cand.supportsProcess ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                        )}
                                        <span>پوشش فرایند: {cand.supportsProcess ? 'تأیید' : 'عدم تطابق'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {cand.tonnageSufficient ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                        )}
                                        <span>تناژ مجاز: {cand.tonnageSufficient ? 'کافی' : 'ناکافی'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {cand.dieCompatible ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                        )}
                                        <span>انطباق قالب: {cand.dieCompatible ? 'سازگار' : 'ناسازگار'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {cand.isMachineActive ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                        ) : (
                                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                        )}
                                        <span>وضعیت: {cand.isMachineActive ? 'آماده‌به‌کار' : 'متوقف / تعمیرات'}</span>
                                      </div>
                                    </div>

                                    {/* Ineligibility Reasons */}
                                    {!cand.isEligible && cand.ineligibilityReasons.length > 0 && (
                                      <div className="text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-900/40 space-y-0.5 mt-1">
                                        {cand.ineligibilityReasons.map((r, ri) => (
                                          <div key={ri} className="flex items-center gap-1">
                                            <span className="text-rose-400">•</span>
                                            <span>{r}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {cand.isEligible && (
                                      <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                                        <span>ساعت آزاد: <strong>{toPersianDigits(cand.availableHoursRemaining)}h</strong></span>
                                        <span>امتیاز نهایی: <strong className="text-emerald-400">{toPersianDigits(cand.suitabilityScore)}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-400" />
              ایجاد نسخه بازنگری شده برنامه (Revision)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              نسخه فعلی ({activePlan?.planVersion}) بایگانی شده و نسخه جدیدی برای اعمال اصلاحات ایجاد می‌گردد.
            </p>

            <form onSubmit={handleCreateRevision} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  علت بازنگری یا تغییر برنامه:
                </label>
                <textarea
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  placeholder="مثال: تغییر اولویت تحویل توسط ساپکو، خرابی پرس اصلی، کسری کلاف ورق..."
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !revisionReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50"
                >
                  {actionInProgress ? 'در حال ثبت...' : 'ایجاد نسخه جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
