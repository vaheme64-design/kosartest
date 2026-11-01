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
  INITIAL_PRODUCTION_PLANS,
  INITIAL_SAPCO_COILS,
} from './sampleData';
import {
  InventoryTransaction,
  Part,
  Machine,
  Routing,
  DieMold,
  Operator,
  FactoryHall,
  ProductionPlan,
  SapcoCoilReceipt,
  PROCESS_DEFINITIONS,
  FACTORY_HALLS,
} from '../types/inventory';
import { checkDatabaseConnection } from './db/prisma';
import { CreateProductionPlanSchema, CreateSapcoReceiptSchema } from './validation/index';

import {
  calculateDetailedStockBalances,
  atomicPostDocument,
  createReversalDocument,
  calculateSapcoContractLedger,
  AuditRecord,
} from './inventoryEngine';
import {
  INITIAL_INVENTORY_DOCUMENTS,
  INITIAL_SAPCO_CONTRACTS,
  INITIAL_INVENTORY_RESERVATIONS,
  INITIAL_AUDIT_LOGS,
} from './inventorySampleData';
import {
  InventoryDocument,
  InventoryDocumentLine,
  InventoryReservation,
  SapcoContract,
  WAREHOUSES_LIST,
  StockOwnership,
  StockQualityStatus,
  InventoryDocType,
} from '../types/inventory';
import {
  getManufacturingOrdersList,
  getManufacturingOrderById,
  createManufacturingOrder,
  registerOperationInput,
  registerOperationProduction,
  createOperationTransfer,
  approveOperationTransfer,
  rejectOperationTransfer,
  calculateMoReconciliation,
  getWipDashboardMetrics,
  wipTransfersStore,
  productionLogsStore,
} from './productionWipEngine';
import {
  calculateNetRequirements,
  evaluateMachineEligibility,
  generateProductionPlanSuggestions,
  approvePlanSuggestion,
  releasePlanToManufacturingOrder,
  revisePlanVersion,
  getPlanningDashboardMetrics,
  customerOrdersStore,
  planSuggestionsStore,
} from './productionPlanningEngine';
import { CustomerOrder } from '../types/productionPlanning';
import {
  getPlanVsActualReport,
  getCustomerOrderFulfillmentReport,
  getProductionBacklogReport,
  getWipByPartAndOperationReport,
  getWipAgingReport,
  getMaterialConsumptionVsStandardReport,
  getSapcoMaterialAccountReport,
  getInventoryValuationQuantitiesReport,
  getScrapByPartAndOperationReport,
  getMachineWorkloadCapacityReport,
  getProductionDelaysReport,
  getInventoryMovementsReport,
  getInventoryReconciliationReport,
  getManagementDashboardSummary,
} from './managementReportsEngine';
import { ReportFilterParams } from '../types/managementReports';

// Server-side State Store (in production can be wired to PostgreSQL / Prisma / SQL Server / ERP)
let partsStore: Part[] = [...INITIAL_PARTS];
let machinesStore: Machine[] = [...INITIAL_MACHINES];
let routingsStore: Routing[] = [...INITIAL_ROUTINGS];
let transactionsStore: InventoryTransaction[] = [...INITIAL_TRANSACTIONS];
let diesStore: DieMold[] = [...INITIAL_DIES_MOLDS];
let operatorsStore: Operator[] = [...INITIAL_OPERATORS];
let hallsStore: FactoryHall[] = [...FACTORY_HALLS];
let processesStore = [...PROCESS_DEFINITIONS];
let plansStore: ProductionPlan[] = [...INITIAL_PRODUCTION_PLANS];
let coilsStore: SapcoCoilReceipt[] = [...INITIAL_SAPCO_COILS];

// Advanced Inventory Module Stores
let inventoryDocsStore: InventoryDocument[] = [...INITIAL_INVENTORY_DOCUMENTS];
let contractsStore: SapcoContract[] = [...INITIAL_SAPCO_CONTRACTS];
let reservationsStore: InventoryReservation[] = [...INITIAL_INVENTORY_RESERVATIONS];
let auditLogsStore: AuditRecord[] = [...INITIAL_AUDIT_LOGS];

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

/**
 * 13. Database Configuration & Health Status (Prisma / PostgreSQL Diagnostic)
 */
