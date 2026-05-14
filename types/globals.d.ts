/**
 * Définitions de types globaux pour INVO.
 * Utilisé pour la vérification TypeScript avec --checkJs.
 */

interface DocLine {
  id: string;
  name: string;
  qty: number;
  price: number;
  tva: number;
  fromStock?: string;
  stockDeductedQty?: number;
}

type DocType = 'F' | 'D' | 'BL' | 'AV';
type DocStatus = 'Brouillon' | 'Envoyé' | 'Payé' | 'Annulé' | 'Converti';

interface Doc {
  id: string;
  ref: string;
  type: DocType;
  status: DocStatus;
  date: string;
  clientId: string;
  clientName: string;
  terms?: string;
  payment?: string;
  notes?: string;
  remise?: number;
  acompte?: number;
  sourceRef?: string;
  sourceId?: string;
  sourceType?: string;
  convertedToRef?: string;
  convertedToId?: string;
  priceMode?: 'HT' | 'TTC';
  lines: DocLine[];
  tvaByRate?: Record<string, { ht: number; tva: number; ttc: number }>;
  aeExempt?: boolean;
  stockDeducted?: boolean;
  ht: number;
  tva: number;
  ttc: number;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  ice?: string;
}

interface StockItem {
  id: string;
  name: string;
  qty: number;
  price?: number;
  tva?: number;
}

interface AppState {
  docLines: DocLine[];
  histPage: number;
  histPerPage: number;
  _histMoreMenuBound?: boolean;
  docPriceMode?: 'HT' | 'TTC';
}

interface DBSnapshot {
  settings: Record<string, unknown> & {
    currency?: string;
    tva?: number;
    ice?: string;
    seqF?: number;
    seqD?: number;
    seqBL?: number;
    seqAV?: number;
    globalPriceMode?: 'HT' | 'TTC';
  };
  clients: Client[];
  stock: StockItem[];
  docs: Doc[];
  fournisseurs: unknown[];
  bonsCommande: unknown[];
  stockMoves: unknown[];
}

interface DocsContext {
  getDB: () => DBSnapshot;
  getAPP: () => AppState;
  setAPP: (v: Partial<AppState>) => void;
  fmt: (n: number) => string;
  clearChildren: (el: Element) => void;
  nav: (id: string, el?: Element) => void;
  sbItem: (pageId: string) => Element | null;
  save: (key: string) => void;
  toast: (msg: string, type?: string) => void;
  showConfirm: (opts: {
    title: string;
    message: string;
    icon?: string;
    okLabel?: string;
    okStyle?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
  today: () => string;
  yyyy: () => number;
  pad: (n: number, w?: number) => string;
  buildNotifications: () => void;
  isAutoEntrepreneurVAT: () => boolean;
  getGlobalPriceMode: () => 'HT' | 'TTC';
  normalizePriceMode: (v: unknown) => 'HT' | 'TTC';
  refreshThemedSelect: (id: string) => void;
  dbgErr: (...args: unknown[]) => void;
}

declare var DB: DBSnapshot;
declare var APP: AppState;

declare function fmt(n: number): string;
declare function clearChildren(el: Element): void;
declare function nav(id: string, el?: Element): void;
declare function sbItem(pageId: string): Element | null;
declare function save(key: string): void;
declare function toast(msg: string, type?: string): void;
declare function showConfirm(opts: {
  title: string;
  message: string;
  icon?: string;
  okLabel?: string;
  okStyle?: string;
  cancelLabel?: string;
}): Promise<boolean>;
declare function today(): string;
declare function yyyy(): number;
declare function pad(n: number, w?: number): string;
declare function buildNotifications(): void;
declare function isAutoEntrepreneurVAT(): boolean;
declare function getGlobalPriceMode(): 'HT' | 'TTC';
declare function normalizePriceMode(v: unknown): 'HT' | 'TTC';
declare function refreshThemedSelect(id: string): void;
declare function dbgErr(...args: unknown[]): void;
declare function renderHistory(): void;
