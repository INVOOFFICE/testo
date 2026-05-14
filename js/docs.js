import { docsCtx } from './docs/context.js';
import { calcTotals, getTotals, nombreEnLettres, refreshAutoEntrepreneurDocUI, renderTVABreakdown } from './docs/totals.js';
import {
  applyUniqueSequentialRef,
  bumpSeq,
  docRefExistsGlobally,
  getNextRef,
  hideDocRefHint,
  showDocRefHint,
  updateDocRef,
} from './docs/refs.js';
import { updateDocStatus } from './docs/status.js';
import { refreshDocSourceHint } from './docs/source-links.js';
import {
  accumulateDocTvaByRateForReport,
  renderReports,
  setRepPeriod,
  showSalesReport,
} from './docs/reports.js';
import { getHistFiltered, populateHistClientFilter, resetHistFilters } from './docs/history-filters.js';
import { runDGICheck, validateICEInput } from './docs/dgi-checker.js';
import { sendDocWhatsApp } from './docs/whatsapp.js';
import { exportHistXLSX } from './docs/history-export.js';
import {
  closePostSaveBar,
  showConvertSuccessBar,
  showPostSaveActions,
} from './docs/post-save-bar.js';
import {
  onClientChange,
  populateDocClient,
  syncGenerateFromSettings,
} from './docs/client-form.js';
import { saveAndDownloadPDF } from './docs/pdf-actions.js';
import { openConvertModal, updateConvDateField, confirmConvert } from './docs/conversion.js';
import { editDocFromHistory, createAvoirFromCancelledFacture } from './docs/edit-history.js';
import { quickChangeStatus, cancelDoc, deleteDoc, duplicateDoc } from './docs/doc-crud.js';
import { renderHistory } from './docs/history-render.js';
import {
  computeTvaByRate,
  isDuplicateRef,
  shouldCreateAsNew,
  computeStockDeduction,
  computeStockRestoration,
} from './docs/doc-save.js';
import {
  addLine,
  removeLine,
  getLineTTC,
  getLineUnitTTC,
  setLineFromUnitTTC,
  getDisplayedUnitPrice,
  applyUserUnitPriceInput,
  refreshDocPriceModeLabels,
  refreshAllDocLinePriceInputs,
  syncDocPriceModeFromSelect,
  initDocPriceModeForNewDoc,
  loadDocPriceModeFromSaved,
  onDocPriceModeChange,
  renderDocLines,
  updateLineTotal,
  updLine,
} from './docs/doc-lines.js';

const docsPublicApi = {
  readDocFormData,
  updateDocRef,
  updateDocStatus,
  refreshDocSourceHint,
  initDocLines,
  addLine,
  onDocPriceModeChange,
  renderDocLines,
  nombreEnLettres,
  calcTotals,
  getTotals,
  saveDoc,
  saveAndDownloadPDF,
  showPostSaveActions,
  closePostSaveBar,
  populateDocClient,
  onClientChange,
  validateICEInput,
  runDGICheck,
  editDocFromHistory,
  createAvoirFromCancelledFacture,
  populateHistClientFilter,
  getHistFiltered,
  openConvertModal,
  updateConvDateField,
  confirmConvert,
  showConvertSuccessBar,
  renderHistory,
  quickChangeStatus,
  cancelDoc,
  resetHistFilters,
  deleteDoc,
  sendDocWhatsApp,
  duplicateDoc,
  exportHistXLSX,
  accumulateDocTvaByRateForReport,
  setRepPeriod,
  renderReports,
};

Object.assign(window, docsPublicApi);