apiRouter.get('/db/status', async (_req: Request, res: Response) => {
  try {
    const status = await checkDatabaseConnection();
    res.json({
      success: true,
      data: status,
      architecture: {
        system: 'KPIMS - Kosar Production & Inventory Management System',
        orm: 'Prisma Client v6',
        databaseEngine: 'PostgreSQL 15+',
        tablesDefined: [
          'users',
          'parts',
          'factory_halls',
          'machines',
          'dies_molds',
          'production_routes',
          'route_operations',
          'inventory_transactions',
          'production_plans',
          'sapco_coils',
          'system_audit_logs',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ارزیابی اتصال پایگاه داده',
    });
  }
});

/**
 * 14. Production Planning Endpoints
 */
apiRouter.get('/planning', (_req: Request, res: Response) => {
  res.json({ success: true, count: plansStore.length, data: plansStore });
});

apiRouter.post('/planning', (req: Request, res: Response) => {
  const parseResult = CreateProductionPlanSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'خطای اعتبارسنجی برنامه تولید (Zod Validation)',
      details: parseResult.error.issues.map((e: any) => e.message).join(' | '),
    });
  }

  const payload = parseResult.data;
  const part = partsStore.find(p => p.id === payload.partId);
  if (!part) {
    return res.status(400).json({ success: false, error: 'قطعه مشخص شده یافت نشد.' });
  }

  const newPlan: ProductionPlan = {
    id: `PLN-${Date.now()}`,
    planNumber: `PLN-${Date.now().toString().slice(-6)}`,
    title: payload.title,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    plannedQty: payload.plannedQty,
    producedQty: 0,
    startDate: payload.startDate,
    endDate: payload.endDate,
    priority: payload.priority as 1 | 2 | 3,
    status: 'CONFIRMED',
    notes: payload.notes,
    isDemo: false,
    createdAt: new Date().toISOString(),
  };

  plansStore.unshift(newPlan);
  res.status(201).json({ success: true, message: 'برنامه تولید جدید با موفقیت ثبت گردید.', data: newPlan });
});

/**
 * 15. SAPCO Raw Material Coils & Quota Endpoints
 */
apiRouter.get('/sapco/coils', (_req: Request, res: Response) => {
  res.json({ success: true, count: coilsStore.length, data: coilsStore });
});

apiRouter.post('/sapco/coils', (req: Request, res: Response) => {
  const parseResult = CreateSapcoReceiptSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'خطای اعتبارسنجی رسید کلاف ساپکو',
      details: parseResult.error.issues.map((e: any) => e.message).join(' | '),
    });
  }

  const payload = parseResult.data;
  const part = partsStore.find(p => p.id === payload.partId);
  if (!part) {
    return res.status(400).json({ success: false, error: 'ماده اولیه مرتبط یافت نشد.' });
  }

  const newCoil: SapcoCoilReceipt = {
    id: `COIL-${Date.now()}`,
    receiptNumber: payload.receiptNumber,
    coilNumber: payload.coilNumber,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    materialGrade: payload.materialGrade,
    thicknessMm: payload.thicknessMm,
    widthMm: payload.widthMm,
    receivedWeightKg: payload.receivedWeightKg,
    consumedWeightKg: 0,
    heatNumber: payload.heatNumber,
    receiptDate: new Date().toISOString(),
    status: 'IN_STOCK',
    isDemo: false,
  };

  coilsStore.unshift(newCoil);

  // Automatically register a corresponding goods receipt transaction for the raw material store
  const receiptTx: InventoryTransaction = {
    id: `TX-${Date.now()}`,
    voucherNumber: generateVoucherNumber('RECEIPT'),
    voucherType: 'RECEIPT',
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    stageId: 'STAGE_RAW_STORE',
    stageName: 'انبار مواد اولیه ساپکو',
    quantity: payload.receivedWeightKg,
    unit: 'KG',
    quantityKg: payload.receivedWeightKg,
    referenceDoc: `رسید کویل ${payload.coilNumber} - شماره رسید ${payload.receiptNumber}`,
    operatorName: 'انباردار مواد اولیه',
    shift: 'MORNING',
    status: 'CONFIRMED',
    notes: `ورق گرید ${payload.materialGrade} با شماره ذوب ${payload.heatNumber || '—'}`,
    createdByUid: 'USR-ADMIN',
    createdByName: 'مدیر انبار',
    isDemo: false,
    createdAt: new Date().toISOString(),
  };

  transactionsStore.unshift(receiptTx);

  res.status(201).json({
    success: true,
    message: `کلاف ساپکو به شماره سریال ${newCoil.coilNumber} با وزن ${newCoil.receivedWeightKg} کیلوگرم با موفقیت ثبت شد و به موجودی انبار مواد افزوده گردید.`,
    data: newCoil,
  });
});

// =========================================================================
// 16. ADVANCED INVENTORY MANAGEMENT MODULE ENDPOINTS
// =========================================================================

/**
 * 16.1. Inventory Dashboard Metrics
 */
apiRouter.get('/inventory/dashboard-metrics', (_req: Request, res: Response) => {
  try {
    const { metrics } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);
    metrics.activeContractsCount = contractsStore.filter(c => c.status === 'ACTIVE').length;

    res.json({
      success: true,
      data: metrics,
      contracts: contractsStore,
      warehouses: WAREHOUSES_LIST,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در محاسبه شاخص‌های داشبورد انبار',
    });
  }
});

/**
 * 16.2. Warehouses List & Locations
 */
apiRouter.get('/inventory/warehouses', (_req: Request, res: Response) => {
  res.json({ success: true, data: WAREHOUSES_LIST });
});

/**
 * 16.3. Inventory Documents List & Search
 */
