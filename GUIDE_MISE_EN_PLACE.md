# Guide de mise en place — Planning Gardes 2026

Temps estimé : **30 à 45 minutes** (une seule fois)

---

## Étape 1 — Préparer ton Google Sheet

### 1.1 Ajouter un onglet "Agents"
Dans ton Google Sheet existant, crée un nouvel onglet nommé exactement **`Agents`**.

Remplis-le comme ceci (commence en ligne 2, ligne 1 = en-têtes) :

| A — Nom | B — Gmail | C — S/off | D — Conducteur | E — Admin |
|---------|-----------|-----------|----------------|-----------|
| Adrover | adrover.prenom@gmail.com | OUI | NON | NON |
| Dupoux | dupoux.prenom@gmail.com | NON | OUI | NON |
| TonNom | ton.email@gmail.com | NON | NON | **OUI** |
| ... | ... | ... | ... | ... |

> ⚠️ La colonne B doit contenir l'adresse Gmail exacte que chaque agent utilise pour se connecter.
> Mets **OUI** dans la colonne Admin pour toi et les autres planificateurs.

### 1.2 Vérifier le nom de l'onglet SAISON
L'onglet planning doit s'appeler exactement **`SAISON 2026`**.
Si ce n'est pas le cas, renomme-le (clic droit sur l'onglet → Renommer).

### 1.3 Vérifier la structure de l'onglet SAISON
L'app attend cette structure :
- **Ligne 1** : les dates dans les colonnes paires (ex. 01/07/2026, 02/07/2026...)
- **Ligne 2** : (optionnel) équipe de garde
- **Ligne 3** : en-têtes (Dispo / Affectation)
- **Ligne 4+** : les agents (colonne A = nom)

Pour chaque jour, il doit y avoir **2 colonnes** : Disponibilité + Affectation.

---

## Étape 2 — Créer un projet Google Cloud

### 2.1 Aller sur Google Cloud Console
Ouvre : https://console.cloud.google.com

### 2.2 Créer un projet
- Clique sur le sélecteur de projet (en haut à gauche)
- → "Nouveau projet"
- Nom : `Planning Pompiers 2026`
- → Créer

### 2.3 Activer les APIs nécessaires
Dans le menu, va dans **APIs et services → Bibliothèque**, puis active :
1. **Google Sheets API**
2. **Google Identity Services** (déjà actif par défaut)

### 2.4 Créer les identifiants OAuth

**Écran de consentement :**
- Menu → APIs et services → **Écran d'autorisation OAuth**
- Type d'utilisateur : **Externe**
- Remplis : Nom de l'app = "Planning Gardes", Email = le tien
- Portées : ajoute `https://www.googleapis.com/auth/spreadsheets`
- Utilisateurs test : ajoute les Gmail de toute l'équipe (tant qu'en mode test)

**ID Client OAuth :**
- Menu → APIs et services → **Identifiants** → Créer des identifiants → ID client OAuth
- Type : **Application Web**
- Nom : `Planning GitHub Pages`
- Origines JavaScript autorisées : ajoute `https://TON_PSEUDO.github.io`
- → Créer
- **Copie le "ID client"** (format : `123456789-abc...apps.googleusercontent.com`)
353029111083-dqcpeanfmr64clc52sc78228kcceo0qi.apps.googleusercontent.com
**Clé API :**
- Créer des identifiants → **Clé API**
- Restreindre la clé : API Google Sheets uniquement, origine `https://TON_PSEUDO.github.io`
- **Copie la clé**
AIzaSyAYXMb40oRnwv2eyrwwHdEV2WpASdgEp98
---

## Étape 3 — Récupérer l'ID de ton Google Sheet

Dans l'URL de ton Sheet :
```
https://docs.google.com/spreadsheets/d/[CECI_EST_TON_SHEET_ID]/edit
```
**Copie cette partie longue.**
1lo1gFMV4aRBbMW3t9BMIA3Jj-hhkRWn_1SJiIx7vVd8
---

## Étape 4 — Déployer sur GitHub

### 4.1 Créer un dépôt
- Va sur https://github.com → bouton "+" → New repository
- Nom : `planning-pompiers`
- Visibilité : **Public** (requis pour GitHub Pages gratuit)
- → Create repository

### 4.2 Uploader les fichiers
- Dans le dépôt créé, clique **"uploading an existing file"**
- Glisse-dépose tous les fichiers du dossier `planning-pompiers` :
  - `index.html`
  - `config.js` ← à modifier en premier (étape 5)
  - `auth.js`
  - `sheets.js`
  - `app.js`
  - `manifest.json`
- → Commit changes

### 4.3 Activer GitHub Pages
- Dans le dépôt → **Settings** → **Pages**
- Source : **Deploy from a branch**
- Branch : `main` / `(root)`
- → Save
- Attends 1-2 minutes, puis ton URL sera : `https://TON_PSEUDO.github.io/planning-pompiers`

---

## Étape 5 — Remplir config.js

Ouvre `config.js` dans GitHub (clique sur le fichier → icône crayon) et remplace :

```javascript
GOOGLE_CLIENT_ID: "123456789-abc....apps.googleusercontent.com",  // ← ton ID client
SHEET_ID: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",        // ← ton ID Sheet
API_KEY: "AIzaSy...",                                               // ← ta clé API
APP_URL: "https://ton-pseudo.github.io/planning-pompiers",         // ← ton URL
```

→ Commit changes (le site se met à jour automatiquement en 1-2 min)

---

## Étape 6 — Tester et partager

1. Ouvre `https://TON_PSEUDO.github.io/planning-pompiers`
2. Clique "Se connecter avec Google" avec ton compte admin
3. Vérifie que les données du Sheet apparaissent bien
4. Envoie le lien à tous les agents — ils se connectent avec leur Gmail

### Sur mobile (recommandé)
- Ouvre l'URL dans Chrome sur Android ou Safari sur iPhone
- Menu → **"Ajouter à l'écran d'accueil"**
- L'app se comporte comme une vraie appli

---

## Problèmes fréquents

**"Accès refusé" à la connexion**
→ Vérifie que le Gmail est bien dans l'onglet Agents du Sheet.

**Les données ne s'affichent pas**
→ Vérifie que l'onglet s'appelle exactement `SAISON 2026` et `Agents`.
→ Vérifie que la clé API est bien restreinte à l'URL de l'app.

**Erreur "popup_closed_by_user"**
→ Autorise les popups pour le site dans ton navigateur.

**En mode test Google, seuls 100 utilisateurs peuvent se connecter**
→ Pour passer en production : APIs et services → Écran OAuth → Publier l'application.

---

## Questions ?

Reviens sur Claude avec ton problème, je t'aide à le résoudre !
