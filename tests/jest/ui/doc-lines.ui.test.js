import { buildDocLinesDOM, clearDOM } from './dom-helper.js';
import {
  renderDocLines,
  addLine,
  removeLine,
  refreshDocPriceModeLabels,
  syncDocPriceModeFromSelect,
  initDocPriceModeForNewDoc,
  loadDocPriceModeFromSaved,
  onDocPriceModeChange,
  updateLineTotal,
  updLine,
} from '../../../js/docs/doc-lines.js';

beforeEach(() => {
  clearDOM();
  buildDocLinesDOM();
  global.APP.docLines = [];
  global.APP.docPriceMode = 'TTC';
});

describe('doc-lines — DOM rendering', () => {
  test('renderDocLines: empty state shows empty message', () => {
    renderDocLines();
    const empty = document.getElementById('doc-lines-empty');
    expect(empty.style.display).toBe('block');
    const lines = document.getElementById('doc-lines');
    expect(lines.children.length).toBe(0);
  });

  test('renderDocLines: renders lines from APP.docLines', () => {
    global.APP.docLines = [
      { id: 'l1', name: 'Article 1', qty: 2, price: 50, tva: 20, fromStock: null },
    ];
    renderDocLines();
    const row = document.getElementById('line-l1');
    expect(row).not.toBeNull();
    expect(row.className).toBe('inv-line');
    expect(row.dataset.lid).toBe('l1');
    const nameInput = row.querySelector('input[data-line-field=\"name\"]');
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Article 1');
    const empty = document.getElementById('doc-lines-empty');
    expect(empty.style.display).toBe('none');
  });

  test('renderDocLines: multiple lines', () => {
    global.APP.docLines = [
      { id: 'l1', name: 'A', qty: 1, price: 10, tva: 20, fromStock: null },
      { id: 'l2', name: 'B', qty: 2, price: 20, tva: 10, fromStock: null },
    ];
    renderDocLines();
    expect(document.getElementById('line-l1')).not.toBeNull();
    expect(document.getElementById('line-l2')).not.toBeNull();
  });

  test('renderDocLines: remove stale rows', () => {
    const stale = document.createElement('div');
    stale.className = 'inv-line';
    stale.dataset.lid = 'stale';
    stale.id = 'line-stale';
    document.getElementById('doc-lines').appendChild(stale);
    global.APP.docLines = [
      { id: 'l1', name: 'A', qty: 1, price: 10, tva: 20, fromStock: null },
    ];
    renderDocLines();
    expect(document.getElementById('line-stale')).toBeNull();
    expect(document.getElementById('line-l1')).not.toBeNull();
  });
});

describe('doc-lines — addLine / removeLine', () => {
  test('addLine: creates line and updates DOM', () => {
    global.DB.settings.tva = '20';
    addLine();
    expect(global.APP.docLines.length).toBe(1);
    const line = global.APP.docLines[0];
    expect(line.name).toBe('');
    expect(line.qty).toBe(1);
    expect(line.price).toBe(0);
    expect(line.tva).toBe(20);
    expect(document.getElementById('line-' + line.id)).not.toBeNull();
  });

  test('addLine: with article sets fromStock', () => {
    global.DB.stock = [{ id: 's1', name: 'Stock A', tva: 10, sell: 120 }];
    global.DB.settings.tva = '20';
    addLine({ id: 's1', name: 'Stock A', tva: 10, sell: 120 });
    const line = global.APP.docLines[0];
    expect(line.fromStock).toBe('s1');
    expect(line.name).toBe('Stock A');
    expect(line.tva).toBe(10);
  });

  test('removeLine: removes line from APP and DOM', () => {
    global.DB.settings.tva = '20';
    addLine();
    addLine();
    expect(global.APP.docLines.length).toBe(2);
    const id = global.APP.docLines[0].id;
    removeLine(id);
    expect(global.APP.docLines.length).toBe(1);
    expect(document.getElementById('line-' + id)).toBeNull();
  });
});

describe('doc-lines — price mode', () => {
  test('refreshDocPriceModeLabels: TTC mode', () => {
    global.__mockPriceMode = 'TTC';
    refreshDocPriceModeLabels();
    const head = document.getElementById('doc-inv-head-price');
    expect(head.textContent).toBe('Prix U (TTC)');
  });

  test('syncDocPriceModeFromSelect: reads select', () => {
    const sel = document.getElementById('doc-price-mode');
    sel.value = 'HT';
    syncDocPriceModeFromSelect();
    expect(global.APP.docPriceMode).toBe('HT');
  });

  test('initDocPriceModeForNewDoc: sets from global mode', () => {
    global.APP.docPriceMode = undefined;
    initDocPriceModeForNewDoc();
    expect(global.APP.docPriceMode).toBe('TTC');
    const sel = document.getElementById('doc-price-mode');
    expect(sel.value).toBe('TTC');
  });

  test('loadDocPriceModeFromSaved: restores saved price mode', () => {
    const doc = { priceMode: 'HT' };
    loadDocPriceModeFromSaved(doc);
    expect(global.APP.docPriceMode).toBe('HT');
  });

  test('loadDocPriceModeFromSaved: falls back to global', () => {
    const doc = {};
    loadDocPriceModeFromSaved(doc);
    expect(global.APP.docPriceMode).toBe('TTC');
  });
});

describe('doc-lines — line update', () => {
  test('updateLineTotal: sets HT and TTC elements', () => {
    const line = { id: 'test-line', qty: 3, price: 40, tva: 20 };
    const row = document.createElement('div');
    row.id = 'line-' + line.id;
    row.innerHTML = '<div id=\"line-total-test-line\"></div><div id=\"line-total-ttc-test-line\"></div>';
    document.getElementById('doc-lines').appendChild(row);
    updateLineTotal(line);
    expect(document.getElementById('line-total-test-line').textContent).toBe('120.00');
    expect(document.getElementById('line-total-ttc-test-line').textContent).toBe('144.00');
  });

  test('updLine: updates qty field', () => {
    const line = { id: 'l1', name: 'A', qty: 1, price: 100, tva: 20, fromStock: null };
    global.APP.docLines = [line];
    updLine('l1', 'qty', '5');
    expect(line.qty).toBe(5);
  });

  test('updLine: updates price via applyUserUnitPriceInput', () => {
    const line = { id: 'l1', name: 'A', qty: 1, price: 0, tva: 20, fromStock: null };
    global.APP.docLines = [line];
    updLine('l1', 'price', '120');
    expect(line.price).toBeCloseTo(100, 10);
  });

  test('updLine: unknown field sets directly', () => {
    const line = { id: 'l1', name: 'A', qty: 1, price: 100, tva: 20, fromStock: null };
    global.APP.docLines = [line];
    updLine('l1', 'name', 'New Name');
    expect(line.name).toBe('New Name');
  });
});

describe('doc-lines — onDocPriceModeChange', () => {
  test('syncs select, refreshes labels, updates inputs', () => {
    const sel = document.getElementById('doc-price-mode');
    sel.value = 'HT';
    global.APP.docLines = [
      { id: 'l1', name: 'A', qty: 1, price: 100, tva: 20, fromStock: null },
    ];
    // create a line row with price input
    const row = document.createElement('div');
    row.id = 'line-l1';
    row.innerHTML = '<input data-line-field=\"price\" value=\"100\">';
    document.getElementById('doc-lines').appendChild(row);
    onDocPriceModeChange();
    expect(global.APP.docPriceMode).toBe('HT');
  });
});