apiRouter.get('/inventory/documents', (req: Request, res: Response) => {
  try {
    const { type, postingStatus, warehouseId, search, offset, limit } = req.query;

    let result = [...inventoryDocsStore];

    if (type && typeof type === 'string' && type !== 'ALL') {
      result = result.filter(d => d.documentType === type);
    }
    if (postingStatus && typeof postingStatus === 'string' && postingStatus !== 'ALL') {
      result = result.filter(d => d.postingStatus === postingStatus);
    }
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      result = result.filter(d => d.warehouseId === warehouseId || d.targetWarehouseId === warehouseId);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        d =>
          d.documentNumber.toLowerCase().includes(q) ||
          (d.referenceNumber && d.referenceNumber.toLowerCase().includes(q)) ||
          (d.adjustmentReason && d.adjustmentReason.toLowerCase().includes(q)) ||
          d.warehouseName.toLowerCase().includes(q) ||
          d.lines.some(l => l.partName.toLowerCase().includes(q) || l.partCode.toLowerCase().includes(q) || (l.lotNumber && l.lotNumber.toLowerCase().includes(q)))
      );
    }

    // Sort descending by date
    result.sort((a, b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());

    const total = result.length;
    const start = offset ? parseInt(offset as string, 10) : 0;
    const count = limit ? parseInt(limit as string, 10) : 100;
    const paged = result.slice(start, start + count);

    res.json({
      success: true,
      total,
      data: paged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت لیست اسناد انبار',
    });
  }
});

/**
 * 16.4. Single Document Details
 */
apiRouter.get('/inventory/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = inventoryDocsStore.find(d => d.id === id || d.documentNumber === id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'سند انبار یافت نشد.' });
  }
  res.json({ success: true, data: doc });
});

/**
 * 16.5. Create Inventory Document (Draft or Auto-post)
 */
apiRouter.post('/inventory/documents', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const autoPost = payload.autoPost === true;

    if (!payload.documentType || !payload.warehouseId) {
      return res.status(400).json({ success: false, error: 'نوع سند و انبار مبدا الزامی هستند.' });
    }

    if (!payload.lines || payload.lines.length === 0) {
      return res.status(400).json({ success: false, error: 'حداقل یک ردیف کالا در سند الزامی است.' });
    }

    const warehouse = WAREHOUSES_LIST.find(w => w.id === payload.warehouseId);
    const targetWarehouse = payload.targetWarehouseId ? WAREHOUSES_LIST.find(w => w.id === payload.targetWarehouseId) : undefined;

    // Generate Document Number if not supplied
    const prefixMap: Record<string, string> = {
      OPENING_BALANCE: 'OB',
      RECEIPT_RAW_MATERIAL: 'REC-MAT',
      RECEIPT_FINISHED_GOODS: 'REC-FIN',
      ISSUE_RAW_MATERIAL: 'ISS-MAT',
      TRANSFER: 'TRF',
      ADJUSTMENT: 'ADJ',
      REVERSAL: 'REV',
    };
    const prefix = prefixMap[payload.documentType] || 'DOC';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const docNumber = payload.documentNumber || `${prefix}-1403-${dateStr}-${rand}`;

    const now = new Date().toISOString();
    let totalQty = 0;
    let totalWeightKg = 0;

    const lines: InventoryDocumentLine[] = payload.lines.map((l: any, idx: number) => {
      const part = partsStore.find(p => p.id === l.partId);
      const qty = Number(l.quantity) || 0;
      const weightPerUnit = part?.weightPerUnitKg || 1;
      const weightKg = part?.unit === 'KG' ? qty : Number((qty * weightPerUnit).toFixed(3));

      totalQty += qty;
      totalWeightKg += weightKg;

      return {
        id: `LINE-${Date.now()}-${idx}`,
        documentId: `DOC-${docNumber}`,
        lineNumber: idx + 1,
        partId: part ? part.id : l.partId,
        partCode: part ? part.code : l.partCode || 'CODE',
        partName: part ? part.name : l.partName || 'قطعه',
        materialLotId: l.materialLotId,
        lotNumber: l.lotNumber,
        heatNumber: l.heatNumber,
        ownership: l.ownership || payload.ownership || 'COMPANY_OWNED',
        contractId: l.contractId || payload.contractId,
        contractNumber: l.contractNumber || payload.contractNumber,
        locationCode: l.locationCode || 'LOC-01',
        targetLocationCode: l.targetLocationCode,
        quantity: qty,
        unit: part ? part.unit : l.unit || 'PCS',
        quantityKg: weightKg,
        qualityStatus: l.qualityStatus || 'AVAILABLE',
        unitCost: l.unitCost ? Number(l.unitCost) : undefined,
        notes: l.notes,
      };
    });

    const newDoc: InventoryDocument = {
      id: `DOC-${Date.now()}`,
      documentNumber: docNumber,
      documentType: payload.documentType,
      documentDate: payload.documentDate || now,
      documentStatus: 'DRAFT',
      postingStatus: 'UNPOSTED',
      warehouseId: payload.warehouseId,
      warehouseName: warehouse ? warehouse.name : payload.warehouseId,
      targetWarehouseId: payload.targetWarehouseId,
      targetWarehouseName: targetWarehouse ? targetWarehouse.name : undefined,
      ownership: payload.ownership || 'COMPANY_OWNED',
      contractId: payload.contractId,
      contractNumber: payload.contractNumber,
      referenceType: payload.referenceType,
      referenceNumber: payload.referenceNumber,
      adjustmentReason: payload.adjustmentReason,
      auditNote: payload.auditNote,
      lines,
      totalQuantity: Math.round(totalQty * 1000) / 1000,
      totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
      createdByUid: payload.user?.uid || 'USR-OP-01',
      createdByName: payload.user?.displayName || 'کاربر سیستم',
      createdAt: now,
      updatedAt: now,
    };

    if (autoPost) {
      const user = {
        uid: payload.user?.uid || 'USR-OP-01',
        displayName: payload.user?.displayName || 'کاربر سیستم',
      };
      const postResult = atomicPostDocument(
        newDoc,
        inventoryDocsStore,
        reservationsStore,
        partsStore,
        user
      );

      if (!postResult.success) {
        return res.status(400).json({ success: false, error: postResult.error });
      }

      inventoryDocsStore.unshift(newDoc);
      if (postResult.auditRecord) {
        auditLogsStore.unshift(postResult.auditRecord);
      }

      return res.status(201).json({
        success: true,
        message: `سند شماره «${newDoc.documentNumber}» با موفقیت صادر و ثبت قطعی گردید.`,
        data: newDoc,
      });
    }

    inventoryDocsStore.unshift(newDoc);
    res.status(201).json({
      success: true,
      message: `پیش‌نویس سند شماره «${newDoc.documentNumber}» ثبت شد. توجه: پیش‌نویس تا زمان ثبت قطعی در کاردکس اثر ندارد.`,
      data: newDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت سند انبار',
    });
  }
});

