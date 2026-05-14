/**
 * Contexte et façade pour les modules docs.
 * Centralise l'accès aux globals pour faciliter les tests et la migration TS.
 */

/**
 * @typedef {Object} DocLine
 * @property {string} id - Identifiant unique de la ligne
 * @property {string} name - Nom de l'article
 * @property {number} qty - Quantité
 * @property {number} price - Prix unitaire HT
 * @property {number} tva - Taux TVA (%)
 * @property {string} [fromStock] - ID article stock (si lié)
 * @property {number} [stockDeductedQty] - Quantité déduite du stock
 */

/**
 * @typedef {'F'|'D'|'BL'|'AV'} DocType
 * F=Facture, D=Devis, BL=Bon de Livraison, AV=Avoir
 */

/**
 * @typedef {'Brouillon'|'Envoyé'|'Payé'|'Annulé'|'Converti'} DocStatus
 */

/**
 * @typedef {Object} Doc
 * @property {string} id - Identifiant unique
 * @property {string} ref - Référence document
 * @property {DocType} type - Type de document
 * @property {DocStatus} status - Statut
 * @property {string} date - Date (YYYY-MM-DD)
 * @property {string} clientId - ID client
 * @property {string} clientName - Nom client
 * @property {string} [terms] - Conditions
 * @property {string} [payment] - Mode de paiement
 * @property {string} [notes] - Notes
 * @property {number} [remise] - Remise (%)
 * @property {number} [acompte] - Acompte
 * @property {string} [sourceRef] - Référence document source
 * @property {string} [sourceId] - ID document source
 * @property {string} [sourceType] - Type document source
 * @property {string} [convertedToRef] - Référence document converti
 * @property {string} [convertedToId] - ID document converti
 * @property {'HT'|'TTC'} [priceMode] - Mode de prix
 * @property {DocLine[]} lines - Lignes du document
 * @property {Object.<string, {ht: number, tva: number, ttc: number}>} [tvaByRate] - TVA par taux
 * @property {boolean} [aeExempt] - Exempté TVA (auto-entrepreneur)
 * @property {boolean} [stockDeducted] - Stock déduit
 * @property {number} ht - Total HT
 * @property {number} tva - Total TVA
 * @property {number} ttc - Total TTC
 * @property {string} createdAt - Date création ISO
 * @property {string} updatedAt - Date modification ISO
 */

/**
 * @typedef {Object} Client
 * @property {string} id - Identifiant unique
 * @property {string} name - Nom
 * @property {string} [email] - Email
 * @property {string} [phone] - Téléphone
 * @property {string} [ice] - ICE
 */

/**
 * @typedef {Object} StockItem
 * @property {string} id - Identifiant unique
 * @property {string} name - Nom article
 * @property {number} qty - Quantité en stock
 * @property {number} [price] - Prix de vente
 * @property {number} [tva] - Taux TVA
 */

/**
 * @typedef {Object} AppState
 * @property {DocLine[]} docLines - Lignes du document en cours d'édition
 * @property {number} histPage - Page actuelle de l'historique
 * @property {number} histPerPage - Nombre d'items par page dans l'historique
 * @property {boolean} [_histMoreMenuBound] - Flag pour l'event listener du menu
 * @property {'HT'|'TTC'} [docPriceMode] - Mode de prix actuel
 */

/**
 * @typedef {Object} DBSnapshot
 * @property {Object} settings - Paramètres
 * @property {Client[]} clients - Clients
 * @property {StockItem[]} stock - Stock
 * @property {Doc[]} docs - Documents
 * @property {Object[]} fournisseurs - Fournisseurs
 * @property {Object[]} bonsCommande - Bons de commande
 * @property {Object[]} stockMoves - Mouvements de stock
 */

