/**
 * =========================================================================
 * KPIMS - Automated Test Suite for Inventory Management Module
 * Tests: Receipts, Issues, Transfers, Duplicate Posting Prevention,
 * Negative Stock Prevention, Reversals, and SAPCO Balance Calculations
 * =========================================================================
 */

import {
  calculateDetailedStockBalances,
  atomicPostDocument,
  createReversalDocument,
  calculateSapcoContractLedger,
} from '../src/server/inventoryEngine';
import {
  InventoryDocument,
  InventoryReservation,
  SapcoContract,
  Part,
} from '../src/types/inventory';

// Test Fixtures
const testParts: Part[] = [
  {
    id: 'PRT-COIL-01',
    code: 'SAPCO-DC04-0.8',
    name: 'کویل ورق روغنی DC04 ضخامت ۰.۸ میلیمتر',
    category: 'RAW_MATERIAL',
    unit: 'KG',
    weightPerUnitKg: 1,
    materialGrade: 'DC04',
    minStock: 2000,
  },
  {
    id: 'PRT-BRK-01',
    code: 'IKCO-206-BRK01',
    name: 'براکت اتصال رام جلو پژو ۲۰۶',
    category: 'FINISHED_GOOD',
    unit: 'PCS',
    weightPerUnitKg: 1.72,
    minStock: 500,
  },
];

const testContracts: SapcoContract[] = [
  {
    id: 'CNT-001',
    contractNumber: 'CNT-SAPCO-1403-TEST',
    title: 'قرارداد آزمایشی سهمیه ورق ساپکو',
    materialGrade: 'DC04',
    allocatedWeightKg: 100000,
    openingBalanceKg: 20000,
    totalReceivedKg: 0,
    totalConsumedKg: 0,
    closingBalanceKg: 20000,
    associatedPartCodes: ['SAPCO-DC04-0.8'],
    status: 'ACTIVE',
    startDate: '2024-10-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
  },
];

