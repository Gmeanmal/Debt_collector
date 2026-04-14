# TODO

## 1. Signature b64 au lieu de stocker le PDF signé

- Drop `signed_pdf_url` + `signed_pdf_sha256` sur `DebtContract`.
- Ajouter `signature_b64` (TEXT) — PNG en base64 (data URI).
- Migration pour swap les colonnes.
- Controller `sign_contract` : stocker `signature_b64`, ne plus appeler le storage service.
- Endpoint `GET /debts/{id}/pdf` : regénérer à la volée via `generate_contract_pdf(...)` + stream inline (`Response(pdf, media_type="application/pdf")`).
- Seeds : remplacer `signed_pdf_url=…` par un PNG 1×1 transparent encodé.
- Supprimer `services/storage/*` si plus aucune route ne l'utilise après ça.

## 2. Intégration API Throne pour ingestion automatique des paiements

- Étudier l'API / webhook Throne (auth, format de payload, signature HMAC).
- Stocker une "Throne connection" par goddess (token + account id).
- Endpoint webhook `/webhooks/throne` → vérifie signature → match sub par handle Throne → crée `PaymentDeclaration` auto-validée avec `source = goddess_recorded`.
- Dashboard goddess : badge "Auto-detected via Throne" sur les paiements reçus via webhook.
- Fallback polling si pas de webhook dispo.

## 3. Refonte du template PDF du contrat

- Redesign `server/services/pdf/templates/contract.html` : hiérarchie claire, sections nommées (parties, principal, échéancier, clauses pénales, exit, signatures).
- Ajouter l'échéancier complet (rows par période avec due date + montant dû + intérêts).
- Style imprimable (A4, marges, pagination, footer avec contract id + sha).
- Bloc signature cadré avec `signed_at` en timezone Europe/London.
- Prévoir en-tête goddess (logo + display_name) et bloc sub complet.

## 4. Ingestion des paiements via les payment methods de la dom (hook de réception)

- Pour chaque `PaymentMethodType` supporté côté dom, câbler un hook/webhook provider-specific (PayPal IPN, Revolut Merchant, CashApp, etc.).
- Table `PaymentWebhookEvent` pour idempotence (event_id du provider).
- Matching payload → sub : par handle de paiement (cf. tâche 6) ou par référence libre.
- Auto-création d'une `PaymentDeclaration` validée + allocation immédiate.
- Interface goddess pour activer/désactiver l'auto-ingest par méthode et consulter le log des events.

## 5. Intégration YouPay en iframe

- Vérifier les CGU YouPay : est-ce que l'iframe est autorisée ? (X-Frame-Options / CSP côté YouPay).
- Si possible : widget embed sur la page "Declare payment" du sub, pré-rempli avec le montant + référence.
- Sinon : fallback deep-link (ouvrir YouPay dans un nouvel onglet avec query params).
- Contacter support YouPay si doc pas claire.

## 6. Avatars + profils subs contrôlés par la dom

- Seed 10 avatars par défaut (dans `client/src/assets/avatars/`) + un avatar "default" attribué à l'inscription.
- Champ `avatar_key` sur `User` (enum ou FK vers table `Avatar`).
- Seule la dom peut modifier `avatar_key`, `first_name`, `last_name`, `display_name`, `notes` d'un sub.
- Table `ProfileChangeRequest` : un sub peut demander un changement → la dom approuve / rejette / propose un "coût" (ex. 50 GBP). Si coût accepté par le sub, génère un `PaymentDeclaration` d'entrée spéciale "profile_change_fee" → changement appliqué à la validation.
- Le sub **peut** modifier lui-même un seul champ : son `payment_handle` (Throne/PayPal username). Ajouter ce champ au form d'inscription + à la page `/sub/profile`.
- Partout où la dom liste/voit ses subs → `MethodIcon` style : avatar + prénom nom (UUID jamais).
- Le `payment_handle` est la clé de matching pour le hook Throne (cf. tâche 2).

## 7. Dashboard dom : graphiques et agrégats stylés

- Ajouter un page dashboard avec :
  - Revenus mensuels (line chart rolling + tributes + contrats).
  - Répartition par payment method (pie/donut).
  - Subs par statut (stacked bar).
  - Top 5 subs par revenu généré (leaderboard).
  - Late rate sur 30 jours (sparkline).
  - Contrats actifs vs. complétés vs. en breach (progress bars).
- Librairie : recharts ou visx (ESM, léger, tailwind-friendly).
- Style cohérent avec tokens.css, pas de couleurs inline.

## 8. Améliorer la prévisualisation d'un contrat

- Page `/goddess/contracts/:id/preview` (et côté sub avant signature) :
  - En-tête résumé (principal, durée, fréquence, taux).
  - Échéancier complet : table avec # période, date due, montant dû, cumul.
  - Simulateur de "paiement en retard" / "early buyout" / "breach" (utiliser le `/debts/simulate` existant).
  - Graphique de décroissance du solde au fil du temps.
  - Export PDF "draft" (même template que la tâche 3, filigrane "DRAFT").

## 9. Plus de photos de la goddess + multi-tenant plus tard

- Dossier `client/src/assets/goddess/` (ou `public/goddess/`) avec plusieurs photos (hero, accent, cards).
- Composant `<GoddessPhoto variant="hero|portrait|accent" />` pour centraliser.
- Intégration sur : landing, dashboard dom, invitation public page, login.
- Multi-tenant : pour l'instant toutes les goddesses pointent vers le même pool d'images. Plus tard, table `GoddessAsset` avec upload et override par tenant.