/**
 * 16.6. Atomic Post Document
 */
apiRouter.post('/inventory/documents/:id/post', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req.body;

    const docIndex = inventoryDocsStore.findIndex(d => d.id === id || d.documentNumber === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, error: 'سند انبار یافت نشد.' });
    }

    const doc = inventoryDocsStore[docIndex];
    const postUser = {
      uid: user?.uid || 'USR-ADMIN',
      displayName: user?.displayName || 'مدیر انبار',
    };

    const postResult = atomicPostDocument(
      doc,
      inventoryDocsStore,
      reservationsStore,
      partsStore,
      postUser
    );

    if (!postResult.success) {
      return res.status(400).json({ success: false, error: postResult.error });
    }

    if (postResult.auditRecord) {
      auditLogsStore.unshift(postResult.auditRecord);
    }

    res.json({
      success: true,
      message: `سند شماره «${doc.documentNumber}» با موفقیت در کاردکس و موجودی رسمی ثبت قطعی گردید.`,
      data: doc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت قطعی سند',
    });
  }
});

/**
 * 16.7. Reversal Document (Document Correction)
 */
apiRouter.post('/inventory/documents/:id/reverse', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, user } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'ذکر دلیل ابطال و اصلاح سند الزامی است.' });
    }

    const docIndex = inventoryDocsStore.findIndex(d => d.id === id || d.documentNumber === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, error: 'سند انبار جهت ابطال یافت نشد.' });
    }

    const targetDoc = inventoryDocsStore[docIndex];
    const revUser = {
      uid: user?.uid || 'USR-ADMIN',
      displayName: user?.displayName || 'مدیر سیستم',
    };

    const reversalResult = createReversalDocument(targetDoc, reason, revUser);
    if (!reversalResult.success || !reversalResult.reversalDocument) {
      return res.status(400).json({ success: false, error: reversalResult.error });
    }

    inventoryDocsStore.unshift(reversalResult.reversalDocument);
    if (reversalResult.auditRecord) {
      auditLogsStore.unshift(reversalResult.auditRecord);
    }

    res.json({
      success: true,
      message: `سند «${targetDoc.documentNumber}» ابطال شد و سند جبرانی «${reversalResult.reversalDocument.documentNumber}» با موفقیت صادر گردید.`,
      reversedDoc: targetDoc,
      reversalDoc: reversalResult.reversalDocument,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در صدور سند اصلاحی و ابطال',
    });
  }
});

/**
 * 16.8. Stock Inquiry by Part, Material, Warehouse, Location, Ownership & Status
 */