const testUser = {
  uid: 'USR-TEST',
  displayName: 'تست‌کننده خودکار سیستم',
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) console.error(`     Details: ${failureDetails}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('🧪 Starting KPIMS Inventory Management Module Automated Test Suite...\n');

  const docs: InventoryDocument[] = [];
  const reservations: InventoryReservation[] = [];

  // -----------------------------------------------------------------------
  // TEST 1: Draft Documents Must NOT Affect Official Stock
  // -----------------------------------------------------------------------
  console.log('📋 Test Group 1: Draft Documents & Official Stock Invariance');
  const draftReceipt: InventoryDocument = {
    id: 'DOC-DRAFT-01',
    documentNumber: 'DRF-001',
    documentType: 'RECEIPT_RAW_MATERIAL',
    documentDate: new Date().toISOString(),
    documentStatus: 'DRAFT',
    postingStatus: 'UNPOSTED',
    warehouseId: 'WH-RAW',
    warehouseName: 'انبار مرکزی رول و ورق ساپکو',
    ownership: 'SAPCO_SUPPLIER_OWNED',
    contractId: 'CNT-001',
    contractNumber: 'CNT-SAPCO-1403-TEST',
    lines: [
      {
        id: 'L1',
        documentId: 'DOC-DRAFT-01',
        lineNumber: 1,
        partId: 'PRT-COIL-01',
        partCode: 'SAPCO-DC04-0.8',
        partName: 'کویل ورق روغنی DC04',
        ownership: 'SAPCO_SUPPLIER_OWNED',
        contractId: 'CNT-001',
        locationCode: 'LOC-RAW-A1',
        quantity: 10000,
        unit: 'KG',
        quantityKg: 10000,
        qualityStatus: 'AVAILABLE',
      },
    ],
    totalQuantity: 10000,
    totalWeightKg: 10000,
    createdByUid: testUser.uid,
    createdByName: testUser.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  docs.push(draftReceipt);
  let res = calculateDetailedStockBalances(docs, reservations, testParts);
  assert(
    res.balances.length === 0 || res.balances.every(b => b.physicalQty === 0),
    'Draft document does NOT alter official stock balance',
    `Expected 0 stock from draft, found physicalKg: ${res.metrics.totalPhysicalKg}`
  );

  // -----------------------------------------------------------------------
  // TEST 2: Atomic Posting & Material Receipt
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 2: Atomic Document Posting & Receipt Processing');
  const postReceiptResult = atomicPostDocument(
    draftReceipt,
    docs,
    reservations,
    testParts,
    testUser
  );

  assert(postReceiptResult.success === true, 'Receipt document posted atomically');
  assert(
    draftReceipt.postingStatus === 'POSTED' && draftReceipt.documentStatus === 'CONFIRMED',
    'Document status transitioned to CONFIRMED & POSTED'
  );

  res = calculateDetailedStockBalances(docs, reservations, testParts);
  assert(
    res.metrics.totalPhysicalKg === 10000 && res.metrics.totalAvailableKg === 10000,
    'Official stock accurately reflects posted 10,000 kg receipt',
    `Expected 10000 kg, got physical: ${res.metrics.totalPhysicalKg}, available: ${res.metrics.totalAvailableKg}`
  );
  assert(
    res.metrics.totalSapcoConsignmentKg === 10000,
    'Stock ownership accurately attributed to SAPCO consignment'
  );

  // -----------------------------------------------------------------------
  // TEST 3: Duplicate Posting Prevention (Idempotency)
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 3: Duplicate Posting Prevention');
  const duplicatePostResult = atomicPostDocument(
    draftReceipt,
    docs,
    reservations,
    testParts,
    testUser
  );

  assert(
    duplicatePostResult.success === false,
    'Attempting to re-post an already POSTED document is blocked',
    `Expected failure, but got success: ${duplicatePostResult.success}`
  );
  assert(
    typeof duplicatePostResult.error === 'string' && duplicatePostResult.error.includes('قبلاً قطعی'),
    'Appropriate error message returned for duplicate posting attempt'
  );

  // -----------------------------------------------------------------------
  // TEST 4: Negative Stock Prevention
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 4: Negative Stock Prevention');
  const excessiveIssueDoc: InventoryDocument = {
    id: 'DOC-ISSUE-OVERDRAFT',
    documentNumber: 'ISS-OVERDRAFT-01',
    documentType: 'ISSUE_RAW_MATERIAL',
    documentDate: new Date().toISOString(),
    documentStatus: 'DRAFT',
    postingStatus: 'UNPOSTED',
    warehouseId: 'WH-RAW',
    warehouseName: 'انبار مرکزی رول و ورق ساپکو',
    ownership: 'SAPCO_SUPPLIER_OWNED',
    contractId: 'CNT-001',
    lines: [
      {
        id: 'L2',
        documentId: 'DOC-ISSUE-OVERDRAFT',
        lineNumber: 1,
        partId: 'PRT-COIL-01',
        partCode: 'SAPCO-DC04-0.8',
        partName: 'کویل ورق روغنی DC04',
        ownership: 'SAPCO_SUPPLIER_OWNED',
        contractId: 'CNT-001',
        locationCode: 'LOC-RAW-A1',
        quantity: 15000, // Attempting to issue 15,000 kg when only 10,000 kg is available
        unit: 'KG',
        quantityKg: 15000,
        qualityStatus: 'AVAILABLE',
      },
    ],
    totalQuantity: 15000,
    totalWeightKg: 15000,
    createdByUid: testUser.uid,
    createdByName: testUser.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const overdraftResult = atomicPostDocument(
    excessiveIssueDoc,
    docs,
    reservations,
    testParts,
    testUser
  );

  assert(
    overdraftResult.success === false,
    'Unauthorized overdraft issue (15,000 kg against 10,000 kg) is strictly blocked',
    `Expected failure, got: ${overdraftResult.success}`
  );
  assert(
    typeof overdraftResult.error === 'string' && overdraftResult.error.includes('جلوگیری از منفی شدن موجودی'),
    'Negative stock prevention error message returned'
  );

  // -----------------------------------------------------------------------
  // TEST 5: Valid Material Issue & Unit Conversion
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 5: Valid Material Issue');
  const validIssueDoc: InventoryDocument = {
    id: 'DOC-ISSUE-VALID',
    documentNumber: 'ISS-1403-0001',
    documentType: 'ISSUE_RAW_MATERIAL',
    documentDate: new Date().toISOString(),
    documentStatus: 'DRAFT',
    postingStatus: 'UNPOSTED',
    warehouseId: 'WH-RAW',
    warehouseName: 'انبار مرکزی رول و ورق ساپکو',
    ownership: 'SAPCO_SUPPLIER_OWNED',
    contractId: 'CNT-001',
    lines: [
      {
        id: 'L3',
        documentId: 'DOC-ISSUE-VALID',
        lineNumber: 1,
        partId: 'PRT-COIL-01',
        partCode: 'SAPCO-DC04-0.8',
        partName: 'کویل ورق روغنی DC04',
        ownership: 'SAPCO_SUPPLIER_OWNED',
        contractId: 'CNT-001',
        locationCode: 'LOC-RAW-A1',
        quantity: 3500, // Valid deduction of 3,500 kg
        unit: 'KG',
        quantityKg: 3500,
        qualityStatus: 'AVAILABLE',
      },
    ],
    totalQuantity: 3500,
    totalWeightKg: 3500,
    createdByUid: testUser.uid,
    createdByName: testUser.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validIssueResult = atomicPostDocument(
    validIssueDoc,
    docs,
    reservations,
    testParts,
    testUser
  );
  assert(validIssueResult.success === true, 'Valid material issue of 3,500 kg posted successfully');

  docs.push(validIssueDoc);
  res = calculateDetailedStockBalances(docs, reservations, testParts);
  assert(
    res.metrics.totalPhysicalKg === 6500 && res.metrics.totalAvailableKg === 6500,
    'Stock updated correctly (10,000 - 3,500 = 6,500 kg)',
    `Expected 6500 kg, got ${res.metrics.totalPhysicalKg}`
  );

  // -----------------------------------------------------------------------
  // TEST 6: Finished Goods Receipt (Pieces & Kilograms Conversion)
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 6: Finished Goods Receipt (PCS & KG)');
  const fgReceiptDoc: InventoryDocument = {
    id: 'DOC-FG-01',
    documentNumber: 'REC-FG-001',
    documentType: 'RECEIPT_FINISHED_GOODS',
    documentDate: new Date().toISOString(),
    documentStatus: 'DRAFT',
    postingStatus: 'UNPOSTED',
    warehouseId: 'WH-FINISHED',
    warehouseName: 'انبار محصولات نهایی آماده تحویل',
    ownership: 'COMPANY_OWNED',
    lines: [
      {
        id: 'L4',
        documentId: 'DOC-FG-01',
        lineNumber: 1,
        partId: 'PRT-BRK-01',
        partCode: 'IKCO-206-BRK01',
        partName: 'براکت اتصال رام جلو پژو ۲۰۶',
        ownership: 'COMPANY_OWNED',
        locationCode: 'LOC-FIN-P1',
        quantity: 1000, // 1,000 PCS @ 1.72 kg = 1,720 kg
        unit: 'PCS',
        quantityKg: 1720,
        qualityStatus: 'AVAILABLE',
      },
    ],
    totalQuantity: 1000,
    totalWeightKg: 1720,
    createdByUid: testUser.uid,
    createdByName: testUser.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const fgPostResult = atomicPostDocument(
    fgReceiptDoc,
    docs,
    reservations,
    testParts,
    testUser
  );
  assert(fgPostResult.success === true, 'Finished goods receipt posted');
  docs.push(fgReceiptDoc);

  res = calculateDetailedStockBalances(docs, reservations, testParts);
  assert(
    res.metrics.totalPhysicalPcs === 1000,
    'Piece balance tracked correctly (1,000 PCS)',
    `Expected 1000 PCS, got ${res.metrics.totalPhysicalPcs}`
  );
  assert(
    res.metrics.totalCompanyOwnedKg === 1720,
    'Company-owned finished goods weight tracked in KG (1,720 kg)',
    `Expected 1720 kg, got ${res.metrics.totalCompanyOwnedKg}`
  );

  // -----------------------------------------------------------------------
  // TEST 7: Inter-Warehouse Inventory Transfer
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 7: Inventory Transfer Between Warehouses');
  const transferDoc: InventoryDocument = {
    id: 'DOC-TRF-01',
    documentNumber: 'TRF-001',
    documentType: 'TRANSFER',
    documentDate: new Date().toISOString(),
    documentStatus: 'DRAFT',
    postingStatus: 'UNPOSTED',
    warehouseId: 'WH-FINISHED',
    warehouseName: 'انبار محصولات نهایی آماده تحویل',
    targetWarehouseId: 'WH-RAW',
    targetWarehouseName: 'انبار مرکزی رول و ورق ساپکو',
    ownership: 'COMPANY_OWNED',
    lines: [
      {
        id: 'L5',
        documentId: 'DOC-TRF-01',
        lineNumber: 1,
        partId: 'PRT-BRK-01',
        partCode: 'IKCO-206-BRK01',
        partName: 'براکت اتصال رام جلو پژو ۲۰۶',
        locationCode: 'LOC-FIN-P1',
        targetLocationCode: 'LOC-RAW-B1',
        quantity: 200, // Transfer 200 PCS from WH-FINISHED to WH-RAW
        unit: 'PCS',
        quantityKg: 344,
        ownership: 'COMPANY_OWNED',
        qualityStatus: 'AVAILABLE',
      },
    ],
    totalQuantity: 200,
    totalWeightKg: 344,
    createdByUid: testUser.uid,
    createdByName: testUser.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const trfResult = atomicPostDocument(
    transferDoc,
    docs,
    reservations,
    testParts,
    testUser
  );
  assert(trfResult.success === true, 'Inter-warehouse transfer posted successfully');
  docs.push(transferDoc);

  res = calculateDetailedStockBalances(docs, reservations, testParts);
  const finBalance = res.balances.find(b => b.partId === 'PRT-BRK-01' && b.warehouseId === 'WH-FINISHED');
  const rawBalance = res.balances.find(b => b.partId === 'PRT-BRK-01' && b.warehouseId === 'WH-RAW');

  assert(
    finBalance !== undefined && finBalance.physicalQty === 800,
    'Source warehouse deducted by transfer amount (1,000 - 200 = 800 PCS)',
    `Expected 800 PCS, got ${finBalance?.physicalQty}`
  );
  assert(
    rawBalance !== undefined && rawBalance.physicalQty === 200,
    'Target warehouse credited by transfer amount (+200 PCS)',
    `Expected 200 PCS, got ${rawBalance?.physicalQty}`
  );
  assert(
    res.metrics.totalPhysicalPcs === 1000,
    'Total plant stock of finished goods preserved through transfer (1,000 PCS)',
    `Expected 1000 PCS total, got ${res.metrics.totalPhysicalPcs}`
  );

  // -----------------------------------------------------------------------
  // TEST 8: Document Reversal (Compensating Invariance)
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 8: Document Reversal & Correction');
  const reversalResult = createReversalDocument(
    validIssueDoc,
    'اصلاح حواله مصرف - انصراف خط تولید از دریافت ورق',
    testUser
  );

  assert(reversalResult.success === true, 'Reversal document generated successfully');
  assert(validIssueDoc.postingStatus === 'REVERSED', 'Original document marked as REVERSED');

  if (reversalResult.reversalDocument) {
    docs.push(reversalResult.reversalDocument);
  }

  res = calculateDetailedStockBalances(docs, reservations, testParts);
  const coilBalance = res.balances.find(b => b.partId === 'PRT-COIL-01');
  assert(
    coilBalance !== undefined && coilBalance.physicalQty === 10000,
    'Coil stock restored to 10,000 kg following reversal of 3,500 kg issue',
    `Expected 10000 kg, got ${coilBalance?.physicalQty}`
  );
  assert(
    res.metrics.totalPhysicalKg === 11720,
    'Total plant physical weight is 11,720 kg (10,000 kg raw coil + 1,720 kg finished goods)',
    `Expected 11720 kg, got ${res.metrics.totalPhysicalKg}`
  );

  // -----------------------------------------------------------------------
  // TEST 9: SAPCO Quota Contract Ledger Calculations
  // -----------------------------------------------------------------------
  console.log('\n📋 Test Group 9: SAPCO Account & Contract Balance Calculations');
  const sapcoResult = calculateSapcoContractLedger(testContracts, docs);
  const contract = sapcoResult.contractsWithBalances.find(c => c.id === 'CNT-001');

  assert(contract !== undefined, 'SAPCO Contract CNT-001 found in calculated ledger');
  assert(
    contract?.openingBalanceKg === 20000,
    'Opening balance preserved (20,000 kg)',
    `Expected 20000 kg, got ${contract?.openingBalanceKg}`
  );
  assert(
    contract?.totalReceivedKg === 10000,
    'Receipts accurately accumulated (10,000 kg)',
    `Expected 10000 kg, got ${contract?.totalReceivedKg}`
  );
  assert(
    contract?.closingBalanceKg === 30000,
    'Closing balance calculated correctly (20,000 opening + 10,000 receipts = 30,000 kg)',
    `Expected 30000 kg closing, got ${contract?.closingBalanceKg}`
  );
  assert(
    sapcoResult.ledgerEntries.length >= 2,
    'Separate contract movement ledger populated with chronological movements'
  );

  // -----------------------------------------------------------------------
  // TEST SUMMARY
  // -----------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
