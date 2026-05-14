// History table and mobile card rendering.

import { getHistFiltered } from './history-filters.js';
import { docsCtx } from './context.js';

export function renderHistory() {
  const feedback = document.getElementById('hist-feedback');
  const setFeedback = msg => {
    if (feedback) feedback.textContent = msg;
  };
  const _DB = docsCtx.getDB();
  const _APP = docsCtx.getAPP();
  const docs = getHistFiltered();
  const total = docs.length;
  const maxPage = total > 0 ? Math.max(1, Math.ceil(total / _APP.histPerPage)) : 1;
  if (_APP.histPage > maxPage) _APP.histPage = maxPage;
  if (_APP.histPage < 1) _APP.histPage = 1;
  const setEl = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setEl('hist-kpi-total', _DB.docs.length);
  setEl(
    'hist-kpi-paid',
    docsCtx.fmt(_DB.docs.filter(d => d.status === 'Payé').reduce((s, d) => s + (d.ttc || 0), 0)),
  );
  setEl(
    'hist-kpi-sent',
    docsCtx.fmt(_DB.docs.filter(d => d.status === 'Envoyé').reduce((s, d) => s + (d.ttc || 0), 0)),
  );
  setEl('hist-kpi-draft', _DB.docs.filter(d => d.status === 'Brouillon').length);
  const start = (_APP.histPage - 1) * _APP.histPerPage;
  const page = docs.slice(start, start + _APP.histPerPage);
  const tbody = document.getElementById('history-tbody');
  const pagEl = document.getElementById('hist-pagination');
  if (!tbody) return;
  tbody.setAttribute('aria-busy', 'true');
  setFeedback('Mise a jour de la liste...');
  if (!docs.length) {
    docsCtx.clearChildren(tbody);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.style.cssText = 'text-align:center;padding:30px;color:var(--text2)';
    td.textContent = 'Aucun document ne correspond aux filtres actuels.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    if (pagEl) docsCtx.clearChildren(pagEl);
    const mobEmpty = document.getElementById('mob-history-list');
    if (mobEmpty) docsCtx.clearChildren(mobEmpty);
    tbody.setAttribute('aria-busy', 'false');
    setFeedback('Aucun resultat.');
    return;
  }
  const typeLabel = { F: 'Facture', D: 'Devis', BL: 'Bon de Livraison', AV: 'Avoir' };
  const statusClass = {
    Brouillon: 'draft',
    Envoyé: 'sent',
    Payé: 'paid',
    Annulé: 'cancelled',
    Converti: 'devis',
  };
  const nextStatusLabel = { Brouillon: '→ Envoyé', Envoyé: '→ Payé' };
  const closeHistMoreMenus = () => {
    document.querySelectorAll('.hist-more-menu.open').forEach(m => m.classList.remove('open'));
    document
      .querySelectorAll('.hist-more-wrap > .btn[aria-haspopup="menu"]')
      .forEach(b => b.setAttribute('aria-expanded', 'false'));
  };
  docsCtx.clearChildren(tbody);
  const frag = document.createDocumentFragment();
  if (!_APP._histMoreMenuBound) {
    document.addEventListener('click', e => {
      const keepOpen = e.target.closest('.hist-more-wrap');
      if (keepOpen) return;
      closeHistMoreMenus();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeHistMoreMenus();
    });
    _APP._histMoreMenuBound = true;
  }
  page.forEach(d => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    const refSp = document.createElement('span');
    refSp.className = 'hist-doc-ref';
    refSp.textContent = d.ref || '';
    td0.appendChild(refSp);
    const sourceType = d.sourceType || (d.type === 'F' && d.sourceRef ? 'D' : '');
    const sourceTitle =
      sourceType === 'F'
        ? 'Issu de la facture'
        : sourceType === 'D'
          ? 'Issu du devis'
          : 'Document source';
    if (d.sourceRef) {
      const lb = document.createElement('span');
      lb.className = 'linked-badge';
      lb.title = `${sourceTitle} ${d.sourceRef}`;
      lb.setAttribute('data-hist-linked-ref', encodeURIComponent(String(d.sourceRef || '')));
      lb.textContent = '↗ ' + (d.sourceRef || '');
      td0.appendChild(lb);
    } else if (d.convertedToRef) {
      const lb = document.createElement('span');
      lb.className = 'linked-badge linked-converted';
      lb.title = `Converti en ${d.convertedToRef}`;
      lb.setAttribute('data-hist-linked-ref', encodeURIComponent(String(d.convertedToRef || '')));
      lb.textContent = '⇒ ' + (d.convertedToRef || '');
      td0.appendChild(lb);
    }
    tr.appendChild(td0);
    const tdDate = document.createElement('td');
    tdDate.textContent = d.date || '';
    tr.appendChild(tdDate);
    const tdTyp = document.createElement('td');
    const typBadge = document.createElement('span');
    typBadge.className =
      'badge ' +
      (d.type === 'D' ? 'devis' : d.type === 'BL' ? 'bl' : d.type === 'AV' ? 'avoir' : '');
    typBadge.textContent = typeLabel[d.type] || d.type || '';
    tdTyp.appendChild(typBadge);
    tr.appendChild(tdTyp);
    const tdSt = document.createElement('td');
    const stWrap = document.createElement('div');
    stWrap.className = 'hist-status-wrap';
    const stBadge = document.createElement('span');
    stBadge.className = 'badge ' + (statusClass[d.status] || 'draft');
    stBadge.textContent = d.status || '';
    stWrap.appendChild(stBadge);
    if (nextStatusLabel[d.status]) {
      const qb = document.createElement('button');
      qb.className = 'hist-quick-status';
      qb.setAttribute('data-action', 'hist-quick-status');
      qb.setAttribute('data-id', encodeURIComponent(String(d.id || '')));
      qb.textContent = nextStatusLabel[d.status];
      stWrap.appendChild(qb);
    }
    tdSt.appendChild(stWrap);
    tr.appendChild(tdSt);
    const tdCli = document.createElement('td');
    tdCli.textContent = d.clientName || 'N/A';
    tr.appendChild(tdCli);
    const tdHt = document.createElement('td');
    tdHt.className = 'hist-num';
    tdHt.textContent = docsCtx.fmt(d.ht);
    tr.appendChild(tdHt);
    const tdTtc = document.createElement('td');
    tdTtc.className = 'hist-num';
    tdTtc.textContent = docsCtx.fmt(d.ttc);
    tr.appendChild(tdTtc);
    const tdReste = document.createElement('td');
    const reste = (d.ttc || 0) - (d.acompte || 0);
    if (d.status === 'Payé') {
      const s = document.createElement('span');
      s.className = 'hist-rest-sold hist-num';
      s.innerHTML = window.ICONS.checkCircle + ' Soldé';
      tdReste.appendChild(s);
    } else if (reste > 0) {
      const s = document.createElement('span');
      s.className = 'hist-rest-pending hist-num';
      s.textContent = docsCtx.fmt(reste);
      tdReste.appendChild(s);
    } else {
      const s = document.createElement('span');
      s.className = 'hist-rest-ok';
      s.innerHTML = window.ICONS.checkCircle;
      tdReste.appendChild(s);
    }
    tr.appendChild(tdReste);
    const tdAct = document.createElement('td');
    tdAct.className = 'hist-actions-cell';
    const act = document.createElement('div');
    act.className = 'hist-actions';
    const enc = encodeURIComponent(String(d.id || ''));
    const addAct = (cls, tit, tx, st, an) => {
      const b = document.createElement('button');
      b.className = cls;
      if (tit) b.title = tit;
      if (tit) b.setAttribute('aria-label', tit);
      b.innerHTML = tx;
      if (st) b.style.cssText = st;
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      return b;
    };

    const bEdit = addAct('btn btn-icon btn-secondary btn-sm', 'Modifier', window.ICONS.edit, null, 'hist-edit-doc');
    act.appendChild(bEdit);
    if (nextStatusLabel[d.status]) {
      const bQuick = addAct(
        'btn btn-icon btn-secondary btn-sm',
        'Changer le statut',
        window.ICONS.refreshCw,
        null,
        'hist-quick-status',
      );
      act.appendChild(bQuick);
    }

    const bDownload = addAct('btn btn-icon btn-secondary btn-sm', 'Télécharger le PDF', window.ICONS.download, null, 'hist-download-doc');
    const bWhatsApp = addAct('btn btn-icon btn-secondary btn-sm', 'Envoyer via WhatsApp', window.ICONS.circle, null, 'hist-wa-doc');
    const bDuplicate = addAct('btn btn-icon btn-secondary btn-sm', 'Dupliquer', window.ICONS.files, null, 'hist-duplicate-doc');
    act.appendChild(bDownload);
    act.appendChild(bWhatsApp);
    act.appendChild(bDuplicate);

    if (d.type === 'D' && d.status !== 'Converti') {
      const bConvert = addAct('btn btn-icon btn-secondary btn-sm', 'Convertir en facture', window.ICONS.zap, null, 'hist-convert');
      act.appendChild(bConvert);
    }
    if (d.type === 'F' && d.status === 'Annulé') {
      const bAvoir = addAct('btn btn-icon btn-secondary btn-sm', 'Créer un avoir', window.ICONS.rotateCcw, null, 'hist-create-avoir');
      act.appendChild(bAvoir);
    }
    if ((d.type === 'F' || d.type === 'BL') && d.status !== 'Annulé' && d.status !== 'Brouillon') {
      const bCancel = addAct('btn btn-icon btn-secondary btn-sm', 'Annuler (retour stock)', window.ICONS.closeX, null, 'hist-cancel-doc');
      act.appendChild(bCancel);
    }

    const delX = d.type === 'F' || d.type === 'BL' || d.type === 'AV' ? 'Annuler document' : 'Supprimer';
    const bDelete = addAct('btn btn-icon btn-secondary btn-sm', delX, window.ICONS.trash, null, 'hist-delete-doc');
    bDelete.classList.add('danger');
    act.appendChild(bDelete);
    tdAct.appendChild(act);
    tr.appendChild(tdAct);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  let mobHist = document.getElementById('mob-history-list');
  if (!mobHist) {
    mobHist = document.createElement('div');
    mobHist.id = 'mob-history-list';
    mobHist.className = 'mob-card-list';
    const wrap = document.querySelector('#page-history .tbl-wrap');
    if (wrap) wrap.after(mobHist);
  }
  docsCtx.clearChildren(mobHist);
  const mobFrag = document.createDocumentFragment();
  page.forEach(d => {
    const enc = encodeURIComponent(String(d.id || ''));
    const card = document.createElement('div');
    card.className = 'mob-card';
    const hdr = document.createElement('div');
    hdr.className = 'mob-card-header';
    const ttl = document.createElement('div');
    ttl.className = 'mob-card-title';
    ttl.textContent = d.ref || '';
    const sb = document.createElement('span');
    sb.className = 'badge ' + (statusClass[d.status] || 'draft');
    sb.textContent = d.status || '';
    hdr.appendChild(ttl);
    hdr.appendChild(sb);
    card.appendChild(hdr);
    const row = (lab, val) => {
      const r = document.createElement('div');
      r.className = 'mob-card-row';
      const l = document.createElement('span');
      l.className = 'mob-card-label';
      l.textContent = lab;
      const v = document.createElement('span');
      v.className = 'mob-card-val';
      v.appendChild(val);
      r.appendChild(l);
      r.appendChild(v);
      card.appendChild(r);
    };
    const typeBadgeCls =
      d.type === 'D' ? 'devis' : d.type === 'BL' ? 'bl' : d.type === 'AV' ? 'avoir' : '';
    const tb = document.createElement('span');
    tb.className = 'badge ' + typeBadgeCls;
    tb.textContent = typeLabel[d.type] || d.type || '';
    row('Type', tb);
    row('Client', document.createTextNode(d.clientName || 'Non renseigne'));
    row('Date', document.createTextNode(d.date || ''));
    const ttcN = document.createElement('span');
    ttcN.style.color = 'var(--teal)';
    ttcN.textContent = docsCtx.fmt(d.ttc);
    row('Total TTC', ttcN);
    const mAct = document.createElement('div');
    mAct.className = 'mob-card-actions';
    const mb = (txt, an, st) => {
      const b = document.createElement('button');
      b.className = st || 'btn btn-secondary btn-sm';
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      b.innerHTML = txt;
      return b;
    };
    mAct.appendChild(mb(window.ICONS.edit + " Modifier", 'hist-edit-doc'));
    if (nextStatusLabel[d.status]) mAct.appendChild(mb(nextStatusLabel[d.status], 'hist-quick-status'));

    const mMore = document.createElement('details');
    mMore.className = 'mob-card-more';
    const mSum = document.createElement('summary');
    mSum.textContent = "... Plus";
    mMore.appendChild(mSum);
    const mList = document.createElement('div');
    mList.className = 'mob-card-more-list';
    const mbMore = (txt, an, danger = false) => {
      const b = document.createElement('button');
      b.className = danger ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm';
      b.setAttribute('data-action', an);
      b.setAttribute('data-id', enc);
      b.textContent = txt;
      mList.appendChild(b);
    };
    mbMore(window.ICONS.download + " Télécharger PDF", 'hist-download-doc');
    mbMore(window.ICONS.circle + " WhatsApp", 'hist-wa-doc');
    mbMore(window.ICONS.files + " Dupliquer", 'hist-duplicate-doc');
    if (d.type === 'D' && d.status !== 'Converti') mbMore(window.ICONS.zap + " Convertir en Facture", 'hist-convert');
    if (d.type === 'F' && d.status === 'Annulé') mbMore(window.ICONS.rotateCcw + " Créer un avoir", 'hist-create-avoir');
    if ((d.type === 'F' || d.type === 'BL') && d.status !== 'Annulé' && d.status !== 'Brouillon')
      mbMore(window.ICONS.closeX + " Annuler (retour stock)", 'hist-cancel-doc');
    mbMore(d.type === 'F' || d.type === 'BL' || d.type === 'AV' ? window.ICONS.closeX + " Annuler document" : window.ICONS.trash + " Supprimer", 'hist-delete-doc', true);
    mMore.appendChild(mList);
    mAct.appendChild(mMore);
    card.appendChild(mAct);
    mobFrag.appendChild(card);
  });
  mobHist.appendChild(mobFrag);
  const pages = Math.ceil(total / _APP.histPerPage);
  if (pagEl) {
    docsCtx.clearChildren(pagEl);
    for (let i = 0; i < pages; i++) {
      const pn = i + 1;
      const btn = document.createElement('button');
      btn.className = 'pg-btn' + (pn === _APP.histPage ? ' active' : '');
      btn.setAttribute('data-hist-page', String(pn));
      btn.textContent = String(pn);
      btn.addEventListener('click', () => {
        docsCtx.getAPP().histPage = pn;
        renderHistory();
      });
      pagEl.appendChild(btn);
    }
  }
  tbody.querySelectorAll('[data-hist-linked-ref]').forEach(el => {
    el.addEventListener('click', () => {
      const ref = decodeURIComponent(el.getAttribute('data-hist-linked-ref') || '');
      docsCtx.nav('history', docsCtx.sbItem('history'));
      setTimeout(() => {
        const hs = document.getElementById('hist-search');
        if (hs) hs.value = ref;
        renderHistory();
      }, 80);
    });
  });
  tbody.setAttribute('aria-busy', 'false');
  setFeedback(`${total} document(s) affiche(s).`);
}
