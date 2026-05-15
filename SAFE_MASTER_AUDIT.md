# SAFE MASTER AUDIT — INVO

> **Rôle** : Couche de contrôle et sécurité au-dessus de `project-docs/`.
> Consulter AVANT toute modification. NE PAS dupliquer les docs existantes.

---

## 1. ÉTAT GLOBAL DU PROJET

| Indicateur | Valeur | Statut |
|---|---|---|
| Tests | 182/182 — 17 suites | ✅ PASS |
| ESLint | 0 erreurs | ✅ PASS |
| TypeScript (tsc --noEmit) | 0 erreurs | ✅ PASS |
| docs.js | 480 lignes (cible: < 400) | ✅ < 600 |
| ui.js | ~1700 lignes (monolithique) | ⚠️ Dette |
| saveDoc | ~230 lignes, fort couplage DOM | 🔴 Risque |
| Modules extraits | 19 modules | ✅ |
| Vendors économisés | ~1.8MB au chargement | ✅ |
| Cache SW | `invo-v17` | ✅ |
| Couverture tests | ~45% | 🟡 Partiel |

**Architecture** : SPA vanilla ES6, OPFS + localStorage, PWA offline-first, SW cache-first.

**Modules sensibles** : `saveDoc`, `docsCtx`, `ui.js`, `vendor-loader.js`, `sw.js`, `page-templates.js`, `storage.js`, `events.js`.

---

## 2. ZONES CRITIQUES (NE PAS CASSER)

### saveDoc (`js/docs/doc-save.js` + `js/docs.js:249`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🔴 Validation incomplète → données corrompues | `totals.js`, `dgi-checker.js`, `storage.js`, `doc-lines.js` | Déduction stock si "Payé", mise à jour séquences, post-save bar, reset formulaire |
| 🔴 Ordre des opérations incorrect (calculs avant validation) | DOM: #sum-ht, #sum-tva, #sum-ttc, #doc-type, formulaire | Backup auto, notification stock |

### docsCtx (`js/docs/context.js`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🟡 Méthode manquante → crash module consommateur | 19 modules docs/ l'utilisent | Toute la chaîne document |
| 🟡 `getDB()`/`getAPP()` retournent null si window non prêt | `window.DB`, `window.APP` | Toute l'application |

### ui.js (`js/ui.js`, ~1700 lignes)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🔴 `nav()` cassée →导航 morte | `page-templates.js`, `events.js` | Toutes les pages, historique, modales |
| 🔴 `showConfirm()` cassée → modales bloquées | `window.ICONS`, DOM #confirm-modal | Backup, delete, export |
| 🟡 `renderOverview()` → charts | Chart.js (vendor), #ov-chart-container | Dashboard vide |

### vendor-loader.js (`js/vendor-loader.js`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🟡 Promesse non résolue → lib manquante | Chart.js, jsPDF, html2canvas, XLSX | Export PDF/XLSX, graphiques cassés |
| 🟡 Timeout trop court → faux échec | Réseau, SW cache | Toutes les fonctionnalités vendor |

### sw.js (`sw.js`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🔴 CACHE_NAME non incrémenté → vieux cache | 71 fichiers PRECACHE_ASSETS | Utilisateurs voient version obsolète |
| 🔴 `price-mode.js` absent du precache | `PRECACHE_ASSETS[]` | Recalculs HT/TTC cassés offline |
| 🟡 Cache-first trop agressif → stale data | Stratégie fetch | Données jamais rafraîchies |

### Navigation (`nav()` dans `ui.js:384`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🔴 Hash changé sans DOM prêt → null refs | `page-templates.js`, DOMContentLoaded | `calcTotals()` lance TypeError |
| 🟡 Transition trop rapide → état incoérent | `APP.docLines`, #page-container | Document en cours perdu |

### Modal System (`showConfirm()` dans `ui.js`)
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🟡 `textContent` au lieu de `innerHTML` pour titres SVG | `window.ICONS` | SVG affiché comme texte brut |
| 🟡 Focus non restauré → accessibilité cassée | `document.activeElement` | Utilisateurs lecteurs d'écran perdus |

### Global State `window.APP` / `window.DB`
| Risque | Dépendances | Effets secondaires |
|---|---|---|
| 🔴 Mutation directe sans `save()` → perte données | `storage.js` | Données non persistées |
| 🟡 Naming collision (globaux exposés) | Tous les modules | Comportement imprévisible |

---

## 3. RÈGLES OBLIGATOIRES AVANT TOUTE MODIFICATION

