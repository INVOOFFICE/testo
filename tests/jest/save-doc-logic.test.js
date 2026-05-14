import {
  computeTvaByRate,
  isDuplicateRef,
  shouldCreateAsNew,
  computeGetTotals,
  computeStockDeduction,
  computeStockRestoration,
} from '../../js/docs/doc-save.js';

function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

describe('computeTvaByRate', () => {
  test('single line, no discount, normal VAT', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[20].ht).toBe(100);
    expect(br[20].tva).toBe(20);
    expect(br[20].ttc).toBe(120);
  });

  test('single line with 10% discount', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 10, false);
    expect(near(br[20].ht, 90)).toBe(true);
    expect(near(br[20].tva, 18)).toBe(true);
    expect(near(br[20].ttc, 108)).toBe(true);
  });

  test('AE mode forces TVA to 0', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 0, true);
    expect(br[0].ht).toBe(100);
    expect(br[0].tva).toBe(0);
    expect(br[0].ttc).toBe(100);
  });

  test('AE mode with discount', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 10, true);
    expect(near(br[0].ht, 90)).toBe(true);
    expect(br[0].tva).toBe(0);
    expect(near(br[0].ttc, 90)).toBe(true);
  });

  test('multiple VAT rates', () => {
    const lines = [
      { qty: 1, price: 100, tva: 20 },
      { qty: 2, price: 50, tva: 10 },
    ];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[20].ht).toBe(100);
    expect(br[20].tva).toBe(20);
    expect(br[10].ht).toBe(100);
    expect(br[10].tva).toBe(10);
  });

  test('empty lines array', () => {
    const br = computeTvaByRate([], 0, false);
    expect(Object.keys(br).length).toBe(0);
  });

  test('null/undefined lines', () => {
    const br = computeTvaByRate(null, 0, false);
    expect(Object.keys(br).length).toBe(0);
    const br2 = computeTvaByRate(undefined, 0, false);
    expect(Object.keys(br2).length).toBe(0);
  });

  test('line with zero qty', () => {
    const lines = [{ qty: 0, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[20].ht).toBe(0);
    expect(br[20].tva).toBe(0);
    expect(br[20].ttc).toBe(0);
  });

  test('line with zero price', () => {
    const lines = [{ qty: 5, price: 0, tva: 20 }];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[20].ht).toBe(0);
    expect(br[20].tva).toBe(0);
    expect(br[20].ttc).toBe(0);
  });

  test('line with zero VAT rate', () => {
    const lines = [{ qty: 1, price: 100, tva: 0 }];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[0].ht).toBe(100);
    expect(br[0].tva).toBe(0);
    expect(br[0].ttc).toBe(100);
  });

  test('100% discount zeroes everything', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const br = computeTvaByRate(lines, 100, false);
    expect(near(br[20].ht, 0)).toBe(true);
    expect(near(br[20].tva, 0)).toBe(true);
    expect(near(br[20].ttc, 0)).toBe(true);
  });

  test('discount preserves ratio across rates', () => {
    const lines = [
      { qty: 1, price: 200, tva: 20 },
      { qty: 1, price: 100, tva: 10 },
    ];
    const br = computeTvaByRate(lines, 50, false);
    expect(near(br[20].ht, 100)).toBe(true);
    expect(near(br[20].tva, 20)).toBe(true);
    expect(near(br[10].ht, 50)).toBe(true);
    expect(near(br[10].tva, 5)).toBe(true);
  });

  test('line with missing tva defaults to 0 in normal mode', () => {
    const lines = [{ qty: 1, price: 100 }];
    const br = computeTvaByRate(lines, 0, false);
    expect(br[0].ht).toBe(100);
    expect(br[0].tva).toBe(0);
    expect(br[0].ttc).toBe(100);
  });
});

