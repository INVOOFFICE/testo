/**
 * Setup file for jsdom-based UI tests.
 * Provides global mocks for functions that the modules call as window globals.
 */

// Mock global DOM utilities used by doc-lines.js, docs.js, history-render.js
global.fmtNum = (n) => Number(n || 0).toFixed(2);

global.getEffectiveDocPriceMode = () => global.__mockPriceMode || 'TTC';

global.displayTTCForDocLineMode = (val) => val;

global.appendHighlightedContent = (el, text, _query, _markStyle) => {
  el.textContent = text;
};

global.renderStockPicker = () => {};

// Mock APP / DB globals used by modules
global.APP = {
  docLines: [],
  histPage: 1,
  histPerPage: 20,
  docPriceMode: 'TTC',
};

global.DB = {
  settings: { tva: '20', ice: '123456789012345' },
  clients: [],
  stock: [],
  docs: [],
  fournisseurs: [],
  bonsCommande: [],
  stockMoves: [],
};

global.clearChildren = (el) => {
  if (el) el.innerHTML = '';
};

global.fmt = (n) => Number(n || 0).toFixed(2) + ' DH';

global.today = () => '2026-05-12';

global.yyyy = () => 2026;

global.pad = (n, w) => String(n).padStart(w, '0');

global.save = () => {};

global.toast = () => {};

global.showConfirm = async () => true;

global.nav = () => {};

global.sbItem = () => null;

global.buildNotifications = () => {};

global.dbgErr = () => {};

global.refreshThemedSelect = () => {};

global.isAutoEntrepreneurVAT = () => false;

global.getGlobalPriceMode = () => 'TTC';

global.normalizePriceMode = (v) => (v === 'HT' ? 'HT' : 'TTC');

global.CUR = () => 'DH';
