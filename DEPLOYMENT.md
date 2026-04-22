# 🚀 Guide de Déploiement — Palangrier

Voici comment mettre ton application en ligne en **moins de 15 minutes**, gratuitement.

---

## ✅ Ce dont tu as besoin

1. Un compte **GitHub** (gratuit) → [github.com/signup](https://github.com/signup)
2. Un compte **Vercel** (gratuit) → [vercel.com/signup](https://vercel.com/signup) (utilise ton GitHub pour t'inscrire)
3. Un compte **Anthropic Console** (pour la clé API) → [console.anthropic.com](https://console.anthropic.com)

---

## 📦 Étape 1 : Mettre le code sur GitHub (5 min)

### Option A — Via l'interface web GitHub (le plus simple)

1. Va sur [github.com/new](https://github.com/new)
2. Nomme le repository `palangrier-armateur`
3. Laisse-le **Public** (ou Private si tu préfères)
4. Clique **Create repository**
5. Sur la page qui s'affiche, clique **"uploading an existing file"**
6. Glisse-dépose **tous les fichiers du dossier `palangrier-deploy`** (sauf `node_modules` s'il existe)
7. Clique **Commit changes**

### Option B — Via ligne de commande (si tu connais git)

```bash
cd palangrier-deploy
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/palangrier-armateur.git
git push -u origin main
```

---

## 🔑 Étape 2 : Obtenir une clé API Anthropic (3 min)

1. Va sur [console.anthropic.com](https://console.anthropic.com) et connecte-toi
2. Dans le menu, clique **API Keys**
3. Clique **Create Key**, donne-lui un nom (ex: "Palangrier")
4. **Copie la clé** (elle commence par `sk-ant-api03-...`) — tu ne pourras plus la voir après !
5. **Important** : ajoute 5-10$ de crédit à ton compte (section Billing)
   - 1 extraction de décompte ≈ 0,01-0,02 USD (donc 5$ = 250-500 extractions)

---

## 🌐 Étape 3 : Déployer sur Vercel (5 min)

1. Va sur [vercel.com/new](https://vercel.com/new)
2. Clique **Import Git Repository**
3. Choisis ton repo `palangrier-armateur`
4. Dans la page de config qui s'ouvre :
   - **Framework Preset** : Vercel détecte "Vite" automatiquement ✓
   - **Build Command** : `npm run build` (déjà rempli)
   - **Output Directory** : `dist` (déjà rempli)
5. **⚠️ Important — Ajoute la clé API** :
   - Clique sur **Environment Variables**
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : colle ta clé (ex: `sk-ant-api03-...`)
   - Clique **Add**
6. Clique **Deploy**
7. Attends 1-2 minutes pendant que Vercel construit l'app

## 🎉 Fini !

Vercel te donne une URL du genre :
```
https://palangrier-armateur.vercel.app
```

**C'est cette URL que tu partages aux professionnels pour qu'ils testent l'app !**

---

## 📱 Comment tes testeurs installent l'app sur leur iPhone

Envoie-leur ce mini-guide :

### Sur iPhone (Safari)
1. Ouvre le lien dans **Safari** (pas Chrome)
2. Appuie sur le bouton **Partager** (carré avec flèche en bas)
3. Descends et clique **Sur l'écran d'accueil**
4. Appuie sur **Ajouter**
5. L'icône Palangrier apparaît sur le bureau comme une vraie app !

### Sur Android (Chrome)
1. Ouvre le lien dans **Chrome**
2. Clique sur les **3 points** en haut à droite
3. Clique **Ajouter à l'écran d'accueil**
4. Confirme

---

## 🔧 Modifier l'app après déploiement

Chaque fois que tu veux faire une modification :

1. Modifie les fichiers sur ton ordinateur
2. Push sur GitHub (`git push` ou via l'interface web)
3. Vercel redéploie automatiquement en 1-2 minutes
4. Tes utilisateurs voient la nouvelle version au prochain rechargement

---

## 🌍 (Optionnel) Avoir un nom de domaine pro

Par défaut ton URL est `palangrier-armateur.vercel.app`.

Pour avoir `palangrier.ma` ou `comptable-peche.com` :

1. Achète un domaine sur [namecheap.com](https://namecheap.com) ou [ovh.com](https://ovh.com) (~10€/an)
2. Dans Vercel : **Settings → Domains → Add**
3. Colle ton nom de domaine
4. Vercel te donne des instructions pour configurer le DNS chez ton registraire
5. Attends quelques heures que ça se propage

---

## 💰 Coûts estimés

| Service | Coût |
|---------|------|
| GitHub | **Gratuit** |
| Vercel (hosting) | **Gratuit** (jusqu'à 100 Go/mois de trafic) |
| Nom de domaine (optionnel) | ~10€/an |
| Clé Anthropic | ~0,02$ par extraction IA |

**Exemple** : si 20 pros utilisent l'app avec 10 extractions/mois chacun → coût total ≈ **4$/mois**

---

## 🆘 Problèmes fréquents

### "Error: ANTHROPIC_API_KEY missing"
→ Tu as oublié d'ajouter la variable d'environnement dans Vercel. Va dans **Settings → Environment Variables** et ajoute-la. Puis redéploie.

### L'extraction IA ne marche pas
→ Vérifie que tu as bien mis du crédit sur ton compte Anthropic. Va sur **console.anthropic.com → Billing**.

### Les testeurs disent "c'est blanc / ça charge pas"
→ Dis-leur d'ouvrir en navigation privée, ou de vider le cache du navigateur.

### "Je veux désactiver l'extraction IA pour économiser"
→ Pas de souci, l'app marche très bien sans ! Les utilisateurs peuvent remplir les décomptes manuellement. L'IA est juste une accélération optionnelle.

---

## 📞 Besoin d'aide ?

Si tu bloques quelque part, décris-moi précisément à quelle étape tu es coincé et je te guide.
