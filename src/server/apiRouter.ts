import { Router, Request, Response } from 'express';
import {
  calculateInventoryLedger,
  validateAndPrepareTransaction,
  generateVoucherNumber,
} from './stockEngine';
import {
  INITIAL_PARTS,
  INITIAL_MACHINES,
  INITIAL_ROUTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_DIES_MOLDS,
  INITIAL_OPERATORS,
} from './sampleData';
import {
  InventoryTransaction,
  Part,
  Machine,
  Routing,
  DieMold,
  Operator,
  FactoryHall,
  PROCESS_DEFINITIONS,
  FACTORY_HALLS,
} from '../types/inventory';

// Server-side State Store (in production can be wired to SQL Server / ERP / Firestore)
let partsStore: Part[] = [...INITIAL_PARTS];
let machinesStore: Machine[] = [...INITIAL_MACHINES];
let routingsStore: Routing[] = [...INITIAL_ROUTINGS];
let transactionsStore: InventoryTransaction[] = [...INITIAL_TRANSACTIONS];
let diesStore: DieMold[] = [...INITIAL_DIES_MOLDS];
let operatorsStore: Operator[] = [...INITIAL_OPERATORS];
let hallsStore: FactoryHall[] = [...FACTORY_HALLS];
let processesStore = [...PROCESS_DEFINITIONS];

export const apiRouter = Router();

// Middleware to parse JSON
apiRouter.use((req, res, next) => {
  next();
});

/**
 * Health check & ERP integration interface info
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'Automotive Stamping & WIP Production Control Engine',
    erpConnectorReady: true,
    supportedErpEngines: ['SAP', 'SQL Server / Hamkaran', 'System Group', 'Rayvarz', 'Sapco EDI'],
    stats: {
      partsCount: partsStore.length,
      machinesCount: machinesStore.length,
      routingsCount: routingsStore.length,
      transactionsCount: transactionsStore.length,
    },
    serverTime: new Date().toISOString(),
  });
});

/**
 * 1. Inventory Summary & Calculated Balances (Calculated Server-side)
 */
apiRouter.get('/inventory/summary', (_req: Request, res: Response) => {
  try {
    const summary = calculateInventoryLedger(transactionsStore, partsStore);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطای سرور در محاسبه موجودی انبار',
    });
  }
});

/**
 * 2. Transaction Ledger with Search, Filters & Pagination
 */
apiRouter.get('/inventory/transactions', (req: Request, res: Response) => {
  try {
    const { voucherType, stageId, partId, search, status, limit, offset } = req.query;

    let filtered = [...transactionsStore];

    if (voucherType && typeof voucherType === 'string') {
      filtered = filtered.filter(t => t.voucherType === voucherType);
    }
    if (stageId && typeof stageId === 'string') {
      filtered = filtered.filter(t => t.stageId === stageId || t.targetStageId === stageId);
    }
    if (partId && typeof partId === 'string') {
      filtered = filtered.filter(t => t.partId === partId);
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.voucherNumber.toLowerCase().includes(q) ||
        t.partName.toLowerCase().includes(q) ||
        t.partCode.toLowerCase().includes(q) ||
        (t.referenceDoc && t.referenceDoc.toLowerCase().includes(q)) ||
        (t.operatorName && t.operatorName.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const start = offset ? parseInt(offset as string, 10) : 0;
    const count = limit ? parseInt(limit as string, 10) : 100;
    const paged = filtered.slice(start, start + count);

    res.json({
      success: true,
      total,
      data: paged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت لیست تراکنش‌ها',
    });
  }
});

/**
 * 3. Validate & Post Transaction (Strict server-side validation & negative balance block)
 */
apiRouter.post('/inventory/validate-and-post', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const user = {
      uid: payload.createdByUid || 'USR-OP-01',
      displayName: payload.createdByName || 'سرپرست سالن',
    };

    const validation = validateAndPrepareTransaction(
      payload,
      transactionsStore,
      partsStore,
      user
    );

    if (!validation.valid || !validation.normalizedTransaction) {
      return res.status(400).json({
        success: false,
        error: validation.errorMessage || 'اعتبارسنجی سند با خطا مواجه شد.',
      });
    }

    const tx = validation.normalizedTransaction;
    transactionsStore.unshift(tx);

    // Recompute summary
    const newSummary = calculateInventoryLedger(transactionsStore, partsStore);

    res.status(201).json({
      success: true,
      message: `سند شماره ${tx.voucherNumber} با موفقیت در سیستم ثبت گردید.`,
      transaction: tx,
      summary: newSummary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت سند انبار و تولید',
    });
  }
});

