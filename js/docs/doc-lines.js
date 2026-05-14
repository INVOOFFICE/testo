// Document line editor: add/remove lines, price mode, autocomplete rendering.

import { calcTotals, refreshAutoEntrepreneurDocUI } from './totals.js';
import { runDGICheck } from './dgi-checker.js';
import { docsCtx } from './context.js';

export function getLineTTC(line) {
  const ae = docsCtx.isAutoEntrepreneurVAT();
  const qty = Number(line?.qty || 0);
  const price = Number(line?.price || 0);
  const rate = ae ? 0 : Number(line?.tva || 0);
  const ht = qty * price;
  return ht + (ht * rate) / 100;
}

export function getLineUnitTTC(line) {
  const ae = docsCtx.isAutoEntrepreneurVAT();
  const rate = ae ? 0 : Number(line?.tva || 0);
  const htUnit = Number(line?.price || 0);
  return htUnit + (htUnit * rate) / 100;
}

export function setLineFromUnitTTC(line, unitTTC) {
  const ae = docsCtx.isAutoEntrepreneurVAT();
  const rate = ae ? 0 : Number(line?.tva || 0);
  const denom = 1 + rate / 100;
  const ttc = Number(unitTTC) || 0;
  line.price = denom > 0 ? ttc / denom : 0;
}

export function getDisplayedUnitPrice(line) {
  if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
    return Number(line?.price || 0);
  }
  return getLineUnitTTC(line);
}

export function applyUserUnitPriceInput(line, rawStr) {
  const v = parseFloat(rawStr) || 0;
  if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
    line.price = v;
  } else {
    setLineFromUnitTTC(line, v);
  }
}

export function refreshDocPriceModeLabels() {
  const ht = typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT';
  const label = ht ? 'Prix U (HT)' : 'Prix U (TTC)';
  const head = document.getElementById('doc-inv-head-price');
  if (head) head.textContent = label;
  document.querySelectorAll('.inv-line .inv-cell-price .inv-mini-label').forEach(el => {
    el.textContent = label;
  });
}

export function refreshAllDocLinePriceInputs() {
  (APP.docLines || []).forEach(l => {
    const row = document.getElementById('line-' + l.id);
    const inp = row?.querySelector('input[data-line-field="price"]');
    if (inp) inp.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
  });
}

export function syncDocPriceModeFromSelect() {
  const sel = document.getElementById('doc-price-mode');
  if (!sel) return;
  const m = docsCtx.normalizePriceMode(sel.value);
  docsCtx.getAPP().docPriceMode = m || docsCtx.getGlobalPriceMode();
}

export function initDocPriceModeForNewDoc() {
  docsCtx.getAPP().docPriceMode = docsCtx.getGlobalPriceMode();
  const sel = document.getElementById('doc-price-mode');
  if (sel) sel.value = docsCtx.getAPP().docPriceMode;
  refreshDocPriceModeLabels();
}

export function loadDocPriceModeFromSaved(d) {
  const fromDoc = d ? docsCtx.normalizePriceMode(d.priceMode) : null;
  docsCtx.getAPP().docPriceMode = fromDoc || docsCtx.getGlobalPriceMode();
  const sel = document.getElementById('doc-price-mode');
  if (sel) sel.value = docsCtx.getAPP().docPriceMode;
  refreshDocPriceModeLabels();
}

export function onDocPriceModeChange() {
  syncDocPriceModeFromSelect();
  refreshDocPriceModeLabels();
  refreshAllDocLinePriceInputs();
  if (document.getElementById('modal-stock-picker')?.classList.contains('open') && typeof renderStockPicker === 'function') {
    renderStockPicker();
  }
}

