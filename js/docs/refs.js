/**
 * Gestion des références document et compteurs de séquence.
 * @module docs/refs
 */

import { docsCtx } from './context.js';

/**
 * Trouve le numéro de séquence maximum existant pour un type et une année donnés.
 * @param {string} type - Type de document (F, D, BL, AV)
 * @param {number} year - Année
 * @returns {number} Numéro max trouvé, 0 si aucun
 */
export function maxSeqFromExistingRefs(type, year) {
  const re = new RegExp('^' + type + '-' + year + '-(\\d+)$');
  let max = 0;
  for (const d of docsCtx.getDB().docs || []) {
    if (d.type !== type) continue;
    const m = String(d.ref || '').match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return max;
}

/**
 * Extrait le numéro de séquence d'une référence au format standard (TYPE-ANNEE-NUM).
 * @param {string} type - Type de document
 * @param {string} ref - Référence à parser
 * @returns {number|null} Numéro de séquence ou null si format non valide
 */
export function parseDocRefNum(type, ref) {
  const yr = docsCtx.yyyy();
  const re = new RegExp('^' + type + '-' + yr + '-(\\d+)$');
  const m = String(ref || '')
    .trim()
    .match(re);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Vérifie si une référence existe déjà dans la base de documents.
 * @param {string} ref - Référence à vérifier
 * @returns {boolean} True si la référence existe
 */
export function docRefExistsGlobally(ref) {
  const r = String(ref || '').trim();
  if (!r) return false;
  return docsCtx.getDB().docs.some(d => d.ref === r);
}

/**
 * Génère la prochaine référence unique pour un type de document.
 * Utilise à la fois le compteur séquentiel et vérifie les références existantes.
 * @param {string} type - Type de document (F, D, BL, AV)
 * @returns {string} Référence formatée (ex: "F-2026-0001")
 */
export function getNextRef(type) {
  const _DB = docsCtx.getDB();
  const yr = docsCtx.yyyy();
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  const seqNext = (seqKey && (_DB.settings[seqKey] || 1)) || 1;
  const maxE = maxSeqFromExistingRefs(type, yr);
  const n = Math.max(maxE + 1, seqNext);
  return `${type}-${yr}-${docsCtx.pad(n)}`;
}

/**
 * Synchronise le compteur de séquence à partir du max trouvé dans les documents existants.
 * Persiste le nouveau compteur dans les settings.
 * @param {string} type - Type de document
 * @returns {void}
 */
export function syncSeqCounterFromDocs(type) {
  const _DB = docsCtx.getDB();
  const yr = docsCtx.yyyy();
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  if (!seqKey) return;
  const maxE = maxSeqFromExistingRefs(type, yr);
  const cur = _DB.settings[seqKey] || 1;
  _DB.settings[seqKey] = Math.max(maxE + 1, cur);
  docsCtx.save('settings');
}

/**
 * Applique une référence séquentielle unique pour un nouveau document.
 * Génère automatiquement si vide, ajuste si doublon, avertit si numéro trop petit.
 * @param {string} type - Type de document
 * @returns {void}
 */
export function applyUniqueSequentialRef(type) {
  const refEl = document.getElementById('doc-ref');
  const ref = (refEl?.value || '').trim();
  const yr = docsCtx.yyyy();
  const maxE = maxSeqFromExistingRefs(type, yr);
  const exists = docRefExistsGlobally(ref);
  const parsed = parseDocRefNum(type, ref);
  const seqKey = { F: 'seqF', D: 'seqD', BL: 'seqBL', AV: 'seqAV' }[type];
  const seqNext = (seqKey && docsCtx.getDB().settings[seqKey]) || 1;
  const minRequired = Math.max(maxE + 1, seqNext);

  // Ref vide → générer automatiquement
  if (!ref) {
    const nextRef = getNextRef(type);
    if (refEl) refEl.value = nextRef;
    hideDocRefHint();
    return;
  }

  // Ref déjà utilisée dans les docs → refuser, générer une nouvelle
  if (exists) {
    const nextRef = getNextRef(type);
    if (refEl) refEl.value = nextRef;
    showDocRefHint(`Référence déjà utilisée → ajustée en ${nextRef}`, true);
    docsCtx.toast(`Référence ajustée : ${nextRef} (doublon détecté)`, '');
    return;
  }

  // Ref au format standard mais numéro trop petit → avertir, conserver la saisie
  if (parsed !== null && parsed < minRequired) {
    showDocRefHint(`Numéro inférieur au minimum conseillé (${minRequired}). Référence conservée.`, true);
    return;
  }

  // Ref personnalisée valide (format libre ou numéro correct) → accepter
  if (parsed === null && ref) {
    showDocRefHint('Référence personnalisée acceptée', false);
  } else {
    hideDocRefHint();
  }
}

/**
 * Met à jour le champ référence du formulaire avec la prochaine référence séquentielle.
 * @returns {void}
 */
export function updateDocRef() {
  const type = document.getElementById('doc-type')?.value;
  if (type) {
    document.getElementById('doc-ref').value = getNextRef(type);
    hideDocRefHint();
  }
}

/**
 * Cache l'indicateur de validation de référence.
 * @returns {void}
 */
export function hideDocRefHint() {
  const h = document.getElementById('doc-ref-hint');
  if (!h) return;
  h.textContent = '';
  h.style.display = 'none';
}

/**
 * Affiche un indicateur de validation de référence.
 * @param {string} msg - Message à afficher
 * @param {boolean} isError - Si true, affiche en couleur erreur
 * @returns {void}
 */
export function showDocRefHint(msg, isError) {
  const h = document.getElementById('doc-ref-hint');
  if (!h) return;
  h.textContent = msg;
  h.style.color = isError ? 'var(--danger,#e53935)' : 'var(--success,#2e7d32)';
  h.style.display = 'block';
}

/**
 * Incrémente le compteur de séquence pour un type de document.
 * Alias de syncSeqCounterFromDocs.
 * @param {string} type - Type de document
 * @returns {void}
 */
export function bumpSeq(type) {
  syncSeqCounterFromDocs(type);
}
