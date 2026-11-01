/**
 * =========================================================================
 * KPIMS - Advanced Inventory Management & Kardex Engine
 * Core Business Logic, Atomic Posting, Negative Stock Protection & SAPCO Ledger
 * =========================================================================
 */

import {
  InventoryDocument,
  InventoryDocumentLine,
  InventoryDocType,
  InventoryReservation,
  DetailedStockBalance,
  SapcoContract,
  SapcoContractLedgerEntry,
  InventoryDashboardMetrics,
  Part,
  StockOwnership,
  StockQualityStatus,
  WAREHOUSES_LIST,
} from '../types/inventory';

export interface AuditRecord {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  user: { uid: string; displayName: string };
  details: string;
  timestamp: string;
}

export interface PostDocumentResult {
  success: boolean;
  error?: string;
  postedDocument?: InventoryDocument;
  createdLedgerEntries?: SapcoContractLedgerEntry[];
  auditRecord?: AuditRecord;
}

export interface ReversalResult {
  success: boolean;
  error?: string;
  originalDocument?: InventoryDocument;
  reversalDocument?: InventoryDocument;
  auditRecord?: AuditRecord;
}

/**
 * Calculates complete multidimensional stock balances strictly from POSTED inventory documents.
 * DRAFT documents are completely excluded from official stock calculations.
 */
