# Instructions Copilot

## Présentation du projet

Plateforme de simulateurs scientifiques interactifs destinée aux étudiants BTS « Métiers de la Chimie ». Les simulateurs couvrent deux domaines :
- **Colorimétrie / Espaces couleur** (`src/apps/couleur/`) — diagramme CIE xy, explorateur CIELAB
- **Rhéologie & Mouillage** (`src/apps/rheologie/`) — modèles de rhéogramme, angle de contact, droite de Zisman

## Commandes

```bash
npm run dev       # Démarrer le serveur de développement (Vite HMR)
npm run build     # Build de production → dist/
npm run lint      # ESLint (JS + JSX)
npm run preview   # Prévisualiser le build de production en local
npm run deploy    # Build + déploiement sur GitHub Pages
```

Il n'existe pas de suite de tests dans ce projet.

## Architecture

- **React 19 + Vite** — pas de React Router ; la navigation est gérée par état React
- **Recharts** — tous les graphiques et tracés scientifiques
- **KaTeX** — chargé paresseusement depuis un CDN pour le rendu des formules mathématiques
- **Lucide-react** — icônes
- **Déployé sur GitHub Pages** avec le chemin de base `/simulations-mdc/` (défini dans `vite.config.js`)

### Modèle de navigation

`App.jsx` implémente une machine à états à 3 niveaux (sans routage URL) :
1. Sélection de la catégorie → définit `categoryId`
2. Sélection de l'application dans la catégorie → définit `appId`
3. Rendu de l'application individuelle

Toutes les applications sont enregistrées dans `src/config.js` (tableau `CATEGORIES`), qui référence directement les imports de composants.

### Structure des dossiers

```
src/
├── apps/
│   ├── couleur/       # Simulateurs de science des couleurs
│   └── rheologie/     # Simulateurs de rhéologie & mouillage
├── components/ui/     # Composants UI réutilisables (Tabs, Select)
├── App.jsx            # Machine à états de navigation principale
├── ThemeContext.jsx    # Fournisseur de thème clair/sombre
├── config.js          # Registre des apps/catégories (CATEGORIES)
├── index.css          # Variables CSS & thème global
└── main.jsx           # Point d'entrée React
```

## Conventions importantes

### Structure des composants

Les composants d'application sont **monolithiques** (souvent 1000 à 2000 lignes). Les constantes métier, fonctions utilitaires et sous-composants sont définis dans le même fichier. Ne pas les séparer sauf demande explicite.

### Styles

Le style utilise **variables CSS + objets de style inline** — pas de CSS-in-JS, pas de Tailwind, pas de CSS Modules.

- Les tokens CSS globaux (`--text`, `--bg`, `--border`, `--accent`, etc.) sont définis dans `index.css` et basculés via `data-theme` sur `<html>`.
- Beaucoup de composants définissent un objet local de tokens couleur (nommé par convention `T`) :

```jsx
const T = {
  bg: "#f8fafc",
  blue600: "#2563eb",
  fontMono: "'JetBrains Mono','Fira Code',monospace",
};
```

- Les styles inline combinent souvent variables CSS et objet `T` :

```jsx
style={{
  border: `2px solid ${hovered ? T.blue600 : "var(--border)"}`,
  background: "var(--bg-card)",
}}
```

### Thème

Utiliser `useTheme()` depuis `ThemeContext.jsx` pour lire `{ dark }`. Le thème est persisté dans `localStorage` et basculé en définissant `data-theme` sur `document.documentElement`.

### Composants UI de base

`src/components/ui/tabs.jsx` et `select.jsx` suivent une composition de style shadcn avec React Context en interne :

```jsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="a">A</TabsTrigger>
  </TabsList>
  <TabsContent value="a">...</TabsContent>
</Tabs>
```

### KaTeX

Les applications qui affichent des formules utilisent un hook local `useKatex()` qui charge KaTeX paresseusement depuis le CDN et le met en cache dans `window.katex`. Vérifier l'état `ready` avant le rendu.

### Nommage des constantes

- Constantes de données métier : `UPPER_SNAKE_CASE` (ex. `MODELS`, `ILLUMINANTS`, `SURFACES`, `SOLVANTS`)
- ESLint est configuré pour autoriser les variables inutilisées correspondant à `/^[A-Z_]/` — il est sûr de définir des constantes au niveau du module sans déclencher d'erreur lint

### Intégration Webhook

Certaines applications (ex. `ZismanApp.jsx`) envoient des résultats à un endpoint n8n externe. Conserver les URLs de webhook comme constantes au niveau du module nommées `WEBHOOK_URL`.

### Langue

Les libellés métier et les textes d'interface sont en **français**. Tout nouveau texte d'interface doit être rédigé en français.