apiRouter.get('/inventory/stock-inquiry', (req: Request, res: Response) => {
  try {
    const { partId, materialGrade, warehouseId, locationCode, ownership, search } = req.query;

    const { balances } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);

    let filtered = [...balances];

    if (partId && typeof partId === 'string' && partId !== 'ALL') {
      filtered = filtered.filter(b => b.partId === partId || b.partCode === partId);
    }
    if (materialGrade && typeof materialGrade === 'string' && materialGrade !== 'ALL') {
      filtered = filtered.filter(b => b.materialGrade === materialGrade);
    }
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      filtered = filtered.filter(b => b.warehouseId === warehouseId);
    }
    if (locationCode && typeof locationCode === 'string' && locationCode !== 'ALL') {
      filtered = filtered.filter(b => b.locationCode === locationCode);
    }
    if (ownership && typeof ownership === 'string' && ownership !== 'ALL') {
      filtered = filtered.filter(b => b.ownership === ownership);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        b =>
          b.partName.toLowerCase().includes(q) ||
          b.partCode.toLowerCase().includes(q) ||
          (b.lotNumber && b.lotNumber.toLowerCase().includes(q)) ||
          (b.heatNumber && b.heatNumber.toLowerCase().includes(q)) ||
          b.warehouseName.toLowerCase().includes(q)
      );
    }

    // Only non-zero by default unless explicitly asked
    filtered = filtered.filter(b => b.physicalQty > 0 || b.reservedQty > 0 || b.qualityBlockedQty > 0);

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در استعلام موجودی انبار',
    });
  }
});

/**
 * 16.9. Inventory Movement Ledger (Chronological Kardex)
 */
apiRouter.get('/inventory/ledger', (req: Request, res: Response) => {
  try {
    const { partId, warehouseId, lotNumber, offset, limit } = req.query;

    const postedDocs = inventoryDocsStore
      .filter(d => d.postingStatus === 'POSTED')
      .sort((a, b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());

    const ledgerEntries: any[] = [];

    for (const doc of postedDocs) {
      for (const line of doc.lines) {
        if (partId && line.partId !== partId && line.partCode !== partId) continue;
        if (warehouseId && doc.warehouseId !== warehouseId && doc.targetWarehouseId !== warehouseId) continue;
        if (lotNumber && line.lotNumber !== lotNumber) continue;

        ledgerEntries.push({
          id: `${doc.id}-${line.id}`,
          documentNumber: doc.documentNumber,
          documentType: doc.documentType,
          date: doc.postedAt || doc.documentDate,
          partId: line.partId,
          partCode: line.partCode,
          partName: line.partName,
          warehouseName: doc.warehouseName,
          targetWarehouseName: doc.targetWarehouseName,
          locationCode: line.locationCode,
          lotNumber: line.lotNumber,
          heatNumber: line.heatNumber,
          ownership: line.ownership,
          contractNumber: line.contractNumber,
          quantity: line.quantity,
          unit: line.unit,
          quantityKg: line.quantityKg,
          qualityStatus: line.qualityStatus,
          referenceDoc: doc.referenceNumber,
          postedByName: doc.postedByName || doc.createdByName,
          notes: line.notes || doc.adjustmentReason,
        });
      }
    }

    const total = ledgerEntries.length;
    const start = offset ? parseInt(offset as string, 10) : 0;
    const count = limit ? parseInt(limit as string, 10) : 100;
    const paged = ledgerEntries.slice(start, start + count);

    res.json({
      success: true,
      total,
      data: paged,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت دفتر گردش موجودی',
    });
  }
});

/**
 * 16.10. Inventory Reservations
 */
apiRouter.get('/inventory/reservations', (_req: Request, res: Response) => {
  res.json({ success: true, count: reservationsStore.length, data: reservationsStore });
});

apiRouter.post('/inventory/reservations', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.partId || !payload.warehouseId || !payload.quantity) {
      return res.status(400).json({ success: false, error: 'قطعه، انبار و مقدار رزرو الزامی هستند.' });
    }

    const part = partsStore.find(p => p.id === payload.partId);
    if (!part) {
      return res.status(404).json({ success: false, error: 'قطعه مورد نظر یافت نشد.' });
    }

    const warehouse = WAREHOUSES_LIST.find(w => w.id === payload.warehouseId);
    const qty = Number(payload.quantity);
    const weightPerUnit = part.weightPerUnitKg || 1;
    const weightKg = part.unit === 'KG' ? qty : Number((qty * weightPerUnit).toFixed(3));

    // Verify stock availability before reserving
    const { balances } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);
    const matching = balances.filter(b => b.partId === part.id && b.warehouseId === payload.warehouseId);
    const available = matching.reduce((sum, b) => sum + b.availableQty, 0);

    if (qty > available) {
      return res.status(400).json({
        success: false,
        error: `موجودی آزاد جهت رزرو ناکافی است. موجودی آزاد: ${available} ${part.unit}، درخواست رزرو: ${qty} ${part.unit}`,
      });
    }

    const newRes: InventoryReservation = {
      id: `RES-${Date.now()}`,
      reservationNumber: `RES-1403-${Math.floor(100 + Math.random() * 900)}`,
      partId: part.id,
      partCode: part.code,
      partName: part.name,
      warehouseId: payload.warehouseId,
      warehouseName: warehouse ? warehouse.name : payload.warehouseId,
      lotNumber: payload.lotNumber,
      ownership: payload.ownership || 'SAPCO_SUPPLIER_OWNED',
      reservedFor: payload.reservedFor || 'تخصیص خط تولید',
      quantity: qty,
      quantityKg: weightKg,
      unit: part.unit,
      status: 'ACTIVE',
      validUntil: payload.validUntil,
      createdAt: new Date().toISOString(),
    };

    reservationsStore.unshift(newRes);
    res.status(201).json({ success: true, message: 'رزرو موجودی با موفقیت ثبت شد.', data: newRes });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت رزرو موجودی',
    });
  }
});

