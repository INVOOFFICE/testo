import { runDGICheck } from './dgi-checker.js';
import { updateDocRef } from './refs.js';
import { docsCtx } from './context.js';

export function populateDocClient() {
  const sel = document.getElementById('doc-client');
  if (!sel) return;
  const _DB = docsCtx.getDB();
  const cur = sel.value;
  docsCtx.clearChildren(sel);
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = _DB.clients.length
    ? 'Sélectionner un client...'
    : 'Aucun client enregistré';
  sel.appendChild(placeholder);
  const addOpt = document.createElement('option');
  addOpt.value = '__new__';
  addOpt.innerHTML = window.ICONS.plus + ' Ajouter un nouveau client';
  sel.appendChild(addOpt);
  if (_DB.clients.length) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '──────────────────';
    sel.appendChild(sep);
    _DB.clients.forEach(c => {
      const o = document.createElement('option');
      const iceOk = (c.ice || '').replace(/\D/g, '').length === 15;
      o.value = c.id;
      o.innerHTML = c.name + (c.ice ? ` — ICE ${c.ice}` : '  ' + window.ICONS.alertTriangle + ' sans ICE');
      if (c.id === cur) o.selected = true;
      sel.appendChild(o);
    });
  }
  syncGenerateFromSettings();
  docsCtx.refreshThemedSelect('doc-client');
}

export function onClientChange() {
  const sel = document.getElementById('doc-client');
  const val = sel.value;
  if (val === '__new__') {
    sel.value = '';
    openNewClientModal();
    return;
  }
  const pill = document.getElementById('client-ice-pill');
  if (!val) {
    pill.style.display = 'none';
    runDGICheck();
    return;
  }
  const client = docsCtx.getDB().clients.find(c => c.id === val);
  if (!client) {
    pill.style.display = 'none';
    runDGICheck();
    return;
  }
  const hasICE = (client.ice || '').replace(/\D/g, '').length === 15;
  pill.style.display = 'inline-flex';
  pill.className = 'client-ice-pill ' + (hasICE ? 'ok' : 'miss');
  pill.innerHTML = hasICE ? window.ICONS.checkCircle + ' ICE OK' : window.ICONS.alertTriangle + ' ICE manquant';
  runDGICheck();
}

export function syncGenerateFromSettings() {
  const s = docsCtx.getDB().settings;
  const notesEl = document.getElementById('doc-notes');
  if (notesEl && !notesEl.value && s.footer) notesEl.placeholder = `Footer par défaut: ${s.footer}`;
  updateDocRef();
  runDGICheck();
}