/**
 * 4. Reversal / Adjustment of Existing Voucher (No hard delete, immutable audit trail)
 */
apiRouter.post('/inventory/reverse', (req: Request, res: Response) => {
  try {
    const { voucherId, reason, user } = req.body;
    if (!voucherId) {
      return res.status(400).json({ success: false, error: 'شناسه سند جهت ابطال مشخص نشده است.' });
    }

    const targetIndex = transactionsStore.findIndex(t => t.id === voucherId || t.voucherNumber === voucherId);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, error: 'سند مورد نظر یافت نشد.' });
    }

    const targetTx = transactionsStore[targetIndex];
    if (targetTx.status === 'REVERSED') {
      return res.status(400).json({ success: false, error: 'این سند قبلاً ابطال شده است.' });
    }

    // Mark original as REVERSED
    targetTx.status = 'REVERSED';
    targetTx.notes = `${targetTx.notes || ''} [ابطال شده در سند اصلاحی]`.trim();

    // Create counter-balancing ADJUSTMENT voucher
    const reversalVoucherNumber = generateVoucherNumber('ADJUSTMENT');
    const adjustmentTx: InventoryTransaction = {
      id: `TX-REV-${Date.now()}`,
      voucherNumber: reversalVoucherNumber,
      voucherType: 'ADJUSTMENT',
      partId: targetTx.partId,
      partCode: targetTx.partCode,
      partName: targetTx.partName,
      stageId: targetTx.stageId,
      stageName: targetTx.stageName,
      targetStageId: targetTx.targetStageId,
      targetStageName: targetTx.targetStageName,
      quantity: -targetTx.quantity, // Offsetting negative quantity
      unit: targetTx.unit,
      quantityKg: -targetTx.quantityKg,
      referenceDoc: `ابطال و تعدیل سند ${targetTx.voucherNumber}`,
      operatorName: user?.displayName || 'مدیر سیستم',
      status: 'CONFIRMED',
      reversalOfVoucherId: targetTx.voucherNumber,
      notes: reason || 'سند اصلاحی صادره جهت ابطال عملیات پیشین',
      createdByUid: user?.uid || 'USR-ADMIN',
      createdByName: user?.displayName || 'مدیر سیستم',
      isDemo: targetTx.isDemo,
      createdAt: new Date().toISOString(),
    };

    transactionsStore.unshift(adjustmentTx);

    const newSummary = calculateInventoryLedger(transactionsStore, partsStore);

    res.json({
      success: true,
      message: `سند شماره ${targetTx.voucherNumber} ابطال شد و سند اصلاحی ${reversalVoucherNumber} صادر گردید.`,
      reversedVoucher: targetTx,
      adjustmentVoucher: adjustmentTx,
      summary: newSummary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ابطال سند',
    });
  }
});

/**
 * 5. Parts Catalog Endpoints
 */
apiRouter.get('/parts', (req: Request, res: Response) => {
  const { category, search, carModel } = req.query;
  let result = [...partsStore];

  if (category && typeof category === 'string') {
    result = result.filter(p => p.category === category);
  }
  if (carModel && typeof carModel === 'string') {
    result = result.filter(p => p.carModel && p.carModel.includes(carModel));
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.sapcoCode && p.sapcoCode.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: result.length, data: result });
});

