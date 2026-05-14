/**
 * Pure business logic for document save operations.
 * No DOM access — all functions are deterministic and testable.
 */

/**
 * @typedef {import('./context.js').DocLine} DocLine
 * @typedef {import('./context.js').Doc} Doc
 * @typedef {import('./context.js').DocType} DocType
 * @typedef {import('./context.js').DocStatus} DocStatus
 * @typedef {import('./context.js').StockItem} StockItem
 */

/**
 * Compute TVA breakdown by rate from document lines.
 * @param {DocLine[]} lines
 * @param {number} remisePct - Discount percentage
 * @param {boolean} ae - Auto-entrepreneur mode (TVA forced to 0)
 * @returns {Object.<string, {ht: number, tva: number, ttc: number}>}
 */
export function computeTvaByRate(lines, remisePct, ae) {
  const byRate = {};
  for (const l of lines || []) {
    const r = ae ? 0 : l.tva || 0;
    const lht = l.qty * l.price;
    if (!byRate[r]) byRate[r] = { ht: 0, tva: 0, ttc: 0 };
    byRate[r].ht += lht;
    byRate[r].tva += ae ? 0 : lht * (r / 100);
    byRate[r].ttc += ae ? lht : lht * (1 + r / 100);
  }
  if (remisePct > 0) {
    const factor = 1 - remisePct / 100;
    for (const k of Object.keys(byRate)) {
      byRate[k].ht *= factor;
      byRate[k].tva *= factor;
      byRate[k].ttc *= factor;
    }
  }
  return byRate;
}

/**
 * Check if a reference is a duplicate among existing docs.
 * @param {string} ref
 * @param {Doc[]} docs
 * @param {string} [excludeId]
 * @returns {boolean}
 */
export function isDuplicateRef(ref, docs, excludeId = '') {
  const r = String(ref || '').trim();
  if (!r) return false;
  return docs.some(d => d.ref === r && d.id !== excludeId);
}

/**
 * Determine if a save should create a new document record.
 * Returns true for new documents or when converting a cancelled invoice to a credit note.
 * @param {Doc|null} prevDoc
 * @param {DocType} newType
 * @returns {boolean}
 */
export function shouldCreateAsNew(prevDoc, newType) {
  if (!prevDoc) return true;
  const isAvoirFromCancelledFacture = !!(
    prevDoc &&
    prevDoc.type === 'F' &&
    prevDoc.status === 'Annul\u00e9' &&
    newType === 'AV'
  );
  return isAvoirFromCancelledFacture;
}

/**
 * Compute totals (getTotals-style) from lines.
 * @param {DocLine[]} lines
 * @param {number} remisePct
 * @param {boolean} ae
 * @returns {{ht: number, tva: number, ttc: number, remise: number}}
 */
export function computeGetTotals(lines, remisePct, ae) {
  let ht = 0, tva = 0;
  for (const l of lines || []) {
    const lht = l.qty * l.price;
    ht += lht;
    if (!ae) tva += lht * ((l.tva || 0) / 100);
  }
  const remiseAmt = ht * (remisePct / 100);
  ht -= remiseAmt;
  if (!ae) tva *= 1 - remisePct / 100;
  const ttc = ae ? ht : ht + tva;
  return { ht, tva, ttc, remise: remiseAmt };
}

/**
 * Compute stock deduction for lines with stock tracking.
 * @param {DocLine[]} lines
 * @param {StockItem[]} stock
 * @param {boolean} willDeduct
 * @returns {{warnings: string[], deductedCount: number, updatedStock: StockItem[], updatedLines: DocLine[]}}
 */
export function computeStockDeduction(lines, stock, willDeduct) {
  const warnings = [];
  let deductedCount = 0;
  const updatedStock = stock.map(s => ({ ...s }));
  const updatedLines = (lines || []).map(l => ({ ...l }));

  if (willDeduct) {
    for (const l of updatedLines) {
      if (!l.fromStock) continue;
      const a = updatedStock.find(x => x.id === l.fromStock);
      if (!a) continue;
      const currentQty = a.qty || 0;
      const needQty = l.qty || 0;
      const deductedQty = Math.min(currentQty, needQty);
      a.qty = Math.max(0, currentQty - deductedQty);
      l.stockDeductedQty = deductedQty;
      if (deductedQty > 0) {
        deductedCount++;
        if (a.qty < 5) warnings.push(`${a.name}: ${a.qty} restant(s)`);
      }
    }
  } else {
    for (const l of updatedLines) {
      if (l.fromStock) l.stockDeductedQty = 0;
    }
  }

  return { warnings, deductedCount, updatedStock, updatedLines };
}

/**
 * Compute stock restoration (undo deduction).
 * @param {DocLine[]} lines
 * @param {StockItem[]} stock
 * @param {boolean} wasDeducted
 * @returns {{restoredCount: number, updatedStock: StockItem[]}}
 */
export function computeStockRestoration(lines, stock, wasDeducted) {
  let restoredCount = 0;
  const updatedStock = stock.map(s => ({ ...s }));

  if (wasDeducted) {
    for (const l of lines || []) {
      if (!l.fromStock) continue;
      const a = updatedStock.find(x => x.id === l.fromStock);
      if (!a) continue;
      const restoreQty = typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
      a.qty = (a.qty || 0) + restoreQty;
      restoredCount++;
    }
  }

  return { restoredCount, updatedStock };
}
