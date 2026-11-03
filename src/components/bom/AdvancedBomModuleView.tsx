import React, { useState, useEffect } from 'react';
import {
  ListTree,
  Boxes,
  Layers,
  Wrench,
  Disc,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  Link2,
  Trash2,
  Edit3,
  HelpCircle,
  GitFork,
  Printer,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Part } from '../../types/inventory';
import {
  AdvancedBomDefinition,
  BomComponentItem,
  BomComponentType,
  JoiningProcessType,
} from '../../types/bomAndParallelFlow';
import { toPersianDigits, formatNumber } from '../../utils/formatters';
import { MasterDataDifferenceGuideModal } from '../common/MasterDataDifferenceGuideModal';

interface AdvancedBomModuleViewProps {
  parts: Part[];
  onOpenTraceabilityModal?: (partCode: string) => void;
  onNavigateToParallelFlow?: () => void;
}

export const AdvancedBomModuleView: React.FC<AdvancedBomModuleViewProps> = ({
  parts,
  onOpenTraceabilityModal,
  onNavigateToParallelFlow,
}) => {
  const [boms, setBoms] = useState<AdvancedBomDefinition[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sub-MO generation modal & status
  const [isGeneratingSubMos, setIsGeneratingSubMos] = useState(false);
  const [subMoModalOpen, setSubMoModalOpen] = useState(false);
  const [plannedQty, setPlannedQty] = useState(500);
  const [masterMoNumber, setMasterMoNumber] = useState('MO-1403-1082');
  const [generatedSubMos, setGeneratedSubMos] = useState<any[]>([]);

  // Add Component Modal
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [compPartCode, setCompPartCode] = useState('');
  const [compPartName, setCompPartName] = useState('');
  const [compType, setCompType] = useState<BomComponentType>('RAW_SHEET');
  const [compQty, setCompQty] = useState(1);
  const [compUnit, setCompUnit] = useState<'PCS' | 'KG' | 'SET'>('PCS');
  const [compGross, setCompGross] = useState(0.5);
  const [compNet, setCompNet] = useState(0.4);
  const [compScrap, setCompScrap] = useState(20);
  const [compJoining, setCompJoining] = useState<JoiningProcessType>('SPOT_WELD');
  const [compSubMo, setCompSubMo] = useState(true);
  const [compStepJoined, setCompStepJoined] = useState(30);

  const loadBoms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/boms');
      const data = await res.json();
      if (data.success && data.data) {
        setBoms(data.data);
        if (!selectedBomId && data.data.length > 0) {
          setSelectedBomId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading BOMs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoms();
  }, []);

  const activeBom = boms.find(b => b.id === selectedBomId) || boms[0];

  const handleGenerateSubMos = async () => {
    if (!activeBom) return;
    setIsGeneratingSubMos(true);
    try {
      const res = await fetch('/api/production/boms/generate-sub-mos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bomId: activeBom.id,
          plannedQty,
          masterMoNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در صدور دستورهای ساخت فرعی');
      }
      setGeneratedSubMos(data.data);
      setSubMoModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'خطای سرور');
    } finally {
      setIsGeneratingSubMos(false);
    }
  };

  const handleSaveNewComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBom) return;

    const newComp: BomComponentItem = {
      id: `CMP-${Date.now()}`,
      bomId: activeBom.id,
      componentPartId: compPartCode,
      componentPartCode: compPartCode,
      componentPartName: compPartName || 'جزء جدید مجموعه',
      componentType: compType,
      quantityPerAssembly: Number(compQty),
      unit: compUnit,
      grossWeightKg: Number(compGross),
      netWeightKg: Number(compNet),
      scrapAllowancePercent: Number(compScrap),
      joiningProcess: compJoining,
      subMoRequired: compSubMo,
      stageJoinedStepNumber: Number(compStepJoined),
    };

    const updatedComponents = [...activeBom.components, newComp];
    const totalGross = updatedComponents.reduce((s, c) => s + (c.grossWeightKg || 0), 0);
    const totalNet = updatedComponents.reduce((s, c) => s + (c.netWeightKg || 0), 0);

    const updatedBom: AdvancedBomDefinition = {
      ...activeBom,
      components: updatedComponents,
      totalGrossWeightKg: Math.round(totalGross * 1000) / 1000,
      totalNetWeightKg: Math.round(totalNet * 1000) / 1000,
      yieldEfficiencyPercent: totalGross > 0 ? Math.round((totalNet / totalGross) * 1000) / 10 : 80,
    };

    try {
      const res = await fetch('/api/production/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBom),
      });
      const data = await res.json();
      if (data.success) {
        await loadBoms();
        setIsAddComponentOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-sans text-right">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl">
              <ListTree className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>مدل درخت محصول پیشرفته چندسطحی (Multi-Level BOM & Assemblies)</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                  نسخه مهندسی صنعتی
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مدیریت قطعات ترکیبی خودرویی (مانند ضد سرقت)، چند ورق مختلف در یک مجموعه، پیچ و مهره‌ها، و صدور دستورات ساخت فرعی
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

          {onNavigateToParallelFlow && (
            <button
              onClick={onNavigateToParallelFlow}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <GitFork className="w-4 h-4 text-purple-300" />
              <span>جریان قطعات موازی و چپ/راست</span>
            </button>
          )}

          {/* BOM Selector Dropdown */}
          <select
            value={selectedBomId}
            onChange={e => setSelectedBomId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
          >
            {boms.map(b => (
              <option key={b.id} value={b.id}>
                [{b.assemblyPartCode}] {b.assemblyPartName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeBom && (
        <>
          {/* Active BOM Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold">
                    {activeBom.assemblyPartCode}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    نسخه {activeBom.version}
                  </span>
                  <span className="text-xs text-slate-500">
                    مدل خودرو: <strong>{activeBom.carModel}</strong>
                  </span>
                  <span className="text-xs text-slate-500">
                    تاریخ اعتبار: <strong>{activeBom.effectiveDate}</strong>
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-2">
                  {activeBom.assemblyPartName}
                </h3>
                {activeBom.notes && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    توضیحات مهندسی: {activeBom.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsAddComponentOpen(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-600" />
                  <span>افزودن جزء / ورق / پیچ جدید</span>
                </button>

                <button
                  onClick={handleGenerateSubMos}
                  disabled={isGeneratingSubMos}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>صدور دستورات ساخت فرعی (Sub-MOs)</span>
                </button>
              </div>
            </div>

            {/* Key Engineering Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[11px] text-slate-500 block">وزن ناخالص ورق مصرفی:</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  {toPersianDigits(activeBom.totalGrossWeightKg)} <span className="text-xs font-sans">کیلوگرم</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">شامل پرت برش بلنکینگ</span>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950">
                <span className="text-[11px] text-emerald-700 block">وزن خالص مجموعه نهایی:</span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">
                  {toPersianDigits(activeBom.totalNetWeightKg)} <span className="text-xs font-sans">کیلوگرم</span>
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">وزن تحویلی به خودروساز</span>
              </div>

              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950">
                <span className="text-[11px] text-indigo-700 block">راندمان مصرف متریال (Yield):</span>
                <span className="text-base font-extrabold text-indigo-900 font-mono">
                  {toPersianDigits(activeBom.yieldEfficiencyPercent)}%
                </span>
                <span className="text-[10px] text-indigo-700 block mt-0.5">نرخ پرت: {toPersianDigits(Math.round((100 - activeBom.yieldEfficiencyPercent) * 10) / 10)}%</span>
              </div>

              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-950">
                <span className="text-[11px] text-purple-700 block">دستورهای ساخت وابسته (Sub-MOs):</span>
                <span className="text-base font-extrabold text-purple-900 font-mono">
                  {toPersianDigits(activeBom.components.filter(c => c.subMoRequired).length)} <span className="text-xs font-sans">کارت کارگاهی</span>
                </span>
                <span className="text-[10px] text-purple-700 block mt-0.5">تولید موازی قطعات در خط</span>
              </div>
            </div>

            {/* Tree Components Breakdown Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>اجزای متشکله درخت محصول و ضرایب مصرف تفکیکی (Component Breakdown):</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {toPersianDigits(activeBom.components.length)} جزء و قطعه متصل
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">نوع جزء</th>
                      <th className="py-3 px-3.5">کد و شرح قطعه / ورق / اتصال</th>
                      <th className="py-3 px-3.5">ضریب مصرف</th>
                      <th className="py-3 px-3.5">وزن خالص / ناخالص</th>
                      <th className="py-3 px-3.5">درصد ضایعات</th>
                      <th className="py-3 px-3.5">مرحله و روش اتصال</th>
                      <th className="py-3 px-3.5">دستور ساخت فرعی؟</th>
                      <th className="py-3 px-3.5">تأمین‌کننده</th>
                      <th className="py-3 px-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBom.components.map((comp, idx) => (
                      <tr key={comp.id || idx} className="hover:bg-slate-50/80 transition">
                        {/* Type Badge */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {comp.componentType === 'RAW_SHEET' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Disc className="w-3 h-3 text-amber-600" />
                              <span>ورق خام اولیه</span>
                            </span>
                          )}
                          {comp.componentType === 'FASTENER_HARDWARE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Wrench className="w-3 h-3 text-indigo-600" />
                              <span>پیچ / مهره جوشی</span>
                            </span>
                          )}
                          {comp.componentType === 'RUBBER_SEAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Boxes className="w-3 h-3 text-purple-600" />
                              <span>لاستیک / دمپر</span>
                            </span>
                          )}
                          {comp.componentType === 'WIP_SUB_PART' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              <Layers className="w-3 h-3 text-teal-600" />
                              <span>نیمه‌ساخته پرسی</span>
                            </span>
                          )}
                        </td>

                        {/* Code & Name */}
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-slate-900 block text-xs">
                            {comp.componentPartCode}
                          </span>
                          <span className="text-[11px] text-slate-600 block mt-0.5">
                            {comp.componentPartName}
                          </span>
                          {comp.notes && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {comp.notes}
                            </span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 font-mono text-sm">
                            {toPersianDigits(comp.quantityPerAssembly)}
                          </span>{' '}
                          <span className="text-[11px] text-slate-500 font-medium">
                            {comp.unit === 'PCS' ? 'عدد' : 'کیلوگرم'}
                          </span>
                        </td>

                        {/* Weights */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-[11px]">
                          <div>خالص: <strong className="font-mono text-slate-800">{toPersianDigits(comp.netWeightKg)} kg</strong></div>
                          <div className="text-slate-500">ناخالص: <span className="font-mono">{toPersianDigits(comp.grossWeightKg)} kg</span></div>
                        </td>

                        {/* Scrap % */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {comp.scrapAllowancePercent > 0 ? (
                            <span className="text-xs font-bold text-amber-700 font-mono">
                              {toPersianDigits(comp.scrapAllowancePercent)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">۰%</span>
                          )}
                        </td>

                        {/* Joining Operation */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-[11px]">
                          <span className="font-bold text-slate-800 block">
                            مرحله {toPersianDigits(comp.stageJoinedStepNumber || 30)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {comp.joiningProcess === 'SPOT_WELD' && 'پرس‌جوش مقاومتی'}
                            {comp.joiningProcess === 'CO2_WELD' && 'جوش تحت گاز CO2'}
                            {comp.joiningProcess === 'FASTENING' && 'بستن پیچ با ترک‌رنچ'}
                            {comp.joiningProcess === 'HEMMING' && 'همبربندی هیدرولیک'}
                            {comp.joiningProcess === 'PRESS_FIT' && 'جا زدن فشاری بوش'}
                          </span>
                        </td>

                        {/* Sub-MO Required */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {comp.subMoRequired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              <span>دستور ساخت مجزا</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">تغذیه مستقیم خط</span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-600">
                          {comp.supplierSource === 'SAPCO_CONSIGNMENT' && 'امانی ساپکو'}
                          {comp.supplierSource === 'INTERNAL_FABRICATED' && 'تولید داخل کارخانه'}
                          {comp.supplierSource === 'PURCHASED_MARKET' && 'خرید بازار'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {onOpenTraceabilityModal && (
                            <button
                              onClick={() => onOpenTraceabilityModal(comp.componentPartCode)}
                              title="صدور کارت رهگیری و بچ برای این جزء"
                              className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Generated Sub-MOs Modal */}
      {subMoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>دستورات ساخت فرعی با موفقیت در سیستم تولید صادر گردیدند</span>
              </div>
              <button onClick={() => setSubMoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              برای برنامه تولید تعداد <strong>{toPersianDigits(plannedQty)} عدد</strong> از محصول <strong>{activeBom?.assemblyPartName}</strong>، دستورهای ساخت کارگاهی زیر صادر شدند و در ماژول WIP قرار گرفتند:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {generatedSubMos.map((mo, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-800">{mo.subMoNumber}</span>
                    <span className="font-bold text-emerald-700">تعداد مصوب: {toPersianDigits(mo.requiredQty)} {mo.unit}</span>
                  </div>
                  <div className="text-slate-700 font-medium">قطعه: [{mo.componentPartCode}] {mo.componentPartName}</div>
                  <div className="text-[11px] text-slate-500">نقطه اتصال به محصول نهایی: ایستگاه جوشکاری OP{toPersianDigits(mo.stageJoined)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSubMoModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition hover:bg-slate-800"
              >
                تایید و بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {isAddComponentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                افزودن جزء جدید به درخت محصول {activeBom?.assemblyPartCode}
              </h3>
              <button onClick={() => setIsAddComponentOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveNewComponent} className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">انتخاب از کاتالوگ یا قطعات موجود:</label>
                <select
                  onChange={e => {
                    const found = parts.find(p => p.code === e.target.value);
                    if (found) {
                      setCompPartCode(found.code);
                      setCompPartName(found.name);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="">-- انتخاب از کاتالوگ --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.code}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">کد قطعه / ورق:</label>
                <input
                  type="text"
                  value={compPartCode}
                  onChange={e => setCompPartCode(e.target.value)}
                  placeholder="e.g. WIP-206-SEC-03"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">نوع جزء:</label>
                <select
                  value={compType}
                  onChange={e => setCompType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="RAW_SHEET">ورق خام اولیه (کویل/شیت)</option>
                  <option value="WIP_SUB_PART">قطعه نیمه‌ساخته پرسی</option>
                  <option value="FASTENER_HARDWARE">پیچ / مهره جوشی / خار</option>
                  <option value="RUBBER_SEAL">بوش / دمپر لاستیکی</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">نام کامل جزء:</label>
                <input
                  type="text"
                  value={compPartName}
                  onChange={e => setCompPartName(e.target.value)}
                  placeholder="شرح مهندسی جزء"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">ضریب مصرف:</label>
                <input
                  type="number"
                  step="any"
                  value={compQty}
                  onChange={e => setCompQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">واحد سنجش:</label>
                <select
                  value={compUnit}
                  onChange={e => setCompUnit(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="PCS">عدد (PCS)</option>
                  <option value="KG">کیلوگرم (KG)</option>
                  <option value="SET">ست (SET)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">روش اتصال:</label>
                <select
                  value={compJoining}
                  onChange={e => setCompJoining(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="SPOT_WELD">پرس‌جوش مقاومتی</option>
                  <option value="CO2_WELD">جوش تحت گاز CO2</option>
                  <option value="FASTENING">پیچ و مهره‌کاری</option>
                  <option value="HEMMING">همبربندی هیدرولیک</option>
                  <option value="PRESS_FIT">جا زدن فشاری</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">درصد ضایعات برش (%):</label>
                <input
                  type="number"
                  value={compScrap}
                  onChange={e => setCompScrap(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="subMoCheck"
                  checked={compSubMo}
                  onChange={e => setCompSubMo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="subMoCheck" className="text-xs text-slate-700 cursor-pointer font-medium">
                  نیاز به صدور دستور ساخت فرعی مجزا (Sub-MO) در سالن پرس دارد
                </label>
              </div>

              <div className="col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddComponentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  ثبت در درخت محصول
                </button>
              </div>
            </form>
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
