/**
 * Opérations CRUD sur les documents : changement de statut rapide, annulation, suppression, duplication.
 * @module docs/doc-crud
 */

import { getNextRef, bumpSeq } from './refs.js';
import { docsCtx } from './context.js';
import { computeStockDeduction, computeStockRestoration } from './doc-save.js';

/**
 * Passe un document au statut suivant selon le flux : Brouillon → Envoyé → Payé.
 * Gère aussi la déduction stock pour Factures et BL.
 * @param {string} id - ID du document
 * @returns {void}
 */
export function quickChangeStatus(id) {
  const _DB = docsCtx.getDB();
  const d = _DB.docs.find(x => x.id === id);
  if (!d) return;
  const flow = { Brouillon: 'Envoyé', Envoyé: 'Payé' };
  const next = flow[d.status];
  if (!next) return;
  const wasDeducted = d.stockDeducted === true;
  const isStockDoc = d.type === 'F' || d.type === 'BL';
  const willDeduct = isStockDoc && (next === 'Envoyé' || next === 'Payé');
  if (willDeduct && !wasDeducted) {
    const deduction = computeStockDeduction(d.lines, _DB.stock, true);
    deduction.updatedStock.forEach((s, i) => { _DB.stock[i].qty = s.qty; });
    deduction.updatedLines.forEach((l, i) => { d.lines[i].stockDeductedQty = l.stockDeductedQty; });
    d.stockDeducted = true;
    docsCtx.save('stock');
    if (deduction.warnings.length)
      setTimeout(() => docsCtx.toast('Stock bas — ' + deduction.warnings.join(', '), 'warn'), 500);
  }
  d.status = next;
  d.updatedAt = new Date().toISOString();
  docsCtx.save('docs');
  if (typeof renderHistory === 'function') renderHistory();
  docsCtx.buildNotifications();
  docsCtx.toast(`${d.ref} → ${next}`, 'suc');
}

/**
 * Annule un document (passe le statut à "Annulé") et restitue le stock si nécessaire.
 * Demande confirmation avant l'action.
 * @param {string} id - ID du document
 * @returns {Promise<void>}
 */
