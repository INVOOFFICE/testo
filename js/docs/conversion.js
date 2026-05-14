// Conversion Devis → Facture.

import { getNextRef, bumpSeq } from './refs.js';
import { showConvertSuccessBar } from './post-save-bar.js';
import { docsCtx } from './context.js';

let _convSourceId = null;

window.APP = window.APP || {};
window.APP.docsConversion = window.APP.docsConversion || {};

const _defineDocsConversionState = (key, getter, setter) => {
  try {
    const desc = Object.getOwnPropertyDescriptor(window.APP.docsConversion, key);
    if (desc && (desc.get || desc.set)) return;
    Object.defineProperty(window.APP.docsConversion, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: false,
    });
  } catch (_) {}
};

_defineDocsConversionState(
  'conversionSourceId',
  () => _convSourceId,
  v => {
    _convSourceId = v;
  },
);

export function openConvertModal(id) {
  const _DB = docsCtx.getDB();
  const d = _DB.docs.find(x => x.id === id);
  if (!d || d.type !== 'D') return;
  docsCtx.getAPP().docsConversion.conversionSourceId = id;
  const nextRef = getNextRef('F');
  document.getElementById('conv-title').textContent = `Convertir ${d.ref} en Facture`;
  document.getElementById('conv-sub').textContent = `${d.clientName || 'N/A'} — ${docsCtx.fmt(d.ttc)}`;
  document.getElementById('conv-from-ref').textContent = d.ref;
  document.getElementById('conv-from-client').textContent = d.clientName || 'N/A';
  document.getElementById('conv-to-ref').textContent = nextRef;
  document.getElementById('conv-amount').textContent = docsCtx.fmt(d.ttc);
  const convLc = document.getElementById('conv-lines-count');
  if (convLc) {
    docsCtx.clearChildren(convLc);
    convLc.appendChild(document.createTextNode(`${(d.lines || []).length} ligne(s)`));
    const br = document.createElement('br');
    const sub = document.createElement('span');
    sub.style.color = 'var(--text3)';
    sub.textContent = 'Tous les articles repris';
    convLc.appendChild(br);
    convLc.appendChild(sub);
  }
  document.getElementById('conv-date-today').checked = true;
  document.getElementById('conv-custom-date').value = docsCtx.today();
  document.getElementById('conv-custom-date').style.display = 'none';
  document.getElementById('conv-keep-devis').checked = true;
  document.getElementById('conv-opt-date-wrap')?.classList.add('selected');
  document.getElementById('conv-opt-date-custom-wrap')?.classList.remove('selected');
  docsCtx.openModal('modal-convert');
}

export function updateConvDateField() {
  const isCustom = document.getElementById('conv-date-custom').checked;
  document.getElementById('conv-custom-date').style.display = isCustom ? 'block' : 'none';
  document.getElementById('conv-opt-date-wrap')?.classList.toggle('selected', !isCustom);
  document.getElementById('conv-opt-date-custom-wrap')?.classList.toggle('selected', isCustom);
}

export function confirmConvert() {
  const _DB = docsCtx.getDB();
  const _APP = docsCtx.getAPP();
  const d = _DB.docs.find(x => x.id === _APP.docsConversion.conversionSourceId);
  if (!d) {
    docsCtx.closeModal('modal-convert');
    return;
  }
  const isCustomDate = document.getElementById('conv-date-custom').checked;
  const invoiceDate = isCustomDate
    ? document.getElementById('conv-custom-date').value || docsCtx.today()
    : docsCtx.today();
  const keepDevis = document.getElementById('conv-keep-devis').checked;
  const newRef = getNextRef('F');
  const invoice = {
    ...d,
    id: 'doc_' + Date.now(),
    ref: newRef,
    type: 'F',
    status: 'Brouillon',
    date: invoiceDate,
    sourceRef: d.ref,
    sourceId: d.id,
    sourceType: 'D',
    convertedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: (d.lines || []).map(l => ({
      ...l,
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    })),
  };
  _DB.docs.unshift(invoice);
  bumpSeq('F');
  if (keepDevis) {
    const srcIdx = _DB.docs.findIndex(x => x.id === _APP.docsConversion.conversionSourceId);
    if (srcIdx >= 0) {
      _DB.docs[srcIdx].status = 'Converti';
      _DB.docs[srcIdx].convertedToRef = newRef;
      _DB.docs[srcIdx].convertedToId = invoice.id;
    }
  }
  docsCtx.save('docs');
  docsCtx.buildNotifications();
  docsCtx.closeModal('modal-convert');
  if (typeof renderHistory === 'function') renderHistory();
  docsCtx.toast(`Facture ${newRef} créée depuis ${d.ref}`, 'suc');
  setTimeout(() => showConvertSuccessBar(invoice, d), 300);
}