describe('isDuplicateRef', () => {
  const docs = [
    { id: 'd1', ref: 'F-2026-0001' },
    { id: 'd2', ref: 'F-2026-0002' },
    { id: 'd3', ref: 'F-2026-0003' },
  ];

  test('detects duplicate ref', () => {
    expect(isDuplicateRef('F-2026-0001', docs)).toBe(true);
  });

  test('non-duplicate ref returns false', () => {
    expect(isDuplicateRef('F-2026-9999', docs)).toBe(false);
  });

  test('excludes current doc id on edit', () => {
    expect(isDuplicateRef('F-2026-0001', docs, 'd1')).toBe(false);
    expect(isDuplicateRef('F-2026-0001', docs, 'd2')).toBe(true);
  });

  test('empty/whitespace ref returns false', () => {
    expect(isDuplicateRef('', docs)).toBe(false);
    expect(isDuplicateRef('   ', docs)).toBe(false);
    expect(isDuplicateRef(null, docs)).toBe(false);
    expect(isDuplicateRef(undefined, docs)).toBe(false);
  });

  test('trims whitespace from ref', () => {
    expect(isDuplicateRef('  F-2026-0001  ', docs)).toBe(true);
  });

  test('empty docs array', () => {
    expect(isDuplicateRef('F-2026-0001', [])).toBe(false);
  });

  test('ref comparison coerces to string', () => {
    const d = [{ id: 'd1', ref: '123' }];
    expect(isDuplicateRef(123, d)).toBe(true);
    expect(isDuplicateRef('123', d)).toBe(true);
  });
});

describe('shouldCreateAsNew', () => {
  test('null prevDoc returns true', () => {
    expect(shouldCreateAsNew(null, 'F')).toBe(true);
    expect(shouldCreateAsNew(null, 'D')).toBe(true);
    expect(shouldCreateAsNew(null, 'BL')).toBe(true);
    expect(shouldCreateAsNew(null, 'AV')).toBe(true);
  });

  test('editing existing doc returns false', () => {
    const prevDoc = { id: 'd1', type: 'F', status: 'Brouillon' };
    expect(shouldCreateAsNew(prevDoc, 'F')).toBe(false);
    expect(shouldCreateAsNew(prevDoc, 'D')).toBe(false);
  });

  test('cancelled invoice converted to AV returns true', () => {
    const prevDoc = { id: 'd1', type: 'F', status: 'Annulé' };
    expect(shouldCreateAsNew(prevDoc, 'AV')).toBe(true);
  });

  test('non-cancelled invoice to AV returns false', () => {
    const prevDoc = { id: 'd1', type: 'F', status: 'Brouillon' };
    expect(shouldCreateAsNew(prevDoc, 'AV')).toBe(false);
    const prevDoc2 = { id: 'd1', type: 'F', status: 'Envoyé' };
    expect(shouldCreateAsNew(prevDoc2, 'AV')).toBe(false);
  });

  test('cancelled BL to AV returns false (only F→AV)', () => {
    const prevDoc = { id: 'd1', type: 'BL', status: 'Annulé' };
    expect(shouldCreateAsNew(prevDoc, 'AV')).toBe(false);
  });

  test('cancelled invoice to non-AV returns false', () => {
    const prevDoc = { id: 'd1', type: 'F', status: 'Annulé' };
    expect(shouldCreateAsNew(prevDoc, 'F')).toBe(false);
    expect(shouldCreateAsNew(prevDoc, 'D')).toBe(false);
    expect(shouldCreateAsNew(prevDoc, 'BL')).toBe(false);
  });
});