- [ ] **Patch minimal** — 1 bug = 1 patch ciblé. Pas de refactor en passant.
- [ ] **Jamais de refactor massif** — Sauf si validé par tests + QA complète.
- [ ] **Ne jamais renommer IDs/classes globales** — `#sum-ht`, `#doc-type`, `.dgi-item` etc. sans audit complet.
- [ ] **Backward compatibility** — Les migrations DB doivent être rétrocompatibles (v13→v14→v15→v16→v17).
- [ ] **Tester desktop + mobile** — Breakpoints: 1024px, 768px, 480px. Bottom tabbar, sidebar overlay.
- [ ] **Vérifier Service Worker** — `CACHE_NAME` incrémenté, nouveau fichier ajouté à `PRECACHE_ASSETS`.
- [ ] **Vérifier timing DOM** — `nav()` peut appeler `calcTotals()` avant que les éléments #sum-* existent.
- [ ] **Vérifier `window.ICONS`** — `page-templates.js` a un polling 2s, mais ne pas présupposer ICONS dispo.
- [ ] **Vérifier null safety** — Tout `document.getElementById()` doit avoir un guard ou optional chaining.
- [ ] **Vérifier OPFS + localStorage fallback** — Ne pas casser le chemin de stockage principal.

---

## 4. SAFE PATCH WORKFLOW

```text
1. IDENTIFIER root cause exacte (console error, test failing, user report)
   → Vérifier dans project-docs/03-KNOWN_ISSUES.md d'abord
2. LISTER fichiers impactés (module + dépendances + tests)
3. ÉVALUER risques (🔴 cassant / 🟡 modéré / 🟢 faible)
4. FAIRE patch minimal (1 seule responsabilité)
5. TESTER avant/après:
   - npm test (182 tests, 17 suites)
   - npm run lint (0 erreurs)
   - npm run typecheck (tsc --noEmit)
6. VÉRIFIER régressions:
   - Navigation toutes les pages (generate, history, overview, clients, stock, settings)
   - CRUD document complet (créer, sauvegarder, modifier, supprimer, dupliquer)
   - Mode offline (déconnecter réseau, recharger)
   - Mobile (tabbar, FAB, sidebar swipe)
7. DOCUMENTER rollback:
   - git revert <commit> ou
   - git checkout HEAD~1 -- <fichier>
```

---

## 5. PATTERNS SAFE APPROUVÉS

| Pattern | Usage | Exemple |
|---|---|---|
| **Null guards** | Tout accès DOM | `if (el) el.textContent = val;` |
| **Optional chaining** | Accès propriétés chaînées | `document.getElementById('x')?.value` |
| **Progressive enhancement** | Fonctionnalités non-bloquantes | Chart.js fallback si vendor non chargé |
| **Fallback safe** | Storage | OPFS → localStorage → toast warning |
| **Feature detection** | APIs navigateur | Vérifier OPFS, fetch, serviceWorker avant usage |
| **Defensive DOM access** | Pas de présupposition DOM prêt | `nav()` → null guard sur éléments #sum-* |
| **Batch DOM updates** | Performance | `DocumentFragment` pour listes |
| **Event delegation** | Lists dynamiques | `e.target.closest('[data-action]')` |
| **SVG safe** | innerHTML réservé aux ICONS connus | `el.innerHTML = window.ICONS.save` (pas de user input) |
| **Debounced backup reminder** | UX | Pas de notification si déjà montrée récemment |

---

## 6. ANTI-PATTERNS INTERDITS

| Anti-pattern | Risque | Alternative |
|---|---|---|
| 🔴 Refactor > 50 lignes sans tests | Régression indétectable | Patchs atomiques validés |
| 🔴 Modification CSS globale (tokens, reset) | UI entière cassée | Surcharge ciblée par composant |
| 🔴 Changement architecture sans validation | Refactor à blanc | POC branchée, tests avant/après |
| 🔴 Suppression globaux critiques (`window.APP`, `window.DB`) | Tout cassé | Migration progressive via context.js |
| 🔴 Changement système navigation (`nav()`) |导航 morte | Extension, pas réécriture |
| 🔴 Réécriture complète `ui.js` | 1700 lignes à réécrire = risques infinis | Extraction modules un par un |
| 🔴 Changements massifs DOM (ids, structure templates) | Tous les sélecteurs cassés | Audit des références, dép recation avec fallback |
| 🔴 innerHTML avec données utilisateur | XSS | `textContent` ou `escapeHtml()` + DOMPurify |
| 🔴 Mutation `window.DB` sans `save()` | Perte données | `setAPP()` / `save()` explicite |

---