/**
 * @typedef {Object} DocsContext
 * @property {() => DBSnapshot} getDB - Accès aux données
 * @property {() => AppState} getAPP - Accès à l'état app
 * @property {(v: AppState) => void} setAPP - Met à jour l'état app
 * @property {(n: number) => string} fmt - Formatage monétaire
 * @property {(el: Element) => void} clearChildren - Vide un élément DOM
 * @property {(id: string, el?: Element) => void} nav - Navigation
 * @property {(pageId: string) => Element|null} sbItem - Élément sidebar
 * @property {(key: string) => void} save - Persiste les données
 * @property {(msg: string, type?: string) => void} toast - Notification
 * @property {(opts: {title: string, message: string, icon?: string, okLabel?: string, okStyle?: string, cancelLabel?: string}) => Promise<boolean>} showConfirm - Boîte de confirmation
 * @property {() => string} today - Date du jour (YYYY-MM-DD)
 * @property {() => number} yyyy - Année courante
 * @property {(n: number, w?: number) => string} pad - Zéro fill
 * @property {() => void} buildNotifications - Met à jour les notifications
 * @property {() => boolean} isAutoEntrepreneurVAT - Vérifie si mode AE
 * @property {() => 'HT'|'TTC'} getGlobalPriceMode - Prix mode global
 * @property {(v: unknown) => 'HT'|'TTC'} normalizePriceMode - Normalise le mode
 * @property {(id: string) => void} refreshThemedSelect - Rafraîchit un select thématique
 * @property {(...args: unknown[]) => void} dbgErr - Log erreur debug
 * @property {(id: string) => void} openModal - Ouvre une modale
 * @property {(id: string) => void} closeModal - Ferme une modale
 * @property {() => string} CUR - Devise courante
 */

/**
 * Crée un contexte injectable pour les modules docs.
 * Utilise les globals par défaut, mais peut être mocké pour les tests.
 * @param {Partial<DocsContext>} [overrides] - Surcharges pour tests
 * @returns {DocsContext}
 */
export function createDocsContext(overrides = {}) {
  const ctx = {
    getDB: () => typeof DB !== 'undefined' ? DB : { settings: {}, clients: [], stock: [], docs: [], fournisseurs: [], bonsCommande: [], stockMoves: [] },
    getAPP: () => typeof APP !== 'undefined' ? APP : { docLines: [], histPage: 1, histPerPage: 20 },
    setAPP: (v) => {
      if (typeof APP !== 'undefined') {
        Object.assign(APP, v);
      }
    },
    fmt: (n) => typeof fmt === 'function' ? fmt(n) : `${Number(n || 0).toFixed(2)} DH`,
    clearChildren: (el) => typeof clearChildren === 'function' ? clearChildren(el) : (el?.replaceChildren ? el.replaceChildren() : null),
    nav: (id, el) => typeof nav === 'function' ? nav(id, el) : null,
    sbItem: (pageId) => typeof sbItem === 'function' ? sbItem(pageId) : null,
    save: (key) => typeof save === 'function' ? save(key) : null,
    toast: (msg, type) => typeof toast === 'function' ? toast(msg, type) : console.log('[toast]', type, msg),
    showConfirm: async (opts) => typeof showConfirm === 'function' ? showConfirm(opts) : true,
    today: () => typeof today === 'function' ? today() : new Date().toISOString().split('T')[0],
    yyyy: () => typeof yyyy === 'function' ? yyyy() : new Date().getFullYear(),
    pad: (n, w = 4) => typeof pad === 'function' ? pad(n, w) : String(n).padStart(w, '0'),
    buildNotifications: () => typeof buildNotifications === 'function' ? buildNotifications() : null,
    isAutoEntrepreneurVAT: () => typeof isAutoEntrepreneurVAT === 'function' ? isAutoEntrepreneurVAT() : false,
    getGlobalPriceMode: () => typeof getGlobalPriceMode === 'function' ? getGlobalPriceMode() : 'TTC',
    normalizePriceMode: (v) => typeof normalizePriceMode === 'function' ? normalizePriceMode(v) : (v === 'HT' ? 'HT' : 'TTC'),
    refreshThemedSelect: (id) => typeof refreshThemedSelect === 'function' ? refreshThemedSelect(id) : null,
    dbgErr: (...args) => typeof dbgErr === 'function' ? dbgErr(...args) : console.error('[dbgErr]', ...args),
    openModal: (id) => typeof openModal === 'function' ? openModal(id) : null,
    closeModal: (id) => typeof closeModal === 'function' ? closeModal(id) : null,
    CUR: () => typeof CUR === 'function' ? CUR() : 'DH',
    ...overrides,
  };
  return ctx;
}

/**
 * Contexte global par défaut (utilise les globals window).
 * Pour les tests, utiliser createDocsContext() avec des mocks.
 * @type {DocsContext}
 */
export const docsCtx = createDocsContext();

export default docsCtx;