apiRouter.post('/parts', (req: Request, res: Response) => {
  const payload: Partial<Part> = req.body;
  if (!payload.code || !payload.name || !payload.category || !payload.unit) {
    return res.status(400).json({ success: false, error: 'اطلاعات ضروری قطعه (کد، نام، گروه، واحد) تکمیل نشده است.' });
  }

  const existingIndex = partsStore.findIndex(p => p.id === payload.id || p.code === payload.code);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    partsStore[existingIndex] = {
      ...partsStore[existingIndex],
      ...payload,
      updatedAt: now,
    };
    return res.json({ success: true, message: 'اطلاعات قطعه به‌روزرسانی شد.', data: partsStore[existingIndex] });
  } else {
    const newPart: Part = {
      id: payload.id || `PRT-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      weightPerUnitKg: Number(payload.weightPerUnitKg) || 1,
      sapcoCode: payload.sapcoCode || '',
      carModel: payload.carModel || '',
      thicknessMm: payload.thicknessMm ? Number(payload.thicknessMm) : undefined,
      materialGrade: payload.materialGrade || '',
      minStock: Number(payload.minStock) || 0,
      maxStock: Number(payload.maxStock) || 0,
      isDemo: false, // User created parts are real
      createdAt: now,
      updatedAt: now,
    };
    partsStore.unshift(newPart);
    return res.status(201).json({ success: true, message: 'قطعه جدید در کاتالوگ ثبت گردید.', data: newPart });
  }
});

/**
 * 6. Machines Endpoints
 */
apiRouter.get('/machines', (_req: Request, res: Response) => {
  res.json({ success: true, count: machinesStore.length, data: machinesStore });
});

apiRouter.post('/machines', (req: Request, res: Response) => {
  const payload: Partial<Machine> = req.body;
  if (!payload.code || !payload.name || !payload.processType) {
    return res.status(400).json({ success: false, error: 'اطلاعات ماشین (کد، عنوان، نوع فرایند) تکمیل نشده است.' });
  }

  const existingIndex = machinesStore.findIndex(m => m.id === payload.id || m.code === payload.code);
  if (existingIndex >= 0) {
    machinesStore[existingIndex] = { ...machinesStore[existingIndex], ...payload };
    return res.json({ success: true, message: 'مشخصات ماشین به‌روز شد.', data: machinesStore[existingIndex] });
  } else {
    const newMachine: Machine = {
      id: payload.id || `MCH-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      capabilities: (payload.capabilities && payload.capabilities.length > 0) ? payload.capabilities : [payload.processType],
      processType: payload.processType,
      tonnage: Number(payload.tonnage) || 0,
      bolsterSize: payload.bolsterSize || '',
      strokeLengthMm: Number(payload.strokeLengthMm) || 0,
      strokesPerMinute: Number(payload.strokesPerMinute) || 0,
      hallId: payload.hallId || '',
      location: payload.location || 'سالن تولید',
      status: payload.status || 'ACTIVE',
      operatorName: payload.operatorName || '',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    machinesStore.unshift(newMachine);
    return res.status(201).json({ success: true, message: 'ماشین جدید ثبت گردید.', data: newMachine });
  }
});

/**
 * 7. Routings Endpoints
 */
apiRouter.get('/routings', (req: Request, res: Response) => {
  const { partId } = req.query;
  let result = [...routingsStore];
  if (partId && typeof partId === 'string') {
    result = result.filter(r => r.partId === partId);
  }
  res.json({ success: true, count: result.length, data: result });
});

apiRouter.post('/routings', (req: Request, res: Response) => {
  const payload: Partial<Routing> = req.body;
  if (!payload.partId || !payload.operations || payload.operations.length === 0) {
    return res.status(400).json({ success: false, error: 'انتخاب قطعه و حداقل یک عملیات الزامی است.' });
  }

  const part = partsStore.find(p => p.id === payload.partId);
  const now = new Date().toISOString();
  const existingIndex = routingsStore.findIndex(r => r.id === payload.id || r.partId === payload.partId);

  if (existingIndex >= 0) {
    routingsStore[existingIndex] = {
      ...routingsStore[existingIndex],
      ...payload,
      partCode: part ? part.code : routingsStore[existingIndex].partCode,
      partName: part ? part.name : routingsStore[existingIndex].partName,
      updatedAt: now,
    };
    return res.json({ success: true, message: 'مسیر تولید به‌روزرسانی شد.', data: routingsStore[existingIndex] });
  } else {
    const newRouting: Routing = {
      id: payload.id || `RTG-${Date.now()}`,
      partId: payload.partId,
      partCode: part ? part.code : 'UNKNOWN',
      partName: part ? part.name : 'UNKNOWN',
      version: payload.version || 'V1.0',
      operations: payload.operations,
      notes: payload.notes || '',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    routingsStore.unshift(newRouting);
    return res.status(201).json({ success: true, message: 'مسیر تولید جدید تعریف گردید.', data: newRouting });
  }
});

apiRouter.delete('/routings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = routingsStore.length;
  routingsStore = routingsStore.filter(r => r.id !== id);
  if (routingsStore.length < initialLength) {
    res.json({ success: true, message: 'مسیر تولید حذف گردید.' });
  } else {
    res.status(404).json({ success: false, error: 'مسیر تولید یافت نشد.' });
  }
});

/**
 * 8. Dies & Molds (قالب‌های پرس و سنبه ماتریس)
 */