## 7. CHECKLIST AVANT COMMIT

- [ ] `npm run lint` — 0 erreurs, 0 warnings
- [ ] `npm run typecheck` — tsc --noEmit passe
- [ ] `npm test` — 182/182 tests, 17 suites
- [ ] `npm run format:check` — Prettier OK
- [ ] Tests manuels desktop : generate, save, history, overview, clients, stock, settings
- [ ] Tests manuels mobile : bottom tabbar navigation, FAB, sidebar swipe
- [ ] Mode offline : déconnecter réseau → recharger → toutes les pages accessibles
- [ ] Aucune erreur console (nicun `[page-templates]`, `[SW]`, `[storage]` erreur)
- [ ] Aucune régression UI (modales, toasts, charts, tableaux)
- [ ] Backward compatibility preservée (migrations DB, pas de breaking change API)
- [ ] `CACHE_NAME` incrémenté dans `sw.js` si nouveau fichier ou modification SW
- [ ] Nouveaux fichiers (JS/CSS) ajoutés à `PRECACHE_ASSETS` dans `sw.js`
- [ ] `window.ICONS` polling OK si `page-templates.js` modifié

---

## 8. PATCH LOG

| Date | Bug / Changement | Fichiers touchés | Risque | Rollback |
|---|---|---|---|---|---|---|
| 2026-05-14 | Onboarding overlay blocks page interactions on nav | ui.js:352-359 | 🟢 | git revert HEAD |
| 2026-05-14 | Rocket icon onboarding literal text | ui.js:1777-1779 | 🟢 | git revert HEAD~1 |
| 2026-05-14 | Fournisseurs pagination NaN | fournisseurs.js:195-202 | 🟢 | git revert a2a6610 |
| 2026-05-14 | Themed select viewport overflow | ui.js:open() | 🟢 | git revert 9448a8d |
| 2026-05-14 | Autocomplete viewport overflow | doc-lines.js:248-250,311-313 | 🟢 | git revert 510c70e |
| 2026-05-15 | Conversion modal — radio/checkbox width:100% causes vertical text | surfaces-doc.css:530-533 | 🟢 | git checkout -- css/pages/surfaces-doc.css |
| 2026-05-15 | Conversion modal — simplify UI, hide options section | index.html:941-965 | 🟢 | git checkout -- index.html |
| 2026-05-15 | Price mode sync — themed select not updating visually | doc-lines.js:76,85 | 🟢 | git checkout -- js/docs/doc-lines.js |
| 2026-05-16 | Post-save bar GPU compositing corruption on mobile Chrome | post-save-bar.js:89,159 | 🟢 | git revert HEAD |
| 2026-05-16 | Z-index master scale documentation + remove dead CSS vars | tokens.css, layout-shell.css:68-72 | 🟢 | git revert HEAD~1 |
| 2026-05-16 | Autocomplete dropdown flip-up when viewport space insufficient | doc-lines.js:191-194,252-263,315-326 | 🟢 | git revert HEAD~2 |
| 2026-05-16 | Modal focus save/restore (accessibility) | ui.js:238-260 | 🟢 | git revert HEAD~3 |
| 2026-05-16 | CACHE_NAME bumped to invo-v19 | sw.js:7 | 🟢 | git checkout -- sw.js |
| 2026-05-16 | Mobile PWA GPU compositing corruption — remove backdrop-filter from off-screen sidebar + add contain:content to #content | responsive.css:33-81 | 🟢 | git checkout -- css/pages/responsive.css |
| 2026-05-16 | CACHE_NAME bumped to invo-v20 | sw.js:7 | 🟢 | git checkout -- sw.js |

<!-- Remplir au fil des modifications. Modèle :
| 2026-05-14 | Null ref calcTotals | totals.js:131-137 | 🟡 | git revert abc123 |
| 2026-05-14 | ICONS undefined | page-templates.js:947-974, sw.js | 🔴 | git revert abc124 |
| 2026-05-14 | SVG text in modals | ui.js:272-280 | 🟡 | git revert abc125 |
| 2026-05-14 | UTF-8 dgi-checker | dgi-checker.js:46,60,71,83 | 🟡 | git revert abc126 |
| 2026-05-14 | Autocomplete viewport overflow | doc-lines.js:248-250,311-313 | 🟢 | git revert 510c70e |
| 2026-05-14 | Themed select viewport overflow | ui.js:open() | 🟢 | git revert 9448a8d |
| 2026-05-14 | Fournisseurs pagination NaN | fournisseurs.js:195-202 | 🟢 | git revert a2a6610 |
-->
