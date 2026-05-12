# FinTrack

FinTrack est une application mobile de suivi des dépenses et des budgets, construite avec Expo, React Native et TypeScript.

## 📌 Présentation

L'application propose :
- un tableau de bord avec synthèse des revenus et dépenses
- des graphiques de flux et de répartition des dépenses
- un suivi des transactions récentes
- un système de budgets et d'alertes de dépassement
- un gestionnaire de catégories personnalisées
- des notifications locales pour les alertes et rappels
- un onboarding et un verrouillage automatique de l'app

## 🚀 Technologies

- Expo SDK 54
- Expo Router
- React Native 0.81.5
- TypeScript
- Zustand pour la gestion d'état
- SQLite via `expo-sqlite`
- `expo-notifications` pour les alerts locales
- `expo-secure-store` et `expo-local-authentication` pour la sécurité

## 📁 Structure principale

- `app/` : pages et navigation Expo Router
- `components/` : composants UI réutilisables
- `constants/` : thèmes, catégories, styles
- `db/` : migrations, schéma et requêtes SQLite
- `services/` : services métiers (notifications, export, période)
- `stores/` : stores Zustand

## ⚙️ Installation

1. Installer les dépendances

```bash
npm install
```

2. Lancer le projet

```bash
npm start
```

3. Lancer sur Android

```bash
npm run android
```

4. Lancer sur iOS

```bash
npm run ios
```

5. Lancer le projet sur le web

```bash
npm run web
```

## 🧹 Nettoyage du cache

```bash
expo start --clear
npm cache clean --force
rm -rf node_modules/.cache
rm -rf android/.gradle
rm -rf android/app/build
```

## 🏗️ Build Android

```bash
npm run build:android
```

## 🔔 Notes importantes

- `expo-notifications` n'est pas entièrement supporté en mode Expo Go pour les notifications push Android. Pour tester correctement, utilisez :
  - `expo run:android`
  - ou un build natif / development build EAS
- `SafeAreaView` est déprécié. Préférez `react-native-safe-area-context` dans les composants futurs.

## 💾 Base de données

L'application utilise SQLite en local avec :

- `db/schema.ts` pour le schéma
- `db/migrations.ts` pour l'initialisation et les migrations
- `db/queries.ts` pour les opérations CRUD
- `db/seed.ts` pour les données de démarrage

## 🧩 Fonctionnalités clés

- Dashboard de suivi des dépenses
- Navigation par périodes : semaine, mois, trimestre, année
- Visualisation par barres et diagramme en anneau
- Gestion des budgets et alertes de dépassement
- Ajout / modification / suppression de transactions
- Catégories personnalisées
- Paramètres utilisateur : devise, thème, notifications, rappel quotidien
- Verrouillage automatique au passage en arrière-plan

## 🛠️ Scripts utiles

- `npm start` : démarre Expo
- `npm run android` : exécute sur Android
- `npm run ios` : exécute sur iOS
- `npm run web` : démarre l'application Web
- `npm run build:android` : build Android via EAS local
- `npm test` : exécute les tests Jest
- `npm run lint` : lance ESLint
- `npm run typecheck` : vérifie TypeScript

## 💡 Astuces

- Si vous utilisez Expo Go et voyez un avertissement sur `expo-notifications`, passez à un build natif.
- Si vous souhaitez adapter la devise ou le format de date, les paramètres sont disponibles dans `stores/settingsStore.ts` et `constants/theme.ts`.

## 🤝 Contribution

1. Forker le dépôt
2. Créer une branche de fonctionnalité
3. Ajouter/tester vos changements
4. Ouvrir une Pull Request

---

Merci d'utiliser FinTrack ! 🎉
