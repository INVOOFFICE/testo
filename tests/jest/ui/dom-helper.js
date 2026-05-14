/**
 * Helper to build DOM structures needed by doc UI tests.
 */

function addEl(parent, tag, id, attrs) {
  const el = document.createElement(tag);
  if (id) el.id = id;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => { el[k] = v; });
  if (parent) parent.appendChild(el);
  return el;
}

function buildDocLinesDOM() {
  const container = addEl(document.body, 'div', 'doc-lines');
  addEl(document.body, 'div', 'doc-lines-empty', { style: { display: 'block' } });
  const priceSelect = addEl(document.body, 'select', 'doc-price-mode');
  ['TTC', 'HT'].forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    priceSelect.appendChild(opt);
  });
  priceSelect.value = 'TTC';
  addEl(document.body, 'span', 'doc-inv-head-price');
  addEl(document.body, 'div', 'modal-stock-picker');
  // Totals elements needed by calcTotals
  addEl(document.body, 'span', 'sum-ht');
  addEl(document.body, 'span', 'sum-tva');
  addEl(document.body, 'span', 'sum-ttc');
  const resteBlock = addEl(document.body, 'div', 'sum-reste-block');
  addEl(resteBlock, 'span', 'sum-reste-label');
  addEl(resteBlock, 'span', 'sum-reste');
  addEl(document.body, 'div', 'sum-arrete');
  addEl(document.body, 'span', 'sum-arrete-text');
  addEl(document.body, 'div', 'tva-by-rate-wrap');
  addEl(document.body, 'tbody', 'tva-by-rate-body');
  addEl(document.body, 'tfoot', 'tva-by-rate-foot');
  addEl(document.body, 'div', 'doc-ae-vat-banner');
  addEl(document.body, 'div', 'doc-articles-card');
  addEl(document.body, 'div', 'sum-financial-totals-row');
  addEl(document.body, 'span', 'sum-ttc-label');
  addEl(document.body, 'div', 'sum-ht-wrap');
  addEl(document.body, 'div', 'sum-tva-wrap');
  // Form fields for initDocLines
  addEl(document.body, 'input', 'doc-date');
  addEl(document.body, 'input', 'doc-remise');
  addEl(document.body, 'input', 'doc-acompte');
  addEl(document.body, 'textarea', 'doc-notes');
  addEl(document.body, 'input', 'doc-terms');
  addEl(document.body, 'input', 'doc-payment');
  addEl(document.body, 'input', 'doc-client');
  addEl(document.body, 'span', 'client-ice-pill', { style: { display: 'none' } });
  addEl(document.body, 'input', 'doc-id');
  addEl(document.body, 'input', 'doc-source-ref');
  addEl(document.body, 'input', 'doc-source-id');
  addEl(document.body, 'input', 'doc-source-type');
  addEl(document.body, 'input', 'doc-origin-ref');
  addEl(document.body, 'input', 'doc-origin-type');
  addEl(document.body, 'input', 'doc-origin-status');
  addEl(document.body, 'input', 'doc-ref');
  addEl(document.body, 'button', 'btn-regen-ref');
  // Doc type/status selects
  const typeSelect = addEl(document.body, 'select', 'doc-type');
  ['F', 'D', 'BL', 'AV'].forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    typeSelect.appendChild(o);
  });
  typeSelect.value = 'F';
  const statusSelect = addEl(document.body, 'select', 'doc-status');
  ['Brouillon', 'Envoyé', 'Payé', 'Annulé'].forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    statusSelect.appendChild(o);
  });
  statusSelect.value = 'Brouillon';
  addEl(document.body, 'div', 'doc-feedback');
  // History elements
  addEl(document.body, 'div', 'hist-feedback');
  addEl(document.body, 'span', 'hist-kpi-total');
  addEl(document.body, 'span', 'hist-kpi-paid');
  addEl(document.body, 'span', 'hist-kpi-sent');
  addEl(document.body, 'span', 'hist-kpi-draft');
  addEl(document.body, 'tbody', 'history-tbody');
  addEl(document.body, 'div', 'hist-pagination');
  addEl(document.body, 'input', 'hist-search');
  // Wrap for mob history list
  const pageHist = addEl(document.body, 'div', 'page-history');
  const tblWrap = addEl(pageHist, 'div', null, { className: 'tbl-wrap' });
  return { container, priceSelect };
}

function clearDOM() {
  document.body.innerHTML = '';
}

export { buildDocLinesDOM, clearDOM, addEl };
