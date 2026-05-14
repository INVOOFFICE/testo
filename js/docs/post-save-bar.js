// Post-save action bar UI.

import { docsCtx } from './context.js';

export function showPostSaveActions(doc, stockDeductedCount = 0) {
  const old = document.getElementById('post-save-bar');
  if (old) {
    clearTimeout(old._timer);
    old.remove();
  }
  const typeLabel =
    { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' }[doc.type] || doc.type;
  const statusColor =
    { Payé: 'var(--brand)', Envoyé: '#2563eb', Brouillon: 'var(--text2)', Annulé: 'var(--danger)' }[
      doc.status
    ] || 'var(--text2)';
  const bar = document.createElement('div');
  bar.id = 'post-save-bar';
  const _isMob = window.innerWidth <= 768;
  bar.style.cssText = `position:fixed;bottom:${_isMob ? '60px' : '0'};left:${_isMob ? '0' : 'var(--sidebar-w)'};right:0;z-index:800;background:var(--surface);border-top:2px solid var(--brand);padding:${_isMob ? '10px 12px' : '12px 24px'};display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(0,0,0,.1)`;
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:200px';
  const ic = document.createElement('span');
  ic.style.fontSize = '22px';
  ic.innerHTML =
    {
      F: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
      D: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
      BL: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      AV: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>',
    }[doc.type] ||
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>';
  const col = document.createElement('div');
  const t1 = document.createElement('div');
  t1.style.cssText = 'font-weight:700;font-size:14px';
  t1.textContent = `${doc.ref || ''} — ${typeLabel}`;
  const t2 = document.createElement('div');
  t2.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px';
  const sub = document.createElement('span');
  sub.style.cssText = 'font-size:12px;color:var(--text2)';
  sub.appendChild(document.createTextNode(`${doc.clientName || ''} · `));
  const st = document.createElement('span');
  st.style.color = statusColor;
  st.style.fontWeight = '600';
  st.textContent = doc.status || '';
  sub.appendChild(st);
  sub.appendChild(document.createTextNode(` · ${docsCtx.fmt(doc.ttc)}`));
  t2.appendChild(sub);
  if (stockDeductedCount > 0) {
    const bd = document.createElement('span');
    bd.style.cssText =
      'display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(9,188,138,0.12);color:var(--brand);border:1px solid rgba(9,188,138,0.25)';
    bd.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:text-bottom;margin-right:3px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Stock mis à jour — ${stockDeductedCount} article${stockDeductedCount > 1 ? 's' : ''} déduit${stockDeductedCount > 1 ? 's' : ''}`;
    t2.appendChild(bd);
  }
  col.appendChild(t1);
  col.appendChild(t2);
  left.appendChild(ic);
  left.appendChild(col);
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const bHist = document.createElement('button');
  bHist.className = 'btn btn-secondary btn-sm';
  bHist.setAttribute('data-action', 'ps-open-history');
  bHist.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Historique';
  const bEd = document.createElement('button');
  bEd.className = 'btn btn-secondary btn-sm';
  bEd.setAttribute('data-action', 'ps-edit-doc');
  bEd.setAttribute('data-id', encodeURIComponent(String(doc.id || '')));
  bEd.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Modifier';
  const bCl = document.createElement('button');
  bCl.setAttribute('data-action', 'ps-close');
  bCl.style.cssText =
    'background:none;border:none;cursor:pointer;font-size:18px;color:var(--text2);padding:4px 8px';
  bCl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  actions.appendChild(bHist);
  actions.appendChild(bEd);
  actions.appendChild(bCl);
  bar.appendChild(left);
  bar.appendChild(actions);
  bar
    .querySelector('[data-action="ps-open-history"]')
    ?.addEventListener('click', () => docsCtx.nav('history', docsCtx.sbItem('history')));
  bar.querySelector('[data-action="ps-edit-doc"]')?.addEventListener('click', e => {
    const id = decodeURIComponent(e.currentTarget.getAttribute('data-id') || '');
    window.editDocFromHistory(id);
  });
  bar.querySelector('[data-action="ps-close"]')?.addEventListener('click', closePostSaveBar);
  document.getElementById('main').appendChild(bar);
  bar._timer = setTimeout(closePostSaveBar, 12000);
}

export function closePostSaveBar() {
  const bar = document.getElementById('post-save-bar');
  if (!bar) return;
  clearTimeout(bar._timer);
  bar.style.transform = 'translateY(100%)';
  setTimeout(() => bar.remove(), 300);
}

export function showConvertSuccessBar(invoice, sourceDevis) {
  const old = document.getElementById('post-save-bar');
  if (old) {
    clearTimeout(old._timer);
    old.remove();
  }
  const bar = document.createElement('div');
  bar.id = 'post-save-bar';
  const _isMob2 = window.innerWidth <= 768;
  const invoiceIdJson = JSON.stringify(String(invoice.id || ''));
  bar.style.cssText = `position:fixed;bottom:${_isMob2 ? '60px' : '0'};left:${_isMob2 ? '0' : 'var(--sidebar-w)'};right:0;z-index:800;background:var(--surface);border-top:2px solid var(--brand);padding:${_isMob2 ? '10px 12px' : '12px 24px'};display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(0,0,0,.1)`;
  const cLeft = document.createElement('div');
  cLeft.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:200px';
  const cIc = document.createElement('span');
  cIc.style.fontSize = '22px';
  cIc.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const cCol = document.createElement('div');
  const cT1 = document.createElement('div');
  cT1.style.cssText = 'font-weight:700;font-size:14px';
  cT1.textContent = `Conversion réussie — ${invoice.ref || ''}`;
  const cT2 = document.createElement('div');
  cT2.style.cssText = 'font-size:12px;color:var(--text2)';
  cT2.textContent = `Créée depuis ${sourceDevis.ref || ''} · ${invoice.clientName || ''} · ${docsCtx.fmt(invoice.ttc)}`;
  cCol.appendChild(cT1);
  cCol.appendChild(cT2);
  cLeft.appendChild(cIc);
  cLeft.appendChild(cCol);
  const cAct = document.createElement('div');
  cAct.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
  const bInv = document.createElement('button');
  bInv.className = 'btn btn-primary btn-sm';
  bInv.setAttribute('data-action', 'ps-open-invoice');
  bInv.setAttribute('data-id', encodeURIComponent(String(invoice.id || '')));
  bInv.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Ouvrir la facture';
  const bH2 = document.createElement('button');
  bH2.className = 'btn btn-secondary btn-sm';
  bH2.setAttribute('data-action', 'ps-open-history');
  bH2.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:text-bottom;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Historique';
  const bX = document.createElement('button');
  bX.setAttribute('data-action', 'ps-close');
  bX.style.cssText =
    'background:none;border:none;cursor:pointer;font-size:18px;color:var(--text2);padding:4px 8px';
  bX.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  cAct.appendChild(bInv);
  cAct.appendChild(bH2);
  cAct.appendChild(bX);
  bar.appendChild(cLeft);
  bar.appendChild(cAct);
  bar.querySelector('[data-action="ps-open-invoice"]')?.addEventListener('click', e => {
    const id = decodeURIComponent(e.currentTarget.getAttribute('data-id') || '');
    window.editDocFromHistory(id);
    closePostSaveBar();
  });
  bar.querySelector('[data-action="ps-open-history"]')?.addEventListener('click', () => {
    docsCtx.nav('history', docsCtx.sbItem('history'));
    closePostSaveBar();
  });
  bar.querySelector('[data-action="ps-close"]')?.addEventListener('click', closePostSaveBar);
  document.getElementById('main').appendChild(bar);
  bar._timer = setTimeout(closePostSaveBar, 15000);
}