export function calculateDetailedStockBalances(
  documents: InventoryDocument[],
  reservations: InventoryReservation[],
  parts: Part[]
): {
  balances: DetailedStockBalance[];
  metrics: InventoryDashboardMetrics;
} {
  const partsMap = new Map<string, Part>();
  parts.forEach(p => partsMap.set(p.id, p));

  // Key: `${partId}:::${warehouseId}:::${locationCode}:::${ownership}:::${lotNumber || 'NO_LOT'}`
  const balanceMap = new Map<string, DetailedStockBalance>();

  const getOrCreateBalance = (
    part: Part,
    warehouseId: string,
    warehouseName: string,
    locationCode: string,
    ownership: StockOwnership,
    lotNumber?: string,
    heatNumber?: string,
    materialLotId?: string,
    contractId?: string,
    contractNumber?: string
  ): DetailedStockBalance => {
    const safeLot = lotNumber || 'NO_LOT';
    const key = `${part.id}:::${warehouseId}:::${locationCode}:::${ownership}:::${safeLot}`;
    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        id: `STK-${key}`,
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        category: part.category,
        materialGrade: part.materialGrade,
        thicknessMm: part.thicknessMm,
        warehouseId,
        warehouseName,
        locationCode: locationCode || 'MAIN',
        materialLotId,
        lotNumber: lotNumber || undefined,
        heatNumber,
        ownership,
        contractId,
        contractNumber,
        unit: part.unit,
        physicalQty: 0,
        ownedQty: 0,
        supplierOwnedQty: 0,
        reservedQty: 0,
        qualityBlockedQty: 0,
        availableQty: 0,
        physicalKg: 0,
        ownedKg: 0,
        supplierOwnedKg: 0,
        reservedKg: 0,
        qualityBlockedKg: 0,
        availableKg: 0,
        lastTransactionAt: new Date().toISOString(),
      });
    }
    return balanceMap.get(key)!;
  };

  // 1. Process all historical POSTED & REVERSED documents chronologically
  const postedDocs = documents
    .filter(d => d.postingStatus === 'POSTED' || d.postingStatus === 'REVERSED')
    .sort((a, b) => new Date(a.documentDate).getTime() - new Date(b.documentDate).getTime());

  for (const doc of postedDocs) {
    for (const line of doc.lines) {
      const part = partsMap.get(line.partId);
      if (!part) continue;

      const weightPerUnit = part.weightPerUnitKg || 1;
      const qty = Number(line.quantity) || 0;
      const weightKg = part.unit === 'KG' ? qty : Number((qty * weightPerUnit).toFixed(3));

      switch (doc.documentType) {
        case 'OPENING_BALANCE':
        case 'RECEIPT_RAW_MATERIAL':
        case 'RECEIPT_FINISHED_GOODS': {
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || 'LOC-01',
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty += qty;
          entry.physicalKg += weightKg;
          if (line.ownership === 'COMPANY_OWNED') {
            entry.ownedQty += qty;
            entry.ownedKg += weightKg;
          } else {
            entry.supplierOwnedQty += qty;
            entry.supplierOwnedKg += weightKg;
          }
          if (line.qualityStatus === 'QUALITY_BLOCKED' || line.qualityStatus === 'QUARANTINE' || line.qualityStatus === 'REJECTED') {
            entry.qualityBlockedQty += qty;
            entry.qualityBlockedKg += weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }

        case 'ISSUE_RAW_MATERIAL': {
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || 'LOC-01',
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty -= qty;
          entry.physicalKg -= weightKg;
          if (line.ownership === 'COMPANY_OWNED') {
            entry.ownedQty -= qty;
            entry.ownedKg -= weightKg;
          } else {
            entry.supplierOwnedQty -= qty;
            entry.supplierOwnedKg -= weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }

        case 'TRANSFER': {
          // Source Warehouse deduction
          const sourceEntry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || 'LOC-01',
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          sourceEntry.physicalQty -= qty;
          sourceEntry.physicalKg -= weightKg;
          if (line.ownership === 'COMPANY_OWNED') {
            sourceEntry.ownedQty -= qty;
            sourceEntry.ownedKg -= weightKg;
          } else {
            sourceEntry.supplierOwnedQty -= qty;
            sourceEntry.supplierOwnedKg -= weightKg;
          }
          sourceEntry.lastTransactionAt = doc.postedAt || doc.documentDate;

          // Target Warehouse addition
          if (doc.targetWarehouseId) {
            const targetWarehouse = WAREHOUSES_LIST.find(w => w.id === doc.targetWarehouseId);
            const targetEntry = getOrCreateBalance(
              part,
              doc.targetWarehouseId,
              targetWarehouse ? targetWarehouse.name : doc.targetWarehouseId,
              line.targetLocationCode || line.locationCode || 'LOC-01',
              line.ownership,
              line.lotNumber,
              line.heatNumber,
              line.materialLotId,
              line.contractId,
              line.contractNumber
            );
            targetEntry.physicalQty += qty;
            targetEntry.physicalKg += weightKg;
            if (line.ownership === 'COMPANY_OWNED') {
              targetEntry.ownedQty += qty;
              targetEntry.ownedKg += weightKg;
            } else {
              targetEntry.supplierOwnedQty += qty;
              targetEntry.supplierOwnedKg += weightKg;
            }
            targetEntry.lastTransactionAt = doc.postedAt || doc.documentDate;
          }
          break;
        }

        case 'ADJUSTMENT':
        case 'REVERSAL': {
          // Can be positive or negative adjustment
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || 'LOC-01',
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty += qty;
          entry.physicalKg += weightKg;
          if (line.ownership === 'COMPANY_OWNED') {
            entry.ownedQty += qty;
            entry.ownedKg += weightKg;
          } else {
            entry.supplierOwnedQty += qty;
            entry.supplierOwnedKg += weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }
      }
    }
  }

  // 2. Apply ACTIVE Reservations
  for (const res of reservations) {
    if (res.status !== 'ACTIVE') continue;
    const part = partsMap.get(res.partId);
    if (!part) continue;

    // Find matching balances in the reserved warehouse
    for (const entry of balanceMap.values()) {
      if (
        entry.partId === res.partId &&
        entry.warehouseId === res.warehouseId &&
        (!res.lotNumber || entry.lotNumber === res.lotNumber)
      ) {
        entry.reservedQty += res.quantity;
        entry.reservedKg += res.quantityKg;
      }
    }
  }

  // 3. Compute available stock = physical - reserved - qualityBlocked
  const balances: DetailedStockBalance[] = [];
  let totalPhysicalKg = 0;
  let totalPhysicalPcs = 0;
  let totalAvailableKg = 0;
  let totalAvailablePcs = 0;
  let totalReservedKg = 0;
  let totalReservedPcs = 0;
  let totalQualityBlockedKg = 0;
  let totalQualityBlockedPcs = 0;
  let totalSapcoConsignmentKg = 0;
  let totalCompanyOwnedKg = 0;
  const activeLots = new Set<string>();

  for (const item of balanceMap.values()) {
    item.availableQty = Math.max(0, item.physicalQty - item.reservedQty - item.qualityBlockedQty);
    item.availableKg = Math.max(0, item.physicalKg - item.reservedKg - item.qualityBlockedKg);

    // Round for high numerical stability
    item.physicalQty = Math.round(item.physicalQty * 1000) / 1000;
    item.availableQty = Math.round(item.availableQty * 1000) / 1000;
    item.reservedQty = Math.round(item.reservedQty * 1000) / 1000;
    item.qualityBlockedQty = Math.round(item.qualityBlockedQty * 1000) / 1000;
    item.physicalKg = Math.round(item.physicalKg * 1000) / 1000;
    item.availableKg = Math.round(item.availableKg * 1000) / 1000;
    item.reservedKg = Math.round(item.reservedKg * 1000) / 1000;
    item.qualityBlockedKg = Math.round(item.qualityBlockedKg * 1000) / 1000;

    balances.push(item);

    if (item.lotNumber && item.physicalQty > 0) {
      activeLots.add(item.lotNumber);
    }

    // Accumulate metrics
    if (item.unit === 'KG') {
      totalPhysicalKg += item.physicalQty;
      totalAvailableKg += item.availableQty;
      totalReservedKg += item.reservedQty;
      totalQualityBlockedKg += item.qualityBlockedQty;
    } else {
      totalPhysicalPcs += item.physicalQty;
      totalAvailablePcs += item.availableQty;
      totalReservedPcs += item.reservedQty;
      totalQualityBlockedPcs += item.qualityBlockedQty;
      totalPhysicalKg += item.physicalKg;
      totalAvailableKg += item.availableKg;
      totalReservedKg += item.reservedKg;
      totalQualityBlockedKg += item.qualityBlockedKg;
    }

    if (item.ownership === 'SAPCO_SUPPLIER_OWNED') {
      totalSapcoConsignmentKg += item.physicalKg;
    } else {
      totalCompanyOwnedKg += item.physicalKg;
    }
  }

  const metrics: InventoryDashboardMetrics = {
    totalPhysicalKg: Math.round(totalPhysicalKg * 100) / 100,
    totalPhysicalPcs: Math.round(totalPhysicalPcs),
    totalAvailableKg: Math.round(totalAvailableKg * 100) / 100,
    totalAvailablePcs: Math.round(totalAvailablePcs),
    totalReservedKg: Math.round(totalReservedKg * 100) / 100,
    totalReservedPcs: Math.round(totalReservedPcs),
    totalQualityBlockedKg: Math.round(totalQualityBlockedKg * 100) / 100,
    totalQualityBlockedPcs: Math.round(totalQualityBlockedPcs),
    totalSapcoConsignmentKg: Math.round(totalSapcoConsignmentKg * 100) / 100,
    totalCompanyOwnedKg: Math.round(totalCompanyOwnedKg * 100) / 100,
    activeLotsCount: activeLots.size,
    draftDocumentsCount: documents.filter(d => d.postingStatus === 'UNPOSTED').length,
    postedDocumentsCount: postedDocs.length,
    activeContractsCount: 0, // will be populated in SAPCO ledger
  };

  return { balances, metrics };
}

/**
 * Validates document and executes atomic posting.
 * Enforces negative stock protection, duplicate posting block, and audit tracking.
 */
export function atomicPostDocument(
  document: InventoryDocument,
  allDocuments: InventoryDocument[],
  reservations: InventoryReservation[],
  parts: Part[],
  user: { uid: string; displayName: string }
): PostDocumentResult {
  // Rule 4: Prevent duplicate posting
  if (document.postingStatus === 'POSTED') {
    return {
      success: false,
      error: `سند شماره «${document.documentNumber}» قبلاً قطعی (POSTED) شده است. ثبت مجدد مجاز نیست.`,
    };
  }

  if (document.documentStatus === 'CANCELLED') {
    return {
      success: false,
      error: `سند شماره «${document.documentNumber}» لغو شده است و امکان ثبت قطعی ندارد.`,
    };
  }

  if (!document.lines || document.lines.length === 0) {
    return {
      success: false,
      error: 'سند فاقد هرگونه ردیف کالا یا مواد است.',
    };
  }

  // Rule 9: Every adjustment requires a reason
  if (document.documentType === 'ADJUSTMENT' && (!document.adjustmentReason || !document.adjustmentReason.trim())) {
    return {
      success: false,
      error: 'ثبت سند تعدیل انبارگردانی بدون ذکر علت تعدیل و مجوز ممیزی مجاز نمی‌باشد.',
    };
  }

  // Rule 5: Prevent unauthorized negative stock
  const isStockDeduction = ['ISSUE_RAW_MATERIAL', 'TRANSFER'].includes(document.documentType);
  if (isStockDeduction) {
    const { balances } = calculateDetailedStockBalances(allDocuments, reservations, parts);

    for (const line of document.lines) {
      const part = parts.find(p => p.id === line.partId);
      const partName = part ? part.name : line.partCode;
      const requestedQty = Number(line.quantity);

      // Find available stock in the specified source warehouse & lot (if lot specified)
      const matchingBalances = balances.filter(
        b =>
          b.partId === line.partId &&
          b.warehouseId === document.warehouseId &&
          (!line.lotNumber || b.lotNumber === line.lotNumber)
      );

      const totalAvailableInStore = matchingBalances.reduce((sum, b) => sum + b.availableQty, 0);

      if (requestedQty > totalAvailableInStore) {
        return {
          success: false,
          error: `خطای کنترل موجودی: موجودی آزاد قطعه «${partName}» در «${document.warehouseName}» کافی نیست. موجودی آزاد: ${totalAvailableInStore} ${line.unit}، مقدار درخواستی: ${requestedQty} ${line.unit}. جلوگیری از منفی شدن موجودی.`,
        };
      }
    }
  }

  // If validation passes, atomically transition state
  const now = new Date().toISOString();
  document.postingStatus = 'POSTED';
  document.documentStatus = 'CONFIRMED';
  document.postedByUid = user.uid;
  document.postedByName = user.displayName;
  document.postedAt = now;
  document.updatedAt = now;

  const auditRecord: AuditRecord = {
    id: `AUD-${Date.now()}`,
    action: 'DOCUMENT_POST',
    entityName: 'InventoryDocument',
    entityId: document.documentNumber,
    user,
    details: `ثبت قطعی سند ${document.documentType} شماره ${document.documentNumber} شامل ${document.lines.length} قلم به وزن کل ${document.totalWeightKg} کیلوگرم`,
    timestamp: now,
  };

  return {
    success: true,
    postedDocument: document,
    auditRecord,
  };
}

/**
 * Reversal document creation (Rule 10: Corrections must use reversal documents).
 * Generates an immutable mirror-image document with negated quantities, referencing original document.
 */
export function createReversalDocument(
  targetDocument: InventoryDocument,
  reason: string,
  user: { uid: string; displayName: string }
): ReversalResult {
  if (targetDocument.postingStatus !== 'POSTED') {
    return {
      success: false,
      error: 'فقط اسناد قطعی‌شده (POSTED) قابلیت صدور سند اصلاحی و ابطال را دارند.',
    };
  }

  if (targetDocument.documentType === 'REVERSAL') {
    return {
      success: false,
      error: 'یک سند برگشتی خود نمی‌تواند مجدداً معکوس شود.',
    };
  }

  const now = new Date().toISOString();
  const reversalDocNumber = `REV-${targetDocument.documentNumber}`;

  // Determine reversal multiplier based on original document type
  // Receipts added stock, so reversing them deducts (-1)
  // Issues deducted stock, so reversing them restores (+1)
  // Adjustments are negated (-1)
  const isOriginalIssue = targetDocument.documentType === 'ISSUE_RAW_MATERIAL';

  // Mirror lines with exact compensating quantities
  const reversedLines: InventoryDocumentLine[] = targetDocument.lines.map((l, index) => {
    const revQty = isOriginalIssue ? Math.abs(l.quantity) : -l.quantity;
    const revQtyKg = isOriginalIssue ? Math.abs(l.quantityKg) : -l.quantityKg;

    return {
      ...l,
      id: `REV-LINE-${Date.now()}-${index}`,
      documentId: `DOC-${reversalDocNumber}`,
      quantity: revQty,
      quantityKg: revQtyKg,
      notes: `ابطال ردیف ${l.lineNumber} سند ${targetDocument.documentNumber}: ${reason}`,
    };
  });

  const reversalDoc: InventoryDocument = {
    id: `DOC-REV-${Date.now()}`,
    documentNumber: reversalDocNumber,
    documentType: 'REVERSAL',
    documentDate: now,
    documentStatus: 'CONFIRMED',
    postingStatus: 'POSTED',
    warehouseId: targetDocument.documentType === 'TRANSFER' && targetDocument.targetWarehouseId ? targetDocument.targetWarehouseId : targetDocument.warehouseId,
    warehouseName: targetDocument.documentType === 'TRANSFER' && targetDocument.targetWarehouseName ? targetDocument.targetWarehouseName : targetDocument.warehouseName,
    targetWarehouseId: targetDocument.documentType === 'TRANSFER' ? targetDocument.warehouseId : targetDocument.targetWarehouseId,
    targetWarehouseName: targetDocument.documentType === 'TRANSFER' ? targetDocument.warehouseName : targetDocument.targetWarehouseName,
    ownership: targetDocument.ownership,
    contractId: targetDocument.contractId,
    contractNumber: targetDocument.contractNumber,
    referenceType: 'REVERSAL_OF',
    referenceNumber: targetDocument.documentNumber,
    reversalOfDocumentId: targetDocument.id,
    reversalOfDocNumber: targetDocument.documentNumber,
    adjustmentReason: reason,
    auditNote: `سند اصلاحی صادره توسط ${user.displayName} جهت ابطال سند ${targetDocument.documentNumber}. علت: ${reason}`,
    lines: reversedLines,
    totalQuantity: isOriginalIssue ? Math.abs(targetDocument.totalQuantity) : -targetDocument.totalQuantity,
    totalWeightKg: isOriginalIssue ? Math.abs(targetDocument.totalWeightKg) : -targetDocument.totalWeightKg,
    createdByUid: user.uid,
    createdByName: user.displayName,
    postedByUid: user.uid,
    postedByName: user.displayName,
    postedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Mark original document as REVERSED
  targetDocument.postingStatus = 'REVERSED';
  targetDocument.updatedAt = now;

  const auditRecord: AuditRecord = {
    id: `AUD-${Date.now()}`,
    action: 'DOCUMENT_REVERSE',
    entityName: 'InventoryDocument',
    entityId: targetDocument.documentNumber,
    user,
    details: `ابطال سند شماره ${targetDocument.documentNumber} و صدور سند جبرانی ${reversalDocNumber}. دلیل: ${reason}`,
    timestamp: now,
  };

  return {
    success: true,
    originalDocument: targetDocument,
    reversalDocument: reversalDoc,
    auditRecord,
  };
}

/**
 * SAPCO Account and Consignment Contract Ledger Engine
 * Tracks Opening, Receipts, Consumption, and Closing balance in kilograms per contract.
 */
export function calculateSapcoContractLedger(
  contracts: SapcoContract[],
  documents: InventoryDocument[]
): {
  contractsWithBalances: SapcoContract[];
  ledgerEntries: SapcoContractLedgerEntry[];
} {
  const postedDocs = documents
    .filter(d => d.postingStatus === 'POSTED' || d.postingStatus === 'REVERSED')
    .sort((a, b) => new Date(a.documentDate).getTime() - new Date(b.documentDate).getTime());

  const contractMap = new Map<string, SapcoContract>();
  contracts.forEach(c => {
    contractMap.set(c.id, {
      ...c,
      totalReceivedKg: 0,
      totalConsumedKg: 0,
      closingBalanceKg: c.openingBalanceKg || 0,
    });
  });

  const ledgerEntries: SapcoContractLedgerEntry[] = [];

  // Seed opening balance entries
  contracts.forEach(c => {
    if (c.openingBalanceKg > 0) {
      ledgerEntries.push({
        id: `LEDGER-OP-${c.id}`,
        contractId: c.id,
        contractNumber: c.contractNumber,
        documentNumber: `INIT-${c.contractNumber}`,
        date: c.startDate,
        operationType: 'OPENING',
        weightKgSigned: c.openingBalanceKg,
        runningBalanceKg: c.openingBalanceKg,
        notes: 'مانده سهمیه اولیه دوره',
      });
    }
  });

  for (const doc of postedDocs) {
    for (const line of doc.lines) {
      if (line.ownership !== 'SAPCO_SUPPLIER_OWNED' && !line.contractId) continue;

      const contractId = line.contractId || contracts[0]?.id;
      const contract = contractMap.get(contractId);
      if (!contract) continue;

      let signedKg = 0;
      let opType: SapcoContractLedgerEntry['operationType'] = 'RECEIPT';

      if (['RECEIPT_RAW_MATERIAL', 'OPENING_BALANCE'].includes(doc.documentType)) {
        signedKg = line.quantityKg;
        opType = 'RECEIPT';
        contract.totalReceivedKg += signedKg;
        contract.closingBalanceKg += signedKg;
      } else if (doc.documentType === 'ISSUE_RAW_MATERIAL') {
        signedKg = -line.quantityKg;
        opType = 'CONSUMPTION';
        contract.totalConsumedKg += line.quantityKg;
        contract.closingBalanceKg -= line.quantityKg;
      } else if (doc.documentType === 'REVERSAL' || doc.documentType === 'ADJUSTMENT') {
        signedKg = line.quantityKg;
        opType = 'ADJUSTMENT';
        if (signedKg > 0) {
          // Reversing consumption or positive adjustment restores balance
          contract.closingBalanceKg += signedKg;
          contract.totalConsumedKg = Math.max(0, contract.totalConsumedKg - signedKg);
        } else {
          contract.closingBalanceKg += signedKg;
          contract.totalReceivedKg = Math.max(0, contract.totalReceivedKg + signedKg);
        }
      }

      ledgerEntries.push({
        id: `LEDGER-${doc.documentNumber}-${line.id}`,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        documentNumber: doc.documentNumber,
        date: doc.postedAt || doc.documentDate,
        waybillNumber: doc.referenceNumber || line.heatNumber,
        lotNumber: line.lotNumber,
        heatNumber: line.heatNumber,
        operationType: opType,
        weightKgSigned: Math.round(signedKg * 100) / 100,
        runningBalanceKg: Math.round(contract.closingBalanceKg * 100) / 100,
        notes: line.notes || doc.adjustmentReason || doc.referenceType,
      });
    }
  }

  // Round contract values
  const contractsWithBalances = Array.from(contractMap.values()).map(c => ({
    ...c,
    totalReceivedKg: Math.round(c.totalReceivedKg * 100) / 100,
    totalConsumedKg: Math.round(c.totalConsumedKg * 100) / 100,
    closingBalanceKg: Math.round(c.closingBalanceKg * 100) / 100,
  }));

  return { contractsWithBalances, ledgerEntries };
}