export async function cancelDoc(id) {
  const _DB = docsCtx.getDB();
  const d = _DB.docs.find(x => x.id === id);
  if (!d) return;
  const stockLines = (d.lines || []).filter(l => l.fromStock);
  const hasStock = stockLines.length > 0 && d.stockDeducted === true;
  const stockDetail = hasStock
    ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
        .map(l => {
          const a = _DB.stock.find(x => x.id === l.fromStock);
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          return `• ${a ? a.name : l.name} : +${restoreQty}`;
        })
        .join('<br>')}`
    : '';
  const ok = await docsCtx.showConfirm({
    title: `Annuler "${d.ref}" ?`,
    message: `Cette action passera le document en statut <strong>Annulé</strong>.${stockDetail}`,
    icon: window.ICONS.ban,
    okLabel: 'Annuler le document',
    okStyle: 'danger',
  });
  if (!ok) return;
  try {
    if (d.stockDeducted) {
      const restored = computeStockRestoration(d.lines, _DB.stock, true);
      restored.updatedStock.forEach((s, i) => { _DB.stock[i].qty = s.qty; });
      d.stockDeducted = false;
      docsCtx.save('stock');
      if (stockLines.length) docsCtx.toast(`Stock restitué pour ${stockLines.length} article(s)`, 'suc');
    }
    d.status = 'Annulé';
    d.updatedAt = new Date().toISOString();
    docsCtx.save('docs');
    if (typeof renderHistory === 'function') renderHistory();
    docsCtx.buildNotifications();
    docsCtx.toast(`${d.ref} annulé`, '');
  } catch (e) {
    docsCtx.dbgErr('[cancelDoc] Erreur:', e);
    docsCtx.toast("Erreur lors de l'annulation — réessayez", 'err');
  }
}

/**
 * Supprime ou annule un document selon son type :
 * - F/BL/AV : Annule (passe à "Annulé", données conservées)
 * - D : Supprime définitivement (irréversible)
 * @param {string} id - ID du document
 * @returns {Promise<void>}
 */
export async function deleteDoc(id) {
  const _DB = docsCtx.getDB();
  const d = _DB.docs.find(x => x.id === id);
  if (!d) return;
  if (d.type === 'F' || d.type === 'BL' || d.type === 'AV') {
    if (d.status === 'Annulé') {
      docsCtx.toast('Document déjà annulé — données conservées', 'suc');
      if (typeof renderHistory === 'function') renderHistory();
      docsCtx.buildNotifications();
      return;
    }
    const stockLines = (d.lines || []).filter(l => l.fromStock);
    const hasStock = stockLines.length > 0 && d.stockDeducted === true;
    const stockDetail = hasStock
      ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
          .map(l => {
            const a = _DB.stock.find(x => x.id === l.fromStock);
            const restoreQty =
              typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
            return `• ${a ? a.name : l.name} : +${restoreQty}`;
          })
          .join('<br>')}`
      : '';
    const ok = await docsCtx.showConfirm({
      title: `Annuler "${d.ref}" ?`,
      message: `Cette action passera le document en statut <strong>Annulé</strong> (données conservées).${stockDetail}`,
      icon: window.ICONS.ban,
      okLabel: 'Annuler le document',
      okStyle: 'danger',
    });
    if (!ok) return;
    try {
      if (d.stockDeducted) {
        const restored = computeStockRestoration(d.lines, _DB.stock, true);
        restored.updatedStock.forEach((s, i) => { _DB.stock[i].qty = s.qty; });
        d.stockDeducted = false;
        docsCtx.save('stock');
        if (stockLines.length)
          docsCtx.toast(`Stock restitué pour ${stockLines.length} article(s)`, 'suc');
      }
      d.status = 'Annulé';
      d.updatedAt = new Date().toISOString();
      docsCtx.save('docs');
      if (typeof renderHistory === 'function') renderHistory();
      docsCtx.buildNotifications();
      docsCtx.toast(`${d.ref} annulé (données conservées)`, '');
    } catch (e) {
      docsCtx.dbgErr('[deleteDoc→annule] Erreur:', e);
      docsCtx.toast("Erreur lors de l'annulation — réessayez", 'err');
    }
    return;
  }

  const stockLines = (d.lines || []).filter(l => l.fromStock);
  const hasStock = stockLines.length > 0 && d.stockDeducted === true;
  const stockDetail = hasStock
    ? `<br><br>Les articles suivants seront <strong>restitués au stock</strong> :<br>${stockLines
        .map(l => {
          const a = _DB.stock.find(x => x.id === l.fromStock);
          const restoreQty =
            typeof l.stockDeductedQty === 'number' ? l.stockDeductedQty : l.qty || 0;
          return `• ${a ? a.name : l.name} : +${restoreQty}`;
        })
        .join('<br>')}`
    : '';
  const ok = await docsCtx.showConfirm({
    title: `Supprimer "${d.ref}" ?`,
    message: `Cette action est <strong>irréversible</strong>.${stockDetail}`,
    icon: window.ICONS.trash,
    okLabel: 'Supprimer',
    okStyle: 'danger',
  });
  if (!ok) return;
  try {
    if (d.stockDeducted) {
      const restored = computeStockRestoration(d.lines, _DB.stock, true);
      restored.updatedStock.forEach((s, i) => { _DB.stock[i].qty = s.qty; });
      docsCtx.save('stock');
      if (stockLines.length) docsCtx.toast(`Stock restitué pour ${stockLines.length} article(s)`, 'suc');
    }
    if (typeof invooSupabaseSoftDelete === 'function') invooSupabaseSoftDelete('docs', id);
    _DB.docs = _DB.docs.filter(x => x.id !== id);
    docsCtx.save('docs');
    if (typeof renderHistory === 'function') renderHistory();
    docsCtx.buildNotifications();
    docsCtx.toast('Document supprimé', 'suc');
  } catch (e) {
    docsCtx.dbgErr('[deleteDoc] Erreur:', e);
    docsCtx.toast('Erreur lors de la suppression — réessayez', 'err');
  }
}

/**
 * Duplique un document : nouvelle référence, statut Brouillon, nouvel ID.
 * @param {string} id - ID du document à dupliquer
 * @returns {void}
 */
export function duplicateDoc(id) {
  const _DB = docsCtx.getDB();
  const d = _DB.docs.find(x => x.id === id);
  if (!d) return;
  const type = d.type;
  const newDoc = {
    ...d,
    id: 'doc_' + Date.now(),
    ref: getNextRef(type),
    status: 'Brouillon',
    date: docsCtx.today(),
    createdAt: new Date().toISOString(),
    stockDeducted: false,
    lines: (d.lines || []).map(l => ({
      ...l,
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    })),
  };
  _DB.docs.unshift(newDoc);
  bumpSeq(type);
  docsCtx.save('docs');
  if (typeof renderHistory === 'function') renderHistory();
  docsCtx.toast('Document dupliqué', 'suc');
}
