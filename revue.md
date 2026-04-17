# Debt Collector — Revue produit complète

> Tour d'environ une heure de l'app, fait avec Playwright sur le seed `make init-dbs`.
> Trois rôles testés (goddess `meanmal`, sub `sub_chris` + `sub_eli`, admin).
> Captures dans `.review-screenshots/` ; notes brutes dans `.review-notes.md`.
>
> Méthode : je joue tour à tour la déesse BDSM (Mean Mal) et le soumis (Chris / Eli)
> pour repérer ce qui casse l'illusion, ce qui est dangereux, et ce qui rend l'app
> belle. Je classe chaque point en **Bug**, **Manque** ou **À améliorer**.

---

## P0 — Refonte du seed (à faire AVANT le reste)

> Avant de toucher aux 12 bugs ci-dessous, on **refait `make init-dbs`** avec une fake-data crédible "comme si l'app tournait depuis 6 mois en cloud". Sans ça, les tests qualitatifs (KPI, charts, late, planning, journal) restent biaisés.

### Cible casting (figé, pas plus)
| Compte | Rôle | État | Pourquoi |
|---|---|---|---|
| `admin` (`admin+dev@debt-collector.uk`) | admin | active | mot de passe **inchangé** (`bootstrap.py:27`) |
| `meanmal` (`meanmal@debt-collector.uk`) | goddess | active | mot de passe **inchangé** (`bootstrap.py:30`) |
| `sub_chris` | sub | ACTIVE — **modèle "à jour 100 %"** | rolling weekly £80 payé chaque lundi depuis 22 semaines, 1 contrat clos, 1 contrat en cours bien avancé (~70 % remboursé), kinks signés, journal régulier, offrandes Revolut + PayPal + IBAN alternés |
| `sub_dan` | sub | ACTIVE — **modèle "moyen mais en retard"** | rolling £120 payé irrégulièrement, 1 contrat en cours peu avancé (~15 %), 2 late fees déjà infligées, journal sporadique, kinks partiellement signés |
| `sub_ben` | sub | ACTIVE — **modèle "rolling lourd, gros retard"** | rolling £640 dû depuis 7 jours, pas de contrat, demande d'ajustement en attente, dispute en cours, kinks complets |
| `sub_invite_alex` | sub | PENDING_ENTRY_TRIBUTE | invitation envoyée il y a 2 jours, entry tribute pas encore payé, ne doit voir QUE le wizard d'entrée |
| `sub_invite_jordan` | sub | INVITED — invite vient d'être créée | invitation envoyée il y a 3 h, ne s'est encore jamais loggué (login_count=0) |
| `sub_eli` | sub | BLACKLISTED | breach manuel par la déesse il y a 12 jours, motif "lying about a tribute", historique conservé pour visualiser blacklist + audit |

**6 subs au total, pas plus**. Trois pour visualiser la vie courante, deux pour valider le funnel d'invitation, un pour valider la blacklist.

### Étalement temporel (clé)
Pas de "tout aujourd'hui". Aligner sur **horloge gelée à 2026-04-17 12:00 Europe/London**, données rétroactives :
- Comptes créés entre 2025-09-15 et 2026-04-15.
- Rolling tributes : 22 paiements pour Chris (chaque lundi depuis octobre), 14 pour Dan (irréguliers), 8 pour Ben (sauts de 2-3 semaines).
- Contracts : Chris a un contrat clos signé 2025-11-02 et clos 2026-02-15, plus un contrat actif signé 2026-02-20. Dan a un contrat actif signé 2026-03-10. Ben aucun.
- Photos uploadées étalées (au moins 4 dates différentes par sub actif).
- Journal entries : 12 pour Chris, 6 pour Dan, 9 pour Ben — répartis sur ≥ 8 semaines, longueurs variables (50 à 600 mots), aucune entrée datée du même jour qu'une autre du même sub.

### Diversité kinks/limits/rituels
- Chris : 18 kinks signés sur 4 catégories différentes (oral, anal, bondage, humiliation), 4 limits (hard + soft), 1 rituel quotidien "morning collar selfie".
- Dan : 9 kinks signés sur 2 catégories (humiliation, financial), 2 limits soft, 1 rituel hebdo "Sunday tribute pic".
- Ben : 22 kinks signés sur 5 catégories incluant pup-play, 6 limits dont 3 hard, 2 rituels (daily report + weekly orgasm log).
- Eli (blacklisté) : kinks figés au moment du breach, conservés pour preuve.

### Diversité paiements
Sur les 22 paiements de Chris : alternance Revolut (10), PayPal (7), IBAN (5). Montants identiques (£80) mais quelques bonus exceptionnels (£100, £150) marqués `goddess_recorded`. Dan : 60 % `sub_declared` / 40 % `goddess_recorded`. Ben : 100 % `sub_declared` mais avec 2 rejets pour "screenshot illisible".

