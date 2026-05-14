// Load document from history into editor.

import { docsCtx } from './context.js';
import { updateDocStatus } from './status.js';
import { populateDocClient } from './client-form.js';
import { updateDocRef } from './refs.js';
import { calcTotals, refreshAutoEntrepreneurDocUI } from './totals.js';
import { closePostSaveBar } from './post-save-bar.js';
import { refreshDocSourceHint } from './source-links.js';
import { loadDocPriceModeFromSaved, renderDocLines } from './doc-lines.js';

export function editDocFromHistory(id) {
  const d = docsCtx.getDB().docs.find(x => x.id === id);
  if (!d) return;
  docsCtx.nav('generate', docsCtx.sbItem('generate'));
  setTimeout(() => {
    const docIdEl = document.getElementById('doc-id');
    if (docIdEl) docIdEl.value = d.id;
    const srcRefEl = document.getElementById('doc-source-ref');
    if (srcRefEl) srcRefEl.value = d.sourceRef || '';
    const srcIdEl = document.getElementById('doc-source-id');
    if (srcIdEl) srcIdEl.value = d.sourceId || '';
    const srcTypeEl = document.getElementById('doc-source-type');
    if (srcTypeEl) srcTypeEl.value = d.sourceType || '';
    const originRefEl = document.getElementById('doc-origin-ref');
    if (originRefEl) originRefEl.value = d.ref || '';
    const originTypeEl = document.getElementById('doc-origin-type');
    if (originTypeEl) originTypeEl.value = d.type || '';
    const originStatusEl = document.getElementById('doc-origin-status');
    if (originStatusEl) originStatusEl.value = d.status || '';
    document.getElementById('doc-ref').value = d.ref;
    document.getElementById('doc-type').value = d.type;
    updateDocStatus(d.status);
    const statusSel = document.getElementById('doc-status');
    if (d.status === 'Annulé' && !statusSel.querySelector('option[value="Annulé"]')) {
      const opt = document.createElement('option');
      opt.value = 'Annulé';
      opt.textContent = 'Annulé';
      opt.disabled = true;
      statusSel.appendChild(opt);
      statusSel.value = 'Annulé';
    }
    statusSel.value = d.status;
    statusSel.title =
      d.status === 'Annulé'
        ? "Ce document est annulé. Pour modifier le statut, utilisez les actions dans l'Historique."
        : '';
    document.getElementById('doc-date').value = d.date;
    document.getElementById('doc-terms').value = d.terms || '';
    document.getElementById('doc-payment').value = d.payment || '';
    document.getElementById('doc-notes').value = d.notes || '';
    document.getElementById('doc-remise').value = d.remise || 0;
    document.getElementById('doc-acompte').value = d.acompte || 0;
    populateDocClient();
    document.getElementById('doc-client').value = d.clientId || '';
    ['doc-type', 'doc-status', 'doc-client', 'doc-terms', 'doc-payment', 'doc-price-mode'].forEach(
      docsCtx.refreshThemedSelect,
    );
    loadDocPriceModeFromSaved(d);
    APP.docLines = (d.lines || []).map(l => ({
      ...l,
      id: l.id || 'l_' + Date.now() + Math.random(),
    }));
    renderDocLines();
    calcTotals();
    if (typeof refreshAutoEntrepreneurDocUI === 'function') refreshAutoEntrepreneurDocUI();
    closePostSaveBar();
    refreshDocSourceHint();
    docsCtx.toast(d.status === 'Annulé' ? `Document annulé — lecture seule` : `Édition de ${d.ref}`, 'warn');
  }, 80);
}

export function createAvoirFromCancelledFacture(id) {
  const d = docsCtx.getDB().docs.find(x => x.id === id);
  if (!d || d.type !== 'F' || d.status !== 'Annulé') {
    docsCtx.toast('Action disponible uniquement pour une facture annulée', 'err');
    return;
  }
  editDocFromHistory(id);
  setTimeout(() => {
    const typeEl = document.getElementById('doc-type');
    if (typeEl) {
      typeEl.value = 'AV';
      updateDocRef();
      updateDocStatus('Brouillon');
      const statusEl = document.getElementById('doc-status');
      if (statusEl) statusEl.value = 'Brouillon';
      ['doc-type', 'doc-status'].forEach(docsCtx.refreshThemedSelect);
    }
    refreshDocSourceHint();
    docsCtx.toast(`Avoir prêt depuis ${d.ref} — cliquez sur Sauvegarder`, 'suc');
  }, 120);
}
