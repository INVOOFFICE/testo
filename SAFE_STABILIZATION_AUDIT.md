# SAFE STABILIZATION AUDIT — INVO

> **Statut** : Read-only audit terminé  
> **Date** : 2026-05-14  
> **Objectif** : Identifier les problèmes UI/UX les plus visibles au plus faible risque de régression  
> **Règle** : Aucun code modifié — rapport uniquement

---

## RÉSUMÉ

| Zone | Statut | Décision |
|---|---|---|
| Z-index fragmentation | ⚠️ Fragmented | **Patches ciblés** — 1 par fichier CSS |
| Autocomplete dropdown overflow | ⚠️ Risque coupure | **Patch** — viewport detection |
| Themed select clipping | ⚠️ Risque coupure | **Patch** — repositionnement |
| Mobile sidebar/z-ordering | 🟢 Correct | Aucun patch nécessaire |
| Modal focus management | 🟡 Améliorable | **Patch** simple focus trap |
| Console errors | 🟢 Aucun détecté | Aucun patch nécessaire |
| Navigation timing | 🟢 Déjà fixé | Null guards actifs |
| Offline mode | 🟢 Préservé | Aucun patch nécessaire |

---

## ISSUE #1 — Z-INDEX FRAGMENTATION

### Problème
La pile z-index est fragmentée entre 6 fichiers CSS avec des valeurs arbitraires. `--z-modal: 200` défini dans `layout-shell.css` n'est jamais utilisé ; la valeur réelle est `1000` hardcodée dans `components-core.css`. Aucune échelle documentée unique.

### Valeurs z-index actives

| Élément | Fichier CSS | Valeur |
|---|---|---|
| `#boot-spinner` | index.html (inline) | 99999 |
| `#toast` | app-chrome.css | 9999 |
| `.pdf-spinner-overlay` | surfaces-doc.css | 3000 |
| `#onboarding-overlay` | panels-charts-domain.css | 2000 |
| `#search-panel` | help-search-skeleton.css | 1801 |
| `#search-backdrop` | help-search-skeleton.css | 1800 |
| `.modal-overlay` | components-core.css | 1000 |
| `#notif-panel` | panels-charts-domain.css | 900 |
| `.tselect-menu` | tables-widgets.css | 700 |
| `.ac-dropdown` | app-chrome.css | 600 |
| `#sidebar` (desktop) | layout-shell.css | 100 |
| `#sidebar` (mobile) | responsive.css | 100 |
| `#mob-actions-sheet` | templates-mobile-static.css | 110 |
| `#mob-actions-overlay` | templates-mobile-static.css | 90 |
| `#mob-tabbar` | templates-mobile-static.css | 99 |
| `#mob-fab` | templates-mobile-static.css | 109 |
| `#sidebar-overlay` | layout-shell.css / responsive.css | 99 |
| `#topbar` (mobile sticky) | responsive.css | 80 |
| `.opfs-bar` (mobile sticky) | responsive.css | 79 |

### Fichiers impactés
- `css/components-core.css` (ligne 169) — `.modal-overlay` z-index
- `css/pages/layout-shell.css` (lignes 51-55) — variables `--z-*` inutilisées
- `css/pages/tables-widgets.css` (ligne 238) — `.tselect-menu` z-index
- `css/pages/app-chrome.css` (ligne 405) — `.ac-dropdown` z-index

### Risque
🟢 **Faible** — Les valeurs hardcodées fonctionnent dans la pratique. Aucun conflit visible avéré. Le vrai risque est maintenance future : modifier une valeur sans connaître la pile complète.

### Stratégie de patch minimal
1. Ajouter un commentaire `/* Z-INDEX MASTER SCALE */` en tête de `tokens.css` listant tous les niveaux
2. Ne PAS changer les valeurs — documenter seulement
3. Supprimer `--z-modal: 200` inutilisé de `layout-shell.css`

### Effets secondaires possibles
Aucun — ce sont uniquement des commentaires et nettoyage de variable morte.

---

## ISSUE #2 — AUTOCOMPLETE DROPDOWN OVERFLOW (VIEWPORT)

