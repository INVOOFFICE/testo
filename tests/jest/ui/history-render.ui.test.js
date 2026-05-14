import { buildDocLinesDOM, clearDOM } from './dom-helper.js';

let renderHistory;

beforeAll(async () => {
  const mod = await import('../../../js/docs/history-render.js');
  renderHistory = mod.renderHistory;
});

beforeEach(() => {
  clearDOM();
  buildDocLinesDOM();
  // Build minimal doc data
  global.DB.docs = [
    { id: 'd1', ref: 'F-2026-0001', type: 'F', status: 'Envoy\u00e9', date: '2026-05-01', clientName: 'Client A', ht: 100, ttc: 120, acompte: 0 },
    { id: 'd2', ref: 'F-2026-0002', type: 'F', status: 'Pay\u00e9', date: '2026-05-02', clientName: 'Client B', ht: 200, ttc: 240, acompte: 50 },
  ];
  global.APP.histPage = 1;
  global.APP.histPerPage = 20;
  global.APP._histMoreMenuBound = false;
  // Mock getHistFiltered to return all docs
});

describe('renderHistory — DOM rendering', () => {
  test('renders KPI totals', () => {
    renderHistory();
    expect(document.getElementById('hist-kpi-total').textContent).toBe('2');
    expect(document.getElementById('hist-kpi-paid').textContent).not.toBe('');
    expect(document.getElementById('hist-kpi-sent').textContent).not.toBe('');
    expect(document.getElementById('hist-kpi-draft').textContent).toBe('0');
  });

  test('renders table rows for each document', () => {
    renderHistory();
    const rows = document.querySelectorAll('#history-tbody tr');
    expect(rows.length).toBe(2);
  });

  test('first row shows document ref', () => {
    renderHistory();
    const firstRow = document.querySelector('#history-tbody tr:first-child');
    expect(firstRow.textContent).toContain('F-2026-0001');
  });

  test('shows client name in row', () => {
    renderHistory();
    const firstRow = document.querySelector('#history-tbody tr:first-child');
    expect(firstRow.textContent).toContain('Client A');
  });

  test('renders pagination when pages > 1', () => {
    global.APP.histPerPage = 1;
    renderHistory();
    const pagEl = document.getElementById('hist-pagination');
    expect(pagEl.children.length).toBeGreaterThan(1);
  });

  test('shows empty state when no docs', () => {
    global.DB.docs = [];
    renderHistory();
    const rows = document.querySelectorAll('#history-tbody tr');
    expect(rows.length).toBe(1);
    expect(document.getElementById('history-tbody').textContent).toContain('Aucun document');
  });

  test('sets aria-busy to false after render', () => {
    renderHistory();
    expect(document.getElementById('history-tbody').getAttribute('aria-busy')).toBe('false');
  });

  test('creates mobile card list', () => {
    renderHistory();
    const mobHist = document.getElementById('mob-history-list');
    expect(mobHist).not.toBeNull();
    expect(mobHist.className).toBe('mob-card-list');
  });

  test('mobile cards show ref and type', () => {
    renderHistory();
    const mobHist = document.getElementById('mob-history-list');
    expect(mobHist.textContent).toContain('F-2026-0001');
    expect(mobHist.textContent).toContain('Facture');
  });

  test('second page navigation works', () => {
    global.APP.histPerPage = 1;
    renderHistory();
    const pageBtns = document.querySelectorAll('#hist-pagination .pg-btn');
    expect(pageBtns.length).toBe(2);
    expect(pageBtns[0].classList.contains('active')).toBe(true);
    expect(pageBtns[1].classList.contains('active')).toBe(false);
  });

  test('shows quick status button for Envoy\u00e9 docs', () => {
    renderHistory();
    const quickBtn = document.querySelector('[data-action=\"hist-quick-status\"]');
    expect(quickBtn).not.toBeNull();
    expect(quickBtn.textContent).toContain('Pay\u00e9');
  });

  test('quick status buttons for Envoy\u00e9 doc (table + mobile)', () => {
    renderHistory();
    const allQuickBtns = document.querySelectorAll('[data-action="hist-quick-status"]');
    expect(allQuickBtns.length).toBeGreaterThanOrEqual(1);
  });

  test('action buttons render in table and mobile cards', () => {
    renderHistory();
    const editBtns = document.querySelectorAll('[data-action="hist-edit-doc"]');
    expect(editBtns.length).toBeGreaterThanOrEqual(2);
    const downloadBtns = document.querySelectorAll('[data-action="hist-download-doc"]');
    expect(downloadBtns.length).toBeGreaterThanOrEqual(2);
  });

  test('shows remaining amount for pending docs', () => {
    renderHistory();
    const tbody = document.getElementById('history-tbody');
    expect(tbody.textContent).toContain(String(120));
  });

  test('shows sold\u00e9 status for paid docs', () => {
    renderHistory();
    const tbody = document.getElementById('history-tbody');
    expect(tbody.textContent).toContain('Sold\u00e9');
  });
});