// ═══════════════════════════════════════════
//  docs.js  —  Documents, lignes, DGI, historique
// ═══════════════════════════════════════════
//
//  INDEX — fonctions & entrées principales (navigation rapide)
//  ───────────────────────────────────────────────────────────
//  Référence & numérotation : maxSeqFromExistingRefs, parseDocRefNum,
//    docRefExistsGlobally, getNextRef, syncSeqCounterFromDocs,
//    applyUniqueSequentialRef, updateDocRef, bumpSeq
//  Avoir / document source : syncAvoirSourceMetaFromContext,
//    refreshDocSourceHint
//  Statuts & liste déroulante doc : updateDocStatus, initDocLines
//  Lignes de document : addLine, removeLine, getLineTTC, getLineUnitTTC,
//    setLineFromUnitTTC, getDisplayedUnitPrice, applyUserUnitPriceInput,
//    renderDocLines, updateLineTotal, updLine
//  Montants, TVA, arrêté : nombreEnLettres, calcTotals, renderTVABreakdown,
//    refreshAutoEntrepreneurDocUI, getTotals
//  Persistance & PDF : saveDoc, saveAndDownloadPDF, showPostSaveActions,
//    closePostSaveBar
//  Formulaire génération : populateDocClient, onClientChange,
//    syncGenerateFromSettings, validateICEInput, runDGICheck
//  Historique & CRUD doc : editDocFromHistory,
//    createAvoirFromCancelledFacture, populateHistClientFilter,
//    getHistFiltered, openConvertModal, updateConvDateField, confirmConvert,
//    showConvertSuccessBar, renderHistory, quickChangeStatus, cancelDoc,
//    resetHistFilters, deleteDoc, duplicateDoc, exportHistXLSX,
//    sendDocWhatsApp, _normalizePhoneForWhatsApp
//  Rapports fiscaux : showSalesReport, accumulateDocTvaByRateForReport,
//    _setReportsSkeletonLoading, _repDocYmd, _repCutoffYmd, setRepPeriod,
//    renderReports
//
// ═══════════════════════════════════════════

// ── Référence document (séquence stricte ; comptabilise tous les documents, y compris Annulé) ──
// Source-link and status logic moved to js/docs/source-links.js and js/docs/status.js.