### Problème
`.ac-dropdown` est positionné en `absolute` sous le champ input avec `max-height: 280px`. Si le champ autocomplete est en bas du viewport (notamment la ligne "Ajouter un article" dans le formulaire de document), le dropdown peut dépasser la fenêtre et être coupé. Aucune logique de flip/direction n'existe.

### Fichiers impactés
- `css/pages/app-chrome.css` (lignes 394-406) — `.ac-dropdown` styles
- `js/docs/doc-lines.js` (lignes 183-186) — création du dropdown

### Racine suspectée
Le dropdown se positionne `top: calc(100% + 5px)` sans vérifier si l'espace restant en bas du viewport est suffisant. Sur mobile, le clavier virtuel peut réduire la hauteur disponible.

### Risque
🟡 **Moyen** — Visible seulement quand :
- L'input autocomplete est dans la moitié inférieure de la page
- La liste de suggestions est longue (> 4-5 éléments)
- Sur mobile avec clavier virtuel ouvert

### Stratégie de patch minimal
Dans `js/docs/doc-lines.js`, lors de l'ouverture du dropdown (`ac-dropdown.classList.add('open')`), ajouter une vérification :

```javascript
const rect = wrap.getBoundingClientRect();
const spaceBelow = window.innerHeight - rect.bottom;
dropdown.style.maxHeight = Math.min(280, Math.max(120, spaceBelow - 10)) + 'px';
// Optionnel : flipper vers le haut si pas assez de place
if (spaceBelow < 200) {
  dropdown.style.top = 'auto';
  dropdown.style.bottom = 'calc(100% + 5px)';
}
```

### Effets secondaires possibles
- Aucun risque de régression : le patch ne fait que contraindre la hauteur max dynamiquement
- Le flip vers le haut est optionnel, commencez par la contrainte de hauteur seulement

---

## ISSUE #3 — THEMED SELECT CLIPPING / OVERFLOW

### Problème
`.tselect-menu` est positionné en `absolute` avec `z-index: 700` mais sans `max-height` explicite. Si le select a beaucoup d'options, le menu peut dépasser le viewport. De plus, le menu n'a pas de gestion de débordement fléché vers le haut.

### Fichiers impactés
- `css/pages/tables-widgets.css` (lignes 233-249) — `.tselect-menu`
- `js/ui.js` (lignes 444-579) — `initThemedSelects`, `refreshThemedSelect`

### Racine suspectée
Aucune logique de positionnement adaptatif dans `initThemedSelects()`. Le menu s'ouvre toujours vers le bas.

### Risque
🟢 **Faible** — La plupart des selects ont peu d'options. Mais dans les formulaires longs (settings, stock), le bas de page peut être affecté.

### Stratégie de patch minimal
Dans `js/ui.js`, fonction `initThemedSelects`, ajouter après l'ouverture du menu :

```javascript
// Ajuster hauteur max au viewport restant
const rect = trigger.getBoundingClientRect();
const spaceBelow = window.innerHeight - rect.bottom;
if (spaceBelow < 200) {
  menu.style.maxHeight = Math.max(120, spaceBelow - 10) + 'px';
} else {
  menu.style.maxHeight = '';
}
```

### Effets secondaires possibles
Aucun. Changement uniquement sur la hauteur max, pas sur le comportement.

---

## ISSUE #4 — MOBILE SIDEBAR / ACTION SHEET Z-ORDERING

### Problème
Sur mobile, le sidebar a `z-index: 100`, la mob-actions-sheet a `z-index: 110`, la mob-actions-overlay a `z-index: 90`. L'overlay (90) est en-dessous du sidebar (100) mais l'actions-sheet (110) est au-dessus. Quand le sidebar est ouvert et que l'utilisateur ouvre l'actions-sheet, l'overlay de l'actions-sheet est partiellement masqué par le sidebar — l'utilisateur voit un mélange des deux couches.

### Fichiers impactés
- `css/pages/templates-mobile-static.css` (lignes 1213-1240)