export function addLine(article = null) {
  if (article && (article instanceof Event || typeof article.name !== 'string')) article = null;
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const ae = docsCtx.isAutoEntrepreneurVAT();
  const defaultTva = ae ? 0 : parseInt(docsCtx.getDB().settings.tva, 10) || 20;
  const line = article
    ? {
        id,
        name: article.name,
        qty: 1,
        price: 0,
        tva: ae ? 0 : article.tva != null ? article.tva : defaultTva,
        fromStock: article.id,
      }
    : { id, name: '', qty: 1, price: 0, tva: defaultTva, fromStock: null };
  if (article) setLineFromUnitTTC(line, article.sell || 0);
  docsCtx.getAPP().docLines.push(line);
  renderDocLines();
  calcTotals();
  setTimeout(() => {
    const row = document.getElementById('line-' + id);
    if (row) row.querySelector('input')?.focus();
  }, 30);
}

export function removeLine(id) {
  docsCtx.getAPP().docLines = docsCtx.getAPP().docLines.filter(l => l.id !== id);
  renderDocLines();
  calcTotals();
}

export function updateLineTotal(l) {
  const el = document.getElementById('line-total-' + l.id);
  if (el) el.textContent = l.qty && l.price ? fmtNum(l.qty * l.price) : '';
  const ttcEl = document.getElementById('line-total-ttc-' + l.id);
  if (ttcEl) ttcEl.textContent = l.qty && l.price ? fmtNum(getLineTTC(l)) : '';
}

export function updLine(id, field, val) {
  const l = docsCtx.getAPP().docLines.find(x => x.id === id);
  if (!l) return;
  if (field === 'price') applyUserUnitPriceInput(l, val);
  else if (field === 'qty' || field === 'tva') l[field] = parseFloat(val) || 0;
  else l[field] = val;
  updateLineTotal(l);
  calcTotals();
}

