import { buildDocLinesDOM, clearDOM } from './dom-helper.js';

let initDocLines;

beforeAll(async () => {
  const mod = await import('../../../js/docs.js');
  initDocLines = mod.initDocLines;
});

beforeEach(() => {
  clearDOM();
  buildDocLinesDOM();
  global.APP.docLines = [];
  global.APP.docPriceMode = 'TTC';
});

describe('initDocLines — DOM initialization', () => {
  test('clears doc-lines container', () => {
    const container = document.getElementById('doc-lines');
    container.innerHTML = '<div>stale</div>';
    initDocLines();
    expect(container.children.length).toBe(0);
  });

  test('shows doc-lines-empty message', () => {
    const empty = document.getElementById('doc-lines-empty');
    empty.style.display = 'none';
    initDocLines();
    expect(empty.style.display).toBe('block');
  });

  test('clears form fields (except date)', () => {
    ['doc-remise', 'doc-acompte', 'doc-notes', 'doc-terms', 'doc-payment'].forEach(id => {
      const el = document.getElementById(id);
      el.value = 'something';
    });
    initDocLines();
    ['doc-remise', 'doc-acompte', 'doc-notes', 'doc-terms', 'doc-payment'].forEach(id => {
      expect(document.getElementById(id).value).toBe('');
    });
  });

  test('resets client field and hides ICE pill', () => {
    const clientEl = document.getElementById('doc-client');
    const pillEl = document.getElementById('client-ice-pill');
    clientEl.value = 'client-1';
    pillEl.style.display = 'block';
    initDocLines();
    expect(clientEl.value).toBe('');
    expect(pillEl.style.display).toBe('none');
  });

  test('sets doc-date to today', () => {
    initDocLines();
    expect(document.getElementById('doc-date').value).toBe('2026-05-12');
  });

  test('resets hidden doc-id', () => {
    document.getElementById('doc-id').value = 'doc_12345';
    initDocLines();
    expect(document.getElementById('doc-id').value).toBe('');
  });

  test('resets source metadata fields', () => {
    ['doc-source-ref', 'doc-source-id', 'doc-source-type', 'doc-origin-ref', 'doc-origin-type', 'doc-origin-status'].forEach(id => {
      document.getElementById(id).value = 'some-value';
    });
    initDocLines();
    ['doc-source-ref', 'doc-source-id', 'doc-source-type', 'doc-origin-ref', 'doc-origin-type', 'doc-origin-status'].forEach(id => {
      expect(document.getElementById(id).value).toBe('');
    });
  });

  test('sets up regen ref button click handler', () => {
    const btn = document.getElementById('btn-regen-ref');
    expect(btn.onclick).toBeNull();
    initDocLines();
    expect(typeof btn.onclick).toBe('function');
  });

  test('sets up ref input listener', () => {
    const refInput = document.getElementById('doc-ref');
    initDocLines();
    expect(typeof refInput._refInputHandler).toBe('function');
    const listenerCount = refInput.listeners ? refInput.listeners('input').length : -1;
    expect(typeof refInput._refInputHandler).toBe('function');
  });

  test('sets APP.docLines to empty array', () => {
    global.APP.docLines = [{ id: 'l1', name: 'A' }];
    initDocLines();
    expect(global.APP.docLines).toEqual([]);
  });
});