### Contenu écrit (varié, crédible)
- 3 entrées journal "à montrer" écrites en anglais avec du grain (peur, fierté, doute, fatigue), pas du Lorem.
- 5 reject reasons réalistes ("photo blurred", "wrong amount, you sent £75 not £80", "I asked Revolut not PayPal").
- 3 review-queue entries (kink update, limit relaxation, profile change) avec une phrase de motivation côté sub.

### Compteurs cibles après seed
| Vue | Valeur attendue |
|---|---|
| `/goddess/dashboard · subs` | **3 actifs** (label clair "active only") |
| `/goddess/dashboard · invitations` | 2 (1 pending entry tribute, 1 jamais loggué) |
| `/goddess/dashboard · contracts` | **3 contracts** (2 active, 1 closed) |
| `/goddess/dashboard · late tonight` | 1 (Ben, rolling £640, 7d) |
| `/goddess/photos` | 2 photos en attente (Dan + Ben) |
| `/goddess/payments/validation` | 1 entry (Dan, sub_declared, screenshot pending) |
| `/goddess/blacklist` | 1 (Eli) |

### Critère d'acceptation
- Aucun KPI dashboard ne diverge des pages liste correspondantes (résout TL;DR #3).
- Aucune date d'événement n'est `now()` au moment du seed (dispersion ≥ 30 jours pour journal, ≥ 14 jours pour paiements).
- Chaque page de l'app a au moins un état "interessant" à montrer (pas une seule page vide).
- Re-seed idempotent : `make init-dbs` rejouable sans dupliquer.

### Pistes d'implémentation
- Réécrire `server/seeds/fake_data.py` autour d'un dict `CAST` avec ces 6 profils figés, paramétré par dates relatives à `FROZEN_TODAY = date(2026, 4, 17)`.
- Extraire un module `server/seeds/timeline.py` qui génère les séries temporelles (rolling payments, journal dates, photo uploads) à partir d'un cadencier.
- Module `server/seeds/content.py` avec les listes de phrases / reject reasons / journal extracts en anglais — pas de Faker générique.
- Garder `bootstrap.py` intact pour admin + goddess (creds inchangés), nouveau `seeds/cast.py` pour le 6-pack.

---

## TL;DR — les 12 choses à corriger en priorité

| # | Sévérité | Domaine | Sujet |
|---|----------|---------|-------|
| 1 | 🛑 Bloquant | Légal | `/profile/medical` affiche **"Placeholder consent text — replace before production."** au sub. Texte de consentement fictif sur des données médicales. |
| 2 | 🛑 Bloquant | Spec/Conf. | `/goddess/blacklist` affiche `1e29d3…` et `573d88…` au lieu des display_name. La règle `CLAUDE.md` "UUIDs are never shown to sub or goddess" est violée ici, sur `/goddess/subs/{uuid}`, `/goddess/contracts/{uuid}`, `/sub/debts/{uuid}`. |
| 3 | 🛑 Bug | Cohérence data | KPI dashboard goddess (10 subs, 4 contracts) ≠ pages liste (11 subs, 7 contracts) ≠ Kinks (12 subs). Une seule source de vérité doit alimenter tout ça. |
| 4 | 🛑 Bug | Money | Admin "Run cron" déclenche pénalités/late fees sans confirmation, sans preview, sans historique des runs précédents. Bouton irréversible nu. |
| 5 | 🛑 Bug | UX/Money | Goddess "Surprise penalty" sur la fiche sub : un clic = argent prélevé. Aucun aperçu du montant. |
| 6 | 🛑 Bug | i18n | Champ DATE OF BIRTH du Profil sub : placeholder `jj/mm/aaaa` (français) → `dd/mm/yyyy` requis. Le projet est English-only. |
| 7 | 🛑 Bug | Routing | Le bandeau sub "Pending approvals" pointe `/sub/adjustments` mais l'URL canonique tapée à la main `/sub/approvals` retourne 404 — incohérence. |
| 8 | ⚠️ Bug | UX placeholder | Tab "Late" de la fiche sub goddess : **"Late-payment tracking coming soon"** envoyé en prod. |
| 9 | ⚠️ Bug | Permissions | Sub `sub_eli` (PENDING_ENTRY_TRIBUTE) voit la même nav et les mêmes 7 tuiles qu'un sub actif. Aucun gating "paie ton entry-tribute pour débloquer". |
| 10 | ⚠️ Bug | A11y | Les avatars ont des alt-text de blagues internes ("Open wallet", "ATM", "Muzzled puppy") au lieu du display_name. Mauvais pour SR + leak du ton interne. |
| 11 | ⚠️ Bug | Reject reason | `Reject` (validation paiement, demande de profil) accepte une raison vide. Sub n'a aucun feedback actionnable. |
| 12 | ⚠️ Manque | Auto-trigger | Penalty rules ET Reward/Punishment tiers sont **vides après seed**. Le moteur cron n'a donc rien à appliquer. Soit on seed des règles par défaut, soit on guide la déesse via un onboarding. |

---

## 1. Login (`/login`)

### À améliorer
- Copy "Owed, owned, remembered." est très forte — garde.
- Lien "Forgotten?" : faible contraste sur fond rose ; passe en `text-base-text` souligné.
- Mention "By signing in you accept the rules of the house" — pas de lien vers la maison/ToS. Soit on lie, soit on supprime.
- Le sélecteur de thème (3 icônes radio) flotte top-right et déséquilibre le panneau gauche. Réduis à un toggle ou cache-le derrière l'avatar une fois loggé.
- Le panneau gauche gagnerait un signe de vie (pulse rose discret sur le cercle, ou un ticker "Last tribute · £50 · 03 Apr").

### Bug
- Login au format `email` exigé : peux-tu accepter aussi le `username` (`sub_chris`) en plus de l'email ? Pour la déesse qui doit relier des comptes manuellement c'est plus rapide.
- Après une mauvaise saisie, la console renvoie une erreur réseau mais l'UI ne montre rien : ajouter une bannière "Identifiants invalides".

---

## 2. Côté **Goddess** (Mean Mal)

### 2.1 Welcome / landing (`/`)

**Bugs / placeholder**
- Heading "Welcome, goddess" — devrait être "Welcome, Mean Mal". L'identité de la maison vient du nom personnel.
- 9 tuiles qui dupliquent EXACTEMENT la nav supérieure : choix à faire — soit redirection vers `/goddess/dashboard`, soit on fait un VRAI dashboard.

**Manques (le vrai dashboard)**
- Aucune tuile n'affiche de compteur live. On veut voir d'un coup :
  - "Pending validations · 3 awaiting · oldest 2 d 4 h"
  - "Invitations · 2 active · 1 expired"
  - "Late tonight · 2 subs · £730 overdue"
  - "Photo queue · 0"
  - "Profile change requests · 0"
- Tuile "Profile change requests" : bordure rose surlignée comme un état hover bloqué (ce n'est pas le focus). À retirer.

### 2.2 Dashboard (`/goddess/dashboard`)

**Bugs**
- Sources de vérité divergentes : KPI sub-count = 10, mais `/goddess/subs` montre 11 cartes et `/goddess/kinks` mentionne 12. Idem contracts : 4 vs 7. Probable filtre implicite (status active only) sans label.
- "Late tonight" dashboard liste 2 entrées (Ben rolling £640 + Dan contract £90 5d) ; `/goddess/late` n'en affiche qu'**une** car la page filtre sur "rolling tribute" uniquement (sous-titre). Soit on étend la page, soit on renomme "Late on rolling".
- Les charts (cumulative tribute, debt curve) ne s'affichent qu'après une interaction (click sur la cloche). Probablement un `useQuery` suspendu sur focus — à lever.

**À améliorer**
- Tuiles KPI en font sérif ("1", "10") ressemblent à "I" et "IO" à petite taille. Passer en font tabulaire pour les chiffres.
- Pas de sélecteur de plage temporelle sur les charts.
- Aucun indicateur "Subs en pause vs actifs" / "Argent collecté ce mois vs mois passé".

### 2.3 Subs list (`/goddess/subs`)

**À améliorer**
- 11 cartes, sans recherche, sans filtre status / état de propriété (free / owned / collared / blackmailed). Ça ne tiendra pas à 50 subs.
- Avatar `alt` = blague interne. Remplacer par le display_name systématiquement.
- Tri seulement par ordre alphabétique. On veut : par "due tonight", "last seen", "total tribute", "balance".
- Pas d'actions de masse (envoyer un mot, appliquer une règle, marquer absent).
- Pill d'état "blackmailed" / "released" / "collared" : couleur identique à "active" — visuellement on doit sentir le danger.

### 2.4 Sub detail (`/goddess/subs/{uuid}`)

**Bugs**
- URL contient un UUID brut : interdit par `CLAUDE.md`. → `/goddess/subs/{username}`.
- Tab "Late" affiche `Late-payment tracking coming soon` — placeholder en prod.
- Tabs limités à Overview / Rolling / Contracts / Late / Profile. Manquent (spec §28) : **Kinks · Limits · Journal · Inventory · Rituals · Devices · Aftercare · Merits**. Aujourd'hui pour voir le journal d'un sub précis, il faut aller à `/goddess/subs/{uuid}/journal` et re-sélectionner le sub dans un combobox, alors que le sub est déjà dans l'URL (cf. §2.5).

**Bug — sécurité $$$**
- "Surprise penalty" applique sans confirmation ni preview du montant calculé. Argent réel. Confirm modal obligatoire avec aperçu.
- "Reject" (refus de paiement) : la raison est *optionnelle* → mettre min 5 chars + dire au sub pourquoi.
- "Mark session complete" est dans la même carte que "Breach sub". L'un est anodin, l'autre nucléaire. Sépare-les physiquement et change la couleur (le danger a un coût visuel).

**Manques utiles à la déesse**
- Pas de "Send message / push" rapide depuis la fiche.
- Pas d'historique chronologique unifié (paiement / kink update / journal entry / pénalité). Aujourd'hui c'est éclaté en 5 onglets.

### 2.5 Sub-scoped Journal (`/goddess/subs/{uuid}/journal`)

**Bug**
- La page ignore le `sub_id` de l'URL et affiche un combobox vide "Select a sub". Une fois le sub re-sélectionné manuellement, ça marche. Lis le param d'URL et préselectionne.

### 2.6 Pending validations (`/goddess/payments/validation`)

**À améliorer**
- 3 entrées, badge `sub_declared` présent — bien.
- Reject ouvre un `prompt()` natif au lieu d'une modale stylée — incohérent avec le reste du design.
- Pas de **thumbnail** du screenshot de preuve : il faut cliquer un lien MinIO. Affiche la miniature dans la ligne.
- Pas d'action de masse (approve all from sub X).

### 2.7 Record payment (`/goddess/payments/record`)

**À améliorer**
- Combobox "Sub" sans avatar ni state pill → risque d'enregistrer pour le mauvais sub.
- Après submit, badge `goddess_recorded` doit être visible immédiatement dans la liste.
- Pas de mode "soirée de cash" (saisir plusieurs paiements à la suite, focus retenu).

### 2.8 Payment methods (`/goddess/payment-methods`)

**À améliorer**
- Listes Revolut / PayPal / IBAN avec copy-button — bien.
- Pas de "set primary" / d'archivage / de QR.

### 2.9 Invitations (`/goddess/invitations` + `/new`)

**Bugs**
- Le token d'invitation est affiché en clair dans la table — au minimum tronqué.
- Date format `DD/MM/YYYY HH:mm` ici alors que le reste de l'app utilise `D Mon YYYY`. Choisir et homogénéiser (cf. §6 transverse).

**Manques**
- Pas d'action "Resend email" sur une invit ACTIVE.
- Pas de preview de l'email envoyé.
- Pas de prefix `£` dans l'input "entry tribute amount".
- Pas de loading state observé sur "Send invitation" (à vérifier en latence réelle).

### 2.10 Debt contracts (`/goddess/contracts` + détail)

**À améliorer**
- 7 contrats, états mélangés — bien. Mais le pill `PENDING_DOM_COUNTER` lit "Pending DOM counter" → trop interne, dis "Awaiting your counter-offer".
- Pas de filtre par état / sub / amount.
- Colonne "Late penalties" affiche un cumul mais aucun lien vers la règle qui les a générées.

**Bugs détail**
- "Sign as DOM" reste visible alors que le contrat est passé l'étape de signature → bouton fantôme.
- Le PDF s'ouvre dans le même tab — `target=_blank rel=noopener` ou aperçu in-app.
- Pas d'audit trail (qui a breach, quand, qui a réinstauré).

### 2.11 Late (`/goddess/late`)

**Bug** : page intitulée "Delinquents." ne liste que les retards `rolling`. Le dashboard, lui, mélange `rolling` et `contract`. Choisis : ou la page devient unifiée, ou on la renomme.

**À améliorer**
- 1 seule entrée actuellement (Ben). Pas de seuil rouge à 7 d.
- Pas d'action "appliquer la règle de pénalité standard" en masse.

### 2.12 Kinks browse (`/goddess/kinks`)

**Bug** : compteur 12 subs affichant un kink profile, alors qu'il y a 11 subs en BDD.

**Manques**
- Pas de recherche par label de kink.
- Pas de side-by-side compare entre 2 subs.

### 2.13 Review queue (`/goddess/review-queue`) & Photo queue

**À améliorer**
- Queue unifiée — bien.
- Pas de batch "Approve all from sub X".
- Photo queue : thumbnails minuscules, pas d'EXIF, pas d'approve-all.

### 2.14 Rewards & Punishments + Penalty rules

**Manque**
- Les deux pages sont vides après seed. Le moteur cron n'a donc *aucune* règle à exécuter. Soit on livre des templates ("late > 2 d → notify", "late > 7 d → 5 % fee"), soit on impose un onboarding.
- "+ New rule" / "+ New reward" sans wizard — la déesse doit deviner la grammaire des triggers.

### 2.15 Blacklist (`/goddess/blacklist`)

**🛑 Bug majeur**
- Les cartes affichent `1e29d3…` et `573d88…` à la place du display_name. Le bouton "Forgive" risque de réintégrer le mauvais sub. Affiche `display_name (@username)` + balance + reason. C'est aussi une violation directe de la règle "UUIDs are never shown to sub or goddess".

### 2.16 Profile change requests (`/goddess/profile-change-requests`)

OK : empty state propre "No pending requests · All caught up.".

### 2.17 Weekly intake (`/goddess/weekly`)

**Bug routing** : le backend expose `/goddess/payments/weekly` (cf. `CLAUDE.md` § read-model endpoints) mais le front route sur `/goddess/weekly`. Si l'API a bougé, mets-les en cohérence ou ajoute un alias 308 pour ne pas casser les copier-coller.

**À améliorer**
- 8 dernières semaines avec barres + total — joli.
- Pas de drill-down (cliquer une semaine → liste des paiements).
- Pas d'export CSV.

---

## 3. Côté **Sub** (Chris Doyle, sub actif rolling + contract)

### 3.1 Welcome (`/`)

**Bugs / manques**
- 7 tuiles qui dupliquent la nav, comme côté goddess. Aucun KPI live ("Pending approvals · 1", "Next payment · in 2 d · £100").
- Pas d'intro "ce qui t'attend cette semaine" — le sub veut voir le rituel du jour, son solde dû, ses retards éventuels en haut de page.
- Routing piège : la tuile "Pending approvals" pointe `/sub/adjustments` mais l'utilisateur qui tape `/sub/approvals` se prend un 404. Standardise.

### 3.2 Today (`/today`)

OK : 3 sections (Rituals / Open tasks / Journal) avec empty states corrects et CTA "Write entry" pour aujourd'hui.

**À améliorer**
- "Rituals" empty même quand la déesse n'a rien posé : prends un ton plus encourageant ("Aucun rituel ce soir — repose-toi.").
- Pas de "Quote of the day" / mantra de la déesse — facile à ajouter, augmente l'attachement.

### 3.3 Dashboard (`/`) — voir 3.1.

### 3.4 My payments (`/sub/payments`)

**Bugs**
- Tous les timestamps affichés `00:03` UTC alors que le projet est en `Europe/London`. Convertis pour l'affichage.
- "Throne wishlist" + petit avatar circulaire est ambigu : c'est la *méthode* de paiement ou le *destinataire* ? Renomme la colonne.

**Manques**
- Pas de filtre par statut / période / méthode.
- Pas de total cumulé sur la période.
- Pas d'icône de méthode (Throne / PayPal / Bank) dans la ligne.

### 3.5 Declare a payment (`/sub/payments/new`)

**Bugs / manques**
- 3 catégories radio : `Entry tribute` (disabled si non-pending) / `Tribute` / `Rolling tribute`. Pas de description → le sub ne sait pas quand utiliser quoi.
- Champ "Amount" préfilled `30.00` arbitraire. Si le sub a un rolling à £100 hebdo, propose-le en preset (chip "Mon rolling · £100").
- "When did you pay?" optionnel — devrait défaulter à *now* en local TZ.
- **Pas d'upload de preuve** alors que la page validation goddess attend un screenshot. Incohérence majeure.
- Note placeholder "Any details you want Goddess to see" → trop relâché, casse le ton liturgique du reste.

### 3.6 Contracts list + détail (`/sub/debts`, `/debts/{uuid}`)

**Bugs**
- URL UUID exposée au sub.
- Liste : seulement Principal / Balance / Status / Updated → manquent **next payment date**, **monthly amount**, **interest rate**.

**Très bien (à garder)**
- Page détail : magnifique. Current terms + Projection (period rate, monthly rate, total interest, total to pay) + chart de balance projetée + Payment stats (progress bar, paid/due/remaining, "Behind" en rouge).
- Boutons "Download signed PDF" + "Request buyout" + audit log dépliable.

**À améliorer**
- "Behind" affiche le statut sans dire *de combien* (£ ou périodes).
- "Request buyout" est destructeur ($$$) → confirm modal avec preview du montant exit.
- Le calendrier des paiements à venir (next 3 dates + amounts) n'apparaît pas.

### 3.7 Kinks (`/profile/kinks`)

**À améliorer**
- ~50 kinks répartis en 8 catégories, déroulés par défaut. Page haute de plusieurs écrans. Collapse-by-default, accordion par catégorie.
- Pas de save indicator par ligne (auto-save ou bouton ?).
- Pas d'option "I prefer not to say" (différent du 0 par défaut).
- Pas de filtre "show only unrated".
- L'ordre des boutons X / – / ? / + / ++ n'est pas légendé : tooltip "Hard limit / Dislike / Curious / Like / Crave".
- Catégorie "Pain & Endurance ⚠️" : l'icône warning est trop discrète. Demande une vraie ack ("Tape OUI" ou case à cocher) avant d'autoriser un rating "+" sur Fire/Needle Play.

### 3.8 Limits & Triggers (`/profile/limits`)

**Bugs / manques**
- Placeholder safeword `e.g. red` — utile, mais pas de validation "ton safeword n'est pas vide" avant de marquer le compte ACTIVE.
- Emergency contact placeholders `Jane Doe`, `+44 7700 900000` — vérifier qu'ils ne sont jamais persistés tels quels.
- Pas de preview "Voici ce que ta déesse voit" pour rassurer le sub.

### 3.9 Journal (`/sub/journal`)

**À améliorer**
- Mood selector 7 emojis (Great → Overwhelmed) — bien.
- "append-only, seen only by you and your goddess" — préviens si la déesse vient de lire (signal de présence).
- Pas d'option pièce jointe (photo de la séance, voice note).
- Pas de toggle "private (only me)" — la spec §20 mentionne des entrées pouvant rester privées au sub.

### 3.10 Inventory (`/sub/profile/inventory`)

OK : page propre avec "Propose toy" CTA et empty state. URL `/sub/profile/inventory` est bizarrement nichée — homogénéise (tout sous `/sub/*` ou tout sous `/profile/*`).

### 3.11 Aftercare (`/profile/aftercare`)

OK et touchant : 4 textareas (What I need / Comfort items / Ready phrase / Notes for Goddess) + Save. Joli.

**À améliorer**
- Pas de signal "votre déesse a lu ces préférences le …".
- Ajouter un slider "Aftercare intensity" 1-5 pour standardiser.

### 3.12 Medical (`/profile/medical`)

**🛑 Bloquant** : le texte de consentement est littéralement
> Placeholder consent text — replace before production.

Sur des données **médicales**. Aucun déploiement n'est légalement défendable comme ça.

**À améliorer (après fix)**
- Indique clairement la chaîne crypto (envelope encryption — phase J de la spec).
- Bouton "Révoquer mon consentement" symétrique au "I accept".

### 3.13 Pending approvals (`/sub/adjustments`)

**À améliorer**
- 1 ligne `£75 · 14/04/2026 · Late slack from week 3 — formalising it.` + Accept / Refuse + lien `view contract` — bien.
- Le `£75` seul est ambigu : c'est quoi ? Réduction de min payment ? Frais ajouté ? Rallonge ? Affiche un badge `kind=reduce_min_payment | add_penalty | extend_term | ...`.
- "Refuse" ne demande pas de raison — c'est moins grave côté sub mais utile à la déesse.

### 3.14 Profile (`/profile`)

**Bugs**
- En-tête `Chris Doyle / Chris Doyle` : la 2e ligne devrait être `@sub_chris`, pas le display_name dupliqué.
- Champ DATE OF BIRTH placeholder `jj/mm/aaaa` (français). Fix la locale (English-only règle du repo).
- Card "Payment handle" dit "Visible only to you" alors que la déesse voit le handle dans la page validation. Mensonge à corriger ou réellement masquer côté goddess.

**À améliorer**
- "Save avatar" disabled tant qu'aucun changement — bien. Mais pas de confirmation visuelle après save.
- Profile change requests : juste un CTA "Request change" sans preview du formulaire.

### 3.15 Sub `sub_eli` (PENDING_ENTRY_TRIBUTE)

**🛑 Manque structurel**
- Eli voit la même nav (11 items) et les mêmes 7 tuiles qu'un sub actif. Il peut naviguer dans Kinks/Limits/Journal sans avoir payé son entry tribute.
- Le bon comportement : un layout mode "porche d'entrée" avec **un seul CTA** "Pay your entry tribute · £X to enter Mean Mal's house", le reste flouté/locked. Sortie immédiate de ce mode quand la déesse valide le paiement.
- Côté `Declare`, le radio "Entry tribute" est bien préselectionné et les autres grisées — bien — mais le montant default `30.00` ne reflète pas ce que la déesse a demandé dans l'invitation. Inject the invitation amount.

### 3.16 Notifications (cloche header)

OK : popover "0 unread · You're all caught up." pour Chris.

**À améliorer**
- Pas de raccourci "Notification settings" dans le popover.
- La cloche n'a pas d'aria-label parlant côté goddess (`Notifications · 3 unread`).
- Côté goddess, badge `3` mais pas de différenciation entre validations / late / kink updates.

---

## 4. Côté **Admin**

### 4.1 Landing (`/`)

**Bug** : l'admin connecté arrive sur "Welcome, admin · Operational controls · 1 tile (Run cron)". C'est ridicule vs ce que la sidebar Console offre. Redirige `/` → `/admin` pour les admins.

### 4.2 Console (`/admin`)

**Très bien**
- Sidebar avec 11 sections (Users, Goddesses, Invitations, Payment methods, Payment declarations, Rolling tributes, Debt contracts, Blacklist, Notifications, Debt events, Contract adjustments, Audit log).
- Tables denses, pagination, recherche, "+ New", actions Impersonate / Delete.
- UUIDs visibles ici (conforme à la règle "only admin can see raw UUIDs").

**Bugs / manques**
- Status text plain ("active", "pending_entry_tribute", "blacklisted") — colorize en pill.
- Bouton **Impersonate** sans modale de confirmation. Doit afficher : "Tu vas naviguer comme `sub_chris`. Toutes tes actions seront loggées dans l'audit log. Continuer ?".
- Bouton **Delete** sur chaque user, y compris admin → garde au moins une protection "cannot delete last admin" + "cannot delete user with active contracts".
- Pas de tri par colonne (clic header).
- Pas d'export CSV des tables.
- "+ New" sur Debt contracts duplique le flow goddess — explique à quoi ça sert ou supprime.

### 4.3 Sidebar — couleur active

L'item actif a un background **violet** (`purple`) alors que le reste de l'app est rose primaire. Drift de tokens — passe sur la même variable `--accent` (rose) ou `--admin-accent` documentée.

### 4.4 Audit log

**Bug** : 0 entrée alors que le seed a créé invitations, paiements, breaches, etc. Soit le seed n'écrit pas dans l'audit, soit les actions admin ne s'y loguent pas. À investiguer — c'est ce qui rend l'app défendable légalement.

### 4.5 Admin tables — chiffres bruts

Les colonnes Principal / Balance dans Debt contracts s'affichent `1000.00` et non `£1,000.00`. Idem Payment declarations. Reste cohérent avec le reste de l'app : symbole + séparateurs.

### 4.6 Cron (`/admin/cron`)

**🛑 Bouton dangereux**
- "Run cron now" lance les pénalités, frais, breaches automatiques. Aucune confirmation. Aucun aperçu (combien de subs vont être affectés, combien de £ déduits).
- Aucun historique : quand le dernier run, succès / échec, durée.
- Idéalement : "Dry run" → preview JSON ou tableau des actions ; puis "Confirm & apply".

---

## 5. Cross-role / flows transverses

### 5.1 Cycle paiement (sub déclare → goddess valide)

- Sub `Declare` ne demande pas de preuve. Goddess `Validation` attend un screenshot. Soit on rend la preuve obligatoire côté sub (recommended), soit on retire l'attente côté goddess.
- Pas de timer "auto-validate after X jours sans réponse" visible.

### 5.2 Cycle contrat (proposal → counter → sign)

- États visibles côté goddess : `pending_sub_signature` / `pending_dom` / `pending_dom_counter`. Côté sub, status "Active" seulement. Sub ne voit pas son propre état d'attente.
- Pas de notif WS testable ici, mais à la signature, le sub doit recevoir un toast "Your goddess signed contract X".

### 5.3 Notifications

- Côté goddess, cloche compteur 3, popover liste les events — bien — mais utilise les **usernames** (`sub_alex`) au lieu des **display_name** (`Alex Bishop`). Casse le ton.
- Pas de filtre par type. Pas de "marquer tout comme lu".

---

## 6. Transverses (visuel / DA / a11y / i18n)

### Beauté
- DA générale : très forte (rose primaire + sérif "Owed, owned, remembered."). Photographique et premium.
- Light theme passable mais le rose pastel manque de contraste sur le texte secondaire — viser AA (4.5:1) sur tous les paragraphes.
- Le serif italique sur les chiffres (`£1,000.00`) lit comme un "I" devant "OOO" → font-feature-settings: `tnum` partout pour les chiffres, ou un sans-serif tabulaire.

### A11y
- Avatars → `alt` = display_name, pas une blague.
- Cloche → aria-label dynamique `Notifications · 3 unread`.
- `prompt()` natif sur reject → modale custom avec `role="dialog"` + focus trap.
- Theme switcher = 3 radios stack-horizontal, OK ; ajoute `aria-labelledby="theme-pref"`.
- Tabs sur fiche sub → vérifier que `Tab → Right Arrow` change d'onglet (pas testé mais devrait).

### i18n / locale
- Dates : alterne `DD/MM/YYYY HH:mm` et `D Mon YYYY`. Choisis : `D Mon YYYY · HH:mm` partout, en `Europe/London`.
- Heures : tout est rendu en UTC (00:03 sur sub `My payments`). Convertis en BST/GMT côté front.
- Currency : `£` partout — bien — sauf admin qui affiche brut. Ajouter prefix `£` dans `Amount` inputs.
- Placeholder français `jj/mm/aaaa` sur Profile DOB → `dd/mm/yyyy`.
- "Visible only to you" / "Visible only to your goddess" → audit ces tags pour s'assurer qu'ils sont vrais.

### Routing
- Préfixes mélangés `/sub/*` vs `/profile/*` vs `/sub/profile/*`. Standardise sur `/sub/*` (ou définis clairement la frontière entre "sub-only" et "profile-shared").
- Pages 404 propres (titre + back to dashboard) — bien.
- Mais `/today` (pas `/sub/today`), `/debts/{id}` (pas `/sub/debts/{id}`) — incohérent avec d'autres `/sub/*` routes.

### Composants 300-line rule
- Pas vérifié dans le code — la règle est dans `CLAUDE.md`. À vérifier sur `SubProfile`, `GoddessSubDetail`, `SubKinksMatrix` qui sont visiblement très denses.

### Source enum sur paiements
- Bien rendu via badge `SELF-DECLARED` côté sub. Côté goddess validation, vérifier qu'on voit aussi `goddess_recorded` quand applicable.

---

## 7. Spec drift (par rapport à `Docs/specs.md`)

| Spec | Implémentation | État |
|---|---|---|
| §6 UUIDs cachés à sub/goddess | URLs `/goddess/subs/{uuid}`, `/goddess/contracts/{uuid}`, `/sub/debts/{uuid}` ; cards Blacklist `1e29d3…` | ❌ |
| §17 Kinks 50+ items, 5-level rating, hard limits | Implémenté ✅ ; manque ack hard-limit obligatoire | ⚠️ |
| §18 Limits/Safety + safeword | Implémenté ✅ ; safeword pas obligatoire pour activer | ⚠️ |
| §19 Rituals quotidiens | Empty state Today ✅ ; aucune UI pour goddess pour assigner un rituel | ❌ |
| §20 Journal append-only avec mood | Implémenté ✅ | ✅ |
| §21 Toy inventory | Implémenté ✅ | ✅ |
| §28 Sub detail tabs (Kinks/Limits/Journal/Inventory/Rituals/Devices/Aftercare/Merits) | Goddess sub detail = Overview/Rolling/Contracts/Late/Profile only | ❌ |
| §29 J — Crypto envelope (medical) | Page existe mais consent placeholder | ❌ |
| Read-model `/goddess/payments/weekly` | Front utilise `/goddess/weekly` | ❌ alias |
| Daily cron | Bouton manuel admin sans dry-run / log | ⚠️ |

---

## 8. Ce qui est *vraiment* bien (à garder)

- Page **Sub contract detail** : best page de l'app. Rythme info → projection → progress → CTA → audit log. Modèle à imiter pour les autres détails.
- **Goddess weekly intake** : visualisation 8 semaines + total clair, sans bullshit.
- **Source badge** sur paiements (`sub_declared` / `goddess_recorded`) : exigé par `CLAUDE.md`, bien rendu.
- **Empty states** : presque tous les pages vides ont un titre + sous-titre + CTA. Cohérent.
- **Identité éditoriale** : "Owed, owned, remembered." et "Manage merit tiers your subs can redeem or receive." — le ton est tenu, on sent la maison.
- **Admin Console sidebar** : dense mais lisible, vraiment utilisable pour l'opérationnel.
- **Sub journal mood selector** : 7 niveaux, emoji clair, append-only — respect du sub.

---

## 9. Suggestions au-delà des bugs

- **Ritual scheduler côté goddess** (manquant complètement de la nav) : assigner un rituel récurrent (réveil 06:00 photo de pieds, prière 22:00). Today côté sub deviendra alors vivant.
- **Rapport hebdomadaire automatique** envoyé à la déesse le dimanche : "Cette semaine — £X collectés, Y subs payants, Z en retard, W rituels manqués". PDF Weasyprint déjà en place.
- **Mode "Ceremony"** (full-screen) pour la signature de contrat : le sub voit les termes, doit lire à voix haute (timer 30 s par section), puis signature. Augmente le rituel.
- **"Ledger" public read-only** côté sub : "Voici tout ce que ma déesse sait de moi" — un dump consolidé des kinks/limits/journal/payments. Bon pour la transparence et la confiance.
- **Notifications goddess push web** (PWA) : la cloche c'est bien, mais une vraie notif système quand un sub déclare/breach.
- **Rate-limiting visible** sur reject/penalty : "Tu as déjà rejeté 5 paiements aujourd'hui — sûre ?". Évite l'arbitraire.

---

## 10. Annexes

- Captures dans `/.review-screenshots/` (≈30 fichiers). Login, goddess (dashboard, subs, sub detail, validations, contracts, late, kinks, weekly, blacklist, etc.), sub (today, payments, declare, contract detail, kinks, limits, journal, inventory, aftercare, medical, profile), admin (console, contracts, audit, cron).
- Notes brutes incrémentales : `/.review-notes.md`.
