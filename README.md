# 🎣 Palangrier — Gestion Armateur

Application de gestion des décomptes de pêche palangrier pour armateurs marocains.

**Fonctionnalités :**
- 📊 Tableau de bord avec analyses (revenus, charges, bénéfice)
- 🚢 Gestion de flotte multi-bateaux
- 📄 Saisie de décomptes avec calcul automatique des parts
- 🪄 **Import IA** : prends une photo de ton décompte papier, l'IA extrait les données
- 📁 Export Excel + PDF en 1 clic
- 💾 Archive de tous les décomptes
- 📱 Fonctionne sur mobile et ordinateur

## 🚀 Pour Déployer

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet de déploiement en 15 minutes.

## 🛠️ Développement Local

```bash
# 1. Installer les dépendances
npm install

# 2. (Pour tester l'import IA en local) créer .env.local avec :
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > .env.local

# 3. Lancer le dev server
npm run dev

# 4. Ouvrir http://localhost:5173
```

## 📂 Structure du projet

```
palangrier-deploy/
├── api/
│   └── extract.js          # Fonction serverless Vercel (proxy Anthropic API)
├── public/
│   ├── icon.svg            # Icône PWA
│   └── manifest.json       # Manifest pour installation mobile
├── src/
│   ├── App.jsx             # Application React complète
│   ├── main.jsx            # Point d'entrée
│   └── index.css           # Styles Tailwind
├── index.html              # Page HTML
├── package.json            # Dépendances
├── vite.config.js          # Config Vite
├── tailwind.config.js      # Config Tailwind
├── DEPLOYMENT.md           # Guide de déploiement
└── README.md               # Ce fichier
```

## 🔐 Confidentialité

- Les données des utilisateurs sont **stockées localement sur leur appareil** (localStorage)
- Aucun compte ni inscription requis
- La clé API Anthropic n'est **jamais exposée au navigateur** (elle reste côté serveur Vercel)
- Les fichiers uploadés pour extraction IA sont envoyés à Anthropic puis oubliés

## 📝 Licence

Code privé — usage interne uniquement.