export function renderDocLines() {
  const c = document.getElementById('doc-lines');
  const empty = document.getElementById('doc-lines-empty');
  const _APP = docsCtx.getAPP();
  if (empty) empty.style.display = _APP.docLines.length ? 'none' : 'block';
  const liveRows = c.querySelectorAll('.inv-line');
  for (const row of liveRows) {
    if (!_APP.docLines.find(l => l.id === row.dataset.lid)) {
      row.remove();
    }
  }

  const newLineFrag = document.createDocumentFragment();
  let hasNewLines = false;
  _APP.docLines.forEach((l, idx) => {
    if (document.getElementById('line-' + l.id)) return;
    hasNewLines = true;
    const row = document.createElement('div');
    row.className = 'inv-line';
    row.id = 'line-' + l.id;
    row.dataset.lid = l.id;

    const makeCell = (label, child, extraClass = '') => {
      const cell = document.createElement('div');
      cell.className = 'inv-cell ' + extraClass;
      const lab = document.createElement('div');
      lab.className = 'inv-mini-label';
      lab.textContent = label;
      cell.appendChild(lab);
      cell.appendChild(child);
      return cell;
    };

    const acWrap = document.createElement('div');
    acWrap.className = 'ac-wrap';
    const name = document.createElement('input');
    name.dataset.lineField = 'name';
    name.value = l.name;
    name.placeholder = 'Désignation ou code article...';
    name.autocomplete = 'off';
    name.style.width = '100%';
    const dropdown = document.createElement('div');
    dropdown.className = 'ac-dropdown';
    dropdown.id = 'ac-' + l.id;
    let acFocusIdx = -1;
    const closeAC = () => {
      dropdown.classList.remove('open');
      acFocusIdx = -1;
    };
    const markAc = 'background:rgba(26,107,60,.15);color:var(--brand);border-radius:2px';
    const applyArt = a => {
      const ae = docsCtx.isAutoEntrepreneurVAT();
      l.name = a.name;
      l.tva = ae ? 0 : a.tva != null ? a.tva : parseInt(docsCtx.getDB().settings.tva, 10) || 20;
      l.fromStock = a.id;
      setLineFromUnitTTC(l, a.sell || 0);
      name.value = a.name;
      const priceInput = row.querySelector('input[data-line-field="price"]');
      const qtyInput = row.querySelector('input[data-line-field="qty"]');
      if (priceInput) priceInput.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
      if (qtyInput) qtyInput.value = l.qty;
      const s = row.querySelector('select');
      if (s) s.value = String(l.tva);
      updateLineTotal(l);
      calcTotals();
      if (qtyInput) {
        qtyInput.select();
        qtyInput.focus();
      }
    };
    const openAC = q => {
      const ql = (q || '').toLowerCase();
      const _DB_stock = docsCtx.getDB().stock;
      const results = q
        ? _DB_stock
            .filter(
              a =>
                a.name.toLowerCase().includes(ql) ||
                (a.barcode || '').toLowerCase().includes(ql) ||
                (a.category || '').toLowerCase().includes(ql),
            )
            .slice(0, 8)
        : _DB_stock.slice(0, 8);
      docsCtx.clearChildren(dropdown);
      acFocusIdx = -1;
      if (!results.length && q) {
        const empty = document.createElement('div');
        empty.className = 'ac-empty';
        empty.textContent = 'Aucun article pour "' + q + '"';
        dropdown.appendChild(empty);
        const libre = document.createElement('div');
        libre.className = 'ac-add';
        libre.innerHTML += window.ICONS.edit + ' Utiliser "';
        const st = document.createElement('strong');
        st.textContent = q;
        libre.appendChild(st);
        libre.appendChild(document.createTextNode('" comme texte libre'));
        libre.addEventListener('mousedown', e => {
          e.preventDefault();
          l.name = q;
          name.value = q;
          closeAC();
        });
        dropdown.appendChild(libre);
        dropdown.classList.add('open');
        const _acR = acWrap.getBoundingClientRect();
        dropdown.style.maxHeight = Math.min(280, Math.max(120, window.innerHeight - _acR.bottom - 10)) + 'px';
        return;
      }
      if (!results.length) {
        closeAC();
        return;
      }
      results.forEach(a => {
        const low = (a.qty || 0) < 5,
          zero = (a.qty || 0) === 0;
        const item = document.createElement('div');
        item.className = 'ac-item';
        const left = document.createElement('div');
        const nameRow = document.createElement('div');
        nameRow.className = 'ac-name';
        appendHighlightedContent(nameRow, a.name, q, markAc);
        if (low && !zero) {
          const w = document.createElement('span');
          w.className = 'ac-stock-low';
          w.innerHTML = window.ICONS.alertTriangle;
          nameRow.appendChild(w);
        }
        const meta = document.createElement('div');
        meta.className = 'ac-meta';
        meta.textContent = `${a.category || '—'} · stock: ${a.qty || 0}`;
        left.appendChild(nameRow);
        left.appendChild(meta);
        const price = document.createElement('div');
        price.className = 'ac-price';
        const aePick = docsCtx.isAutoEntrepreneurVAT();
        const arTva = aePick ? 0 : a.tva != null ? a.tva : parseInt(docsCtx.getDB().settings.tva, 10) || 20;
        const sellShown =
          typeof displayTTCForDocLineMode === 'function'
            ? displayTTCForDocLineMode(a.sell || 0, arTva)
            : a.sell || 0;
        price.textContent = docsCtx.fmt(sellShown);
        item.appendChild(left);
        item.appendChild(price);
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          applyArt(a);
          closeAC();
        });
        dropdown.appendChild(item);
      });
      if (q) {
        const libre = document.createElement('div');
        libre.className = 'ac-add';
        libre.innerHTML += window.ICONS.edit + ' Utiliser "';
        const st2 = document.createElement('strong');
        st2.textContent = q;
        libre.appendChild(st2);
        libre.appendChild(document.createTextNode('" comme texte libre'));
        libre.addEventListener('mousedown', e => {
          e.preventDefault();
          l.name = q;
          name.value = q;
          closeAC();
        });
        dropdown.appendChild(libre);
      }
      dropdown.classList.add('open');
      const _acR = acWrap.getBoundingClientRect();
      dropdown.style.maxHeight = Math.min(280, Math.max(120, window.innerHeight - _acR.bottom - 10)) + 'px';
    };
    name.addEventListener('input', e => {
      l.name = e.target.value;
      openAC(e.target.value.trim());
    });
    name.addEventListener('focus', e => {
      if (docsCtx.getDB().stock.length) openAC(e.target.value.trim());
    });
    name.addEventListener('blur', () => setTimeout(closeAC, 160));
    name.addEventListener('change', e => {
      l.name = e.target.value;
    });
    name.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.ac-item,.ac-add');
      if (!dropdown.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acFocusIdx = Math.min(acFocusIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('focused', i === acFocusIdx));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acFocusIdx = Math.max(acFocusIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('focused', i === acFocusIdx));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const f = dropdown.querySelector('.focused') || dropdown.querySelector('.ac-item');
        if (f) f.dispatchEvent(new MouseEvent('mousedown'));
        closeAC();
      } else if (e.key === 'Escape' || e.key === 'Tab') closeAC();
    });
    acWrap.appendChild(name);
    acWrap.appendChild(dropdown);
    row.appendChild(makeCell('Désignation', acWrap, 'inv-cell-name'));

    const priceLabel =
      typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT'
        ? 'Prix U (HT)'
        : 'Prix U (TTC)';

    const price = document.createElement('input');
    price.type = 'text';
    price.inputMode = 'decimal';
    price.value = l.price ? String(getDisplayedUnitPrice(l)) : '';
    price.dataset.lineField = 'price';
    price.addEventListener('input', e => {
      applyUserUnitPriceInput(l, e.target.value);
      updateLineTotal(l);
      calcTotals();
    });
    price.addEventListener('blur', e => {
      if (e.target.value === '' || e.target.value === '0') e.target.value = '';
    });
    row.appendChild(makeCell(priceLabel, price, 'inv-cell-price'));

    const qty = document.createElement('input');
    qty.type = 'text';
    qty.inputMode = 'decimal';
    qty.value = l.qty;
    qty.dataset.lineField = 'qty';
    qty.addEventListener('input', e => {
      l.qty = parseFloat(e.target.value) || 0;
      updateLineTotal(l);
      calcTotals();
      runDGICheck();
    });
    qty.addEventListener('blur', e => {
      if (e.target.value === '') e.target.value = 0;
    });
    row.appendChild(makeCell('Qté', qty, 'inv-cell-qty'));

    const total = document.createElement('div');
    total.id = 'line-total-' + l.id;
    total.style.cssText =
      'font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"zero" 0';
    total.textContent = l.price > 0 ? fmtNum(l.qty * l.price) : '';
    row.appendChild(makeCell('Total HT', total, 'inv-cell-totalht'));

    const totalTTC = document.createElement('div');
    totalTTC.id = 'line-total-ttc-' + l.id;
    totalTTC.style.cssText =
      'font-size:12px;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"zero" 0';
    totalTTC.textContent = l.price > 0 ? fmtNum(getLineTTC(l)) : '';
    row.appendChild(makeCell('Total TTC', totalTTC, 'inv-cell-totalttc'));

    const sel = document.createElement('select');
    sel.style.cssText = 'padding:6px 4px;font-size:12px';
    sel.dataset.lineTvaSelect = '1';
    ['20', '14', '10', '7', '0'].forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r + '%';
      if (String(l.tva) === r) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', e => {
      l.tva = parseInt(e.target.value, 10);
      const unitInput = row.querySelector('input[data-line-field="price"]');
      const raw = parseFloat(unitInput?.value) || 0;
      if (typeof getEffectiveDocPriceMode === 'function' && getEffectiveDocPriceMode() === 'HT') {
        l.price = raw;
      } else {
        setLineFromUnitTTC(l, raw);
      }
      updateLineTotal(l);
      calcTotals();
    });
    row.appendChild(makeCell('TVA%', sel, 'inv-cell-tva'));

    const del = document.createElement('button');
    del.className = 'btn btn-icon btn-danger';
    del.innerHTML = window.ICONS.closeX;
    del.addEventListener('click', () => removeLine(l.id));
    row.appendChild(del);

    newLineFrag.appendChild(row);
  });
  if (hasNewLines) c.appendChild(newLineFrag);
  refreshDocPriceModeLabels();
  if (typeof refreshAutoEntrepreneurDocUI === 'function') refreshAutoEntrepreneurDocUI();
  runDGICheck();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.ac-wrap'))
    document.querySelectorAll('.ac-dropdown').forEach(d => d.classList.remove('open'));
});