apiRouter.post('/inventory/reservations/:id/release', (req: Request, res: Response) => {
  const { id } = req.params;
  const resIndex = reservationsStore.findIndex(r => r.id === id);
  if (resIndex === -1) {
    return res.status(404).json({ success: false, error: 'سند رزرو یافت نشد.' });
  }

  reservationsStore[resIndex].status = 'RELEASED';
  res.json({ success: true, message: 'رزرو با موفقیت آزاد گردید و به موجودی قابل استفاده بازگشت.', data: reservationsStore[resIndex] });
});

/**
 * 16.11. SAPCO Account & Consignment Movement Ledger
 */
apiRouter.get('/inventory/sapco-account', (_req: Request, res: Response) => {
  try {
    const { contractsWithBalances, ledgerEntries } = calculateSapcoContractLedger(contractsStore, inventoryDocsStore);
    res.json({
      success: true,
      contracts: contractsWithBalances,
      ledger: ledgerEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در محاسبه حسابداری امانی ساپکو',
    });
  }
});

/**
 * 16.12. Audit Logs
 */
apiRouter.get('/inventory/audit-logs', (_req: Request, res: Response) => {
  res.json({ success: true, count: auditLogsStore.length, data: auditLogsStore });
});

// =========================================================================
// 17. PRODUCTION EXECUTION & WORK IN PROCESS (WIP) MODULE ENDPOINTS
// =========================================================================

/**
 * 17.1. Get WIP Dashboard Metrics & Bottlenecks
 */
apiRouter.get('/wip/dashboard', (_req: Request, res: Response) => {
  try {
    const metrics = getWipDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در محاسبه داشبورد WIP',
    });
  }
});

/**
 * 17.2. Get All Manufacturing Orders (MOs)
 */
apiRouter.get('/wip/manufacturing-orders', (_req: Request, res: Response) => {
  try {
    const orders = getManufacturingOrdersList();
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت دستورات ساخت',
    });
  }
});

/**
 * 17.3. Get Single Manufacturing Order Details & Operations
 */
apiRouter.get('/wip/manufacturing-orders/:id', (req: Request, res: Response) => {
  try {
    const mo = getManufacturingOrderById(req.params.id);
    if (!mo) {
      return res.status(404).json({ success: false, error: 'دستور تولید یافت نشد.' });
    }
    res.json({ success: true, data: mo });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت جزئیات دستور تولید',
    });
  }
});

/**
 * 17.4. Create New Manufacturing Order from Approved Part Routing
 */
apiRouter.post('/wip/manufacturing-orders', (req: Request, res: Response) => {
  try {
    const result = createManufacturingOrder(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ایجاد دستور ساخت',
    });
  }
});

/**
 * 17.5. Register Operation Input (Loading into machine from waiting queue)
 */
apiRouter.post('/wip/operations/input', (req: Request, res: Response) => {
  try {
    const result = registerOperationInput(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: 'ورودی مرحله با موفقیت ثبت شد و به پای دستگاه منتقل گردید.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت ورودی مرحله',
    });
  }
});

/**
 * 17.6. Register Good Production, Scrap, Rework, Rejected Quantities
 */
apiRouter.post('/wip/operations/production', (req: Request, res: Response) => {
  try {
    const result = registerOperationProduction(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: 'تولید مرحله با موفقیت در دفاتر WIP ثبت گردید و آماده انتقال شد.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت عملکرد تولید مرحله',
    });
  }
});

/**
 * 17.7. List All Inter-Operation Transfers
 */
apiRouter.get('/wip/transfers', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, count: wipTransfersStore.length, data: wipTransfersStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت حواله‌های انتقال',
    });
  }
});

/**
 * 17.8. Create Inter-Operation Transfer
 */