describe('computeGetTotals', () => {
  test('basic calculation', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const t = computeGetTotals(lines, 0, false);
    expect(t.ht).toBe(100);
    expect(t.tva).toBe(20);
    expect(t.ttc).toBe(120);
    expect(t.remise).toBe(0);
  });

  test('with discount', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const t = computeGetTotals(lines, 10, false);
    expect(near(t.ht, 90)).toBe(true);
    expect(near(t.tva, 18)).toBe(true);
    expect(near(t.ttc, 108)).toBe(true);
    expect(near(t.remise, 10)).toBe(true);
  });

  test('AE mode', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const t = computeGetTotals(lines, 0, true);
    expect(t.ht).toBe(100);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(100);
  });

  test('AE mode with discount', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const t = computeGetTotals(lines, 10, true);
    expect(near(t.ht, 90)).toBe(true);
    expect(t.tva).toBe(0);
    expect(near(t.ttc, 90)).toBe(true);
    expect(near(t.remise, 10)).toBe(true);
  });

  test('multiple lines', () => {
    const lines = [
      { qty: 2, price: 50, tva: 20 },
      { qty: 3, price: 30, tva: 10 },
    ];
    const t = computeGetTotals(lines, 0, false);
    expect(t.ht).toBe(190);
    expect(near(t.tva, 29)).toBe(true);
    expect(near(t.ttc, 219)).toBe(true);
  });

  test('empty lines', () => {
    const t = computeGetTotals([], 0, false);
    expect(t.ht).toBe(0);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(0);
    expect(t.remise).toBe(0);
  });

  test('100% discount', () => {
    const lines = [{ qty: 1, price: 100, tva: 20 }];
    const t = computeGetTotals(lines, 100, false);
    expect(t.ht).toBe(0);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(0);
    expect(near(t.remise, 100)).toBe(true);
  });

  test('null lines', () => {
    const t = computeGetTotals(null, 0, false);
    expect(t.ht).toBe(0);
    expect(t.tva).toBe(0);
  });
});

describe('computeStockDeduction', () => {
  const stockItems = [
    { id: 's1', name: 'Article A', qty: 10 },
    { id: 's2', name: 'Article B', qty: 5 },
    { id: 's3', name: 'Article C', qty: 2 },
  ];

  test('full deduction from sufficient stock', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3 }];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.deductedCount).toBe(1);
    expect(r.updatedStock[0].qty).toBe(7);
    expect(r.updatedLines[0].stockDeductedQty).toBe(3);
  });

  test('partial deduction when stock insufficient', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 20 }];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.updatedStock[0].qty).toBe(0);
    expect(r.updatedLines[0].stockDeductedQty).toBe(10);
  });

  test('deduction from zero stock', () => {
    const lines = [{ id: 'l1', fromStock: 's2', qty: 10 }];
    const r = computeStockDeduction(lines, [{ id: 's2', name: 'Empty', qty: 0 }], true);
    expect(r.updatedStock[0].qty).toBe(0);
    expect(r.updatedLines[0].stockDeductedQty).toBe(0);
    expect(r.deductedCount).toBe(0);
  });

  test('low stock warning (< 5 remaining)', () => {
    const lines = [{ id: 'l1', fromStock: 's3', qty: 1 }];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('Article C');
    expect(r.warnings[0]).toContain('1');
  });

  test('no warning when stock sufficient after deduction', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 1 }];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.warnings.length).toBe(0);
  });

  test('multiple lines with stock deduction', () => {
    const lines = [
      { id: 'l1', fromStock: 's1', qty: 3 },
      { id: 'l2', fromStock: 's2', qty: 2 },
      { id: 'l3', fromStock: null, qty: 1 },
    ];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.deductedCount).toBe(2);
    expect(r.updatedStock[0].qty).toBe(7);
    expect(r.updatedStock[1].qty).toBe(3);
  });

  test('willDeduct=false clears stockDeductedQty', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3 }];
    const r = computeStockDeduction(lines, stockItems, false);
    expect(r.deductedCount).toBe(0);
    expect(r.updatedStock[0].qty).toBe(10);
    expect(r.updatedLines[0].stockDeductedQty).toBe(0);
  });

  test('line with fromStock but stock item not found', () => {
    const lines = [{ id: 'l1', fromStock: 'nonexistent', qty: 3 }];
    const r = computeStockDeduction(lines, stockItems, true);
    expect(r.deductedCount).toBe(0);
    expect(r.warnings.length).toBe(0);
  });

  test('null lines', () => {
    const r = computeStockDeduction(null, stockItems, true);
    expect(r.deductedCount).toBe(0);
    expect(r.updatedLines).toEqual([]);
  });

  test('immutability: original stock unchanged', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3 }];
    const originalStock = stockItems.map(s => ({ ...s }));
    computeStockDeduction(lines, stockItems, true);
    expect(stockItems[0].qty).toBe(originalStock[0].qty);
  });
});

