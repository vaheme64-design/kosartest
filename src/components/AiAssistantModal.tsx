import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Settings,
  Bot,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ArrowRight,
  Database,
  Cloud,
  FileCheck,
  Package,
  Layers,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { AiProvider, AiSettings, AiActionPayload } from '../types/ai';
import { Part } from '../types/inventory';
import { toPersianDigits } from '../utils/formatters';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  onExecuteAction: (action: AiActionPayload) => void;
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'LOCAL_NLP',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  groqApiKey: '',
  groqModel: 'llama-3.1-8b-instant',
  openRouterApiKey: '',
  openRouterModel: 'gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
};

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  parts,
  onExecuteAction,
}) => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'SETTINGS' | 'GUIDE'>('COMMAND');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AiActionPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings state (Persisted in localStorage)
  const [settings, setSettings] = useState<AiSettings>(() => {
    try {
      const saved = localStorage.getItem('kpims_ai_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [pingStatus, setPingStatus] = useState<{ testing: boolean; success?: boolean; message?: string } | null>(null);

  // Voice speech-to-text recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fa-IR'; // Persian Speech Recognition

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند یا دسترسی میکروفن داده نشده است.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Speech recognition start failed', e);
      }
    }
  };

  const handleSaveSettings = (newSettings: AiSettings) => {
    setSettings(newSettings);
    localStorage.setItem('kpims_ai_settings', JSON.stringify(newSettings));
  };

  const handleTestConnection = async () => {
    setPingStatus({ testing: true });
    try {
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          endpointUrl: settings.ollamaEndpoint,
          apiKey:
            settings.provider === 'GROQ'
              ? settings.groqApiKey
              : settings.provider === 'OPENROUTER'
              ? settings.openRouterApiKey
              : settings.geminiApiKey,
        }),
      });
      const data = await res.json();
      setPingStatus({ testing: false, success: data.success, message: data.message });
    } catch (err: any) {
      setPingStatus({ testing: false, success: false, message: err.message || 'خطا در برقراری ارتباط' });
    }
  };

  const handleSubmitCommand = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend) return;

    setLoading(true);
    setErrorMsg(null);
    setLastResult(null);

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در پردازش دستور توسط هوش مصنوعی');
      }

      setLastResult(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور هوش مصنوعی');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = () => {
    if (!lastResult) return;
    onExecuteAction(lastResult);
    onClose();
  };

  const samplePrompts = [
    'صدور دستور تولید جدید (MO) برای قطعه براکت ۲۰۶ با تیراژ ۵,۰۰۰ عدد',
    'پیگیری و ردیابی زنجیره دستور تولید در خط پرس',
    'ردیابی شماره ذوب HT-99412 و شجره‌نامه کلاف‌های ساپکو',
    'رسید ۵ تن ورق DC04 با شماره ذوب HT-9912 به انبار ساپکو',
    'حواله خروج ۸۰۰ کیلوگرم ورق DC04 برای سالن پرس و خط تولید',
    'بررسی کسری موجودی و اقلام زیر نقطه سفارش (آلارم کسری)',
    'انتقال به بخش ماشین‌آلات، پرس‌ها و تعمیرات PM',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm lg:text-base">دستیار هوشمند کارخانه کوثر (KPIMS AI)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {settings.provider === 'LOCAL_NLP'
                    ? 'موتور داخلی آفلاین'
                    : settings.provider === 'OLLAMA'
                    ? 'Ollama لوکال (بدون اینترنت)'
                    : settings.provider === 'GROQ'
                    ? 'Groq Cloud (سریع)'
                    : settings.provider === 'OPENROUTER'
                    ? 'OpenRouter (رایگان)'
                    : 'Gemini AI'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تکمیل خودکار اسناد انبار، رسید ورق، حواله تولید و ناوبری با دستورات صوتی و متنی فارسی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('COMMAND')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'COMMAND'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>فرمان صوتی و متنی</span>
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'SETTINGS'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات و اتصال هوش مصنوعی</span>
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'GUIDE'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>راهنمای استفاده در ایران (بدون فیلتر)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* TAB 1: COMMAND & VOICE */}
          {activeTab === 'COMMAND' && (
            <div className="space-y-4">
              {/* Input Box with Voice */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitCommand();
                    }
                  }}
                  placeholder="دستور خود را بنویسید یا دکمه میکروفن را بزنید... مثلاً: «ورق روغنی ST12 با وزن ۴۵۰۰ کیلو و کویل‌پک CP-908 رسید انبار ساپکو شد»"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 pr-4 pl-24 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 transition-all shadow-inner resize-none leading-relaxed"
                />

                <div className="absolute left-2.5 bottom-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    title="گفتار به متن صوتی فارسی"
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    disabled={loading || !prompt.trim()}
                    onClick={() => handleSubmitCommand()}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isListening && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 animate-fadeIn">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-semibold">در حال شنیدن گفتار شما به زبان فارسی... لطفاً صحبت کنید.</span>
                </div>
              )}

              {/* Sample Quick Commands */}
              <div>
                <p className="text-[11px] text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  فرمان‌های نمونه کارخانه (کلیک برای آزمودن فوری):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(s);
                        handleSubmitCommand(s);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] border border-slate-200 transition-all text-right cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Result Preview & Confirmation Card */}
              {lastResult && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white shadow-sm space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>دستور با موفقیت توسط هوش مصنوعی تحلیل شد</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                      {lastResult.actionType}
                    </span>
                  </div>

                  <p className="text-slate-800 text-xs font-medium leading-relaxed">
                    {lastResult.message}
                  </p>

                  {/* Pre-fill Details Table */}
                  {lastResult.prefillReceipt && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5 text-[11px]">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-indigo-700">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>اقلام شناسایی‌شده برای فرم رسید کالا:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                        <div>
                          <span className="text-slate-400">کالا / ورق:</span>{' '}
                          <strong className="text-slate-900">{lastResult.prefillReceipt.partName || lastResult.prefillReceipt.partCode || 'انتخابی'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">مقدار / وزن:</span>{' '}
                          <strong className="text-emerald-700">{lastResult.prefillReceipt.quantity ? `${lastResult.prefillReceipt.quantity.toLocaleString('fa-IR')} ${lastResult.prefillReceipt.unit || 'کیلوگرم'}` : 'مشخص‌نشده'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">شماره کویل‌پک:</span>{' '}
                          <strong className="font-mono text-indigo-700">{lastResult.prefillReceipt.coilPackNumber || 'ندارد'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">شماره ذوب (Heat):</span>{' '}
                          <strong className="font-mono">{lastResult.prefillReceipt.heatNumber || 'ندارد'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">مالکیت:</span>{' '}
                          <strong>{lastResult.prefillReceipt.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی شرکت'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">انبار مقصد:</span>{' '}
                          <strong>انبار ورق و مواد اولیه (WH-RAW)</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {lastResult.prefillIssue && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5 text-[11px]">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-amber-700">
                        <Package className="w-3.5 h-3.5" />
                        <span>اقلام شناسایی‌شده برای فرم حواله خروج:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                        <div>
                          <span className="text-slate-400">کالا:</span>{' '}
                          <strong className="text-slate-900">{lastResult.prefillIssue.partName || lastResult.prefillIssue.partCode || 'انتخابی'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">مقدار خروج:</span>{' '}
                          <strong className="text-amber-700">{lastResult.prefillIssue.quantity ? `${lastResult.prefillIssue.quantity.toLocaleString('fa-IR')} ${lastResult.prefillIssue.unit || 'کیلوگرم'}` : 'مشخص‌نشده'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">انبار مقصد:</span>{' '}
                          <strong>سالن پرس و خط تولید (WH-WIP-STAMP)</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Confirmation Button */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setLastResult(null)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAction}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                    >
                      <span>تایید و انتقال به فرم مربوطه جهت ثبت نهایی</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                <p className="font-bold text-xs">پیکربندی هوش مصنوعی دلخواه شما</p>
                <p className="text-[11px] text-indigo-800 mt-1">
                  می‌توانید مدل لوکال آفلاین Ollama (بدون اینترنت)، سرویس پرسرعت Groq، سرویس رایگان OpenRouter یا Gemini را انتخاب کنید.
                </p>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-slate-800 font-bold mb-2">
                  انتخاب موتور هوش مصنوعی فعال:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* LOCAL NLP */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ...settings, provider: 'LOCAL_NLP' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      settings.provider === 'LOCAL_NLP'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-600" />
                        <span>موتور هوشمند محلی (توصیه اول کارخانه)</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">۱۰۰٪ آفلاین</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      بدون نیاز به اینترنت یا نصب هیچ نرم‌افزاری؛ بلافاصله کار می‌کند.
                    </p>
                  </button>

                  {/* OLLAMA */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ...settings, provider: 'OLLAMA' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      settings.provider === 'OLLAMA'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        <span>Ollama محلی (Local AI)</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">رایگان و بدون فیلتر</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      اجرای مدل‌های Llama یا Qwen روی سیستم شخصی شما بدون اینترنت.
                    </p>
                  </button>

                  {/* GROQ */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ...settings, provider: 'GROQ' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      settings.provider === 'GROQ'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-amber-600" />
                        <span>Groq Cloud API</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">فوق‌العاده سریع</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      پلن رایگان ابری با سرعت بسیار بالا (Llama 3.3).
                    </p>
                  </button>

                  {/* GEMINI */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ ...settings, provider: 'GEMINI' })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      settings.provider === 'GEMINI'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Google Gemini API</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">موتور هوشمند پیش‌فرض</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1">
                      مدل فوق‌العاده دقیق Gemini 1.5 Flash و Gemini 2.5 Flash.
                    </p>
                  </button>
                </div>
              </div>

              {/* Provider Specific Configuration Inputs */}
              {settings.provider === 'OLLAMA' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>تنظیمات Ollama محلی</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">آدرس سرویس لوکال (Endpoint):</label>
                      <input
                        type="text"
                        value={settings.ollamaEndpoint}
                        onChange={e => handleSaveSettings({ ...settings, ollamaEndpoint: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                        placeholder="http://localhost:11434"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">نام مدل نصب‌شده (Model):</label>
                      <input
                        type="text"
                        value={settings.ollamaModel}
                        onChange={e => handleSaveSettings({ ...settings, ollamaModel: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                        placeholder="qwen2.5:7b یا llama3.2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {settings.provider === 'GROQ' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-amber-600" />
                    <span>تنظیمات کلید رایگان Groq (groq.com)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">کلید API (API Key):</label>
                      <input
                        type="password"
                        value={settings.groqApiKey}
                        onChange={e => handleSaveSettings({ ...settings, groqApiKey: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                        placeholder="gsk_..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">مدل Groq:</label>
                      <select
                        value={settings.groqModel || 'llama-3.1-8b-instant'}
                        onChange={e => handleSaveSettings({ ...settings, groqModel: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs cursor-pointer"
                      >
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (توصیه سریع)</option>
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                        <option value="qwen-2.5-coder-32b">qwen-2.5-coder-32b</option>
                        <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                        <option value="gemma2-9b-it">gemma2-9b-it</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {settings.provider === 'OPENROUTER' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-purple-600" />
                    <span>تنظیمات OpenRouter</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">کلید API:</label>
                      <input
                        type="password"
                        value={settings.openRouterApiKey}
                        onChange={e => handleSaveSettings({ ...settings, openRouterApiKey: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                        placeholder="sk-or-..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">مدل OpenRouter:</label>
                      <select
                        value={settings.openRouterModel || 'gpt-4o-mini'}
                        onChange={e => handleSaveSettings({ ...settings, openRouterModel: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs cursor-pointer"
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini (توصیه پرسرعت و ارزان)</option>
                        <option value="google/gemini-flash-1.5">google/gemini-flash-1.5</option>
                        <option value="google/gemini-2.5-flash:free">google/gemini-2.5-flash:free</option>
                        <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {settings.provider === 'GEMINI' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>تنظیمات Google Gemini API</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">کلید API (اختیاری اگر در کلود تنظیم شده):</label>
                      <input
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={e => handleSaveSettings({ ...settings, geminiApiKey: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs"
                        placeholder="AIzaSy..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">مدل Gemini:</label>
                      <select
                        value={settings.geminiModel || 'gemini-1.5-flash'}
                        onChange={e => handleSaveSettings({ ...settings, geminiModel: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs cursor-pointer"
                      >
                        <option value="gemini-1.5-flash">gemini-1.5-flash (توصیه پرسرعت)</option>
                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Ping Connection Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={pingStatus?.testing}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {pingStatus?.testing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>تست ارتباط با موتور انتخابی</span>
                </button>

                {pingStatus?.message && (
                  <span
                    className={`text-xs font-semibold ${
                      pingStatus.success ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {pingStatus.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE FOR IRAN (ANTI-FILTER & OFFLINE) */}
          {activeTab === 'GUIDE' && (
            <div className="space-y-4 leading-relaxed text-slate-700">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-bold text-emerald-900 text-xs mb-1">
                  بهترین روش‌ها برای استفاده از هوش مصنوعی در ایران (بدون فیلتر و تحریم):
                </h4>
                <p className="text-[11px] text-emerald-800">
                  برای محیط‌های صنعتی و کارخانه‌ای که امنیت داده‌ها و قطعی اینترنت اهمیت دارد، گزینه‌های زیر توصیه می‌شود:
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      ۱
                    </span>
                    <span>Ollama (نرم‌افزار هوش مصنوعی لوکال - ۱۰۰٪ رایگان، بدون اینترنت و بدون فیلتر)</span>
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-1">
                    کافی است نرم‌افزار کم‌حجم <strong>Ollama</strong> را از سایت <code>ollama.com</code> دانلود و روی ویندوز یا سرور کارخانه نصب کنید.
                    سپس در ترمینال دستور <code>ollama run qwen2.5:7b</code> را بزنید. هوش مصنوعی روی پورت <code>11434</code> کامپیوتر شما فعال می‌شود و تمام دستورات کارخانه را به صورت آفلاین بدون نیاز به یک بایت اینترنت پردازش می‌کند.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      ۲
                    </span>
                    <span>Groq Cloud API (سریع‌ترین هوش مصنوعی ابری رایگان)</span>
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-1">
                    در سایت <code>console.groq.com</code> یک اکانت رایگان بسازید و API Key دریافت کنید. با تنظیم DNS تحریم‌شکن رایگان (مثل <strong>شکن shecan.ir</strong> یا <strong>بگذر begzar.ir</strong> یا <strong>۴۰۳</strong>) روی کارت شبکه سیستم، بدون نیاز به فیلترشکن پاسخ‌ها با سرعت چند صد کلمه بر ثانیه دریافت می‌شوند.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                      ۳
                    </span>
                    <span>موتور هوشمند محلی داخلی (همین برنامه)</span>
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-1">
                    ما یک موتور پردازشگر زبان فارسی اختصاصی داخل خود برنامه قرار داده‌ایم که کاتالوگ قطعات، وزن، رول، کویل‌پک و شماره ذوب را به صورت هوشمند استخراج می‌کند و حتی بدون نصب هیچ نرم‌افزاری یا داشتن اینترنت، تمام فرم‌ها را تکمیل می‌کند.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>کلید میانبر باز کردن دستیار:</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px] font-bold">
              Ctrl + Space
            </kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