apiRouter.get('/dies', (req: Request, res: Response) => {
  const { partId, processType, status, search } = req.query;
  let result = [...diesStore];

  if (partId && typeof partId === 'string') {
    result = result.filter(d => d.partId === partId);
  }
  if (processType && typeof processType === 'string') {
    result = result.filter(d => d.processType === processType);
  }
  if (status && typeof status === 'string') {
    result = result.filter(d => d.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.partName.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: result.length, data: result });
});

apiRouter.post('/dies', (req: Request, res: Response) => {
  const payload: Partial<DieMold> = req.body;
  if (!payload.code || !payload.name || !payload.partId) {
    return res.status(400).json({ success: false, error: 'کد قالب، عنوان قالب و قطعه مربوطه الزامی هستند.' });
  }

  const part = partsStore.find(p => p.id === payload.partId);
  const existingIndex = diesStore.findIndex(d => d.id === payload.id || d.code === payload.code);

  if (existingIndex >= 0) {
    diesStore[existingIndex] = {
      ...diesStore[existingIndex],
      ...payload,
      partCode: part ? part.code : diesStore[existingIndex].partCode,
      partName: part ? part.name : diesStore[existingIndex].partName,
    };
    return res.json({ success: true, message: 'مشخصات قالب پرس به‌روزرسانی شد.', data: diesStore[existingIndex] });
  } else {
    const newDie: DieMold = {
      id: payload.id || `DIE-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      partId: payload.partId,
      partCode: part ? part.code : '',
      partName: part ? part.name : '',
      processType: payload.processType || 'BLANKING',
      requiredTonnage: Number(payload.requiredTonnage) || 250,
      compatibleMachineCodes: payload.compatibleMachineCodes || [],
      strokeLifeTarget: Number(payload.strokeLifeTarget) || 250000,
      currentStrokes: Number(payload.currentStrokes) || 0,
      status: payload.status || 'READY',
      location: payload.location || 'انبار قالب‌ها',
      notes: payload.notes || '',
      isDemo: false,
    };
    diesStore.unshift(newDie);
    return res.status(201).json({ success: true, message: 'قالب پرس جدید ثبت گردید.', data: newDie });
  }
});

apiRouter.delete('/dies/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  diesStore = diesStore.filter(d => d.id !== id);
  res.json({ success: true, message: 'قالب حذف گردید.' });
});

/**
 * 9. Operators & Line Technicians (اپراتورها و پرسنل خطوط)
 */
apiRouter.get('/operators', (req: Request, res: Response) => {
  const { hallId, shift } = req.query;
  let result = [...operatorsStore];
  if (hallId && typeof hallId === 'string') {
    result = result.filter(o => o.hallId === hallId);
  }
  if (shift && typeof shift === 'string') {
    result = result.filter(o => o.defaultShift === shift);
  }
  res.json({ success: true, count: result.length, data: result });
});

apiRouter.post('/operators', (req: Request, res: Response) => {
  const payload: Partial<Operator> = req.body;
  if (!payload.fullName || !payload.personnelCode) {
    return res.status(400).json({ success: false, error: 'نام و کد پرسنلی اپراتور الزامی است.' });
  }

  const existingIndex = operatorsStore.findIndex(o => o.id === payload.id || o.personnelCode === payload.personnelCode);
  if (existingIndex >= 0) {
    operatorsStore[existingIndex] = { ...operatorsStore[existingIndex], ...payload };
    return res.json({ success: true, message: 'مشخصات اپراتور به‌روزرسانی شد.', data: operatorsStore[existingIndex] });
  } else {
    const newOp: Operator = {
      id: payload.id || `OPR-${Date.now()}`,
      personnelCode: payload.personnelCode,
      fullName: payload.fullName,
      skillProcessTypes: payload.skillProcessTypes || ['BLANKING'],
      defaultShift: payload.defaultShift || 'MORNING',
      phone: payload.phone || '',
      hallId: payload.hallId,
      active: payload.active !== undefined ? payload.active : true,
      isDemo: false,
    };
    operatorsStore.unshift(newOp);
    return res.status(201).json({ success: true, message: 'اپراتور جدید ثبت گردید.', data: newOp });
  }
});

/**
 * 10. Factory Halls & Production Lines (سالن‌ها و خطوط تولید)
 */
apiRouter.get('/halls', (_req: Request, res: Response) => {
  res.json({ success: true, count: hallsStore.length, data: hallsStore });
});

apiRouter.post('/halls', (req: Request, res: Response) => {
  const payload: Partial<FactoryHall> = req.body;
  if (!payload.code || !payload.name) {
    return res.status(400).json({ success: false, error: 'کد و نام سالن الزامی است.' });
  }

  const existingIndex = hallsStore.findIndex(h => h.id === payload.id || h.code === payload.code);
  if (existingIndex >= 0) {
    hallsStore[existingIndex] = { ...hallsStore[existingIndex], ...payload };
    return res.json({ success: true, message: 'مشخصات سالن به‌روز شد.', data: hallsStore[existingIndex] });
  } else {
    const newHall: FactoryHall = {
      id: payload.id || `HALL-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      type: payload.type || 'STAMPING',
      supervisorName: payload.supervisorName || '',
      capacityDesc: payload.capacityDesc || '',
    };
    hallsStore.push(newHall);
    return res.status(201).json({ success: true, message: 'سالن جدید تعریف گردید.', data: newHall });
  }
});