apiRouter.post('/wip/transfers', (req: Request, res: Response) => {
  try {
    const result = createOperationTransfer(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json({ success: true, message: 'حواله انتقال صادر شد و در وضعیت در حال انتقال قرار گرفت.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در صدور حواله انتقال بین‌مراحل',
    });
  }
});

/**
 * 17.9. Approve & Receive Inter-Operation Transfer
 */
apiRouter.post('/wip/transfers/:id/approve', (req: Request, res: Response) => {
  try {
    const { receivedBy, notes } = req.body;
    const result = approveOperationTransfer({
      transferId: req.params.id,
      receivedBy: receivedBy || 'سرپرست ایستگاه مقصد',
      notes,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: 'حواله تحویل شد و به موجودی در انتظار ایستگاه مقصد اضافه گردید.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در تأیید و تحویل حواله انتقال',
    });
  }
});

/**
 * 17.10. Reject Inter-Operation Transfer
 */
apiRouter.post('/wip/transfers/:id/reject', (req: Request, res: Response) => {
  try {
    const { rejectedBy, rejectionReason } = req.body;
    const result = rejectOperationTransfer({
      transferId: req.params.id,
      rejectedBy: rejectedBy || 'بازرس کنترل کیفیت',
      rejectionReason: rejectionReason || 'مغایرت تعداد یا عدم انطباق کیفی در ورودی',
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: 'حواله رد شد و قطعات به مرحله مبدأ بازگردانده شدند.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در رد حواله انتقال',
    });
  }
});

/**
 * 17.11. Run Mathematical Reconciliation Audit for Manufacturing Order
 */
apiRouter.get('/wip/reconciliation/:moId', (req: Request, res: Response) => {
  try {
    const audit = calculateMoReconciliation(req.params.moId);
    if (!audit) {
      return res.status(404).json({ success: false, error: 'دستور تولید جهت بازرسی تراز یافت نشد.' });
    }
    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در انجام موازنه پایستگی قطعات',
    });
  }
});

/**
 * 17.12. Get WIP Activity Logs
 */
apiRouter.get('/wip/logs', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, count: productionLogsStore.length, data: productionLogsStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت لاگ فعالیت‌های کارگاهی',
    });
  }
});

// =========================================================================
// 18. PRODUCTION PLANNING ENGINE & MACHINE ASSIGNMENT ENDPOINTS
// =========================================================================

/**
 * 18.1. Get Planning Dashboard Metrics
 */
apiRouter.get('/planning/dashboard-metrics', (_req: Request, res: Response) => {
  try {
    const metrics = getPlanningDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در محاسبه معیارهای برنامه‌ریزی تولید',
    });
  }
});

/**
 * 18.2. Get Multi-Stage Net Requirements (Gross Demand, Available FG, WIP Credit, Material Shortage)
 */
apiRouter.get('/planning/net-requirements', (_req: Request, res: Response) => {
  try {
    const requirements = calculateNetRequirements();
    res.json({ success: true, count: requirements.length, data: requirements });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در محاسبه خالص احتیاجات تولید',
    });
  }
});

/**
 * 18.3. Get All Proposed Production Plan Suggestions
 */
apiRouter.get('/planning/suggestions', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, count: planSuggestionsStore.length, data: planSuggestionsStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت برنامه‌های پیشنهادی',
    });
  }
});

/**
 * 18.4. Get Single Suggestion Details
 */
apiRouter.get('/planning/suggestions/:id', (req: Request, res: Response) => {
  try {
    const suggestion = planSuggestionsStore.find(s => s.id === req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'برنامه پیشنهادی یافت نشد.' });
    }
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت جزئیات برنامه',
    });
  }
});

/**
 * 18.5. Regenerate Suggestions Based on Fresh Demand and WIP
 */
apiRouter.post('/planning/suggestions/regenerate', (_req: Request, res: Response) => {
  try {
    planSuggestionsStore.length = 0; // Clear
    const fresh = generateProductionPlanSuggestions();
    planSuggestionsStore.push(...fresh);
    res.json({ success: true, message: 'برنامه‌ریزی تولید بر مبنای آخرین سفارشات و وضعیت WIP مجدداً محاسبه شد.', data: fresh });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در بازتولید محاسبات برنامه‌ریزی',
    });
  }
});

/**
 * 18.6. Approve Proposed Plan
 */
apiRouter.post('/planning/suggestions/:id/approve', (req: Request, res: Response) => {
  try {
    const approvedBy = req.body.approvedBy || 'مهندس حسینی (مدیر تولید)';
    const result = approvePlanSuggestion(req.params.id, approvedBy);
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: 'برنامه پیشنهادی با موفقیت تأیید شد و آماده صدور به سالن تولید گردید.', data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در تأیید برنامه تولید',
    });
  }
});

/**
 * 18.7. Release Approved Plan to Official Manufacturing Order
 */
apiRouter.post('/planning/suggestions/:id/release-mo', (req: Request, res: Response) => {
  try {
    const releasedBy = req.body.releasedBy || 'مهندس حسینی (مدیر تولید)';
    const result = releasePlanToManufacturingOrder(req.params.id, releasedBy);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json({
      success: true,
      message: `برنامه با موفقیت به دستور ساخت رسمی شماره ${result.mo?.moNumber} تبدیل و مراحل عملیاتی صادر شدند.`,
      mo: result.mo,
      plan: result.plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در صدور دستور کار از روی برنامه',
    });
  }
});

/**
 * 18.8. Revise Plan Operations / Versioning
 */
