import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeft,
  Disc,
  Boxes,
  Layers,
  Wrench,
  CheckCircle2,
  Cpu,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Tag,
  Split,
  Merge,
  HelpCircle,
} from 'lucide-react';
import {
  ParallelProductionFlow,
  ParallelFlowNode,
  FlowPatternType,
} from '../../types/bomAndParallelFlow';
import { toPersianDigits, formatNumber } from '../../utils/formatters';
import { MasterDataDifferenceGuideModal } from '../common/MasterDataDifferenceGuideModal';

interface ParallelProductionFlowViewProps {
  onOpenTraceabilityModal?: (partCode: string) => void;
  onNavigateToBom?: () => void;
}

export const ParallelProductionFlowView: React.FC<ParallelProductionFlowViewProps> = ({
  onOpenTraceabilityModal,
  onNavigateToBom,
}) => {
  const [flows, setFlows] = useState<ParallelProductionFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Simulation state
  const [simStrokes, setSimStrokes] = useState<number>(500);
  const [simResult, setSimResult] = useState<{
    strokes: number;
    leftQty: number;
    rightQty: number;
    rawCoilConsumedKg: number;
    leftPartCode: string;
    rightPartCode: string;
  } | null>(null);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/parallel-flows');
      const data = await res.json();
      if (data.success && data.data) {
        setFlows(data.data);
        if (!selectedFlowId && data.data.length > 0) {
          setSelectedFlowId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const activeFlow = flows.find(f => f.id === selectedFlowId) || flows[0];

  const handleRunSimulation = () => {
    if (!activeFlow) return;
    const strokes = Number(simStrokes) || 100;
    const leftOutput = activeFlow.linkedOutputs.find(o => o.role === 'LEFT_HAND');
    const rightOutput = activeFlow.linkedOutputs.find(o => o.role === 'RIGHT_HAND');

    setSimResult({
      strokes,
      leftQty: strokes,
      rightQty: strokes,
      rawCoilConsumedKg: Math.round(strokes * 0.95 * 10) / 10,
      leftPartCode: leftOutput?.partCode || 'IKCO-206-BRK-LH',
      rightPartCode: rightOutput?.partCode || 'IKCO-206-BRK-RH',
    });
  };

  return (
    <div className="space-y-6 font-sans text-right">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-2xl">
              <GitFork className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>ماژول منطق تولید قطعات موازی و قالب‌های مشترک چپ و راست</span>
                <span className="text-[11px] bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full font-mono">
                  Co-Production & Split Flow
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید همزمان دو قطعه در یک قالب، انشعاب یک ورق به دو قطعه نیمه‌کاره، و ادغام مجدد در ایستگاه جوشکاری
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>راهنمای تفاوت کاتالوگ و کویل</span>
          </button>

          {onNavigateToBom && (
            <button
              onClick={onNavigateToBom}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>مشاهده درخت محصول (BOM)</span>
            </button>
          )}

          {/* Flow Selector Dropdown */}
          <select
            value={selectedFlowId}
            onChange={e => setSelectedFlowId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold cursor-pointer"
          >
            {flows.map(f => (
              <option key={f.id} value={f.id}>
                {f.flowName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeFlow && (
        <div className="space-y-6">
          {/* Flow Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold">
                    {activeFlow.flowCode}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                    {activeFlow.patternType === 'CO_PRODUCTION_LR' && 'قالب دوگانه چپ و راست (Co-Production)'}
                    {activeFlow.patternType === 'PARALLEL_JOIN_WELD' && 'خطوط موازی و ادغام در جوشکاری (Merge)'}
                    {activeFlow.patternType === 'SPLIT_AND_MERGE' && 'انشعاب وسط فرآیند و مونتاژ نهایی'}
                  </span>
                  <span className="text-xs text-slate-500">
                    مدل خودرو: <strong>{activeFlow.carModel}</strong>
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-2">
                  {activeFlow.flowName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  کلاف ورودی مبدأ: <strong className="text-slate-800 font-mono">{activeFlow.inputRawMaterialCode}</strong> ({activeFlow.inputRawMaterialName})
                </p>
              </div>

              {/* Linked Outputs Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {activeFlow.linkedOutputs.map((out, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-right">
                    <span className="text-[10px] text-slate-400 block">
                      {out.role === 'LEFT_HAND' ? 'خروجی سمت چپ (LH)' : out.role === 'RIGHT_HAND' ? 'خروجی سمت راست (RH)' : 'مجموعه نهایی'}
                    </span>
                    <span className="font-bold text-slate-800 font-mono block text-xs">{out.partCode}</span>
                    <span className="text-[11px] text-slate-600 block">{out.partName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Process Flow Diagram */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-purple-600" />
                <span>نمودار تعاملی جریان ایستگاه‌ها و نقطه تفکیک چپ / راست:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeFlow.nodes.map((node, idx) => (
                  <div
                    key={node.id || idx}
                    className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                      node.nodeType === 'SPLIT_POINT'
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                        : node.nodeType === 'MERGE_POINT'
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
                        : node.branch === 'LEFT'
                        ? 'bg-indigo-50/60 border-indigo-200'
                        : node.branch === 'RIGHT'
                        ? 'bg-teal-50/60 border-teal-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-slate-800 px-2 py-0.5 rounded-lg bg-white border border-slate-200">
                          {node.stepCode}
                        </span>
                        {node.isDualCavityDie && (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full">
                            قالب ۲ کویتی
                          </span>
                        )}
                        {node.nodeType === 'SPLIT_POINT' && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-full flex items-center gap-1">
                            <Split className="w-3 h-3" />
                            <span>نقطه انشعاب</span>
                          </span>
                        )}
                        {node.nodeType === 'MERGE_POINT' && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded-full flex items-center gap-1">
                            <Merge className="w-3 h-3" />
                            <span>نقطه ادغام</span>
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-slate-900 text-xs leading-snug">
                        {node.stepName}
                      </h5>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {node.description}
                      </p>

                      {node.machineName && (
                        <div className="text-[10px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200/80 space-y-0.5">
                          <div>دستگاه: <strong>{node.machineName}</strong></div>
                          {node.dieMoldName && <div>قالب: <strong>{node.dieMoldName}</strong></div>}
                        </div>
                      )}
                    </div>

                    {/* Step Action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {node.branch === 'MAIN' ? 'خط اصلی مشترک' : node.branch === 'LEFT' ? 'شاخه چپ (LH)' : node.branch === 'RIGHT' ? 'شاخه راست (RH)' : 'مجموعه جوشکاری'}
                      </span>
                      {onOpenTraceabilityModal && (
                        <button
                          type="button"
                          onClick={() => onOpenTraceabilityModal(activeFlow.inputRawMaterialCode)}
                          className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          <span>صدور کارت بچ</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Simulator Block */}
            <div className="bg-gradient-to-l from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/20 rounded-xl text-purple-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      شبیه‌ساز تولید ضرب پرس و تسهیم خروجی به انبار چپ و راست
                    </h4>
                    <p className="text-xs text-purple-200">
                      محاسبه دقیق تعداد محصول نهایی چپ و راست بر اساس تعداد ضرب و کسر خودکار از کویل
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={simStrokes}
                    onChange={e => setSimStrokes(Number(e.target.value))}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono font-bold focus:outline-none focus:border-purple-400"
                    placeholder="تعداد ضرب"
                  />
                  <button
                    onClick={handleRunSimulation}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>محاسبه تسهیم</span>
                  </button>
                </div>
              </div>

              {/* Simulation Result */}
              {simResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-purple-800/40 text-xs">
                  <div className="p-3 bg-purple-900/40 border border-purple-500/30 rounded-2xl space-y-1">
                    <span className="text-[11px] text-purple-300 block">تعداد ضرب پرس مشترک:</span>
                    <span className="text-base font-extrabold font-mono text-white">
                      {toPersianDigits(simResult.strokes)} ضرب
                    </span>
                    <span className="text-[10px] text-purple-300 block">مصرف ورق: ~{toPersianDigits(simResult.rawCoilConsumedKg)} kg</span>
                  </div>

                  <div className="p-3 bg-indigo-900/40 border border-indigo-500/30 rounded-2xl space-y-1">
                    <span className="text-[11px] text-indigo-300 block">تولید قطعه سمت چپ (LH):</span>
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      {toPersianDigits(simResult.leftQty)} عدد
                    </span>
                    <span className="text-[10px] text-indigo-200 block font-mono">[{simResult.leftPartCode}]</span>
                  </div>

                  <div className="p-3 bg-teal-900/40 border border-teal-500/30 rounded-2xl space-y-1">
                    <span className="text-[11px] text-teal-300 block">تولید قطعه سمت راست (RH):</span>
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      {toPersianDigits(simResult.rightQty)} عدد
                    </span>
                    <span className="text-[10px] text-teal-200 block font-mono">[{simResult.rightPartCode}]</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      <MasterDataDifferenceGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