### Racine suspectée
L'overlay de l'actions-sheet (`z-index: 90`) ne tient pas compte du z-index du sidebar (`z-index: 100`). L'ordre d'ouverture (sidebar d'abord, actions-sheet ensuite) n'est pas géré.

### Risque
🟢 **Faible** — Visible seulement si sidebar ouvert + actions-sheet ouvert simultanément. Dans la pratique, l'actions-sheet se ferme avant d'ouvrir le sidebar.

### Stratégie de patch minimal
Si jamais ce cas est reproductible : fermer le sidebar avant d'ouvrir l'actions-sheet dans `js/ui.js` ou `js/events.js`.

**Alternative plus simple** : Ne rien faire. Le comportement actuel ne pose pas de problème dans le flux utilisateur normal.

---

## ISSUE #5 — MODAL FOCUS MANAGEMENT

### Problème
`showConfirm()` et `openModal()` n'ont pas de focus trap. Le focus reste sur l'élément déclencheur ou se perd dans le body. Les utilisateurs clavier peuvent tabber en dehors de la modale. Le focus n'est pas restauré à la fermeture.

### Fichiers impactés
- `js/ui.js` (lignes 262-340) — `showConfirm`, `openModal`, `closeModal`

### Racine suspectée
Les fonctions modales sont anciennes et n'ont jamais eu de gestion de focus.

### Risque
🟢 **Faible** pour les utilisateurs souris/tactile. 🟡 **Moyen** pour l'accessibilité clavier.

### Stratégie de patch minimal
Dans `openModal()` :
```javascript
// Sauvegarder l'élément聚焦 avant ouverture
const previousFocus = document.activeElement;
overlay._previousFocus = previousFocus;
// Focus le premier élément interactif dans la modale
const firstFocusable = overlay.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
if (firstFocusable) firstFocusable.focus();
```

Dans `closeModal()` (ou le handler de fermeture) :
```javascript
// Restaurer le focus
const prev = overlay._previousFocus;
if (prev && typeof prev.focus === 'function') prev.focus();
```

### Effets secondaires possibles
Aucun. Changement minimal, n'affecte que le focus.

---

## ISSUE #6 — NOTIF PANEL Z-INDEX SUR MOBILE

### Problème
Sur mobile, `#notif-panel` garde `z-index: 900` mais n'ajuste pas son comportement. Avec un topbar sticky (z: 80) et sidebar overlay, le panneau de notifications peut apparaître dans des contextes inattendus.

### Fichiers impactés
- `css/pages/responsive.css` (lignes 348-355) — #notif-panel mobile
- `css/pages/panels-charts-domain.css` (ligne 52) — z-index: 900

### Racine suspectée
Le responsive.css ajoute `position: fixed` adapté au mobile mais ne change pas le z-index.

### Risque
🟢 **Faible** — Le notif panel est au-dessus de tout sauf modals, search, onboarding. C'est correct. Mais à noter qu'il est au-dessus du sidebar mobile (z: 100).

### Stratégie de patch minimal
Aucun patch nécessaire pour l'instant. Documenter dans le master audit.

---

## PRIORITÉS DE PATCH

| Priorité | Issue | Risque | Fichiers à modifier | Lignes de code |
|---|---|---|---|---|
| **1** | Issue #1 — Z-index documentation | 🟢 Faible | `tokens.css`, `layout-shell.css` | ~5 lignes (commentaires) |
| **2** | Issue #2 — Autocomplete viewport | 🟡 Moyen | `js/docs/doc-lines.js` | ~8 lignes |
| **3** | Issue #3 — Themed select overflow | 🟢 Faible | `js/ui.js` | ~6 lignes |
| **4** | Issue #5 — Modal focus | 🟢 Faible | `js/ui.js` | ~8 lignes |
| — | Issue #4 — Mobile z-ordering | 🟢 Aucun | Aucun | Reporté |
| — | Issue #6 — Notif panel mobile | 🟢 Aucun | Aucun | Reporté |

---

## CHECKLIST AVANT CHAQUE PATCH

- [ ] npm run lint (0 erreurs)
- [ ] npm test (182/182)
- [ ] npm run typecheck
- [ ] Test manuel : navigation toutes les pages
- [ ] Test manuel : desktop (1920×1080)
- [ ] Test manuel : mobile (375×667)
- [ ] Test manuel : modales et dropdowns
- [ ] Test manuel : mode offline (déconnecter réseau)
- [ ] Aucune erreur console
- [ ] Aucune régression UI visible

---

**Prochaines étapes** : Appliquer les patches dans l'ordre de priorité ci-dessus, 1 patch = 1 commit.