describe('computeStockRestoration', () => {
  test('full restoration with stockDeductedQty', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }];
    const stock = [{ id: 's1', name: 'A', qty: 7 }];
    const r = computeStockRestoration(lines, stock, true);
    expect(r.restoredCount).toBe(1);
    expect(r.updatedStock[0].qty).toBe(10);
  });

  test('restoration without stockDeductedQty falls back to qty', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3 }];
    const stock = [{ id: 's1', name: 'A', qty: 7 }];
    const r = computeStockRestoration(lines, stock, true);
    expect(r.restoredCount).toBe(1);
    expect(r.updatedStock[0].qty).toBe(10);
  });

  test('wasDeducted=false skips restoration', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }];
    const stock = [{ id: 's1', name: 'A', qty: 7 }];
    const r = computeStockRestoration(lines, stock, false);
    expect(r.restoredCount).toBe(0);
    expect(r.updatedStock[0].qty).toBe(7);
  });

  test('multiple stock lines restoration', () => {
    const lines = [
      { id: 'l1', fromStock: 's1', qty: 2, stockDeductedQty: 2 },
      { id: 'l2', fromStock: 's2', qty: 5, stockDeductedQty: 5 },
    ];
    const stock = [
      { id: 's1', name: 'A', qty: 3 },
      { id: 's2', name: 'B', qty: 0 },
    ];
    const r = computeStockRestoration(lines, stock, true);
    expect(r.restoredCount).toBe(2);
    expect(r.updatedStock[0].qty).toBe(5);
    expect(r.updatedStock[1].qty).toBe(5);
  });

  test('line with fromStock but no matching stock item', () => {
    const lines = [{ id: 'l1', fromStock: 'unknown', qty: 3, stockDeductedQty: 3 }];
    const stock = [{ id: 's1', name: 'A', qty: 7 }];
    const r = computeStockRestoration(lines, stock, true);
    expect(r.restoredCount).toBe(0);
  });

  test('null/empty lines', () => {
    const stock = [{ id: 's1', name: 'A', qty: 7 }];
    const r1 = computeStockRestoration(null, stock, true);
    expect(r1.restoredCount).toBe(0);
    const r2 = computeStockRestoration([], stock, true);
    expect(r2.restoredCount).toBe(0);
  });

  test('immutability: original stock unchanged', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }];
    const origStock = [{ id: 's1', name: 'A', qty: 7 }];
    computeStockRestoration(lines, origStock, true);
    expect(origStock[0].qty).toBe(7);
  });
});

describe('business scenario: full document lifecycle', () => {
  test('create invoice → deduct stock → cancel → restore stock', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3, price: 50, tva: 20 }];
    const stock = [{ id: 's1', name: 'Widget', qty: 10 }];

    const deduction = computeStockDeduction(lines, stock, true);
    expect(deduction.updatedStock[0].qty).toBe(7);

    const restoration = computeStockRestoration(lines, deduction.updatedStock, true);
    expect(restoration.updatedStock[0].qty).toBe(10);
  });

  test('edit invoice: restore then re-deduct with new quantity', () => {
    const prevLines = [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }];
    const newLines = [{ id: 'l1', fromStock: 's1', qty: 5 }];
    const stock = [{ id: 's1', name: 'Widget', qty: 7 }];

    const restored = computeStockRestoration(prevLines, stock, true);
    expect(restored.updatedStock[0].qty).toBe(10);

    const reDeduct = computeStockDeduction(newLines, restored.updatedStock, true);
    expect(reDeduct.updatedStock[0].qty).toBe(5);
    expect(reDeduct.updatedLines[0].stockDeductedQty).toBe(5);
  });

  test('devis (quote) never deducts stock', () => {
    const lines = [{ id: 'l1', fromStock: 's1', qty: 3 }];
    const stock = [{ id: 's1', name: 'Widget', qty: 10 }];
    const r = computeStockDeduction(lines, stock, false);
    expect(r.updatedStock[0].qty).toBe(10);
    expect(r.updatedLines[0].stockDeductedQty).toBe(0);
  });
});
