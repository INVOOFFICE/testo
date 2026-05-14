beforeEach(() => {
  global.DB = {
    settings: { tva: '20', ice: '123456789012345' },
    clients: [],
    stock: [],
    docs: [],
    fournisseurs: [],
    bonsCommande: [],
    stockMoves: [],
  };
  global.APP = { docLines: [], histPage: 1, histPerPage: 20, docPriceMode: 'TTC' };
  global.toast = jest.fn();
  global.save = jest.fn();
  global.buildNotifications = jest.fn();
  global.renderHistory = jest.fn();
});

let quickChangeStatus, cancelDoc, deleteDoc, duplicateDoc;

beforeAll(async () => {
  const mod = await import('../../../js/docs/doc-crud.js');
  quickChangeStatus = mod.quickChangeStatus;
  cancelDoc = mod.cancelDoc;
  deleteDoc = mod.deleteDoc;
  duplicateDoc = mod.duplicateDoc;
});

function makeDoc(overrides = {}) {
  return {
    id: 'd1',
    ref: 'F-2026-0001',
    type: 'F',
    status: 'Brouillon',
    date: '2026-05-12',
    clientId: 'c1',
    clientName: 'Client A',
    lines: [],
    ht: 0,
    tva: 0,
    ttc: 0,
    remise: 0,
    acompte: 0,
    stockDeducted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('quickChangeStatus', () => {
  test('Brouillon → Envoyé', () => {
    const doc = makeDoc({ status: 'Brouillon' });
    global.DB.docs = [doc];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Envoyé');
    expect(global.save).toHaveBeenCalledWith('docs');
    expect(global.buildNotifications).toHaveBeenCalled();
    expect(global.toast).toHaveBeenCalledWith(expect.stringContaining('Envoyé'), 'suc');
  });

  test('Envoyé → Payé', () => {
    const doc = makeDoc({ status: 'Envoyé' });
    global.DB.docs = [doc];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Payé');
  });

  test('Payé — no transition', () => {
    const doc = makeDoc({ status: 'Payé' });
    global.DB.docs = [doc];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Payé');
  });

  test('Annulé — no transition', () => {
    const doc = makeDoc({ status: 'Annulé' });
    global.DB.docs = [doc];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Annulé');
  });

  test('deducts stock when going to Envoyé for F type', () => {
    const doc = makeDoc({
      status: 'Brouillon',
      type: 'F',
      lines: [{ id: 'l1', fromStock: 's1', qty: 3 }],
    });
    global.DB.docs = [doc];
    global.DB.stock = [{ id: 's1', name: 'Widget', qty: 10 }];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Envoyé');
    expect(doc.stockDeducted).toBe(true);
    expect(global.DB.stock[0].qty).toBe(7);
    expect(global.save).toHaveBeenCalledWith('stock');
  });

  test('does NOT deduct for D (devis) type', () => {
    const doc = makeDoc({
      status: 'Brouillon',
      type: 'D',
      lines: [{ id: 'l1', fromStock: 's1', qty: 3 }],
    });
    global.DB.docs = [doc];
    global.DB.stock = [{ id: 's1', name: 'Widget', qty: 10 }];
    quickChangeStatus('d1');
    expect(doc.status).toBe('Envoyé');
    expect(global.DB.stock[0].qty).toBe(10);
  });

  test('no-op for nonexistent doc', () => {
    quickChangeStatus('nonexistent');
    expect(global.toast).not.toHaveBeenCalled();
  });

  test('low stock warning when <5 remaining', () => {
    const doc = makeDoc({
      status: 'Brouillon',
      type: 'F',
      lines: [{ id: 'l1', fromStock: 's1', qty: 8 }],
    });
    global.DB.docs = [doc];
    global.DB.stock = [{ id: 's1', name: 'LowItem', qty: 10 }];
    const spy = jest.spyOn(global, 'setTimeout');
    quickChangeStatus('d1');
    expect(global.DB.stock[0].qty).toBe(2);
  });
});

describe('duplicateDoc', () => {
  test('creates a copy with new ref and Brouillon status', () => {
    const doc = makeDoc({
      lines: [{ id: 'l1', name: 'Art', qty: 1, price: 100, tva: 20 }],
    });
    global.DB.docs = [doc];
    duplicateDoc('d1');
    expect(global.DB.docs.length).toBe(2);
    const copy = global.DB.docs[0];
    expect(copy.status).toBe('Brouillon');
    expect(copy.stockDeducted).toBe(false);
    expect(copy.id).not.toBe(doc.id);
    expect(copy.lines[0].id).not.toBe(doc.lines[0].id);
    expect(global.save).toHaveBeenCalledWith('docs');
    expect(global.toast).toHaveBeenCalledWith(expect.stringContaining('dupliqué'), 'suc');
  });

  test('no-op for nonexistent doc', () => {
    duplicateDoc('nonexistent');
    expect(global.save).not.toHaveBeenCalled();
  });
});

describe('cancelDoc', () => {
  test('cancels doc and restores stock', async () => {
    global.showConfirm = jest.fn().mockResolvedValue(true);
    const doc = makeDoc({
      status: 'Envoyé',
      stockDeducted: true,
      lines: [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }],
    });
    global.DB.docs = [doc];
    global.DB.stock = [{ id: 's1', name: 'Widget', qty: 7 }];
    await cancelDoc('d1');
    expect(doc.status).toBe('Annulé');
    expect(doc.stockDeducted).toBe(false);
    expect(global.DB.stock[0].qty).toBe(10);
    expect(global.save).toHaveBeenCalledWith('stock');
    expect(global.save).toHaveBeenCalledWith('docs');
  });

  test('does nothing if user cancels confirmation', async () => {
    global.showConfirm = jest.fn().mockResolvedValue(false);
    const doc = makeDoc({ status: 'Envoyé' });
    global.DB.docs = [doc];
    await cancelDoc('d1');
    expect(doc.status).toBe('Envoyé');
  });

  test('no-op for nonexistent doc', async () => {
    await cancelDoc('nonexistent');
    expect(global.toast).not.toHaveBeenCalled();
  });
});

describe('deleteDoc', () => {
  test('F type cancels (soft delete) with confirmation', async () => {
    global.showConfirm = jest.fn().mockResolvedValue(true);
    const doc = makeDoc({
      type: 'F',
      status: 'Envoyé',
      stockDeducted: true,
      lines: [{ id: 'l1', fromStock: 's1', qty: 3, stockDeductedQty: 3 }],
    });
    global.DB.docs = [doc];
    global.DB.stock = [{ id: 's1', name: 'Widget', qty: 7 }];
    await deleteDoc('d1');
    expect(doc.status).toBe('Annulé');
    expect(doc.stockDeducted).toBe(false);
    expect(global.DB.stock[0].qty).toBe(10);
  });

  test('D type hard deletes with confirmation', async () => {
    global.showConfirm = jest.fn().mockResolvedValue(true);
    const doc = makeDoc({ type: 'D', status: 'Brouillon' });
    global.DB.docs = [doc];
    await deleteDoc('d1');
    expect(global.DB.docs.length).toBe(0);
    expect(global.toast).toHaveBeenCalledWith('Document supprimé', 'suc');
  });

  test('already cancelled F returns early', async () => {
    global.showConfirm = jest.fn().mockResolvedValue(true);
    const doc = makeDoc({ type: 'F', status: 'Annulé' });
    global.DB.docs = [doc];
    await deleteDoc('d1');
    expect(global.DB.docs.length).toBe(1);
    expect(global.toast).toHaveBeenCalledWith(
      'Document déjà annulé — données conservées',
      'suc',
    );
  });
});