// ═══════════════════════════════════════════
function initDocLines() {
  docsCtx.setAPP({ docLines: [] });
  const c = document.getElementById('doc-lines');
  if (c) docsCtx.clearChildren(c);
  const empty = document.getElementById('doc-lines-empty');
  if (empty) empty.style.display = 'block';
  ['doc-date', 'doc-remise', 'doc-acompte', 'doc-notes', 'doc-terms', 'doc-payment'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  updateDocStatus('Brouillon');
  const clientEl = document.getElementById('doc-client');
  if (clientEl) clientEl.value = '';
  const pillEl = document.getElementById('client-ice-pill');
  if (pillEl) pillEl.style.display = 'none';
  const docDate = document.getElementById('doc-date');
  if (docDate) docDate.value = docsCtx.today();
  const docIdEl = document.getElementById('doc-id');
  if (docIdEl) docIdEl.value = '';
  const srcRefEl = document.getElementById('doc-source-ref');
  if (srcRefEl) srcRefEl.value = '';
  const srcIdEl = document.getElementById('doc-source-id');
  if (srcIdEl) srcIdEl.value = '';
  const srcTypeEl = document.getElementById('doc-source-type');
  if (srcTypeEl) srcTypeEl.value = '';
  const originRefEl = document.getElementById('doc-origin-ref');
  if (originRefEl) originRefEl.value = '';
  const originTypeEl = document.getElementById('doc-origin-type');
  if (originTypeEl) originTypeEl.value = '';
  const originStatusEl = document.getElementById('doc-origin-status');
  if (originStatusEl) originStatusEl.value = '';
  updateDocRef();
  calcTotals();
  refreshAutoEntrepreneurDocUI();
  closePostSaveBar();
  runDGICheck();
  refreshDocSourceHint();
  ['doc-type', 'doc-status', 'doc-client', 'doc-terms', 'doc-payment', 'doc-price-mode'].forEach(
    id => docsCtx.refreshThemedSelect(id),
  );
  initDocPriceModeForNewDoc();
  const btnRegen = document.getElementById('btn-regen-ref');
  if (btnRegen) {
    btnRegen.onclick = () => {
      updateDocRef();
      docsCtx.toast('Référence régénérée automatiquement', '');
    };
  }
  const refInput = document.getElementById('doc-ref');
  if (refInput) {
    if (refInput._refInputHandler) refInput.removeEventListener('input', refInput._refInputHandler);
    refInput._refInputHandler = () => {
      const val = (refInput.value || '').trim();
      hideDocRefHint();
      if (!val) return;
      const editingId = document.getElementById('doc-id')?.value || '';
      const isDuplicate = docsCtx.getDB().docs.some(d => d.ref === val && d.id !== editingId);
      if (isDuplicate) {
        showDocRefHint('Cette référence est déjà utilisée.', true);
      } else {
        showDocRefHint('Référence disponible', false);
      }
    };
    refInput.addEventListener('input', refInput._refInputHandler);
  }
}

// ── Nombre en lettres (DGI Maroc) ──
// Totals/fiscal calculations moved to js/docs/totals.js.

// ── Ajouter ligne & line editor ──
// All line-related logic moved to js/docs/doc-lines.js:
//   addLine, removeLine, getLineTTC, getLineUnitTTC, setLineFromUnitTTC,
//   getDisplayedUnitPrice, applyUserUnitPriceInput, refreshDocPriceModeLabels,
//   refreshAllDocLinePriceInputs, syncDocPriceModeFromSelect, initDocPriceModeForNewDoc,
//   loadDocPriceModeFromSaved, onDocPriceModeChange, renderDocLines, updateLineTotal, updLine

// ── Sauvegarder document ──
// ═══════════════════════════════════════════

/**
 * Read document form data from the DOM.
 * Extracted for testability — no side effects, only DOM reads.
 * @returns {Object}
 */
function readDocFormData() {
  return {
    type: document.getElementById('doc-type').value,
    status: document.getElementById('doc-status').value,
    date: document.getElementById('doc-date').value,
    clientId: document.getElementById('doc-client').value,
    terms: document.getElementById('doc-terms').value,
    payment: document.getElementById('doc-payment').value,
    notes: document.getElementById('doc-notes').value,
    remise: parseFloat(document.getElementById('doc-remise').value) || 0,
    acompte: parseFloat(document.getElementById('doc-acompte').value) || 0,
    editingId: document.getElementById('doc-id')?.value || '',
    ref: (document.getElementById('doc-ref').value || '').trim(),
    sourceRef: (document.getElementById('doc-source-ref')?.value || '').trim(),
    sourceId: (document.getElementById('doc-source-id')?.value || '').trim(),
    sourceType: (document.getElementById('doc-source-type')?.value || '').trim(),
  };
}

async function saveDoc(opts = {}) {
  const fb = document.getElementById('doc-feedback');
  const setDocFeedback = msg => {
    if (fb) fb.textContent = msg;
  };
  setDocFeedback('Enregistrement en cours...');
  const silent = !!opts.silent;
  const keepEditor = !!opts.keepEditor;
  const fd = readDocFormData();

  syncDocPriceModeFromSelect();

  if (!docsCtx.getAPP().docLines.length) {
    docsCtx.toast('Ajoutez au moins un article', 'err');
    setDocFeedback('Ajoutez au moins un article pour sauvegarder.');
    return null;
  }

  const existing = fd.editingId ? docsCtx.getDB().docs.findIndex(x => x.id === fd.editingId) : -1;
  const isNew = existing < 0;
  const prevDoc = isNew ? null : docsCtx.getDB().docs[existing];

  const createAsNew = isNew || shouldCreateAsNew(prevDoc, fd.type);

  if (createAsNew) applyUniqueSequentialRef(fd.type);
  if (!fd.ref) {
    toast('Référence manquante', 'err');
    setDocFeedback('Référence manquante.');
    return null;
  }

  // Vérification doublon de référence
  if (createAsNew) {
    if (docRefExistsGlobally(fd.ref)) {
      docsCtx.toast('Cette référence est déjà utilisée. Modifiez-la ou cliquez sur Actualiser.', 'err');
      setDocFeedback('Référence en double — modifiez la référence.');
      showDocRefHint('Référence déjà utilisée.', true);
      return null;
    }
  } else if (prevDoc && fd.ref !== prevDoc.ref) {
    if (isDuplicateRef(fd.ref, docsCtx.getDB().docs, fd.editingId)) {
      docsCtx.toast('Cette référence est déjà utilisée par un autre document.', 'err');
      setDocFeedback('Référence en double — modifiez la référence.');
      showDocRefHint('Référence déjà utilisée par un autre document.', true);
      return null;
    }
  }

  let status = fd.status;
  const isAvoirFromCancelledFacture = !!(prevDoc && prevDoc.type === 'F' && prevDoc.status === 'Annulé' && fd.type === 'AV');
  if (isAvoirFromCancelledFacture && status === 'Annulé') {
    status = 'Brouillon';
    const statusEl = document.getElementById('doc-status');
    if (statusEl) {
      statusEl.value = 'Brouillon';
      docsCtx.refreshThemedSelect('doc-status');
    }
  }
  if (status === 'Annulé' && !isAvoirFromCancelledFacture) {
    docsCtx.toast("Un document annulé ne peut pas être sauvegardé. Utilisez l'Historique pour gérer ce document.", 'err');
    setDocFeedback("Ce document annule ne peut pas etre sauvegarde depuis cet ecran.");
    return null;
  }

  const iceVal = (docsCtx.getDB().settings.ice || '').replace(/\D/g, '');
  if (iceVal.length !== 15) {
    const force = await docsCtx.showConfirm({
      title: 'ICE absent ou invalide',
      message:
        'Votre ICE vendeur est absent ou invalide.<br><br>La facture <strong>ne sera pas conforme DGI</strong>.<br>Continuer quand même ?',
      icon: window.ICONS.alertTriangle,
      okLabel: 'Continuer quand même',
      okStyle: 'danger',
      cancelLabel: 'Annuler',
    });
    if (!force) {
      docsCtx.nav('settings', docsCtx.sbItem('settings'));
      return null;
    }
  }

  const totals = getTotals();
  const client = docsCtx.getDB().clients.find(c => c.id === fd.clientId) || null;

  const aeSave = docsCtx.isAutoEntrepreneurVAT();
  const byRate = computeTvaByRate(docsCtx.getAPP().docLines, fd.remise, aeSave);

  // Préserver/charger la liaison source depuis le formulaire (si édition)
  let { sourceRef, sourceId, sourceType } = fd;
  if (prevDoc) {
    sourceRef = sourceRef || String(prevDoc.sourceRef || '');
    sourceId = sourceId || String(prevDoc.sourceId || '');
    sourceType = sourceType || String(prevDoc.sourceType || '');
  }

  // Cas demandé: Facture annulée -> transformée en Avoir
  if (prevDoc && prevDoc.type === 'F' && prevDoc.status === 'Annulé' && fd.type === 'AV') {
    sourceRef = prevDoc.ref || sourceRef;
    sourceId = prevDoc.id || sourceId;
    sourceType = 'F';
  }

  const doc = {
    id: createAsNew ? 'doc_' + Date.now() : docsCtx.getDB().docs[existing].id,
    ref: fd.ref,
    type: fd.type,
    status,
    date: fd.date,
    clientId: fd.clientId,
    clientName: client ? client.name : 'N/A',
    terms: fd.terms,
    payment: fd.payment,
    notes: fd.notes,
    remise: fd.remise,
    acompte: fd.acompte,
    sourceRef,
    sourceId,
    sourceType,
    convertedToRef: prevDoc?.convertedToRef || '',
    convertedToId: prevDoc?.convertedToId || '',
    priceMode: docsCtx.normalizePriceMode(docsCtx.getAPP().docPriceMode) || docsCtx.getGlobalPriceMode(),
    lines: docsCtx.getAPP().docLines.map(l => (aeSave ? { ...l, tva: 0 } : { ...l })),
    tvaByRate: byRate,
    aeExempt: aeSave,
    ...totals,
    createdAt: createAsNew ? new Date().toISOString() : docsCtx.getDB().docs[existing].createdAt,
    updatedAt: new Date().toISOString(),
  };

  // ── Gestion stock intelligente ──
  const deductOnSave =
    (fd.type === 'F' || fd.type === 'BL') && (status === 'Envoyé' || status === 'Payé');
  const wasDeducted = prevDoc ? prevDoc.stockDeducted === true : false;

  // Snapshot original qty for rollback on error
  const oldStockQtyById = {};
  const _stock = docsCtx.getDB().stock;
  for (const l of docsCtx.getAPP().docLines || []) {
    if (!l.fromStock) continue;
    const a = _stock.find(x => x.id === l.fromStock);
    if (a) oldStockQtyById[l.fromStock] = a.qty || 0;
  }

  // Chain: restore previous deduction → apply new deduction
  let stockWarnings = [];
  let stockDeductedCount = 0;

  if (!isNew && wasDeducted) {
    const restored = computeStockRestoration(prevDoc.lines, _stock, true);
    restored.updatedStock.forEach((s, i) => { _stock[i].qty = s.qty; });
  }

  if (deductOnSave) {
    const deduction = computeStockDeduction(doc.lines, _stock, true);
    stockWarnings = deduction.warnings;
    stockDeductedCount = deduction.deductedCount;
    deduction.updatedStock.forEach((s, i) => { _stock[i].qty = s.qty; });
    deduction.updatedLines.forEach((l, i) => { doc.lines[i].stockDeductedQty = l.stockDeductedQty; });
  } else {
    for (const l of doc.lines) if (l.fromStock) l.stockDeductedQty = 0;
  }
  doc.stockDeducted = deductOnSave;

  try {
    if (createAsNew) {
      docsCtx.getDB().docs.unshift(doc);
      bumpSeq(fd.type);
    } else {
      docsCtx.getDB().docs[existing] = doc;
    }
    const docIdEl = document.getElementById('doc-id');
    if (docIdEl) docIdEl.value = doc.id;
    docsCtx.save('docs');
    docsCtx.save('stock');
    docsCtx.buildNotifications();

    const typeLabel =
      { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' }[fd.type] || fd.type;
    if (!silent) {
      docsCtx.toast(`${typeLabel} ${fd.ref} sauvegardée`, 'suc');
      showPostSaveActions(doc, stockDeductedCount);
    }
    setDocFeedback(`${typeLabel} enregistre avec succes.`);
    if (!keepEditor) {
      initDocLines();
      updateDocRef();
    }
    if (stockWarnings.length)
      setTimeout(() => docsCtx.toast('Stock bas — ' + stockWarnings.join(', '), 'warn'), 800);
    return doc;
  } catch (e) {
    docsCtx.dbgErr('[saveDoc] Erreur sauvegarde:', e);
    // Rollback stock en mémoire (en cas d'erreur avant la persistance)
    Object.entries(oldStockQtyById).forEach(([id, qty]) => {
      const a = DB.stock.find(x => String(x.id) === String(id));
      if (a) a.qty = qty;
    });
    docsCtx.toast('Erreur lors de la sauvegarde — réessayez', 'err');
    setDocFeedback('Erreur lors de la sauvegarde. Reessayez.');
    return null;
  }
}

// PDF save/download helper moved to js/docs/pdf-actions.js.

// Post-save bar logic moved to js/docs/post-save-bar.js.

// Client/form helper logic moved to js/docs/client-form.js.

// ── Validation ICE ──
// ═══════════════════════════════════════════
// Validation ICE and DGI checker logic moved to js/docs/dgi-checker.js.

// ── DGI Checker ──
// ═══════════════════════════════════════════
// Validation ICE and DGI checker logic moved to js/docs/dgi-checker.js.
// Edit from history logic moved to js/docs/edit-history.js.
//   - editDocFromHistory
//   - createAvoirFromCancelledFacture

// ── Historique ──
// History filtering logic moved to js/docs/history-filters.js.
// Devis → Facture conversion logic moved to js/docs/conversion.js.
// History table/mobile rendering logic moved to js/docs/history-render.js.

// Document CRUD operations moved to js/docs/doc-crud.js:
// quickChangeStatus, cancelDoc, deleteDoc, duplicateDoc.

// History XLSX export logic moved to js/docs/history-export.js.

// Reporting logic moved to js/docs/reports.js.

export {
  readDocFormData,
  addLine,
  calcTotals,
  cancelDoc,
  closePostSaveBar,
  confirmConvert,
  createAvoirFromCancelledFacture,
  deleteDoc,
  duplicateDoc,
  editDocFromHistory,
  exportHistXLSX,
  getHistFiltered,
  getTotals,
  initDocLines,
  nombreEnLettres,
  onClientChange,
  onDocPriceModeChange,
  openConvertModal,
  populateDocClient,
  populateHistClientFilter,
  quickChangeStatus,
  refreshDocSourceHint,
  renderDocLines,
  renderHistory,
  renderReports,
  resetHistFilters,
  runDGICheck,
  saveAndDownloadPDF,
  saveDoc,
  sendDocWhatsApp,
  setRepPeriod,
  showConvertSuccessBar,
  showPostSaveActions,
  updateConvDateField,
  updateDocRef,
  updateDocStatus,
  validateICEInput,
  accumulateDocTvaByRateForReport,
};