apiRouter.post('/planning/suggestions/:id/revise', (req: Request, res: Response) => {
  try {
    const { modifiedOperations, note } = req.body;
    const result = revisePlanVersion(req.params.id, modifiedOperations, note || 'اصلاح دستی تخصیص ماشین‌آلات');
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: `نسخه برنامه به ${result.data?.planVersion} ارتقا یافت و ذخیره شد.`, data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت ویرایش نسخه برنامه',
    });
  }
});

/**
 * 18.9. Dynamic Machine Eligibility Evaluation
 */
apiRouter.post('/planning/evaluate-machine-eligibility', (req: Request, res: Response) => {
  try {
    const candidateMachines = evaluateMachineEligibility(req.body);
    res.json({ success: true, data: candidateMachines });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ارزیابی شرایط ماشین‌آلات',
    });
  }
});

/**
 * 18.10. Get Customer Orders
 */
apiRouter.get('/planning/customer-orders', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, count: customerOrdersStore.length, data: customerOrdersStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در دریافت سفارشات مشتری',
    });
  }
});

/**
 * 18.11. Create Customer Order
 */
apiRouter.post('/planning/customer-orders', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const newOrder: CustomerOrder = {
      id: `ORD-2026-${String(customerOrdersStore.length + 1).padStart(3, '0')}`,
      orderNumber: payload.orderNumber || `SO-SAPCO-1405-${String(customerOrdersStore.length + 10)}`,
      customerName: payload.customerName || 'ساپکو',
      contractNumber: payload.contractNumber || 'CNT-SAP-2026-001',
      orderDate: payload.orderDate || new Date().toISOString().slice(0, 10),
      dueDate: payload.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      priority: payload.priority || 2,
      status: 'OPEN',
      lines: payload.lines || [],
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    customerOrdersStore.unshift(newOrder);

    // Refresh plan suggestions
    planSuggestionsStore.length = 0;
    planSuggestionsStore.push(...generateProductionPlanSuggestions());

    res.status(201).json({ success: true, message: 'سفارش مشتری با موفقیت ثبت شد و نیازمندی‌های تولید به‌روز گردیدند.', data: newOrder });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'خطا در ثبت سفارش مشتری',
    });
  }
});

// =========================================================================
// 19. MANAGEMENT REPORTING & CONTROL MODULE ENDPOINTS
// =========================================================================

function extractReportFilters(req: Request): ReportFilterParams {
  return {
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    partId: req.query.partId as string | undefined,
    customerId: req.query.customerId as string | undefined,
    customerName: req.query.customerName as string | undefined,
    machineId: req.query.machineId as string | undefined,
    processType: req.query.processType as any,
    status: req.query.status as string | undefined,
  };
}

// 19.0 Dashboard Summary
apiRouter.get('/reports/dashboard-summary', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const summary = getManagementDashboardSummary(filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در بارگذاری خلاصه مدیریتی' });
  }
});

// 19.1 Plan vs Actual
apiRouter.get('/reports/plan-vs-actual', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getPlanVsActualReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش برنامه در برابر واقعی' });
  }
});

// 19.2 Customer Order Fulfillment
apiRouter.get('/reports/customer-order-fulfillment', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getCustomerOrderFulfillmentReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش تحقق سفارشات' });
  }
});

// 19.3 Production Backlog
apiRouter.get('/reports/production-backlog', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getProductionBacklogReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش معوقات تولید' });
  }
});

// 19.4 WIP by Part & Operation
apiRouter.get('/reports/wip-by-part-operation', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getWipByPartAndOperationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش WIP' });
  }
});

// 19.5 WIP Aging
apiRouter.get('/reports/wip-aging', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getWipAgingReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش سن‌یابی WIP' });
  }
});

// 19.6 Material Consumption vs Standard
apiRouter.get('/reports/material-consumption-vs-standard', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getMaterialConsumptionVsStandardReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش مصرف مواد' });
  }
});

// 19.7 SAPCO Material Account
apiRouter.get('/reports/sapco-material-account', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getSapcoMaterialAccountReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش حساب ساپکو' });
  }
});

// 19.8 Inventory Valuation Quantities
apiRouter.get('/reports/inventory-valuation-quantities', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryValuationQuantitiesReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش تفکیک مقداری موجودی' });
  }
});

// 19.9 Scrap by Part & Operation
apiRouter.get('/reports/scrap-by-part-operation', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getScrapByPartAndOperationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش ضایعات' });
  }
});

// 19.10 Machine Workload & Available Capacity
apiRouter.get('/reports/machine-workload-capacity', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getMachineWorkloadCapacityReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش لود کاری ماشین‌آلات' });
  }
});

// 19.11 Production Delays
apiRouter.get('/reports/production-delays', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getProductionDelaysReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش تأخیرات تولید' });
  }
});

// 19.12 Inventory Movements
apiRouter.get('/reports/inventory-movements', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryMovementsReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش گردش اسناد انبار' });
  }
});

// 19.13 Inventory Reconciliation
apiRouter.get('/reports/inventory-reconciliation', (req: Request, res: Response) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryReconciliationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'خطا در گزارش انبارگردانی' });
  }
});