/**
 * 11. Process Definitions Catalog (انواع فرایندهای تولید کارخانه)
 */
apiRouter.get('/processes', (_req: Request, res: Response) => {
  res.json({ success: true, count: processesStore.length, data: processesStore });
});

apiRouter.post('/processes', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload.code || !payload.name) {
    return res.status(400).json({ success: false, error: 'کد و عنوان فرایند الزامی است.' });
  }
  const existingIndex = processesStore.findIndex(p => p.code === payload.code);
  if (existingIndex >= 0) {
    processesStore[existingIndex] = { ...processesStore[existingIndex], ...payload };
    return res.json({ success: true, message: 'فرایند به‌روز شد.', data: processesStore[existingIndex] });
  } else {
    const newProc = {
      id: `PROC-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      category: payload.category || 'STAMPING',
      description: payload.description || '',
    };
    processesStore.push(newProc);
    return res.status(201).json({ success: true, message: 'فرایند جدید تعریف شد.', data: newProc });
  }
});

/**
 * 12. Safe Sample Data Reset & Clean
 */
apiRouter.post('/demo-data/seed', (_req: Request, res: Response) => {
  // Re-seed sample data without wiping non-demo user data
  const realParts = partsStore.filter(p => !p.isDemo);
  const realMachines = machinesStore.filter(m => !m.isDemo);
  const realRoutings = routingsStore.filter(r => !r.isDemo);
  const realTx = transactionsStore.filter(t => !t.isDemo);
  const realDies = diesStore.filter(d => !d.isDemo);
  const realOps = operatorsStore.filter(o => !o.isDemo);

  partsStore = [...realParts, ...INITIAL_PARTS];
  machinesStore = [...realMachines, ...INITIAL_MACHINES];
  routingsStore = [...realRoutings, ...INITIAL_ROUTINGS];
  transactionsStore = [...realTx, ...INITIAL_TRANSACTIONS];
  diesStore = [...realDies, ...INITIAL_DIES_MOLDS];
  operatorsStore = [...realOps, ...INITIAL_OPERATORS];

  const summary = calculateInventoryLedger(transactionsStore, partsStore);
  res.json({
    success: true,
    message: 'داده‌های نمونه کارخانه (قطعات، قالب‌ها، اپراتورها، ماشین‌آلات، مسیرهای تولید و اسناد) با موفقیت بازنشانی شدند.',
    summary,
  });
});

apiRouter.post('/demo-data/clean', (_req: Request, res: Response) => {
  // Safely remove only demo data, preserving real factory operations
  const demoPartsRemoved = partsStore.filter(p => p.isDemo).length;
  const demoTxRemoved = transactionsStore.filter(t => t.isDemo).length;
  const demoDiesRemoved = diesStore.filter(d => d.isDemo).length;

  partsStore = partsStore.filter(p => !p.isDemo);
  machinesStore = machinesStore.filter(m => !m.isDemo);
  routingsStore = routingsStore.filter(r => !r.isDemo);
  transactionsStore = transactionsStore.filter(t => !t.isDemo);
  diesStore = diesStore.filter(d => !d.isDemo);
  operatorsStore = operatorsStore.filter(o => !o.isDemo);

  const summary = calculateInventoryLedger(transactionsStore, partsStore);
  res.json({
    success: true,
    message: `پاکسازی امن انجام شد. ${demoPartsRemoved} قطعه، ${demoDiesRemoved} قالب و ${demoTxRemoved} سند آزمایشی حذف شدند. داده‌های واقعی حفظ شدند.`,
    summary,
  });
});
