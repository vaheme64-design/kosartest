import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Calculator, X } from 'lucide-react';

export interface FormulaVariable {
  symbol: string;
  labelFa?: string;
  meaning?: string;
  valueSample?: string;
}

interface FormulaTooltipProps {
  title: string;
  formula: string;
  description?: string;
  variables?: FormulaVariable[];
  note?: string;
  align?: 'right' | 'left' | 'center';
  badgeColor?: 'slate' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

export const FormulaTooltip: React.FC<FormulaTooltipProps> = ({
  title,
  formula,
  description,
  variables = [],
  note,
  align = 'right',
  badgeColor = 'slate',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const badgeStyles: Record<string, string> = {
    slate: 'bg-slate-200/80 text-slate-700 hover:bg-slate-900 hover:text-white border-slate-300',
    emerald: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-700 hover:text-white border-emerald-300',
    amber: 'bg-amber-100 text-amber-800 hover:bg-amber-600 hover:text-white border-amber-300',
    rose: 'bg-rose-100 text-rose-800 hover:bg-rose-600 hover:text-white border-rose-300',
    indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-600 hover:text-white border-indigo-300',
  };

  const alignStyles: Record<string, string> = {
    right: 'right-0',
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center align-middle select-none z-20"
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        title={`فرمول محاسباتی: ${title}`}
        className={`w-4 h-4 rounded-full border inline-flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer mx-1 ${badgeStyles[badgeColor]}`}
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          dir="rtl"
          className={`absolute top-full mt-1.5 w-72 sm:w-80 bg-slate-900 text-white rounded-xl p-3.5 shadow-xl border border-slate-700 text-right z-50 animate-in fade-in zoom-in-95 duration-150 ${alignStyles[align]}`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-300">{title}</span>
            </div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-emerald-300 leading-relaxed text-center dir-ltr">
            {formula}
          </div>

          {description && (
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-normal">
              {description}
            </p>
          )}

          {variables.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1">
              {variables.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-300">{v.labelFa || v.meaning}:</span>
                  <span className="font-mono text-amber-300 font-semibold">{v.symbol}</span>
                </div>
              ))}
            </div>
          )}

          {note && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-rose-300 leading-relaxed">
              💡 {note}
            </div>
          )}
        </div>
      )}
    </span>
  );
};
