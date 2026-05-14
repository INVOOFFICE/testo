import { buildDocLinesDOM, clearDOM, addEl } from './dom-helper.js';

let readDocFormData;

beforeAll(async () => {
  const mod = await import('../../../js/docs.js');
  readDocFormData = mod.readDocFormData;
});

beforeEach(() => {
  clearDOM();
  buildDocLinesDOM();
  global.APP.docLines = [];
  global.DB.docs = [];
});

describe('readDocFormData', () => {
  test('reads all form fields with default values', () => {
    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = 'c1';
    document.getElementById('doc-terms').value = '30 jours';
    document.getElementById('doc-payment').value = 'virement';
    document.getElementById('doc-notes').value = 'note test';
    document.getElementById('doc-remise').value = '10';
    document.getElementById('doc-acompte').value = '50';
    document.getElementById('doc-id').value = 'doc_123';
    document.getElementById('doc-ref').value = 'F-2026-0001';
    document.getElementById('doc-source-ref').value = 'SRC-001';
    document.getElementById('doc-source-id').value = 'src_1';
    document.getElementById('doc-source-type').value = 'D';

    const d = readDocFormData();
    expect(d.type).toBe('F');
    expect(d.status).toBe('Brouillon');
    expect(d.date).toBe('2026-05-12');
    expect(d.clientId).toBe('c1');
    expect(d.terms).toBe('30 jours');
    expect(d.payment).toBe('virement');
    expect(d.notes).toBe('note test');
    expect(d.remise).toBe(10);
    expect(d.acompte).toBe(50);
    expect(d.editingId).toBe('doc_123');
    expect(d.ref).toBe('F-2026-0001');
    expect(d.sourceRef).toBe('SRC-001');
    expect(d.sourceId).toBe('src_1');
    expect(d.sourceType).toBe('D');
  });

  test('returns empty strings for missing optional fields', () => {
    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = '';
    document.getElementById('doc-ref').value = 'F-0001';

    const d = readDocFormData();
    expect(d.editingId).toBe('');
    expect(d.sourceRef).toBe('');
    expect(d.sourceId).toBe('');
    expect(d.sourceType).toBe('');
  });

  test('parses numeric fields, defaulting to 0', () => {
    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = '';
    document.getElementById('doc-ref').value = 'F-0001';
    document.getElementById('doc-remise').value = '';
    document.getElementById('doc-acompte').value = 'abc';

    const d = readDocFormData();
    expect(d.remise).toBe(0);
    expect(d.acompte).toBe(0);
  });

  test('trims ref whitespace', () => {
    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = '';
    document.getElementById('doc-ref').value = '  F-2026-0001  ';

    const d = readDocFormData();
    expect(d.ref).toBe('F-2026-0001');
  });

  test('handles missing doc-id element gracefully', () => {
    const docId = document.getElementById('doc-id');
    docId.parentNode.removeChild(docId);

    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = '';
    document.getElementById('doc-ref').value = 'F-0001';

    const d = readDocFormData();
    expect(d.editingId).toBe('');
  });

  test('reads source link fields from prevDoc', () => {
    document.getElementById('doc-type').value = 'F';
    document.getElementById('doc-status').value = 'Brouillon';
    document.getElementById('doc-date').value = '2026-05-12';
    document.getElementById('doc-client').value = '';
    document.getElementById('doc-ref').value = 'F-0001';
    document.getElementById('doc-source-ref').value = '  SRC-001  ';

    const d = readDocFormData();
    expect(d.sourceRef).toBe('SRC-001');
  });
});
