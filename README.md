# 🏠 ImmoRédac — Générateur d'annonces immobilières IA

> Générez des annonces immobilières professionnelles en quelques secondes, propulsé par **Claude** (Anthropic).

**Développé par Gilles MAROUN**

---

## ✨ Fonctionnalités

- 🏠 **12 types de biens** (appartement, maison, loft, chalet…)
- 🔄 **5 types de transactions** (vente, location, saisonnier…)
- 🎨 **6 tons rédactionnels** (prestige, chaleureux, factuel…)
- 📱 **8 plateformes cibles** (SeLoger, PAP, Airbnb…)
- 🔍 **Mots-clés SEO** + méta-description automatiques
- ⚡ **Variation** — générer un angle différent en un clic
- 📋 **Copie en un clic** dans le presse-papiers
- ⌨️ **Raccourci clavier** : `Ctrl + Entrée` pour générer

---

## 🚀 Déploiement rapide

### Étape 1 — Mettre sur GitHub

```bash
# 1. Créer un dépôt sur https://github.com/new
#    Nom suggéré : immo-redac
#    Visibilité : Public ou Private

# 2. Dans le dossier du projet :
cd immo-redac
git init
git add .
git commit -m "🏠 Initial commit — ImmoRédac"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/immo-redac.git
git push -u origin main
```

### Étape 2 — Déployer sur Netlify

#### Option A — Interface Netlify (recommandé)

1. Aller sur **[netlify.com](https://netlify.com)** → se connecter
2. Cliquer **"Add new site"** → **"Import an existing project"**
3. Choisir **GitHub** → sélectionner le repo `immo-redac`
4. Paramètres de build :
   - **Branch** : `main`
   - **Build command** : *(laisser vide)*
   - **Publish directory** : `.`
5. Cliquer **"Deploy site"** ✅

#### Option B — CLI Netlify

```bash
npm install -g netlify-cli
netlify login
netlify init       # lie au repo GitHub
netlify deploy --prod
```

### Étape 3 — Configurer le domaine (optionnel)

Dans Netlify → **Domain settings** → **Add custom domain**

---

## 🔑 Clé API Anthropic

L'application utilise l'API Claude via `api.anthropic.com`.

> **Important** : L'appel API se fait côté client (navigateur). Pour un usage en production avec de nombreux utilisateurs, il est recommandé de passer par une **Netlify Function** (proxy) afin de ne pas exposer la clé API.

### Pour un usage personnel / démonstration

L'application est conçue pour fonctionner dans l'environnement Claude.ai où l'authentification est gérée automatiquement.

### Pour un déploiement public indépendant

Créer une **Netlify Function** proxy :

```js
// netlify/functions/generate.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify(data) };
};
```

Puis dans Netlify → **Environment variables** → ajouter `ANTHROPIC_API_KEY`.

---

## 📁 Structure du projet

```
immo-redac/
├── index.html          # Page principale
├── css/
│   └── style.css       # Styles
├── js/
│   └── app.js          # Logique + appels API
├── netlify.toml        # Config Netlify (headers, redirects)
└── README.md           # Ce fichier
```

---

## 🛠️ Technologies

| Technologie | Usage |
|-------------|-------|
| HTML5       | Structure sémantique |
| CSS3        | Design responsive |
| JavaScript  | Logique, appels API |
| Claude API  | Génération d'annonces |
| Netlify     | Hébergement & déploiement |

---

## 📄 Licence

MIT — Libre d'utilisation et de modification.

---

*Propulsé par [Claude](https://anthropic.com) · Anthropic*
